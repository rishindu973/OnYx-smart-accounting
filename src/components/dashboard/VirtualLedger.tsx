"use client";
import { useState, useEffect } from "react";
import { useLedger } from "@/contexts/LedgerContext";
import {
  FileText,
  ExternalLink,
  RotateCcw,
  Eye,
  X,
  ChevronDown,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VirtualLedgerProps {
  initialData: LedgerEntry[];
}

import { LedgerEntry } from "@/types/ledger";

const VirtualLedger = ({ initialData }: VirtualLedgerProps) => {
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [voidingEntry, setVoidingEntry] = useState<string | null>(null);
  const { transactions, setTransactions, addTransaction, totals, voidTransaction } = useLedger();

  // Initialize context with initialData
  useEffect(() => {
    if (initialData) {
      setTransactions(initialData);
    }
  }, [initialData, setTransactions]);

  const displayTransactions = transactions.length > 0 ? transactions : initialData;



  const formatCurrency = (value: number | null) => {
    if (value === null) return "—";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getRowClasses = (entry: LedgerEntry) => {
    if (entry.reversalOfId || entry.isReversed) {
      return "opacity-50 line-through decoration-muted-foreground/50";
    }
    return "";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Virtual Ledger</h1>
          <p className="text-muted-foreground mt-1">
            Immutable record of all journal entries • No-delete policy enforced
          </p>
        </div>
        <div className="flex items-center gap-2">

          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filter
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button variant="outline">Export</Button>
        </div>
      </div>

      {/* Policy Notice */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <RotateCcw className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium text-primary">No-Delete Audit Policy</p>
          <p className="text-sm text-muted-foreground">
            Entries cannot be deleted. To correct errors, use the "Void/Reverse" action to create a reversing entry.
          </p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="w-[100px]">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Account</TableHead>
              <TableHead className="text-right w-[120px]">Debit</TableHead>
              <TableHead className="text-right w-[120px]">Credit</TableHead>
              <TableHead className="w-[100px]">Source</TableHead>
              <TableHead className="w-[100px] text-center">Evidence</TableHead>
              <TableHead className="w-[120px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No ledger entries found
                </TableCell>
              </TableRow>
            ) : (
              displayTransactions.map((entry) => (
                <TableRow
                  key={entry.id}
                  className={`${getRowClasses(entry)} hover:bg-muted/30 transition-colors`}
                >
                  <TableCell className="font-mono text-sm">
                    {entry.date}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {(entry.reversalOfId || entry.isReversed) && (
                        <RotateCcw className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={entry.reversalOfId ? "italic" : ""}>
                        {entry.description}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{entry.account}</span>
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({entry.accountCode})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {entry.debit && (
                      <span className="text-foreground">{formatCurrency(entry.debit)}</span>
                    )}
                    {!entry.debit && <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {entry.credit && (
                      <span className="text-foreground">{formatCurrency(entry.credit)}</span>
                    )}
                    {!entry.credit && <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={entry.source === 'AI_SCAN' ? 'ai' : 'manual'}>
                      {entry.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedDocument(entry.documentUrl)}
                      className="h-8 w-8"
                    >
                      <Eye className="w-4 h-4 text-primary" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    {!entry.reversalOfId && !entry.isReversed && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 h-7 text-xs"
                        onClick={() => setVoidingEntry(entry.id)}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Void/Reverse
                      </Button>
                    )}
                    {(entry.reversalOfId || entry.isReversed) && (
                      <span className="text-xs text-muted-foreground italic">
                        {entry.isReversed ? "Reversed" : "Reversal Entry"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="glass-card rounded-lg p-4 inline-flex gap-8">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Debits</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(totals.debit)}</p>
          </div>
          <div className="w-px bg-border" />
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Credits</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(totals.credit)}</p>
          </div>
          <div className="w-px bg-border" />
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className="text-lg font-bold font-mono text-success">{formatCurrency(totals.balance)}</p>
          </div>
        </div>
      </div>

      {/* Document Lightbox */}
      <Dialog open={!!selectedDocument} onOpenChange={() => setSelectedDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Source Document
            </DialogTitle>
          </DialogHeader>
          <div className="bg-muted rounded-lg p-8 min-h-[400px] flex items-center justify-center relative overflow-hidden">
            {selectedDocument ? (
              <div className="w-full h-full flex flex-col items-center">
                {/* Using a standard img tag for simplicity with external URLs, or you can use Next.js Image if domains are configured */}
                <img
                  src={selectedDocument}
                  alt="Document Evidence"
                  className="max-w-full max-h-[60vh] object-contain rounded-md shadow-sm"
                />
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" asChild>
                    <a href={selectedDocument} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      Open Original
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No document attached</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Void Confirmation Dialog */}
      <Dialog open={!!voidingEntry} onOpenChange={() => setVoidingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-warning" />
              Confirm Reversal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              You are about to create a reversing entry for <strong>{voidingEntry}</strong>.
              This action cannot be undone and will create a permanent audit trail.
            </p>
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-sm text-warning font-medium">
                {displayTransactions.find(t => t.id === voidingEntry)?.isPending
                  ? "This will remove the pending extraction. The source document will be marked as FAILED."
                  : "The original entry will be marked as reversed, and a new reversing entry will be created."
                }
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setVoidingEntry(null)}>Cancel</Button>
              <Button variant="default" onClick={() => {
                if (voidingEntry) {
                  // Logic update: The voidingEntry state now needs to hold more than just ID if we want to be safe, 
                  // OR we find the entry in the list again.
                  // But wait, the state is just `string | null`. 
                  // Let's find the entry from the list.
                  const entry = displayTransactions.find(t => t.id === voidingEntry);
                  if (entry) {
                    voidTransaction(voidingEntry, entry.isPending);
                  }
                  setVoidingEntry(null);
                }
              }}>
                {displayTransactions.find(t => t.id === voidingEntry)?.isPending ? "Remove Entry" : "Create Reversal"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VirtualLedger;