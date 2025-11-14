/**
 * System Health Dashboard
 * 
 * Real-time monitoring of system components with predictive maintenance
 * insights using TensorFlow.js LSTM anomaly detection.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  Shield,
  TrendingUp,
  Wifi,
  Wrench,
  Zap
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarGrid,
  PolarRadiusAxis
} from "recharts";
import { format, formatDistance } from "date-fns";

// Component status type
interface ComponentStatus {
  name: string;
  health: number;
  status: 'healthy' | 'warning' | 'critical';
  activePredictions: number;
  lastMaintenance: string | null;
  metrics: {
    recent: number;
    anomalies: number;
  };
}

// System health type
interface SystemHealth {
  score: number;
  components: Record<string, number>;
  issues: number;
  recommendations: string[];
  status: 'healthy' | 'warning' | 'critical';
  criticalIssues: number;
  upcomingMaintenance: number;
  timestamp: string;
}

// Maintenance prediction type
interface MaintenancePrediction {
  id: string;
  component: string;
  predictedIssue: string;
  probability: number;
  recommendedDate: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedDowntime?: number;
  preventiveActions?: string[];
  status: string;
}

// System metric type
interface SystemMetric {
  id: string;
  component: string;
  metricName: string;
  value: number;
  timestamp: string;
  anomalyScore?: number;
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

const urgencyColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800"
};

export default function SystemHealthDashboard() {
  const { toast } = useToast();
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch system health
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery<SystemHealth>({
    queryKey: ['/api/maintenance/health'],
    refetchInterval: autoRefresh ? 30000 : false // Auto-refresh every 30s if enabled
  });

  // Fetch components status
  const { data: components, isLoading: componentsLoading } = useQuery<{ components: ComponentStatus[] }>({
    queryKey: ['/api/maintenance/components'],
    refetchInterval: autoRefresh ? 30000 : false
  });

  // Fetch predictions
  const { data: predictions, isLoading: predictionsLoading } = useQuery<{ predictions: MaintenancePrediction[]; grouped: Record<string, MaintenancePrediction[]> }>({
    queryKey: ['/api/maintenance/predict'],
    refetchInterval: autoRefresh ? 60000 : false // Auto-refresh every minute
  });

  // Fetch recent metrics
  const { data: metrics } = useQuery<{ metrics: SystemMetric[] }>({
    queryKey: ['/api/maintenance/metrics', { limit: 100 }],
    refetchInterval: autoRefresh ? 10000 : false // Auto-refresh every 10s
  });

  // Analyze component mutation
  const analyzeMutation = useMutation({
    mutationFn: (component: string) =>
      apiRequest('/api/maintenance/analyze', 'POST', { component }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance'] });
      toast({
        title: "Analysis Complete",
        description: "Component analysis completed successfully"
      });
    },
    onError: () => {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze component",
        variant: "destructive"
      });
    }
  });

  // Initialize models mutation
  const initializeMutation = useMutation({
    mutationFn: () =>
      apiRequest('/api/maintenance/initialize', 'POST'),
    onSuccess: () => {
      toast({
        title: "Models Initialized",
        description: "Predictive maintenance models are ready"
      });
    }
  });

  // Simulate metrics mutation (for testing)
  const simulateMutation = useMutation({
    mutationFn: ({ component, anomaly }: { component: string; anomaly: boolean }) =>
      apiRequest('/api/maintenance/simulate', 'POST', { component, anomaly }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance'] });
    }
  });

  // Prepare chart data
  const metricsChartData = metrics?.metrics?.slice(0, 50).reverse().map((m: SystemMetric) => ({
    time: format(new Date(m.timestamp), 'HH:mm'),
    value: m.value,
    anomalyScore: (m.anomalyScore || 0) * 100,
    component: m.component
  })) || [];

  const healthRadialData = health ? [{
    name: 'System Health',
    value: health.score,
    fill: health.score >= 80 ? '#10b981' : health.score >= 60 ? '#f59e0b' : '#ef4444'
  }] : [];

  const componentHealthData = components?.components?.map((c: ComponentStatus) => ({
    name: c.name,
    health: c.health,
    anomalies: c.metrics.anomalies,
    predictions: c.activePredictions
  })) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            System Health Dashboard
          </h1>
          <p className="text-muted-foreground">
            Real-time monitoring and predictive maintenance powered by TensorFlow.js
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            data-testid="button-auto-refresh"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchHealth()}
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => initializeMutation.mutate()}
            disabled={initializeMutation.isPending}
            data-testid="button-initialize"
          >
            <Zap className="w-4 h-4 mr-2" />
            Initialize Models
          </Button>
        </div>
      </div>

      {/* Overall Health Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>System Health Score</CardTitle>
            <CardDescription>Overall system performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={healthRadialData}>
                <PolarGrid stroke="none" />
                <PolarRadiusAxis tick={false} axisLine={false} />
                <RadialBar dataKey="value" cornerRadius={10} />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-bold">
                  {health?.score || 0}%
                </text>
                <text x="50%" y="50%" dy={25} textAnchor="middle" className="text-sm text-muted-foreground">
                  {health?.status || 'Unknown'}
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="text-center">
                <div className="text-2xl font-semibold">{health?.criticalIssues || 0}</div>
                <div className="text-xs text-muted-foreground">Critical Issues</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">{health?.upcomingMaintenance || 0}</div>
                <div className="text-xs text-muted-foreground">Scheduled</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts and Recommendations */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>System Alerts & Recommendations</CardTitle>
            <CardDescription>AI-powered insights for system optimization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(health?.criticalIssues || 0) > 0 && (
              <Alert className="border-red-200">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertTitle>Critical Issues Detected</AlertTitle>
                <AlertDescription>
                  {health?.criticalIssues || 0} critical maintenance issues require immediate attention.
                </AlertDescription>
              </Alert>
            )}
            {health?.recommendations?.map((rec: string, idx: number) => (
              <Alert key={idx} className="border-yellow-200">
                <Activity className="h-4 w-4 text-yellow-500" />
                <AlertDescription>{rec}</AlertDescription>
              </Alert>
            )) || (
              <Alert className="border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription>All systems operating normally</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Component Health Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Component Health Status</CardTitle>
          <CardDescription>Individual component monitoring and anomaly detection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {components?.components?.map((component: ComponentStatus) => {
              const Icon = componentIcons[component.name] || Server;
              return (
                <Card
                  key={component.name}
                  className={`cursor-pointer transition-all ${
                    selectedComponent === component.name ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedComponent(component.name)}
                  data-testid={`card-component-${component.name}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`w-5 h-5 ${statusColors[component.status]}`} />
                      <Badge variant={component.status === 'healthy' ? 'default' : 'destructive'}>
                        {component.health}%
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="font-semibold capitalize">{component.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {component.metrics.anomalies} anomalies
                      </div>
                      {component.activePredictions > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {component.activePredictions} predictions
                        </Badge>
                      )}
                    </div>
                    <Progress value={component.health} className="mt-2 h-1" />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Component Actions */}
          {selectedComponent && (
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                onClick={() => analyzeMutation.mutate(selectedComponent)}
                disabled={analyzeMutation.isPending}
                data-testid="button-analyze"
              >
                <Activity className="w-4 h-4 mr-2" />
                Analyze {selectedComponent}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => simulateMutation.mutate({ component: selectedComponent, anomaly: false })}
                data-testid="button-simulate-normal"
              >
                Simulate Normal
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => simulateMutation.mutate({ component: selectedComponent, anomaly: true })}
                data-testid="button-simulate-anomaly"
              >
                Simulate Anomaly
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics and Predictions Tabs */}
      <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="metrics">Real-time Metrics</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="trends">Component Trends</TabsTrigger>
        </TabsList>

        {/* Real-time Metrics */}
        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>System Metrics & Anomaly Detection</CardTitle>
              <CardDescription>
                Real-time metrics with LSTM autoencoder anomaly scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metricsChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="value"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                    name="Metric Value"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="anomalyScore"
                    stroke="#ef4444"
                    name="Anomaly Score %"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Predictions */}
        <TabsContent value="predictions">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Predictions</CardTitle>
              <CardDescription>
                AI-predicted maintenance needs based on time series analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions?.grouped?.critical?.map((pred: MaintenancePrediction) => (
                  <Alert key={pred.id} className="border-red-200">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <div className="ml-2">
                      <AlertTitle>
                        <Badge className={urgencyColors[pred.urgencyLevel]}>
                          {pred.urgencyLevel.toUpperCase()}
                        </Badge>
                        <span className="ml-2">{pred.component}: {pred.predictedIssue}</span>
                      </AlertTitle>
                      <AlertDescription>
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center text-sm">
                            <Clock className="w-3 h-3 mr-1" />
                            Recommended: {format(new Date(pred.recommendedDate), 'PPP')}
                          </div>
                          <div className="flex items-center text-sm">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Probability: {Math.round(pred.probability * 100)}%
                          </div>
                          {pred.estimatedDowntime && (
                            <div className="flex items-center text-sm">
                              <Wrench className="w-3 h-3 mr-1" />
                              Est. Downtime: {pred.estimatedDowntime} minutes
                            </div>
                          )}
                        </div>
                        {pred.preventiveActions && (
                          <div className="mt-2">
                            <div className="text-sm font-semibold">Preventive Actions:</div>
                            <ul className="text-sm list-disc list-inside">
                              {pred.preventiveActions.map((action, idx) => (
                                <li key={idx}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </AlertDescription>
                    </div>
                  </Alert>
                ))}

                {predictions?.grouped?.high?.map((pred: MaintenancePrediction) => (
                  <Alert key={pred.id} className="border-orange-200">
                    <Activity className="h-4 w-4 text-orange-500" />
                    <div className="ml-2">
                      <AlertTitle>
                        <Badge className={urgencyColors[pred.urgencyLevel]}>
                          {pred.urgencyLevel.toUpperCase()}
                        </Badge>
                        <span className="ml-2">{pred.component}: {pred.predictedIssue}</span>
                      </AlertTitle>
                      <AlertDescription className="text-sm">
                        Scheduled for {format(new Date(pred.recommendedDate), 'PPP')}
                        {pred.estimatedDowntime && ` • ${pred.estimatedDowntime} min downtime`}
                      </AlertDescription>
                    </div>
                  </Alert>
                ))}

                {(!predictions?.predictions || predictions.predictions.length === 0) && (
                  <Alert className="border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertDescription>
                      No maintenance predictions at this time. All systems stable.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Component Trends */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Component Health Trends</CardTitle>
              <CardDescription>
                Comparative health metrics across all monitored components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={componentHealthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="health" fill="#10b981" name="Health Score" />
                  <Bar dataKey="anomalies" fill="#f59e0b" name="Anomalies" />
                  <Bar dataKey="predictions" fill="#ef4444" name="Predictions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}