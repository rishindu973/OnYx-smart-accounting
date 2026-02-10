// import Fuse from "fuse.js";
// import { prisma } from "@/lib/prisma"; // Singleton instance
// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { db } from "../db"; // Used for specific historical queries

// // Initialize Gemini [cite: 175]
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
// // Use flash model for speed during the hackathon demo
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// interface VendorMatchResult {
//     suggestion_account_id: string | null;
//     is_new_vendor: boolean;
//     suggested_account_name?: string;
//     confidence?: number;
//     potential_match?: string;
// }

// /**
//  * Enhanced Vendor Matcher for OnYx
//  * Combines Database Mappings, Historical Patterns, Fuzzy Logic, and Gemini AI.
//  */
// export async function matchVendor(
//     vendorName: string,
//     companyId: string = "clx-onyx-001"
// ): Promise<VendorMatchResult> {

//     if (!vendorName || vendorName === "Review Required") {
//         return { suggestion_account_id: null, is_new_vendor: true };
//     }

//     const trimmedVendorName = vendorName.trim();

//     try {
//        // TIER 1: Exact Match in Vendor Mappings Table [cite: 178, 179]
//         const existingMapping = await prisma.vendorMapping.findFirst({
//             where: { 
//                 companyId, 
//                 vendorName: { equals: trimmedVendorName, mode: 'insensitive' } 
//             },
//         });

//         if (existingMapping) {
//             return {
//                 suggestion_account_id: existingMapping.defaultDebitAccountId,
//                 is_new_vendor: false,
//                 confidence: 1.0
//             };
//         }

//         // TIER 2: Historical Transaction Lookup
//         // Check how this specific payee name was handled in the last 5 transactions
//         const historicalDocs = await db.extractedInformation.findMany({
//             where: {
//                 extractedData: { path: ['payee_name'], equals: trimmedVendorName },
//                 document: { companyId }
//             },
//             include: {
//                 document: { include: { journalEntry: { include: { ledgerLines: true } } } }
//             },
//             orderBy: { id: 'desc' },
//             take: 5
//         });

//         if (historicalDocs.length > 0) {
//             const accountCounts: Record<string, number> = {};
//             historicalDocs.forEach(info => {
//                 const journalEntry = info.document.journalEntry[0];
//                 journalEntry?.ledgerLines.forEach(line => {
//                     if (Number(line.debit) > 0) {
//                         accountCounts[line.accountId] = (accountCounts[line.accountId] || 0) + 1;
//                     }
//                 });
//             });

//             let bestHistoricalAccount = null;
//             let maxCount = 0;
//             for (const [accId, count] of Object.entries(accountCounts)) {
//                 if (count > maxCount) {
//                     maxCount = count;
//                     bestHistoricalAccount = accId;
//                 }
//             }

//             if (bestHistoricalAccount) {
//                 return {
//                     suggestion_account_id: bestHistoricalAccount,
//                     is_new_vendor: false,
//                     confidence: 0.9
//                 };
//             }
//         }

//         // TIER 3: Fuzzy Matching (Levenshtein & Fuse.js)
//         const knownVendors = await prisma.vendorMapping.findMany({ where: { companyId } });
//         const fuse = new Fuse(knownVendors, { keys: ['vendorName'], threshold: 0.3 });
//         const fuzzyResult = fuse.search(trimmedVendorName);

//         if (fuzzyResult.length > 0) {
//             return {
//                 suggestion_account_id: fuzzyResult[0].item.defaultDebitAccountId,
//                 is_new_vendor: false,
//                 potential_match: fuzzyResult[0].item.vendorName,
//                 confidence: 0.85
//             };
//         }

//         // Tier 3.5: Typo detection via Levenshtein fallback
//         // Useful for when the database name and OCR name have 1-2 char differences
//         const recentDocs = await db.extractedInformation.findMany({
//             where: { document: { companyId } },
//             select: { extractedData: true },
//             take: 50
//         });

//         for (const doc of recentDocs) {
//             const name = (doc.extractedData as any)?.payee_name;
//             if (name && levenshteinDistance(trimmedVendorName.toLowerCase(), name.toLowerCase()) <= 2) {
//                 return {
//                     suggestion_account_id: null,
//                     is_new_vendor: true, // Still marked as new to trigger the "Did you mean" UI
//                     potential_match: name,
//                     confidence: 0.7
//                 };
//             }
//         }

//         // TIER 4: AI Logic (Zero-Click Provisioning) [cite: 183-188]
//         const companyAccounts = await prisma.chartOfAccounts.findMany({
//             where: { companyId },
//             select: { id: true, name: true, type: true },
//         });

//         const aiPrompt = `
//             You are an expert accountant for OnYx.
//             Vendor from OCR: "${trimmedVendorName}"
//             Available Chart of Accounts: ${JSON.stringify(companyAccounts)}
            
//             Task:
//             1. Map this vendor to the most likely account ID.
//             2. If no match exists, suggest a standard accounting category (e.g., "Utilities").
//             3. Return ONLY valid JSON:
//             {
//                 "matched_account_id": "string | null",
//                 "suggested_account_name": "string",
//                 "confidence": number (0-1)
//             }
//         `;

//         const result = await model.generateContent(aiPrompt);
//         const aiData = JSON.parse(result.response.text().replace(/```json/g, "").replace(/```/g, "").trim());

//         return {
//             suggestion_account_id: aiData.matched_account_id || null,
//             is_new_vendor: true, // Reaching this stage means it's a new vendor for our ledger
//             suggested_account_name: aiData.suggested_account_name,
//             confidence: aiData.confidence,
//         };

//     } catch (error) {
//         console.error("Critical Vendor Match Failure:", error);
//         return { suggestion_account_id: null, is_new_vendor: true };
//     }
// }

// // ✅ HELPER: Levenshtein Distance for Typo Detection
// function levenshteinDistance(a: string, b: string): number {
//     const matrix = [];
//     for (let i = 0; i <= b.length; i++) matrix[i] = [i];
//     for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

//     for (let i = 1; i <= b.length; i++) {
//         for (let j = 1; j <= a.length; j++) {
//             if (b.charAt(i - 1) === a.charAt(j - 1)) {
//                 matrix[i][j] = matrix[i - 1][j - 1];
//             } else {
//                 matrix[i][j] = Math.min(
//                     matrix[i - 1][j - 1] + 1,
//                     Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
//                 );
//             }
//         }
//     }
//     return matrix[b.length][a.length];
// }
import Fuse from "fuse.js";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../db";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
        return { suggestion_account_id: null, is_new_vendor: true };
    }

    const trimmedVendorName = vendorName.trim();

    try {
       
        const existingMapping = await db.vendorMapping.findUnique({
            where: { companyId_vendorName: { companyId, vendorName: trimmedVendorName } },
        });
        if (existingMapping) return { suggestion_account_id: existingMapping.defaultDebitAccountId, is_new_vendor: false };

        const historicalDocs = await db.extractedInformation.findMany({
            where: {
                extractedData: { path: ['payee_name'], equals: trimmedVendorName },
                document: { companyId }
            },
            include: { document: { include: { journalEntry: { include: { ledgerLines: true } } } } },
            orderBy: { id: 'desc' },
            take: 5
        });

        if (historicalDocs.length > 0) {
            const accountCounts: Record<string, number> = {};
            historicalDocs.forEach(info => {
                info.document.journalEntry[0]?.ledgerLines.forEach(line => {
                    if (Number(line.debit) > 0) accountCounts[line.accountId] = (accountCounts[line.accountId] || 0) + 1;
                });
            });
            let bestAccount = Object.entries(accountCounts).sort(([,a],[,b]) => b - a)[0]?.[0];
            if (bestAccount) return { suggestion_account_id: bestAccount, is_new_vendor: false, confidence: 0.9 };
        }

        
        const knownVendors = await prisma.vendorMapping.findMany({ where: { companyId } });
        const fuse = new Fuse(knownVendors, { keys: ['vendorName'], threshold: 0.3 });
        const fuzzyResult = fuse.search(trimmedVendorName);
        if (fuzzyResult.length > 0) {
            return {
                suggestion_account_id: fuzzyResult[0].item.defaultDebitAccountId,
                is_new_vendor: false,
                potential_match: fuzzyResult[0].item.vendorName,
                confidence: 0.85
            };
        }

        
        const accounts = await prisma.chartOfAccounts.findMany({ where: { companyId }, select: { id: true, name: true, type: true } });
        const prompt = `expert accountant. Map "${vendorName}" to ID in: ${JSON.stringify(accounts)}. Return JSON { "matched_account_id": "string | null", "suggested_account_name": "string", "confidence": number }`;
        const result = await model.generateContent(prompt);
        const aiData = JSON.parse(result.response.text().replace(/```json/g, "").replace(/```/g, "").trim());

        return {
            suggestion_account_id: aiData.matched_account_id,
            is_new_vendor: true,
            suggested_account_name: aiData.suggested_account_name,
            confidence: aiData.confidence
        };
    } catch (e) {
        console.error("Critical Match Error:", e);
        return { suggestion_account_id: null, is_new_vendor: true };
    }
}