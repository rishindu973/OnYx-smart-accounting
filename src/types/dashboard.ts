export interface RecentActivityItem {
  id: string;
  title: string;
  amount: number;
  source: "AI_SCAN" | "USER_INPUT" | "OTHER";
  time: string; // ISO timestamp
  subtitle?: string;
}

export interface DailyLimitInfo {
  limit: number;
  used: number;
  remaining: number;
  percent: number;
}

export interface PendingReviewItem {
  id: string;
  type: "LOW_CONFIDENCE" | "NEW_VENDOR" | "FAILED_VALIDATION" | "PENDING_DOC";
  title: string;
  message: string;
  actionLabel?: string;
}

export interface DashboardMetrics {
  companyName: string;

  todaysTransactions: number;
  transactionsGrowthPct: number;

  processedAmount: number;
  processedBreakdown: {
    processed: number; // Document.status=PROCESSED
    pending: number;   // Document.status=PENDING
  };

  aiConfidenceAvg: number; // 0-100
  reversalsToday: number;
  reversalsAmount: number;

  dailyLimit: DailyLimitInfo;

  pendingReviewCount: number;
  pendingReviewItems: PendingReviewItem[];

  recentActivity: RecentActivityItem[];
}
