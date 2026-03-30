import { db as prisma } from "../lib/db";
import { Prisma } from "@prisma/client";
import { HttpError } from "../utils/httpError"; // if you don't have HttpError export, tell me

function isValidMonth(month: string) {
  return /^\d{4}-\d{2}$/.test(month);
}
function isValidDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

// Date-only (UTC) to avoid timezone shifts
function dateOnlyUTC(yyyy_mm_dd: string) {
  return new Date(`${yyyy_mm_dd}T00:00:00.000Z`);
}
function monthStartUTC(yyyy_mm: string) {
  const [y, m] = yyyy_mm.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}
function monthEndUTC(yyyy_mm: string) {
  const [y, m] = yyyy_mm.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1)); // first day next month
}

function computeStatus(limit: number, spending: number) {
  if (limit <= 0) return { status: "BLUE" as const, blocked: false, usedPercent: 0, remaining: 0 };
  const usedPercent = (spending / limit) * 100;
  const remaining = Math.max(0, limit - spending);

  if (spending > limit) return { status: "RED" as const, blocked: true, usedPercent, remaining };
  if (spending >= limit * 0.8) return { status: "YELLOW" as const, blocked: false, usedPercent, remaining };
  return { status: "BLUE" as const, blocked: false, usedPercent, remaining };
}

export async function getCalendarMonth(input: { companyId: string; month: string }) {
  const { companyId, month } = input;

  if (!companyId) throw new HttpError({ status: 400, code: "VALIDATION_ERROR", message: "companyId is required" });
  if (!isValidMonth(month)) throw new HttpError({ status: 400, code: "VALIDATION_ERROR", message: "month must be YYYY-MM" });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new HttpError({ status: 404, code: "NOT_FOUND", message: "Company not found" });

  const start = monthStartUTC(month);
  const end = monthEndUTC(month);

  // Fetch daily limits for month
  const limits = await prisma.dailyLimit.findMany({
    where: { companyId, date: { gte: start, lt: end } },
    select: { date: true, maxAmount: true },
  });

  const limitMap = new Map<string, number>();
  for (const l of limits) {
    const key = l.date.toISOString().slice(0, 10);
    limitMap.set(key, Number(l.maxAmount));
  }

  // Sum credits per day (Virtual Ledger = LedgerLine credit values)
  const spendingRows = await prisma.$queryRaw<
    Array<{ date: string; credit_sum: Prisma.Decimal }>
  >(Prisma.sql`
    SELECT
      je.entry_date::date as date,
      COALESCE(SUM(ll.credit), 0) as credit_sum
    FROM "LedgerLine" ll
    JOIN "JournalEntry" je ON je.id = ll."journalEntryId"
    WHERE je."companyId" = ${companyId}
      AND je.entry_date >= ${start}::date
      AND je.entry_date < ${end}::date
      GROUP BY je.entry_date::date
  `);

  const spendMap = new Map<string, number>();
  for (const r of spendingRows) {
    spendMap.set(r.date, Number(r.credit_sum));
  }

  // Build days of month
  const days: any[] = [];
  const cursor = new Date(start);

  while (cursor < end) {
    const dateKey = cursor.toISOString().slice(0, 10);

    const limitAmount = limitMap.get(dateKey) ?? Number(company.dailyLimitBase);
    const currentSpending = spendMap.get(dateKey) ?? 0;

    const s = computeStatus(limitAmount, currentSpending);

    days.push({
      date: dateKey,
      limitAmount,
      currentSpending,
      remainingAmount: s.remaining,
      usedPercent: s.usedPercent,
      status: s.status,
      blocked: s.blocked,
    });

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { month, days };
}

export async function setDailyLimitForDate(input: {
  companyId: string;
  date: string; // YYYY-MM-DD
  limitAmount: number;
  reason?: string;
}) {
  const { companyId, date, limitAmount, reason } = input;

  if (!companyId) throw new HttpError({ status: 400, code: "VALIDATION_ERROR", message: "companyId is required" });
  if (!isValidDate(date)) throw new HttpError({ status: 400, code: "VALIDATION_ERROR", message: "date must be YYYY-MM-DD" });
  if (!Number.isFinite(limitAmount) || limitAmount <= 0) {
    throw new HttpError({ status: 400, code: "VALIDATION_ERROR", message: "limitAmount must be > 0" });
  }

  const day = dateOnlyUTC(date);

  // upsert daily limit
  const existing = await prisma.dailyLimit.findUnique({
    where: { companyId_date: { companyId, date: day } },
  });

  const updated = await prisma.dailyLimit.upsert({
    where: { companyId_date: { companyId, date: day } },
    update: { maxAmount: new Prisma.Decimal(limitAmount) },
    create: {
      companyId,
      date: day,
      maxAmount: new Prisma.Decimal(limitAmount),
      currentSpend: new Prisma.Decimal(0),
    },
  });

  // audit log
  await prisma.dailyLimitAudit.create({
    data: {
      dailyLimitId: updated.id,
      oldMaxAmount: existing ? existing.maxAmount : null,
      newMaxAmount: new Prisma.Decimal(limitAmount),
      reason: reason ?? null,
    },
  });

  return {
    id: updated.id,
    companyId,
    date,
    limitAmount,
  };
}

export async function assertCanIssueCheque(input: {
  date: string;      // YYYY-MM-DD
  amount: number;    // cheque amount
  companyId: string;
}) {
  const { date, amount, companyId } = input;

  if (!isValidDate(date)) {
    throw new HttpError({ status: 400, code: "INVALID_DATE", message: "date must be YYYY-MM-DD" });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpError({ status: 400, code: "INVALID_AMOUNT", message: "amount must be a positive number" });
  }

  if (!companyId) {
    throw new HttpError({ status: 400, code: "MISSING_COMPANY", message: "companyId is required" });
  }

  // Get the day summary to check spending
  const day = dateOnlyUTC(date);

  // Get limit for this date
  const limitRecord = await prisma.dailyLimit.findUnique({
    where: { companyId_date: { companyId, date: day } },
    select: { maxAmount: true },
  });

  // Get company default limit if no specific daily limit set
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { dailyLimitBase: true },
  });

  if (!company) {
    throw new HttpError({ status: 404, code: "COMPANY_NOT_FOUND", message: "Company not found" });
  }

  const limitAmount = limitRecord ? Number(limitRecord.maxAmount) : Number(company.dailyLimitBase);

  // Get current spending for the day
  const spendingRows = await prisma.$queryRaw<
    Array<{ credit_sum: Prisma.Decimal }>
  >(Prisma.sql`
    SELECT
      COALESCE(SUM(ll.credit), 0) as credit_sum
    FROM "LedgerLine" ll
    JOIN "JournalEntry" je ON je.id = ll."journalEntryId"
    WHERE je."companyId" = ${companyId}
      AND je.entry_date >= ${day}::date
      AND je.entry_date < ${new Date(day.getTime() + 24 * 60 * 60 * 1000)}::date
  `);

  const currentSpending = spendingRows[0] ? Number(spendingRows[0].credit_sum) : 0;

  // Check if issuing this cheque would exceed the limit
  const projectTotal = currentSpending + amount;

  if (limitAmount > 0 && projectTotal > limitAmount) {
    const remaining = Math.max(0, limitAmount - currentSpending);
    throw new HttpError({
      status: 409,
      code: "DAILY_LIMIT_EXCEEDED",
      message: `Daily limit exceeded. Current spending: ${currentSpending}, Limit: ${limitAmount}, Remaining: ${remaining}`,
      notification: {
        type: "error",
        title: "Daily Limit Exceeded",
        message: `Cannot issue cheque of ${amount}. Daily limit is ${limitAmount} and ${remaining} remains.`,
        code: "DAILY_LIMIT_EXCEEDED",
      },
    });
  }

  // Build summary response
  const status = computeStatus(limitAmount, currentSpending);

  return {
    allowed: true,
    summary: {
      date,
      limitAmount,
      currentSpending,
      remainingAmount: Math.max(0, limitAmount - currentSpending),
      usedPercent: status.usedPercent,
      status: status.status,
      blocked: status.blocked,
    },
    remainingAfterIssue: limitAmount > 0 ? limitAmount - projectTotal : null,
  };
}

// Export as service object for use in routes
export const governanceService = {
  getMonthCalendar: getCalendarMonth,
  setDailyLimit: setDailyLimitForDate,
  assertCanIssueCheque,
};


