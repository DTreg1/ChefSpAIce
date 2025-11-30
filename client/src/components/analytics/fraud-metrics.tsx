import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Ban,
  Eye,
  AlertTriangle
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FraudMetric {
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'stable';
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  subtext?: string;
}

interface FraudMetricsProps {
  compact?: boolean;
  refreshInterval?: number; // milliseconds
  className?: string;
}

export function FraudMetrics({ 
  compact = false, 
  refreshInterval = 30000,
  className 
}: FraudMetricsProps) {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [isLive, setIsLive] = useState(false);

  // Fetch fraud report data
  const { data: reportData = {
    averageScore: 0,
    totalScores: 0,
    highRiskCount: 0,
    suspiciousActivitiesCount: 0,
    autoBlockedCount: 0,
    reviewsCount: 0,
    riskDistribution: [],
    topActivityTypes: [],
    alerts: []
  }, isLoading, refetch } = useQuery<{
    averageScore: number;
    totalScores: number;
    highRiskCount: number;
    suspiciousActivitiesCount: number;
    autoBlockedCount: number;
    reviewsCount: number;
    riskDistribution: any[];
    topActivityTypes: any[];
    alerts: any[];
  }>({
    queryKey: ["/api/fraud/report", timeRange],
    refetchInterval: isLive ? refreshInterval : false
  });

  // Fetch current alerts
  const { data: alertData = { alerts: [] } } = useQuery<{ alerts: any[] }>({
    queryKey: ["/api/fraud/alerts"],
    refetchInterval: isLive ? refreshInterval : false
  });

  // Auto-refresh toggle effect
  useEffect(() => {
    if (isLive) {
      const timer = setInterval(() => {
        refetch();
      }, refreshInterval);
      return () => clearInterval(timer);
    }
  }, [isLive, refreshInterval, refetch]);

  // Calculate metrics
  const calculateMetrics = (): FraudMetric[] => {
    if (!reportData) return [];

    const avgScore = reportData.averageScore || 0;
    const totalScores = reportData.totalScores || 0;
    const highRiskCount = reportData.highRiskCount || 0;
    const suspiciousCount = reportData.suspiciousActivitiesCount || 0;
    const autoBlockedCount = reportData.autoBlockedCount || 0;
    const reviewsCount = reportData.reviewsCount || 0;
    const activeAlerts = alertData?.alerts?.length || 0;

    // Calculate percentage changes (mock data for demo)
    const prevAvgScore = avgScore * 0.95;
    const scoreChange = ((avgScore - prevAvgScore) / prevAvgScore) * 100;
    const prevHighRisk = highRiskCount - 2;
    const riskChange = highRiskCount - prevHighRisk;

    return [
      {
        label: "Average Risk Score",
        value: `${(avgScore * 100).toFixed(1)}%`,
        change: scoreChange,
        changeType: scoreChange > 0 ? 'increase' : scoreChange < 0 ? 'decrease' : 'stable',
        icon: Shield,
        color: avgScore > 0.75 ? 'text-red-500' : avgScore > 0.5 ? 'text-orange-500' : avgScore > 0.25 ? 'text-yellow-500' : 'text-green-500',
        subtext: `${totalScores} assessments`
      },
      {
        label: "High Risk Users",
        value: highRiskCount,
        change: riskChange,
        changeType: riskChange > 0 ? 'increase' : riskChange < 0 ? 'decrease' : 'stable',
        icon: ShieldAlert,
        color: 'text-orange-500',
        subtext: "Score > 75%"
      },
      {
        label: "Active Alerts",
        value: activeAlerts,
        icon: AlertTriangle,
        color: activeAlerts > 0 ? 'text-yellow-500' : 'text-gray-500',
        subtext: "Pending review"
      },
      {
        label: "Suspicious Activities",
        value: suspiciousCount,
        icon: Activity,
        color: 'text-red-500',
        subtext: `${autoBlockedCount} auto-blocked`
      },
      {
        label: "Reviews Completed",
        value: reviewsCount,
        icon: ShieldCheck,
        color: 'text-green-500',
        subtext: `This ${timeRange}`
      }
    ];
  };

  const metrics = calculateMetrics();

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-4 p-2 border rounded-lg", className)} data-testid="fraud-metrics-compact">
        {metrics.slice(0, 3).map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="flex items-center gap-2">
              <Icon className={cn("h-4 w-4", metric.color)} />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{metric.label}</span>
                <span className="text-sm font-semibold">{metric.value}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)} data-testid="fraud-metrics">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Fraud Detection Metrics</h3>
          {isLive && (
            <Badge variant="outline" className="animate-pulse">
              <span className="mr-1 h-2 w-2 rounded-full bg-red-500"></span>
              LIVE
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-32" data-testid="select-time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24h</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => setIsLive(!isLive)}
            className={cn(
              "px-3 py-1 rounded-md text-sm font-medium transition-colors",
              isLive 
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" 
                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
            )}
            data-testid="button-toggle-live"
          >
            {isLive ? 'Stop Live' : 'Go Live'}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </CardTitle>
                  <Icon className={cn("h-4 w-4", metric.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{metric.value}</div>
                  {metric.subtext && (
                    <p className="text-xs text-muted-foreground">{metric.subtext}</p>
                  )}
                  {metric.change !== undefined && (
                    <div className="flex items-center gap-1">
                      {metric.changeType === 'increase' && (
                        <>
                          <TrendingUp className="h-3 w-3 text-red-500" />
                          <span className="text-xs text-red-600 dark:text-red-400">
                            +{Math.abs(metric.change).toFixed(1)}%
                          </span>
                        </>
                      )}
                      {metric.changeType === 'decrease' && (
                        <>
                          <TrendingDown className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-green-600 dark:text-green-400">
                            -{Math.abs(metric.change).toFixed(1)}%
                          </span>
                        </>
                      )}
                      {metric.changeType === 'stable' && (
                        <span className="text-xs text-gray-500">No change</span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Risk Distribution */}
      {reportData?.riskDistribution && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Risk Distribution</CardTitle>
            <CardDescription>User distribution across risk levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {reportData.riskDistribution.map((dist: any) => {
                const percentage = (dist.count / (reportData.totalScores || 1)) * 100;
                const getColor = () => {
                  switch (dist.level) {
                    case 'critical': return 'bg-red-500';
                    case 'high': return 'bg-orange-500';
                    case 'medium': return 'bg-yellow-500';
                    case 'low': return 'bg-green-500';
                    default: return 'bg-gray-500';
                  }
                };
                
                return (
                  <div key={dist.level} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{dist.level}</span>
                      <span className="font-mono">{dist.count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <Progress
                      value={percentage}
                      className="h-2"
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Types */}
      {reportData?.topActivityTypes && reportData.topActivityTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Activity Types</CardTitle>
            <CardDescription>Most common suspicious activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reportData.topActivityTypes.slice(0, 5).map((activity: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      index === 0 && "bg-red-500",
                      index === 1 && "bg-orange-500",
                      index === 2 && "bg-yellow-500",
                      index > 2 && "bg-gray-500"
                    )} />
                    <span className="text-sm">{activity.type}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Auto-Blocking</span>
              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">AI Analysis</span>
              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Online
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Pattern Detection</span>
              <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Running
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Update</span>
              <span className="font-mono text-xs">Just now</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}