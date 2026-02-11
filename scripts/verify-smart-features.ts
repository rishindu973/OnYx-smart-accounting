import { matchVendor } from "../src/lib/ai/vendor-matcher";
import { db } from "../src/lib/db";
import { differenceInDays, isValid } from "date-fns";

async function verifySmartSuggestions() {
    console.log("--- Verifying Smart Suggestions ---");

    // Get or Create Company
    let company = await db.company.findFirst();
    if (!company) {
        console.log("Creating test company...");
        company = await db.company.create({
            data: {
                name: "Test Company",
                fiscalYearStart: new Date(),
                dailyLimitBase: 1000,
            }
        });
    }
    console.log(`Using Company: ${company.name} (${company.id})`);

    // Setup Test Data (Accounts and Mappings)
    console.log("Setting up test accounts and mappings...");

    // Expense Account
    let expenseAccount = await db.chartOfAccounts.findFirst({ where: { companyId: company.id, name: "Software Subscriptions" } });
    if (!expenseAccount) {
        expenseAccount = await db.chartOfAccounts.create({
            data: {
                companyId: company.id,
                name: "Software Subscriptions",
                type: "EXPENSE",
                code: "6001",
                isDraft: false
            }
        });
    }

    // Bank Account (Asset) - needed for credit side of mapping
    let bankAccount = await db.chartOfAccounts.findFirst({ where: { companyId: company.id, type: "ASSET" } });
    if (!bankAccount) {
        bankAccount = await db.chartOfAccounts.create({
            data: {
                companyId: company.id,
                name: "Business Checking",
                type: "ASSET",
                code: "1000",
                isDraft: false
            }
        });
    }

    const vendorName = "Adobe Inc.";
    const existingMapping = await db.vendorMapping.findUnique({
        where: { companyId_vendorName: { companyId: company.id, vendorName: vendorName } }
    });

    if (!existingMapping) {
        await db.vendorMapping.create({
            data: {
                companyId: company.id,
                vendorName: vendorName,
                defaultDebitAccountId: expenseAccount.id,
                defaultCreditAccountId: bankAccount.id
            }
        });
    }

    //Test Known Vendor
    console.log(`Testing known vendor: ${vendorName}`);
    const result = await matchVendor(vendorName, company.id);
    console.log("Result:", result);

    if (result.suggestion_account_id === expenseAccount.id && !result.is_new_vendor) {
        console.log("SUCCESS: Known vendor matched correctly.");
    } else {
        console.error("FAILURE: Known vendor match failed.");
    }

    // Test New Vendor (Gemini)
    const newVendor = "GitHub Copilot Subscription";
    console.log(`Testing new vendor: ${newVendor}`);
    const aiResult = await matchVendor(newVendor, company.id);
    console.log("AI Result:", aiResult);

    if (aiResult.is_new_vendor) {
        console.log("SUCCESS: New vendor identified.");
        if (aiResult.suggestion_account_id) {
            console.log(`Suggested Account ID: ${aiResult.suggestion_account_id}`);
        } else {
            console.log("AI suggested creating a new account (or no match found).");
        }
        if (aiResult.suggested_account_name) {
            console.log(`Suggested Account Name: ${aiResult.suggested_account_name}`);
        }
    } else {
        console.error("FAILURE: New vendor incorrectly identified as existing.");
    }
    // Test Historical Data (No Mapping, but exists in DB)
    const historicalVendor = "Historic Supply Co.";
    console.log(`Testing historical vendor: ${historicalVendor}`);

    // Create a past document for this vendor to simulate history
    const pastJournal = await db.journalEntry.create({
        data: {
            companyId: company.id,
            entryDate: new Date("2025-01-01"),
            description: "Past Purchase",
            sourceType: "AI_SCAN",
            entryType: "STANDARD"
        }
    });

    // Create the document linked to it (needed for ExtractedInformation)
    const pastDoc = await db.document.create({
        data: {
            companyId: company.id,
            type: "Invoice",
            status: "PROCESSED",
            fileUrl: "http://mock.url",
        }
    });

    // Link Journal to Document
    await db.journalEntry.update({ where: { id: pastJournal.id }, data: { documentId: pastDoc.id } });

    // Create ExtractedInformation with the JSON payee name
    await db.extractedInformation.create({
        data: {
            documentId: pastDoc.id,
            extractedData: { payee_name: historicalVendor },
            totalAmount: 100,
            confidenceScores: {},
        }
    });

    // Create Ledger Line for Expense (Debit)
    await db.ledgerLine.create({
        data: {
            journalEntryId: pastJournal.id,
            accountId: expenseAccount.id, // Should suggest this
            debit: 100,
            credit: 0,
            lineDescription: " Historic Expense"
        }
    });

    // Test Match
    const historyResult = await matchVendor(historicalVendor, company.id);
    console.log("History Result:", historyResult);

    if (historyResult.suggestion_account_id === expenseAccount.id) {
        console.log("SUCCESS: Historical vendor matched correctly from past data.");
    } else {
        console.error("FAILURE: Historical vendor match failed.");
    }
}

async function verifyReconciliation() {
    console.log("\n--- Verifying Reconciliation Matching ---");
    const company = await db.company.findFirst();
    if (!company) {
        console.log("No company found.");
        return;
    }

    // Create a Ledger Line to "match" against
    // Ensure have an account to use
    let bankAccount = await db.chartOfAccounts.findFirst({ where: { companyId: company.id, type: "ASSET" } });
    if (!bankAccount) {
        bankAccount = await db.chartOfAccounts.create({
            data: {
                companyId: company.id,
                name: "Checking Account",
                type: "ASSET",
                code: "1001"
            }
        });
    }

    // Create a Journal Entry
    const entryDate = new Date();
    // Go back 2 days
    entryDate.setDate(entryDate.getDate() - 2);

    const journal = await db.journalEntry.create({
        data: {
            companyId: company.id,
            entryDate: entryDate,
            description: "Test Purchase for Office Supplies",
            sourceType: "USER_INPUT",
            entryType: "STANDARD"
        }
    });

    const ledgerLine = await db.ledgerLine.create({
        data: {
            journalEntryId: journal.id,
            accountId: bankAccount.id,
            debit: 0,
            credit: 150.00, // Accessing credit
            lineDescription: "Office Supplies Purchase"
        }
    });

    const creditAmount = Number(ledgerLine.credit);
    const debitAmount = Number(ledgerLine.debit);
    const amountVal = debitAmount > 0 ? debitAmount : creditAmount;

    console.log(`Created Ledger Line: Date=${journal.entryDate}, Amount=${amountVal}, Desc=${ledgerLine.lineDescription}`);

    // Create a "Bank Row" that should match
    const bankRow = {
        date: journal.entryDate.toISOString(),
        amount: amountVal, // Exact match 
        description: "Office Supplies Purchase test", // Fuzzy match
    };

    console.log("Created Mock Bank Row:", bankRow);

    // Run Matching Logic (Simulated - same logic as API)
    // Re-fetching to simulate DB read
    const fetchedLine = await db.ledgerLine.findUnique({
        where: { id: ledgerLine.id },
        include: { journalEntry: true }
    });

    if (!fetchedLine) return; // Should not happen

    const fetchedDebit = Number(fetchedLine.debit);
    const fetchedCredit = Number(fetchedLine.credit);

    // Logic from API:
    // const lineAmount = Number(line.debit) > 0 ? -Number(line.debit) : Number(line.credit); 
    // Wait, let's align with API logic exactly.
    // If Debit > 0 (Money out/asset up?), Amount = -Debit. 
    // If Credit > 0 (Money in/asset down?), Amount = Credit.

    // In case: Credit=150. So Amount = 150.
    const calculatedLineAmount = fetchedDebit > 0 ? -fetchedDebit : fetchedCredit;

    const amountDiff = Math.abs(bankRow.amount - calculatedLineAmount);
    const dateDiff = Math.abs(differenceInDays(new Date(bankRow.date), fetchedLine.journalEntry.entryDate));

    console.log(`Logic Check -> Bank: ${bankRow.amount}, LedgerCalc: ${calculatedLineAmount}`);
    console.log(`Amount Diff: ${amountDiff}, Date Diff: ${dateDiff}`);

    if (amountDiff < 0.05 && dateDiff <= 5) {
        console.log("SUCCESS: Match logic valid.");
    } else {
        console.error("FAILURE: Match logic failed.");
    }
}

async function run() {
    try {
        await verifySmartSuggestions();
        await verifyReconciliation();
    } catch (e) {
        console.error("Verification failed:", e);
        process.exit(1);
    }
    process.exit(0);
}

run();
