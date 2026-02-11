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
  X,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UniversalDocument } from "@/types/accounting";
import { motion, AnimatePresence } from "framer-motion";
import { saveScannedDocument } from "@/lib/actions/documents";
import { useRouter } from "next/navigation";

interface ReviewWorkspaceProps {
  data: UniversalDocument;
}

const ReviewWorkspace = ({ data: initialData }: ReviewWorkspaceProps) => {
  const [formData, setFormData] = useState(initialData);
  const [direction, setDirection] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [zoom, setZoom] = useState(100);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Initialize state based on data
  const [showVendorAlert, setShowVendorAlert] = useState(
    formData.intelligence.is_new_vendor || !!formData.intelligence.potential_match
  );

  const router = useRouter();

  // Sync state with props/formData changes
  useEffect(() => {
    const shouldShow = formData.intelligence.is_new_vendor || !!formData.intelligence.potential_match;
    setShowVendorAlert(shouldShow);
  }, [formData.intelligence.is_new_vendor, formData.intelligence.potential_match]);

  const handleDismissVendorAlert = () => {
    setShowVendorAlert(false);
  };

  useEffect(() => {
    // Retrieve the preview URL we saved during the upload step
    if (!formData.metadata.isManual) {
      const savedImage = sessionStorage.getItem("last_scanned_image");
      if (savedImage) setImagePreview(savedImage);
    }
  }, [formData.metadata.isManual]);

  const amountsMatch = formData.intelligence.amount_validation_passed;

  const getFieldStyle = (fieldName: keyof typeof formData.intelligence.confidence_scores) => {
    if (formData.metadata.isManual) return "";
    const score = formData.intelligence.confidence_scores[fieldName];
    if (score >= 0.95) return "border-success/40 bg-success/5";
    if (score >= 0.80) return "border-warning/40 bg-warning/5";
    return "bg-destructive/10 border-destructive/30 focus:border-destructive";
  };

  const getConfidenceBadge = (fieldName: keyof typeof formData.intelligence.confidence_scores) => {
    if (formData.metadata.isManual) return null;
    const score = formData.intelligence.confidence_scores[fieldName];
    if (score >= 0.95) return <Badge variant="outline" className="text-success border-success/30">Verified</Badge>;
    if (score >= 0.80) return <Badge variant="outline" className="text-warning border-warning/30">Review</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  };

  const handlePost = async () => {
    const activeCompanyId = "clx-onyx-001"; // Matches seeded company

    // console.log("Final payload to database:", formData.extracted_data);

    const result = await saveScannedDocument(formData, activeCompanyId, imagePreview || undefined, direction);

    if (result.success) {
      // Use router for SPA navigation instead of full reload
      router.push('/transactions');
    } else {
      alert("Save failed. Check the server terminal for Prisma errors.");
    }
  };

  const handleCreateDraftAccount = async () => {
    try {
      // Member 5 logic placeholder
      setFormData(prev => ({
        ...prev,
        intelligence: {
          ...prev.intelligence,
          is_new_vendor: false,
          suggestion_account_id: "DRAFT_ACC_PENDING",
        }
      }));

      setShowVendorAlert(false);
      alert(`Member 5 Logic: Draft account suggested for ${formData.extracted_data.payee_name}`);
    } catch (error) {
      console.error("Provisioning failed:", error);
    }
  };

  // Helper to update field and set confidence to 1.0 (Manual Override)
  const handleFieldChange = (field: keyof typeof formData.extracted_data, value: any, confidenceField?: keyof typeof formData.intelligence.confidence_scores) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        extracted_data: { ...prev.extracted_data, [field]: value }
      };

      // If we are editing a field that has a corresponding confidence score, mark it as verified (1.0)
      if (confidenceField) {
        newData.intelligence = {
          ...prev.intelligence,
          confidence_scores: { ...prev.intelligence.confidence_scores, [confidenceField]: 1.0 }
        };
      }
      return newData;
    });
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
            AI Extraction Results (v2)
          </div>
          {formData.intelligence.is_new_vendor && <Badge variant="secondary">New Vendor</Badge>}
        </div>

        <div className="flex-1 p-6 overflow-auto space-y-6">
          <AnimatePresence>
            {showVendorAlert && (
              <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className={`rounded-xl p-4 mb-6 flex items-start gap-4 ${formData.intelligence.potential_match
                  ? 'bg-warning/10 border border-warning/30'
                  : 'bg-primary/5 border border-primary/20'
                  }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${formData.intelligence.potential_match ? 'bg-warning/20 text-warning' : 'bg-primary/10 text-primary'
                  }`}>
                  {formData.intelligence.potential_match ? <Sparkles className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm">
                    {formData.intelligence.potential_match ? "Potential Vendor Match" : "New Vendor Detected"}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    {formData.intelligence.potential_match
                      ? <span>Did you mean <strong>"{formData.intelligence.potential_match}"</strong>? We found a similar known vendor.</span>
                      : `"${formData.extracted_data.payee_name}" is not in your vendor list.`
                    }
                  </p>
                  <div className="flex gap-2">
                    {formData.intelligence.potential_match ? (
                      <>
                        <Button size="sm" onClick={() => {
                          // Accept Logic
                          setFormData(prev => ({
                            ...prev,
                            extracted_data: { ...prev.extracted_data, payee_name: prev.intelligence.potential_match! },
                            intelligence: { ...prev.intelligence, is_new_vendor: false }
                          }));
                          setShowVendorAlert(false);
                        }}>
                          Yes, Use "{formData.intelligence.potential_match}"
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCreateDraftAccount}>
                          No, Create "{formData.extracted_data.payee_name}"
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" onClick={handleCreateDraftAccount}>
                          Create Account for "{formData.extracted_data.payee_name}"
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleDismissVendorAlert}>
                          Dismiss
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <button onClick={handleDismissVendorAlert} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-5">
            {/* Direction Toggle */}
            <div className="flex bg-muted p-1 rounded-lg mb-4">
              <button
                onClick={() => setDirection('DEBIT')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${direction === 'DEBIT'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Debit (Expense)
              </button>
              <button
                onClick={() => setDirection('CREDIT')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${direction === 'CREDIT'
                  ? 'bg-emerald-500/10 text-emerald-600 shadow-sm border border-emerald-500/20'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Credit (Refund/Income)
              </button>
            </div>

            {/*Payee Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="payee">Payee</Label>
                {getConfidenceBadge('payee_name')}
              </div>
              <Input
                id="payee"
                value={formData.extracted_data.payee_name || ""}
                className={`${getFieldStyle('payee_name')} cursor-text`}
                onChange={(e) => handleFieldChange('payee_name', e.target.value, 'payee_name')}
              />
            </div>

            {/* Suggested Account ID Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="accountId">Account ID</Label>
                {formData.intelligence.suggestion_account_id && (
                  <Badge variant="outline" className="text-primary border-primary/30">AI Suggestion</Badge>
                )}
              </div>
              <Input
                id="accountId"
                value={formData.intelligence.suggestion_account_id || ""}
                onChange={(e) => setFormData({
                  ...formData,
                  intelligence: { ...formData.intelligence, suggestion_account_id: e.target.value }
                })}
                placeholder="e.g. 5001 - Office Supplies"
                className={formData.intelligence.suggestion_account_id ? 'border-primary/50 bg-primary/5' : ''}
              />
              {formData.intelligence.suggestion_account_id && (
                <p className="text-xs text-muted-foreground">
                  Based on vendor "{formData.extracted_data.payee_name}"
                </p>
              )}
            </div>

            {/* Date Field (Fixed for OCR data)*/}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="date">Date</Label>
                {getConfidenceBadge('date')}
              </div>
              <Input
                id="date"
                value={formData.extracted_data.date || ""}
                className={`${getFieldStyle('date')} cursor-text`}
                onChange={(e) => handleFieldChange('date', e.target.value, 'date')}
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
                value={formData.extracted_data.total_amount}
                className={`${getFieldStyle('amount_numeric')} cursor-text`}
                onChange={(e) => handleFieldChange('total_amount', Number(parseFloat(e.target.value).toFixed(2)) || 0, 'amount_numeric')}
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
                value={formData.extracted_data.amount_in_words || ""}
                className={`${getFieldStyle('amount_in_words')} cursor-text`}
                onChange={(e) => handleFieldChange('amount_in_words', e.target.value, 'amount_in_words')}
              />
            </div>
          </div>

          {/* Logic Validation Status*/}
          <div className={`p-4 rounded-xl border ${amountsMatch ? 'bg-success/10 border-success/30' : 'bg-red-950/20 border-red-600/40'}`}>
            <div className="flex items-center gap-3">
              {amountsMatch ? <CheckCircle className="w-6 h-6 text-success" /> : <AlertTriangle className="w-6 h-6 text-red-500" />}
              <div>
                <p className={`font-semibold ${amountsMatch ? 'text-success' : 'text-red-400'}`}>
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

        <div className="p-4 border-t border-border flex flex-col gap-4 bg-card">

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => router.push('/upload')}>Discard</Button>
            <Button
              variant={direction === 'CREDIT' ? 'outline' : 'default'}
              className={direction === 'CREDIT' ? 'border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10' : ''}
              onClick={handlePost}
            >
              Post {direction === 'CREDIT' ? 'Credit' : 'Transaction'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewWorkspace;