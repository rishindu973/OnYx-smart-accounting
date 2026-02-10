
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../db";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

interface VendorMatchResult {
    suggestion_account_id: string | null;
    is_new_vendor: boolean;
    suggested_account_name?: string;
    confidence?: number;
    potential_match?: string;
}

export async function matchVendor(
    vendorName: string,
    companyId: string
): Promise<VendorMatchResult> {

    if (!vendorName || vendorName === "Review Required") {
        return {
            suggestion_account_id: null,
            is_new_vendor: true,
        };
    }

    const trimmedVendorName = vendorName.trim();

    // 1. Check Existing Vendor Mappings
    const existingMapping = await db.vendorMapping.findUnique({
        where: {
            companyId_vendorName: {
                companyId,
                vendorName: trimmedVendorName,
            },
        },
    });

    if (existingMapping) {
        return {
            suggestion_account_id: existingMapping.defaultDebitAccountId,
            is_new_vendor: false,
        };
    }

    let knownVendor = false;
    let historicalAccount = null;

    // 1.5. Check Historical Data (Strict Match)
    try {
        // Fetch recent documents with this payee name
        const historicalDocs = await db.extractedInformation.findMany({
            where: {
                extractedData: {
                    path: ['payee_name'],
                    equals: trimmedVendorName
                },
                document: {
                    companyId: companyId
                }
            },
            include: {
                document: {
                    include: {
                        journalEntry: {
                            include: {
                                ledgerLines: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                id: 'desc'
            },
            take: 5
        });

        if (historicalDocs.length > 0) {
            knownVendor = true; // Vendor exists in DB

            // Analyze accounts...
            const accountCounts: Record<string, number> = {};
            for (const info of historicalDocs) {
                const journalEntry = info.document.journalEntry[0];
                if (journalEntry && journalEntry.ledgerLines) {
                    for (const line of journalEntry.ledgerLines) {
                        if (Number(line.debit) > 0) {
                            accountCounts[line.accountId] = (accountCounts[line.accountId] || 0) + 1;
                        }
                    }
                }
            }

            let maxCount = 0;
            for (const [accId, count] of Object.entries(accountCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    historicalAccount = accId;
                }
            }
        }
    } catch (e) {
        console.error("Historical lookup failed:", e);
    }

    if (historicalAccount) {
        return {
            suggestion_account_id: historicalAccount,
            is_new_vendor: false,
            confidence: 0.9
        };
    }

    // 1.6. Fuzzy Match (If no exact match found)
    // Fetch a batch of recent unique vendor names is ideal, but for now fetch recent docs
    let potentialMatchName: string | undefined;

    try {
        const recentDocs = await db.extractedInformation.findMany({
            where: {
                document: { companyId: companyId }
            },
            select: {
                extractedData: true
            },
            orderBy: { id: 'desc' },
            take: 100 // Check last 100 documents
        });

        const candidates = new Set<string>();
        for (const doc of recentDocs) {
            const name = (doc.extractedData as any)?.payee_name;
            if (name && typeof name === 'string' && name.length > 2) {
                candidates.add(name);
            }
        }

        for (const candidate of candidates) {
            // Simple Distance Check
            const dist = levenshteinDistance(trimmedVendorName.toLowerCase(), candidate.toLowerCase());

            const lowerVendor = trimmedVendorName.toLowerCase();
            const lowerCandidate = candidate.toLowerCase();

            // 1. Levenshtein Distance Check (for typos)
            // Allow distance of 1 or 2 for typos, but length must be reasonably long
            if (dist <= 2 && trimmedVendorName.length > 3) {
                potentialMatchName = candidate;
                break;
            }

            // 2. Containment Check (for "Apple Ta" vs "Apple")
            // If one starts with the other, and length difference is small enough (e.g. OCR noise)
            if ((lowerVendor.startsWith(lowerCandidate) || lowerCandidate.startsWith(lowerVendor)) &&
                Math.abs(lowerVendor.length - lowerCandidate.length) <= 4 &&
                Math.min(lowerVendor.length, lowerCandidate.length) > 3) {

                potentialMatchName = candidate;
                break;
            }
        }

    } catch (e) {
        console.error("Fuzzy match failed:", e);
    }

    if (potentialMatchName) {
        return {
            suggestion_account_id: null,
            is_new_vendor: true, // Still new until confirmed
            potential_match: potentialMatchName,
            confidence: 0.7
        };
    }

    // 2. If no mapping/history account, use Gemini to suggest a category/account
    try {
        const companyAccounts = await db.chartOfAccounts.findMany({
            where: { companyId },
            select: { id: true, name: true, type: true, code: true },
        });

        const prompt = `
      You are an expert accountant. Code the following transaction.
      
      Vendor: "${vendorName}"
      
      Available Accounts:
      ${JSON.stringify(companyAccounts.map(a => ({ id: a.id, name: a.name, type: a.type })))}
      
      Task:
      1. Identify the most likely expense/asset account for this vendor.
      2. If no exact match exists in the available accounts, suggest a standard accounting category name (e.g., "Software Subscription", "Office Supplies").
      3. Return ONLY valid JSON:
      {
        "matched_account_id": "string OR null",
        "suggested_account_name": "string",
        "confidence": number (0-1)
      }
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up JSON block if present
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const aiData = JSON.parse(cleanText);

        return {
            suggestion_account_id: aiData.matched_account_id || null,
            is_new_vendor: !knownVendor, // If knownVendor is true, set is_new_vendor to false
            suggested_account_name: aiData.suggested_account_name,
            confidence: aiData.confidence,
        };

    } catch (error) {
        console.error("Gemini AI Vendor Match Error:", error);
        return {
            suggestion_account_id: null,
            is_new_vendor: !knownVendor // Fallback: if known, not new
        };
    }
}

// Helper: Levenshtein Distance
function levenshteinDistance(a: string, b: string): number {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}
