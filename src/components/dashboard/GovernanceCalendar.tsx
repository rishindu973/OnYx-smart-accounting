"use client";
import { useState } from "react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, DollarSign, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGovernanceMonth, useSetDailyLimit, GovernanceMonthCalendar, GovernanceDaySummary } from "@/hooks/useGovernance";
import { useToast } from "@/hooks/use-toast";

interface GovernanceCalendarProps {
  companyId?: string;
}

const GovernanceCalendar = ({ companyId }: GovernanceCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // API calls
  const monthStr = format(currentMonth, "yyyy-MM");
  const { data: calendar, loading: calendarLoading, refetch } = useGovernanceMonth(monthStr, companyId || "");
  const { setLimit, loading: savingLimit } = useSetDailyLimit();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad the start of the month to align with week days
  const startDay = monthStart.getDay();
  const paddedDays = Array(startDay).fill(null).concat(days);

  // Generate default calendar data for initial display
  const generateDefaultCalendar = (): GovernanceMonthCalendar => {
    return {
      month: monthStr,
      days: days.map(day => ({
        date: format(day, "yyyy-MM-dd"),
        limitAmount: 0,
        currentSpending: 0,
        remainingAmount: 0,
        usedPercent: 0,
        status: "BLUE" as const,
        blocked: false,
      })),
    };
  };

  // Use API data if available, otherwise use default
  const displayCalendar = calendar || generateDefaultCalendar();

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const dayData = displayCalendar.days.find((d: GovernanceDaySummary) => d.date === format(date, "yyyy-MM-dd"));
    setEditAmount(dayData?.limitAmount?.toString() || "");
    setIsDialogOpen(true);
  };

  const handleSaveLimit = async () => {
    if (!selectedDate || !companyId) {
      toast({ title: "Error", description: "Missing date or company info", variant: "destructive" });
      return;
    }

    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Error", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    try {
      await setLimit({
        date: format(selectedDate, "yyyy-MM-dd"),
        limitAmount: amount,
        companyId,
      });
      
      // Calculate and show status notification
      const currentDayData = displayCalendar.days.find((d: GovernanceDaySummary) => d.date === format(selectedDate, "yyyy-MM-dd"));
      const spending = currentDayData?.currentSpending || 0;
      const usagePercent = (spending / amount) * 100;
      
      let statusMessage = "";
      let statusVariant: "default" | "destructive" = "default";
      
      if (usagePercent >= 100) {
        statusMessage = `⚠️ Daily limit has been EXCEEDED! Current spending: $${spending.toLocaleString()}`;
        statusVariant = "destructive";
      } else if (usagePercent >= 80) {
        statusMessage = `⚠️ Daily limit WARNING: ${usagePercent.toFixed(1)}% used. Remaining: $${(amount - spending).toLocaleString()}`;
        statusVariant = "destructive";
      } else {
        statusMessage = `✓ Daily limit set to $${amount.toLocaleString()}. Safe spending level.`;
      }
      
      toast({ 
        title: "Limit Updated", 
        description: statusMessage,
        variant: statusVariant
      });
      
      setIsDialogOpen(false);
      refetch();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to save limit",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RED":
        return "destructive";
      case "YELLOW":
        return "warning";
      default:
        return "primary";
    }
  };

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <>
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Daily Limit Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} disabled={calendarLoading}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} disabled={calendarLoading}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!companyId ? (
            <div className="text-center py-12 text-muted-foreground">
              Company information is not available. Please log in.
            </div>
          ) : (
            <>
              {/* Legend */}
              <div className="flex gap-4 mb-4 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Safe (&lt;80%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-muted-foreground">Warning (80-99%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">Limit Reached (≥100%)</span>
                </div>
              </div>

              {/* Week days header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {paddedDays.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const dateKey = format(day, "yyyy-MM-dd");
                  const dayData = displayCalendar.days.find((d: GovernanceDaySummary) => d.date === dateKey);
                  const isToday = isSameDay(day, new Date());
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  
                  const statusColor = dayData ? getStatusColor(dayData.status) : "primary";
                  const percentage = dayData?.usedPercent || 0;
                  
                  const statusBgClass = 
                    dayData?.status === "RED" ? "bg-red-50 border-red-200" :
                    dayData?.status === "YELLOW" ? "bg-yellow-50 border-yellow-200" :
                    "border-border";

                  return (
                    <button
                      key={dateKey}
                      onClick={() => handleDayClick(day)}
                      disabled={!isCurrentMonth || !dayData}
                      className={`
                        aspect-square p-1.5 rounded-lg border transition-all cursor-pointer
                        ${isToday ? "ring-2 ring-primary" : ""}
                        ${isCurrentMonth ? statusBgClass : "bg-secondary/20 opacity-50 cursor-not-allowed"}
                        hover:scale-105 disabled:hover:scale-100 disabled:opacity-50
                      `}
                    >
                      <div className="h-full flex flex-col">
                        <span className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>
                          {format(day, "d")}
                        </span>
                        {dayData && isCurrentMonth && (
                          <div className="flex-1 flex flex-col justify-end gap-0.5 min-h-[50px]">
                            <div className="space-y-1">
                              <div className="text-[10px] text-muted-foreground">
                                Limit: {dayData.limitAmount ? `$${dayData.limitAmount.toLocaleString()}` : "—"}
                              </div>
                              {dayData.limitAmount > 0 && (
                                <>
                                  <Progress 
                                    value={percentage} 
                                    className={`h-1.5`}
                                  />
                                  <div className="text-[9px] text-muted-foreground text-right">
                                    {percentage.toFixed(0)}%
                                  </div>
                                </>
                              )}
                            </div>
                            {dayData.blocked && (
                              <div className="text-[9px] font-semibold text-destructive mt-1 bg-destructive/10 px-1 py-0.5 rounded">
                                Blocked
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Limit Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-border sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Set Daily Limit
            </DialogTitle>
            <DialogDescription>
              Configure the maximum spending limit for {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : ""}.
              All changes are logged in the audit trail.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="limitAmount">Maximum Amount</Label>
              <Input
                id="limitAmount"
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="Enter limit amount"
                className="bg-secondary border-border"
                disabled={savingLimit}
              />
            </div>
            
            {selectedDate && (
              (() => {
                const dayData = displayCalendar.days.find((d: GovernanceDaySummary) => d.date === format(selectedDate, "yyyy-MM-dd"));
                return dayData ? (
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Current Spending</p>
                      <p className="text-lg font-semibold">
                        ${dayData.currentSpending?.toLocaleString() || "0"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Usage:</span>
                      <span className={`font-semibold ${
                        dayData.status === "RED" ? "text-destructive" :
                        dayData.status === "YELLOW" ? "text-yellow-600" :
                        "text-primary"
                      }`}>
                        {dayData.usedPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ) : null;
              })()
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={savingLimit}>
              Cancel
            </Button>
            <Button onClick={handleSaveLimit} disabled={savingLimit}>
              {savingLimit ? (
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
    </>
  );
};

export default GovernanceCalendar;

