import { db } from "../lib/db";
import type { DashboardMetrics, PendingReviewItem, RecentActivityItem } from "../types/dashboard";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/**
 * Prisma JSON fields are typed as JsonValue:
 * string | number | boolean | JsonObject | JsonArray
 * So we safely narrow before accessing nested keys.
 */
function asObject(value: unknown): Record<string, any> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, any>;
}

function extractConfidenceAvg(confidenceScores: unknown): number | null {
  // Expected shape: confidenceScores.intelligence.confidence_score = { field: number, ... }
  const root = asObject(confidenceScores);
  const intelligence = asObject(root?.intelligence);
  const conf = asObject(intelligence?.confidence_score);
  if (!conf) return null;

  const values = Object.values(conf).filter((v) => typeof v === "number") as number[];
  if (values.length === 0) return null;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  // detect if 0-1 -> convert to 0-100
  const scaled = avg <= 1 ? avg * 100 : avg;

  return Math.round(scaled * 10) / 10; // 1 decimal place
}

export async function getDashboardMetrics(companyId?: string): Promise<DashboardMetrics> {
  // If auth isn't implemented yet, pick the first company
  const company =
    companyId
      ? await db.company.findUnique({ where: { id: companyId } })
      : await db.company.findFirst();

  const resolvedCompanyId = company?.id;
  const companyName = company?.name ?? "Company";
  const whereCompany = resolvedCompanyId ? { companyId: resolvedCompanyId } : {};

  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStart = startOfDay(yesterday);
  const yEnd = endOfDay(yesterday);

  // 1) Transactions + growth
  const [todaysTransactions, yesterdaysTransactions] = await Promise.all([
    db.journalEntry.count({
      where: { ...whereCompany, entryDate: { gte: todayStart, lte: todayEnd } },
    }),
    db.journalEntry.count({
      where: { ...whereCompany, entryDate: { gte: yStart, lte: yEnd } },
    }),
  ]);

  const transactionsGrowthPct =
    yesterdaysTransactions === 0
      ? todaysTransactions > 0
        ? 100
        : 0
      : Math.round(((todaysTransactions - yesterdaysTransactions) / yesterdaysTransactions) * 100);

  // 2) Processed amount today from LedgerLines tied to today's journal entries
  const ledgerAgg = await db.ledgerLine.aggregate({
    _sum: { debit: true, credit: true },
    where: {
      journalEntry: { ...whereCompany, entryDate: { gte: todayStart, lte: todayEnd } },
    },
  });

  const totalDebit = Number(ledgerAgg._sum.debit ?? 0);
  const totalCredit = Number(ledgerAgg._sum.credit ?? 0);

  // Balanced journal -> net processed = average of totals
  const processedAmount = Math.round(((totalDebit + totalCredit) / 2) * 100) / 100;

  // 3) PROCESSED vs PENDING docs (linked to today's journal entries)
  const todaysDocIds = await db.journalEntry.findMany({
    where: { ...whereCompany, entryDate: { gte: todayStart, lte: todayEnd } },
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

  // 4) AI Confidence Avg from ExtractedInformation.confidenceScores JSON
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

  // 5) Reversals today + reversal amount
  const reversalsToday = await db.journalEntry.count({
    where: {
      ...whereCompany,
      entryType: "REVERSAL",
      entryDate: { gte: todayStart, lte: todayEnd },
    },
  });

  const reversalLedgerAgg = await db.ledgerLine.aggregate({
    _sum: { debit: true, credit: true },
    where: {
      journalEntry: {
        ...whereCompany,
        entryType: "REVERSAL",
        entryDate: { gte: todayStart, lte: todayEnd },
      },
    },
  });

  const revDebit = Number(reversalLedgerAgg._sum.debit ?? 0);
  const revCredit = Number(reversalLedgerAgg._sum.credit ?? 0);
  const reversalsAmount = Math.round(((revDebit + revCredit) / 2) * 100) / 100;

  // 6) Daily limit
  const baseLimit = Number(company?.dailyLimitBase ?? 50000);

  let dailyLimit = {
    limit: baseLimit,
    used: processedAmount,
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

  // 8) Recent activity
  const entries = await db.journalEntry.findMany({
    where: { ...whereCompany },
    orderBy: { entryDate: "desc" },
    take: 5,
    select: { id: true, description: true, entryDate: true, sourceType: true },
  });

  const recentActivity: RecentActivityItem[] = entries.map((e) => ({
    id: e.id,
    title: e.description ?? "Journal Entry",
    amount: 0,
    source: e.sourceType,
    time: e.entryDate.toISOString(),
  }));

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
