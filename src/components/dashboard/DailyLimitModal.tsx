"use client";

import { useState } from "react";
import { setDailyLimit } from "../../lib/actions/governance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DailyLimitModal({ day, companyId, onClose, onSuccess }: any) {
  const [amount, setAmount] = useState(day.limitAmount.toString());
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const result = await setDailyLimit(day.date, parseFloat(amount), companyId);
    if (result.success) {
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border w-full max-w-md p-6 rounded-2xl shadow-2xl">
        <h2 className="text-lg font-semibold mb-2">Set Daily Limit</h2>
        <p className="text-sm text-muted-foreground mb-6">Updating cap for {day.date}</p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Maximum Spending (LKR)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-secondary"
            />
          </div>
          <div className="p-4 bg-muted/50 rounded-xl">
            <div className="text-xs text-muted-foreground">CURRENT SPENDING</div>
            <div className="text-xl font-bold">LKR {day.currentSpending.toLocaleString()}</div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Update Limit"}
          </Button>
        </div>
      </div>
    </div>
  );
}