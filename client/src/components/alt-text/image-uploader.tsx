/**
 * Image Uploader Component
 * 
 * Provides drag-and-drop or click-to-upload functionality for images
 * with automatic alt text generation using GPT-4 Vision.
 */

import { useState, useRef } from "react";
import { Upload, Image as ImageIcon, Loader2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { ImageMetadata } from "@shared/schema";

interface ImageUploaderProps {
  onImageUploaded?: (image: ImageMetadata) => void;
  context?: string;
}

export function ImageUploader({ onImageUploaded, context }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageTitle, setImageTitle] = useState("");
  const [imageContext, setImageContext] = useState(context || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Generate alt text mutation
  const generateAltTextMutation = useMutation({
    mutationFn: async (data: { imageUrl: string; context?: string }) => {
      const res = await apiRequest("POST", "/api/images/alt-text", data);
      return res.json();
    },
    onSuccess: (response) => {
      toast({
        title: "Success",
        description: `Alt text generated: "${response.data?.altText}"`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      if (onImageUploaded && response.data?.imageId) {
        onImageUploaded(response.data);
      }
    },
    onError: (error) => {
      console.error("Failed to generate alt text:", error);
      toast({
        title: "Error",
        description: "Failed to generate alt text. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Check if decorative mutation
  const checkDecorativeMutation = useMutation({
    mutationFn: async (data: { imageUrl: string; context?: string }) => {
      const res = await apiRequest("POST", "/api/images/check-decorative", data);
      return res.json();
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith("image/"));
    
    if (imageFile) {
      await processImage(imageFile);
    } else {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive"
      });
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      await processImage(file);
    }
  };

  const processImage = async (file: File) => {
    // Create preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewUrl(dataUrl);
      
      // Here you would typically upload to cloud storage
      // For now, we'll use the data URL directly
      // In production, you'd upload to object storage and get a permanent URL
      
      // Generate alt text
      await generateAltTextMutation.mutateAsync({
        imageUrl: dataUrl,
        context: imageContext
      });

      // Check if decorative
      const decorativeResult = await checkDecorativeMutation.mutateAsync({
        imageUrl: dataUrl,
        context: imageContext
      });
      
      if (decorativeResult.data?.isDecorative) {
        toast({
          title: "Decorative Image Detected",
          description: "This image appears to be decorative and may not need alt text.",
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setPreviewUrl(null);
    setImageTitle("");
    setImageContext("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Image Upload & Alt Text Generation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Context input */}
        <div className="space-y-2">
          <Label htmlFor="context">Context (optional)</Label>
          <Textarea
            id="context"
            placeholder="Provide context about where this image will be used..."
            value={imageContext}
            onChange={(e) => setImageContext(e.target.value)}
            className="min-h-[80px]"
            data-testid="input-context"
          />
        </div>

        {/* Drop zone */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8
            transition-all duration-200 cursor-pointer
            ${isDragging 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50"
            }
            ${previewUrl ? "bg-muted/10" : ""}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          data-testid="dropzone-area"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            data-testid="input-file"
          />

          {previewUrl ? (
            <div className="relative">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="max-w-full max-h-[400px] mx-auto rounded-lg"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2"
                onClick={(e) => {
                  e.stopPropagation();
                  clearImage();
                }}
                data-testid="button-clear-image"
              >
                <X className="w-4 h-4" />
              </Button>
              
              {generateAltTextMutation.isPending && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="ml-2">Generating alt text...</span>
                </div>
              )}
              
              {generateAltTextMutation.isSuccess && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <Label className="font-semibold">Generated Alt Text:</Label>
                  <p className="mt-1 text-sm" data-testid="text-generated-alt">
                    {generateAltTextMutation.data?.data?.altText}
                  </p>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <Badge variant="secondary">
                      Confidence: {Math.round((generateAltTextMutation.data?.data?.confidence || 0) * 100)}%
                    </Badge>
                    {generateAltTextMutation.data?.data?.objectsDetected?.map((obj: string) => (
                      <Badge key={obj} variant="outline">{obj}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-1">
                Drop your image here or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Supports PNG, JPG, GIF up to 10MB
              </p>
            </div>
          )}
        </div>

        {/* Title input (optional) */}
        {previewUrl && (
          <div className="space-y-2">
            <Label htmlFor="title">Image Title (optional)</Label>
            <Input
              id="title"
              placeholder="Enter a title for this image..."
              value={imageTitle}
              onChange={(e) => setImageTitle(e.target.value)}
              data-testid="input-title"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}