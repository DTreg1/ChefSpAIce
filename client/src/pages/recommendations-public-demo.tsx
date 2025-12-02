import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  RefreshCw,
  BookOpen,
  TrendingUp,
  Brain,
  Code,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

// Define type for content items
interface ContentItem {
  id: string;
  type: string;
  title: string;
  text: string;
  metadata: {
    category: string;
    author?: string;
    readTime?: number;
    tags?: string[];
    prepTime?: number;
    cookTime?: number;
    servings?: number;
  };
  relatedScores?: { [key: string]: number };
}

// Sample content for testing
const sampleContent: ContentItem[] = [
  {
    id: "article-1",
    type: "article",
    title: "Getting Started with Machine Learning",
    text: "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing computer programs that can access data and use it to learn for themselves.",
    metadata: {
      category: "Technology",
      author: "AI Expert",
      readTime: 10,
      tags: ["AI", "ML", "Deep Learning", "Neural Networks"],
    },
    relatedScores: {
      "article-2": 0.92,
      "article-3": 0.85,
      "article-4": 0.78,
      "article-5": 0.71,
    },
  },
  {
    id: "article-2",
    type: "article",
    title: "Understanding Neural Networks",
    text: "Neural networks are computing systems inspired by the biological neural networks that constitute animal brains. These systems learn to perform tasks by considering examples.",
    metadata: {
      category: "Technology",
      author: "Deep Learning Specialist",
      readTime: 15,
      tags: ["Neural Networks", "Deep Learning", "AI"],
    },
    relatedScores: {
      "article-1": 0.92,
      "article-3": 0.81,
      "article-4": 0.75,
      "article-5": 0.68,
    },
  },
  {
    id: "article-3",
    type: "article",
    title: "Introduction to Data Science",
    text: "Data science is an interdisciplinary field that uses scientific methods, processes, algorithms and systems to extract knowledge and insights from structured and unstructured data.",
    metadata: {
      category: "Technology",
      author: "Data Scientist",
      readTime: 12,
      tags: ["Data Science", "Analytics", "Big Data", "Statistics"],
    },
    relatedScores: {
      "article-1": 0.85,
      "article-2": 0.81,
      "article-4": 0.73,
      "article-5": 0.65,
    },
  },
  {
    id: "article-4",
    type: "article",
    title: "Deep Learning Applications",
    text: "Deep learning has revolutionized many fields including computer vision, natural language processing, and speech recognition through its ability to automatically learn hierarchical representations.",
    metadata: {
      category: "Technology",
      author: "ML Researcher",
      readTime: 18,
      tags: ["Deep Learning", "Computer Vision", "NLP", "Applications"],
    },
    relatedScores: {
      "article-1": 0.78,
      "article-2": 0.75,
      "article-3": 0.73,
      "article-5": 0.69,
    },
  },
  {
    id: "article-5",
    type: "article",
    title: "Python for Data Analysis",
    text: "Python has become the go-to language for data analysis and machine learning, with powerful libraries like NumPy, Pandas, and scikit-learn making complex operations simple.",
    metadata: {
      category: "Programming",
      author: "Python Developer",
      readTime: 8,
      tags: ["Python", "Programming", "Data Analysis", "Libraries"],
    },
    relatedScores: {
      "article-1": 0.71,
      "article-2": 0.68,
      "article-3": 0.65,
      "article-4": 0.69,
    },
  },
];

export default function RecommendationsPublicDemo() {
  const { toast } = useToast();
  const [selectedContent, setSelectedContent] = useState<ContentItem>(
    sampleContent[0],
  );
  const [customContent, setCustomContent] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  // Simulate embedding generation
  const simulateEmbeddings = async () => {
    setIsProcessing(true);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsProcessing(false);
    setShowDemo(true);

    toast({
      title: "Demo Mode Activated",
      description:
        "Showing simulated recommendations with sample relevance scores",
    });
  };

  // Get related content for selected item
  const getRelatedContent = () => {
    if (!selectedContent.relatedScores) return [];

    return Object.entries(selectedContent.relatedScores)
      .map(([id, score]) => {
        const content = sampleContent.find((c) => c.id === id);
        return content ? { ...content, score } : null;
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score);
  };

  const handleCustomContent = () => {
    if (!customContent || !customTitle) {
      toast({
        title: "Missing Information",
        description: "Please enter both title and content",
        variant: "destructive",
      });
      return;
    }

    const customItem = {
      id: `custom-${Date.now()}`,
      type: "article",
      title: customTitle,
      text: customContent,
      metadata: {
        category: "Custom",
        author: "User",
        readTime: Math.ceil(customContent.split(" ").length / 200),
        tags: ["Custom", "User Generated"],
      },
      relatedScores: {
        "article-1": 0.82,
        "article-2": 0.75,
        "article-3": 0.68,
        "article-4": 0.65,
        "article-5": 0.61,
      },
    };

    setSelectedContent(customItem);
    simulateEmbeddings();
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
          Explore how AI-powered content recommendations work using semantic
          similarity. This demo shows simulated results to demonstrate the
          concept.
        </p>

        <Button
          onClick={simulateEmbeddings}
          disabled={isProcessing}
          size="lg"
          data-testid="button-activate-demo"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Brain className="h-4 w-4 mr-2" />
              Activate Demo Mode
            </>
          )}
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Selected Content Display */}
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
                    <Badge
                      key={tag}
                      variant="secondary"
                      data-testid={`tag-${tag}`}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Select Content to Analyze</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                {sampleContent.map((content) => (
                  <Button
                    key={content.id}
                    variant={
                      selectedContent.id === content.id ? "default" : "outline"
                    }
                    className="justify-start h-auto py-3 px-4"
                    onClick={() => setSelectedContent(content)}
                    data-testid={`select-${content.id}`}
                  >
                    <div className="text-left">
                      <div className="font-medium">{content.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {content.metadata.category} •{" "}
                        {content.metadata.readTime} min read
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
              <CardTitle>Test Your Own Content</CardTitle>
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
                  placeholder="Enter your content here..."
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  rows={4}
                  data-testid="textarea-custom-content"
                />
              </div>
              <Button
                onClick={handleCustomContent}
                disabled={!customContent || !customTitle}
                className="w-full"
                data-testid="button-test-custom"
              >
                <Code className="h-4 w-4 mr-2" />
                Test Custom Content
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Related Content */}
          {showDemo && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Related Content</CardTitle>
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {getRelatedContent().map((item: any) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setSelectedContent(item)}
                    data-testid={`related-${item.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium line-clamp-2">
                        {item.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={item.score * 100}
                        className="h-2 flex-1"
                      />
                      <span
                        className="text-xs font-medium text-primary"
                        data-testid={`score-${item.id}`}
                      >
                        {Math.round(item.score * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.metadata.category}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Technical Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">How It Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold">1</span>
                  </div>
                  <p className="text-muted-foreground">
                    Content is processed through OpenAI's embedding model
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold">2</span>
                  </div>
                  <p className="text-muted-foreground">
                    1536-dimensional vectors represent semantic meaning
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold">3</span>
                  </div>
                  <p className="text-muted-foreground">
                    Cosine similarity finds related content
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold">4</span>
                  </div>
                  <p className="text-muted-foreground">
                    Results are cached for fast retrieval
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Technical Specs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-medium" data-testid="model-name">
                    text-embedding-ada-002
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dimensions</span>
                  <span className="font-medium" data-testid="dimensions">
                    1536
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Similarity</span>
                  <span className="font-medium" data-testid="similarity-method">
                    Cosine
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cache TTL</span>
                  <span className="font-medium">24 hours</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
