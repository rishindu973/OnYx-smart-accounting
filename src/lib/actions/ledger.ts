"use server";

import { db } from "@/lib/db";
import { LedgerEntry } from "@/types/ledger";
import { revalidatePath } from "next/cache";

export async function getLedgerLines(): Promise<LedgerEntry[]> {
    // Fetch existing ledger entries from JournalEntry/LedgerLine
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

    const confirmedEntries: LedgerEntry[] = ledgerLines.map((line) => {
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

    // Fetch pending AI extractions (items that haven't been converted to journal entries yet)
    // We look for ExtractedInformation where the document does NOT have a journal entry
    const pendingExtractions = await db.extractedInformation.findMany({
        where: {
            document: {
                journalEntry: {
                    none: {}
                }
            }
        },
        include: {
            document: true
        }
    });

    const pendingEntries: LedgerEntry[] = pendingExtractions.map((info) => {
        const data = info.extractedData as any;
        const dateStr = data?.date || new Date().toISOString();
        let dateVal = new Date().toISOString().split("T")[0];
        try {
            // Try to parse the date from the extracted data if possible
            if (data?.date) {
                const parsed = new Date(data.date);
                if (!isNaN(parsed.getTime())) {
                    dateVal = parsed.toISOString().split("T")[0];
                }
            }
        } catch (e) {
            // keep default
        }

        return {
            id: info.id, // Use extracted info ID
            date: dateVal,
            description: data?.vendor_name || data?.payee_name || "Pending Extraction",
            account: "Pending Classification",
            accountCode: "PENDING",
            debit: info.totalAmount.toNumber(),
            credit: null, // Default to debit for expenses? Or maybe null
            source: "AI_SCAN",
            documentUrl: info.document.fileUrl || "",
            reversalOfId: undefined,
            isReversed: false,
        }
    });

    const allEntries = [...confirmedEntries, ...pendingEntries].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return allEntries;
}

export async function createTransaction(data: LedgerEntry, companyId: string = "clx-onyx-001") {
    try {
        const account = await db.chartOfAccounts.findFirst({
            where: {
                companyId,
                code: data.accountCode
            }
        });

        if (!account) {
            throw new Error(`Account code ${data.accountCode} not found for company ${companyId}`);
        }

        const journalEntry = await db.journalEntry.create({
            data: {
                companyId,
                entryDate: new Date(data.date),
                description: data.description,
                sourceType: "USER_INPUT",
                entryType: "STANDARD",
                ledgerLines: {
                    create: {
                        accountId: account.id,
                        debit: data.debit ?? 0,
                        credit: data.credit ?? 0,
                        lineDescription: data.description
                    }
                }
            }
        });

        revalidatePath("/ledger");
        return { success: true, id: journalEntry.id };

    } catch (error) {
        console.error("Failed to create transaction:", error);
        return { success: false, error: "Failed to create transaction" };
    }
}

export async function voidTransaction(originalId: string, companyId: string = "clx-onyx-001") {
    try {
        // Finding original ledger line to get the Journal Entry and details
        const originalLine = await db.ledgerLine.findUnique({
            where: { id: originalId },
            include: {
                journalEntry: {
                    include: {
                        ledgerLines: true
                    }
                }
            }
        });

        if (!originalLine) {
            throw new Error("Original transaction not found");
        }

        const originalJournalEntry = originalLine.journalEntry;

        if (originalJournalEntry.entryType === "REVERSAL" || originalJournalEntry.reversalOfId) {
            throw new Error("Cannot reverse a reversal entry");
        }

        // Prepare reversal lines for ALL lines in the original entry
        const reversalLines = originalJournalEntry.ledgerLines.map(line => ({
            accountId: line.accountId,
            debit: line.credit, // Swap
            credit: line.debit, // Swap
            lineDescription: `Reversal of: ${line.lineDescription || ''}`
        }));

        // Create Reversal Journal Entry
        await db.$transaction(async (tx) => {
            const reversalEntry = await tx.journalEntry.create({
                data: {
                    companyId,
                    entryDate: new Date(),
                    description: `Reversal of: ${originalJournalEntry.description}`,
                    sourceType: "USER_INPUT",
                    entryType: "REVERSAL",
                    reversalOfId: originalJournalEntry.id, // Linking to original Journal Entry
                    ledgerLines: {
                        create: reversalLines
                    }
                }
            });
        });

        revalidatePath("/ledger");
        return { success: true };

    } catch (error) {
        console.error("Failed to void transaction:", error);
        return { success: false, error: "Failed to void transaction" };
    }
}
