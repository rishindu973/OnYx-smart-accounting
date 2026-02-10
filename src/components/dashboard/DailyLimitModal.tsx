"use client";
import { useState } from "react";
import { format } from "date-fns";
import { Loader, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSetDailyLimit } from "@/hooks/useGovernance";
import { useToast } from "@/hooks/use-toast";

interface DailyLimitModalProps {
  companyId?: string;
  selectedDate?: Date | null;
  currentSpending?: number;
  currentLimit?: number;
  usagePercent?: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DailyLimitModal = ({
  companyId,
  selectedDate,
  currentSpending = 0,
  currentLimit = 0,
  usagePercent = 0,
  isOpen,
  onClose,
  onSuccess,
}: DailyLimitModalProps) => {
  const [limitAmount, setLimitAmount] = useState(currentLimit.toString());
  const { setLimit, loading } = useSetDailyLimit();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!selectedDate || !companyId) {
      toast({
        title: "Error",
        description: "Missing date or company information",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(limitAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid limit amount",
        variant: "destructive",
      });
      return;
    }

    try {
      await setLimit({
        date: format(selectedDate, "yyyy-MM-dd"),
        limitAmount: amount,
        companyId,
      });

      toast({
        title: "Success",
        description: "Daily limit has been updated successfully",
      });

      onClose();
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update limit",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (percent: number) => {
    if (percent >= 100) return "text-destructive";
    if (percent >= 80) return "text-yellow-600";
    return "text-primary";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card border-border sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Set Daily Limit
          </DialogTitle>
          <DialogDescription>
            Configure the maximum spending limit for{" "}
            {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : ""}.
            All limit changes are automatically logged in the audit trail for compliance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="limitAmount">Maximum Daily Amount</Label>
            <Input
              id="limitAmount"
              type="number"
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              placeholder="Enter limit amount"
              className="bg-secondary border-border"
              disabled={loading}
              min="0"
              step="0.01"
            />
          </div>

          {currentSpending !== undefined && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Current Spending</p>
                  <p className="text-lg font-semibold">
                    ${currentSpending.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Usage</p>
                  <p className={`text-lg font-semibold ${getStatusColor(usagePercent)}`}>
                    {usagePercent.toFixed(1)}%
                  </p>
                </div>
              </div>

              {usagePercent >= 100 && (
                <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                  ⚠️ Daily limit has been exceeded. No new cheques can be issued.
                </div>
              )}
              {usagePercent >= 80 && usagePercent < 100 && (
                <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                  ⚠️ Approaching daily limit. {(100 - usagePercent).toFixed(1)}% remaining.
                </div>
              )}
            </div>
          )}

          {limitAmount && currentSpending !== undefined && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">New Limit:</span>
                <span className="font-semibold">
                  ${parseFloat(limitAmount).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining:</span>
                <span className="font-semibold text-primary">
                  ${Math.max(0, parseFloat(limitAmount) - currentSpending).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Limit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DailyLimitModal;
