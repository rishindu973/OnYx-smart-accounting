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
        let dateVal = new Date().toISOString().split("T")[0];
        try {
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
            id: info.id,
            date: dateVal,
            description: data?.vendor_name || data?.payee_name || "Pending Extraction",
            account: "Pending Classification",
            accountCode: "PENDING",
            debit: info.totalAmount.toNumber(),
            credit: null,
            source: "AI_SCAN",
            documentUrl: info.document.fileUrl || "",
            reversalOfId: undefined,
            isReversed: false,
            // ✅ From Incoming: Marks item as pending for the UI [cite: 124]
            isPending: true,
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
        revalidatePath("/dashboard");
        revalidatePath("/");
        return { success: true, id: journalEntry.id };

    } catch (error) {
        console.error("Failed to create transaction:", error);
        return { success: false, error: "Failed to create transaction" };
    }
}

// ✅ From Incoming: Enhanced void logic to handle Pending items [cite: 134-140]
export async function voidTransaction(originalId: string, isPending: boolean = false, companyId: string = "clx-onyx-001") {
    try {
        if (isPending) {
            // 🛡️ For pending items, we delete the extraction and fail the document 
            const extraction = await db.extractedInformation.findUnique({
                where: { id: originalId },
                include: { document: true }
            });

            if (extraction) {
                await db.extractedInformation.delete({
                    where: { id: originalId }
                });

                await db.document.update({
                    where: { id: extraction.documentId },
                    data: { status: "FAILED" }
                });
            }

            revalidatePath("/ledger");
            revalidatePath("/dashboard");
            revalidatePath("/");
            return { success: true };
        }

        // 🏦 For confirmed items, we use the "No-Delete" reversal policy [cite: 141-148, 460]
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

        const reversalLines = originalJournalEntry.ledgerLines.map(line => ({
            accountId: line.accountId,
            debit: line.credit, // Swap Debit/Credit for Reversal [cite: 145]
            credit: line.debit,
            lineDescription: `Reversal of: ${line.lineDescription || ''}`
        }));

        await db.$transaction(async (tx) => {
            await tx.journalEntry.create({
                data: {
                    companyId,
                    entryDate: new Date(),
                    description: `Reversal of: ${originalJournalEntry.description}`,
                    sourceType: "USER_INPUT",
                    entryType: "REVERSAL",
                    reversalOfId: originalJournalEntry.id,
                    ledgerLines: {
                        create: reversalLines
                    }
                }
            });
        });

        revalidatePath("/ledger");
        revalidatePath("/dashboard");
        revalidatePath("/");
        return { success: true };

    } catch (error) {
        console.error("Failed to void transaction:", error);
        return { success: false, error: "Failed to void transaction" };
    }
}