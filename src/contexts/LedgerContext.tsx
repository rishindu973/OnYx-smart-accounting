"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { LedgerEntry } from "@/types/ledger";
import { useToast } from "@/hooks/use-toast";

interface LedgerContextType {
    transactions: LedgerEntry[];
    newTransactionCount: number;
    notifications: string[];
    addTransaction: (transaction: LedgerEntry) => Promise<void>;
    setTransactions: (transactions: LedgerEntry[]) => void;
    recordNewTransaction: (description: string, amount: number, isDebit: boolean, id?: string) => void;
    voidTransaction: (id: string, isPending?: boolean) => Promise<void>;
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
    const [notifications, setNotifications] = useState<string[]>([]);
    const { toast } = useToast();

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
                recordNewTransaction(
                    transaction.description,
                    transaction.debit || transaction.credit || 0,
                    !!transaction.debit,
                    result.id
                );
            } else {
                throw new Error(result?.error || "Unknown error");
            }
        } catch (error) {
            console.error("Failed to save transaction", error);
            toast({
                title: "Error",
                description: "Failed to save transaction to database.",
                variant: "destructive"
            });
        }
    };

    /**
     * Voids a transaction.
     * Adopted from Incoming branch to handle pending AI extractions. 
     */
    const voidTransaction = async (id: string, isPending: boolean = false) => {
        const originalEntry = transactions.find(t => t.id === id);
        if (!originalEntry) return;

        try {
            const { voidTransaction: voidTx } = await import("@/lib/actions/ledger");
            const result = await voidTx(id, isPending);

            if (result && result.success) {
                setNewTransactionCount((prev) => prev + 1);
                setNotifications(prev => [`Transaction ${isPending ? 'removed' : 'voided'}: ${id}`, ...prev]);

                toast({
                    title: isPending ? "Transaction Removed" : "Transaction Voided",
                    description: isPending ? "Pending item removed." : "Reversal entry created successfully.",
                });

                if (isPending) {
                    setTransactionsState(prev => prev.filter(t => t.id !== id));
                }
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
        // History is kept in the notifications array per PRD requirements
    };

    const totals = transactions.reduce(
        (acc, curr) => {
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