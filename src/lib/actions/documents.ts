"use server";
import { prisma } from "@/lib/prisma";
import { Prisma, DocType, DocStatus, SourceType } from "@prisma/client";
import { UniversalDocument } from "@/types/accounting";
import { revalidatePath } from "next/cache";

function toDecimal(n: number) {
  return new Prisma.Decimal(Number.isFinite(n) ? n : 0);
}

export async function saveScannedDocument(
  doc: UniversalDocument,
  companyId: string,
  fileUrl?: string,
  direction: 'DEBIT' | 'CREDIT' = 'DEBIT'
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  if (!companyId) return { success: false, error: "Missing companyId" };

  try {
    // 1. DATA PREPARATION (Do all heavy lookups OUTSIDE the transaction)
    const totalAmount = toDecimal(doc.extracted_data.total_amount);
    let entryDate = new Date(doc.extracted_data.date);
    let isDateFallback = false;
    const now = new Date();
    const futureGuard = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (isNaN(entryDate.getTime()) || entryDate > futureGuard) {
      entryDate = new Date();
      isDateFallback = true;
    }
    entryDate.setHours(0, 0, 0, 0);

    // Resolve Account ID logic moved here to save transaction time
    let expenseAccountId: string | null = null;
    if (doc.intelligence.suggestion_account_id) {
      const account = await prisma.chartOfAccounts.findFirst({
        where: {
          companyId,
          OR: [
            { id: doc.intelligence.suggestion_account_id },
            { code: doc.intelligence.suggestion_account_id }
          ]
        },
      });
      expenseAccountId = account?.id || null;
    }

    // Fallback Expense Account
    if (!expenseAccountId) {
      const fallbackExpense = await prisma.chartOfAccounts.findFirst({
        where: {
          companyId,
          type: "EXPENSE",
          name: { in: ["Uncategorized Expenses", "General Expenses", "Office Expenses"] }
        }
      }) || await prisma.chartOfAccounts.findFirst({ where: { companyId, type: "EXPENSE" } });

      expenseAccountId = fallbackExpense?.id || null;
    }

    // Liability Account Lookup
    const liabilityAccount = await prisma.chartOfAccounts.findFirst({
      where: {
        companyId,
        type: "LIABILITY",
        name: { in: ["Accounts Payable", "Accrued Expenses", "Credit Card"] }
      }
    }) || await prisma.chartOfAccounts.findFirst({ where: { companyId, type: "LIABILITY" } });

    // 2. DATABASE WRITE (Keep the transaction block as slim as possible)
    return await prisma.$transaction(async (tx) => {
      // Create missing accounts if they STILL don't exist (last resort)
      let finalExpenseId = expenseAccountId;
      if (!finalExpenseId) {
        const newAcc = await tx.chartOfAccounts.create({
          data: { companyId, name: "AI-Provisioned Expense", type: "EXPENSE", code: "6000-AUTO" }
        });
        finalExpenseId = newAcc.id;
      }

      let finalLiabilityId = liabilityAccount?.id;
      if (!finalLiabilityId) {
        const newAcc = await tx.chartOfAccounts.create({
          data: { companyId, name: "AI-Provisioned Liability", type: "LIABILITY", code: "2000-AUTO" }
        });
        finalLiabilityId = newAcc.id;
      }

      // Handle Daily Limit
      const dailyLimit = await tx.dailyLimit.findUnique({
        where: { companyId_date: { companyId, date: entryDate } },
      });

      if (dailyLimit) {
        let newSpend = direction === 'CREDIT'
          ? dailyLimit.currentSpend.sub(totalAmount)
          : dailyLimit.currentSpend.add(totalAmount);

        if (newSpend.lessThan(0)) newSpend = new Prisma.Decimal(0);

        if (direction === 'DEBIT' && newSpend.greaterThan(dailyLimit.maxAmount)) {
          return { success: false, error: `Daily limit exceeded.` };
        }

        await tx.dailyLimit.update({ where: { id: dailyLimit.id }, data: { currentSpend: newSpend } });
      }

      // Save Document and Journal Entry
      const createdDocument = await tx.document.create({
        data: {
          companyId,
          type: doc.metadata.type === "CHEQUE" ? DocType.Cheque : DocType.Invoice,
          status: DocStatus.PROCESSED,
          fileUrl: doc.metadata.isManual ? null : fileUrl,
          extraction: {
            create: {
              extractedData: { ...doc.extracted_data, is_date_fallback: isDateFallback } as any,
              totalAmount,
              confidenceScores: (doc.metadata.isManual ? { date: 1 } : doc.intelligence.confidence_scores) as any,
              amountValidationPass: doc.intelligence.amount_validation_passed,
              isManual: doc.metadata.isManual,
            }
          },
        },
      });

      await tx.journalEntry.create({
        data: {
          companyId,
          entryDate,
          sourceType: doc.metadata.isManual ? SourceType.USER_INPUT : SourceType.AI_SCAN,
          description: direction === 'CREDIT' ? `(CREDIT) AI scan: ${doc.extracted_data.payee_name}` : `AI scan: ${doc.extracted_data.payee_name}`,
          documentId: createdDocument.id,
          ledgerLines: {
            create: [
              { accountId: finalExpenseId, debit: direction === 'DEBIT' ? totalAmount : 0, credit: direction === 'CREDIT' ? totalAmount : 0, lineDescription: `Expense Side` },
              { accountId: finalLiabilityId, debit: direction === 'CREDIT' ? totalAmount : 0, credit: direction === 'DEBIT' ? totalAmount : 0, lineDescription: `Liability Side` },
            ]
          }
        }
      });

      return { success: true, id: createdDocument.id };
    }, {
      timeout: 15000 // Increased to 15s to handle cross-region latency
    });
  } catch (err: any) {
    console.error("Database Save Error:", err);
    return { success: false, error: err.message };
  } finally {
    revalidatePath("/transactions");
    revalidatePath("/ledger");
  }
}