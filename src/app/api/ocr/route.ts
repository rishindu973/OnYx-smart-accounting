// import { NextResponse } from "next/server";
// import { headers } from "next/headers";
// import { UniversalDocument } from "@/types/accounting";
// import { prisma } from "@/lib/prisma"; 
// import { db } from "@/lib/db"; // ✅ Added for company fallback
// import { matchVendor } from "@/lib/ai/vendor-matcher"; 
// import Fuse from "fuse.js";

// export async function POST(request: Request) {
//     try {
//         const formData = await request.formData();
//         const file = formData.get("file") as File;

//         if (!file) {
//             return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
//         }

//         const nanoForm = new FormData();
//         nanoForm.append("file", file);

//         const response = await fetch(
//             `https://app.nanonets.com/api/v2/OCR/Model/${process.env.NANONETS_MODEL_ID}/LabelFile/`,
//             {
//                 method: "POST",
//                 headers: {
//                     Authorization: "Basic " + Buffer.from(process.env.NANONETS_API_KEY + ":").toString("base64"),
//                 },
//                 body: nanoForm,
//             }
//         );

//         const data = await response.json();
//         if (!data.result || data.result.length === 0) {
//             return NextResponse.json({ error: "OCR failed to return a result" }, { status: 502 });
//         }

//         const predictions = data.result[0].prediction;
//         const extracted: Record<string, any> = {};

//         predictions.forEach((p: any) => {
//             const label = p.label.toLowerCase();
//             if (label === 'payee_name' || label === 'payto_name' || label === 'buyer_name') {
//                 extracted['payee_name'] = { value: p.ocr_text, confidence: p.score };
//             } else if (label === 'amount_numeric' || label === 'invoice_amount') {
//                 extracted['amount_numeric'] = { value: p.ocr_text, confidence: p.score };
//             } else {
//                 extracted[label] = { value: p.ocr_text, confidence: p.score };
//             }
//         });

//         const numAmt = parseFloat(extracted.amount_numeric?.value?.replace(/[^0-9.]/g, '') || "0");
//         const wordAmt = extracted.amount_in_words?.value || "";
//         const rawPayee = extracted.payee_name?.value || "";
//         const payeeScore = extracted.payee_name?.confidence || 0;

//         // ✅ UPDATED: Stricter Reliability check (0.95 per your snippet)
//         const isReliable = payeeScore > 0.95 || (payeeScore === 0 && rawPayee !== "NOT_FOUND" && rawPayee !== "");
//         const payeeName = isReliable ? rawPayee : "Review Required";

//         /** * ✅ FEATURE: DYNAMIC COMPANY CONTEXT
//          * Checks header first, then database, then demo fallback.
//          */
//         const headersList = await headers();
//         let companyId = headersList.get("x-company-id");

//         if (!companyId) {
//             const firstCompany = await db.company.findFirst();
//             if (firstCompany) {
//                 companyId = firstCompany.id;
//             }
//         }
//         const activeCompanyId = companyId || "clx-onyx-001";

//         /** * VENDOR DETECTION TIER 1: Fuzzy Matching (Normalization) [cite: 146, 166]
//          */
//         const normalizationMatch = await findNormalizationVendorMatch(rawPayee);
        
//         let suggestionResult = {
//             suggestion_account_id: normalizationMatch.accountId,
//             is_new_vendor: normalizationMatch.isNew,
//             potential_match: normalizationMatch.matchedName
//         };

//         /** * VENDOR DETECTION TIER 2: AI Matching (Smart Suggestions) [cite: 148, 150]
//          * Only triggers if fuzzy match didn't find a confident link.
//          */
//         if (normalizationMatch.isNew && payeeName !== "Review Required" && payeeName) {
//             try {
//                 const aiMatch = await matchVendor(payeeName, activeCompanyId);
//                 suggestionResult = {
//                     suggestion_account_id: aiMatch.suggestion_account_id,
//                     is_new_vendor: aiMatch.is_new_vendor,
//                     potential_match: aiMatch.potential_match
//                 };
//             } catch (error) {
//                 console.error("AI Vendor Match Error:", error);
//             }
//         }

//         const isCheque = extracted.amount_in_words !== undefined || extracted.endorsement !== undefined;

//         const doc: UniversalDocument = {
//             metadata: {
//                 type: isCheque ? "CHEQUE" : "INVOICE",
//                 source: "AI_SCAN",
//                 isManual: false,
//             },
//             extracted_data: {
//                 date: extracted.date?.value || "",
//                 payee_name: suggestionResult.is_new_vendor ? rawPayee : (suggestionResult.potential_match || rawPayee),
//                 total_amount: numAmt,
//                 amount_in_words: wordAmt,
//                 currency: extracted.currency?.value || "LKR",
//             },
//             intelligence: {
//                 confidence_score: {
//                     date: extracted.date?.confidence || 0,
//                     payee_name: payeeScore,
//                     amount_numeric: extracted.amount_numeric?.confidence || 0,
//                     amount_in_words: extracted.amount_in_words?.confidence || 0,
//                     bank_name: extracted.bank_name?.confidence || 0,
//                     currency: extracted.currency?.confidence || 0,
//                     endorsement: extracted.endorsement?.confidence || 0,
//                 },
//                 amount_validation_passed: isAmountValid(numAmt, wordAmt),
//                 suggestion_account_id: suggestionResult.suggestion_account_id,
//                 is_new_vendor: suggestionResult.is_new_vendor,
//                 potential_match: suggestionResult.potential_match
//             },
//         };

//         return NextResponse.json(doc);
//     } catch (err: any) {
//         return NextResponse.json({ error: err.message }, { status: 500 });
//     }
// }

// // ✅ HELPER: Database Fuzzy Match (Normalization Logic) [cite: 166-171]
// async function findNormalizationVendorMatch(ocrName: string) {
//     if (!ocrName || ocrName === "Review Required") return { isNew: true, accountId: null };
//     try {
//         const knownVendors = await prisma.vendorMapping.findMany();
//         const fuse = new Fuse(knownVendors, { keys: ['vendorName'], threshold: 0.4 });
//         const result = fuse.search(ocrName);

//         if (result.length > 0) {
//             return {
//                 isNew: false,
//                 accountId: result[0].item.defaultDebitAccountId,
//                 matchedName: result[0].item.vendorName
//             };
//         }
//     } catch (error) {
//         console.error("Normalization Error:", error);
//     }
//     return { isNew: true, accountId: null };
// }

// // ✅ HELPER: Agentic Cross-Validation (Numeric vs Words) [cite: 172-173]
// function isAmountValid(num: number, words: string): boolean {
//     if (!words || num === 0) return true;
//     const lowerWords = words.toLowerCase();
//     const numStr = Math.floor(num).toString();
//     const digitsInText = words.replace(/[^0-9]/g, '');
    
//     if (digitsInText.includes(numStr)) return true;

//     const bigWords = ["million", "thousand", "hundred", "twelve"]; //
//     return bigWords.some(word => lowerWords.includes(word));
// }
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { UniversalDocument } from "@/types/accounting";
import { prisma } from "@/lib/prisma"; 
import { db } from "@/lib/db";
import { matchVendor } from "@/lib/ai/vendor-matcher"; 
import Fuse from "fuse.js";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

        const nanoForm = new FormData();
        nanoForm.append("file", file);

        const response = await fetch(`https://app.nanonets.com/api/v2/OCR/Model/${process.env.NANONETS_MODEL_ID}/LabelFile/`, {
            method: "POST",
            headers: { Authorization: "Basic " + Buffer.from(process.env.NANONETS_API_KEY + ":").toString("base64") },
            body: nanoForm,
        });

        const data = await response.json();
        const predictions = data.result[0].prediction;
        const extracted: Record<string, any> = {};

        
        predictions.forEach((p: any) => {
            const label = p.label.toLowerCase();
            const key = (label === 'payto_name' || label === 'buyer_name') ? 'payee_name' : label;
            extracted[key] = { value: p.ocr_text, confidence: p.score };
        });

        const numAmt = parseFloat(extracted.amount_numeric?.value?.replace(/[^0-9.]/g, '') || "0");
        const rawPayee = extracted.payee_name?.value || "";
        const payeeScore = extracted.payee_name?.confidence || 0;

        
        const isReliable = payeeScore > 0.95 || (payeeScore === 0 && rawPayee !== "NOT_FOUND" && rawPayee !== "");
        const payeeName = isReliable ? rawPayee : "Review Required";

        
        const headersList = await headers();
        let companyId = headersList.get("x-company-id");
        if (!companyId) {
            const first = await db.company.findFirst();
            companyId = first?.id || "clx-onyx-001";
        }

        const match = await matchVendor(payeeName, companyId);
        const isCheque = extracted.amount_in_words !== undefined || extracted.endorsement !== undefined;

        const doc: UniversalDocument = {
            metadata: { type: isCheque ? "CHEQUE" : "INVOICE", source: "AI_SCAN", isManual: false },
            extracted_data: {
                date: extracted.date?.value || "",
                payee_name: match.is_new_vendor ? rawPayee : (match.potential_match || rawPayee),
                total_amount: numAmt,
                amount_in_words: extracted.amount_in_words?.value || "",
                currency: extracted.currency?.value || "LKR",
            },
            intelligence: {
                confidence_score: {
                    date: extracted.date?.confidence || 0,
                    payee_name: payeeScore,
                    amount_numeric: extracted.amount_numeric?.confidence || 0,
                    amount_in_words: extracted.amount_in_words?.confidence || 0,
                    bank_name: extracted.bank_name?.confidence || 0,
                    currency: extracted.currency?.confidence || 0,
                    endorsement: extracted.endorsement?.confidence || 0,
                },
                amount_validation_passed: isAmountValid(numAmt, extracted.amount_in_words?.value || ""),
                suggestion_account_id: match.suggestion_account_id,
                is_new_vendor: match.is_new_vendor,
                potential_match: match.potential_match
            },
        };
        return NextResponse.json(doc);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

function isAmountValid(num: number, words: string): boolean {
    if (!words || num === 0) return true;
    const lowerWords = words.toLowerCase();
    const numStr = Math.floor(num).toString();
    const digitsInText = words.replace(/[^0-9]/g, '');
    if (digitsInText.includes(numStr)) return true;
    return ["million", "thousand", "hundred", "twelve"].some(word => lowerWords.includes(word));
}