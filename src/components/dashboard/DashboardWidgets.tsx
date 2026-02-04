import { Clock, AlertCircle, CheckCircle, FileWarning, ArrowUpRight, ArrowDownRight } from "lucide-react";
import RadialProgress from "./RadialProgress";
import { Badge } from "@/components/ui/badge";

const recentActivity = [
  { id: 1, description: "Invoice #4521 - ABC Corp", amount: 2450.00, source: "AI_SCAN", status: "verified", date: "2 min ago" },
  { id: 2, description: "Cheque #892 - Delta LLC", amount: 8900.00, source: "AI_SCAN", status: "pending", date: "15 min ago" },
  { id: 3, description: "Manual Entry - Utilities", amount: 340.00, source: "USER_INPUT", status: "verified", date: "1 hour ago" },
  { id: 4, description: "Invoice #4520 - Omega Inc", amount: 12500.00, source: "AI_SCAN", status: "verified", date: "3 hours ago" },
  { id: 5, description: "Cheque #891 - Beta Co", amount: 5600.00, source: "USER_INPUT", status: "verified", date: "5 hours ago" },
];

const DashboardWidgets = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today's Transactions</p>
              <p className="text-2xl font-bold mt-1">24</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <ArrowUpRight className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-xs text-success mt-3 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" />
            12% from yesterday
          </p>
        </div>
        
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Processed Amount</p>
              <p className="text-2xl font-bold mt-1">$48,290</p>
            </div>
            <div className="p-3 rounded-lg bg-success/10">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            18 verified, 6 pending
          </p>
        </div>
        
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">AI Confidence Avg</p>
              <p className="text-2xl font-bold mt-1">94.2%</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <AlertCircle className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            2 items need review
          </p>
        </div>
        
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Reversals Today</p>
              <p className="text-2xl font-bold mt-1">1</p>
            </div>
            <div className="p-3 rounded-lg bg-warning/10">
              <ArrowDownRight className="w-5 h-5 text-warning" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            $1,200 reversed
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Limit Card */}
        <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center">
          <h3 className="text-lg font-semibold mb-6">Daily Spending Limit</h3>
          <RadialProgress 
            current={34500} 
            max={50000} 
            size={220}
            strokeWidth={14}
          />
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="text-success font-medium">$15,500</span> remaining today
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Resets at 12:00 AM EST
            </p>
          </div>
        </div>

        {/* Pending Review Card */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Pending Review</h3>
            <Badge variant="pending" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              6 items
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
              <div className="flex items-start gap-3">
                <FileWarning className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Low Confidence Extraction</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cheque #892 - Amount field confidence: 72%
                  </p>
                  <button className="text-xs text-primary font-medium mt-2 hover:underline">
                    Review Now →
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">New Vendor Detected</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    "TechFlow Solutions" not in vendor list
                  </p>
                  <button className="text-xs text-primary font-medium mt-2 hover:underline">
                    Create Account →
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Awaiting Approval</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    4 entries pending supervisor sign-off
                  </p>
                  <button className="text-xs text-primary font-medium mt-2 hover:underline">
                    View Queue →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
            <button className="text-sm text-primary hover:underline">View All</button>
          </div>
          
          <div className="space-y-3">
            {recentActivity.map((item) => (
              <div 
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    item.status === 'verified' ? 'bg-success' : 'bg-warning'
                  }`} />
                  <div>
                    <p className="text-sm font-medium truncate max-w-[180px]">{item.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={item.source === 'AI_SCAN' ? 'ai' : 'manual'} className="text-[10px]">
                        {item.source}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{item.date}</span>
                    </div>
                  </div>
                </div>
                <span className="text-sm font-medium">
                  ${item.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardWidgets;