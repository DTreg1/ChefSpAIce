/**
 * Sentiment Analysis Dashboard
 * 
 * Comprehensive dashboard for monitoring overall user satisfaction trends, 
 * identifying pain points, and alerting on significant sentiment changes
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SentimentIndicator, type SentimentData } from "@/components/sentiment/SentimentIndicator";
import { EmotionTags } from "@/components/sentiment/EmotionTags";
import { SentimentTrendChart } from "@/components/sentiment/SentimentTrendChart";
import { useToast } from "@/hooks/use-toast";
import { 
  BrainIcon, 
  TrendingUpIcon, 
  TrendingDownIcon,
  BarChartIcon, 
  ActivityIcon,
  RefreshCwIcon,
  SendIcon,
  HistoryIcon,
  GlobeIcon,
  UserIcon,
  AlertTriangleIcon,
  BellIcon,
  FileTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AlertCircleIcon
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface SentimentMetrics {
  id: string;
  period: string;
  periodType: 'day' | 'week' | 'month';
  avgSentiment: number;
  totalItems: number;
  percentageChange?: number;
  alertTriggered?: boolean;
  metadata?: {
    topEmotions?: Record<string, number>;
    significantChanges?: string[];
  };
  categories?: Record<string, number>;
  painPoints?: Array<{
    issue: string;
    impact: number;
    category: string;
  }>;
  createdAt: string;
}

interface SentimentAlert {
  id: string;
  alertType: 'sentiment_drop' | 'sustained_negative' | 'volume_spike' | 'category_issue';
  threshold: number;
  currentValue: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  metadata?: {
    percentageChange?: number;
    previousValue?: number;
    affectedUsers?: number;
    relatedIssues?: string[];
    suggestedActions?: string[];
  };
  triggeredAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

interface SentimentSegment {
  id: string;
  period: string;
  segmentName: string;
  sentimentScore: number;
  sampleSize: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
  topIssues?: string[];
  topPraises?: string[];
  comparisonToPrevious?: number;
}

interface DashboardData {
  metrics: SentimentMetrics;
  alerts: SentimentAlert[];
  segments: SentimentSegment[];
  timestamp: string;
}

export default function SentimentDashboard() {
  const { toast } = useToast();
  const [testText, setTestText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<SentimentAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [periodType, setPeriodType] = useState<'day' | 'week' | 'month'>('week');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [viewMode, setViewMode] = useState<'personal' | 'global'>('global');

  // Fetch dashboard data with metrics and alerts
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['/api/sentiment/dashboard', selectedPeriod, periodType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedPeriod) {
        params.append('period', selectedPeriod);
        params.append('periodType', periodType);
      }
      
      const response = await apiRequest('GET', `/api/sentiment/dashboard?${params}`);
      const data = await response.json();
      return data as DashboardData;
    }
  });

  // Fetch active alerts
  const { data: activeAlerts, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['/api/sentiment/alerts/active'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/sentiment/alerts/active?limit=10');
      const data = await response.json();
      return data.alerts as SentimentAlert[];
    }
  });

  // Fetch sentiment insights
  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery({
    queryKey: ['/api/sentiment/insights', viewMode],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (viewMode === 'global') params.append('global', 'true');
      
      const response = await apiRequest('GET', `/api/sentiment/insights?${params}`);
      const data = await response.json();
      return data.insights as SentimentInsights;
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
      
      const response = await apiRequest('GET', `/api/sentiment/trends?${params}`);
      const data = await response.json();
      return data.trends;
    }
  });

  // Fetch user's sentiment history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['/api/sentiment/user', 'current'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/sentiment/user/current');
      const data = await response.json();
      return data.analyses as SentimentAnalysis[];
    }
  });

  // Fetch sentiment breakdown
  const { data: breakdown, isLoading: breakdownLoading } = useQuery({
    queryKey: ['/api/sentiment/breakdown', selectedPeriod, periodType],
    queryFn: async () => {
      if (!selectedPeriod) return null;
      
      const params = new URLSearchParams();
      params.append('period', selectedPeriod);
      params.append('periodType', periodType);
      
      const response = await apiRequest('GET', `/api/sentiment/breakdown?${params}`);
      const data = await response.json();
      return data.breakdown;
    },
    enabled: !!selectedPeriod
  });

  // Mutation for analyzing text
  const analyzeMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await apiRequest('POST', '/api/sentiment/analyze', { 
        content: text,
        contentType: 'test'
      });
      const data = await response.json();
      return data.analysis as SentimentAnalysis;
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

  // Mutation for acknowledging alerts
  const acknowledgeAlertMutation = useMutation({
    mutationFn: async ({ alertId, status }: { alertId: string; status: 'acknowledged' | 'resolved' }) => {
      const response = await apiRequest('PATCH', `/api/sentiment/alerts/${alertId}`, { status });
      const data = await response.json();
      return data.alert;
    },
    onSuccess: (data, variables) => {
      toast({
        title: variables.status === 'acknowledged' ? "Alert acknowledged" : "Alert resolved",
        description: "Alert status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sentiment/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sentiment/dashboard'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update alert",
        description: error.message || "Could not update alert status",
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
            Sentiment Tracking Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor user satisfaction trends, identify pain points, and track sentiment changes
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
              refetchDashboard();
              refetchAlerts();
              toast({ title: "Refreshing data..." });
            }}
            data-testid="refresh-button"
          >
            <RefreshCwIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Active Alerts Section */}
      {activeAlerts && activeAlerts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BellIcon className="w-5 h-5" />
            Active Alerts ({activeAlerts.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {activeAlerts.slice(0, 4).map((alert) => (
              <Alert 
                key={alert.id} 
                className={`border-l-4 ${
                  alert.severity === 'critical' 
                    ? 'border-l-red-500' 
                    : alert.severity === 'high'
                    ? 'border-l-orange-500'
                    : alert.severity === 'medium'
                    ? 'border-l-yellow-500'
                    : 'border-l-blue-500'
                }`}
              >
                <AlertTriangleIcon className="h-4 w-4" />
                <div className="flex-1">
                  <AlertTitle className="flex items-center justify-between">
                    <span>{alert.message}</span>
                    <Badge variant={alert.severity === 'critical' ? 'destructive' : 'outline'}>
                      {alert.severity}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription className="mt-2 space-y-2">
                    {alert.alertType === 'sentiment_drop' && alert.metadata?.percentageChange && (
                      <div className="flex items-center gap-2 text-sm">
                        <TrendingDownIcon className="w-4 h-4 text-red-500" />
                        <span>{Math.abs(alert.metadata.percentageChange)}% drop detected</span>
                      </div>
                    )}
                    {alert.metadata?.relatedIssues && (
                      <div className="text-sm">
                        <span className="font-medium">Related issues:</span> {alert.metadata.relatedIssues.join(', ')}
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(alert.triggeredAt), 'MMM dd, HH:mm')}
                      </span>
                      {alert.status === 'active' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => acknowledgeAlertMutation.mutate({ 
                              alertId: alert.id, 
                              status: 'acknowledged' 
                            })}
                            data-testid={`acknowledge-alert-${alert.id}`}
                          >
                            <CheckCircleIcon className="w-3 h-3 mr-1" />
                            Acknowledge
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => acknowledgeAlertMutation.mutate({ 
                              alertId: alert.id, 
                              status: 'resolved' 
                            })}
                            data-testid={`resolve-alert-${alert.id}`}
                          >
                            <XCircleIcon className="w-3 h-3 mr-1" />
                            Resolve
                          </Button>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </div>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics Overview */}
      {dashboardData?.metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Average Sentiment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">
                  {dashboardData.metrics.avgSentiment > 0 ? '+' : ''}
                  {dashboardData.metrics.avgSentiment.toFixed(2)}
                </div>
                {dashboardData.metrics.percentageChange !== undefined && (
                  <div className={`flex items-center text-sm ${
                    dashboardData.metrics.percentageChange < 0 ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {dashboardData.metrics.percentageChange < 0 ? (
                      <ChevronDownIcon className="w-4 h-4" />
                    ) : (
                      <ChevronUpIcon className="w-4 h-4" />
                    )}
                    {Math.abs(dashboardData.metrics.percentageChange)}%
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Period: {dashboardData.metrics.period} ({dashboardData.metrics.periodType})
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total Analyzed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.metrics.totalItems}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Items in period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Alert Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {dashboardData.metrics.alertTriggered ? (
                  <>
                    <AlertCircleIcon className="w-5 h-5 text-orange-500" />
                    <span className="text-lg font-semibold text-orange-500">Active</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    <span className="text-lg font-semibold text-green-500">Normal</span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {activeAlerts?.length || 0} active alerts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Top Pain Point</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.metrics.painPoints && dashboardData.metrics.painPoints.length > 0 ? (
                <>
                  <div className="text-lg font-semibold truncate">
                    {dashboardData.metrics.painPoints[0].issue}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Impact: {dashboardData.metrics.painPoints[0].impact.toFixed(1)}%
                  </p>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No issues detected</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
              onPeriodChange={(period) => setPeriodType(period)}
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