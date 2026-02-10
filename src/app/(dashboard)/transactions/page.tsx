"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { UniversalDocument } from "@/types/accounting";
import { saveScannedDocument } from "@/lib/actions/documents";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, UserPlus, X } from "lucide-react";

type ExtractForm = {
  payee: string;
  date: string;
  amount: string;
  amountInWords: string;
  accountId: string;
};

export default function TransactionsPage() {
  const [scannedData, setScannedData] = useState<UniversalDocument | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [form, setForm] = useState<ExtractForm>({
    payee: "",
    date: "",
    amount: "",
    amountInWords: "",
    accountId: "",
  });

  const [showVendorAlert, setShowVendorAlert] = useState(false);

  const isScanned = Boolean(scannedData);

  // Load scanned data + image preview (if scanned)
  useEffect(() => {
    const raw = sessionStorage.getItem("last_scanned_doc");
    const savedImage = sessionStorage.getItem("last_scanned_image");

    if (savedImage) setImagePreview(savedImage);

    if (!raw) return;

    try {
      const parsed: UniversalDocument = JSON.parse(raw);
      setScannedData(parsed);

      setForm({
        payee: parsed.extracted_data?.payee_name ?? "",
        date: parsed.extracted_data?.date ?? "",
        amount:
          parsed.extracted_data?.total_amount !== undefined
            ? String(parsed.extracted_data.total_amount)
            : "",
        amountInWords: parsed.extracted_data?.amount_in_words ?? "",
        accountId: parsed.intelligence?.suggestion_account_id ?? "",
      });

      setShowVendorAlert(
        parsed.intelligence?.is_new_vendor || !!parsed.intelligence?.potential_match
      );

      // prevent repeating
      sessionStorage.removeItem("last_scanned_doc");
    } catch (e) {
      console.error("Failed to parse scanned data:", e);
    }
  }, []);

  const onChange =
    (key: keyof ExtractForm) => (e: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

  const onClearManual = () => {
    if (isScanned) return;
    setForm({ payee: "", date: "", amount: "", amountInWords: "", accountId: "" });
  };

  const numericAmount = useMemo(() => {
    const n = Number(String(form.amount).replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : NaN;
  }, [form.amount]);

  const amountsMatch = scannedData?.intelligence?.amount_validation_passed ?? true;

  // Warning behavior:
  // - scanned mode: use AI mismatch result
  // - manual mode: show warning only if user typed data but invalid/missing
  const showManualReview = useMemo(() => {
    if (isScanned) return !amountsMatch;

    const hasAny = Boolean(
      form.payee || form.date || form.amount || form.amountInWords
    );
    if (!hasAny) return false;

    if (!form.amount || Number.isNaN(numericAmount)) return true;
    if (!form.amountInWords) return true;

    return false;
  }, [isScanned, amountsMatch, form, numericAmount]);

  // Confidence badges (AI mode)
  const payeeScore = scannedData?.intelligence?.confidence_scores?.payee_name ?? 0;
  const dateScore = scannedData?.intelligence?.confidence_scores?.date ?? 0;
  const amountScore =
    scannedData?.intelligence?.confidence_scores?.amount_numeric ?? 0;
  const wordsScore =
    scannedData?.intelligence?.confidence_scores?.amount_in_words ?? 0;

  const badgeFor = (score: number) => {
    if (score >= 0.95)
      return {
        label: "Verified",
        cls: "bg-emerald-600/20 text-emerald-300 border-emerald-600/30",
      };
    if (score >= 0.8)
      return {
        label: "Review",
        cls: "bg-yellow-600/20 text-yellow-300 border-yellow-600/30",
      };
    return {
      label: "Low",
      cls: "bg-red-600/20 text-red-300 border-red-600/30",
    };
  };

  const payeeBadge = isScanned ? badgeFor(payeeScore) : null;
  const dateBadge = isScanned ? badgeFor(dateScore) : null;
  const amountBadge = isScanned ? badgeFor(amountScore) : null;
  const wordsBadge = isScanned ? badgeFor(wordsScore) : null;

  // ✅ AI POST HANDLER
  const handlePost = async () => {
    if (!scannedData) return;
    const activeCompanyId = "clx-onyx-001";

    // Merge manual edits into the AI data
    const finalDoc = {
      ...scannedData,
      extracted_data: {
        ...scannedData.extracted_data,
        payee_name: form.payee,
        date: form.date,
        total_amount: Number(form.amount || 0),
        amount_in_words: form.amountInWords,
      },
      intelligence: {
        ...scannedData.intelligence,
        suggestion_account_id: form.accountId,
      }
    };

    const result = await saveScannedDocument(finalDoc, activeCompanyId);
    if (result.success) {
      alert("Transaction Posted Successfully! ✅");
      setScannedData(null);
      setForm({ payee: "", date: "", amount: "", amountInWords: "", accountId: "" });
      // clear session
      sessionStorage.removeItem("last_scanned_doc");
      sessionStorage.removeItem("last_scanned_image");
    } else {
      alert("Save failed. Check console.");
    }
  };

  // ✅ MANUAL SAVE HANDLER
  const handleManualSave = async () => {
    const activeCompanyId = "clx-onyx-001"; // (replace later with auth-based company)

    // Validate Valid Date
    let validDate = form.date;
    if (!validDate || isNaN(Date.parse(validDate))) {
      validDate = new Date().toISOString().split('T')[0]; // Fallback to Today
    }

    const manualDoc: UniversalDocument = {
      metadata: {
        type: "CHEQUE",
        source: "USER_INPUT",
        isManual: true,
      },
      extracted_data: {
        date: validDate,
        payee_name: form.payee,
        total_amount: Number(form.amount || 0),
        amount_in_words: form.amountInWords,
        currency: "LKR",
      },
      intelligence: {
        confidence_scores: {
          date: 1,
          payee_name: 1,
          amount_numeric: 1,
          amount_in_words: 1,
          bank_name: 0,
          currency: 1,
          endorsement: 0,
        },
        amount_validation_passed: true,
        suggestion_account_id: form.accountId || null,
        is_new_vendor: false,
      },
    };

    const result = await saveScannedDocument(manualDoc, activeCompanyId);

    if (result.success) {
      alert("Manual transaction saved to database ✅");
      setForm({ payee: "", date: "", amount: "", amountInWords: "", accountId: "" });
    } else {
      alert("Save failed ❌");
      console.error("Save failed:", result);
    }
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT SIDE */}
        <div className="lg:col-span-8">
          {isScanned ? (
            <div className="rounded-2xl border bg-background/50 p-6 shadow-xl shadow-black/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Source Document Preview</h2>
                <span className="text-sm text-muted-foreground">100%</span>
              </div>

              <div className="rounded-xl border bg-black/10 p-4">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Scanned cheque preview"
                    className="w-full rounded-xl border object-contain bg-black/20 shadow-lg"
                  />
                ) : (
                  <div className="rounded-xl border p-10 text-sm text-muted-foreground text-center">
                    No image preview available for this session.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border bg-background/50 p-6 shadow-xl shadow-black/30">
              <h1 className="text-2xl font-bold mb-2">Transactions</h1>
              <p className="text-muted-foreground">No recent scans to review.</p>
              {/* Your transactions table can go here */}
            </div>
          )}
        </div>

        {/* RIGHT SIDE: SINGLE TABLE */}
        <aside className="lg:col-span-4">
          <div className="rounded-2xl border bg-background/50 p-6 shadow-xl shadow-black/30">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {isScanned ? "AI Extraction Result" : "User Extraction Result"}
              </h2>

              <button
                type="button"
                className="rounded-full border px-3 py-1 text-sm hover:bg-accent transition"
                onClick={() => console.log("New Vendor clicked")}
              >
                New Vendor
              </button>
            </div>

            {/* Vendor Alert */}
            <AnimatePresence>
              {showVendorAlert && scannedData && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`rounded-xl p-4 mb-6 flex items-start gap-4 ${scannedData.intelligence.potential_match
                    ? 'bg-yellow-500/10 border border-yellow-500/30'
                    : 'bg-blue-500/5 border border-blue-500/20'
                    }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${scannedData.intelligence.potential_match ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-500/10 text-blue-500'
                    }`}>
                    {scannedData.intelligence.potential_match ? <Sparkles className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">
                      {scannedData.intelligence.potential_match ? "Potential Vendor Match" : "New Vendor Detected"}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      {scannedData.intelligence.potential_match
                        ? <span>Did you mean <strong>"{scannedData.intelligence.potential_match}"</strong>? We found a similar known vendor.</span>
                        : `"${form.payee}" is not in your vendor list.`
                      }
                    </p>
                    <div className="flex gap-2">
                      {scannedData.intelligence.potential_match ? (
                        <>
                          <button
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                            onClick={() => {
                              setForm(prev => ({ ...prev, payee: scannedData.intelligence.potential_match! }));
                              setShowVendorAlert(false);
                            }}
                          >
                            Yes, Use "{scannedData.intelligence.potential_match}"
                          </button>
                          <button
                            className="rounded-lg border px-3 py-1.5 text-xs hover:bg-accent"
                            onClick={() => {
                              // Logic to create draft account would go here
                              setForm(prev => ({ ...prev, accountId: "DRAFT_ACC_PENDING" }));
                              setShowVendorAlert(false);
                            }}
                          >
                            No, Create New
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                            onClick={() => {
                              setForm(prev => ({ ...prev, accountId: "DRAFT_ACC_PENDING" }));
                              setShowVendorAlert(false);
                            }}
                          >
                            Create Account
                          </button>
                          <button
                            className="rounded-lg border px-3 py-1.5 text-xs hover:bg-accent"
                            onClick={() => setShowVendorAlert(false)}
                          >
                            Dismiss
                          </button>
                        </>
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


              {/* Payee */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Payee</label>
                  {isScanned ? (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold border ${payeeBadge!.cls}`}
                    >
                      {payeeBadge!.label}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Manual</span>
                  )}
                </div>

                <input
                  value={form.payee}
                  onChange={onChange("payee")}
                  readOnly={false}
                  placeholder={isScanned ? "" : "Enter payee name"}
                  className={[
                    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-ring transition",
                    "shadow-inner shadow-black/20",
                    isScanned && payeeBadge?.label === "Low"
                      ? "border-red-600/40 bg-red-950/20"
                      : "",
                  ].join(" ")}
                />
              </div>

              {/* Date */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Date</label>
                  {isScanned ? (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold border ${dateBadge!.cls}`}
                    >
                      {dateBadge!.label}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Manual</span>
                  )}
                </div>

                <input
                  type={isScanned ? "text" : "date"}
                  value={form.date}
                  onChange={onChange("date")}
                  readOnly={false}
                  className={[
                    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-ring transition",
                    "shadow-inner shadow-black/20",
                  ].join(" ")}
                />
              </div>

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Amount (Rupees)</label>
                  {isScanned ? (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold border ${amountBadge!.cls}`}
                    >
                      {amountBadge!.label}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Manual</span>
                  )}
                </div>

                <input
                  inputMode="decimal"
                  value={form.amount}
                  onChange={onChange("amount")}
                  readOnly={false}
                  placeholder={isScanned ? "" : "e.g. 4500"}
                  className={[
                    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-ring transition",
                    "shadow-inner shadow-black/20",
                  ].join(" ")}
                />
              </div>

              {/* Amount in Words */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Amount in Words</label>
                  {isScanned ? (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold border ${wordsBadge!.cls}`}
                    >
                      {wordsBadge!.label}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Manual</span>
                  )}
                </div>

                <input
                  value={form.amountInWords}
                  onChange={onChange("amountInWords")}
                  readOnly={false}
                  placeholder={
                    isScanned ? "" : "e.g. Four Thousand Five Hundred only"
                  }
                  className={[
                    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-ring transition",
                    "shadow-inner shadow-black/20",
                  ].join(" ")}
                />
              </div>

              {/* Warning Box */}
              <div
                className={[
                  "rounded-xl border p-4 shadow-lg shadow-black/20",
                  showManualReview
                    ? "border-red-600/40 bg-red-950/20"
                    : "border-muted bg-background/30",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 text-red-400" aria-hidden>
                    ⚠️
                  </div>
                  <div>
                    <h3
                      className={[
                        "font-semibold",
                        showManualReview ? "text-red-300" : "",
                      ].join(" ")}
                    >
                      Manual Review Suggested
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Alert: AI could not mathematically link{" "}
                      <span className="text-foreground">
                        "{form.amountInWords || "—"}"
                      </span>{" "}
                      to the numeric amount.
                    </p>
                  </div>
                </div>
              </div>

              {/* Manual save buttons */}
              {!isScanned && (
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClearManual}
                    className="rounded-xl border px-4 py-2 text-sm hover:bg-accent transition"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 transition shadow-lg shadow-black/30"
                    onClick={handleManualSave}
                  >
                    Save
                  </button>
                </div>
              )}

              {/* AI save happens in ReviewWorkspace via "Post Transaction" */}
              {isScanned && (
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setScannedData(null);
                      setForm({ payee: "", date: "", amount: "", amountInWords: "", accountId: "" });
                      sessionStorage.removeItem("last_scanned_doc");
                      setImagePreview(null);
                    }}
                    className="rounded-xl border px-4 py-2 text-sm hover:bg-accent transition"
                  >
                    Discard
                  </button>

                  <button
                    type="button"
                    className="flex-1 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 transition shadow-lg shadow-black/30"
                    onClick={handlePost}
                  >
                    Post Transaction
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
