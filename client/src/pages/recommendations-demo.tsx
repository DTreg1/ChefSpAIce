import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { RelatedContentSidebar } from "@/components/related-content";
import { ContentCard } from "@/components/cards";
import { RecommendationCarousel } from "@/components/recommendation-carousel";
import { MoreLikeThis } from "@/components/more-like-this";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Sparkles,
  Plus,
  RefreshCw,
  TrendingUp,
  BookOpen,
  Package,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Sample content for testing
const sampleContent = [
  {
    id: "article-1",
    type: "article",
    title: "Getting Started with Machine Learning",
    text: "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing computer programs that can access data and use it to learn for themselves. The process of learning begins with observations or data, such as examples, direct experience, or instruction, in order to look for patterns in data and make better decisions in the future based on the examples we provide.",
    metadata: {
      category: "Technology",
      author: "AI Expert",
      readTime: 10,
      tags: ["AI", "ML", "Deep Learning", "Neural Networks"],
    },
  },
  {
    id: "article-2",
    type: "article",
    title: "Understanding Neural Networks",
    text: "Neural networks are computing systems inspired by the biological neural networks that constitute animal brains. These systems learn to perform tasks by considering examples, generally without being programmed with task-specific rules. A neural network is based on a collection of connected units or nodes called artificial neurons, which loosely model the neurons in a biological brain.",
    metadata: {
      category: "Technology",
      author: "Deep Learning Specialist",
      readTime: 15,
      tags: ["Neural Networks", "Deep Learning", "AI"],
    },
  },
  {
    id: "article-3",
    type: "article",
    title: "Introduction to Data Science",
    text: "Data science is an interdisciplinary field that uses scientific methods, processes, algorithms and systems to extract knowledge and insights from structured and unstructured data. Data science is related to data mining, machine learning and big data. It employs techniques and theories drawn from many fields within the context of mathematics, statistics, computer science, domain knowledge and information science.",
    metadata: {
      category: "Technology",
      author: "Data Scientist",
      readTime: 12,
      tags: ["Data Science", "Analytics", "Big Data", "Statistics"],
    },
  },
  {
    id: "recipe-1",
    type: "recipe",
    title: "Classic Spaghetti Carbonara",
    text: "Spaghetti Carbonara is a classic Italian pasta dish from Rome made with eggs, pecorino cheese, guanciale, and black pepper. The dish arrives at the table at the perfect temperature with the cheese melted, and the eggs not fully cooked, giving it a creamy texture. The guanciale is briefly fried in a pan in its own fat. A mixture of eggs, cheese, and pepper is combined with the hot pasta and a little of the pasta water to create a creamy sauce.",
    metadata: {
      category: "Italian",
      prepTime: 20,
      cookTime: 15,
      servings: 4,
      tags: ["Pasta", "Italian", "Quick", "Easy"],
    },
  },
];

export default function RecommendationsDemo() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedContent, setSelectedContent] = useState(sampleContent[0]);
  const [customContent, setCustomContent] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [generatingEmbeddings, setGeneratingEmbeddings] = useState(false);

  // Generate embeddings for sample content
  const generateEmbeddings = useMutation({
    mutationFn: async () => {
      setGeneratingEmbeddings(true);

      // Generate embeddings for all sample content
      for (const content of sampleContent) {
        await apiRequest("/api/content/embeddings/generate", "POST", {
          contentId: content.id,
          contentType: content.type,
          text: content.text,
          metadata: {
            ...content.metadata,
            title: content.title,
          },
        });
      }

      // If custom content is provided, generate embedding for it too
      if (customContent && customTitle) {
        await apiRequest("/api/content/embeddings/generate", "POST", {
          contentId: `custom-${Date.now()}`,
          contentType: "article",
          text: customContent,
          metadata: {
            title: customTitle,
            category: "Custom",
          },
        });
      }

      setGeneratingEmbeddings(false);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      toast({
        title: "Embeddings Generated",
        description: "Content embeddings have been successfully created",
      });
    },
    onError: (error: any) => {
      setGeneratingEmbeddings(false);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate embeddings",
        variant: "destructive",
      });
    },
  });

  const handleContentClick = (item: any) => {
    // Find the full content from sample data
    const fullContent = sampleContent.find((c) => c.id === item.id);
    if (fullContent) {
      setSelectedContent(fullContent);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Content Recommendations Demo</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Explore AI-powered content recommendations using OpenAI embeddings and
          vector similarity search. The system analyzes content semantically to
          find related items.
        </p>

        {/* Quick Actions */}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={() => generateEmbeddings.mutate()}
            disabled={generatingEmbeddings}
            data-testid="button-generate-embeddings"
          >
            {generatingEmbeddings ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Generate Sample Embeddings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Personalized Recommendations Carousel */}
      <RecommendationCarousel
        userId={user?.id}
        contentType="article"
        title="Personalized Recommendations"
        subtitle="Content tailored to your interests"
        onItemClick={handleContentClick}
        autoPlay={true}
      />

      {/* Main Content Area with Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Article */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="mb-2">{selectedContent.type}</Badge>
                  <CardTitle className="text-2xl">
                    {selectedContent.title}
                  </CardTitle>
                </div>
                <BookOpen className="h-6 w-6 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                {selectedContent.text}
              </p>

              {selectedContent.metadata && (
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {selectedContent.metadata.tags?.map((tag: string) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sample Content Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Sample Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sampleContent.map((content) => (
                  <Button
                    key={content.id}
                    variant={
                      selectedContent.id === content.id ? "default" : "outline"
                    }
                    className="justify-start h-auto py-3 px-4"
                    onClick={() => setSelectedContent(content)}
                    data-testid={`select-content-${content.id}`}
                  >
                    <div className="text-left">
                      <div className="font-medium">{content.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {content.type} • {content.metadata.category}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom Content Input */}
          <Card>
            <CardHeader>
              <CardTitle>Test Custom Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-title">Title</Label>
                <Input
                  id="custom-title"
                  placeholder="Enter content title..."
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  data-testid="input-custom-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-content">Content</Label>
                <Textarea
                  id="custom-content"
                  placeholder="Enter your content here to generate embeddings and find similar items..."
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  rows={4}
                  data-testid="textarea-custom-content"
                />
              </div>
              <Button
                onClick={() => {
                  if (customContent && customTitle) {
                    setSelectedContent({
                      id: `custom-${Date.now()}`,
                      type: "article",
                      title: customTitle,
                      text: customContent,
                      metadata: {
                        category: "Custom",
                        prepTime: 0,
                        cookTime: 0,
                        servings: 0,
                        tags: [],
                      },
                    });
                    generateEmbeddings.mutate();
                  } else {
                    toast({
                      title: "Missing Information",
                      description: "Please enter both title and content",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={
                  !customContent || !customTitle || generatingEmbeddings
                }
                data-testid="button-test-custom"
              >
                Test Custom Content
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar with Related Content */}
        <div className="space-y-6">
          <RelatedContentSidebar
            contentId={selectedContent.id}
            contentType={selectedContent.type}
            title="Related Content"
            onItemClick={handleContentClick}
          />

          {/* Stats Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recommendation Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-medium">text-embedding-ada-002</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimensions</span>
                  <span className="font-medium">1536</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Similarity</span>
                  <span className="font-medium">Cosine</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Threshold</span>
                  <span className="font-medium">70%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* More Like This Section */}
      <MoreLikeThis
        contentId={selectedContent.id}
        contentType={selectedContent.type}
        contentTitle={selectedContent.title}
        onItemClick={handleContentClick}
      />
    </div>
  );
}
