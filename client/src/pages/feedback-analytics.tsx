import { useState } from "react";
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
  ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  MessageSquare, 
  Star, 
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Filter,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedbackAnalytics, Feedback } from "@shared/schema";

const COLORS = {
  positive: "#10b981",
  neutral: "#f59e0b",
  negative: "#ef4444",
  chart: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]
};

export default function FeedbackAnalyticsPage() {
  const [timeRange, setTimeRange] = useState(30);
  const [selectedType, setSelectedType] = useState<string>("all");

  const { data: analytics, isLoading: analyticsLoading } = useQuery<FeedbackAnalytics>({
    queryKey: ["/api/feedback/analytics/summary", { days: timeRange }],
  });

  const { data: recentFeedback, isLoading: feedbackLoading } = useQuery<Feedback[]>({
    queryKey: ["/api/feedback", { limit: 20 }],
  });

  if (analyticsLoading || feedbackLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* Header skeleton */}
        <div className="border-b border-border p-4 bg-gradient-to-r from-lime-950/50 to-green-50/30 dark:from-lime-50/20 dark:to-green-950/20">
          <div className="max-w-7xl mx-auto animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
            {/* Metrics cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
            
            {/* Charts skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const sentimentData = [
    { name: "Positive", value: analytics.avgSentiment > 0.6 ? Math.round(analytics.avgSentiment * 100) : 0, color: COLORS.positive },
    { name: "Neutral", value: analytics.avgSentiment >= 0.4 && analytics.avgSentiment <= 0.6 ? Math.round(analytics.avgSentiment * 100) : 0, color: COLORS.neutral },
    { name: "Negative", value: analytics.avgSentiment < 0.4 ? Math.round((1 - analytics.avgSentiment) * 100) : 0, color: COLORS.negative }
  ];

  const typeData = Object.entries(analytics.byType).map(([type, count]) => ({
    name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count
  }));

  const statusData = Object.entries(analytics.byStatus).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' '),
    count,
    color: status === 'resolved' ? '#10b981' : status === 'in_review' ? '#f59e0b' : '#3b82f6'
  }));

  const sentimentPercentage = analytics.totalFeedback > 0
    ? Math.round(analytics.avgSentiment * 100)
    : 0;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border p-4 bg-gradient-to-r from-lime-950/50 to-green-50/30 dark:from-lime-50/20 dark:to-green-950/20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Feedback Analytics</h2>
            <p className="text-sm text-muted-foreground">Monitor user feedback and sentiment trends</p>
          </div>
          <div className="flex gap-2">
            <Tabs value={timeRange.toString()} onValueChange={(v) => setTimeRange(parseInt(v))}>
              <TabsList>
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
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="glass-morph hover-elevate">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalFeedback}</div>
                <p className="text-xs text-muted-foreground">Last {timeRange} days</p>
              </CardContent>
            </Card>

            <Card className="glass-morph hover-elevate">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                  <Star className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.avgRating ? analytics.avgRating.toFixed(1) : "N/A"}
                </div>
                <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "w-4 h-4",
                        analytics.avgRating && star <= analytics.avgRating
                          ? "fill-amber-500 text-amber-500"
                          : "text-muted-foreground"
                      )}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-morph hover-elevate">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
                  <ThumbsUp className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sentimentPercentage}%</div>
                <Progress value={sentimentPercentage} className="mt-2" />
              </CardContent>
            </Card>

            <Card className="glass-morph hover-elevate">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Top Issues</CardTitle>
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.topIssues.length}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.topIssues[0]?.category || "No issues"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sentiment Distribution */}
            <Card className="glass-morph">
              <CardHeader>
                <CardTitle>Sentiment Distribution</CardTitle>
                <CardDescription>User satisfaction breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {sentimentData.map((entry, index) => (
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
                <CardDescription>Distribution of feedback categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={typeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card className="glass-morph">
              <CardHeader>
                <CardTitle>Feedback by Status</CardTitle>
                <CardDescription>Current status of feedback items</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count">
                      {statusData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Issues */}
          <Card className="glass-morph">
            <CardHeader>
              <CardTitle>Top Issues</CardTitle>
              <CardDescription>Most reported problems by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topIssues.slice(0, 5).map((issue, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">{idx + 1}.</span>
                      <span className="text-sm">{issue.subject}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{issue.count} reports</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Feedback */}
          <Card className="glass-morph">
            <CardHeader>
              <CardTitle>Recent Feedback</CardTitle>
              <CardDescription>Latest user submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {recentFeedback?.slice(0, 10).map((item) => (
                    <div key={item.id} className="flex items-start gap-3 pb-3 border-b">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-2",
                        item.sentiment && item.sentiment > 0.6 ? "bg-green-500" :
                        item.sentiment && item.sentiment < 0.4 ? "bg-red-500" :
                        "bg-yellow-500"
                      )} />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.type}</Badge>
                          {item.rating && (
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={cn(
                                    "w-3 h-3",
                                    star <= (item.rating ?? 0)
                                      ? "fill-amber-500 text-amber-500"
                                      : "text-muted-foreground"
                                  )}
                                />
                              ))}
                            </div>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Unknown date"}
                          </span>
                        </div>
                        {item.message && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}