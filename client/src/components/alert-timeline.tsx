/**
 * Alert Timeline Component
 *
 * Real-time feed of system alerts and predictions
 */

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Info,
  TrendingUp,
  Zap,
} from "lucide-react";
import { format, formatDistance } from "date-fns";

interface Alert {
  id: string;
  type: "anomaly" | "prediction" | "maintenance" | "system";
  severity: "info" | "warning" | "error" | "critical";
  component: string;
  message: string;
  timestamp: string;
  metadata?: any;
}

const severityIcons = {
  info: Info,
  warning: AlertTriangle,
  error: AlertTriangle,
  critical: Zap,
};

const severityColors = {
  info: "text-blue-500",
  warning: "text-yellow-500",
  error: "text-orange-500",
  critical: "text-red-500",
};

export function AlertTimeline() {
  // Mock data for now - in production would fetch from API
  const alerts: Alert[] = [
    {
      id: "1",
      type: "prediction",
      severity: "critical",
      component: "database",
      message: "Index fragmentation detected - optimization needed in 7 days",
      timestamp: new Date().toISOString(),
      metadata: { probability: 0.89 },
    },
    {
      id: "2",
      type: "anomaly",
      severity: "warning",
      component: "server",
      message: "Memory usage anomaly detected - 15% above baseline",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      metadata: { anomalyScore: 0.72 },
    },
    {
      id: "3",
      type: "maintenance",
      severity: "info",
      component: "cache",
      message: "Scheduled maintenance completed successfully",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      metadata: { downtime: 5 },
    },
  ];

  // Group alerts by time period
  const groupedAlerts = alerts.reduce(
    (acc, alert) => {
      const hoursSince = Math.floor(
        (Date.now() - new Date(alert.timestamp).getTime()) / (1000 * 60 * 60),
      );

      let period = "Just Now";
      if (hoursSince >= 24) period = "Earlier";
      else if (hoursSince >= 1) period = "Past 24 Hours";

      if (!acc[period]) acc[period] = [];
      acc[period].push(alert);
      return acc;
    },
    {} as Record<string, Alert[]>,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Alert Timeline</CardTitle>
            <CardDescription>
              Real-time system events and predictions
            </CardDescription>
          </div>
          <Badge variant="outline">{alerts.length} active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {Object.entries(groupedAlerts).map(([period, periodAlerts]) => (
            <div key={period}>
              <div className="text-sm font-semibold text-muted-foreground mb-3">
                {period}
              </div>
              <div className="space-y-3 mb-6">
                {periodAlerts.map((alert) => {
                  const Icon = severityIcons[alert.severity];
                  return (
                    <div
                      key={alert.id}
                      className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                      data-testid={`alert-${alert.id}`}
                    >
                      <div className="mt-0.5">
                        <Icon
                          className={`w-5 h-5 ${severityColors[alert.severity]}`}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {alert.component}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistance(
                                new Date(alert.timestamp),
                                new Date(),
                                { addSuffix: true },
                              )}
                            </span>
                          </div>
                          <Badge
                            variant={
                              alert.severity === "critical"
                                ? "destructive"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-sm">{alert.message}</p>
                        {alert.metadata && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {alert.metadata.probability && (
                              <span>
                                <TrendingUp className="w-3 h-3 inline mr-1" />
                                {Math.round(alert.metadata.probability * 100)}%
                                confidence
                              </span>
                            )}
                            {alert.metadata.anomalyScore && (
                              <span>
                                <Activity className="w-3 h-3 inline mr-1" />
                                Anomaly score:{" "}
                                {alert.metadata.anomalyScore.toFixed(2)}
                              </span>
                            )}
                            {alert.metadata.downtime && (
                              <span>
                                <Clock className="w-3 h-3 inline mr-1" />
                                {alert.metadata.downtime} min downtime
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
