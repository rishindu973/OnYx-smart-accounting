/*
  Warnings:

  - Added the required column `updated_at` to the `DailyLimit` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DailyLimit" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "ExtractedInformation" ADD COLUMN     "total_amount" DECIMAL(15,2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE "JournalEntry" ALTER COLUMN "entry_date" SET DATA TYPE DATE;

-- CreateTable
CREATE TABLE "DailyLimitAudit" (
    "id" TEXT NOT NULL,
    "daily_limit_id" TEXT NOT NULL,
    "changed_by" TEXT,
    "old_max_amount" DECIMAL(15,2),
    "new_max_amount" DECIMAL(15,2) NOT NULL,
    "reason" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyLimitAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyLimitAudit_daily_limit_id_idx" ON "DailyLimitAudit"("daily_limit_id");

-- CreateIndex
CREATE INDEX "DailyLimitAudit_changed_at_idx" ON "DailyLimitAudit"("changed_at");

-- CreateIndex
CREATE INDEX "DailyLimit_companyId_date_idx" ON "DailyLimit"("companyId", "date");

-- CreateIndex
CREATE INDEX "JournalEntry_companyId_entry_date_idx" ON "JournalEntry"("companyId", "entry_date");

-- CreateIndex
CREATE INDEX "JournalEntry_documentId_idx" ON "JournalEntry"("documentId");

-- CreateIndex
CREATE INDEX "LedgerLine_journalEntryId_idx" ON "LedgerLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "LedgerLine_accountId_idx" ON "LedgerLine"("accountId");

-- CreateIndex
CREATE INDEX "VendorMapping_default_debit_account_id_idx" ON "VendorMapping"("default_debit_account_id");

-- CreateIndex
CREATE INDEX "VendorMapping_default_credit_account_id_idx" ON "VendorMapping"("default_credit_account_id");

-- AddForeignKey
ALTER TABLE "DailyLimitAudit" ADD CONSTRAINT "DailyLimitAudit_daily_limit_id_fkey" FOREIGN KEY ("daily_limit_id") REFERENCES "DailyLimit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMapping" ADD CONSTRAINT "VendorMapping_default_debit_account_id_fkey" FOREIGN KEY ("default_debit_account_id") REFERENCES "ChartOfAccounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMapping" ADD CONSTRAINT "VendorMapping_default_credit_account_id_fkey" FOREIGN KEY ("default_credit_account_id") REFERENCES "ChartOfAccounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
