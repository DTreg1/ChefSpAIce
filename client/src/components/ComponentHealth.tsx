/**
 * Component Health Widget
 * 
 * Detailed health status for individual system components
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  HardDrive,
  Server,
  Shield,
  TrendingDown,
  TrendingUp,
  Wifi
} from "lucide-react";
import { format, formatDistance } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ComponentHealthProps {
  component: string;
  detailed?: boolean;
}

interface HealthData {
  avgAnomalyScore: number;
  recentMetrics: Array<{
    id: string;
    metricName: string;
    value: number;
    timestamp: string;
    anomalyScore?: number;
  }>;
  predictions: Array<{
    id: string;
    predictedIssue: string;
    probability: number;
    urgencyLevel: string;
    recommendedDate: string;
  }>;
  history: Array<{
    id: string;
    issue: string;
    resolvedAt: string;
    downtimeMinutes: number;
    outcome: string;
  }>;
}

const componentIcons: Record<string, any> = {
  database: Database,
  server: Server,
  cache: HardDrive,
  api: Wifi,
  storage: Shield
};

const statusColors: Record<string, string> = {
  healthy: "text-green-500",
  warning: "text-yellow-500",
  critical: "text-red-500"
};

export function ComponentHealth({ component, detailed = true }: ComponentHealthProps) {
  // Fetch component health data
  const { data: health, isLoading } = useQuery<{ 
    avgAnomalyScore: number;
    recentMetrics: any[];
    predictions: any[];
    history: any[];
  }>({
    queryKey: [`/api/maintenance/components/${component}/health`],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-8 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const Icon = componentIcons[component] || Server;
  const healthScore = Math.round(100 - (health?.avgAnomalyScore || 0) * 100);
  const status = healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical';

  // Prepare chart data
  const chartData = health?.recentMetrics?.slice(0, 20).reverse().map(m => ({
    time: format(new Date(m.timestamp), 'HH:mm'),
    value: m.value,
    anomaly: (m.anomalyScore || 0) * 100
  })) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className={`w-6 h-6 ${statusColors[status]}`} />
            <div>
              <CardTitle className="capitalize">{component}</CardTitle>
              <CardDescription>System Component Health</CardDescription>
            </div>
          </div>
          <Badge variant={status === 'healthy' ? 'default' : 'destructive'}>
            {healthScore}% Healthy
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Score Bar */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Health Score</span>
            <span className={statusColors[status]}>{status.toUpperCase()}</span>
          </div>
          <Progress value={healthScore} className="h-2" />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold">
              {health?.recentMetrics?.filter(m => (m.anomalyScore || 0) > 0.5).length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Recent Anomalies</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {health?.predictions?.length || 0}
            </div>
            <div className="text-xs text-muted-foreground">Active Predictions</div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {health?.history?.[0] 
                ? formatDistance(new Date(health.history[0].resolvedAt), new Date(), { addSuffix: false })
                : 'Never'}
            </div>
            <div className="text-xs text-muted-foreground">Last Maintenance</div>
          </div>
        </div>

        {detailed && (
          <>
            {/* Metrics Chart */}
            {chartData.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Recent Activity</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="anomaly" 
                      stroke="#ef4444" 
                      strokeWidth={1}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Active Predictions */}
            {health?.predictions && health.predictions.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Active Predictions</h4>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {health.predictions.map((pred: any) => (
                      <div key={pred.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{pred.predictedIssue}</span>
                        <Badge variant="outline" className="text-xs">
                          {Math.round(pred.probability * 100)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Maintenance History */}
            {health?.history && health.history.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Recent Maintenance</h4>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {health.history.slice(0, 3).map((item: any) => (
                      <div key={item.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span>{item.issue}</span>
                          {item.outcome === 'successful' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {format(new Date(item.resolvedAt), 'PPP')}
                          <span>• {item.downtimeMinutes} min downtime</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}