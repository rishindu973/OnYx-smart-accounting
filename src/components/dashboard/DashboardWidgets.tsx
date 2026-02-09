"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  AlertCircle,
  CheckCircle,
  FileWarning,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import RadialProgress from "./RadialProgress";
import { Badge } from "@/components/ui/badge";
import type { DashboardMetrics } from "@/types/dashboard";
import { useLedger } from "@/contexts/LedgerContext";

function timeAgo(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (Number.isNaN(d.getTime())) return "just now";

  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;

  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const DashboardWidgets = () => {
  const { newTransactionCount } = useLedger();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

useEffect(() => {
  let alive = true;

  const load = async () => {
    try {
      setErrorMsg(null);
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load dashboard: ${res.status}`);
      const data = (await res.json()) as DashboardMetrics;
      if (alive) setMetrics(data);
    } catch (e) {
      console.error(e);
      if (alive) {
        setMetrics(null);
        setErrorMsg("Could not load dashboard data.");
      }
    } finally {
      if (alive) setLoading(false);
    }
  };

  load();
  const timer = setInterval(load, 5000); // refresh every 5s

  return () => {
    alive = false;
    clearInterval(timer);
  };
}, []);


<<<<<<< Updated upstream
=======
    // Initial fetch
    run();
  }, [newTransactionCount]);
>>>>>>> Stashed changes

  if (loading) return <div className="p-6">Loading dashboard...</div>;

  if (errorMsg) {
    return (
      <div className="p-6">
        <div className="glass-card rounded-xl p-5 border border-destructive/20">
          <p className="text-sm font-medium">{errorMsg}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Check <span className="font-mono">/api/dashboard</span> and console logs.
          </p>
        </div>
      </div>
    );
  }

  const todaysTransactions = metrics?.todaysTransactions ?? 0;
  const growthPct = metrics?.transactionsGrowthPct ?? 0;

  const processedAmount = metrics?.processedAmount ?? 0;
  const processedCount = metrics?.processedBreakdown?.processed ?? 0;
  const pendingCount = metrics?.processedBreakdown?.pending ?? 0;

  const aiConfidenceAvg = metrics?.aiConfidenceAvg ?? 0;

  const reversalsToday = metrics?.reversalsToday ?? 0;
  const reversalsAmount = metrics?.reversalsAmount ?? 0;

  const pendingReviewCount = metrics?.pendingReviewCount ?? 0;
  const pendingReviewItems = metrics?.pendingReviewItems ?? [];

  const daily = metrics?.dailyLimit ?? {
    limit: 50000,
    used: 15500,
    remaining: 34500,
    percent: 69,
  };

  const recentActivity = metrics?.recentActivity ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today's Transactions</p>
              <p className="text-2xl font-bold mt-1">{todaysTransactions}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <ArrowUpRight className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-xs text-success mt-3 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            {growthPct}% from yesterday
          </p>
        </div>

        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Processed Amount</p>
              <p className="text-2xl font-bold mt-1">
                ${processedAmount.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-success/10">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {processedCount} processed, {pendingCount} pending
          </p>
        </div>

        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">AI Confidence Avg</p>
              <p className="text-2xl font-bold mt-1">{aiConfidenceAvg}%</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <AlertCircle className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {pendingReviewCount} items need review
          </p>
        </div>

        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Reversals Today</p>
              <p className="text-2xl font-bold mt-1">{reversalsToday}</p>
            </div>
            <div className="p-3 rounded-lg bg-warning/10">
              <ArrowDownRight className="w-5 h-5 text-warning" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            ${reversalsAmount.toLocaleString()} reversed
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Limit Card */}
        <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center">
          <h3 className="text-lg font-semibold mb-6">Daily Spending Limit</h3>
          <RadialProgress current={daily.used} max={daily.limit} size={220} strokeWidth={14} />
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="text-success font-medium">
                ${daily.remaining.toLocaleString()}
              </span>{" "}
              remaining today
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {daily.percent}% used today
            </p>
          </div>
        </div>

        {/* Pending Review Card */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Pending Review</h3>
            <Badge variant="pending" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {pendingReviewCount} items
            </Badge>
          </div>

          <div className="space-y-4">
            {pendingReviewItems.slice(0, 3).map((item) => (
              <div
                key={item.id + item.type}
                className={`p-4 rounded-lg border ${item.type === "LOW_CONFIDENCE" || item.type === "FAILED_VALIDATION"
                  ? "bg-warning/5 border-warning/20"
                  : item.type === "NEW_VENDOR"
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/50 border-border"
                  }`}
              >
                <div className="flex items-start gap-3">
                  {item.type === "LOW_CONFIDENCE" || item.type === "FAILED_VALIDATION" ? (
                    <FileWarning className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                  ) : item.type === "NEW_VENDOR" ? (
                    <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                  )}

                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.message}</p>
                    {item.actionLabel ? (
                      <button className="text-xs text-primary font-medium mt-2 hover:underline">
                        {item.actionLabel}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}

            {pendingReviewItems.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing to review right now.</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
            <button className="text-sm text-primary hover:underline">View All</button>
          </div>

          <div className="space-y-3">
            {recentActivity.map((item) => {
              const isVerified = item.source === "AI_SCAN";

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isVerified ? "bg-success" : "bg-warning"}`} />
                    <div>
                      <p className="text-sm font-medium truncate max-w-[180px]">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant={item.source === "AI_SCAN" ? "ai" : "manual"}
                          className="text-[10px]"
                        >
                          {item.source}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{timeAgo(item.time)}</span>
                      </div>
                      {item.subtitle ? (
                        <p className="text-xs text-muted-foreground mt-1">{item.subtitle}</p>
                      ) : null}
                    </div>
                  </div>

                  <span className="text-sm font-medium">
                    ${Number(item.amount).toLocaleString()}
                  </span>
                </div>
              );
            })}

            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardWidgets;
