
"use client";
import { useEffect, useState } from "react";
import ReviewWorkspace from "@/components/dashboard/ReviewWorkspace";
import { UniversalDocument } from "@/types/accounting";

export default function TransactionsPage() {
  const [scannedData, setScannedData] = useState<UniversalDocument | null>(null);

  useEffect(() => {
    // Retrieve verified data from session storage
    const rawData = sessionStorage.getItem("last_scanned_doc");
    if (rawData) {
      try {
        setScannedData(JSON.parse(rawData));
        // Clear it so it doesn't reappear on subsequent visits
        sessionStorage.removeItem("last_scanned_doc");
      } catch (e) {
        console.error("Failed to parse scanned data:", e);
      }
    }
  }, []);

  return (
    <div className="p-6">
      {scannedData ? (
        <ReviewWorkspace data={scannedData} />
      ) : (
        <div>
          <h1 className="text-2xl font-bold mb-4">Transactions </h1>
          <p className="text-muted-foreground">No recent scans to review.</p>
          {/* Your standard transactions table component would go here */}
        </div>
      )}
    </div>
  );
}