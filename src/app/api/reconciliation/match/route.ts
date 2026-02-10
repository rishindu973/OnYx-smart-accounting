import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { differenceInDays, parseISO, isValid } from "date-fns";

interface BankStatementRow {
    id: string;
    date: string; // ISO or recognizable format
    description: string;
    amount: number; // positive for deposit/credit, negative for withdrawal/debit usually, or handled by type
}

interface MatchCandidate {
    ledgerLineId: string;
    score: number;
    reason: string;
    ledgerDate: Date;
    ledgerAmount: number;
    ledgerDescription: string | null;
}

interface MatchResult {
    bankRowId: string;
    status: "MATCHED" | "POSSIBLE" | "UNMATCHED";
    candidates: MatchCandidate[];
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const rows: BankStatementRow[] = body.rows;

        if (!rows || !Array.isArray(rows)) {
            return NextResponse.json({ error: "Invalid rows data" }, { status: 400 });
        }

        // Get Company ID
        const headersList = await headers();
        let companyId = headersList.get("x-company-id");

        if (!companyId) {
            const firstCompany = await db.company.findFirst();
            if (firstCompany) {
                companyId = firstCompany.id;
            }
        }

        if (!companyId) {
            return NextResponse.json({ error: "Company context required" }, { status: 400 });
        }

        // 1. Fetch potential ledger lines (unreconciled? For now just all recent)
        // Optimization: Date range filtering based on min/max of rows
        // For simplicity: Fetch all for company, we filter in memory. Real app would range query.
        const ledgerLines = await db.ledgerLine.findMany({
            where: {
                account: {
                    companyId: companyId
                }
            },
            include: {
                journalEntry: true,
                account: true
            }
        });

        const results: MatchResult[] = [];

        for (const row of rows) {
            const rowDate = new Date(row.date);
            if (!isValid(rowDate)) {
                results.push({ bankRowId: row.id, status: "UNMATCHED", candidates: [] });
                continue;
            }

            const candidates: MatchCandidate[] = [];

            for (const line of ledgerLines) {
                const lineDate = line.journalEntry.entryDate;
                const lineAmount = Number(line.debit) > 0 ? -Number(line.debit) : Number(line.credit);
                // Assumption: Bank statement amount +ve for credit, -ve for debit. 
                // Ledger: Debit is +ve in DB usually but represents money leaving asset? 
                // Let's assume input 'amount' aligns with signed (+/-) representation.
                // Actually, let's look at absolute difference for amount matching first.

                // Matching Rules:
                // 1. Amount Match (Exact or very close)
                const amountDiff = Math.abs(row.amount - lineAmount);
                const isAmountMatch = amountDiff < 0.05; // floating point tolerance

                if (!isAmountMatch) continue;

                // 2. Date Match (within 5 days)
                const dateDiff = Math.abs(differenceInDays(rowDate, lineDate));
                if (dateDiff > 5) continue;

                let score = 100;
                let reasons = ["Amount match"];

                // Penalize date difference
                if (dateDiff > 0) {
                    score -= (dateDiff * 10);
                    reasons.push(`Date diff: ${dateDiff} days`);
                }

                // Description Fuzzy Match (Simple inclusion)
                const lineDesc = (line.lineDescription || "") + " " + (line.journalEntry.description || "");
                const rowDescNorm = row.description.toLowerCase();
                const lineDescNorm = lineDesc.toLowerCase();

                let descMatch = false;
                if (rowDescNorm.includes(lineDescNorm) || lineDescNorm.includes(rowDescNorm)) {
                    descMatch = true;
                    reasons.push("Description substring match");
                } else {
                    // Slight penalty if no description match? Or just neutral.
                    // If description is totally different, might be wrong.
                }

                candidates.push({
                    ledgerLineId: line.id,
                    score: score,
                    reason: reasons.join(", "),
                    ledgerDate: lineDate,
                    ledgerAmount: lineAmount,
                    ledgerDescription: lineDesc
                });
            }

            // Sort candidates by score
            candidates.sort((a, b) => b.score - a.score);

            results.push({
                bankRowId: row.id,
                status: candidates.length > 0 ? (candidates[0].score >= 90 ? "MATCHED" : "POSSIBLE") : "UNMATCHED",
                candidates: candidates.slice(0, 5) // Top 5
            });
        }

        return NextResponse.json({ results });

    } catch (error: any) {
        console.error("Reconciliation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
