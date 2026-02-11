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

export async function voidTransaction(originalId: string, isPending: boolean = false, companyId: string = "clx-onyx-001") {
    try {
        if (isPending) {
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
            debit: line.credit,
            credit: line.debit,
            lineDescription: `Reversal of: ${line.lineDescription || ''}`
        }));

        await db.$transaction(async (tx) => {
            await tx.journalEntry.create({
                data: {
                    companyId,
                    // Fix: Reversal should happen on the SAME DAY as the original entry 
                    // to gracefully "cancel it out" in daily accounting.
                    entryDate: new Date(originalJournalEntry.entryDate),
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


export async function closeFiscalYear(companyId: string, closingDate: Date = new Date()) {
    try {
        // Get Company details for Fiscal Year Start
        const company = await db.company.findUnique({
            where: { id: companyId },
            select: { fiscalYearStart: true }
        });

        if (!company) throw new Error("Company not found");

        const fiscalStart = new Date(company.fiscalYearStart);
        // Adjust year if fiscalStart is ahead of closingDate
        fiscalStart.setFullYear(closingDate.getFullYear() - (closingDate < fiscalStart ? 1 : 0));

        //Aggregate Temporary Accounts (Revenue & Expense)
        //need the NET balance of each account to zero it out.
        const tempAccounts = await db.chartOfAccounts.findMany({
            where: {
                companyId,
                type: { in: ["REVENUE", "EXPENSE"] }
            },
            include: {
                ledgerLines: {
                    where: {
                        journalEntry: {
                            entryDate: {
                                gte: fiscalStart,
                                lte: closingDate
                            },
                            // For now assume purely transactional sum.
                            entryType: { not: "CLOSING" }
                        }
                    }
                }
            }
        }) as any;

        let totalNetIncome = 0;
        const closingLines: { accountId: string; debit: number; credit: number; lineDescription: string }[] = [];

        for (const acc of tempAccounts) {
            // Calculate current balance
            // For Revenue (Credit normal): Balance = Credit - Debit
            // For Expense (Debit normal): Balance = Debit - Credit
            // We want to ZERO it out.
            // If Revenue has Credit bal 1000, we need to DEBIT 1000.
            // If Expense has Debit bal 500, we need to CREDIT 500.

            let debitSum = 0;
            let creditSum = 0;
            acc.ledgerLines.forEach(line => {
                debitSum += line.debit.toNumber();
                creditSum += line.credit.toNumber();
            });

            const netDebit = debitSum - creditSum;
            // If netDebit is Positive (Debit balance), we need Credit to close.
            // If netDebit is Negative (Credit balance), we need Debit to close.

            if (Math.abs(netDebit) < 0.01) continue; // Already zero-ish

            if (netDebit > 0) {
                // Has Debit balance (e.g. Expense). Credit to close.
                closingLines.push({
                    accountId: acc.id,
                    debit: 0,
                    credit: netDebit,
                    lineDescription: `Year-End Closing: Zero out ${acc.name}`
                });
                totalNetIncome -= netDebit; // Expense reduces income
            } else {
                // Has Credit balance (e.g. Revenue). Debit to close.
                const absBal = Math.abs(netDebit);
                closingLines.push({
                    accountId: acc.id,
                    debit: absBal,
                    credit: 0,
                    lineDescription: `Year-End Closing: Zero out ${acc.name}`
                });
                totalNetIncome += absBal; // Revenue increases income
            }
        }

        if (closingLines.length === 0) {
            return { success: true, message: "No balances to close." };
        }

        // 3. Find or Create Retained Earnings Account
        let retainedEarnings = await db.chartOfAccounts.findFirst({
            where: { companyId, name: "Retained Earnings", type: "EQUITY" }
        });

        if (!retainedEarnings) {
            // Fallback: Try to find ANY Equity account? Or better, create one.
            // For safety, let's create one if missing.
            // We need a code... let's assume a standard one or finding the max equity code + 1. 
            // Simplified: use a fixed code or fail. Let's try to create.
            retainedEarnings = await db.chartOfAccounts.create({
                data: {
                    companyId,
                    name: "Retained Earnings",
                    type: "EQUITY",
                    code: "3999", // Standard-ish placeholder
                }
            });
        }

        // 4. Add Retained Earnings Line
        if (totalNetIncome > 0) {
            // Profit: Credit Retained Earnings
            closingLines.push({
                accountId: retainedEarnings.id,
                debit: 0,
                credit: totalNetIncome,
                lineDescription: "Year-End Closing: Net Income Allocation"
            });
        } else if (totalNetIncome < 0) {
            // Loss: Debit Retained Earnings
            closingLines.push({
                accountId: retainedEarnings.id,
                debit: Math.abs(totalNetIncome),
                credit: 0,
                lineDescription: "Year-End Closing: Net Loss Allocation"
            });
        }

        // 5. Commit Transaction
        const result = await db.$transaction(async (tx) => {
            const je = await tx.journalEntry.create({
                data: {
                    companyId,
                    entryDate: closingDate,
                    description: `Fiscal Year Closing: ${fiscalStart.toISOString().split('T')[0]} - ${closingDate.toISOString().split('T')[0]}`,
                    sourceType: "USER_INPUT",
                    entryType: "CLOSING",
                    ledgerLines: {
                        create: closingLines
                    }
                }
            });
            return je;
        });

        revalidatePath("/ledger");
        revalidatePath("/dashboard");
        return { success: true, id: result.id };

    } catch (error: any) {
        console.error("Year End Closing Error:", error);
        return { success: false, error: error.message };
    }
}