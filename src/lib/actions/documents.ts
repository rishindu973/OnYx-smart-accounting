"use server";

import { prisma } from "@/lib/prisma";
import { Prisma, DocType, DocStatus, SourceType } from "@prisma/client";
import { UniversalDocument } from "@/types/accounting";

export type SaveDocResult = {
  success: boolean;
  documentId?: string;
  extractionId?: string;
  journalEntryId?: string;
  error?: string;
};

function toDecimal(n: number) {
  return new Prisma.Decimal(Number.isFinite(n) ? n : 0);
}

function toDateOnly(dateStr?: string): Date {
  if (!dateStr) return new Date();

  const cleaned = dateStr.trim();
  const m = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    return new Date(Date.UTC(y, mo, d));
  }

  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) return parsed;

  return new Date();
}

function mapDocType(metaType?: string): DocType {
  if (metaType === "CHEQUE") return DocType.Cheque;
  if (metaType === "INVOICE") return DocType.Invoice;
  return DocType.Other;
}

function mapSourceType(source?: string, isManual?: boolean): SourceType {
  if (source === "AI_SCAN") return SourceType.AI_SCAN;
  if (source === "USER_INPUT") return SourceType.USER_INPUT;
  return isManual ? SourceType.USER_INPUT : SourceType.AI_SCAN;
}

export async function saveScannedDocument(
  doc: UniversalDocument,
  companyId: string
): Promise<SaveDocResult> {
  try {
    if (!companyId) return { success: false, error: "Missing companyId" };

    const isManual = Boolean(doc?.metadata?.isManual);
    const docType = mapDocType(doc?.metadata?.type);
    const sourceType = mapSourceType(doc?.metadata?.source, isManual);

    const extracted = doc?.extracted_data ?? {};
    const intelligence = doc?.intelligence ?? {};

    const totalAmountNumber = Number(extracted?.total_amount ?? 0);
    const entryDate = toDateOnly(extracted?.date);

    // 1) Document
    const createdDocument = await prisma.document.create({
      data: {
        companyId,
        type: docType,
        status: DocStatus.PROCESSED,
        fileUrl: (doc as any)?.metadata?.fileUrl ?? null,
      },
    });

    // 2) ExtractedInformation
    const createdExtraction = await prisma.extractedInformation.create({
      data: {
        documentId: createdDocument.id,
        extractedData: extracted as any,
        totalAmount: toDecimal(totalAmountNumber),
        confidenceScores: (intelligence?.confidence_score ?? {}) as any,
        amountValidationPass: Boolean(intelligence?.amount_validation_passed),
        isManual,
      },
    });

    // 3) JournalEntry
    const createdJournalEntry = await prisma.journalEntry.create({
      data: {
        companyId,
        documentId: createdDocument.id,
        entryDate,
        sourceType,
        description: isManual
          ? `Manual entry: ${extracted?.payee_name ?? "Unknown payee"}`
          : `AI scan: ${extracted?.payee_name ?? "Unknown payee"}`,
      },
    });

    return {
      success: true,
      documentId: createdDocument.id,
      extractionId: createdExtraction.id,
      journalEntryId: createdJournalEntry.id,
    };
  } catch (err: any) {
    console.error("saveScannedDocument() error:", err);
    return {
      success: false,
      error: err?.message ?? "Unknown backend error",
    };
  }
}


