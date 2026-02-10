
import { matchVendor } from "../src/lib/ai/vendor-matcher";
import { db } from "../src/lib/db";

async function debugVendor() {
    const vendorName = "Muhammad Fazil";
    const company = await db.company.findFirst();
    if (!company) return;

    console.log("Running matchVendor...");
    const result = await matchVendor(vendorName, company.id);
    console.log("FINAL RESULT:", JSON.stringify(result, null, 2));
}

debugVendor()
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1); });
