"use server";
import { prisma } from "@/lib/prisma";
import { Prisma, DocType, DocStatus, SourceType } from "@prisma/client";
import { UniversalDocument } from "@/types/accounting";
import { revalidatePath } from "next/cache";

// ✅ Helper for Decimal precision in PostgreSQL [cite: 1288]
function toDecimal(n: number) {
  return new Prisma.Decimal(Number.isFinite(n) ? n : 0);
}

export async function saveScannedDocument(
  doc: UniversalDocument,
  companyId: string,
  fileUrl?: string,
  direction: 'DEBIT' | 'CREDIT' = 'DEBIT'
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  // Basic Validation
  if (!companyId) return { success: false, error: "Missing companyId" };

  try {
    return await prisma.$transaction(async (tx) => {
      //Date Normalization & Fallback Logi
      let entryDate = new Date(doc.extracted_data.date);
      let isDateFallback = false;
      const now = new Date();
      // Guard: Future date > 24 hours
      const futureGuard = new Date(now);
      futureGuard.setHours(futureGuard.getHours() + 24);

      if (isNaN(entryDate.getTime()) || entryDate > futureGuard) {
        console.warn(`[OCR] Invalid/Future date detected: ${doc.extracted_data.date}. Falling back to today.`);
        entryDate = new Date();
        isDateFallback = true;
      }

      // Normalize to Midnight (Zero-Hour Rule) for Daily Limit Consistency
      entryDate.setHours(0, 0, 0, 0);

      // Daily Limit Check
      const totalAmount = toDecimal(doc.extracted_data.total_amount);

      // Check if a specific limit exists for this day
      const dailyLimit = await tx.dailyLimit.findUnique({
        where: {
          companyId_date: {
            companyId,
            date: entryDate,
          },
        },
      });

      if (dailyLimit) {
        // Check if new total exceeds max
        // DEBIT increases spend, CREDIT decreases spend
        let newSpend;
        if (direction === 'CREDIT') {
          newSpend = dailyLimit.currentSpend.sub(totalAmount);
          // Prevent negative spend logic if desired, or allow it. User said "subtract".
        } else {
          newSpend = dailyLimit.currentSpend.add(totalAmount);
        }

        // Prevent negative spend visual
        if (newSpend.lessThan(0)) newSpend = new Prisma.Decimal(0);

        if (direction === 'DEBIT' && newSpend.greaterThan(dailyLimit.maxAmount)) {
          // Graceful Error Result instead of throw (User Enhancement 4)
          return {
            success: false,
            error: `Daily limit exceeded for ${entryDate.toISOString().split('T')[0]}. Limit: ${dailyLimit.maxAmount}, Current + New: ${newSpend}`
          };
        }

        // Update current spend
        await tx.dailyLimit.update({
          where: { id: dailyLimit.id },
          data: { currentSpend: newSpend },
        });
      }

      // Prepare Data
      const isManual = doc.metadata.isManual;
      const sourceType = isManual ? SourceType.USER_INPUT : SourceType.AI_SCAN;
      const finalFileUrl = isManual ? null : fileUrl;

      // Document Extraction Creation
      const confidenceScores = isManual
        ? {
          date: 1.0,
          payee_name: 1.0,
          amount_numeric: 1.0,
          amount_in_words: 1.0,
          bank_name: 1.0,
          currency: 1.0,
          endorsement: 1.0,
        }
        : doc.intelligence.confidence_scores;

      // Inject fallback flag into extractedData for UI visibility
      const finalExtractedData = {
        ...doc.extracted_data,
        is_date_fallback: isDateFallback
      };

      const createdDocument = await tx.document.create({
        data: {
          companyId,
          type: doc.metadata.type === "CHEQUE" ? DocType.Cheque : DocType.Invoice,
          status: DocStatus.PROCESSED,
          fileUrl: finalFileUrl,
          extraction: {
            create: {
              extractedData: finalExtractedData as any,
              totalAmount: totalAmount,
              confidenceScores: confidenceScores as any,
              amountValidationPass: doc.intelligence.amount_validation_passed,
              isManual,
            }
          },
        },
      });

      // Create Balanced Journal Entry

      // Resolve Account ID if provided 
      let targetAccountId = null;
      if (doc.intelligence.suggestion_account_id) {
        // Attempt to find account by ID (if it's a UUID) or Code
        const account = await tx.chartOfAccounts.findFirst({
          where: {
            companyId,
            OR: [
              { id: doc.intelligence.suggestion_account_id },
              { code: doc.intelligence.suggestion_account_id }
            ]
          },
        });
        if (account) {
          targetAccountId = account.id;
        }
      }



      // Fix: If AI suggestion was invalid (targetAccountId is null), we must fall back to default logic.
      // Previously, we initialized this with the raw suggestion, which bypassed the fallback check.
      let expenseAccountId = targetAccountId;

      // If no AI suggestion, find default expense
      if (!expenseAccountId) {
        const defaultExpense = await tx.chartOfAccounts.findFirst({
          where: {
            companyId,
            type: "EXPENSE",
            name: { in: ["Uncategorized Expenses", "General Expenses", "Office Expenses"] }
          }
        });

        // Any Expense Account
        const anyExpense = defaultExpense || await tx.chartOfAccounts.findFirst({
          where: { companyId, type: "EXPENSE" }
        });

        if (!anyExpense) {
          console.log(`[Auto-Provision] Creating default Expense account for company ${companyId}`);
          const newExpense = await tx.chartOfAccounts.create({
            data: {
              companyId,
              name: "Uncategorized Expenses (AI-Provisioned)",
              type: "EXPENSE",
              code: "6000-AUTO",
            }
          });
          expenseAccountId = newExpense.id;
        } else {
          expenseAccountId = anyExpense.id;
        }
      }

      // Preferred Liabilities
      let liabilityAccount = await tx.chartOfAccounts.findFirst({
        where: {
          companyId,
          type: "LIABILITY",
          name: { in: ["Accounts Payable", "Accrued Expenses", "Credit Card", "Due to Directors"] }
        }
      });

      // Any Liability if Tier 1 fails
      if (!liabilityAccount) {
        liabilityAccount = await tx.chartOfAccounts.findFirst({
          where: { companyId, type: "LIABILITY" }
        });
      }

      //Cash/Bank (Assets) if no Liability found
      if (!liabilityAccount) {
        liabilityAccount = await tx.chartOfAccounts.findFirst({
          where: {
            companyId,
            type: "ASSET",
            OR: [
              { name: { contains: "Cash", mode: "insensitive" } },
              { name: { contains: "Bank", mode: "insensitive" } }
            ]
          }
        });
      }

      // Emergency Auto-Provisioning (Zero-Click Fix)
      if (!liabilityAccount) {
        console.log(`[Auto-Provision] Creating default Liability account for company ${companyId}`);
        liabilityAccount = await tx.chartOfAccounts.create({
          data: {
            companyId,
            name: "Accounts Payable (AI-Provisioned)",
            type: "LIABILITY",
            code: "2000-AUTO",
          }
        });
      }

      // Prepare Ledger Lines based on Direction
      // DEBIT: Dr Expense, Cr Liability
      // Prepare Ledger Lines based on Direction
      // DEBIT: Dr Expense, Cr Liability
      // CREDIT: Dr Liability, Cr Expense
      const line1 = direction === 'DEBIT'
        ? {
          // Expense Side
          accountId: targetAccountId || expenseAccountId,
          debit: totalAmount,
          credit: 0,
          lineDescription: `Expense: ${doc.extracted_data.payee_name}`
        }
        : {
          // Expense Side (Reversed)
          accountId: targetAccountId || expenseAccountId,
          debit: 0,
          credit: totalAmount,
          lineDescription: `Refund/Income: ${doc.extracted_data.payee_name}`
        };

      const line2 = direction === 'DEBIT'
        ? {
          // Liability Side
          accountId: liabilityAccount.id,
          debit: 0,
          credit: totalAmount,
          lineDescription: `Payable: ${doc.extracted_data.payee_name}`
        }
        : {
          // Liability Side (Reversed)
          accountId: liabilityAccount.id,
          debit: totalAmount,
          credit: 0,
          lineDescription: `Refund Adj: ${doc.extracted_data.payee_name}`
        };


      await tx.journalEntry.create({
        data: {
          companyId,
          entryDate: entryDate,
          sourceType,
          description: isManual
            ? `(CREDIT) Manual: ${doc.extracted_data.payee_name}`
            : direction === 'CREDIT' ? `(CREDIT) AI scan: ${doc.extracted_data.payee_name}` : `AI scan: ${doc.extracted_data.payee_name}`,
          documentId: createdDocument.id,
          ledgerLines: {
            create: [line1, line2]
          }
        }
      });

      revalidatePath("/transactions");
      revalidatePath("/ledger");
      return { success: true, id: createdDocument.id };
    });
  } catch (err: any) {
    console.error("Database Save Error:", err);
    return { success: false, error: err.message };
  }
}