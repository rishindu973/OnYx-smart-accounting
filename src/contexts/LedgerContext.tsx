"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { LedgerEntry } from "@/types/ledger";
import { useToast } from "@/hooks/use-toast";

interface LedgerContextType {
    transactions: LedgerEntry[];
    newTransactionCount: number;
    notifications: string[]; // Added notifications array
    addTransaction: (transaction: LedgerEntry) => Promise<void>;
    setTransactions: (transactions: LedgerEntry[]) => void;
    recordNewTransaction: (description: string, amount: number, isDebit: boolean, id?: string) => void;
    voidTransaction: (id: string) => Promise<void>; // Added voidTransaction
    clearNotifications: () => void;
    totals: {
        debit: number;
        credit: number;
        balance: number;
    };
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

export const useLedger = () => {
    const context = useContext(LedgerContext);
    if (!context) {
        throw new Error("useLedger must be used within a LedgerProvider");
    }
    return context;
};

export const LedgerProvider = ({ children }: { children: ReactNode }) => {
    const [transactions, setTransactionsState] = useState<LedgerEntry[]>([]);
    const [newTransactionCount, setNewTransactionCount] = useState(0);
    const { toast } = useToast();

    const [notifications, setNotifications] = useState<string[]>([]);

    const setTransactions = (initialTransactions: LedgerEntry[]) => {
        setTransactionsState(initialTransactions);
    };

    const recordNewTransaction = (description: string, amount: number, isDebit: boolean, id?: string) => {
        setNewTransactionCount((prev) => prev + 1);
        const newEntry = {
        id: id || Math.random().toString(),
        description,
        debit: isDebit ? amount : 0,
        credit: isDebit ? 0 : amount,
        date: new Date().toISOString(),
        status: "PROCESSED",
    };
    setTransactionsState((prev) => [newEntry as any, ...prev]);
        const message = `New transaction: ${description} (${isDebit ? 'Debit' : 'Credit'} ${amount})`;
        setNotifications(prev => [message, ...prev]);
        toast({
            title: "New Transaction",
            description: "Transaction saved successfully.",
        });
    };

    const addTransaction = async (transaction: LedgerEntry) => {
        // Optimistic update
        setTransactionsState((prev) => [transaction, ...prev]);
        try {
            const { createTransaction } = await import("@/lib/actions/ledger");
            const result = await createTransaction(transaction);

            if (result && result.success) {
                recordNewTransaction(transaction.description, transaction.debit || transaction.credit || 0, !!transaction.debit);
            } else {
                throw new Error(result?.error || "Unknown error");
            }
        } catch (error) {
            console.error("Failed to save transaction", error);
            // Rollback or notify error
            toast({
                title: "Error",
                description: "Failed to save transaction to database.",
                variant: "destructive"
            });
        }
    };

    const voidTransaction = async (id: string) => {
        // Optimistic update logic
        // We find the transaction to be reversed
        const originalEntry = transactions.find(t => t.id === id);
        if (!originalEntry) return;

        try {
            const { voidTransaction: voidTx } = await import("@/lib/actions/ledger");
            const result = await voidTx(id);

            if (result && result.success) {
                setNewTransactionCount((prev) => prev + 1);
                setNotifications(prev => [`Transaction voided: ${id}`, ...prev]);

                toast({
                    title: "Transaction Voided",
                    description: "Reversal entry created successfully.",
                });
            } else {
                throw new Error(result?.error || "Unknown error");
            }

        } catch (error) {
            console.error("Failed to void transaction", error);
            toast({
                title: "Error",
                description: "Failed to void transaction.",
                variant: "destructive"
            });
        }
    };

    const clearNotifications = () => {
        setNewTransactionCount(0);
        // We can optionally clear the messages array too, or keep them. 
        // User said "I need to see the message", implying history. 
        // Let's keep the history but reset the "new" count.
    };

    const totals = transactions.reduce(
        (acc, curr) => {
            // Logic update: Reversal entries should naturally offset the original if we sum everything.
            // Original: Debit 100. Balance -100.
            // Reversal: Credit 100. Balance -100 + 100 = 0.
            // So simple summing works perfectly for "Voiding" if we add the reversal entry.
            // However, we should NOT sum the original entry IF we are just "updating" it? 
            // BUT, accounting standards say "don't delete". So both exist. 
            // The original Debit exists. The Reversal Credit exists. They net to 0. 
            // So we sum ALL transactions.

            const debit = curr.debit || 0;
            const credit = curr.credit || 0;

            return {
                debit: acc.debit + debit,
                credit: acc.credit + credit,
                balance: acc.balance + (credit - debit)
            };
        },
        { debit: 0, credit: 0, balance: 0 }
    );

    return (
        <LedgerContext.Provider
            value={{
                transactions,
                newTransactionCount,
                notifications,
                addTransaction,
                setTransactions,
                recordNewTransaction,
                voidTransaction,
                clearNotifications,
                totals,
            }}
        >
            {children}
        </LedgerContext.Provider>
    );
};
