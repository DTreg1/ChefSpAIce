/**
 * Excerpt Generator Page
 * 
 * Main page for creating, testing, and optimizing content excerpts
 * with AI-powered generation and performance tracking.
 * 
 * @module client/src/pages/excerpt-generator
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, 
  FileText, 
  FlaskConical, 
  BarChart3,
  Plus,
  Settings,
  AlertCircle,
  Loader2,
  Copy,
} from "lucide-react";
import { ExcerptEditor, type ExcerptGenerationOptions } from "@/components/excerpt-editor";
import { ExcerptPreview } from "@/components/excerpt-preview";
import { ExcerptTester } from "@/components/excerpt-tester";
import { PerformanceMetrics } from "@/components/performance-metrics";
import type { Excerpt } from "@shared/schema";

// Sample content for demonstration
const SAMPLE_CONTENT = `The Future of Sustainable Technology: A Comprehensive Analysis

As we stand at the crossroads of technological advancement and environmental responsibility, the integration of sustainable practices into our digital infrastructure has become not just desirable, but essential. This comprehensive analysis explores the latest innovations in green technology, from renewable energy-powered data centers to biodegradable electronics.

Recent studies indicate that the technology sector accounts for approximately 4% of global greenhouse gas emissions, a figure that could double by 2040 if current trends continue. However, pioneering companies are demonstrating that economic growth and environmental stewardship need not be mutually exclusive.

Key innovations include quantum computing breakthroughs that promise exponential efficiency gains, carbon-negative cloud services, and AI-driven optimization systems that reduce energy consumption by up to 40%. These developments suggest a future where technology serves as a catalyst for environmental restoration rather than degradation.

The implications extend beyond corporate responsibility to reshape consumer behavior, investment strategies, and regulatory frameworks. As we navigate this transformation, the choices made today will determine whether technology becomes humanity's greatest tool for planetary healing or its most significant environmental challenge.`;

export default function ExcerptGeneratorPage() {
  const { toast } = useToast();
  const [content, setContent] = useState(SAMPLE_CONTENT);
  const [contentId] = useState(`content-${Date.now()}`);
  const [activeTab, setActiveTab] = useState("generate");
  const [generatedExcerpts, setGeneratedExcerpts] = useState<Excerpt[]>([]);

  // Fetch excerpts for content
  const { data: excerpts = [], isLoading: loadingExcerpts } = useQuery({
    queryKey: ['/api/excerpts', contentId],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/excerpts/${contentId}`, {
          method: 'GET',
        });
        return response.excerpts || [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!contentId,
  });

  // Fetch performance data
  const { data: performanceData } = useQuery({
    queryKey: ['/api/excerpts/performance', excerpts],
    queryFn: async () => {
      const perfData: Record<string, any> = {};
      for (const excerpt of excerpts) {
        try {
          const response = await apiRequest(`/api/excerpts/performance?excerptId=${excerpt.id}`, {
            method: 'GET',
          });
          perfData[excerpt.id] = {
            views: response.aggregate?.totalViews || 0,
            clicks: response.aggregate?.totalClicks || 0,
            shares: response.aggregate?.totalShares || 0,
            ctr: response.aggregate?.averageCTR || 0,
          };
        } catch (error) {
          perfData[excerpt.id] = { views: 0, clicks: 0, shares: 0, ctr: 0 };
        }
      }
      return perfData;
    },
    enabled: excerpts.length > 0,
  });

  // Generate excerpts mutation
  const generateMutation = useMutation({
    mutationFn: async (options: ExcerptGenerationOptions) => {
      const response = await apiRequest('/api/excerpts/generate', {
        method: 'POST',
        body: JSON.stringify({
          ...options,
          content,
          contentId,
        }),
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.excerpts) {
        setGeneratedExcerpts(data.excerpts);
        queryClient.invalidateQueries({ queryKey: ['/api/excerpts', contentId] });
        toast({
          title: "Excerpts Generated",
          description: `Successfully generated ${data.excerpts.length} excerpt variants`,
        });
        setActiveTab("test");
      }
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Activate excerpt mutation
  const activateMutation = useMutation({
    mutationFn: async (excerptId: string) => {
      return await apiRequest(`/api/excerpts/${excerptId}/activate`, {
        method: 'PUT',
        body: JSON.stringify({ contentId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/excerpts', contentId] });
      toast({
        title: "Excerpt Activated",
        description: "The selected excerpt is now active",
      });
    },
    onError: (error) => {
      toast({
        title: "Activation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Track performance mutation
  const trackMutation = useMutation({
    mutationFn: async (excerptId: string) => {
      return await apiRequest(`/api/excerpts/${excerptId}/track`, {
        method: 'POST',
        body: JSON.stringify({
          views: 1,
          clicks: Math.random() > 0.8 ? 1 : 0, // Simulate click
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/excerpts/performance'] });
    },
  });

  // Optimize excerpt mutation
  const optimizeMutation = useMutation({
    mutationFn: async (excerptId: string) => {
      return await apiRequest('/api/excerpts/optimize', {
        method: 'PUT',
        body: JSON.stringify({
          excerptId,
          targetCTR: 0.2,
        }),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/excerpts', contentId] });
      toast({
        title: "Excerpt Optimized",
        description: "Generated an optimized version based on performance data",
      });
    },
    onError: (error) => {
      toast({
        title: "Optimization Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Copied",
        description: "Content copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy content",
        variant: "destructive",
      });
    }
  };

  const allExcerpts = [...excerpts, ...generatedExcerpts];
  const activeExcerpt = allExcerpts.find(e => e.isActive);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Smart Excerpt Generator</h1>
        <p className="text-muted-foreground mt-2">
          Create compelling preview snippets optimized for sharing and engagement
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source Content</CardTitle>
          <CardDescription>
            Enter or paste the content you want to create excerpts for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Enter your content here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] resize-none font-mono text-sm"
              data-testid="textarea-content"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {content.length} characters • {content.split(/\s+/).filter(w => w).length} words
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyContent}
                data-testid="button-copy-content"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="generate">
            <Sparkles className="h-4 w-4 mr-1" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="test" disabled={allExcerpts.length === 0}>
            <FlaskConical className="h-4 w-4 mr-1" />
            A/B Test
          </TabsTrigger>
          <TabsTrigger value="metrics" disabled={allExcerpts.length === 0}>
            <BarChart3 className="h-4 w-4 mr-1" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="manage" disabled={allExcerpts.length === 0}>
            <Settings className="h-4 w-4 mr-1" />
            Manage
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <ExcerptEditor
            initialContent={content}
            onGenerate={(options) => generateMutation.mutate(options)}
            isGenerating={generateMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          {allExcerpts.length > 0 ? (
            <ExcerptTester
              excerpts={allExcerpts}
              performance={performanceData}
              onSelectWinner={(id) => activateMutation.mutate(id)}
              onRefreshData={() => queryClient.invalidateQueries({ queryKey: ['/api/excerpts/performance'] })}
              isLoading={loadingExcerpts}
            />
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No excerpts to test</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Generate excerpts first to start A/B testing
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {activeExcerpt ? (
            <PerformanceMetrics
              excerptId={activeExcerpt.id}
              contentId={contentId}
              data={{
                daily: [],
                aggregate: performanceData?.[activeExcerpt.id] || {
                  totalViews: 0,
                  totalClicks: 0,
                  totalShares: 0,
                  totalEngagements: 0,
                  averageCTR: 0,
                  averageShareRate: 0,
                  conversionRate: 0,
                },
              }}
            />
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No active excerpt selected. Activate an excerpt to see its performance metrics.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <div className="grid gap-4">
            {allExcerpts.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">All Excerpts</h3>
                  <Badge variant="outline">
                    {allExcerpts.length} variant{allExcerpts.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                {allExcerpts.map((excerpt) => (
                  <ExcerptPreview
                    key={excerpt.id}
                    excerpt={excerpt}
                    performance={performanceData?.[excerpt.id]}
                    isActive={excerpt.isActive}
                    onActivate={() => activateMutation.mutate(excerpt.id)}
                    onTrackClick={() => trackMutation.mutate(excerpt.id)}
                    variant="compact"
                  />
                ))}

                <Separator />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const bestExcerpt = allExcerpts.reduce((best, current) => 
                        (performanceData?.[current.id]?.ctr || 0) > (performanceData?.[best.id]?.ctr || 0) 
                          ? current : best
                      );
                      if (bestExcerpt) {
                        optimizeMutation.mutate(bestExcerpt.id);
                      }
                    }}
                    disabled={optimizeMutation.isPending}
                    data-testid="button-optimize"
                  >
                    {optimizeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1" />
                        Optimize Best Performer
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => setActiveTab("generate")}
                    data-testid="button-generate-more"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Generate More Variants
                  </Button>
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No excerpts created yet</p>
                  <Button
                    className="mt-4"
                    onClick={() => setActiveTab("generate")}
                    data-testid="button-start-generating"
                  >
                    Start Generating
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}