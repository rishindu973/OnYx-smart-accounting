"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { UniversalDocument } from "@/types/accounting";
import { saveScannedDocument } from "@/lib/actions/documents";

type ExtractForm = {
  payee: string;
  date: string;
  amount: string;
  amountInWords: string;
};

export default function TransactionsPage() {
  const [scannedData, setScannedData] = useState<UniversalDocument | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [form, setForm] = useState<ExtractForm>({
    payee: "",
    date: "",
    amount: "",
    amountInWords: "",
  });

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
      });

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
    setForm({ payee: "", date: "", amount: "", amountInWords: "" });
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
  const payeeScore = scannedData?.intelligence?.confidence_score?.payee_name ?? 0;
  const dateScore = scannedData?.intelligence?.confidence_score?.date ?? 0;
  const amountScore =
    scannedData?.intelligence?.confidence_score?.amount_numeric ?? 0;
  const wordsScore =
    scannedData?.intelligence?.confidence_score?.amount_in_words ?? 0;

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

  // ✅ MANUAL SAVE HANDLER
  const handleManualSave = async () => {
    const activeCompanyId = "clx-onyx-001"; // (replace later with auth-based company)

    const manualDoc: UniversalDocument = {
      metadata: {
        type: "CHEQUE",
        source: "USER_INPUT",
        isManual: true,
      },
      extracted_data: {
        date: form.date,
        payee_name: form.payee,
        total_amount: Number(form.amount || 0),
        amount_in_words: form.amountInWords,
        currency: "LKR",
      },
      intelligence: {
        confidence_score: {
          date: 1,
          payee_name: 1,
          amount_numeric: 1,
          amount_in_words: 1,
          bank_name: 0,
          currency: 1,
          endorsement: 0,
        },
        amount_validation_passed: true,
        suggestion_account_id: null,
        is_new_vendor: false,
      },
    };

    const result = await saveScannedDocument(manualDoc, activeCompanyId);

    if (result.success) {
      alert("Manual transaction saved to database ✅");
      setForm({ payee: "", date: "", amount: "", amountInWords: "" });
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
                  readOnly={isScanned}
                  placeholder={isScanned ? "" : "Enter payee name"}
                  className={[
                    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-ring transition",
                    "shadow-inner shadow-black/20",
                    isScanned ? "cursor-not-allowed opacity-95" : "",
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
                  readOnly={isScanned}
                  className={[
                    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-ring transition",
                    "shadow-inner shadow-black/20",
                    isScanned ? "cursor-not-allowed opacity-95" : "",
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
                  readOnly={isScanned}
                  placeholder={isScanned ? "" : "e.g. 4500"}
                  className={[
                    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-ring transition",
                    "shadow-inner shadow-black/20",
                    isScanned ? "cursor-not-allowed opacity-95" : "",
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
                  readOnly={isScanned}
                  placeholder={
                    isScanned ? "" : "e.g. Four Thousand Five Hundred only"
                  }
                  className={[
                    "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none",
                    "focus:ring-2 focus:ring-ring transition",
                    "shadow-inner shadow-black/20",
                    isScanned ? "cursor-not-allowed opacity-95" : "",
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
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

