/**
 * Sentiment Analysis Dashboard
 * 
 * Comprehensive dashboard for viewing sentiment trends, insights, and analysis
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SentimentIndicator, type SentimentData } from "@/components/sentiment/SentimentIndicator";
import { EmotionTags } from "@/components/sentiment/EmotionTags";
import { SentimentTrendChart } from "@/components/sentiment/SentimentTrendChart";
import { useToast } from "@/hooks/use-toast";
import { 
  BrainIcon, 
  TrendingUpIcon, 
  BarChartIcon, 
  ActivityIcon,
  RefreshCwIcon,
  SendIcon,
  HistoryIcon,
  GlobeIcon,
  UserIcon
} from "lucide-react";
import { format } from "date-fns";

interface SentimentAnalysis extends SentimentData {
  id: string;
  contentId: string;
  content: string;
  contentType?: string;
  analyzedAt: string;
  topics?: string[];
  keywords?: string[];
}

interface SentimentInsights {
  overallSentiment: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
  topEmotions: Array<{
    emotion: string;
    count: number;
    avgIntensity: number;
  }>;
  topTopics: string[];
  trendsOverTime: Array<{
    period: string;
    avgSentiment: number;
    count: number;
  }>;
}

export default function SentimentDashboard() {
  const { toast } = useToast();
  const [testText, setTestText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<SentimentAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [periodType, setPeriodType] = useState<'hour' | 'day' | 'week' | 'month'>('day');
  const [viewMode, setViewMode] = useState<'personal' | 'global'>('personal');

  // Fetch sentiment insights
  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery({
    queryKey: ['/api/sentiment/insights', viewMode],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (viewMode === 'global') params.append('global', 'true');
      
      const response = await apiRequest(`/api/sentiment/insights?${params}`, {
        method: 'GET',
      });
      return response.insights as SentimentInsights;
    }
  });

  // Fetch sentiment trends
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['/api/sentiment/trends', periodType, viewMode],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('periodType', periodType);
      if (viewMode === 'global') params.append('global', 'true');
      params.append('limit', '30');
      
      const response = await apiRequest(`/api/sentiment/trends?${params}`, {
        method: 'GET',
      });
      return response.trends;
    }
  });

  // Fetch user's sentiment history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/sentiment/user', 'current'],
    queryFn: async () => {
      const response = await apiRequest('/api/sentiment/user/current', {
        method: 'GET',
      });
      return response.analyses as SentimentAnalysis[];
    }
  });

  // Mutation for analyzing text
  const analyzeMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest('/api/sentiment/analyze', {
        method: 'POST',
        body: { 
          content: text,
          contentType: 'test'
        },
      });
      return response.analysis as SentimentAnalysis;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast({
        title: "Analysis complete",
        description: `Sentiment: ${data.sentiment} (${Math.round(data.confidence * 100)}% confidence)`,
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/sentiment'] });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze sentiment",
        variant: "destructive",
      });
    }
  });

  const handleAnalyze = () => {
    if (!testText.trim()) {
      toast({
        title: "No text provided",
        description: "Please enter some text to analyze",
        variant: "destructive",
      });
      return;
    }
    
    setIsAnalyzing(true);
    analyzeMutation.mutate(testText);
    setIsAnalyzing(false);
  };

  const handleExampleAnalysis = () => {
    const exampleText = "The product arrived late but quality exceeded expectations!";
    setTestText(exampleText);
    setIsAnalyzing(true);
    analyzeMutation.mutate(exampleText);
    setIsAnalyzing(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="page-title">
            <BrainIcon className="w-8 h-8" />
            Sentiment Analysis Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Analyze and track emotional sentiment in text content
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'personal' ? 'global' : 'personal')}
            data-testid="view-mode-toggle"
          >
            {viewMode === 'personal' ? (
              <>
                <UserIcon className="w-4 h-4 mr-1" />
                Personal
              </>
            ) : (
              <>
                <GlobeIcon className="w-4 h-4 mr-1" />
                Global
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchInsights();
              toast({ title: "Refreshing data..." });
            }}
            data-testid="refresh-button"
          >
            <RefreshCwIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Test Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle>Test Sentiment Analysis</CardTitle>
          <CardDescription>
            Enter text to analyze its sentiment and emotional content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-text">Text to Analyze</Label>
            <Textarea
              id="test-text"
              placeholder="Enter your text here..."
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              rows={4}
              data-testid="input-text"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleAnalyze} 
              disabled={isAnalyzing || !testText.trim()}
              data-testid="button-analyze"
            >
              <SendIcon className="w-4 h-4 mr-2" />
              Analyze
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExampleAnalysis}
              data-testid="button-example"
            >
              Try Example
            </Button>
          </div>

          {/* Analysis Result */}
          {analysisResult && (
            <div className="mt-4 p-4 border rounded-lg space-y-3" data-testid="analysis-result">
              <SentimentIndicator
                data={analysisResult}
                size="lg"
                showDetails
                showEmotions
                showAspects
              />
              {analysisResult.keywords && analysisResult.keywords.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-1">Keywords:</p>
                  <div className="flex flex-wrap gap-1">
                    {analysisResult.keywords.map((keyword, idx) => (
                      <Badge key={idx} variant="secondary">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChartIcon className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUpIcon className="w-4 h-4 mr-2" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="emotions">
            <ActivityIcon className="w-4 h-4 mr-2" />
            Emotions
          </TabsTrigger>
          <TabsTrigger value="history">
            <HistoryIcon className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {insightsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-full" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : insights ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Overall Sentiment</CardTitle>
                    <div className="text-2xl font-bold">
                      {insights.overallSentiment > 0 ? '+' : ''}
                      {insights.overallSentiment.toFixed(2)}
                    </div>
                    <Badge variant={insights.overallSentiment > 0 ? "default" : insights.overallSentiment < 0 ? "destructive" : "secondary"}>
                      {insights.overallSentiment > 0 ? 'Positive' : insights.overallSentiment < 0 ? 'Negative' : 'Neutral'}
                    </Badge>
                  </CardHeader>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Positive Rate</CardTitle>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {insights.sentimentDistribution.positive.toFixed(1)}%
                    </div>
                  </CardHeader>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Negative Rate</CardTitle>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {insights.sentimentDistribution.negative.toFixed(1)}%
                    </div>
                  </CardHeader>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Mixed Sentiment</CardTitle>
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {insights.sentimentDistribution.mixed.toFixed(1)}%
                    </div>
                  </CardHeader>
                </Card>
              </div>

              {/* Top Topics */}
              {insights.topTopics && insights.topTopics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Topics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {insights.topTopics.map((topic, idx) => (
                        <Badge key={idx} variant="outline" data-testid={`topic-${idx}`}>
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Alert>
              <AlertDescription>No sentiment data available yet</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends">
          {trendsLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : trends && trends.length > 0 ? (
            <SentimentTrendChart
              data={trends}
              periodType={periodType}
              title={`${viewMode === 'global' ? 'Global' : 'Personal'} Sentiment Trends`}
              description="Track sentiment changes over time"
              height={400}
              showCounts
              onPeriodChange={(period) => setPeriodType(period as any)}
            />
          ) : (
            <Alert>
              <AlertDescription>No trend data available yet</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Emotions Tab */}
        <TabsContent value="emotions" className="space-y-4">
          {insightsLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : insights && insights.topEmotions && insights.topEmotions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Dominant Emotions</CardTitle>
                <CardDescription>Most frequently detected emotions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights.topEmotions.map((emotion, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <EmotionTags 
                      emotions={{ [emotion.emotion]: emotion.avgIntensity }}
                      maxItems={1}
                    />
                    <div className="text-sm text-muted-foreground">
                      Detected {emotion.count} times
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <AlertDescription>No emotion data available yet</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {historyLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-3">
              {history.map((item) => (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.content}
                        </p>
                        <SentimentIndicator 
                          data={item}
                          size="sm"
                          showEmotions
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(item.analyzedAt), 'MMM dd, yyyy HH:mm')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertDescription>No analysis history available yet</AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}