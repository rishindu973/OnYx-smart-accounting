
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ date: string }> } // Use Promise for dynamic params in Next.js 15+
) {
    try {
        const { date } = await params;
        const body = await req.json();
        const { companyId, limitAmount, reason } = body;

        // Validate inputs
        if (!companyId || !date) {
            return NextResponse.json({ error: { message: "Missing required fields" } }, { status: 400 });
        }

        // Ensure limitAmount is a valid number
        const newMax = Number(limitAmount);
        if (isNaN(newMax) || newMax < 0) {
            return NextResponse.json({ error: { message: "Invalid limit amount" } }, { status: 400 });
        }

        // 1. Upsert DailyLimit
        // We need to check if one exists to log the "old" amount for audit
        const existing = await db.dailyLimit.findUnique({
            where: {
                companyId_date: {
                    companyId,
                    date: new Date(date),
                },
            },
        });

        const oldMax = existing ? Number(existing.maxAmount) : 0; // Default or previous 0?
        // If it didn't exist, maybe we should fetch the company base limit as "old"? 
        // For audit log, "old" being 0 or null implies "it was using default".

        const dailyLimit = await db.dailyLimit.upsert({
            where: {
                companyId_date: {
                    companyId,
                    date: new Date(date)
                }
            },
            create: {
                companyId,
                date: new Date(date),
                maxAmount: newMax,
                currentSpend: 0 // Will be recalculated/updated by other processes usually
            },
            update: {
                maxAmount: newMax
            }
        });


        // 2. Create Audit Log
        await db.dailyLimitAudit.create({
            data: {
                dailyLimitId: dailyLimit.id,
                changedBy: "USER_UI", // In a real app, get from session
                oldMaxAmount: oldMax,
                newMaxAmount: newMax,
                reason: reason || "Manual update",
            },
        });

        return NextResponse.json({
            ok: true,
            data: dailyLimit,
            notification: {
                type: "success",
                title: "Limit Updated",
                message: `Daily limit for ${date} set to ${new Intl.NumberFormat(undefined, { style: "currency", currency: "LKR" }).format(newMax)}`,
            },
        });

    } catch (error: any) {
        console.error("Update Limit API Error:", error);
        return NextResponse.json(
            { error: { message: error.message || "Internal Server Error" } },
            { status: 500 }
        );
    }
}
