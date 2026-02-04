import { useState } from "react";
import { 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Sparkles,
  UserPlus,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface ExtractedData {
  payee: { value: string; confidence: number };
  date: { value: string; confidence: number };
  amount: { value: string; confidence: number };
  amountInWords: { value: string; confidence: number };
}

const mockData: ExtractedData = {
  payee: { value: "TechFlow Solutions Inc.", confidence: 65 },
  date: { value: "2024-01-15", confidence: 98 },
  amount: { value: "4,520.00", confidence: 96 },
  amountInWords: { value: "Four Thousand Five Hundred Twenty Dollars", confidence: 92 },
};

const ReviewWorkspace = () => {
  const [data, setData] = useState(mockData);
  const [showVendorPopup, setShowVendorPopup] = useState(true);
  const [zoom, setZoom] = useState(100);

  const amountsMatch = true; // Mock validation

  const getConfidenceStyle = (confidence: number) => {
    if (confidence < 90) {
      return "bg-destructive/10 border-destructive/30 focus:border-destructive";
    }
    return "";
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 95) return <Badge variant="verified">Verified</Badge>;
    if (confidence >= 90) return <Badge variant="success">High</Badge>;
    if (confidence >= 75) return <Badge variant="warning">Review</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left: Document Viewer */}
      <div className="w-1/2 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <span className="font-medium">Cheque_892_Delta_LLC.pdf</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(50, zoom - 25))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-12 text-center">{zoom}%</span>
            <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(200, zoom + 25))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex-1 p-8 overflow-auto flex items-center justify-center bg-muted/30">
          <div 
            className="bg-white rounded-lg shadow-xl p-8 text-slate-900"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
          >
            {/* Mock Cheque */}
            <div className="w-[500px] h-[220px] border-2 border-slate-300 rounded-lg p-4 relative">
              <div className="absolute top-2 right-2 text-xs text-slate-500">No. 892</div>
              <div className="text-sm font-semibold text-slate-700 mb-4">DELTA LLC</div>
              <div className="text-xs text-slate-500 mb-1">PAY TO THE ORDER OF:</div>
              <div className="border-b border-slate-300 pb-1 mb-4 font-medium">TechFlow Solutions Inc.</div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-xs text-slate-500">AMOUNT IN WORDS:</div>
                  <div className="text-sm">Four Thousand Five Hundred Twenty Dollars</div>
                </div>
                <div className="border-2 border-slate-400 px-4 py-2 rounded">
                  <span className="font-bold">$4,520.00</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>DATE: 01/15/2024</span>
                <span>_________________________</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Extraction Form */}
      <div className="w-1/2 flex flex-col bg-background">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-medium">AI Extraction Results</span>
          </div>
          <Badge variant="ai">Confidence Heatmap Active</Badge>
        </div>

        <div className="flex-1 p-6 overflow-auto space-y-6">
          {/* New Vendor Popup */}
          {showVendorPopup && (
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/30 animate-fade-up">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/20">
                  <UserPlus className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-primary">New Vendor Detected</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowVendorPopup(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    "TechFlow Solutions Inc." is not in your vendor list.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="default">Create Draft Account</Button>
                    <Button size="sm" variant="outline">Dismiss</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="payee">Payee</Label>
                {getConfidenceBadge(data.payee.confidence)}
              </div>
              <Input
                id="payee"
                value={data.payee.value}
                onChange={(e) => setData({ ...data, payee: { ...data.payee, value: e.target.value } })}
                className={getConfidenceStyle(data.payee.confidence)}
              />
              {data.payee.confidence < 90 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Low confidence ({data.payee.confidence}%) - Please verify
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="date">Date</Label>
                {getConfidenceBadge(data.date.confidence)}
              </div>
              <Input
                id="date"
                type="date"
                value={data.date.value}
                onChange={(e) => setData({ ...data, date: { ...data.date, value: e.target.value } })}
                className={getConfidenceStyle(data.date.confidence)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Amount</Label>
                {getConfidenceBadge(data.amount.confidence)}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  value={data.amount.value}
                  onChange={(e) => setData({ ...data, amount: { ...data.amount, value: e.target.value } })}
                  className={`pl-7 ${getConfidenceStyle(data.amount.confidence)}`}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amountWords">Amount in Words</Label>
                {getConfidenceBadge(data.amountInWords.confidence)}
              </div>
              <Input
                id="amountWords"
                value={data.amountInWords.value}
                onChange={(e) => setData({ ...data, amountInWords: { ...data.amountInWords, value: e.target.value } })}
                className={getConfidenceStyle(data.amountInWords.confidence)}
              />
            </div>
          </div>

          {/* Validation Badge */}
          <div className={`p-4 rounded-xl border ${
            amountsMatch 
              ? 'bg-success/10 border-success/30' 
              : 'bg-destructive/10 border-destructive/30'
          }`}>
            <div className="flex items-center gap-3">
              {amountsMatch ? (
                <>
                  <CheckCircle className="w-6 h-6 text-success" />
                  <div>
                    <p className="font-semibold text-success">Amounts Match</p>
                    <p className="text-sm text-muted-foreground">
                      Numerical amount matches words validation
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                  <div>
                    <p className="font-semibold text-destructive">Amount Mismatch</p>
                    <p className="text-sm text-muted-foreground">
                      Numerical and words amounts do not match
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-card">
          <Button variant="outline">Skip for Later</Button>
          <div className="flex gap-2">
            <Button variant="outline">Reject</Button>
            <Button variant="default">Approve & Post</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewWorkspace;