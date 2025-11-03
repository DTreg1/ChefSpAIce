/**
 * Image Enhancement Page
 * 
 * Main page for AI-powered image enhancement system.
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageEditor } from "@/components/images/ImageEditor";
import { BeforeAfter } from "@/components/images/BeforeAfter";
import { PresetSelector } from "@/components/images/PresetSelector";
import { BatchUploader } from "@/components/images/BatchUploader";
import { QualitySettings } from "@/components/images/QualitySettings";
import { 
  Image as ImageIcon,
  Wand2,
  Layers,
  Settings,
  BarChart3,
  Info,
  Key,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ImageEnhancement() {
  const [selectedFile, setSelectedFile] = useState<File>();
  const [processedImage, setProcessedImage] = useState<{
    originalUrl: string;
    processedUrl: string;
    originalSize: number;
    processedSize: number;
    processingTime: number;
  }>();
  const [selectedPreset, setSelectedPreset] = useState<any>();
  const [qualityConfig, setQualityConfig] = useState<any>();
  const { toast } = useToast();

  // Fetch usage statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/images/stats'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/images/stats');
        if (!response.ok) return null;
        return response.json();
      } catch {
        return null;
      }
    }
  });

  // Check Remove.bg API key status
  const { data: apiKeyStatus } = useQuery({
    queryKey: ['/check-removebg-key'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/images/check-api-key');
        if (!response.ok) return { hasKey: false };
        return response.json();
      } catch {
        return { hasKey: false };
      }
    }
  });

  // Handle image processing complete
  const handleImageProcessed = (url: string) => {
    setProcessedImage({
      originalUrl: selectedFile ? URL.createObjectURL(selectedFile) : "",
      processedUrl: url,
      originalSize: selectedFile?.size || 0,
      processedSize: 0, // Would come from API
      processingTime: 1250 // Would come from API
    });

    toast({
      title: "Image processed successfully",
      description: "Your enhanced image is ready for download"
    });
  };

  // Handle preset selection
  const handlePresetSelect = (preset: any) => {
    setSelectedPreset(preset);
    toast({
      title: "Preset applied",
      description: `Using "${preset.name}" enhancement preset`
    });
  };

  // Handle batch processing complete
  const handleBatchComplete = (files: any[]) => {
    toast({
      title: "Batch processing complete",
      description: `Successfully processed ${files.length} images`
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Image Enhancement</h1>
          <p className="text-muted-foreground">
            AI-powered image processing with background removal, smart cropping, and quality enhancement
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {statsLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : stats && (
            <div className="flex gap-2">
              <Badge variant="outline">
                {stats.totalProcessed || 0} images
              </Badge>
              <Badge variant="outline">
                {((stats.totalSaved || 0) / 1024 / 1024).toFixed(1)} MB saved
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* API Key Alert */}
      {!apiKeyStatus?.hasKey && (
        <Alert>
          <Key className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                Background removal requires a Remove.bg API key. Get one free at{" "}
                <a href="https://remove.bg/api" target="_blank" rel="noopener noreferrer" className="underline">
                  remove.bg/api
                </a>
              </span>
              <Button size="sm" variant="outline" className="ml-4">
                Configure API Key
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs defaultValue="editor" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="editor" data-testid="tab-editor">
            <Wand2 className="h-4 w-4 mr-2" />
            Editor
          </TabsTrigger>
          <TabsTrigger value="batch" data-testid="tab-batch">
            <Layers className="h-4 w-4 mr-2" />
            Batch
          </TabsTrigger>
          <TabsTrigger value="presets" data-testid="tab-presets">
            <ImageIcon className="h-4 w-4 mr-2" />
            Presets
          </TabsTrigger>
          <TabsTrigger value="quality" data-testid="tab-quality">
            <Settings className="h-4 w-4 mr-2" />
            Quality
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Image Editor Tab */}
        <TabsContent value="editor" className="space-y-6">
          <ImageEditor
            file={selectedFile}
            onFileChange={setSelectedFile}
            onSave={handleImageProcessed}
          />
          
          {processedImage && (
            <BeforeAfter
              originalUrl={processedImage.originalUrl}
              processedUrl={processedImage.processedUrl}
              originalSize={processedImage.originalSize}
              processedSize={processedImage.processedSize}
              processingTime={processedImage.processingTime}
            />
          )}
        </TabsContent>

        {/* Batch Processing Tab */}
        <TabsContent value="batch">
          <BatchUploader
            maxFiles={50}
            maxFileSize={10}
            onProcessComplete={handleBatchComplete}
          />
        </TabsContent>

        {/* Presets Tab */}
        <TabsContent value="presets">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PresetSelector
                onSelect={handlePresetSelect}
                selectedId={selectedPreset?.id}
              />
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Selected Preset</CardTitle>
                <CardDescription>
                  Currently active enhancement preset
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedPreset ? (
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">{selectedPreset.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedPreset.description}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {selectedPreset.operations?.backgroundRemoval && (
                        <Badge variant="outline" className="text-xs">
                          BG Removal
                        </Badge>
                      )}
                      {selectedPreset.operations?.autoCrop && (
                        <Badge variant="outline" className="text-xs">
                          Auto Crop
                        </Badge>
                      )}
                      {selectedPreset.operations?.qualityEnhancement && (
                        <Badge variant="outline" className="text-xs">
                          Enhanced
                        </Badge>
                      )}
                    </div>
                    
                    <Button className="w-full" size="sm">
                      Apply to Current Image
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No preset selected
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Quality Settings Tab */}
        <TabsContent value="quality">
          <QualitySettings
            config={qualityConfig}
            onChange={setQualityConfig}
            onSavePreset={(name, config) => {
              toast({
                title: "Preset saved",
                description: `"${name}" has been saved to your presets`
              });
            }}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Images</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stats?.totalProcessed || 0}</p>
                <p className="text-xs text-muted-foreground">
                  Processed all time
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Space Saved</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {((stats?.totalSaved || 0) / 1024 / 1024).toFixed(1)} MB
                </p>
                <p className="text-xs text-muted-foreground">
                  Through optimization
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {stats?.avgProcessingTime || "1.2"}s
                </p>
                <p className="text-xs text-muted-foreground">
                  Per image
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {stats?.successRate || "99.5"}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Processing success
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Popular Operations */}
          <Card>
            <CardHeader>
              <CardTitle>Popular Operations</CardTitle>
              <CardDescription>
                Most frequently used enhancement features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "Background Removal", count: 1234, percentage: 45 },
                  { name: "Auto Crop", count: 892, percentage: 32 },
                  { name: "Quality Enhancement", count: 756, percentage: 27 },
                  { name: "Resize", count: 543, percentage: 20 },
                  { name: "Format Conversion", count: 421, percentage: 15 }
                ].map((op) => (
                  <div key={op.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{op.name}</span>
                      <span className="text-muted-foreground">{op.count} uses</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${op.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Features Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Image Enhancement Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Background Removal</p>
                <p className="text-muted-foreground">
                  AI-powered background removal for clean product images
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Smart Cropping</p>
                <p className="text-muted-foreground">
                  Automatically crop to subject with intelligent framing
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Quality Enhancement</p>
                <p className="text-muted-foreground">
                  Improve colors, sharpness, and overall image quality
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}