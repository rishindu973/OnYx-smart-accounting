import { db } from "../lib/db";
import type { DashboardMetrics, PendingReviewItem, RecentActivityItem } from "../types/dashboard";

const DEFAULT_TZ = "Asia/Colombo";

/**
 * Prisma JSON fields are typed as JsonValue:
 * string | number | boolean | JsonObject | JsonArray
 * So we safely narrow before accessing nested keys.
 */
function asObject(value: unknown): Record<string, any> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, any>;
}

/**
 * Returns UTC instants for the start/end of the given calendar day
 * in the provided IANA timezone.
 */
function dayBoundsInTZ(timeZone: string, baseDate = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const ymd = fmt.format(baseDate); // YYYY-MM-DD
  const [y, m, d] = ymd.split("-").map(Number);

  const startWall = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const endWall = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));

  return {
    start: tzWallClockToInstant(startWall, timeZone),
    end: tzWallClockToInstant(endWall, timeZone),
  };
}

function tzWallClockToInstant(wallClockUTC: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = dtf.formatToParts(wallClockUTC);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);

  return new Date(
    Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
      wallClockUTC.getUTCMilliseconds()
    )
  );
}

function extractConfidenceAvg(confidenceScores: unknown): number | null {

  const root = asObject(confidenceScores);
  if (!root) return null;

  const nested = asObject(asObject(root.intelligence)?.confidence_score);
  const conf = nested ?? root;

  const values = Object.values(conf)
    .map((v) => (typeof v === "string" ? Number(v) : v))
    .filter((v) => typeof v === "number" && !Number.isNaN(v)) as number[];

  if (values.length === 0) return null;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // If 0..1 → scale to 0..100
  const scaled = avg <= 1 ? avg * 100 : avg;

  return Math.round(scaled * 10) / 10; // 1 decimal
}


export async function getDashboardMetrics(companyId?: string): Promise<DashboardMetrics> {
  // If auth isn't implemented yet, pick the first company
  const company = companyId
    ? await db.company.findUnique({ where: { id: companyId } })
    : await db.company.findFirst();

  const resolvedCompanyId = company?.id;
  const companyName = company?.name ?? "Company";
  const whereCompany = resolvedCompanyId ? { companyId: resolvedCompanyId } : {};

  // ✅ "Today" = PROCESSED/CREATED today (not entryDate)
  const tz = process.env.DASHBOARD_TZ || DEFAULT_TZ;
  const { start: todayStart, end: todayEnd } = dayBoundsInTZ(tz);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const { start: yStart, end: yEnd } = dayBoundsInTZ(tz, yesterday);

  // 1) Transactions + growth (BASED ON createdAt)
  const [todaysTransactions, yesterdaysTransactions] = await Promise.all([
    db.journalEntry.count({
      where: { ...whereCompany, createdAt: { gte: todayStart, lte: todayEnd } },
    }),
    db.journalEntry.count({
      where: { ...whereCompany, createdAt: { gte: yStart, lte: yEnd } },
    }),
  ]);

  const transactionsGrowthPct =
    yesterdaysTransactions === 0
      ? todaysTransactions > 0
        ? 100
        : 0
      : Math.round(((todaysTransactions - yesterdaysTransactions) / yesterdaysTransactions) * 100);

  // 2) Processed amount today (LedgerLines tied to JournalEntries created today)
  const ledgerAgg = await db.ledgerLine.aggregate({
    _sum: { debit: true, credit: true },
    where: {
      journalEntry: { ...whereCompany, createdAt: { gte: todayStart, lte: todayEnd } },
    },
  });

  const totalDebit = Number(ledgerAgg._sum.debit ?? 0);
  const totalCredit = Number(ledgerAgg._sum.credit ?? 0);

  // Balanced journal -> net processed = average of totals
  const processedAmount = Math.round(((totalDebit + totalCredit) / 2) * 100) / 100;

  // 3) PROCESSED vs PENDING docs linked to JournalEntries created today
  const todaysDocIds = await db.journalEntry.findMany({
    where: { ...whereCompany, createdAt: { gte: todayStart, lte: todayEnd } },
    select: { documentId: true },
  });

  const docIds = todaysDocIds.map((x) => x.documentId).filter(Boolean) as string[];

  let processed = 0;
  let pending = 0;

  if (docIds.length > 0) {
    [processed, pending] = await Promise.all([
      db.document.count({ where: { id: { in: docIds }, status: "PROCESSED" } }),
      db.document.count({ where: { id: { in: docIds }, status: "PENDING" } }),
    ]);
  }

  // 4) AI Confidence Avg (overall for company)
  let aiConfidenceAvg = 0;

  if (resolvedCompanyId) {
    const extracted = await db.extractedInformation.findMany({
      where: { document: { companyId: resolvedCompanyId } },
      select: { confidenceScores: true },
      take: 200,
    });

    const avgs: number[] = [];
    for (const row of extracted) {
      const avg = extractConfidenceAvg(row.confidenceScores);
      if (avg !== null) avgs.push(avg);
    }

    if (avgs.length > 0) {
      aiConfidenceAvg = Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length) * 10) / 10;
    }
  }

  // 5) Reversals today + reversal amount (BASED ON createdAt)
  const reversalsToday = await db.journalEntry.count({
    where: {
      ...whereCompany,
      createdAt: { gte: todayStart, lte: todayEnd },
      OR: [{ entryType: "REVERSAL" }, { reversalOfId: { not: null } }],
    },
  });

  const reversalLedgerAgg = await db.ledgerLine.aggregate({
    _sum: { debit: true, credit: true },
    where: {
      journalEntry: {
        ...whereCompany,
        createdAt: { gte: todayStart, lte: todayEnd },
        OR: [{ entryType: "REVERSAL" }, { reversalOfId: { not: null } }],
      },
    },
  });

  const revDebit = Number(reversalLedgerAgg._sum.debit ?? 0);
  const revCredit = Number(reversalLedgerAgg._sum.credit ?? 0);
  const reversalsAmount = Math.round(((revDebit + revCredit) / 2) * 100) / 100;

  // 6) Daily limit (if DailyLimit exists for today, use it; else fallback to base + processedAmount)
  const baseLimit = Number(company?.dailyLimitBase ?? 50000);

  let dailyLimit = {
    limit: baseLimit,
    used: processedAmount, // processed today (created today)
    remaining: Math.max(0, baseLimit - processedAmount),
    percent: baseLimit > 0 ? Math.round((processedAmount / baseLimit) * 100) : 0,
  };

  if (resolvedCompanyId) {
    const dl = await db.dailyLimit.findFirst({
      where: { companyId: resolvedCompanyId, date: { gte: todayStart, lte: todayEnd } },
      orderBy: { date: "desc" },
    });

    if (dl) {
      const limit = Number(dl.maxAmount ?? 0) || baseLimit;
      const used = Number(dl.currentSpend ?? 0);
      dailyLimit = {
        limit,
        used,
        remaining: Math.max(0, limit - used),
        percent: limit > 0 ? Math.round((used / limit) * 100) : 0,
      };
    }
  }

  // 7) Pending review items + count
  const pendingReviewItems: PendingReviewItem[] = [];

  if (resolvedCompanyId) {
    // A) Pending documents
    const pendingDocs = await db.document.findMany({
      where: { companyId: resolvedCompanyId, status: "PENDING" },
      select: { id: true, type: true },
      take: 10,
    });

    for (const d of pendingDocs) {
      pendingReviewItems.push({
        id: d.id,
        type: "PENDING_DOC",
        title: "Pending Document",
        message: `${d.type} is still pending processing`,
        actionLabel: "Review Now →",
      });
    }

    // B) Extracted signals: low confidence, failed validation, new vendor
    const extracted = await db.extractedInformation.findMany({
      where: { document: { companyId: resolvedCompanyId } },
      select: { documentId: true, amountValidationPass: true, confidenceScores: true },
      take: 50,
    });

    for (const row of extracted) {
      const avg = extractConfidenceAvg(row.confidenceScores) ?? 100;

      const root = asObject(row.confidenceScores);
      const intelligence = asObject(root?.intelligence);
      const isNewVendor = intelligence?.is_new_vendor === true;

      if (avg < 80) {
        pendingReviewItems.push({
          id: row.documentId,
          type: "LOW_CONFIDENCE",
          title: "Low Confidence Extraction",
          message: `Average confidence: ${avg}%`,
          actionLabel: "Review Now →",
        });
      }

      if (row.amountValidationPass === false) {
        pendingReviewItems.push({
          id: row.documentId,
          type: "FAILED_VALIDATION",
          title: "Amount Validation Failed",
          message: "Extracted amount did not pass validation",
          actionLabel: "Review Now →",
        });
      }

      if (isNewVendor) {
        pendingReviewItems.push({
          id: row.documentId,
          type: "NEW_VENDOR",
          title: "New Vendor Detected",
          message: "Vendor is not in vendor list",
          actionLabel: "Create Account →",
        });
      }
    }
  }

  const pendingReviewCount = pendingReviewItems.length;

  // 8) Recent activity = most recently created entries (processing timeline)
  const entries = await db.journalEntry.findMany({
    where: { ...whereCompany },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      description: true,
      createdAt: true,
      sourceType: true,
      ledgerLines: {
        select: {
          debit: true,
          credit: true,
        },
      },
    },
  });

  const recentActivity: RecentActivityItem[] = entries.map((e) => {
    // Sum debits or credits to get transaction value
    const totalDebit = e.ledgerLines.reduce((sum, line) => sum + Number(line.debit), 0);
    const totalCredit = e.ledgerLines.reduce((sum, line) => sum + Number(line.credit), 0);
    const amount = Math.max(totalDebit, totalCredit);

    return {
      id: e.id,
      title: e.description ?? "Journal Entry",
      amount: amount,
      source: e.sourceType,
      time: e.createdAt.toISOString(),
    };
  });

  return {
    companyName,

    todaysTransactions,
    transactionsGrowthPct,

    processedAmount,
    processedBreakdown: { processed, pending },

    aiConfidenceAvg,
    reversalsToday,
    reversalsAmount,

    dailyLimit,

    pendingReviewCount,
    pendingReviewItems,

    recentActivity,
  };
}
