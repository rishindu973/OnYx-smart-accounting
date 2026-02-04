import { format } from "date-fns";
import { ShieldX, AlertTriangle, Clock, DollarSign, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BlockedTransaction {
  id: string;
  timestamp: Date;
  payee: string;
  amount: number;
  dailyLimit: number;
  attemptedBy: string;
  reason: string;
}

// Mock blocked transactions data
const blockedTransactions: BlockedTransaction[] = [
  {
    id: "BLK-001",
    timestamp: new Date(2026, 0, 5, 14, 32),
    payee: "Global Tech Solutions",
    amount: 28500,
    dailyLimit: 25000,
    attemptedBy: "John Davis",
    reason: "Transaction exceeded daily limit guardrail",
  },
  {
    id: "BLK-002",
    timestamp: new Date(2026, 0, 4, 11, 15),
    payee: "Premier Office Supplies",
    amount: 6200,
    dailyLimit: 5000,
    attemptedBy: "Sarah Chen",
    reason: "Weekend limit exceeded (reduced limit applies)",
  },
  {
    id: "BLK-003",
    timestamp: new Date(2026, 0, 3, 16, 45),
    payee: "Velocity Logistics Inc",
    amount: 32000,
    dailyLimit: 25000,
    attemptedBy: "Michael Torres",
    reason: "Transaction exceeded daily limit guardrail",
  },
  {
    id: "BLK-004",
    timestamp: new Date(2026, 0, 2, 9, 22),
    payee: "TechWare Systems",
    amount: 27800,
    dailyLimit: 25000,
    attemptedBy: "Emily Watson",
    reason: "Cumulative daily total would exceed limit",
  },
];

const BlockingHistory = () => {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldX className="w-5 h-5 text-destructive" />
          Blocking History
          <Badge variant="outline" className="ml-2 text-destructive border-destructive/50">
            {blockedTransactions.length} Blocked
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Transactions automatically blocked for exceeding daily guardrails. Following the No-Delete principle, 
          these records are immutable and serve as an audit trail.
        </p>

        <div className="space-y-3">
          {blockedTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="font-medium">{transaction.payee}</span>
                </div>
                <Badge variant="destructive" className="text-xs">
                  {transaction.id}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Attempted</p>
                    <p className="font-semibold text-destructive">
                      ${transaction.amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <ShieldX className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Daily Limit</p>
                    <p className="font-semibold">
                      ${transaction.dailyLimit.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Attempted By</p>
                    <p className="font-medium">{transaction.attemptedBy}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground text-xs">Timestamp</p>
                    <p className="font-medium">
                      {format(transaction.timestamp, "MMM d, HH:mm")}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground bg-secondary/50 p-2 rounded">
                <span className="font-medium text-foreground">Reason: </span>
                {transaction.reason}
              </p>
            </div>
          ))}
        </div>

        {blockedTransactions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <ShieldX className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No blocked transactions</p>
            <p className="text-sm">All transactions have been within daily limits</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BlockingHistory;
