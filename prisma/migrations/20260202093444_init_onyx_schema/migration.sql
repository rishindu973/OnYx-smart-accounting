-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('Cheque', 'Invoice', 'Bill', 'Other');

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('AI_SCAN', 'USER_INPUT');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('STANDARD', 'REVERSAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "daily_limit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "fiscal_year_start" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartOfAccounts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_type" "AccountType" NOT NULL,
    "account_code" TEXT NOT NULL,
    "current_balance" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "tags" JSONB,
    "parent_account_id" TEXT,

    CONSTRAINT "ChartOfAccounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "file_url" TEXT,
    "type" "DocType" NOT NULL,
    "status" "DocStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtractedInformation" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "extracted_data" JSONB NOT NULL,
    "confidence_score" JSONB NOT NULL,
    "amount_validation" BOOLEAN NOT NULL DEFAULT false,
    "is_manual" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ExtractedInformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "documentId" TEXT,
    "reversal_of_id" TEXT,
    "entry_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "sourceType" "SourceType" NOT NULL,
    "entry_type" "EntryType" NOT NULL DEFAULT 'STANDARD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerLine" (
    "id" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "line_description" TEXT,

    CONSTRAINT "LedgerLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLimit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "max_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "current_spend" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "DailyLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorMapping" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "default_debit_account_id" TEXT NOT NULL,
    "default_credit_account_id" TEXT NOT NULL,

    CONSTRAINT "VendorMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_companyId_key" ON "User"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "ChartOfAccounts_companyId_account_code_key" ON "ChartOfAccounts"("companyId", "account_code");

-- CreateIndex
CREATE UNIQUE INDEX "ExtractedInformation_documentId_key" ON "ExtractedInformation"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_reversal_of_id_key" ON "JournalEntry"("reversal_of_id");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLimit_companyId_date_key" ON "DailyLimit"("companyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "VendorMapping_companyId_vendor_name_key" ON "VendorMapping"("companyId", "vendor_name");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartOfAccounts" ADD CONSTRAINT "ChartOfAccounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartOfAccounts" ADD CONSTRAINT "ChartOfAccounts_parent_account_id_fkey" FOREIGN KEY ("parent_account_id") REFERENCES "ChartOfAccounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtractedInformation" ADD CONSTRAINT "ExtractedInformation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "JournalEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerLine" ADD CONSTRAINT "LedgerLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerLine" ADD CONSTRAINT "LedgerLine_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ChartOfAccounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLimit" ADD CONSTRAINT "DailyLimit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorMapping" ADD CONSTRAINT "VendorMapping_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
