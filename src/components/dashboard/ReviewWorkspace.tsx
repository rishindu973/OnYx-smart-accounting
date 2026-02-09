
"use client";
import { useState, useEffect } from "react";
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
import { UniversalDocument } from "@/types/accounting";
import { motion } from "framer-motion";
import { saveScannedDocument } from "@/lib/actions/documents";

interface ReviewWorkspaceProps {
  data: UniversalDocument;
}

  const ReviewWorkspace = ({ data: initialData }: ReviewWorkspaceProps) => {
  const [formData, setFormData] = useState(initialData);
  const [zoom, setZoom] = useState(100);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showVendorAlert, setShowVendorAlert] = useState(formData.intelligence.is_new_vendor);
  const handleDismissVendorAlert = () => {
  setShowVendorAlert(false);
};

  useEffect(() => {
    // Retrieve the preview URL we saved during the upload step
    const savedImage = sessionStorage.getItem("last_scanned_image");
    if (savedImage) setImagePreview(savedImage);
  }, []);

  const amountsMatch = formData.intelligence.amount_validation_passed;

  const getFieldStyle = (fieldName: keyof typeof formData.intelligence.confidence_score) => {
    const score = formData.intelligence.confidence_score[fieldName];
    if (score >= 0.95) return "";
    return "bg-destructive/10 border-destructive/30 focus:border-destructive";
  };

  const getConfidenceBadge = (fieldName: keyof typeof formData.intelligence.confidence_score) => {
    const score = formData.intelligence.confidence_score[fieldName];
    if (score >= 0.95) return <Badge variant="outline" className="text-success border-success/30">Verified</Badge>;
    if (score >= 0.80) return <Badge variant="outline" className="text-warning border-warning/30">Review</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  };

  const handlePost = async () => {
  const activeCompanyId = "clx-onyx-001"; // Matches seeded company
  const permanentUrl = sessionStorage.getItem("last_scanned_image_permanent") || "";
  
  console.log("Final payload to database:", formData.extracted_data);

  const result = await saveScannedDocument(
    formData,
    activeCompanyId,
    permanentUrl || ""
  );
  
  if (result.success) {
    alert("Transaction Posted: AI results and manual corrections are now in PostgreSQL.");
    window.location.href = '/transactions';
  } else {
    alert("Save failed. Check the server terminal for Prisma errors.");
  }
};

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

 const handleCreateDraftAccount = async () => {
  try {
    // Member 5 logic: This is where you would call a server action 
    // to create the account in your Chart_of_accounts table.
    
    // Update local state to show the user the "Brain" has acted
    setFormData(prev => ({
      ...prev,
      intelligence: {
        ...prev.intelligence,
        is_new_vendor: false, // flag turn off
        suggested_account_id: "DRAFT_ACC_PENDING", // Assign a draft account ID
      }
    }));

    setShowVendorAlert(false);
    alert(`Member 5 Logic: Draft account suggested for ${formData.extracted_data.payee_name}`);
  } catch (error) {
    console.error("Provisioning failed:", error);
  }
};

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
      {/*LEFT SIDE: DOCUMENT VIEWER */}
      <div className="w-1/2 border-r border-border flex flex-col bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between bg-background">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <span className="font-medium text-sm">Source Document Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(50, zoom - 25))}><ZoomOut className="w-4 h-4" /></Button>
            <span className="text-sm w-12 text-center">{zoom}%</span>
            <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(200, zoom + 25))}><ZoomIn className="w-4 h-4" /></Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-muted/20">
          {imagePreview ? (
            <img 
              src={imagePreview} 
              alt="Source Document" 
              className="max-w-full h-auto shadow-2xl rounded-lg origin-top transition-transform duration-200"
              style={{ transform: `scale(${zoom / 100})` }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
              <AlertTriangle className="w-8 h-8" />
              <p>No image preview available for this session.</p>
            </div>
          )}
        </div>
      </div>

      {/*RIGHT SIDE: EXTRACTION FORM */}
      <div className="w-1/2 flex flex-col bg-background">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Extraction Results
          </div>
          {formData.intelligence.is_new_vendor && <Badge variant="secondary">New Vendor</Badge>}
        </div>

        <div className="flex-1 p-6 overflow-auto space-y-6">
        {showVendorAlert && (
  <motion.div 
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-start gap-4"
  >
    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
      <UserPlus className="w-5 h-5 text-primary" />
    </div>
    <div className="flex-1">
      <h4 className="font-semibold text-sm">New Vendor Detected</h4>
      <p className="text-xs text-muted-foreground mb-3">
        "{formData.extracted_data.payee_name}" is not in your vendor list.
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleCreateDraftAccount}>
          Create Draft Account
        </Button>
        <Button size="sm" variant="ghost" onClick={handleDismissVendorAlert}>
          Dismiss
        </Button>
      </div>
    </div>
  </motion.div>
)}
        <div className="space-y-5">
            
      {/*Payee Field */}
      <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="payee">Payee</Label>
              {getConfidenceBadge('payee_name')}
          </div>
        <Input
          id="payee"
          defaultValue={formData.extracted_data.payee_name}
          className={getFieldStyle('payee_name')}
          onChange={(e) => setFormData({
          ...formData,
          extracted_data: { ...formData.extracted_data, payee_name: e.target.value }
        })}
        />
          </div>

      {/* Date Field (Fixed for OCR data)*/}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="date">Date</Label>
              {getConfidenceBadge('date')}
          </div>
        <Input
        id="date"
        defaultValue={formData.extracted_data.date}
        className={getFieldStyle('date')}
        onChange={(e) => setFormData({
          ...formData,
          extracted_data: { ...formData.extracted_data, date: e.target.value }
        })}
        />
        </div>

      {/* Amount Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="amount">Amount (Rupees)</Label>
              {getConfidenceBadge('amount_numeric')}
          </div>
        <Input
        id="amount"
        type="number"
        step="0.01"
        defaultValue={formData.extracted_data.total_amount}
        className={getFieldStyle('amount_numeric')}
        onChange={(e) => setFormData({
          ...formData,
          extracted_data: { ...formData.extracted_data, total_amount: Number(parseFloat(e.target.value).toFixed(2)) || 0 }
        })}
        />
        </div>

      {/*Amount in Words Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="amountWords">Amount in Words</Label>
            {getConfidenceBadge('amount_in_words')}
          </div>
        <Input
        id="amountWords"
        defaultValue={formData.extracted_data.amount_in_words}
        className={getFieldStyle('amount_in_words')}
        onChange={(e) => setFormData({
          ...formData,
          extracted_data: { ...formData.extracted_data, amount_in_words: e.target.value }
        })}
        />
        </div>
      </div>

      {/* Logic Validation Status*/}
        <div className={`p-4 rounded-xl border ${amountsMatch ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
          <div className="flex items-center gap-3">
              {amountsMatch ? <CheckCircle className="w-6 h-6 text-success" /> : <AlertTriangle className="w-6 h-6 text-destructive" />}
            <div>
              <p className={`font-semibold ${amountsMatch ? 'text-success' : 'text-destructive'}`}>
                {amountsMatch ? 'AI Logic Verified' : 'Manual Review Suggested'}
              </p>
              <p className="text-sm text-muted-foreground">
                {amountsMatch
                ? `Confirmed: Word amount aligns with ${formData.extracted_data.currency} ${formData.extracted_data.total_amount}.`
                : `Alert: AI could not mathematically link "${formData.extracted_data.amount_in_words}" to the numeric amount.`}
              </p>
            </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between bg-card">
          <Button variant="outline" onClick={() => window.location.href = '/upload'}>Discard</Button>
          <Button variant="default" onClick={handlePost}>Post Transaction</Button>
        </div>
      </div>
    </div>
  );
};

export default ReviewWorkspace;