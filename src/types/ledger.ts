export interface LedgerEntry {
    id: string;
    date: string;
    description: string;
    account: string;
    accountCode: string;
    debit: number | null;
    credit: number | null;
    source: "AI_SCAN" | "USER_INPUT";
    documentUrl: string;
    reversalOfId?: string;
    isReversed?: boolean;
}
