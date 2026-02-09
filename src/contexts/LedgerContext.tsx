"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { LedgerEntry } from "@/types/ledger";
import { useToast } from "@/hooks/use-toast";

interface LedgerContextType {
    transactions: LedgerEntry[];
    newTransactionCount: number;
    notifications: string[]; // Added notifications array
    addTransaction: (transaction: LedgerEntry) => void;
    setTransactions: (transactions: LedgerEntry[]) => void;
    voidTransaction: (id: string) => void; // Added voidTransaction
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

    const addTransaction = (transaction: LedgerEntry) => {
        setTransactionsState((prev) => [transaction, ...prev]);
        setNewTransactionCount((prev) => prev + 1);
        const message = `New transaction: ${transaction.description} (${transaction.debit ? 'Debit' : 'Credit'} ${transaction.debit || transaction.credit})`;
        setNotifications(prev => [message, ...prev]);
        toast({
            title: "New Transaction",
            description: "A new transaction happened.",
        });
    };

    const voidTransaction = (id: string) => {
        setTransactionsState((prev) => {
            const originalEntry = prev.find(t => t.id === id);
            if (!originalEntry) return prev;
            if (originalEntry.isReversed || originalEntry.reversalOfId) return prev;

            const reversalEntry: LedgerEntry = {
                ...originalEntry,
                id: `rev-${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                description: `Reversal of: ${originalEntry.description}`,
                debit: originalEntry.credit, // Swap
                credit: originalEntry.debit, // Swap
                reversalOfId: originalEntry.id,
                isReversed: false,
                source: "USER_INPUT" // Reversals are usually manual or system generated actions
            };

            // Update original entry to set isReversed = true
            const updatedTransactions = prev.map(t =>
                t.id === id ? { ...t, isReversed: true } : t
            );

            return [reversalEntry, ...updatedTransactions];
        });

        setNewTransactionCount((prev) => prev + 1);
        setNotifications(prev => [`Transaction voided: ${id}`, ...prev]);

        toast({
            title: "Transaction Voided",
            description: "Reversal entry created successfully.",
        });
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
                voidTransaction,
                clearNotifications,
                totals,
            }}
        >
            {children}
        </LedgerContext.Provider>
    );
};
