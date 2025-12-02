/**
 * Alt Text Management Page
 *
 * Main page for managing image alt text with GPT-4 Vision integration
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ImageUploader,
  AccessibilityDashboard,
  AltTextEditor,
} from "@/components/alt-text";
import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import {
  Upload,
  BarChart3,
  Images,
  Settings,
  FileText,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AltTextManagement() {
  const [selectedImage, setSelectedImage] = useState<any>(null);

  // Fetch user's images
  const imagesQuery = useQuery<{ data: any[]; total: number }>({
    queryKey: [API_ENDPOINTS.ai.media.images.enhance],
  });

  const images = imagesQuery.data?.data || [];
  const totalImages = imagesQuery.data?.total || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          Alt Text Generation with GPT-4 Vision
        </h1>
        <p className="text-muted-foreground">
          Automatically generate descriptive alt text for images to improve
          accessibility and SEO
        </p>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger
            value="upload"
            className="flex items-center gap-2"
            data-testid="tab-upload"
          >
            <Upload className="w-4 h-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger
            value="library"
            className="flex items-center gap-2"
            data-testid="tab-library"
          >
            <Images className="w-4 h-4" />
            Library
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="flex items-center gap-2"
            data-testid="tab-analytics"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="flex items-center gap-2"
            data-testid="tab-settings"
          >
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <ImageUploader
            onImageUploaded={(image) => {
              imagesQuery.refetch();
            }}
          />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold">1</span>
                </div>
                <div>
                  <h4 className="font-medium">Upload Your Image</h4>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop or click to browse for images up to 10MB
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold">2</span>
                </div>
                <div>
                  <h4 className="font-medium">AI Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    GPT-4 Vision analyzes your image and generates descriptive
                    alt text
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold">3</span>
                </div>
                <div>
                  <h4 className="font-medium">Review & Edit</h4>
                  <p className="text-sm text-muted-foreground">
                    Review the generated text, make edits, or regenerate with
                    different context
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold">4</span>
                </div>
                <div>
                  <h4 className="font-medium">Quality Scoring</h4>
                  <p className="text-sm text-muted-foreground">
                    Get instant feedback on accessibility compliance and SEO
                    effectiveness
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Library Tab */}
        <TabsContent value="library" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Image Library</CardTitle>
              <CardDescription>
                Manage all your images and their alt text ({totalImages} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {images.map((image: any) => (
                    <Card
                      key={image.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedImage(image)}
                      data-testid={`image-card-${image.id}`}
                    >
                      <CardContent className="p-4">
                        {image.imageUrl && (
                          <img
                            src={image.imageUrl}
                            alt={image.altText || "No alt text"}
                            className="w-full h-32 object-cover rounded-md mb-3"
                          />
                        )}
                        <div className="space-y-2">
                          <p className="text-sm font-medium line-clamp-1">
                            {image.title || `Image ${image.id.slice(0, 8)}`}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {image.altText || "No alt text provided"}
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {image.isDecorative && (
                              <Badge variant="secondary">Decorative</Badge>
                            )}
                            {image.altText && (
                              <Badge variant="outline">Has Alt Text</Badge>
                            )}
                            {image.confidence && (
                              <Badge variant="outline">
                                {Math.round(image.confidence * 100)}% confident
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Selected Image Editor */}
          {selectedImage && (
            <AltTextEditor
              imageId={selectedImage.id}
              imageUrl={selectedImage.imageUrl}
              initialAltText={selectedImage.altText}
              initialIsDecorative={selectedImage.isDecorative}
              onSave={() => {
                imagesQuery.refetch();
                setSelectedImage(null);
              }}
            />
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <AccessibilityDashboard />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alt Text Generation Settings</CardTitle>
              <CardDescription>
                Configure how AI generates alt text for your images
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Default Context</h4>
                <p className="text-sm text-muted-foreground">
                  Provide default context that will be used for all images
                </p>
                <textarea
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="e.g., This is for an e-commerce website selling clothing..."
                  data-testid="input-default-context"
                />
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Quality Thresholds</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Minimum Acceptable Score</span>
                    <Badge>70%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Target WCAG Level</span>
                    <Badge>AA</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Maximum Alt Text Length</span>
                    <Badge>125 characters</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">AI Model</h4>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">GPT-4 Vision (gpt-5)</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Using the latest OpenAI vision model for accurate image
                    analysis
                  </p>
                </div>
              </div>

              <Button className="w-full" data-testid="button-save-settings">
                Save Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Integration</CardTitle>
              <CardDescription>
                Use the API to generate alt text programmatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-muted/30 rounded-lg font-mono text-sm">
                  <p className="text-primary mb-1">POST /api/images/alt-text</p>
                  <pre className="text-xs">{`{
  "imageUrl": "https://example.com/image.jpg",
  "context": "Product image for online store"
}`}</pre>
                </div>

                <div className="p-3 bg-muted/30 rounded-lg font-mono text-sm">
                  <p className="text-primary mb-1">POST /api/images/bulk-alt</p>
                  <pre className="text-xs">{`{
  "images": [
    { "id": "1", "imageUrl": "...", "context": "..." },
    { "id": "2", "imageUrl": "...", "context": "..." }
  ]
}`}</pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
