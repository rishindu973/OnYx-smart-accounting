
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

    // 1. Check Existing Vendor Mappings
    const existingMapping = await db.vendorMapping.findUnique({
        where: {
            companyId_vendorName: {
                companyId,
                vendorName,
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

    // 1.5. Check Historical Data
    try {
        // Fetch recent documents with this payee name
        const historicalDocs = await db.extractedInformation.findMany({
            where: {
                extractedData: {
                    path: ['payee_name'],
                    equals: vendorName
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
