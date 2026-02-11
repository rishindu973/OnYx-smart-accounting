"use client";

import { useEffect, useState } from "react";
import { getGovernanceCalendar } from "../../../lib/actions/governance";
import { DailyLimitModal } from "@/components/dashboard/DailyLimitModal";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function GovernancePage() {
  const companyId = "clx-onyx-001";
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handlePrevMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1 - 1, 1)); // Subtract 1 month
    setMonth(date.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const [y, m] = month.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1 + 1, 1)); // Add 1 month
    setMonth(date.toISOString().slice(0, 7));
  };

  const formatMonthDisplay = (yyyy_mm: string) => {
    const [y, m] = yyyy_mm.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, 1));
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  };

  useEffect(() => {
    setIsLoading(true);
    getGovernanceCalendar(month, companyId)
      .then(setData)
      .finally(() => setIsLoading(false));
  }, [month, companyId]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Financial Governance</h1>
          <p className="text-muted-foreground text-sm">Spending guardrails and compliance calendar</p>
        </div>
        <div className="flex items-center gap-4 bg-card border rounded-xl p-1 shadow-sm">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8 rounded-lg hover:bg-muted">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="font-semibold text-sm min-w-[140px] text-center">
            {formatMonthDisplay(month)}
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8 rounded-lg hover:bg-muted">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={`grid grid-cols-7 gap-4 transition-opacity duration-200 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {data?.days.map((day: any) => (
          <button
            key={day.date}
            onClick={() => setSelectedDay(day)}
            className={`h-32 p-3 rounded-xl border transition text-left flex flex-col justify-between ${day.status === "RED" ? "bg-destructive/10 border-destructive" :
              day.status === "YELLOW" ? "bg-warning/10 border-warning" : "bg-card border-border hover:border-primary"
              }`}
          >
            <span className="font-bold text-sm">{day.date.split('-')[2]}</span>
            <div>
              <div className="text-[10px] text-muted-foreground">REMAINING</div>
              <div className="text-sm font-semibold">LKR {day.remainingAmount.toLocaleString()}</div>
              <div className="w-full h-1 bg-muted rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full ${day.status === "RED" ? "bg-destructive" : day.status === "YELLOW" ? "bg-warning" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, day.usedPercent)}%` }}
                />
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedDay && (
        <DailyLimitModal
          day={selectedDay}
          companyId={companyId}
          onClose={() => setSelectedDay(null)}
          onSuccess={() => getGovernanceCalendar(month, companyId).then(setData)}
        />
      )}
    </div>
  );
}