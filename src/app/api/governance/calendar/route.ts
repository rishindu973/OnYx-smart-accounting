
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function pad2(n: number) {
    return n < 10 ? `0${n}` : `${n}`;
}

function yyyymmdd(d: Date) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const month = searchParams.get("month"); // YYYY-MM
        const companyId = searchParams.get("companyId");

        if (!month || !companyId) {
            return NextResponse.json(
                { error: { message: "Missing month or companyId" } },
                { status: 400 }
            );
        }

        const [year, m] = month.split("-").map(Number);
        const startOfMonth = new Date(year, m - 1, 1);
        const endOfMonth = new Date(year, m, 0, 23, 59, 59, 999);

        // 1. Get Company Base Limit
        const company = await db.company.findUnique({
            where: { id: companyId },
        });

        if (!company) {
            return NextResponse.json(
                { error: { message: "Company not found" } },
                { status: 404 }
            );
        }

        const baseLimit = Number(company.dailyLimitBase);

        // 2. Get Custom Daily Limits for this month
        const customLimits = await db.dailyLimit.findMany({
            where: {
                companyId,
                date: {
                    gte: startOfMonth,
                    lte: endOfMonth,
                },
            },
        });

        const limitMap = new Map<string, number>();
        for (const l of customLimits) {
            limitMap.set(yyyymmdd(l.date), Number(l.maxAmount));
        }

        // 3. Get Spending for this month (Extracted info + Manual entries)
        // We'll aggregate ExtractedInformation by day
        // NOTE: This uses Document.createdAt for simplicity as "spending date"

        // a) Processed Documents (Extracted Info)
        const extractions = await db.extractedInformation.findMany({
            where: {
                document: {
                    companyId,
                    status: "PROCESSED",
                    createdAt: {
                        gte: startOfMonth,
                        lte: endOfMonth,
                    },
                },
            },
            include: {
                document: {
                    select: { createdAt: true },
                },
            },
        });

        // b) Manual Journal Entries (User Input) - we need to be careful not to double count if they are linked
        // for now, let's just use the extractions for "AI Spending" + maybe manual?
        // The requirement often implies "Daily Limit" checks against "What we processed today".
        // Let's stick to ExtractedInformation as the primary "Spend" source for now, 
        // unless the user asked for full ledger based spending.
        // The `stats.ts` logic used `processedAmount` from `ExtractedInformation`. We will align with that.

        const spendingMap = new Map<string, number>();

        for (const ext of extractions) {
            const dateKey = yyyymmdd(ext.document.createdAt);
            const amount = Number(ext.totalAmount);
            const current = spendingMap.get(dateKey) || 0;
            spendingMap.set(dateKey, current + amount);
        }

        // 4. Build Days Array
        const days = [];
        // Loop through all days of the month
        const iter = new Date(startOfMonth);
        while (iter <= endOfMonth) {
            const dKey = yyyymmdd(iter);

            const limitAmount = limitMap.has(dKey) ? limitMap.get(dKey)! : baseLimit;
            const currentSpending = spendingMap.get(dKey) || 0;
            const remainingAmount = Math.max(0, limitAmount - currentSpending);

            let usedPercent = 0;
            if (limitAmount > 0) {
                usedPercent = (currentSpending / limitAmount) * 100;
            }

            let status: "BLUE" | "YELLOW" | "RED" = "BLUE";
            if (usedPercent >= 100) status = "RED";
            else if (usedPercent >= 80) status = "YELLOW";

            days.push({
                date: dKey,
                limitAmount,
                currentSpending,
                remainingAmount,
                usedPercent: Math.round(usedPercent),
                status,
                blocked: usedPercent >= 100, // Conceptually blocked
            });

            iter.setDate(iter.getDate() + 1);
        }

        return NextResponse.json({
            ok: true,
            data: {
                month,
                days,
            },
        });

    } catch (error: any) {
        console.error("Calendar API Error:", error);
        return NextResponse.json(
            { error: { message: error.message || "Internal Server Error" } },
            { status: 500 }
        );
    }
}
