import { Prisma } from "@prisma/client";
import { db as prisma } from "../lib/db";
import { parseISODateOnly } from "../utils/date";

export async function createCheque(data: {
  issueDate: string;     // "YYYY-MM-DD"
  amount: number;
  chequeNo: string;
  payee: string;
  companyId: string;
}) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Create a Document for the cheque
    const doc = await tx.document.create({
      data: {
        companyId: data.companyId,
        fileUrl: null,
        type: "Cheque",
        status: "PROCESSED",
      },
    });

    // Create a JournalEntry placeholder linked to the document
    await tx.journalEntry.create({
      data: {
        companyId: data.companyId,
        documentId: doc.id,
        entryDate: parseISODateOnly(data.issueDate),
        description: `Cheque #${data.chequeNo} - ${data.payee}`,
        sourceType: "USER_INPUT",
        entryType: "STANDARD",
      },
    });

    return doc;
  });
}
