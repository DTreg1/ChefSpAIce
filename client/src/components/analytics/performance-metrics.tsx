/**
 * PerformanceMetrics Component
 *
 * Dashboard for viewing detailed excerpt performance analytics
 * with charts, trends, and actionable insights.
 *
 * @module client/src/components/performance-metrics
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  MousePointer,
  Share2,
  Target,
  Award,
  Calendar,
  Download,
  Filter,
  BarChart3,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface PerformanceMetricsProps {
  excerptId?: string;
  contentId?: string;
  data?: {
    daily: Array<{
      date: string;
      views: number;
      clicks: number;
      shares: number;
      ctr: number;
    }>;
    aggregate: {
      totalViews: number;
      totalClicks: number;
      totalShares: number;
      totalEngagements: number;
      averageCTR: number;
      averageShareRate: number;
      conversionRate: number;
    };
    platforms?: Record<
      string,
      {
        views: number;
        clicks: number;
        shares: number;
      }
    >;
  };
  onExport?: () => void;
  onFilter?: (filters: any) => void;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function PerformanceMetrics({
  excerptId,
  contentId,
  data,
  onExport,
  onFilter,
}: PerformanceMetricsProps) {
  if (!data) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No performance data available</p>
          <p className="text-sm text-muted-foreground mt-2">
            Start tracking excerpt performance to see metrics
          </p>
        </CardContent>
      </Card>
    );
  }

  const { daily = [], aggregate, platforms = {} } = data;

  // Calculate trends
  const last7Days = daily.slice(-7);
  const previous7Days = daily.slice(-14, -7);
  const ctrTrend = calculateTrend(
    last7Days.reduce((sum, d) => sum + d.ctr, 0) /
      Math.max(last7Days.length, 1),
    previous7Days.reduce((sum, d) => sum + d.ctr, 0) /
      Math.max(previous7Days.length, 1),
  );

  function calculateTrend(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  // Prepare platform data for pie chart
  const platformData = Object.entries(platforms).map(([platform, stats]) => ({
    name: platform.charAt(0).toUpperCase() + platform.slice(1),
    value: stats.views,
    clicks: stats.clicks,
    shares: stats.shares,
  }));

  // Format daily data for charts
  const chartData = daily.map((day) => ({
    ...day,
    date: new Date(day.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    ctrPercent: day.ctr * 100,
  }));

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-muted-foreground" />;
  };

  const getPerformanceRating = (ctr: number): string => {
    if (ctr >= 0.2) return "Excellent";
    if (ctr >= 0.15) return "Good";
    if (ctr >= 0.1) return "Average";
    if (ctr >= 0.05) return "Below Average";
    return "Poor";
  };

  const performanceRating = getPerformanceRating(aggregate.averageCTR);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregate.totalViews.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Impressions across all platforms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Click-Through Rate
            </CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {(aggregate.averageCTR * 100).toFixed(1)}%
              </div>
              {getTrendIcon(ctrTrend)}
              <span
                className={`text-xs ${ctrTrend > 0 ? "text-green-500" : ctrTrend < 0 ? "text-red-500" : "text-muted-foreground"}`}
              >
                {ctrTrend > 0 ? "+" : ""}
                {ctrTrend.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={Math.min(((aggregate.averageCTR * 100) / 0.2) * 100, 100)}
              className="mt-2 h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Target: 20% • Rating: {performanceRating}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregate.totalClicks.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {aggregate.totalViews > 0
                ? `${((aggregate.totalClicks / aggregate.totalViews) * 100).toFixed(1)}% conversion`
                : "No conversions yet"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Social Shares</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregate.totalShares.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {(aggregate.averageShareRate * 100).toFixed(1)}% share rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            {onFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFilter({})}
                data-testid="button-filter"
              >
                <Filter className="h-4 w-4 mr-1" />
                Filter
              </Button>
            )}
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                data-testid="button-export"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Click-through rate over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: "currentColor" }}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "currentColor" }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ctrPercent"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", strokeWidth: 2 }}
                    name="CTR %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
              <CardDescription>
                Views, clicks, and shares over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    tick={{ fill: "currentColor" }}
                  />
                  <YAxis className="text-xs" tick={{ fill: "currentColor" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    name="Views"
                  />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stackId="1"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.6}
                    name="Clicks"
                  />
                  <Area
                    type="monotone"
                    dataKey="shares"
                    stackId="1"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.6}
                    name="Shares"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Distribution</CardTitle>
              <CardDescription>
                Performance across different social platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              {platformData.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={platformData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {platformData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-3">
                    {platformData.map((platform, index) => (
                      <div
                        key={platform.name}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <span className="font-medium">{platform.name}</span>
                        </div>
                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">
                            CTR:{" "}
                            {platform.clicks && platform.value
                              ? (
                                  (platform.clicks / platform.value) *
                                  100
                                ).toFixed(1)
                              : "0.0"}
                            %
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {platform.value} views • {platform.clicks} clicks
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No platform-specific data available
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {aggregate.averageCTR >= 0.2 ? (
            <Alert>
              <AlertDescription>
                🎉 <strong>Excellent performance!</strong> Your excerpt is
                achieving the target 20% CTR. Consider using this as a template
                for future excerpts.
              </AlertDescription>
            </Alert>
          ) : aggregate.averageCTR >= 0.15 ? (
            <Alert>
              <AlertDescription>
                ✅ <strong>Good performance.</strong> Your excerpt is performing
                well with {(aggregate.averageCTR * 100).toFixed(1)}% CTR. Minor
                optimizations could help reach the 20% target.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertDescription>
                ⚠️ <strong>Room for improvement.</strong> Current CTR is{" "}
                {(aggregate.averageCTR * 100).toFixed(1)}%. Consider A/B testing
                different variants or optimizing the excerpt.
              </AlertDescription>
            </Alert>
          )}

          {aggregate.averageShareRate > 0.05 && (
            <Badge className="bg-blue-500 text-white">
              High viral potential -{" "}
              {(aggregate.averageShareRate * 100).toFixed(1)}% share rate
            </Badge>
          )}

          {ctrTrend > 10 && (
            <Badge className="bg-green-500 text-white">
              Performance improving - {ctrTrend.toFixed(0)}% increase this week
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
