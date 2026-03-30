"use client";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  FileText,
  Image,
  File,
  X,
  CheckCircle2,
  Zap,
  AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";

interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "complete" | "error";
}

const UploadFiles = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [showAIProcessing, setShowAIProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [selectedFileForProcessing, setSelectedFileForProcessing] = useState<UploadedFile | null>(null);
  const router = useRouter();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: "uploading" as const,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "application/pdf": [".pdf"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  // Simulate upload progress
  useEffect(() => {
    const uploading = files.filter((f) => f.status === "uploading");
    if (uploading.length === 0) return;

    const interval = setInterval(() => {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.status === "uploading") {
            const newProgress = Math.min(f.progress + Math.random() * 15, 100);
            return {
              ...f,
              progress: newProgress,
              status: newProgress >= 100 ? "complete" : "uploading",
            };
          }
          return f;
        })
      );
    }, 200);

    return () => clearInterval(interval);
  }, [files]);



  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };
  const [ocrResult, setOcrResult] = useState<any>(null);
  const processFile = async (uploadedFile: UploadedFile) => {
    setSelectedFileForProcessing(uploadedFile);
    setShowAIProcessing(true);
    setAiProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", uploadedFile.file);
      const permanentUrl = `https://onyx-vault.storage.com/files/${uploadedFile.id}-${uploadedFile.file.name}`;

      // Call verified backend route
      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("OCR Processing failed");

      const result = await response.json();
      const previewUrl = URL.createObjectURL(uploadedFile.file);
      setOcrResult(result); // Store the UniversalDocument

      // Finish the progress bar smoothly
      setAiProgress(100);


      //Redirect to the transaction review page with the data
      sessionStorage.setItem("last_scanned_doc", JSON.stringify(result));
      sessionStorage.setItem("last_scanned_image", previewUrl);
      sessionStorage.setItem("last_scanned_image_permanent", permanentUrl);
      setTimeout(() => router.push("/transactions"), 1500);

    } catch (error) {
      console.error("Onyx OCR Error:", error);
      setShowAIProcessing(false);

    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return Image;
    if (type === "application/pdf") return FileText;
    return File;
  };

  const completedFiles = files.filter((f) => f.status === "complete");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload Documents</h1>
          <p className="text-muted-foreground">
            Drag and drop files or click to upload invoices, cheques, and receipts
          </p>
        </div>

        {/* Dropzone */}
        <Card className="glass-card mb-6">
          <CardContent className="p-0">
            <div
              {...getRootProps()}
              className={`relative p-12 border-2 border-dashed rounded-xl transition-all cursor-pointer ${isDragActive
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-secondary/50"
                }`}
            >
              <input {...getInputProps()} />
              <div className="text-center">
                <motion.div
                  animate={isDragActive ? { scale: 1.1, y: -10 } : { scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center"
                >
                  <Upload className="w-8 h-8 text-primary" />
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">
                  {isDragActive ? "Drop files here" : "Drag & drop files here"}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  or click to browse your computer
                </p>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Image className="w-4 h-4" /> PNG, JPG
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" /> PDF
                  </span>
                  <span>Max 10MB</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File List */}
        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Uploaded Files ({files.length})</span>
                    {completedFiles.length > 0 && (
                      <Button
                        onClick={() => processFile(completedFiles[0])}
                        size="sm"
                        className="gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Process with AI
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {files.map((uploadedFile) => {
                    const FileIcon = getFileIcon(uploadedFile.file.type);
                    return (
                      <motion.div
                        key={uploadedFile.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50"
                      >
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <FileIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{uploadedFile.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(uploadedFile.file.size / 1024).toFixed(1)} KB
                          </p>
                          {uploadedFile.status === "uploading" && (
                            <Progress value={uploadedFile.progress} className="h-1 mt-2" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {uploadedFile.status === "complete" && (
                            <CheckCircle2 className="w-5 h-5 text-success" />
                          )}
                          {uploadedFile.status === "error" && (
                            <AlertCircle className="w-5 h-5 text-destructive" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeFile(uploadedFile.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

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
                  <h3 className="text-xl font-bold mb-2">Onyx AI Processing</h3>
                  <p className="text-muted-foreground text-sm truncate">
                    {selectedFileForProcessing?.file.name}
                  </p>
                </div>

                <div className="space-y-6">
                  <Progress value={aiProgress} className="h-3" />

                  {/* Dynamic Confidence Heatmap */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <motion.div
                      className={`p-3 rounded-lg border ${(ocrResult?.intelligence?.confidence_scores?.payee_name ?? 0) >= 0.95 ||
                          ((ocrResult?.intelligence?.confidence_scores?.payee_name ?? 0) === 0 && ocrResult?.extracted_data.payee_name !== "Review Required")
                          ? "bg-success/20 border-success/30"
                          : "bg-warning/20 border-warning/30"
                        }`}
                    >
                      <div className="font-medium text-success">Payee Name</div>
                      <div className="text-muted-foreground">
                        {ocrResult ? `${((ocrResult.intelligence?.confidence_scores?.payee_name ?? 0) * 100).toFixed(0)}%` : "Scanning..."}
                      </div>
                    </motion.div>

                    <motion.div
                      className={`p-3 rounded-lg border ${(ocrResult?.intelligence?.confidence_scores?.amount_numeric ?? 0) >= 0.95
                          ? "bg-success/20 border-success/30"
                          : "bg-destructive/20 border-destructive/30"
                        }`}
                    >
                      <div className="font-medium text-success">Amount</div>
                      <div className="text-muted-foreground">
                        {ocrResult ? `${((ocrResult.intelligence?.confidence_scores?.amount_numeric ?? 0) * 100).toFixed(0)}%` : "Validating..."}
                      </div>
                    </motion.div>

                    <motion.div
                      className={`p-3 rounded-lg border ${(ocrResult?.intelligence?.confidence_scores?.date ?? 0) >= 0.95
                          ? "bg-success/20 border-success/30"
                          : "bg-warning/20 border-warning/30"
                        }`}
                    >
                      <div className="font-medium text-success">Date</div>
                      <div className="text-muted-foreground">
                        {ocrResult ? `${((ocrResult.intelligence?.confidence_scores?.date ?? 0) * 100).toFixed(0)}%` : "Parsing..."}
                      </div>
                    </motion.div>

                    <motion.div
                      className={`p-3 rounded-lg border ${ocrResult?.intelligence.amount_validation_passed
                          ? "bg-success/20 border-success/30"
                          : "bg-destructive/20 border-destructive/30"
                        }`}
                    >
                      <div className="font-medium text-success">Logic Check</div>
                      <div className="text-muted-foreground font-bold">
                        {ocrResult ? (ocrResult.intelligence.amount_validation_passed ? "VERIFIED" : "MISMATCH") : "Checking..."}
                      </div>
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

export default UploadFiles;
