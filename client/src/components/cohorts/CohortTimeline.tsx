import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Calendar, TrendingUp, TrendingDown, Users, Activity } from "lucide-react";
import { format } from "date-fns";
import type { Cohort, CohortMetric } from "@shared/schema";

interface CohortTimelineProps {
  cohortId: string;
  cohortName: string;
}

export function CohortTimeline({ cohortId, cohortName }: CohortTimelineProps) {
  const metricsQuery = useQuery({
    queryKey: [`/api/cohorts/${cohortId}/metrics`],
    queryFn: async () => {
      const response = await fetch(`/api/cohorts/${cohortId}/metrics`);
      if (!response.ok) throw new Error("Failed to fetch metrics");
      const data = await response.json();
      
      // Group metrics by date
      const metricsByDate: Record<string, any> = {};
      (data.metrics as CohortMetric[]).forEach((metric) => {
        const date = metric.metricDate;
        if (!metricsByDate[date]) {
          metricsByDate[date] = { date };
        }
        metricsByDate[date][metric.metricName] = metric.value;
      });
      
      // Convert to array and sort by date
      return Object.values(metricsByDate).sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    },
  });
  
  if (metricsQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </CardTitle>
          <CardDescription>Loading timeline data...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (metricsQuery.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </CardTitle>
          <CardDescription>
            Error loading timeline: {(metricsQuery.error as Error).message}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  const timelineData = metricsQuery.data || [];
  
  // Get all unique metric names
  const metricNames = new Set<string>();
  timelineData.forEach(dataPoint => {
    Object.keys(dataPoint).forEach(key => {
      if (key !== "date") {
        metricNames.add(key);
      }
    });
  });
  
  const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
  const metricArray = Array.from(metricNames);
  
  const formatMetricName = (name: string) => {
    return name.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };
  
  const calculateTrend = (data: any[], metric: string) => {
    if (data.length < 2) return null;
    
    const firstValue = data[0][metric] || 0;
    const lastValue = data[data.length - 1][metric] || 0;
    const change = ((lastValue - firstValue) / firstValue) * 100;
    
    return {
      direction: change >= 0 ? "up" : "down",
      percentage: Math.abs(change),
    };
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Timeline
        </CardTitle>
        <CardDescription>
          Tracking metrics evolution for {cohortName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {timelineData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No timeline data available yet</p>
            <p className="text-sm">Metrics will appear here as they are collected</p>
          </div>
        ) : (
          <>
            {/* Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(new Date(date), "MMM d")}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => format(new Date(date), "PPP")}
                  formatter={(value: number) => value.toFixed(2)}
                />
                <Legend 
                  formatter={(value) => formatMetricName(value)}
                />
                {metricArray.map((metric, index) => (
                  <Line
                    key={metric}
                    type="monotone"
                    dataKey={metric}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            
            {/* Metric Trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metricArray.map((metric, index) => {
                const trend = calculateTrend(timelineData, metric);
                const latestValue = timelineData[timelineData.length - 1][metric];
                
                return (
                  <div 
                    key={metric}
                    className="p-3 border rounded-lg space-y-2"
                    data-testid={`metric-trend-${metric}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{formatMetricName(metric)}</p>
                      {trend && (
                        <div className="flex items-center gap-1">
                          {trend.direction === "up" ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          )}
                          <span className={`text-xs ${
                            trend.direction === "up" ? "text-green-500" : "text-red-500"
                          }`}>
                            {trend.percentage.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Current</span>
                      <Badge variant="secondary">
                        {latestValue?.toFixed(2) || "N/A"}
                      </Badge>
                    </div>
                    <div 
                      className="h-1 bg-muted rounded-full overflow-hidden"
                    >
                      <div 
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, latestValue || 0)}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Date Range */}
            {timelineData.length > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(new Date(timelineData[0].date), "PPP")} - {format(new Date(timelineData[timelineData.length - 1].date), "PPP")}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}