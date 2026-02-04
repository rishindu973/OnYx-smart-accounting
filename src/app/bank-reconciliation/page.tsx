"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Link2, 
  RotateCcw,
  FileSpreadsheet,
  BookOpen,
  Zap,
  ArrowLeftRight
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  status?: "matched" | "mismatch" | "bounced" | "unmatched";
  matchedTo?: string;
}

const mockBankStatementData: Transaction[] = [
  { id: "bank-1", date: "2024-01-15", description: "Wire Transfer - ABC Supplies", amount: 12500.00, type: "debit" },
  { id: "bank-2", date: "2024-01-14", description: "Cheque #1234 - Office Rent", amount: 4500.00, type: "debit" },
  { id: "bank-3", date: "2024-01-14", description: "ACH Payment - Utilities", amount: 892.50, type: "debit" },
  { id: "bank-4", date: "2024-01-13", description: "Cheque #1235 - Contractor Fee", amount: 7800.00, type: "debit", status: "bounced" },
  { id: "bank-5", date: "2024-01-12", description: "Wire Transfer - Client Payment", amount: 25000.00, type: "credit" },
  { id: "bank-6", date: "2024-01-11", description: "Service Fee", amount: 45.00, type: "debit" },
];

const mockLedgerData: Transaction[] = [
  { id: "ledger-1", date: "2024-01-15", description: "ABC Supplies - Inventory", amount: 12500.00, type: "debit" },
  { id: "ledger-2", date: "2024-01-14", description: "Office Rent - January", amount: 4500.00, type: "debit" },
  { id: "ledger-3", date: "2024-01-14", description: "Utility Payment - Electric", amount: 892.50, type: "debit" },
  { id: "ledger-4", date: "2024-01-13", description: "Contractor Payment - J. Smith", amount: 7800.00, type: "debit" },
  { id: "ledger-5", date: "2024-01-12", description: "Revenue - Client Project", amount: 25000.00, type: "credit" },
  { id: "ledger-6", date: "2024-01-10", description: "Office Supplies", amount: 125.00, type: "debit" },
];

const BankReconciliation = () => {
  const [bankTransactions, setBankTransactions] = useState<Transaction[]>([]);
  const [ledgerTransactions, setLedgerTransactions] = useState<Transaction[]>(mockLedgerData);
  const [isUploading, setIsUploading] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [showReversalDialog, setShowReversalDialog] = useState(false);
  const [selectedForReversal, setSelectedForReversal] = useState<Transaction | null>(null);

  const handleUploadCSV = () => {
    setIsUploading(true);
    // Simulate upload
    setTimeout(() => {
      setBankTransactions(mockBankStatementData);
      setIsUploading(false);
      toast.success("Bank statement uploaded successfully");
    }, 1500);
  };

  const handleMatchNow = () => {
    setIsMatching(true);
    
    setTimeout(() => {
      // Simulate matching logic
      const updatedBank = bankTransactions.map((bt) => {
        const match = ledgerTransactions.find(
          (lt) => Math.abs(lt.amount - bt.amount) < 0.01 && lt.type === bt.type
        );
        
        if (bt.status === "bounced") {
          return { ...bt, status: "bounced" as const };
        }
        
        if (match) {
          return { ...bt, status: "matched" as const, matchedTo: match.id };
        }
        
        return { ...bt, status: "unmatched" as const };
      });

      const updatedLedger = ledgerTransactions.map((lt) => {
        const match = updatedBank.find((bt) => bt.matchedTo === lt.id);
        if (match) {
          return { ...lt, status: "matched" as const, matchedTo: match.id };
        }
        return { ...lt, status: "unmatched" as const };
      });

      setBankTransactions(updatedBank);
      setLedgerTransactions(updatedLedger);
      setIsMatching(false);
      toast.success("Matching complete! 5 transactions matched, 2 exceptions found.");
    }, 2000);
  };

  const handleCreateReversal = () => {
    if (!selectedForReversal) return;
    
    toast.success(`Reversal entry created for ${selectedForReversal.description}`, {
      description: "Transaction voided in accordance with No-Delete policy"
    });
    setShowReversalDialog(false);
    setSelectedForReversal(null);
  };

  const openReversalDialog = (transaction: Transaction) => {
    setSelectedForReversal(transaction);
    setShowReversalDialog(true);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "matched":
        return <Badge className="bg-success/20 text-success border-success/30">Matched</Badge>;
      case "bounced":
        return <Badge variant="destructive">Bounced</Badge>;
      case "mismatch":
        return <Badge className="bg-warning/20 text-warning border-warning/30">Mismatch</Badge>;
      case "unmatched":
        return <Badge variant="secondary">Unmatched</Badge>;
      default:
        return null;
    }
  };

  const matchedCount = bankTransactions.filter((t) => t.status === "matched").length;
  const exceptionCount = bankTransactions.filter((t) => t.status === "bounced" || t.status === "mismatch").length;

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Bank Reconciliation</h1>
            <p className="text-muted-foreground">
              Match bank statements with ledger entries and resolve exceptions
            </p>
          </div>
          {bankTransactions.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Matched</div>
                <div className="text-xl font-bold text-success">{matchedCount}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Exceptions</div>
                <div className="text-xl font-bold text-destructive">{exceptionCount}</div>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Bank Statement Side */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                Bank Statement
              </CardTitle>
              <Button
                onClick={handleUploadCSV}
                disabled={isUploading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? "Uploading..." : "Upload CSV"}
              </Button>
            </CardHeader>
            <CardContent>
              {bankTransactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No bank statement loaded</p>
                  <p className="text-sm">Click "Upload CSV" to import</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  <AnimatePresence>
                    {bankTransactions.map((transaction, index) => (
                      <motion.div
                        key={transaction.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 rounded-lg border ${
                          transaction.status === "matched"
                            ? "bg-success/5 border-success/20"
                            : transaction.status === "bounced"
                            ? "bg-destructive/5 border-destructive/20"
                            : "bg-secondary/50 border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">{transaction.date}</span>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(transaction.status)}
                            {transaction.status === "matched" && (
                              <CheckCircle2 className="w-4 h-4 text-success" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate mr-4">
                            {transaction.description}
                          </span>
                          <span className={`font-mono font-bold ${
                            transaction.type === "credit" ? "text-success" : ""
                          }`}>
                            {transaction.type === "credit" ? "+" : "-"}$
                            {transaction.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        {(transaction.status === "bounced" || transaction.status === "mismatch") && (
                          <div className="mt-2 flex justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs"
                              onClick={() => openReversalDialog(transaction)}
                            >
                              <RotateCcw className="w-3 h-3" />
                              Create Reversal
                            </Button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ledger Side */}
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                OnYx Ledger
              </CardTitle>
              {bankTransactions.length > 0 && (
                <Button
                  onClick={handleMatchNow}
                  disabled={isMatching}
                  size="sm"
                  className="gap-2"
                >
                  {isMatching ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                      />
                      Matching...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Match Now
                    </>
                  )}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                <AnimatePresence>
                  {ledgerTransactions.map((transaction, index) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-4 rounded-lg border ${
                        transaction.status === "matched"
                          ? "bg-success/5 border-success/20"
                          : "bg-secondary/50 border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">{transaction.date}</span>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(transaction.status)}
                          {transaction.status === "matched" && (
                            <Link2 className="w-4 h-4 text-success" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate mr-4">
                          {transaction.description}
                        </span>
                        <span className={`font-mono font-bold ${
                          transaction.type === "credit" ? "text-success" : ""
                        }`}>
                          {transaction.type === "credit" ? "+" : "-"}$
                          {transaction.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Matching Animation Overlay */}
        <AnimatePresence>
          {isMatching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center pointer-events-none"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="flex items-center gap-4 text-2xl font-bold text-primary"
              >
                <ArrowLeftRight className="w-10 h-10" />
                <span>Auto-Matching Transactions...</span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reversal Dialog - No Delete Policy */}
        <Dialog open={showReversalDialog} onOpenChange={setShowReversalDialog}>
          <DialogContent className="bg-card">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-primary" />
                Create Reversal Entry
              </DialogTitle>
              <DialogDescription>
                In accordance with the No-Delete audit trail policy, this will create a reversal entry instead of deleting the original transaction.
              </DialogDescription>
            </DialogHeader>
            
            {selectedForReversal && (
              <div className="p-4 rounded-lg bg-secondary/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Original Entry:</span>
                  <span className="font-medium">{selectedForReversal.description}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-mono font-bold">
                    ${selectedForReversal.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reason:</span>
                  <Badge variant="destructive">
                    {selectedForReversal.status === "bounced" ? "Bounced Cheque" : "Amount Mismatch"}
                  </Badge>
                </div>
              </div>
            )}

            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>This action will create a permanent audit record. The original entry will be marked as voided and a reversal entry will be logged.</span>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowReversalDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateReversal} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Confirm Reversal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
};

export default BankReconciliation;
