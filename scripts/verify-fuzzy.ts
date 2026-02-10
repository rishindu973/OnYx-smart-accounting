import { matchVendor } from "../src/lib/ai/vendor-matcher";
import { db } from "../src/lib/db";

async function verifyFuzzy() {
    console.log("--- Verifying Fuzzy Match Logic ---");

    const company = await db.company.findFirst();
    if (!company) {
        console.error("No company found.");
        return;
    }

    // Ensure 'Apple' exists as a known vendor (via ExtractedInformation)
    const existingApple = await db.extractedInformation.findFirst({
        where: {
            extractedData: { path: ['payee_name'], equals: "Apple" },
            document: { companyId: company.id }
        }
    });

    if (!existingApple) {
        console.log("Creating 'Apple' history...");
        const doc = await db.document.create({
            data: { companyId: company.id, type: "Invoice", status: "PROCESSED", fileUrl: "test-apple" }
        });
        await db.extractedInformation.create({
            data: {
                documentId: doc.id,
                extractedData: { payee_name: "Apple" },
                totalAmount: 10,
                confidenceScores: {}
            }
        });
    }

    // Test "Apple Ta" -> Should suggest "Apple"
    console.log("Testing 'Apple Ta'...");
    try {
        const result = await matchVendor("Apple Ta", company.id);
        if (result.potential_match === "Apple") {
            console.log("SUCCESS: 'Apple Ta' -> Potential Match: 'Apple'");
        } else {
            console.error("FAILURE: 'Apple Ta' -> Got:", JSON.stringify(result, null, 2));
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

verifyFuzzy()
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1); });