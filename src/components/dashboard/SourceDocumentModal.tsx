"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink } from "lucide-react";

interface SourceDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string | null;
}

export const SourceDocumentModal = ({ isOpen, onClose, fileUrl }: SourceDocumentModalProps) => {
    const isPdf = (url: string | null) => {
        return url?.toLowerCase().endsWith('.pdf');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        Source Document Evidence
                    </DialogTitle>
                </DialogHeader>
                <div className="bg-muted rounded-lg p-8 min-h-[400px] flex items-center justify-center relative overflow-hidden">
                    {fileUrl ? (
                        <div className="w-full h-full flex flex-col items-center">
                            {isPdf(fileUrl) ? (
                                <iframe
                                    src={fileUrl}
                                    className="w-full h-[60vh] rounded-md shadow-sm border"
                                    title="Document PDF Evidence"
                                />
                            ) : (
                                <img
                                    src={fileUrl}
                                    alt="Document Evidence"
                                    className="max-w-full max-h-[60vh] object-contain rounded-md shadow-sm"
                                />
                            )}

                            <div className="mt-4 flex gap-2">
                                <Button variant="outline" asChild>
                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                                        <ExternalLink className="w-4 h-4" />
                                        Open Original
                                    </a>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground">
                            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="font-medium text-lg">Manual Entry: No digital evidence attached</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
