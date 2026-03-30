import { PrismaClient } from "@prisma/client";
import { saveScannedDocument } from "../src/lib/actions/documents";
import { getGovernanceCalendar, setDailyLimit } from "../src/lib/actions/governance";

const prisma = new PrismaClient();

async function main() {
    const companyId = "clx-onyx-001";
    const date = new Date().toISOString().split('T')[0]; // Today

    console.log("--- Starting Credit/Debit Logic Verification ---");

    // 1. Setup: Ensure Daily Limit exists and has 0 spend
    console.log("1. Setting Daily Limit to 1000...");
    await setDailyLimit(date, 1000, companyId);

    // Reset current spend to 0 for clean test
    await prisma.dailyLimit.updateMany({
        where: { companyId, date: new Date(date) },
        data: { currentSpend: 0 }
    });

    // 2. Test DEBIT (Expense) - Should Increase Spend
    console.log("\n2. Testing DEBIT Transaction (Amount: 100)...");
    const debitDoc: any = {
        metadata: { type: "INVOICE", isManual: true },
        extracted_data: {
            date: date,
            total_amount: 100,
            currency: "LKR",
            payee_name: "Test Vendor Debit",
            amount_in_words: "One Hundred"
        },
        intelligence: {
            confidence_scores: {},
            amount_validation_passed: true,
            is_new_vendor: false
        }
    };

    const debitResult = await saveScannedDocument(debitDoc, companyId, undefined, 'DEBIT');
    if (!debitResult.success) throw new Error(`Debit failed: ${debitResult.error}`);
    console.log("   Debit Saved. ID:", debitResult.id);

    // Check Governance - Spend should be 100
    let gov = await getGovernanceCalendar(date.slice(0, 7), companyId);
    let dayStat = gov.days.find((d: any) => d.date === date);

    // FIX: Handle potential undefined using optional chaining and nullish coalescing
    console.log(`   Governance Check (Expect 100): ${dayStat?.currentSpending ?? 'N/A'}`);

    if (!dayStat || dayStat.currentSpending !== 100) {
        console.error("❌ DEBIT Logic Failed: Spend mismatch or record not found");
    } else {
        console.log("✅ DEBIT Logic Passed");
    }


    // 3. Test CREDIT (Refund) - Should Decrease Spend
    console.log("\n3. Testing CREDIT Transaction (Amount: 40)...");
    const creditDoc: any = {
        metadata: { type: "INVOICE", isManual: true },
        extracted_data: {
            date: date,
            total_amount: 40,
            currency: "LKR",
            payee_name: "Test Vendor Refund",
            amount_in_words: "Forty"
        },
        intelligence: {
            confidence_scores: {},
            amount_validation_passed: true,
            is_new_vendor: false
        }
    };

    const creditResult = await saveScannedDocument(creditDoc, companyId, undefined, 'CREDIT');
    if (!creditResult.success) throw new Error(`Credit failed: ${creditResult.error}`);
    console.log("   Credit Saved. ID:", creditResult.id);

    // Check Governance - Spend should be 100 - 40 = 60
    gov = await getGovernanceCalendar(date.slice(0, 7), companyId);
    dayStat = gov.days.find((d: any) => d.date === date);

    // FIX: Handle potential undefined for the second check
    console.log(`   Governance Check (Expect 60): ${dayStat?.currentSpending ?? 'N/A'}`);

    if (!dayStat || dayStat.currentSpending !== 60) {
        console.error("❌ CREDIT Logic Failed: Spend mismatch or record not found");
    } else {
        console.log("✅ CREDIT Logic Passed");
    }


    // 4. Ledger Entry Check
    console.log("\n4. Checking Ledger Entries...");
    const entries = await prisma.journalEntry.findMany({
        where: {
            documentId: { in: [debitResult.id, creditResult.id] }
        },
        include: { ledgerLines: { include: { account: true } } }
    });

    for (const entry of entries) {
        const description = entry.description || "";
        const isCredit = description.includes("(CREDIT)") || description.includes("Credit");
        console.log(`   Entry: ${description}`);
        entry.ledgerLines.forEach(line => {
            console.log(`      - ${line.account.name} (${line.account.type}): Dr ${line.debit}, Cr ${line.credit}`);
        });
    }

    console.log("\n--- Verification Complete ---");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());