"use server";
import { prisma } from "@/lib/prisma";
import { Prisma, DocType, DocStatus, SourceType } from "@prisma/client";
import { UniversalDocument } from "@/types/accounting";
import { revalidatePath } from "next/cache";

// ✅ Helper for Decimal precision in PostgreSQL [cite: 1288]
function toDecimal(n: number) {
  return new Prisma.Decimal(Number.isFinite(n) ? n : 0);
}

export async function saveScannedDocument(doc: UniversalDocument, companyId: string, fileUrl?: string) {
  try {
    if (!companyId) return { success: false, error: "Missing companyId" };

    const isManual = doc.metadata.isManual;
    const sourceType = isManual ? SourceType.USER_INPUT : SourceType.AI_SCAN;

    // 1) Create the Document record [cite: 1297]
    const createdDocument = await prisma.document.create({
      data: {
        companyId,
        type: doc.metadata.type === "CHEQUE" ? DocType.Cheque : DocType.Invoice,
        status: DocStatus.PROCESSED,
        fileUrl: isManual ? null : fileUrl,
        extraction: {
          create: {
            extractedData: doc.extracted_data as any,
            totalAmount: toDecimal(doc.extracted_data.total_amount),
            confidenceScores: doc.intelligence.confidence_score as any,
            amountValidationPass: doc.intelligence.amount_validation_passed,
            isManual,
          }
        },
        // 2) Create the Journal Entry for the audit trail [cite: 1048, 1303]
        journalEntry: {
          create: {
            companyId,
            entryDate: new Date(doc.extracted_data.date),
            sourceType,
            description: isManual 
              ? `Manual entry: ${doc.extracted_data.payee_name}` 
              : `AI scan: ${doc.extracted_data.payee_name}`,
          }
        }
      },
    });

    revalidatePath("/transactions");
    revalidatePath("/ledger");
    return { success: true, id: createdDocument.id };
  } catch (err: any) {
    console.error("Database Save Error:", err);
    return { success: false, error: err.message };
  }
}