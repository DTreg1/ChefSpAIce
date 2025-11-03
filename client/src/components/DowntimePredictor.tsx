/**
 * Downtime Predictor Component
 * 
 * Predicts and visualizes potential system downtime based on maintenance predictions
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  Clock,
  TrendingDown,
  Calendar,
  BarChart3
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { format, addDays, startOfWeek, endOfWeek } from "date-fns";

interface PredictionData {
  predictions: Array<{
    component: string;
    estimatedDowntime?: number;
    recommendedDate: string;
    urgencyLevel: string;
    probability: number;
  }>;
  byDate: Record<string, any[]>;
  estimatedDowntimeHours: number;
}

const COLORS = {
  database: '#8884d8',
  server: '#82ca9d',
  cache: '#ffc658',
  api: '#ff7c7c',
  storage: '#8dd1e1'
};

const urgencyColors = {
  low: '#3b82f6',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444'
};

export function DowntimePredictor() {
  // Fetch maintenance schedule
  const { data: schedule } = useQuery<PredictionData>({
    queryKey: ['/api/maintenance/schedule']
  });

  // Calculate downtime by component
  const downtimeByComponent = schedule?.predictions?.reduce((acc, pred) => {
    const component = pred.component;
    const downtime = pred.estimatedDowntime || 0;
    acc[component] = (acc[component] || 0) + downtime;
    return acc;
  }, {} as Record<string, number>) || {};

  // Calculate downtime by week
  const downtimeByWeek = (() => {
    const weeks: Record<string, number> = {};
    const now = new Date();
    
    for (let i = 0; i < 4; i++) {
      const weekStart = startOfWeek(addDays(now, i * 7));
      const weekEnd = endOfWeek(weekStart);
      const weekLabel = format(weekStart, 'MMM dd');
      weeks[weekLabel] = 0;
      
      schedule?.predictions?.forEach(pred => {
        const predDate = new Date(pred.recommendedDate);
        if (predDate >= weekStart && predDate <= weekEnd) {
          weeks[weekLabel] += pred.estimatedDowntime || 0;
        }
      });
    }
    
    return Object.entries(weeks).map(([week, downtime]) => ({
      week,
      downtime: Math.round(downtime / 60 * 10) / 10 // Convert to hours
    }));
  })();

  // Prepare pie chart data
  const pieData = Object.entries(downtimeByComponent).map(([component, downtime]) => ({
    name: component,
    value: downtime
  }));

  // Calculate risk score
  const calculateRiskScore = () => {
    if (!schedule?.predictions) return 0;
    
    const criticalCount = schedule.predictions.filter(p => p.urgencyLevel === 'critical').length;
    const highCount = schedule.predictions.filter(p => p.urgencyLevel === 'high').length;
    const totalDowntime = schedule.estimatedDowntimeHours;
    
    const riskScore = Math.min(100, 
      (criticalCount * 30) + 
      (highCount * 15) + 
      (totalDowntime * 2)
    );
    
    return Math.round(riskScore);
  };

  const riskScore = calculateRiskScore();
  const riskLevel = riskScore > 70 ? 'High' : riskScore > 40 ? 'Medium' : 'Low';
  const riskColor = riskScore > 70 ? 'text-red-500' : riskScore > 40 ? 'text-yellow-500' : 'text-green-500';

  // Calculate availability
  const totalMinutesInMonth = 30 * 24 * 60;
  const estimatedDowntimeMinutes = (schedule?.estimatedDowntimeHours || 0) * 60;
  const availability = ((totalMinutesInMonth - estimatedDowntimeMinutes) / totalMinutesInMonth * 100).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Downtime Risk Assessment</CardTitle>
          <CardDescription>
            AI-predicted system availability and maintenance impact
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Risk Score */}
            <div className="text-center">
              <div className="mb-2">
                <BarChart3 className={`w-8 h-8 mx-auto ${riskColor}`} />
              </div>
              <div className="text-3xl font-bold">{riskScore}%</div>
              <div className="text-sm text-muted-foreground">Risk Score</div>
              <Badge className="mt-2" variant={riskScore > 70 ? 'destructive' : 'outline'}>
                {riskLevel} Risk
              </Badge>
            </div>

            {/* Predicted Availability */}
            <div className="text-center">
              <div className="mb-2">
                <TrendingDown className="w-8 h-8 mx-auto text-blue-500" />
              </div>
              <div className="text-3xl font-bold">{availability}%</div>
              <div className="text-sm text-muted-foreground">Predicted Uptime</div>
              <div className="text-xs mt-2">Next 30 days</div>
            </div>

            {/* Total Downtime */}
            <div className="text-center">
              <div className="mb-2">
                <Clock className="w-8 h-8 mx-auto text-orange-500" />
              </div>
              <div className="text-3xl font-bold">{schedule?.estimatedDowntimeHours || 0}h</div>
              <div className="text-sm text-muted-foreground">Est. Downtime</div>
              <div className="text-xs mt-2">Across all components</div>
            </div>
          </div>

          {/* Risk Alert */}
          {riskScore > 70 && (
            <Alert className="mt-6 border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                High downtime risk detected. Consider rescheduling non-critical maintenance
                or allocating additional resources to minimize impact.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Downtime Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Component */}
        <Card>
          <CardHeader>
            <CardTitle>Downtime by Component</CardTitle>
            <CardDescription>Distribution of predicted downtime</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No downtime predicted
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Week */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Downtime Forecast</CardTitle>
            <CardDescription>Expected downtime over the next 4 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={downtimeByWeek}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip formatter={(value) => `${value}h`} />
                <Bar dataKey="downtime" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle>Downtime Optimization</CardTitle>
          <CardDescription>
            AI suggestions to minimize system downtime
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {schedule?.predictions && schedule.predictions.length > 0 ? (
              <>
                <div className="flex items-start gap-2">
                  <Calendar className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Batch Maintenance Windows</div>
                    <div className="text-sm text-muted-foreground">
                      Combine {schedule.predictions.filter(p => p.urgencyLevel === 'low').length} low-priority
                      maintenance tasks into a single window to reduce overall disruption
                    </div>
                  </div>
                </div>
                
                {schedule.predictions.some(p => p.urgencyLevel === 'critical') && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <div className="font-medium">Prioritize Critical Issues</div>
                      <div className="text-sm text-muted-foreground">
                        Address {schedule.predictions.filter(p => p.urgencyLevel === 'critical').length} critical
                        issues immediately to prevent cascading failures
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-2">
                  <Clock className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Off-Peak Scheduling</div>
                    <div className="text-sm text-muted-foreground">
                      Schedule maintenance during weekend early morning hours (3-6 AM) for minimal user impact
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No maintenance scheduled. System operating optimally.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}