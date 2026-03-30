export interface UniversalDocument {
    metadata: {
        type: "CHEQUE" | "INVOICE" | "BILL"
        source: "AI_SCAN" | "USER_INPUT"
        isManual: boolean
        is_date_fallback?: boolean
    };
    extracted_data: {
        date: string;
        payee_name: string;
        total_amount: number;
        amount_in_words: string;
        currency: string;
    };
    intelligence: {
        confidence_scores: {
            date: number;
            payee_name: number;
            amount_numeric: number;
            amount_in_words: number;
            bank_name: number;
            currency: number;
            endorsement: number;
        };
        amount_validation_passed: boolean;
        suggestion_account_id: string | null;
        is_new_vendor: boolean;
        potential_match?: string;
        validation_message?: string; // for python validation feedback
    };
}

