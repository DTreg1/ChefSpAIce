import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, LineChart, TrendingUp, Activity, Users, DollarSign, RefreshCw } from "lucide-react";
import { InsightCard } from "@/components/analytics/InsightCard";
import { AnomalyAlert } from "@/components/analytics/AnomalyAlert";
import { InsightDigest } from "@/components/analytics/InsightDigest";
import { AskAnalytics } from "@/components/analytics/AskAnalytics";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import type { AnalyticsInsight } from "@shared/schema";

// Sample data generator for demonstration
function generateSampleData(metricName: string, days: number = 30) {
  const data = [];
  const baseValue = Math.floor(Math.random() * 1000) + 500;
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Add some variation and occasional spikes
    let value = baseValue + Math.floor(Math.random() * 200) - 100;
    
    // Create a spike on day 7 (Tuesday if today is Sunday)
    if (i === 7) {
      value = Math.floor(baseValue * 1.4); // 40% spike
    }
    
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.max(0, value)
    });
  }
  
  return data;
}

export default function AnalyticsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("7days");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Fetch insights
  const { data: insights = [], isLoading: insightsLoading, refetch: refetchInsights } = useQuery({
    queryKey: [API_ENDPOINTS.ai.analysis.insights.all, selectedCategory, selectedPeriod],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") params.append("category", selectedCategory);
      params.append("period", selectedPeriod);
      params.append("limit", "50");
      
      const response = await apiRequest(`${API_ENDPOINTS.ai.analysis.insights.all}?${params.toString()}`, "GET");
      return response as AnalyticsInsight[];
    }
  });

  // Fetch daily summary
  const { data: dailySummary = [] } = useQuery({
    queryKey: [API_ENDPOINTS.ai.analysis.insights.daily],
    queryFn: async () => {
      const response = await apiRequest(API_ENDPOINTS.ai.analysis.insights.daily, "GET");
      return response as AnalyticsInsight[];
    }
  });

  // Generate insight mutation
  const generateInsightMutation = useMutation({
    mutationFn: async (metricName: string) => {
      const dataPoints = generateSampleData(metricName, 30);
      return apiRequest(API_ENDPOINTS.ai.analysis.insights.generate, "POST", {
        metricName,
        dataPoints,
        period: "30 days"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ai.analysis.insights.all] });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.ai.analysis.insights.daily] });
    }
  });

  // Auto-generate sample insights on mount
  useEffect(() => {
    if (!insights || insights.length === 0) {
      // Generate sample insights for demonstration
      const sampleMetrics = ["website_traffic", "conversion_rate", "revenue", "user_engagement"];
      sampleMetrics.forEach(metric => {
        generateInsightMutation.mutate(metric);
      });
    }
  }, []);

  // Calculate stats
  const stats = {
    totalInsights: insights.length,
    anomalies: insights.filter((i: AnalyticsInsight) => i.insightType === "anomaly").length,
    unreadInsights: insights.filter((i: AnalyticsInsight) => !i.isRead).length,
    criticalInsights: insights.filter((i: AnalyticsInsight) => i.severity === "critical").length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Analytics Insights</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered insights to understand your data trends and patterns
          </p>
        </div>
        <Button 
          onClick={() => refetchInsights()}
          variant="outline"
          data-testid="button-refresh"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Anomaly Alert */}
      <AnomalyAlert insights={insights} />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold" data-testid="text-total-insights">{stats.totalInsights}</span>
              <Activity className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Anomalies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-anomalies">
                {stats.anomalies}
              </span>
              <TrendingUp className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold" data-testid="text-unread">{stats.unreadInsights}</span>
              <Badge variant="outline">New</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-critical">
                {stats.criticalInsights}
              </span>
              <Badge variant="destructive">High</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[180px]" data-testid="select-period">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]" data-testid="select-category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="trend">Trends</SelectItem>
            <SelectItem value="anomaly">Anomalies</SelectItem>
            <SelectItem value="prediction">Predictions</SelectItem>
            <SelectItem value="comparison">Comparisons</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          variant="outline"
          onClick={() => generateInsightMutation.mutate("website_traffic")}
          disabled={generateInsightMutation.isPending}
          data-testid="button-generate-sample"
        >
          Generate Sample Insight
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights" data-testid="tab-insights">All Insights</TabsTrigger>
          <TabsTrigger value="digest" data-testid="tab-digest">Daily Digest</TabsTrigger>
          <TabsTrigger value="ask" data-testid="tab-ask">Ask Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          {insightsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px] mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : insights.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No insights yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start generating insights to see AI-powered analysis of your metrics
                </p>
                <Button 
                  onClick={() => generateInsightMutation.mutate("website_traffic")}
                  disabled={generateInsightMutation.isPending}
                >
                  Generate First Insight
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.map((insight: AnalyticsInsight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="digest">
          <InsightDigest insights={dailySummary} />
        </TabsContent>

        <TabsContent value="ask">
          <AskAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}