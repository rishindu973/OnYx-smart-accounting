"use client";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DayLimit {
  date: string;
  maxAmount: number;
  currentSpent: number;
}

// Mock data for demonstration
const generateMockData = (): Record<string, DayLimit> => {
  const data: Record<string, DayLimit> = {};
  const today = new Date();
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  
  eachDayOfInterval({ start, end }).forEach((date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const maxAmount = isWeekend ? 5000 : 25000;
    const currentSpent = Math.random() * maxAmount * (date <= today ? 1 : 0.3);
    
    data[dateKey] = {
      date: dateKey,
      maxAmount,
      currentSpent: Math.round(currentSpent),
    };
  });
  
  return data;
};

const GovernanceCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [limitsData, setLimitsData] = useState<Record<string, DayLimit>>(generateMockData);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad the start of the month to align with week days
  const startDay = monthStart.getDay();
  const paddedDays = Array(startDay).fill(null).concat(days);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const dateKey = format(date, "yyyy-MM-dd");
    const dayData = limitsData[dateKey];
    setEditAmount(dayData?.maxAmount?.toString() || "25000");
    setIsDialogOpen(true);
  };

  const handleSaveLimit = () => {
    if (selectedDate) {
      const dateKey = format(selectedDate, "yyyy-MM-dd");
      setLimitsData((prev) => ({
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          date: dateKey,
          maxAmount: parseFloat(editAmount) || 25000,
          currentSpent: prev[dateKey]?.currentSpent || 0,
        },
      }));
      setIsDialogOpen(false);
    }
  };

  const getSpendingStatus = (spent: number, max: number) => {
    const percentage = (spent / max) * 100;
    if (percentage >= 100) return "limit-reached";
    if (percentage >= 80) return "warning";
    return "safe";
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
            <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="flex gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-muted-foreground">Safe</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span className="text-muted-foreground">Warning (80%+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Limit Reached</span>
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
              const dayData = limitsData[dateKey];
              const isToday = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const status = dayData ? getSpendingStatus(dayData.currentSpent, dayData.maxAmount) : "safe";
              const percentage = dayData ? Math.min((dayData.currentSpent / dayData.maxAmount) * 100, 100) : 0;

              return (
                <button
                  key={dateKey}
                  onClick={() => handleDayClick(day)}
                  className={`
                    aspect-square p-1.5 rounded-lg border transition-all hover:scale-105 cursor-pointer
                    ${isToday ? "ring-2 ring-primary" : ""}
                    ${isCurrentMonth ? "bg-secondary/50" : "bg-secondary/20 opacity-50"}
                    ${status === "limit-reached" ? "border-destructive/50 bg-destructive/10" : ""}
                    ${status === "warning" ? "border-warning/50 bg-warning/10" : ""}
                    ${status === "safe" ? "border-border hover:border-primary/50" : ""}
                  `}
                >
                  <div className="h-full flex flex-col">
                    <span className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </span>
                    {dayData && (
                      <div className="flex-1 flex flex-col justify-end gap-0.5">
                        <span className="text-[10px] text-muted-foreground truncate">
                          ${(dayData.maxAmount / 1000).toFixed(0)}k
                        </span>
                        <Progress 
                          value={percentage} 
                          className={`h-1.5 ${
                            status === "limit-reached" ? "[&>div]:bg-destructive" : 
                            status === "warning" ? "[&>div]:bg-warning" : ""
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit Limit Modal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Set Daily Limit
            </DialogTitle>
            <DialogDescription>
              Configure the maximum spending limit for {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : ""}.
              This follows the No-Delete audit trail - changes are logged.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="maxAmount">Maximum Amount ($)</Label>
              <Input
                id="maxAmount"
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                placeholder="25000"
                className="bg-secondary border-border"
              />
            </div>
            
            {selectedDate && limitsData[format(selectedDate, "yyyy-MM-dd")] && (
              <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                <p className="text-sm text-muted-foreground">Current Spending</p>
                <p className="text-lg font-semibold">
                  ${limitsData[format(selectedDate, "yyyy-MM-dd")]?.currentSpent.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLimit}>
              Save Limit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GovernanceCalendar;
