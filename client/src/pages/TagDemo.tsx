/**
 * TagDemo Page
 *
 * Demonstration page for the auto-tagging feature.
 * Tests tag generation for various content types including articles about sustainable farming.
 */

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TagEditor, TagCloud } from "@/components/tags";
import { Loader2, FileText, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { useToast } from "@/hooks/use-toast";

// Sample content for testing
const SAMPLE_ARTICLES = {
  sustainableFarming: {
    id: "demo-sustainable-farming",
    title: "Sustainable Farming Practices for the Modern Era",
    content: `
      Sustainable farming practices are revolutionizing agriculture in the 21st century. 
      These innovative techniques focus on environmental protection, economic profitability, 
      and social equity. Key practices include crop rotation, integrated pest management, 
      water conservation through drip irrigation, and the use of renewable energy sources.
      
      Organic farming methods eliminate synthetic pesticides and fertilizers, promoting 
      biodiversity and soil health. Cover crops prevent erosion and improve nitrogen levels.
      Precision agriculture uses GPS and IoT sensors to optimize resource usage.
      
      The benefits extend beyond the farm: reduced greenhouse gas emissions, improved 
      water quality, enhanced wildlife habitats, and healthier food for consumers.
      Small-scale farmers and large agricultural operations alike are adopting these 
      green technologies and eco-friendly approaches to ensure food security for 
      future generations while protecting our planet's precious resources.
    `,
  },
  techArticle: {
    id: "demo-tech-article",
    title: "Machine Learning in Healthcare: Transforming Patient Care",
    content: `
      Artificial intelligence and machine learning are transforming healthcare delivery.
      Deep learning algorithms analyze medical images with unprecedented accuracy,
      detecting diseases like cancer at early stages. Natural language processing
      helps doctors process vast amounts of medical literature and patient records.
      
      Predictive analytics identify at-risk patients before symptoms appear.
      Personalized medicine uses AI to tailor treatments based on genetic profiles.
      Robot-assisted surgery improves precision and reduces recovery times.
      
      These innovations are making healthcare more accessible, accurate, and affordable
      while empowering medical professionals with powerful diagnostic tools.
    `,
  },
};

export default function TagDemo() {
  const { toast } = useToast();
  const [selectedArticle, setSelectedArticle] = useState(
    SAMPLE_ARTICLES.sustainableFarming,
  );
  const [customContent, setCustomContent] = useState("");
  const [generatedTags, setGeneratedTags] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate tags mutation
  const generateTagsMutation = useMutation({
    mutationFn: async (content: any) => {
      return apiRequest(API_ENDPOINTS.ml.tags.generate, "POST", {
        contentId: content.id || `demo-${Date.now()}`,
        contentType: "article",
        content: {
          title: content.title || "Custom Content",
          content: content.content,
        },
        maxTags: 10,
      });
    },
    onSuccess: (data) => {
      setGeneratedTags(data.tags);
      toast({
        title: "Tags Generated Successfully!",
        description: `Generated ${data.tags.length} relevant tags using AI and NLP.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate tags. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateTags = (article: any) => {
    setIsGenerating(true);
    generateTagsMutation.mutate(article, {
      onSettled: () => setIsGenerating(false),
    });
  };

  const handleCustomGeneration = () => {
    if (!customContent.trim()) {
      toast({
        title: "Content Required",
        description: "Please enter some content to analyze.",
        variant: "destructive",
      });
      return;
    }

    handleGenerateTags({
      id: `custom-${Date.now()}`,
      title: "Custom Content",
      content: customContent,
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Auto-Tagging Feature Demo</h1>
        <p className="text-muted-foreground">
          Test the AI-powered tag generation using OpenAI GPT-3.5-turbo and
          TensorFlow.js
        </p>
      </div>

      {/* Sample Articles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Sample Articles
          </CardTitle>
          <CardDescription>
            Test tag generation with pre-written articles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(SAMPLE_ARTICLES).map(([key, article]) => (
            <Card key={key} className="p-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">{article.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {article.content}
                </p>
                <Button
                  onClick={() => {
                    setSelectedArticle(article);
                    handleGenerateTags(article);
                  }}
                  disabled={isGenerating}
                  data-testid={`generate-tags-${key}`}
                >
                  {isGenerating && selectedArticle.id === article.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Tags
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Custom Content */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Content</CardTitle>
          <CardDescription>
            Enter your own content to test tag generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter your article content here..."
            value={customContent}
            onChange={(e) => setCustomContent(e.target.value)}
            rows={6}
            data-testid="custom-content-input"
          />
          <Button
            onClick={handleCustomGeneration}
            disabled={isGenerating || !customContent.trim()}
            data-testid="generate-custom-tags"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Tags for Custom Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Tags Display */}
      {generatedTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Tags</CardTitle>
            <CardDescription>
              Tags generated using AI and NLP analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Tag List with Details */}
              <div className="grid gap-2">
                {generatedTags.map((tag, index) => (
                  <div
                    key={tag.id || index}
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`generated-tag-${tag.name}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        #{tag.name.replace("#", "")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Source: {tag.source || "ai-generated"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Relevance:{" "}
                        {Math.round((tag.relevanceScore || 0.8) * 100)}%
                      </span>
                    </div>
                    {tag.usageCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Used {tag.usageCount} times
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Success Message for Sustainable Farming */}
              {selectedArticle.id === "demo-sustainable-farming" && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-green-700 dark:text-green-300 font-medium">
                    ✓ Success! Generated relevant tags for sustainable farming
                    article:
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    Tags include: #sustainability, #agriculture, #environment,
                    #farming, #green-tech
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tag Cloud */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Tags</CardTitle>
          <CardDescription>Trending tags across all content</CardDescription>
        </CardHeader>
        <CardContent>
          <TagCloud limit={20} />
        </CardContent>
      </Card>

      {/* Tag Editor Demo */}
      {selectedArticle && generatedTags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tag Editor</CardTitle>
            <CardDescription>
              Full tag management interface for: {selectedArticle.title}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TagEditor
              contentId={selectedArticle.id}
              contentType="article"
              content={selectedArticle}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
