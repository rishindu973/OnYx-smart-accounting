"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Scan, Monitor, Zap, CheckCircle2, FileText, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const mockScanners = [
  { id: "canon-lide", name: "Canon LiDE 400", status: "ready" },
  { id: "epson-es2", name: "Epson WorkForce ES-50", status: "ready" },
  { id: "brother-ads", name: "Brother ADS-2700W", status: "offline" },
  { id: "fujitsu-ix", name: "Fujitsu ScanSnap iX1600", status: "ready" },
];

const ScanDocument = () => {
  const [selectedScanner, setSelectedScanner] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const [showAIProcessing, setShowAIProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (isScanning) {
      const interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setScanComplete(true);
            setIsScanning(false);
            setTimeout(() => setShowAIProcessing(true), 500);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isScanning]);

  useEffect(() => {
    if (showAIProcessing) {
      const interval = setInterval(() => {
        setAiProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => router.push("/dashboard/transactions"), 1000);
            return 100;
          }
          return prev + 4;
        });
      }, 80);
      return () => clearInterval(interval);
    }
  }, [showAIProcessing, router]);

  const handleInitializeScan = () => {
    if (!selectedScanner) return;
    setIsScanning(true);
    setScanProgress(0);
    setScanComplete(false);
  };

  const selectedScannerInfo = mockScanners.find((s) => s.id === selectedScanner);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Document Scanner</h1>
          <p className="text-muted-foreground">
            Scan physical documents directly into the OnYx system for AI extraction
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Scanner Selection */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5 text-primary" />
                Scanner Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedScanner} onValueChange={setSelectedScanner}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select a scanner device..." />
                </SelectTrigger>
                <SelectContent>
                  {mockScanners.map((scanner) => (
                    <SelectItem
                      key={scanner.id}
                      value={scanner.id}
                      disabled={scanner.status === "offline"}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            scanner.status === "ready" ? "bg-success" : "bg-muted"
                          }`}
                        />
                        <span>{scanner.name}</span>
                        {scanner.status === "offline" && (
                          <span className="text-xs text-muted-foreground">(Offline)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedScannerInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg bg-secondary/50 space-y-2"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="font-medium">{selectedScannerInfo.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ready to scan • 300 DPI Color • Auto-crop enabled
                  </p>
                </motion.div>
              )}

              <Button
                onClick={handleInitializeScan}
                disabled={!selectedScanner || isScanning || showAIProcessing}
                className="w-full gap-2"
                size="lg"
              >
                <Scan className="w-5 h-5" />
                Initialize Scan
              </Button>
            </CardContent>
          </Card>

          {/* Scan Preview */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Document Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-[4/3] bg-secondary/50 rounded-lg overflow-hidden border-2 border-dashed border-border flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {!isScanning && !scanComplete && (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center text-muted-foreground"
                    >
                      <Scan className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Waiting for scan...</p>
                    </motion.div>
                  )}

                  {isScanning && (
                    <motion.div
                      key="scanning"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0"
                    >
                      {/* Simulated scan line */}
                      <motion.div
                        className="absolute left-0 right-0 h-1 bg-gradient-to-b from-primary to-transparent"
                        style={{ top: `${scanProgress}%` }}
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      />
                      
                      {/* Partial document reveal */}
                      <div
                        className="absolute inset-x-4 top-4 bg-card rounded-lg shadow-lg overflow-hidden"
                        style={{ height: `${scanProgress * 0.8}%` }}
                      >
                        <div className="p-4 space-y-2">
                          <div className="h-4 bg-muted rounded w-1/2" />
                          <div className="h-3 bg-muted/50 rounded w-3/4" />
                          <div className="h-3 bg-muted/50 rounded w-2/3" />
                          <div className="mt-4 h-20 bg-muted/30 rounded" />
                        </div>
                      </div>

                      <div className="absolute bottom-4 left-4 right-4">
                        <Progress value={scanProgress} className="h-2" />
                        <p className="text-xs text-center mt-2 text-muted-foreground">
                          Scanning... {scanProgress}%
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {scanComplete && !showAIProcessing && (
                    <motion.div
                      key="complete"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-4 bg-card rounded-lg shadow-lg p-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-medium">Scan Complete</span>
                        </div>
                        <div className="h-4 bg-muted rounded w-1/2" />
                        <div className="h-3 bg-muted/50 rounded w-3/4" />
                        <div className="h-3 bg-muted/50 rounded w-2/3" />
                        <div className="mt-4 h-20 bg-muted/30 rounded flex items-center justify-center">
                          <span className="text-2xl font-bold text-muted-foreground">$4,250.00</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Processing Overlay */}
        <AnimatePresence>
          {showAIProcessing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/90 backdrop-blur-xl z-50 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-card rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-border"
              >
                <div className="text-center mb-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center"
                  >
                    <Zap className="w-8 h-8 text-primary" />
                  </motion.div>
                  <h3 className="text-xl font-bold mb-2">AI Processing Document</h3>
                  <p className="text-muted-foreground text-sm">
                    Extracting fields with confidence analysis...
                  </p>
                </div>

                <div className="space-y-4">
                  <Progress value={aiProgress} className="h-3" />
                  
                  {/* Confidence Heatmap Preview */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: aiProgress > 20 ? 1 : 0.3, x: 0 }}
                      className="p-3 rounded-lg bg-success/20 border border-success/30"
                    >
                      <div className="font-medium text-success">Payee</div>
                      <div className="text-muted-foreground">98% confidence</div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: aiProgress > 40 ? 1 : 0.3, x: 0 }}
                      className="p-3 rounded-lg bg-success/20 border border-success/30"
                    >
                      <div className="font-medium text-success">Date</div>
                      <div className="text-muted-foreground">96% confidence</div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: aiProgress > 60 ? 1 : 0.3, x: 0 }}
                      className="p-3 rounded-lg bg-success/20 border border-success/30"
                    >
                      <div className="font-medium text-success">Amount</div>
                      <div className="text-muted-foreground">99% confidence</div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: aiProgress > 80 ? 1 : 0.3, x: 0 }}
                      className="p-3 rounded-lg bg-warning/20 border border-warning/30"
                    >
                      <div className="font-medium text-warning">Vendor</div>
                      <div className="text-muted-foreground">87% confidence</div>
                    </motion.div>
                  </div>

                  {aiProgress >= 100 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-center gap-2 text-success font-medium"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Processing complete! Redirecting...
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ScanDocument;
