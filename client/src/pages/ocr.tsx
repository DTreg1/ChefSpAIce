/**
 * OCR Page
 * 
 * Main page for OCR functionality with text extraction from images and PDFs
 */

import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { 
  OCRUploader, 
  ExtractedText, 
  HighlightedRegions, 
  LanguageSelector, 
  CopyButton 
} from "@/components/ocr";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Upload, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Sparkles,
  Download,
  History,
  Settings,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import Tesseract from 'tesseract.js';
import type { OcrResult, OcrCorrection } from "@shared/schema";

// Receipt parsing utility
function parseReceipt(text: string): any {
  const lines = text.split('\n').filter(line => line.trim());
  const items: { name: string; price: string }[] = [];
  let total = '';
  let tax = '';
  let storeName = '';
  
  // Try to identify store name (usually in first few lines)
  if (lines.length > 0) {
    storeName = lines[0].trim();
  }
  
  // Parse items and prices
  lines.forEach((line, index) => {
    // Look for price patterns (e.g., $12.99, 12.99)
    const priceMatch = line.match(/\$?(\d+\.?\d*)/g);
    
    // Check for total line
    if (line.toLowerCase().includes('total') && priceMatch) {
      total = priceMatch[priceMatch.length - 1];
    }
    // Check for tax line
    else if (line.toLowerCase().includes('tax') && priceMatch) {
      tax = priceMatch[priceMatch.length - 1];
    }
    // Regular item line
    else if (priceMatch && priceMatch.length > 0) {
      const price = priceMatch[priceMatch.length - 1];
      const itemName = line.replace(/\$?\d+\.?\d*/g, '').trim();
      if (itemName) {
        items.push({ name: itemName, price });
      }
    }
  });
  
  return {
    storeName,
    items,
    tax,
    total,
    rawText: text
  };
}

export default function OCRPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("eng");
  const [extractedText, setExtractedText] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [boundingBoxes, setBoundingBoxes] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [structuredData, setStructuredData] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<OcrCorrection[]>([]);
  const [currentResultId, setCurrentResultId] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch supported languages
  const { data: languages } = useQuery({
    queryKey: [API_ENDPOINTS.ai.media.vision.ocr.languages],
  });

  // Fetch recent OCR results
  const { data: recentResults } = useQuery({
    queryKey: [API_ENDPOINTS.ai.media.vision.ocr.results],
  });

  // Extract text mutation
  const extractMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(API_ENDPOINTS.ai.media.vision.ocr.extract, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('OCR extraction failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ai.media.vision.ocr.results] });
    }
  });

  // Save correction mutation
  const correctionMutation = useMutation({
    mutationFn: async (correction: Partial<OcrCorrection>) => {
      const response = await fetch(`${API_ENDPOINTS.ai.media.vision.ocr.extract}/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(correction),
      });
      if (!response.ok) {
        throw new Error('Failed to save correction');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Correction saved",
        description: "Your correction has been saved to improve future OCR results",
      });
    }
  });

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setExtractedText("");
    setConfidence(0);
    setBoundingBoxes([]);
    setStructuredData(null);
    
    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  }, []);

  // Extract text from file (server-side processing)
  const handleExtractText = useCallback(async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Use server-side processing for reliability
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('language', selectedLanguage);
      formData.append('parseReceipt', 'true');

      setProcessingProgress(50); // Show some progress

      const result = await extractMutation.mutateAsync(formData);
      
      setProcessingProgress(90);
      
      setExtractedText(result.text || '');
      setConfidence(result.confidence || 0);
      setBoundingBoxes(result.boundingBoxes || []);
      setCurrentResultId(result.id || null);
      
      if (result.structuredData) {
        setStructuredData(result.structuredData);
      } else if (result.text && (result.text.toLowerCase().includes('total') || 
                                   result.text.toLowerCase().includes('receipt'))) {
        // Parse receipt if it looks like one
        const parsed = parseReceipt(result.text);
        setStructuredData(parsed);
      }

      const fileType = selectedFile.type.startsWith('image/') ? 'image' : 'PDF';
      toast({
        title: "Text extracted successfully",
        description: `Extracted text from ${fileType} with ${(result.confidence || 0).toFixed(1)}% confidence`,
      });
    } catch (error) {
      console.error('OCR Error:', error);
      toast({
        title: "OCR failed",
        description: "Failed to extract text from the document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  }, [selectedFile, selectedLanguage, extractMutation, toast]);

  // Save correction - only send required fields per backend insert schema
  const handleSaveCorrection = useCallback((correction: { 
    originalText: string;
    correctedText: string;
    correctionType: "spelling" | "formatting" | "structure" | "other";
    confidence: number;
  }) => {
    if (!currentResultId) {
      toast({
        title: "Cannot save correction",
        description: "No OCR result available. Please extract text first.",
        variant: "destructive",
      });
      return;
    }
    
    // Backend insert schema: only required fields, omit optional boundingBox
    // userId extracted from auth, id/createdAt/updatedAt auto-generated
    const ocrCorrection = {
      originalText: correction.originalText,
      correctedText: correction.correctedText,
      correctionType: correction.correctionType,
      confidence: correction.confidence,
      resultId: currentResultId,
    };
    
    correctionMutation.mutate(ocrCorrection);
  }, [currentResultId, correctionMutation, toast]);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          OCR Text Extraction
        </h1>
        <p className="mt-2 text-muted-foreground">
          Extract text from images and PDFs using advanced optical character recognition
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Upload and Settings */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Document
              </CardTitle>
              <CardDescription>
                Select an image or PDF to extract text from
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OCRUploader
                onFileSelect={handleFileSelect}
                maxSizeInMB={20}
              />
              
              {selectedFile && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">OCR Language</label>
                      <LanguageSelector
                        value={selectedLanguage}
                        onChange={setSelectedLanguage}
                        className="mt-2"
                      />
                    </div>
                    
                    <Button
                      onClick={handleExtractText}
                      disabled={isProcessing}
                      className="w-full"
                      data-testid="button-extract"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing... {processingProgress}%
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Extract Text
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
              
              {isProcessing && (
                <Progress value={processingProgress} className="w-full" />
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {extractedText && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Extraction Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Words</span>
                  <span className="font-medium">{extractedText.split(/\s+/).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Characters</span>
                  <span className="font-medium">{extractedText.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Lines</span>
                  <span className="font-medium">{extractedText.split('\n').length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <Badge variant={confidence >= 80 ? "default" : "secondary"}>
                    {confidence.toFixed(1)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Results */}
        <div className="lg:col-span-2">
          {!extractedText && !isProcessing && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No text extracted yet</h3>
                <p className="text-sm text-muted-foreground">
                  Upload a document and click "Extract Text" to begin
                </p>
              </CardContent>
            </Card>
          )}

          {extractedText && (
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text">
                  <FileText className="mr-2 h-4 w-4" />
                  Extracted Text
                </TabsTrigger>
                <TabsTrigger value="regions" disabled={!imagePreview}>
                  <Eye className="mr-2 h-4 w-4" />
                  Document Regions
                </TabsTrigger>
                <TabsTrigger value="structured" disabled={!structuredData}>
                  <Settings className="mr-2 h-4 w-4" />
                  Structured Data
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-4">
                <ExtractedText
                  text={extractedText}
                  confidence={confidence}
                  corrections={corrections as any}
                  onSaveCorrection={handleSaveCorrection}
                />
                <div className="mt-4 flex justify-end">
                  <CopyButton
                    text={extractedText}
                    structuredData={structuredData}
                  />
                </div>
              </TabsContent>

              <TabsContent value="regions" className="mt-4">
                {imagePreview && (
                  <HighlightedRegions
                    imageUrl={imagePreview}
                    boundingBoxes={boundingBoxes}
                  />
                )}
              </TabsContent>

              <TabsContent value="structured" className="mt-4">
                {structuredData && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Parsed Receipt Data</CardTitle>
                      <CardDescription>
                        Structured data extracted from the receipt
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {structuredData.storeName && (
                        <div>
                          <label className="text-sm font-medium">Store</label>
                          <p className="text-lg">{structuredData.storeName}</p>
                        </div>
                      )}
                      
                      {structuredData.items?.length > 0 && (
                        <div>
                          <label className="text-sm font-medium">Items</label>
                          <div className="mt-2 space-y-1">
                            {structuredData.items.map((item: any, index: number) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{item.name}</span>
                                <span className="font-mono">${item.price}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {structuredData.tax && (
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-sm font-medium">Tax</span>
                          <span className="font-mono">${structuredData.tax}</span>
                        </div>
                      )}
                      
                      {structuredData.total && (
                        <div className="flex justify-between text-lg font-bold pt-2 border-t">
                          <span>Total</span>
                          <span className="font-mono">${structuredData.total}</span>
                        </div>
                      )}
                      
                      <div className="pt-4">
                        <CopyButton
                          text={extractedText}
                          structuredData={structuredData}
                          variant="outline"
                          className="w-full"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}