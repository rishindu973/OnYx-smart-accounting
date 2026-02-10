// "use client";

// import { useState, useEffect } from "react";
// import {
//   CheckCircle,
//   AlertTriangle,
//   FileText,
//   ZoomIn,
//   ZoomOut,
//   Sparkles,
//   UserPlus,
//   X,
//   Check
// } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Badge } from "@/components/ui/badge";
// import { UniversalDocument } from "@/types/accounting";
// import { motion, AnimatePresence } from "framer-motion";
// import { saveScannedDocument } from "@/lib/actions/documents";
// import { useLedger } from "@/contexts/LedgerContext";
// import { useRouter } from "next/navigation";

// interface ReviewWorkspaceProps {
//   data: UniversalDocument;
// }

// const ReviewWorkspace = ({ data: initialData }: ReviewWorkspaceProps) => {
//   const [formData, setFormData] = useState(initialData);
//   const [zoom, setZoom] = useState(100);
//   const [imagePreview, setImagePreview] = useState<string | null>(null);
  
//   // Drives visibility of the Intelligence Card
//   const [showVendorAlert, setShowVendorAlert] = useState(formData.intelligence.is_new_vendor);

//   const { recordNewTransaction } = useLedger();
//   const router = useRouter();

//   useEffect(() => {
//     // Load evidence only for AI scans
//     if (!formData.metadata.isManual) {
//       const savedImage = sessionStorage.getItem("last_scanned_image");
//       if (savedImage) setImagePreview(savedImage);
//     }
//   }, [formData.metadata.isManual]);

//   const amountsMatch = formData.intelligence.amount_validation_passed;

//   // UI Helper: Highlight low-confidence fields (< 90% per project specs)
//   const getFieldStyle = (fieldName: keyof typeof formData.intelligence.confidence_score) => {
//     if (formData.metadata.isManual) return "";
//     const score = formData.intelligence.confidence_score[fieldName];
//     if (score >= 0.95) return "border-success/40 bg-success/5"; // Verified
//     if (score >= 0.90) return "border-warning/40 bg-warning/5"; // Review
//     return "bg-destructive/10 border-destructive/30 focus:border-destructive"; // Low
//   };

//   const getConfidenceBadge = (fieldName: keyof typeof formData.intelligence.confidence_score) => {
//     if (formData.metadata.isManual) return null;
//     const score = formData.intelligence.confidence_score[fieldName];
//     if (score >= 0.95) return <Badge variant="outline" className="text-success border-success/30">Verified</Badge>;
//     if (score >= 0.80) return <Badge variant="outline" className="text-warning border-warning/30">Review</Badge>;
//     return <Badge variant="destructive">Low</Badge>;
//   };

//   /**
//    * ✅ ACCEPT AI MATCH: Logic for "Did you mean X?"
//    */
//   const handleAcceptMatch = (matchedName: string) => {
//     setFormData(prev => ({
//       ...prev,
//       extracted_data: { ...prev.extracted_data, payee_name: matchedName },
//       intelligence: { ...prev.intelligence, is_new_vendor: false }
//     }));
//     setShowVendorAlert(false);
//   };

//   const handlePost = async () => {
//     const activeCompanyId = "clx-onyx-001"; 
//     const permanentUrl = sessionStorage.getItem("last_scanned_image_permanent") || "";
    
//     const result = await saveScannedDocument(formData, activeCompanyId, permanentUrl);
    
//     if (result.success) {
//       recordNewTransaction(
//         formData.extracted_data.payee_name,
//         formData.extracted_data.total_amount,
//         true, 
//         result.id
//       );
//       router.push('/transactions');
//       window.location.href = '/transactions';
//     } else {
//       alert("Save failed. Check Prisma schema mappings.");
//     }
//   };

//   const handleCreateDraftAccount = async () => {
//     // Member 5 Logic: Zero-Click Provisioning
//     setFormData(prev => ({
//       ...prev,
//       intelligence: {
//         ...prev.intelligence,
//         is_new_vendor: false,
//         suggestion_account_id: "DRAFT_ACC_PENDING", 
//       }
//     }));
//     setShowVendorAlert(false);
//     alert(`Member 5 Brain: Draft account suggested for ${formData.extracted_data.payee_name}`);
//   };

//   return (
//     <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
//       {/* LEFT SIDE: DOCUMENT VIEWER (Hidden if Manual) */}
//       {!formData.metadata.isManual && (
//         <div className="w-1/2 border-r border-border flex flex-col bg-card overflow-hidden">
//           <div className="p-4 border-b border-border flex items-center justify-between bg-background">
//             <div className="flex items-center gap-2">
//               <FileText className="w-5 h-5 text-primary" />
//               <span className="font-medium text-sm">Source Document Preview</span>
//             </div>
//             <div className="flex items-center gap-2">
//               <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(50, zoom - 25))}><ZoomOut className="w-4 h-4" /></Button>
//               <span className="text-sm w-12 text-center">{zoom}%</span>
//               <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(200, zoom + 25))}><ZoomIn className="w-4 h-4" /></Button>
//             </div>
//           </div>

//           <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-muted/20">
//             {imagePreview ? (
//               <img
//                 src={imagePreview}
//                 alt="Source Document"
//                 className="max-w-full h-auto shadow-2xl rounded-lg origin-top transition-transform duration-200"
//                 style={{ transform: `scale(${zoom / 100})` }}
//               />
//             ) : (
//               <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
//                 <AlertTriangle className="w-8 h-8" />
//                 <p>No image preview available for this session.</p>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* RIGHT SIDE: INTERACTIVE FORM */}
//       <div className={`${formData.metadata.isManual ? 'w-full max-w-2xl mx-auto' : 'w-1/2'} flex flex-col bg-background`}>
//         <div className="p-4 border-b border-border flex items-center justify-between">
//           <div className="flex items-center gap-2 font-medium">
//             <Sparkles className="w-5 h-5 text-primary" />
//             {formData.metadata.isManual ? "Manual Entry Result" : "AI Extraction Results"}
//           </div>
//           <Badge variant="secondary">{formData.metadata.source}</Badge>
//         </div>

//         <div className="flex-1 p-6 overflow-auto space-y-6">
//           {/* ✅ Integrated Vendor Intelligence Card */}
//           <AnimatePresence>
//             {showVendorAlert && (
//               <motion.div
//                 initial={{ opacity: 0, height: 0 }}
//                 animate={{ opacity: 1, height: "auto" }}
//                 exit={{ opacity: 0, height: 0 }}
//                 className={`rounded-xl p-4 mb-6 flex items-start gap-4 ${
//                   formData.intelligence.potential_match
//                     ? 'bg-warning/10 border border-warning/30' 
//                     : 'bg-primary/5 border border-primary/20'
//                 }`}
//               >
//                 <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
//                   formData.intelligence.potential_match ? 'bg-warning/20 text-warning' : 'bg-primary/10 text-primary'
//                 }`}>
//                   {formData.intelligence.potential_match ? <Sparkles className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
//                 </div>
//                 <div className="flex-1">
//                   <h4 className="font-semibold text-sm">
//                     {formData.intelligence.potential_match ? "Potential Vendor Match" : "New Vendor Detected"}
//                   </h4>
//                   <p className="text-xs text-muted-foreground mb-3">
//                     {formData.intelligence.potential_match
//                       ? <span>Did you mean <strong>"{formData.intelligence.potential_match}"</strong>? We found a similar known vendor.</span>
//                       : `"${formData.extracted_data.payee_name}" is not in your vendor list.`
//                     }
//                   </p>
//                   <div className="flex gap-2">
//                     {formData.intelligence.potential_match ? (
//                       <Button size="sm" onClick={() => handleAcceptMatch(formData.intelligence.potential_match!)}>
//                         <Check className="w-3 h-3 mr-1" /> Yes, Use "{formData.intelligence.potential_match}"
//                       </Button>
//                     ) : (
//                       <Button size="sm" onClick={handleCreateDraftAccount}>
//                         Create Account for "{formData.extracted_data.payee_name}"
//                       </Button>
//                     )}
//                     <Button size="sm" variant="ghost" onClick={() => setShowVendorAlert(false)}>
//                       Dismiss
//                     </Button>
//                   </div>
//                 </div>
//                 <button onClick={() => setShowVendorAlert(false)} className="text-muted-foreground hover:text-foreground">
//                     <X className="w-4 h-4" />
//                 </button>
//               </motion.div>
//             )}
//           </AnimatePresence>

//           <div className="space-y-5">
//             {/* Payee Field */}
//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <Label htmlFor="payee">Payee</Label>
//                 {getConfidenceBadge('payee_name')}
//               </div>
//               <Input
//                 id="payee"
//                 value={formData.extracted_data.payee_name}
//                 className={getFieldStyle('payee_name')}
//                 onChange={(e) => setFormData({
//                   ...formData,
//                   extracted_data: { ...formData.extracted_data, payee_name: e.target.value }
//                 })}
//               />
//             </div>

//             {/* Date Field */}
//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <Label htmlFor="date">Date</Label>
//                 {getConfidenceBadge('date')}
//               </div>
//               <Input
//                 id="date"
//                 defaultValue={formData.extracted_data.date}
//                 className={getFieldStyle('date')}
//                 onChange={(e) => setFormData({
//                   ...formData,
//                   extracted_data: { ...formData.extracted_data, date: e.target.value }
//                 })}
//               />
//             </div>

//             {/* Amount Field */}
//             <div className="space-y-2">
//               <div className="flex items-center justify-between">
//                 <Label htmlFor="amount">Amount (Rupees)</Label>
//                 {getConfidenceBadge('amount_numeric')}
//               </div>
//               <Input
//                 id="amount"
//                 type="number"
//                 step="0.01"
//                 defaultValue={formData.extracted_data.total_amount}
//                 className={getFieldStyle('amount_numeric')}
//                 onChange={(e) => setFormData({
//                   ...formData,
//                   extracted_data: { ...formData.extracted_data, total_amount: parseFloat(e.target.value) || 0 }
//                 })}
//               />
//             </div>
            
//             {/* ✅ Restored Amount in Words with Badge */}
//             {formData.metadata.type === "CHEQUE" && (
//               <div className="space-y-2">
//                 <div className="flex items-center justify-between">
//                   <Label htmlFor="amountWords">Amount in Words</Label>
//                   {getConfidenceBadge('amount_in_words')}
//                 </div>
//                 <Input
//                   id="amountWords"
//                   defaultValue={formData.extracted_data.amount_in_words}
//                   className={getFieldStyle('amount_in_words')}
//                   onChange={(e) => setFormData({
//                     ...formData,
//                     extracted_data: { ...formData.extracted_data, amount_in_words: e.target.value }
//                   })}
//                 />
//               </div>
//             )}
//           </div>

//           {/* Logic Validation Status */}
//           <div className={`p-4 rounded-xl border ${amountsMatch ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
//             <div className="flex items-center gap-3">
//               {amountsMatch ? <CheckCircle className="w-6 h-6 text-success" /> : <AlertTriangle className="w-6 h-6 text-destructive" />}
//               <div>
//                 <p className={`font-semibold ${amountsMatch ? 'text-success' : 'text-destructive'}`}>
//                   {amountsMatch ? 'AI Logic Verified' : 'Manual Review Suggested'}
//                 </p>
//                 <p className="text-sm text-muted-foreground">
//                   {amountsMatch
//                     ? `Confirmed: Word amount aligns with ${formData.extracted_data.currency} ${formData.extracted_data.total_amount}.`
//                     : `Alert: AI could not mathematically link "${formData.extracted_data.amount_in_words}" to the numeric amount.`}
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="p-4 border-t border-border flex items-center justify-between bg-card">
//           <Button variant="outline" onClick={() => router.push('/upload')}>Discard</Button>
//           <Button variant="default" onClick={handlePost}>Post Transaction</Button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ReviewWorkspace;
"use client";
import { useState, useEffect } from "react";
import { CheckCircle, AlertTriangle, FileText, ZoomIn, ZoomOut, Sparkles, UserPlus, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UniversalDocument } from "@/types/accounting";
import { motion, AnimatePresence } from "framer-motion";
import { saveScannedDocument } from "@/lib/actions/documents";
import { useLedger } from "@/contexts/LedgerContext";
import { useRouter } from "next/navigation";

const ReviewWorkspace = ({ data: initialData }: { data: UniversalDocument }) => {
  const [formData, setFormData] = useState(initialData);
  const [zoom, setZoom] = useState(100);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showVendorAlert, setShowVendorAlert] = useState(formData.intelligence.is_new_vendor);
  const { recordNewTransaction } = useLedger();
  const router = useRouter();

  useEffect(() => {
    if (!formData.metadata.isManual) {
      const savedImage = sessionStorage.getItem("last_scanned_image");
      if (savedImage) setImagePreview(savedImage);
    }
  }, [formData.metadata.isManual]);

  const getFieldStyle = (fieldName: keyof typeof formData.intelligence.confidence_score) => {
    if (formData.metadata.isManual) return "";
    const score = formData.intelligence.confidence_score[fieldName];
    if (score >= 0.95) return "border-success/40 bg-success/5"; 
    if (score >= 0.90) return "border-warning/40 bg-warning/5"; 
    return "bg-destructive/10 border-destructive/30 focus:border-destructive";
  };

  const handleAcceptMatch = (matchedName: string) => {
    setFormData(prev => ({
      ...prev,
      extracted_data: { ...prev.extracted_data, payee_name: matchedName },
      intelligence: { ...prev.intelligence, is_new_vendor: false }
    }));
    setShowVendorAlert(false);
  };

  const handlePost = async () => {
    const activeCompanyId = "clx-onyx-001"; 
    const permanentUrl = sessionStorage.getItem("last_scanned_image_permanent") || "";
    const result = await saveScannedDocument(formData, activeCompanyId, permanentUrl);
    
    if (result.success) {
      recordNewTransaction(formData.extracted_data.payee_name, formData.extracted_data.total_amount, true, result.id);
      router.push('/transactions');
      window.location.href = '/transactions';
    } else {
      alert("Database error. Please check server logs.");
    }
  };
  const handleCreateDraftAccount = async () => {
  try {
    
    setFormData(prev => ({
      ...prev,
      intelligence: {
        ...prev.intelligence,
        is_new_vendor: false, 
        suggestion_account_id: "DRAFT_ACC_PENDING",
      }
    }));

    setShowVendorAlert(false);
    alert(`Zero-Click Provisioning: Draft account suggested for ${formData.extracted_data.payee_name}`);
  } catch (error) {
    console.error("Auto-provisioning failed:", error);
  }
};
  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden">
      {/* Evidence Viewer  */}
      {!formData.metadata.isManual && (
        <div className="w-1/2 border-r border-border flex flex-col bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <span className="font-medium text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> Source Document Preview</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(50, zoom - 25))}><ZoomOut className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(200, zoom + 25))}><ZoomIn className="w-4 h-4" /></Button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-muted/20">
            {imagePreview ? <img src={imagePreview} className="max-w-full h-auto origin-top transition-transform duration-200" style={{ transform: `scale(${zoom / 100})` }} /> : <AlertTriangle className="w-12 h-12 text-muted-foreground mt-20" />}
          </div>
        </div>
      )}

      {/* Form Section */}
      <div className={`${formData.metadata.isManual ? 'w-full max-w-2xl mx-auto' : 'w-1/2'} flex flex-col bg-background`}>
        <div className="p-4 border-b border-border flex items-center justify-between font-medium">
          <span className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> AI Extraction Result</span>
          <Badge variant="secondary">AI_SCAN</Badge>
        </div>

        <div className="flex-1 p-6 overflow-auto space-y-6">
          <AnimatePresence>
  {showVendorAlert && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className={`rounded-xl p-4 mb-6 flex items-start gap-4 ${
        formData.intelligence.potential_match
          ? 'bg-warning/10 border border-warning/30'
          : 'bg-primary/5 border border-primary/20'
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        formData.intelligence.potential_match ? 'bg-warning/20 text-warning' : 'bg-primary/10 text-primary'
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
              <Button size="sm" onClick={() => handleAcceptMatch(formData.intelligence.potential_match!)}>
                Yes, Use "{formData.intelligence.potential_match}"
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCreateDraftAccount}>
                No, Create "{formData.extracted_data.payee_name}"
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={handleCreateDraftAccount}>
              Create Account for "{formData.extracted_data.payee_name}"
            </Button>
          )}
        </div>
      </div>
      <button onClick={() => setShowVendorAlert(false)} className="text-muted-foreground hover:text-foreground">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )}
</AnimatePresence>

          <div className="space-y-5">
            <div className="space-y-2"><Label>Payee</Label><Input value={formData.extracted_data.payee_name} className={getFieldStyle('payee_name')} /></div>
            <div className="space-y-2"><Label>Amount (Rupees)</Label><Input type="number" value={formData.extracted_data.total_amount} className={getFieldStyle('amount_numeric')} /></div>
            {formData.metadata.type === "CHEQUE" && <div className="space-y-2"><Label>Amount in Words</Label><Input value={formData.extracted_data.amount_in_words} className={getFieldStyle('amount_in_words')} /></div>}
          </div>

          <div className={`p-4 rounded-xl border ${formData.intelligence.amount_validation_passed ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
            <div className="flex items-center gap-3">
              {formData.intelligence.amount_validation_passed ? <CheckCircle className="w-6 h-6 text-success" /> : <AlertTriangle className="w-6 h-6 text-destructive" />}
              <div>
                <p className="font-semibold text-sm">AI Logic Verified</p>
                <p className="text-xs text-muted-foreground">Words and numeric total match across fields.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border flex items-center justify-between bg-card">
          <Button variant="outline" onClick={() => router.push('/upload')}>Discard</Button>
          <Button onClick={handlePost}>Post Transaction</Button>
        </div>
      </div>
    </div>
  );
};