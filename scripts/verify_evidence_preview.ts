
import { getLedgerLines } from "../src/lib/actions/ledger";

async function verifyEvidence() {
    console.log("Verifying Evidence Preview Backend Logic...");

    try {
        const entries = await getLedgerLines();
        console.log(`Fetched ${entries.length} ledger entries.`);

        // Find an entry that SHOULD have a document (AI Scan)
        const aiEntries = entries.filter(e => e.source === 'AI_SCAN');
        console.log(`Found ${aiEntries.length} AI Scan entries.`);

        if (aiEntries.length > 0) {
            const sample = aiEntries[0];
            console.log("Sample Entry:", {
                id: sample.id,
                description: sample.description,
                documentUrl: sample.documentUrl,
                hasDocument: !!sample.documentUrl
            });

            if (sample.documentUrl) {
                console.log("✅ Success: AI Scan entry has documentUrl.");
            } else {
                console.log("⚠️ Warning: AI Scan entry missing documentUrl. (Maybe purely manual entry marked as AI, or missing fileUrl in DB?)");
            }
        } else {
            console.log("ℹ️ No AI Scan entries found to verify.");
        }

        // Find a manual entry
        const manualEntries = entries.filter(e => e.source === 'USER_INPUT');
        if (manualEntries.length > 0) {
            const sample = manualEntries[0];
            console.log("Sample Manual Entry:", {
                id: sample.id,
                description: sample.description,
                documentUrl: sample.documentUrl,
                hasDocument: !!sample.documentUrl
            });
            if (!sample.documentUrl) {
                console.log("✅ Success: Manual entry correctly has no documentUrl (or empty string).");
            }
        }

    } catch (error) {
        console.error("Verification Failed:", error);
        process.exit(1);
    }
}

verifyEvidence();
