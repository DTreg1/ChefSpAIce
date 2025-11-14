/**
 * Batch Uploader Component
 * 
 * Handles multiple image uploads with batch processing capabilities.
 */

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Upload, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Download,
  FolderOpen,
  FileImage,
  Play,
  Pause
} from "lucide-react";

interface ImageFile {
  id: string;
  file: File;
  name: string;
  size: number;
  url: string;
  status: "pending" | "processing" | "completed" | "error";
  processedUrl?: string;
  error?: string;
  selected: boolean;
}

interface BatchUploaderProps {
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedFormats?: string[];
  onProcessComplete?: (files: ImageFile[]) => void;
}

export function BatchUploader({
  maxFiles = 20,
  maxFileSize = 10,
  acceptedFormats = ["image/jpeg", "image/png", "image/webp", "image/gif"],
  onProcessComplete
}: BatchUploaderProps) {
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Process single image mutation
  const processImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      
      return apiRequest("/api/images/batch", "POST", formData);
    }
  });

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: FileList) => {
    const newFiles: ImageFile[] = [];
    let rejectedCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      // Check file count
      if (files.length + newFiles.length >= maxFiles) {
        rejectedCount++;
        continue;
      }

      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        rejectedCount++;
        continue;
      }

      // Check file type
      if (!acceptedFormats.includes(file.type)) {
        rejectedCount++;
        continue;
      }

      // Add file
      newFiles.push({
        id: `${Date.now()}_${i}`,
        file,
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
        status: "pending",
        selected: false
      });
    }

    if (rejectedCount > 0) {
      toast({
        title: "Some files rejected",
        description: `${rejectedCount} file(s) were rejected due to size or format restrictions`,
        variant: "destructive"
      });
    }

    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length, maxFiles, maxFileSize, acceptedFormats, toast]);

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    dropZoneRef.current?.classList.add("border-primary");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove("border-primary");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove("border-primary");
    handleFileSelect(e.dataTransfer.files);
  };

  // Remove file
  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.url) URL.revokeObjectURL(file.url);
      return prev.filter(f => f.id !== id);
    });
  };

  // Toggle file selection
  const toggleFileSelection = (id: string) => {
    setFiles(prev => 
      prev.map(f => 
        f.id === id ? { ...f, selected: !f.selected } : f
      )
    );
  };

  // Select all files
  const selectAll = (selected: boolean) => {
    setFiles(prev => prev.map(f => ({ ...f, selected })));
  };

  // Process selected files
  const processSelectedFiles = async () => {
    const selectedFiles = files.filter(f => f.selected && f.status === "pending");
    
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to process",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setIsPaused(false);
    setCurrentIndex(0);

    for (let i = 0; i < selectedFiles.length; i++) {
      if (isPaused) break;
      
      const file = selectedFiles[i];
      setCurrentIndex(i);
      
      // Update file status to processing
      setFiles(prev => 
        prev.map(f => 
          f.id === file.id ? { ...f, status: "processing" } : f
        )
      );

      try {
        const result = await processImageMutation.mutateAsync(file.file);
        
        // Update file with processed URL
        setFiles(prev => 
          prev.map(f => 
            f.id === file.id 
              ? { ...f, status: "completed", processedUrl: result.processedUrl } 
              : f
          )
        );
      } catch (error: any) {
        // Update file with error
        setFiles(prev => 
          prev.map(f => 
            f.id === file.id 
              ? { ...f, status: "error", error: error.message } 
              : f
          )
        );
      }
    }

    setIsProcessing(false);
    
    // Call completion callback
    if (onProcessComplete) {
      onProcessComplete(files.filter(f => f.status === "completed"));
    }

    toast({
      title: "Batch processing complete",
      description: `Processed ${selectedFiles.length} image(s)`
    });
  };

  // Calculate statistics
  const stats = {
    total: files.length,
    pending: files.filter(f => f.status === "pending").length,
    processing: files.filter(f => f.status === "processing").length,
    completed: files.filter(f => f.status === "completed").length,
    error: files.filter(f => f.status === "error").length,
    selected: files.filter(f => f.selected).length
  };

  const progress = stats.total > 0 
    ? ((stats.completed + stats.error) / stats.total) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch Image Processor</CardTitle>
        <CardDescription>
          Upload and process multiple images at once
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Drop Zone */}
        {files.length < maxFiles && (
          <div
            ref={dropZoneRef}
            className="border-2 border-dashed rounded-lg p-8 text-center transition-colors"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            data-testid="drop-zone"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptedFormats.join(",")}
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              className="hidden"
              data-testid="file-input-batch"
            />
            
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="mb-2"
              data-testid="upload-batch-button"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Select Images
            </Button>
            
            <p className="text-sm text-muted-foreground">
              or drag and drop up to {maxFiles} images here
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Max {maxFileSize}MB per file • {acceptedFormats.map(f => f.split("/")[1].toUpperCase()).join(", ")}
            </p>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <>
            {/* Statistics */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{stats.total} files</Badge>
                {stats.pending > 0 && (
                  <Badge variant="secondary">{stats.pending} pending</Badge>
                )}
                {stats.completed > 0 && (
                  <Badge variant="default">{stats.completed} completed</Badge>
                )}
                {stats.error > 0 && (
                  <Badge variant="destructive">{stats.error} failed</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={stats.selected === files.length}
                  onCheckedChange={(checked) => selectAll(!!checked)}
                  data-testid="select-all"
                />
                <Label className="text-sm">Select All</Label>
              </div>
            </div>

            {/* Progress Bar */}
            {isProcessing && (
              <div className="mb-4">
                <Progress value={progress} className="mb-2" />
                <p className="text-xs text-center text-muted-foreground">
                  Processing file {currentIndex + 1} of {stats.selected}
                </p>
              </div>
            )}

            {/* File Grid */}
            <ScrollArea className="h-96 rounded-lg border p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {files.map(file => (
                  <div
                    key={file.id}
                    className="relative group rounded-lg border p-2 hover-elevate"
                    data-testid={`file-item-${file.id}`}
                  >
                    {/* Selection Checkbox */}
                    <Checkbox
                      checked={file.selected}
                      onCheckedChange={() => toggleFileSelection(file.id)}
                      className="absolute top-2 left-2 z-10"
                      data-testid={`select-${file.id}`}
                    />
                    
                    {/* Remove Button */}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 z-10 h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => removeFile(file.id)}
                      data-testid={`remove-${file.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    
                    {/* Image Preview */}
                    <div className="aspect-square rounded overflow-hidden bg-muted mb-2">
                      <img
                        src={file.processedUrl || file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Status Overlay */}
                      {file.status === "processing" && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      )}
                      
                      {file.status === "completed" && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        </div>
                      )}
                      
                      {file.status === "error" && (
                        <div className="absolute top-2 right-2">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        </div>
                      )}
                    </div>
                    
                    {/* File Info */}
                    <p className="text-xs font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    
                    {/* Download Button (if processed) */}
                    {file.processedUrl && (
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="w-full mt-1"
                      >
                        <a href={file.processedUrl} download>
                          <Download className="h-3 w-3 mr-1" />
                          Download
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-4">
              <Button
                variant="outline"
                onClick={() => setFiles([])}
                disabled={isProcessing}
                data-testid="clear-all"
              >
                Clear All
              </Button>
              
              <div className="flex gap-2">
                {isProcessing && (
                  <Button
                    variant="outline"
                    onClick={() => setIsPaused(!isPaused)}
                    data-testid="pause-resume"
                  >
                    {isPaused ? (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </>
                    )}
                  </Button>
                )}
                
                <Button
                  onClick={processSelectedFiles}
                  disabled={isProcessing || stats.selected === 0}
                  data-testid="process-batch"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileImage className="h-4 w-4 mr-2" />
                      Process {stats.selected} Image(s)
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}