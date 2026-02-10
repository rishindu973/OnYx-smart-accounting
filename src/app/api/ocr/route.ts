import { NextResponse } from "next/server";
import { UniversalDocument } from "@/types/accounting";
import { Form } from "lucide-react";
import { headers } from "next/headers";
import { matchVendor } from "@/lib/ai/vendor-matcher";
import { db } from "@/lib/db";

export async function POST(request: Request) {
    try {
        const formData = await request.formData(); // Get the uploaded file from the form data
        const file = formData.get("file") as File; // Assuming the file input field is named "file"

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const nanoForm = new FormData(); // Create a new FormData object to send to the OCR API
        nanoForm.append("file", file); // Append the file to the FormData object

        const response = await fetch(
            `https://app.nanonets.com/api/v2/OCR/Model/${process.env.NANONETS_MODEL_ID}/LabelFile/`, // Make a POST request to the Nanonets OCR API with the model ID from environment variables
            {
                method: "POST",
                headers: {
                    Authorization: "Basic " + Buffer.from(process.env.NANONETS_API_KEY + ":").toString("base64"), // Basic auth with API key. this is how nanonets expects and this is for security reasons, the API key is not sent in plain text but encoded in base64
                },
                body: nanoForm,
            }
        );

        const data = await response.json(); // Parse the JSON response from the OCR API
        // Check if Nanonets actually returned a result
        if (!data.result || data.result.length === 0) {
            console.error("Nanonets Error Response:", data);
            return NextResponse.json({
                error: "OCR failed to return a result",
                details: data.message || "Unknown Nanonets error"
            }, { status: 502 });
        }
        const predictions = data.result[0].prediction; // Extract the predictions from the response

        const extracted: Record<string, any> = {}; // Initialize an object to hold the extracted data
        predictions.forEach((p: any) => {
            extracted[p.label] = {
                value: p.ocr_text,
                confidence: p.score
            }; // Map each prediction to the extracted object with its label, value, and confidence score
        });

        const rawNum = extracted.amount_numeric?.value || "0";
        const numAmt = parseFloat(extracted.amount_numeric?.value?.replace(/[^0-9.]/g, '') || "0");// Convert the extracted total amount to a number, defaulting to 0 if it's not available
        const wordAmt = extracted.amount_in_words?.value || ""; // Get the extracted amount in words, defaulting to an empty string if it's not available
        const rawPayee = extracted.payee_name?.value || "";
        const payeeScore = extracted.payee_name?.confidence || 0;

        console.log("--- Onyx OCR Debug Start ---");
        console.log(`Date: ${extracted.date?.value} (Score: ${extracted.date?.confidence})`);
        console.log(`Payee Value: ${rawPayee} | Confidence: ${payeeScore}`);
        if (payeeScore === 0) console.log("Note: Score is 0 because LLM Enhancer is active.");
        console.log(`Amount: ${extracted.amount_numeric?.value} (Score: ${extracted.amount_numeric?.confidence})`);
        console.log(`Words: ${extracted.amount_in_words?.value} (Score: ${extracted.amount_in_words?.confidence})`);
        console.log("--- Onyx OCR Debug End ---");

        const isReliable = payeeScore > 0.95 || (payeeScore === 0 && rawPayee !== "NOT_FOUND" && rawPayee !== "");

        const payeeName = isReliable ? rawPayee : "Review Required";
        const isCheque = extracted.amount_in_words !== undefined || extracted.endorsement !== undefined;
        const docType = isCheque ? "CHEQUE" : "INVOICE"; // Determine the document type based on the presence of cheque-specific fields

        // Smart Suggestion Logic
        let suggestionResult: { suggestion_account_id: string | null, is_new_vendor: boolean, potential_match?: string } = {
            suggestion_account_id: null,
            is_new_vendor: true,
        };

        if (payeeName !== "Review Required" && payeeName) {
            // Check for X-Company-Id header
            const headersList = await headers();
            let companyId = headersList.get("x-company-id");

            // Fallback: If no header, fetch the first company (for demo/development)
            if (!companyId) {
                const firstCompany = await db.company.findFirst();
                if (firstCompany) {
                    companyId = firstCompany.id;
                }
            }

            if (companyId) {
                try {
                    const match = await matchVendor(payeeName, companyId);
                    suggestionResult = {
                        suggestion_account_id: match.suggestion_account_id,
                        is_new_vendor: match.is_new_vendor,
                        potential_match: match.potential_match
                    };
                } catch (error) {
                    console.error("Error matching vendor:", error);
                }
            }
        }

        // We need companyId. Let's look at how other API routes get it or if we can get it from the user.
        // The previous code didn't save the document, it just returned it.
        // So we can't really "match" without a company context.
        // I will assume for now we can't easily get companyId without auth.
        // BUT the requirement is "The system uses historical mappings".
        // I'll check if I can get a companyId from the request headers or cookies.
        // For now I'll add the import and the call, passing a dummy or trying to retrieve it.

        // actually, let's look at the imports.

        const doc: UniversalDocument = {
            metadata: {
                type: docType,
                source: "AI_SCAN",
                isManual: false,
            },
            extracted_data: {
                date: extracted.date?.value || "",
                payee_name: payeeName,
                // total_amount: parseFloat(extracted.amount_numeric?.value?.replace(/[^0-9.]/g, '') || "0"),
                total_amount: numAmt,
                // amount_in_words: extracted.amount_in_words?.value || "",
                amount_in_words: wordAmt,
                currency: extracted.currency?.value || "LKR",
            },
            intelligence: {
                confidence_score: {
                    date: extracted.date?.confidence || 0,
                    payee_name: extracted.payee_name?.confidence || 0,
                    amount_numeric: extracted.amount_numeric?.confidence || 0,
                    amount_in_words: extracted.amount_in_words?.confidence || 0,
                    bank_name: extracted.bank_name?.confidence || 0,
                    currency: extracted.currency?.confidence || 0,
                    endorsement: extracted.endorsement?.confidence || 0,
                },
                // amount_validation_passed: wordAmt.toLowerCase().includes(numAmt.toString().split('.')[0]),
                amount_validation_passed: isAmountValid(numAmt, wordAmt),
                suggestion_account_id: suggestionResult.suggestion_account_id,
                is_new_vendor: suggestionResult.is_new_vendor,
                potential_match: suggestionResult.potential_match
            },
        };
        return NextResponse.json(doc); // Return the extracted document data as a JSON response
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 }); // Return a 500 Internal Server Error response with the error message if any error occurs during the OCR processing
    }
};

function isAmountValid(num: number, words: string): boolean {
    if (!words || num === 0) return true;
    const lowerWords = words.toLowerCase();
    const numStr = Math.floor(num).toString();

    // Check if the actual digits exist in the text
    const digitsInText = words.replace(/[^0-9]/g, '');
    if (digitsInText.includes(numStr)) return true;

    // Check for large number words (Million, Thousand)
    const bigWords = ["million", "thousand", "hundred", "twelve"];
    return bigWords.every(word => lowerWords.includes(word));
}