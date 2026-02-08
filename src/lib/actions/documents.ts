
// export async function saveScannedDocument(data: UniversalDocument, companyId: string) {
//   try {
//     const newDoc = await db.document.create({
//       data: {
//         // Ensure this companyId actually exists in your Company table
//         companyId: companyId, 
        
//         // Use the imported enum for type safety
//         // If your schema uses PascalCase, use DocType.Cheque
//         type: data.metadata.type === "CHEQUE" ? DocType.CHEQUE : DocType.INVOICE, 
        
//         status: "PENDING",
//         extraction: {
//           create: {
//             extractedData: data.extracted_data as any,
//             confidenceScores: data.intelligence.confidence_score as any,
//             amountValidationPass: data.intelligence.amount_validation_passed,
//             isManual: data.metadata.isManual || false,
//           }
//         }
//       },
//       include: { extraction: true }
//     });

//     return { success: true, id: newDoc.id };
//   } catch (error) {
//     console.error("Onyx Database Error:", error);
//     return { success: false };
//   }
// }
// ✅ Correcting the enum casing in documents.ts
"use server";
import { db } from "@/lib/db";
import { UniversalDocument } from "@/types/accounting";
import { DocType } from "@prisma/client"; // ✅ Prisma generates this from your schema

export async function saveScannedDocument(data: UniversalDocument, companyId: string) {
  try {
    const newDoc = await db.document.create({
      data: {
        // ✅ Ensure this is a REAL company ID from your database
        companyId: companyId, 
        
        // ✅ MATCH PASCALCASE: Cheque, Invoice, Bill, or Other
        type: data.metadata.type === "CHEQUE" ? DocType.Cheque : DocType.Invoice, 
        
        status: "PENDING",
        extraction: {
          create: {
            extractedData: data.extracted_data as any,
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