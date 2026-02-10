// src/services/stats.ts
import { db } from "../lib/db";
import type { DashboardMetrics, PendingReviewItem, RecentActivityItem } from "../types/dashboard";

const DEFAULT_TZ = "Asia/Colombo";

/**
 * Safely narrow Prisma JSON fields.
 */
function asObject(value: unknown): Record<string, any> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, any>;
}

/**
 * Returns instants for start/end of day. 
 * Simplified to match local system time for the hackathon demo.
 */
function dayBoundsInTZ(timeZone: string, baseDate = new Date()) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(baseDate);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function extractConfidenceAvg(confidenceScores: unknown): number | null {
  const root = asObject(confidenceScores);
  if (!root) return null;

  const nested = asObject(asObject(root.intelligence)?.confidence_score);
  const conf = nested ?? root;

  /* 
   * FIX: Safely handle null/undefined confidence scores
   */
  const values = Object.values(conf)
    .map((v) => (typeof v === "string" ? Number(v) : v))
    .filter((v) => typeof v === "number" && !Number.isNaN(v)) as number[];

  if (values.length === 0) return null;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const scaled = avg <= 1 ? avg * 100 : avg; // Handle 0-1 vs 0-100 scales

  return Math.round(scaled * 10) / 10;
}

export async function getDashboardMetrics(companyId?: string): Promise<DashboardMetrics> {
  const company = companyId
    ? await db.company.findUnique({ where: { id: companyId } })
    : await db.company.findFirst();

  const resolvedCompanyId = company?.id;
  const companyName = company?.name ?? "Company";
  /* 
   * FIX: Explicitly type the where clause to avoid union type issues with Prisma
   */
  const whereCompany: unknown = resolvedCompanyId ? { companyId: resolvedCompanyId } : {};

  const tz = process.env.DASHBOARD_TZ || DEFAULT_TZ;
  const { start: todayStart, end: todayEnd } = dayBoundsInTZ(tz);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const { start: yStart, end: yEnd } = dayBoundsInTZ(tz, yesterday);

  // 1) Transactions + growth
  const [todaysTransactions, yesterdaysTransactions] = await Promise.all([
    db.document.count({
      where: { ...(whereCompany as any), createdAt: { gte: todayStart, lte: todayEnd } },
    }),
    db.document.count({
      where: { ...(whereCompany as any), createdAt: { gte: yStart, lte: yEnd } },
    }),
  ]);

  const transactionsGrowthPct =
    yesterdaysTransactions === 0
      ? todaysTransactions > 0 ? 100 : 0
      : Math.round(((todaysTransactions - yesterdaysTransactions) / yesterdaysTransactions) * 100);

  // 2) Processed amount today
  const extractionAgg = await db.extractedInformation.aggregate({
    _sum: { totalAmount: true },
    where: {
      document: {
        ...(whereCompany as any),
        createdAt: { gte: todayStart, lte: todayEnd }
      },
    },
  });
  const processedAmount = Number(extractionAgg._sum.totalAmount ?? 0);

  // 3) PROCESSED vs PENDING docs
  const [processed, pending] = await Promise.all([
    db.document.count({
      where: { ...(whereCompany as any), status: "PROCESSED", createdAt: { gte: todayStart, lte: todayEnd } }
    }),
    db.document.count({
      where: { ...(whereCompany as any), status: "PENDING", createdAt: { gte: todayStart, lte: todayEnd } }
    }),
  ]);

  // 4) AI Confidence Avg
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

  // 5) Reversals today
  const reversalsToday = await db.journalEntry.count({
    where: {
      ...(whereCompany as any),
      createdAt: { gte: todayStart, lte: todayEnd },
      OR: [{ entryType: "REVERSAL" }, { reversalOfId: { not: null } }],
    },
  });

  const reversalLedgerAgg = await db.ledgerLine.aggregate({
    _sum: { debit: true, credit: true },
    where: {
      journalEntry: {
        ...(whereCompany as any),
        createdAt: { gte: todayStart, lte: todayEnd },
        OR: [{ entryType: "REVERSAL" }, { reversalOfId: { not: null } }],
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

  // 7) Pending review items
  const pendingReviewItems: PendingReviewItem[] = [];
  if (resolvedCompanyId) {
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

  // 8) Recent activity - Pull 10 items from Document table
  const entries = await db.document.findMany({
    where: { ...(whereCompany as any) },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { extraction: true },
  });

  const recentActivity: RecentActivityItem[] = entries.map((e) => {
    // Force type assertion since TS is confused about the include result
    const ext = (e as any).extraction;
    const data = ext?.extractedData as any;
    // Explicitly cast e to any to access createdAt if TS is complaining
    const createdAt = (e as any).createdAt;

    return {
      id: e.id,
      title: data?.vendor_name || data?.payee_name || "Pending Extraction",
      amount: Number(ext?.totalAmount ?? 0),
      source: ext?.isManual ? "USER_INPUT" : "AI_SCAN",
      time: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
      subtitle: data?.category || "Uncategorized"
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