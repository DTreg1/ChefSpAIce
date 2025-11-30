import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, BellOff, CheckCircle, AlertCircle, Clock, Settings } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TrendAlertData {
  id: string;
  trendId: string;
  userId: string;
  alertType: string;
  conditions: any;
  isActive: boolean;
  createdAt: string;
  acknowledgedAt?: string;
}

interface TrendAlertProps {
  alerts: TrendAlertData[];
}

export function TrendAlert({ alerts }: TrendAlertProps) {
  const { toast } = useToast();

  // Mutation to acknowledge alert
  const acknowledgeAlert = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest("/api/trends/alerts/acknowledge", "POST", { alertId });
    },
    onSuccess: () => {
      toast({
        title: "Alert Acknowledged",
        description: "The alert has been marked as read",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trends/alerts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to acknowledge",
        description: error.message || "Could not acknowledge alert",
        variant: "destructive",
      });
    },
  });

  // Mutation to toggle alert active status
  const toggleAlert = useMutation({
    mutationFn: async ({ alertId, isActive }: { alertId: string; isActive: boolean }) => {
      return apiRequest(`/api/trends/${alertId}`, "PATCH", { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trends/alerts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update alert",
        description: error.message || "Could not update alert status",
        variant: "destructive",
      });
    },
  });

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      threshold: "Threshold Alert",
      emergence: "New Trend Alert",
      acceleration: "Acceleration Alert",
      peak: "Peak Detection",
      decline: "Decline Alert",
      anomaly: "Anomaly Detection",
    };
    return labels[type] || type;
  };

  const getAlertTypeIcon = (type: string, isAcknowledged: boolean) => {
    if (isAcknowledged) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    
    switch (type) {
      case "emergence":
        return <Bell className="w-4 h-4 text-blue-500" />;
      case "threshold":
      case "acceleration":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case "anomaly":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledgedAt);
  const acknowledgedAlerts = alerts.filter(a => a.acknowledgedAt);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Trend Alerts
          </div>
          {unacknowledgedAlerts.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {unacknowledgedAlerts.length} new
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Notifications for significant trend changes and patterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        {alerts.length > 0 ? (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {/* Unacknowledged Alerts */}
              {unacknowledgedAlerts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3 text-destructive">
                    New Alerts
                  </h4>
                  <div className="space-y-2">
                    {unacknowledgedAlerts.map((alert) => (
                      <Alert key={alert.id} className="relative">
                        <div className="flex items-start gap-3">
                          {getAlertTypeIcon(alert.alertType, false)}
                          <div className="flex-1">
                            <AlertTitle className="mb-1">
                              {getAlertTypeLabel(alert.alertType)}
                            </AlertTitle>
                            <AlertDescription>
                              <div className="space-y-2">
                                {alert.conditions && (
                                  <div className="text-xs">
                                    {alert.conditions.minGrowthRate && (
                                      <div>Growth threshold: {alert.conditions.minGrowthRate}%</div>
                                    )}
                                    {alert.conditions.minConfidence && (
                                      <div>Confidence: {(alert.conditions.minConfidence * 100).toFixed(0)}%</div>
                                    )}
                                    {alert.conditions.keywords?.length > 0 && (
                                      <div>Keywords: {alert.conditions.keywords.join(", ")}</div>
                                    )}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  {new Date(alert.createdAt).toLocaleString()}
                                </div>
                              </div>
                            </AlertDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeAlert.mutate(alert.id)}
                              data-testid={`button-acknowledge-${alert.id}`}
                            >
                              Mark as Read
                            </Button>
                            <Switch
                              checked={alert.isActive}
                              onCheckedChange={(checked) => 
                                toggleAlert.mutate({ alertId: alert.id, isActive: checked })
                              }
                              data-testid={`switch-alert-${alert.id}`}
                            />
                          </div>
                        </div>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}

              {/* Acknowledged Alerts */}
              {acknowledgedAlerts.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                    Previous Alerts
                  </h4>
                  <div className="space-y-2">
                    {acknowledgedAlerts.map((alert) => (
                      <div 
                        key={alert.id} 
                        className="flex items-center justify-between p-3 border rounded-lg opacity-60"
                      >
                        <div className="flex items-center gap-3">
                          {getAlertTypeIcon(alert.alertType, true)}
                          <div>
                            <p className="text-sm font-medium">
                              {getAlertTypeLabel(alert.alertType)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Acknowledged {new Date(alert.acknowledgedAt!).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={alert.isActive ? "default" : "secondary"}>
                            {alert.isActive ? "Active" : "Paused"}
                          </Badge>
                          <Switch
                            checked={alert.isActive}
                            onCheckedChange={(checked) => 
                              toggleAlert.mutate({ alertId: alert.id, isActive: checked })
                            }
                            data-testid={`switch-acknowledged-${alert.id}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <BellOff className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No active alerts</p>
            <p className="text-sm mt-2">Subscribe to trends to receive notifications</p>
            <Button variant="outline" size="sm" className="mt-4">
              <Settings className="w-4 h-4 mr-2" />
              Configure Alerts
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}