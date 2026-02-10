import { matchVendor } from "@/lib/ai/vendor-matcher";
import { db } from "@/lib/db";

async function main() {
    console.log("--- Testing Vendor Matching Logic ---");

    // 1. Get a valid Company ID
    const company = await db.company.findFirst();
    if (!company) {
        console.error("❌ No company found in DB. Cannot match vendor.");
        return;
    }
    console.log(`✅ Using Company ID: ${company.id}`);

    // 2. Test Cases
    const testVendor = "Test Vendor " + Math.random().toString(36).substring(7);
    console.log(`\nTesting New Vendor: "${testVendor}"`);

    try {
        const result = await matchVendor(testVendor, company.id);
        console.log("Match Result:", JSON.stringify(result, null, 2));

        if (result.suggestion_account_id || result.suggested_account_name) {
            console.log("✅ AI Suggestion returned.");
        } else {
            console.log("⚠️ No suggestion returned. Check Gemini API Key or logic.");
        }
    } catch (error) {
        console.error("❌ Error in matchVendor:", error);
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await db.$disconnect();
    });
