/**
 * Image Editor Component
 * 
 * Main editing interface with tools for image enhancement.
 * Provides controls for background removal, cropping, filters, and quality.
 */

import { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Wand2, 
  Crop, 
  Download, 
  Upload, 
  RotateCw,
  Palette,
  Sliders,
  Scissors,
  Image as ImageIcon,
  Loader2
} from "lucide-react";

interface ImageEditorProps {
  file?: File;
  onFileChange?: (file: File) => void;
  onSave?: (processedUrl: string) => void;
}

export function ImageEditor({ file, onFileChange, onSave }: ImageEditorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [processedUrl, setProcessedUrl] = useState<string>("");
  const [operations, setOperations] = useState({
    backgroundRemoval: false,
    autoCrop: false,
    qualityEnhancement: true,
    format: "jpeg",
    compression: 85,
    filters: [],
    colorAdjustments: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      hue: 0,
    },
    sharpening: {
      enabled: false,
      radius: 1,
      amount: 1,
      threshold: 10,
    },
    resize: {
      enabled: false,
      width: 0,
      height: 0,
      mode: "fit" as "fit" | "fill" | "cover",
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setProcessedUrl("");
      if (onFileChange) onFileChange(file);
    }
  }, [onFileChange, toast]);

  // Process image with selected operations
  const processImage = async () => {
    if (!file && !imageUrl) {
      toast({
        title: "No image selected",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    
    if (file) {
      formData.append("image", file);
    }
    
    // Determine endpoint based on primary operation
    let endpoint = "/api/images/enhance";
    if (operations.backgroundRemoval) {
      endpoint = "/api/images/background";
    } else if (operations.autoCrop) {
      endpoint = "/api/images/crop";
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process image");
      }

      const result = await response.json();
      setProcessedUrl(result.processedUrl);
      
      if (onSave) {
        onSave(result.processedUrl);
      }

      toast({
        title: "Image processed",
        description: `Processing completed in ${result.processingTime}ms`,
      });
    } catch (error: any) {
      toast({
        title: "Processing failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Add filter
  const addFilter = (type: string, intensity: number) => {
    setOperations(prev => ({
      ...prev,
      filters: [
        ...prev.filters.filter(f => f.type !== type),
        { type, intensity },
      ],
    }));
  };

  // Remove filter
  const removeFilter = (type: string) => {
    setOperations(prev => ({
      ...prev,
      filters: prev.filters.filter(f => f.type !== type),
    }));
  };

  return (
    <div className="space-y-6" data-testid="image-editor">
      {/* File Upload */}
      {!imageUrl && (
        <Card>
          <CardContent className="p-8">
            <div className="text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                data-testid="file-input"
              />
              
              <Button
                size="lg"
                onClick={() => fileInputRef.current?.click()}
                className="gap-2"
                data-testid="upload-button"
              >
                <Upload className="h-5 w-5" />
                Upload Image
              </Button>
              
              <p className="text-sm text-muted-foreground mt-4">
                Supports JPEG, PNG, WebP, and GIF (max 10MB)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Image Preview and Tools */}
      {imageUrl && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Image Preview */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Image Preview</CardTitle>
                <CardDescription>
                  {processedUrl ? "Processed" : "Original"} image
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={processedUrl || imageUrl}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                  
                  {isProcessing && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                    data-testid="change-image"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Change Image
                  </Button>
                  
                  {processedUrl && (
                    <>
                      <Button
                        onClick={() => setProcessedUrl("")}
                        variant="outline"
                        size="sm"
                        data-testid="reset-button"
                      >
                        <RotateCw className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                      
                      <Button
                        asChild
                        size="sm"
                        data-testid="download-button"
                      >
                        <a href={processedUrl} download>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Editing Tools */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enhancement Tools</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="quick" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="quick">Quick</TabsTrigger>
                    <TabsTrigger value="adjust">Adjust</TabsTrigger>
                    <TabsTrigger value="filters">Filters</TabsTrigger>
                  </TabsList>

                  {/* Quick Actions */}
                  <TabsContent value="quick" className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="bg-removal">Remove Background</Label>
                        <Switch
                          id="bg-removal"
                          checked={operations.backgroundRemoval}
                          onCheckedChange={(checked) => 
                            setOperations(prev => ({ ...prev, backgroundRemoval: checked }))
                          }
                          data-testid="switch-bg-removal"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="auto-crop">Auto Crop</Label>
                        <Switch
                          id="auto-crop"
                          checked={operations.autoCrop}
                          onCheckedChange={(checked) => 
                            setOperations(prev => ({ ...prev, autoCrop: checked }))
                          }
                          data-testid="switch-auto-crop"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="enhance">Quality Enhancement</Label>
                        <Switch
                          id="enhance"
                          checked={operations.qualityEnhancement}
                          onCheckedChange={(checked) => 
                            setOperations(prev => ({ ...prev, qualityEnhancement: checked }))
                          }
                          data-testid="switch-enhance"
                        />
                      </div>
                    </div>
                    
                    <div className="pt-4 space-y-3">
                      <Label>Output Format</Label>
                      <Select
                        value={operations.format}
                        onValueChange={(value) => 
                          setOperations(prev => ({ ...prev, format: value }))
                        }
                      >
                        <SelectTrigger data-testid="select-format">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="jpeg">JPEG</SelectItem>
                          <SelectItem value="png">PNG</SelectItem>
                          <SelectItem value="webp">WebP</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <div className="space-y-2">
                        <Label>Quality: {operations.compression}%</Label>
                        <Slider
                          value={[operations.compression]}
                          onValueChange={([value]) => 
                            setOperations(prev => ({ ...prev, compression: value }))
                          }
                          min={10}
                          max={100}
                          step={5}
                          data-testid="slider-quality"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Adjustments */}
                  <TabsContent value="adjust" className="space-y-4">
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Brightness: {operations.colorAdjustments.brightness}</Label>
                        <Slider
                          value={[operations.colorAdjustments.brightness]}
                          onValueChange={([value]) => 
                            setOperations(prev => ({
                              ...prev,
                              colorAdjustments: { ...prev.colorAdjustments, brightness: value }
                            }))
                          }
                          min={-100}
                          max={100}
                          step={5}
                          data-testid="slider-brightness"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Contrast: {operations.colorAdjustments.contrast}</Label>
                        <Slider
                          value={[operations.colorAdjustments.contrast]}
                          onValueChange={([value]) => 
                            setOperations(prev => ({
                              ...prev,
                              colorAdjustments: { ...prev.colorAdjustments, contrast: value }
                            }))
                          }
                          min={-100}
                          max={100}
                          step={5}
                          data-testid="slider-contrast"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Saturation: {operations.colorAdjustments.saturation}</Label>
                        <Slider
                          value={[operations.colorAdjustments.saturation]}
                          onValueChange={([value]) => 
                            setOperations(prev => ({
                              ...prev,
                              colorAdjustments: { ...prev.colorAdjustments, saturation: value }
                            }))
                          }
                          min={-100}
                          max={100}
                          step={5}
                          data-testid="slider-saturation"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* Filters */}
                  <TabsContent value="filters" className="space-y-4">
                    <div className="space-y-2">
                      {["blur", "grayscale", "sepia"].map(filter => {
                        const active = operations.filters.some(f => f.type === filter);
                        return (
                          <Button
                            key={filter}
                            variant={active ? "default" : "outline"}
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => 
                              active ? removeFilter(filter) : addFilter(filter, 50)
                            }
                            data-testid={`filter-${filter}`}
                          >
                            <Palette className="h-4 w-4 mr-2" />
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                            {active && <Badge className="ml-auto">Active</Badge>}
                          </Button>
                        );
                      })}
                    </div>
                  </TabsContent>
                </Tabs>

                <Button
                  className="w-full mt-4"
                  onClick={processImage}
                  disabled={isProcessing}
                  data-testid="process-button"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Apply Enhancements
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}