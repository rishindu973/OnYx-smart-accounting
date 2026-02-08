
"use server";
import { db } from "@/lib/db";
import { UniversalDocument } from "@/types/accounting";
import { DocType } from "@prisma/client";

export async function saveScannedDocument(data: UniversalDocument, companyId: string) {
  try {
    const newDoc = await db.document.create({
      data: {
        companyId: companyId,
        type: data.metadata.type === "CHEQUE" ? DocType.Cheque : DocType.Invoice, 
        
        status: "PENDING",
        extraction: {
          create: {
            extractedData: data.extracted_data as any,
            totalAmount: data.extracted_data.total_amount,
            confidenceScores: data.intelligence.confidence_score as any,
            amountValidationPass: data.intelligence.amount_validation_passed,
            isManual: data.metadata.isManual || false,
          }
        }
      },
      include: { extraction: true }
    });

    return { success: true, id: newDoc.id };
  } catch (error) {
    console.error("Onyx Database Error:", error);
    return { success: false };
  }
}