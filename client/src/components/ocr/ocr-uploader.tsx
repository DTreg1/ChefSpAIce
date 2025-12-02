/**
 * OCR Uploader Component
 *
 * Handles file uploads for OCR processing with drag-and-drop support
 * and image preview capabilities.
 */

import { useState, useRef, useCallback } from "react";
import { Upload, FileImage, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface OCRUploaderProps {
  onFileSelect: (file: File) => void;
  acceptedFormats?: string[];
  maxSizeInMB?: number;
  className?: string;
}

export function OCRUploader({
  onFileSelect,
  acceptedFormats = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/tiff",
    "image/bmp",
    "application/pdf",
  ],
  maxSizeInMB = 20,
  className,
}: OCRUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = useCallback(
    (file: File): boolean => {
      // Check file type
      if (!acceptedFormats.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description:
            "Please upload an image (JPEG, PNG, WebP, TIFF, BMP) or PDF file",
          variant: "destructive",
        });
        return false;
      }

      // Check file size
      const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        toast({
          title: "File too large",
          description: `File size must be less than ${maxSizeInMB}MB`,
          variant: "destructive",
        });
        return false;
      }

      return true;
    },
    [acceptedFormats, maxSizeInMB, toast],
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      if (validateFile(file)) {
        setSelectedFile(file);

        // Create preview for images
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          setPreviewUrl(null);
        }

        onFileSelect(file);
      }
    },
    [validateFile, onFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect],
  );

  const clearSelection = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <Card
      className={cn(
        "border-2 border-dashed p-8 transition-colors",
        isDragging && "border-primary bg-primary/5",
        className,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid="ocr-uploader"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(",")}
        onChange={handleFileInputChange}
        className="hidden"
        data-testid="file-input"
      />

      {selectedFile ? (
        <div className="space-y-4">
          {previewUrl ? (
            <div className="relative mx-auto max-w-sm">
              <img
                src={previewUrl}
                alt="Preview"
                className="rounded-lg border shadow-sm"
                data-testid="image-preview"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute -right-2 -top-2"
                onClick={clearSelection}
                data-testid="button-clear"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="relative flex items-center justify-center gap-4 rounded-lg border bg-muted p-8">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <div className="text-left">
                <p className="font-medium" data-testid="text-filename">
                  {selectedFile.name}
                </p>
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="text-filesize"
                >
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute -right-2 -top-2"
                onClick={clearSelection}
                data-testid="button-clear-pdf"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="w-full"
            data-testid="button-change-file"
          >
            Change File
          </Button>
        </div>
      ) : (
        <div
          className="cursor-pointer text-center"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">
            Drop your image or PDF here
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            or click to browse files
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports JPEG, PNG, WebP, TIFF, BMP, and PDF (up to {maxSizeInMB}MB)
          </p>
        </div>
      )}
    </Card>
  );
}
