"use server";

import { db } from "@/lib/db";
import { LedgerEntry } from "@/types/ledger";

export async function getLedgerLines(): Promise<LedgerEntry[]> {
    const ledgerLines = await db.ledgerLine.findMany({
        include: {
            account: true,
            journalEntry: {
                include: {
                    document: true,
                    revertedBy: true,
                },
            },
        },
        orderBy: {
            journalEntry: {
                entryDate: "desc",
            },
        },
    });

    return ledgerLines.map((line) => {
        return {
            id: line.id,
            date: line.journalEntry.entryDate.toISOString().split("T")[0], // YYYY-MM-DD
            description: line.journalEntry.description || "",
            account: line.account.name,
            accountCode: line.account.code,
            debit: line.debit.toNumber() !== 0 ? line.debit.toNumber() : null,
            credit: line.credit.toNumber() !== 0 ? line.credit.toNumber() : null,
            source: line.journalEntry.sourceType === "AI_SCAN" ? "AI_SCAN" : "USER_INPUT",
            documentUrl: line.journalEntry.document?.fileUrl || "",
            reversalOfId: line.journalEntry.reversalOfId || undefined,
            isReversed: line.journalEntry.revertedBy !== null,
        };
    });
}
