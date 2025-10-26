import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line,
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Gauge,
  Timer,
  Globe,
  Smartphone,
  Monitor,
  AlertCircle,
  Activity,
  Zap,
  Eye,
  Clock,
  RefreshCw,
  BarChart3,
  Calendar,
  Server,
  CheckCircle,
  XCircle,
  Wifi,
  MessageSquare,
  Star,
  ThumbsUp,
  PieChartIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WebVital } from "@shared/schema";

const COLORS = {
  good: "#10b981",
  needsImprovement: "#f59e0b", 
  poor: "#ef4444",
  chart: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"],
  metrics: {
    LCP: "#8b5cf6",
    FCP: "#3b82f6", 
    CLS: "#10b981",
    TTFB: "#ec4899",
    INP: "#f59e0b",
    FID: "#06b6d4"
  }
};

// Thresholds for Web Vitals (in milliseconds or score)
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  CLS: { good: 0.1, poor: 0.25 },  // Cumulative Layout Shift
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  INP: { good: 200, poor: 500 },   // Interaction to Next Paint
  FID: { good: 100, poor: 300 }    // First Input Delay
};

const getMetricIcon = (metricName: string) => {
  switch (metricName) {
    case 'LCP': return <Eye className="w-4 h-4" />;
    case 'FCP': return <Zap className="w-4 h-4" />;
    case 'CLS': return <Activity className="w-4 h-4" />;
    case 'TTFB': return <Clock className="w-4 h-4" />;
    case 'INP': return <Timer className="w-4 h-4" />;
    default: return <Gauge className="w-4 h-4" />;
  }
};

const formatMetricValue = (name: string, value: number): string => {
  if (!value && value !== 0) return "N/A";
  
  switch (name) {
    case 'CLS':
      return value.toFixed(3);
    case 'LCP':
    case 'FCP':
    case 'TTFB':
    case 'INP':
    case 'FID':
      return value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(2)}s`;
    default:
      return value.toFixed(0);
  }
};

const getMetricDescription = (name: string): string => {
  switch (name) {
    case 'LCP':
      return 'Measures loading performance - time until the largest content element is visible';
    case 'FCP':
      return 'Time until the first content is painted on screen';
    case 'CLS':
      return 'Measures visual stability - unexpected layout shifts';
    case 'TTFB':
      return 'Time between request and first byte of response';
    case 'INP':
      return 'Responsiveness to user interactions throughout the page lifetime';
    case 'FID':
      return 'Time from user interaction to browser response';
    default:
      return '';
  }
};

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState(7);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // Fetch all metrics stats
  const { data: allStats, isLoading: allStatsLoading, refetch: refetchAllStats } = useQuery<any>({
    queryKey: ["/api/analytics/stats", { days: timeRange }],
    refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30 seconds if enabled
  });

  // Fetch individual metric stats
  const { data: lcpStats } = useQuery<any>({
    queryKey: ["/api/analytics/stats", { metric: "LCP", days: timeRange }],
  });
  
  const { data: fcpStats } = useQuery<any>({
    queryKey: ["/api/analytics/stats", { metric: "FCP", days: timeRange }],
  });
  
  const { data: clsStats } = useQuery<any>({
    queryKey: ["/api/analytics/stats", { metric: "CLS", days: timeRange }],
  });
  
  const { data: ttfbStats } = useQuery<any>({
    queryKey: ["/api/analytics/stats", { metric: "TTFB", days: timeRange }],
  });
  
  const { data: inpStats } = useQuery<any>({
    queryKey: ["/api/analytics/stats", { metric: "INP", days: timeRange }],
  });

  // Fetch API Health data
  const { data: apiHealthData } = useQuery<any>({
    queryKey: ["/api/analytics/api-health", { days: timeRange }],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch Feedback Analytics data
  const { data: feedbackData } = useQuery<any>({
    queryKey: ["/api/feedback/analytics/summary", { days: timeRange }],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Combine all metric stats
  const metricsData = useMemo(() => {
    return [
      { name: 'LCP', stats: lcpStats, threshold: THRESHOLDS.LCP },
      { name: 'FCP', stats: fcpStats, threshold: THRESHOLDS.FCP },
      { name: 'CLS', stats: clsStats, threshold: THRESHOLDS.CLS },
      { name: 'TTFB', stats: ttfbStats, threshold: THRESHOLDS.TTFB },
      { name: 'INP', stats: inpStats, threshold: THRESHOLDS.INP }
    ].filter(m => m.stats);
  }, [lcpStats, fcpStats, clsStats, ttfbStats, inpStats]);

  // Calculate overall performance score
  const performanceScore = useMemo(() => {
    if (!metricsData.length) return 0;
    
    const totalGood = metricsData.reduce((sum, m) => sum + (m.stats?.goodCount || 0), 0);
    const totalCount = metricsData.reduce((sum, m) => sum + (m.stats?.count || 0), 0);
    
    return totalCount > 0 ? Math.round((totalGood / totalCount) * 100) : 0;
  }, [metricsData]);

  // Prepare chart data
  const distributionData = useMemo(() => {
    if (!allStats) return [];
    
    return [
      { name: 'Good', value: allStats.goodCount || 0, color: COLORS.good },
      { name: 'Needs Improvement', value: allStats.needsImprovementCount || 0, color: COLORS.needsImprovement },
      { name: 'Poor', value: allStats.poorCount || 0, color: COLORS.poor }
    ].filter(item => item.value > 0);
  }, [allStats]);

  const radarData = useMemo(() => {
    return metricsData.map(m => ({
      metric: m.name,
      value: m.stats ? (m.stats.goodCount / m.stats.count) * 100 : 0,
      fullMark: 100
    }));
  }, [metricsData]);

  if (allStatsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4 bg-gradient-to-r from-blue-950/50 to-purple-950/30 dark:from-blue-950/20 dark:to-purple-950/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Analytics Dashboard</h2>
            <p className="text-sm text-muted-foreground">Monitor your app's performance and user experience</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              data-testid="button-auto-refresh"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", autoRefresh && "animate-spin")} />
              {autoRefresh ? "Auto-refreshing" : "Auto-refresh"}
            </Button>
            <Tabs value={timeRange.toString()} onValueChange={(v) => setTimeRange(parseInt(v))}>
              <TabsList>
                <TabsTrigger value="1">24h</TabsTrigger>
                <TabsTrigger value="7">7 Days</TabsTrigger>
                <TabsTrigger value="30">30 Days</TabsTrigger>
                <TabsTrigger value="90">90 Days</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Overall Performance Score */}
          <Card className="glass-morph">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Overall Performance</CardTitle>
                  <CardDescription>Based on Core Web Vitals</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {performanceScore}%
                  </div>
                  <Badge 
                    variant={performanceScore >= 75 ? "default" : performanceScore >= 50 ? "secondary" : "destructive"}
                    className="mt-1"
                  >
                    {performanceScore >= 75 ? "Good" : performanceScore >= 50 ? "Needs Improvement" : "Poor"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Progress 
                value={performanceScore} 
                className="h-3"
                style={{
                  background: `linear-gradient(to right, 
                    ${COLORS.poor} 0%, 
                    ${COLORS.needsImprovement} 50%, 
                    ${COLORS.good} 100%)`
                }}
              />
            </CardContent>
          </Card>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {metricsData.map((metric) => {
              const isGood = metric.stats && metric.stats.average <= metric.threshold.good;
              const isPoor = metric.stats && metric.stats.average >= metric.threshold.poor;
              
              return (
                <Card 
                  key={metric.name}
                  className={cn("glass-morph hover-elevate cursor-pointer", 
                    selectedMetric === metric.name && "ring-2 ring-primary"
                  )}
                  onClick={() => setSelectedMetric(selectedMetric === metric.name ? null : metric.name)}
                  data-testid={`card-metric-${metric.name}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                      {getMetricIcon(metric.name)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={cn("text-2xl font-bold", 
                      isGood ? "text-green-600" : isPoor ? "text-red-600" : "text-amber-600"
                    )}>
                      {formatMetricValue(metric.name, metric.stats?.average || 0)}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">
                        p75: {formatMetricValue(metric.name, metric.stats?.p75 || 0)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {metric.stats?.count || 0} samples
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Selected Metric Details */}
          {selectedMetric && (
            <Card className="glass-morph">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getMetricIcon(selectedMetric)}
                  {selectedMetric} Details
                </CardTitle>
                <CardDescription>
                  {getMetricDescription(selectedMetric)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Performance Distribution</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Good</span>
                        <span className="font-medium text-green-600">
                          {metricsData.find(m => m.name === selectedMetric)?.stats?.goodCount || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Needs Improvement</span>
                        <span className="font-medium text-amber-600">
                          {metricsData.find(m => m.name === selectedMetric)?.stats?.needsImprovementCount || 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Poor</span>
                        <span className="font-medium text-red-600">
                          {metricsData.find(m => m.name === selectedMetric)?.stats?.poorCount || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Percentiles</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Average</span>
                        <span className="font-medium">
                          {formatMetricValue(selectedMetric, 
                            metricsData.find(m => m.name === selectedMetric)?.stats?.average || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">75th Percentile</span>
                        <span className="font-medium">
                          {formatMetricValue(selectedMetric, 
                            metricsData.find(m => m.name === selectedMetric)?.stats?.p75 || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">95th Percentile</span>
                        <span className="font-medium">
                          {formatMetricValue(selectedMetric, 
                            metricsData.find(m => m.name === selectedMetric)?.stats?.p95 || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Thresholds</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Good ≤</span>
                        <span className="font-medium text-green-600">
                          {formatMetricValue(selectedMetric, THRESHOLDS[selectedMetric as keyof typeof THRESHOLDS]?.good || 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Poor ≥</span>
                        <span className="font-medium text-red-600">
                          {formatMetricValue(selectedMetric, THRESHOLDS[selectedMetric as keyof typeof THRESHOLDS]?.poor || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Distribution */}
            <Card className="glass-morph">
              <CardHeader>
                <CardTitle>Performance Distribution</CardTitle>
                <CardDescription>Overall Web Vitals ratings</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Metrics Comparison */}
            <Card className="glass-morph">
              <CardHeader>
                <CardTitle>Metrics Comparison</CardTitle>
                <CardDescription>Average values for each metric</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metricsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        formatMetricValue(name, value),
                        name
                      ]}
                    />
                    <Bar 
                      dataKey="stats.average" 
                      name="Average"
                      fill={COLORS.chart[0]}
                    />
                    <Bar 
                      dataKey="stats.p75" 
                      name="75th Percentile"
                      fill={COLORS.chart[1]}
                    />
                    <Bar 
                      dataKey="stats.p95" 
                      name="95th Percentile"
                      fill={COLORS.chart[2]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance Radar */}
            <Card className="glass-morph">
              <CardHeader>
                <CardTitle>Performance Radar</CardTitle>
                <CardDescription>Good performance percentage by metric</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar 
                      name="Performance" 
                      dataKey="value" 
                      stroke={COLORS.chart[0]}
                      fill={COLORS.chart[0]} 
                      fillOpacity={0.6} 
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card className="glass-morph">
              <CardHeader>
                <CardTitle>Summary Statistics</CardTitle>
                <CardDescription>Last {timeRange} days overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Total Measurements</span>
                    </div>
                    <span className="font-bold text-lg">
                      {allStats?.count || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Good Performance</span>
                    </div>
                    <span className="font-bold text-lg text-green-600">
                      {allStats?.goodCount || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm">Needs Improvement</span>
                    </div>
                    <span className="font-bold text-lg text-amber-600">
                      {allStats?.needsImprovementCount || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-600" />
                      <span className="text-sm">Poor Performance</span>
                    </div>
                    <span className="font-bold text-lg text-red-600">
                      {allStats?.poorCount || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* API Health Monitoring */}
          {apiHealthData && (
            <>
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">API Health Monitoring</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="glass-morph hover-elevate">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Total API Calls</CardTitle>
                        <Server className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {apiHealthData.summary?.totalApiCalls || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last {timeRange} days
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="glass-morph hover-elevate">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {apiHealthData.summary?.overallSuccessRate || 0}%
                      </div>
                      <Progress 
                        value={apiHealthData.summary?.overallSuccessRate || 0} 
                        className="mt-2 h-2"
                      />
                    </CardContent>
                  </Card>

                  <Card className="glass-morph hover-elevate">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Successful Calls</CardTitle>
                        <Wifi className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {apiHealthData.summary?.totalSuccessful || 0}
                      </div>
                      <p className="text-xs text-green-600">
                        ↑ Working properly
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="glass-morph hover-elevate">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Failed Calls</CardTitle>
                        <XCircle className="w-4 h-4 text-red-600" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {apiHealthData.summary?.totalFailed || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Requires attention
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Individual API Health */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  <Card className="glass-morph">
                    <CardHeader>
                      <CardTitle>API Performance by Service</CardTitle>
                      <CardDescription>Success and error rates per API</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={apiHealthData.apis || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 12 }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar 
                            dataKey="successfulCalls" 
                            name="Successful" 
                            fill={COLORS.good}
                            stackId="a"
                          />
                          <Bar 
                            dataKey="failedCalls" 
                            name="Failed" 
                            fill={COLORS.poor}
                            stackId="a"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="glass-morph">
                    <CardHeader>
                      <CardTitle>API Health Status</CardTitle>
                      <CardDescription>Current status of external APIs</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {(apiHealthData.apis || []).map((api: { apiName: string; totalCalls: number; successRate: number }) => {
                          const isHealthy = api.successRate >= 95;
                          const isWarning = api.successRate >= 80 && api.successRate < 95;
                          const getApiDisplayName = (name: string) => {
                            switch(name) {
                              case 'barcode_lookup': return 'Barcode Lookup';
                              case 'open_food_facts': return 'Open Food Facts';
                              case 'usda_fdc': return 'USDA Food Database';
                              case 'openai': return 'OpenAI (Chef AI)';
                              default: return name;
                            }
                          };
                          
                          return (
                            <div key={api.apiName} className="flex items-center justify-between p-3 rounded-lg border border-border">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-3 h-3 rounded-full",
                                  isHealthy ? "bg-green-600" : isWarning ? "bg-amber-600" : "bg-red-600"
                                )}>
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{getApiDisplayName(api.apiName)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {api.totalCalls} calls • {api.successRate}% success
                                  </p>
                                </div>
                              </div>
                              <Badge 
                                variant={isHealthy ? "default" : isWarning ? "secondary" : "destructive"}
                              >
                                {isHealthy ? "Healthy" : isWarning ? "Warning" : "Critical"}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}

          {/* Feedback Analytics */}
          {feedbackData && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Feedback Analytics</h3>
              
              {/* Feedback Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card className="glass-morph hover-elevate">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {feedbackData.totalFeedback || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last {timeRange} days
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-morph hover-elevate">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                      <Star className="w-4 h-4 text-yellow-500" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-500">
                      {feedbackData.averageRating ? feedbackData.averageRating.toFixed(1) : "N/A"}
                    </div>
                    <div className="flex gap-0.5 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "w-3 h-3",
                            feedbackData.averageRating && star <= Math.round(feedbackData.averageRating)
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-muted-foreground"
                          )}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-morph hover-elevate">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Positive Feedback</CardTitle>
                      <ThumbsUp className="w-4 h-4 text-green-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {feedbackData.sentimentDistribution?.positive || 0}
                    </div>
                    <Progress 
                      value={feedbackData.totalFeedback > 0 
                        ? (feedbackData.sentimentDistribution?.positive || 0) / feedbackData.totalFeedback * 100
                        : 0} 
                      className="mt-2 h-2"
                    />
                  </CardContent>
                </Card>

                <Card className="glass-morph hover-elevate">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {feedbackData.topIssues?.filter((i: { priority: string }) => i.priority === "critical").length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Requires immediate attention
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Feedback Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sentiment Distribution */}
                <Card className="glass-morph">
                  <CardHeader>
                    <CardTitle>Sentiment Distribution</CardTitle>
                    <CardDescription>User sentiment breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { 
                              name: 'Positive', 
                              value: feedbackData.sentimentDistribution?.positive || 0,
                              color: COLORS.good
                            },
                            { 
                              name: 'Neutral', 
                              value: feedbackData.sentimentDistribution?.neutral || 0,
                              color: COLORS.needsImprovement
                            },
                            { 
                              name: 'Negative', 
                              value: feedbackData.sentimentDistribution?.negative || 0,
                              color: COLORS.poor
                            }
                          ].filter(item => item.value > 0)}
                          dataKey="value"
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                        >
                          {[
                            { color: COLORS.good },
                            { color: COLORS.needsImprovement },
                            { color: COLORS.poor }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Feedback Types */}
                <Card className="glass-morph">
                  <CardHeader>
                    <CardTitle>Feedback by Type</CardTitle>
                    <CardDescription>Categories of user feedback</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                        data={Object.entries(feedbackData.typeDistribution || {}).map(([type, count]) => ({
                          type: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' '),
                          count
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="type" 
                          tick={{ fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Recent Trends */}
                {feedbackData.recentTrends && feedbackData.recentTrends.length > 0 && (
                  <Card className="glass-morph">
                    <CardHeader>
                      <CardTitle>Feedback Trends</CardTitle>
                      <CardDescription>Daily feedback volume</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={feedbackData.recentTrends}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                          />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#8884d8" 
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Top Issues */}
                {feedbackData.topIssues && feedbackData.topIssues.length > 0 && (
                  <Card className="glass-morph">
                    <CardHeader>
                      <CardTitle>Top Issues</CardTitle>
                      <CardDescription>Most common feedback categories</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {feedbackData.topIssues.slice(0, 5).map((issue: any, index: number) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                issue.priority === "critical" ? "bg-red-600" :
                                issue.priority === "high" ? "bg-orange-600" :
                                issue.priority === "medium" ? "bg-yellow-600" :
                                "bg-blue-600"
                              )} />
                              <div>
                                <p className="text-sm font-medium capitalize">
                                  {issue.category.replace(/_/g, ' ')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {issue.count} reports
                                </p>
                              </div>
                            </div>
                            <Badge variant={
                              issue.priority === "critical" ? "destructive" :
                              issue.priority === "high" ? "secondary" :
                              "default"
                            }>
                              {issue.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Tips and Recommendations */}
          <Card className="glass-morph">
            <CardHeader>
              <CardTitle>Performance Tips</CardTitle>
              <CardDescription>Recommendations based on your metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {metricsData.map((metric) => {
                  const isPoor = metric.stats && metric.stats.average >= metric.threshold.poor;
                  const isNeedsImprovement = metric.stats && 
                    metric.stats.average > metric.threshold.good && 
                    metric.stats.average < metric.threshold.poor;
                  
                  if (!isPoor && !isNeedsImprovement) return null;
                  
                  return (
                    <div key={metric.name} className="flex gap-3 p-3 rounded-lg border border-border">
                      <AlertCircle className={cn("w-5 h-5 mt-0.5", 
                        isPoor ? "text-red-600" : "text-amber-600"
                      )} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{metric.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {metric.name === 'LCP' && "Optimize images, use CDN, implement lazy loading"}
                          {metric.name === 'FCP' && "Reduce server response time, optimize critical CSS"}
                          {metric.name === 'CLS' && "Set size attributes on images, avoid dynamic content above the fold"}
                          {metric.name === 'TTFB' && "Optimize server code, use caching, upgrade hosting"}
                          {metric.name === 'INP' && "Optimize JavaScript, break up long tasks, use web workers"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}