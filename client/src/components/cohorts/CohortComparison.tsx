import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Activity, Users, Eye, MousePointer, AlertCircle } from "lucide-react";
import { useState } from "react";
import type { Cohort } from "@shared/schema";

interface CohortComparisonProps {
  cohorts: Cohort[];
}

const METRICS = [
  { key: "retention_day_7", label: "7-Day Retention", icon: Users },
  { key: "retention_day_30", label: "30-Day Retention", icon: Users },
  { key: "engagement_score", label: "Engagement Score", icon: Activity },
  { key: "avg_session_time", label: "Avg Session Time", icon: Eye },
  { key: "conversion_rate", label: "Conversion Rate", icon: MousePointer },
];

export function CohortComparison({ cohorts }: CohortComparisonProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    "retention_day_7",
    "retention_day_30",
    "engagement_score"
  ]);
  
  const comparisonQuery = useQuery({
    queryKey: ["/api/cohorts/compare", cohorts.map(c => c.id), selectedMetrics],
    queryFn: async () => {
      if (cohorts.length < 2) return null;
      
      const response = await fetch("/api/cohorts/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cohortIds: cohorts.map(c => c.id),
          metrics: selectedMetrics,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to compare cohorts");
      
      const data = await response.json();
      return data.comparison;
    },
    enabled: cohorts.length >= 2 && selectedMetrics.length > 0,
  });
  
  const getMetricIcon = (metricKey: string) => {
    const metric = METRICS.find(m => m.key === metricKey);
    const Icon = metric?.icon || Activity;
    return <Icon className="h-4 w-4" />;
  };
  
  const formatMetricValue = (value: number, metricKey: string) => {
    if (metricKey.includes("retention") || metricKey.includes("rate")) {
      return `${value.toFixed(1)}%`;
    }
    if (metricKey.includes("time")) {
      return `${value.toFixed(0)}s`;
    }
    return value.toFixed(2);
  };
  
  if (cohorts.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cohort Comparison</CardTitle>
          <CardDescription>
            Select at least 2 cohorts to compare their performance
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  if (comparisonQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Comparison...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (comparisonQuery.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Error Loading Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {(comparisonQuery.error as Error).message}
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const comparisonData = comparisonQuery.data || [];
  
  // Prepare data for charts
  const barChartData = selectedMetrics.map(metric => ({
    metric: METRICS.find(m => m.key === metric)?.label || metric,
    ...cohorts.reduce((acc: any, cohort: any, index: number) => {
      const cohortData = comparisonData.find((d: any) => d.cohortId === cohort.id);
      return {
        ...acc,
        [cohort.name]: cohortData?.metrics[metric] || 0,
      };
    }, {}),
  }));
  
  const lineChartData = cohorts.map((cohort: any, index: number) => {
    const cohortData = comparisonData.find((d: any) => d.cohortId === cohort.id);
    return {
      name: cohort.name,
      ...selectedMetrics.reduce((acc, metric) => ({
        ...acc,
        [metric]: cohortData?.metrics[metric] || 0,
      }), {}),
    };
  });
  
  const radarChartData = selectedMetrics.map(metric => ({
    metric: METRICS.find(m => m.key === metric)?.label || metric,
    ...cohorts.reduce((acc: any, cohort: any) => {
      const cohortData = comparisonData.find((d: any) => d.cohortId === cohort.id);
      return {
        ...acc,
        [cohort.name]: cohortData?.metrics[metric] || 0,
      };
    }, {}),
  }));
  
  const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cohort Comparison</CardTitle>
        <CardDescription>
          Comparing {cohorts.length} cohorts across selected metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metric Selector */}
        <div className="flex flex-wrap gap-2">
          {METRICS.map((metric) => {
            const isSelected = selectedMetrics.includes(metric.key);
            return (
              <Badge
                key={metric.key}
                variant={isSelected ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  if (isSelected) {
                    setSelectedMetrics(selectedMetrics.filter(m => m !== metric.key));
                  } else {
                    setSelectedMetrics([...selectedMetrics, metric.key]);
                  }
                }}
                data-testid={`badge-metric-${metric.key}`}
              >
                <metric.icon className="h-3 w-3 mr-1" />
                {metric.label}
              </Badge>
            );
          })}
        </div>
        
        {/* Charts */}
        <Tabs defaultValue="bar" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bar" data-testid="tab-bar">Bar Chart</TabsTrigger>
            <TabsTrigger value="line" data-testid="tab-line">Line Chart</TabsTrigger>
            <TabsTrigger value="radar" data-testid="tab-radar">Radar Chart</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bar" className="space-y-4">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip formatter={(value: number, name: string) => {
                  const metricKey = selectedMetrics.find(m => 
                    METRICS.find(metric => metric.label === name)?.key === m
                  );
                  return formatMetricValue(value, metricKey || "");
                }} />
                <Legend />
                {cohorts.map((cohort, index) => (
                  <Bar
                    key={cohort.id}
                    dataKey={cohort.name}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="line" className="space-y-4">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number, name: string) => 
                  formatMetricValue(value, name)
                } />
                <Legend />
                {selectedMetrics.map((metric, index) => (
                  <Line
                    key={metric}
                    type="monotone"
                    dataKey={metric}
                    name={METRICS.find(m => m.key === metric)?.label || metric}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
          
          <TabsContent value="radar" className="space-y-4">
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarChartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis />
                <Tooltip formatter={(value: number) => value.toFixed(1)} />
                <Legend />
                {cohorts.map((cohort, index) => (
                  <Radar
                    key={cohort.id}
                    name={cohort.name}
                    dataKey={cohort.name}
                    stroke={COLORS[index % COLORS.length]}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.3}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
        
        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {cohorts.map((cohort, index) => {
            const cohortData = comparisonData.find((d: any) => d.cohortId === cohort.id);
            const metrics = cohortData?.metrics || {};
            
            // Calculate average performance
            const avgPerformance = selectedMetrics.length > 0
              ? selectedMetrics.reduce((sum, metric) => sum + (metrics[metric] || 0), 0) / selectedMetrics.length
              : 0;
            
            // Find best performing metric
            const bestMetric = selectedMetrics.reduce((best, metric) => {
              const value = metrics[metric] || 0;
              const bestValue = metrics[best] || 0;
              return value > bestValue ? metric : best;
            }, selectedMetrics[0]);
            
            return (
              <Card key={cohort.id} data-testid={`card-cohort-${cohort.id}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    {cohort.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Users</span>
                      <Badge variant="secondary">{cohort.userCount}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Avg Performance</span>
                      <span className="text-sm font-medium">{avgPerformance.toFixed(1)}</span>
                    </div>
                    {bestMetric && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Best Metric</span>
                        <div className="flex items-center gap-1">
                          {getMetricIcon(bestMetric)}
                          <span className="text-sm font-medium">
                            {formatMetricValue(metrics[bestMetric] || 0, bestMetric)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}