import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Bell, 
  Activity, 
  BarChart3,
  Calendar,
  ChevronRight,
  Zap,
  Info
} from "lucide-react";
import { TrendTimeline } from "@/components/trends/trend-timeline";
import { TrendingTopics } from "@/components/trends/trending-topics";
import { TrendAlert } from "@/components/trends/trend-alert";
import { TrendPredictor } from "@/components/trends/trend-predictor";
import { apiRequest } from "@/lib/queryClient";

interface Trend {
  id: string;
  trendName: string;
  trendType: string;
  status: string;
  strength: number;
  confidence: number;
  growthRate: number;
  startDate: string;
  peakDate?: string;
  dataPoints?: any;
  interpretation?: string;
  businessImpact?: string;
  recommendations?: string[];
  metadata?: any;
}

interface TrendAlert {
  id: string;
  trendId: string;
  userId: string;
  alertType: string;
  conditions: any;
  isActive: boolean;
  createdAt: string;
  acknowledgedAt?: string;
}

export default function TrendsDashboard() {
  const { toast } = useToast();
  const [selectedTimeWindow, setSelectedTimeWindow] = useState<string>("7days");
  const [selectedDataSource, setSelectedDataSource] = useState<string>("all");
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);

  // Fetch current trends
  const { data: currentTrends, isLoading: loadingCurrent } = useQuery<{ trends: Trend[] }>({
    queryKey: [API_ENDPOINTS.ai.analysis.trends.current],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch emerging trends
  const { data: emergingTrends, isLoading: loadingEmerging } = useQuery<{ trends: Trend[] }>({
    queryKey: [API_ENDPOINTS.ai.analysis.trends.emerging],
    refetchInterval: 60000,
  });

  // Fetch user's trend alerts
  const { data: userAlerts, isLoading: loadingAlerts } = useQuery<{ alerts: TrendAlert[] }>({
    queryKey: [`${API_ENDPOINTS.ai.analysis.trends.current}/alerts`],
  });

  // Mutation to trigger trend analysis
  const analyzeTrends = useMutation({
    mutationFn: async (params: any) => {
      return apiRequest(API_ENDPOINTS.ai.analysis.trends.analyze, "POST", params);
    },
    onSuccess: (data) => {
      toast({
        title: "Analysis Complete",
        description: `Detected ${data.trends?.length || 0} new trends`,
      });
      // Invalidate all trend-related queries to refresh the dashboard
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ai.analysis.trends.current] });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ai.analysis.trends.emerging] });
      queryClient.invalidateQueries({ queryKey: [`${API_ENDPOINTS.ai.analysis.trends.current}/alerts`] });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze trends",
        variant: "destructive",
      });
    },
  });

  // Mutation to subscribe to alerts
  const subscribeToAlerts = useMutation({
    mutationFn: async (params: any) => {
      return apiRequest(`${API_ENDPOINTS.ai.analysis.trends.current}/subscribe`, "POST", params);
    },
    onSuccess: () => {
      toast({
        title: "Subscribed",
        description: "You'll be notified when this trend condition is met",
      });
      queryClient.invalidateQueries({ queryKey: [`${API_ENDPOINTS.ai.analysis.trends.current}/alerts`] });
    },
    onError: (error: any) => {
      toast({
        title: "Subscription Failed",
        description: error.message || "Failed to subscribe to alerts",
        variant: "destructive",
      });
    },
  });

  // Trigger analysis
  const handleAnalyze = () => {
    const timeMapping: Record<string, any> = {
      "24hours": { value: 24, unit: "hours" },
      "7days": { value: 7, unit: "days" },
      "30days": { value: 30, unit: "days" },
      "3months": { value: 3, unit: "months" },
    };

    analyzeTrends.mutate({
      dataSource: selectedDataSource,
      timeWindow: timeMapping[selectedTimeWindow],
      minSampleSize: 50,
      includeInterpretation: true,
    });
  };

  // Get trend icon
  const getTrendIcon = (trend: Trend) => {
    if (trend.growthRate > 20) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend.growthRate < -20) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Activity className="w-4 h-4 text-blue-500" />;
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      emerging: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      peaking: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      declining: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      ended: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Trend Detection Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor emerging patterns, behaviors, and topics across your data
        </p>
      </div>

      {/* Controls */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Time Window</label>
              <Select value={selectedTimeWindow} onValueChange={setSelectedTimeWindow}>
                <SelectTrigger data-testid="select-time-window">
                  <SelectValue placeholder="Select time window" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24hours">Last 24 Hours</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Data Source</label>
              <Select value={selectedDataSource} onValueChange={setSelectedDataSource}>
                <SelectTrigger data-testid="select-data-source">
                  <SelectValue placeholder="Select data source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="analytics">Analytics Events</SelectItem>
                  <SelectItem value="feedback">User Feedback</SelectItem>
                  <SelectItem value="inventory">Inventory Changes</SelectItem>
                  <SelectItem value="recipes">Recipe Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleAnalyze}
              disabled={analyzeTrends.isPending}
              data-testid="button-analyze-trends"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {analyzeTrends.isPending ? "Analyzing..." : "Analyze Trends"}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                subscribeToAlerts.mutate({
                  alertType: "emergence",
                  conditions: {
                    minGrowthRate: 100,
                    minConfidence: 0.7,
                  },
                  notificationChannels: ["in-app", "email"],
                });
              }}
              data-testid="button-subscribe-alerts"
            >
              <Bell className="w-4 h-4 mr-2" />
              Subscribe to Alerts
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="emerging" data-testid="tab-emerging">Emerging</TabsTrigger>
          <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
          <TabsTrigger value="predictions" data-testid="tab-predictions">Predictions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Key Metrics */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Trends</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {currentTrends?.trends?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently monitoring
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Emerging Trends</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {emergingTrends?.trends?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Newly detected patterns
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {userAlerts?.alerts?.filter((a: TrendAlert) => a.isActive).length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Notification subscriptions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Current Trends List */}
          <Card>
            <CardHeader>
              <CardTitle>Current Active Trends</CardTitle>
              <CardDescription>
                Trends currently showing significant activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCurrent ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (currentTrends?.trends?.length || 0) > 0 ? (
                <div className="space-y-2">
                  {currentTrends?.trends?.map((trend: Trend) => (
                    <div
                      key={trend.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer"
                      onClick={() => setSelectedTrend(trend)}
                      data-testid={`trend-item-${trend.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {getTrendIcon(trend)}
                        <div>
                          <h4 className="font-medium">{trend.trendName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {trend.growthRate > 0 ? "+" : ""}{trend.growthRate.toFixed(1)}% growth
                            • {(trend.confidence * 100).toFixed(0)}% confidence
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(trend.status)}>
                          {trend.status}
                        </Badge>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No active trends detected. Run analysis to discover patterns.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Trending Topics Component */}
          <TrendingTopics 
            trends={currentTrends?.trends || []}
            onTrendClick={(trend: any) => setSelectedTrend(trend as Trend)}
          />

          {/* Alerts Component */}
          {(userAlerts?.alerts?.length || 0) > 0 && (
            <TrendAlert alerts={userAlerts?.alerts || []} />
          )}
        </TabsContent>

        {/* Emerging Tab */}
        <TabsContent value="emerging" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Newly Detected Emerging Trends</CardTitle>
              <CardDescription>
                Recently discovered patterns showing significant growth
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingEmerging ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : (emergingTrends?.trends?.length || 0) > 0 ? (
                <div className="space-y-4">
                  {emergingTrends?.trends?.map((trend: Trend) => (
                    <Card key={trend.id} className="hover-elevate">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {getTrendIcon(trend)}
                            {trend.trendName}
                          </CardTitle>
                          <Badge className={getStatusColor(trend.status)}>
                            {trend.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Growth Rate</p>
                            <p className="text-lg font-semibold">
                              {trend.growthRate > 0 ? "+" : ""}{trend.growthRate.toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Confidence</p>
                            <p className="text-lg font-semibold">
                              {(trend.confidence * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Started</p>
                            <p className="text-lg font-semibold">
                              {new Date(trend.startDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        {trend.interpretation && (
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>AI Interpretation</AlertTitle>
                            <AlertDescription>
                              {trend.interpretation}
                            </AlertDescription>
                          </Alert>
                        )}

                        {trend.recommendations && trend.recommendations.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-sm font-medium mb-2">Recommendations</h5>
                            <ul className="list-disc list-inside space-y-1">
                              {trend.recommendations.map((rec: string, idx: number) => (
                                <li key={idx} className="text-sm text-muted-foreground">
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="pt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTrend(trend)}
                          data-testid={`button-view-trend-${trend.id}`}
                        >
                          View Details
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No emerging trends detected yet. Trends with 300%+ growth will appear here.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <TrendTimeline
            trends={[
              ...(currentTrends?.trends || []),
              ...(emergingTrends?.trends || []),
            ]}
          />
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions">
          <TrendPredictor
            currentTrends={currentTrends?.trends || []}
            historicalData={{}}
          />
        </TabsContent>
      </Tabs>

      {/* Selected Trend Detail Modal */}
      {selectedTrend && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedTrend.trendName}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTrend(null)}
                  data-testid="button-close-detail"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{selectedTrend.trendType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={getStatusColor(selectedTrend.status)}>
                      {selectedTrend.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Growth Rate</p>
                    <p className="font-medium">
                      {selectedTrend.growthRate > 0 ? "+" : ""}{selectedTrend.growthRate.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p className="font-medium">{(selectedTrend.confidence * 100).toFixed(0)}%</p>
                  </div>
                </div>

                {selectedTrend.interpretation && (
                  <div>
                    <h4 className="font-medium mb-2">Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedTrend.interpretation}
                    </p>
                  </div>
                )}

                {selectedTrend.businessImpact && (
                  <div>
                    <h4 className="font-medium mb-2">Business Impact</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedTrend.businessImpact}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      subscribeToAlerts.mutate({
                        alertType: "threshold",
                        conditions: {
                          trendTypes: [selectedTrend.trendType],
                          minGrowthRate: selectedTrend.growthRate,
                        },
                        notificationChannels: ["in-app"],
                      });
                      setSelectedTrend(null);
                    }}
                    data-testid="button-subscribe-trend"
                  >
                    <Bell className="w-4 h-4 mr-2" />
                    Subscribe to Updates
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedTrend(null)}
                    data-testid="button-close"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}