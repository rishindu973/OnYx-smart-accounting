"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

function dateOnlyUTC(yyyy_mm_dd: string) {
    return new Date(`${yyyy_mm_dd}T00:00:00.000Z`);
}

export async function getGovernanceCalendar(month: string, companyId: string) {
    if (!companyId || !month) throw new Error("Missing companyId or month");

    const [yearStr, monthStr] = month.split("-");
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10);

    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
        throw new Error(`Invalid month format: ${month}`);
    }

    // Date.UTC(year, monthIndex) where monthIndex is 0-11
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 1));

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new Error("Company not found");


    const limits = await prisma.dailyLimit.findMany({
        where: { companyId, date: { gte: start, lt: end } },
    });
    const limitMap = new Map(limits.map(l => [l.date.toISOString().slice(0, 10), Number(l.maxAmount)]));


    // Updated Logic: Net Spending = Sum of (Credit - Debit) for Liability/Asset Accounts
    // This handles:
    // 1. Regular Expense: Liability Cl credited -> Spending increases
    // 2. Refund/Credit: Liability Dr debited -> Spending decreases
    const spendingRows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT 
        je.entry_date::date as date, 
        COALESCE(SUM(
            CASE 
                WHEN ca.account_type::text IN ('LIABILITY', 'ASSET') THEN ll.credit - ll.debit 
                ELSE 0 
            END
        ), 0) as net_spend
    FROM "JournalEntry" je
    JOIN "LedgerLine" ll ON ll."journalEntryId" = je.id
    JOIN "ChartOfAccounts" ca ON ll."accountId" = ca.id
    WHERE je."companyId" = ${companyId} 
      AND je.entry_date >= ${start} 
      AND je.entry_date < ${end}
    GROUP BY je.entry_date::date
  `);
    const spendMap = new Map(spendingRows.map(r => [new Date(r.date).toISOString().slice(0, 10), Number(r.net_spend)]));

    const days = [];
    const cursor = new Date(start);
    while (cursor < end) {
        const key = cursor.toISOString().slice(0, 10);
        const limit = limitMap.get(key) ?? Number(company.dailyLimitBase);
        const spent = spendMap.get(key) ?? 0;

        days.push({
            date: key,
            limitAmount: limit,
            currentSpending: spent,
            remainingAmount: Math.max(0, limit - spent),
            usedPercent: limit > 0 ? (spent / limit) * 100 : 0,
            status: spent > limit ? "RED" : spent >= limit * 0.8 ? "YELLOW" : "BLUE",
            blocked: spent >= limit
        });
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return { month, days };
}

export async function setDailyLimit(date: string, limitAmount: number, companyId: string) {
    const day = dateOnlyUTC(date);

    await prisma.$transaction(async (tx) => {
        const updated = await tx.dailyLimit.upsert({
            where: { companyId_date: { companyId, date: day } },
            update: { maxAmount: new Prisma.Decimal(limitAmount) },
            create: { companyId, date: day, maxAmount: new Prisma.Decimal(limitAmount), currentSpend: 0 }
        });

        await tx.dailyLimitAudit.create({
            data: {
                dailyLimitId: updated.id,
                newMaxAmount: new Prisma.Decimal(limitAmount),
                reason: "Updated via Governance Dashboard"
            }
        });
    });

    revalidatePath("/governance");
    return { success: true };
}