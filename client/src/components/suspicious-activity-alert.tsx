import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AlertTriangle, X, ShieldOff, Clock, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SuspiciousActivity {
  id: string;
  userId: string;
  type: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: string;
  autoBlocked: boolean;
  status: "pending" | "reviewing" | "confirmed" | "dismissed" | "escalated";
}

interface SuspiciousActivityAlertProps {
  className?: string;
  dismissable?: boolean;
  autoHideDelay?: number; // milliseconds, 0 = no auto-hide
  onDismiss?: () => void;
}

export function SuspiciousActivityAlert({
  className,
  dismissable = true,
  autoHideDelay = 0,
  onDismiss,
}: SuspiciousActivityAlertProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(true);

  // Fetch fraud alerts
  const { data: alertData, isLoading } = useQuery<{ alerts: any[] }>({
    queryKey: ["/api/fraud/alerts"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mutation to dismiss an alert
  const dismissMutation = useMutation({
    mutationFn: async (activityId: string) => {
      return apiRequest(`/api/fraud/review`, "POST", {
        activityId,
        decision: "dismiss",
        notes: "User dismissed alert",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fraud/alerts"] });
    },
  });

  // Get active alerts (not dismissed)
  const activeAlerts =
    alertData?.alerts?.filter(
      (alert: SuspiciousActivity) =>
        !dismissed.has(alert.id) && alert.status === "pending",
    ) || [];

  // Get the most critical alert
  const mostCriticalAlert = activeAlerts.reduce(
    (prev: SuspiciousActivity | null, current: SuspiciousActivity) => {
      if (!prev) return current;
      const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      return severityOrder[current.severity] > severityOrder[prev.severity]
        ? current
        : prev;
    },
    null,
  );

  // Auto-hide effect
  useEffect(() => {
    if (autoHideDelay > 0 && mostCriticalAlert && isVisible) {
      const timer = setTimeout(() => {
        handleDismiss(mostCriticalAlert.id);
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
  }, [mostCriticalAlert, autoHideDelay, isVisible]);

  const handleDismiss = (alertId: string) => {
    setDismissed((prev) => new Set(Array.from(prev).concat([alertId])));

    // If this was the last alert, hide the component
    if (activeAlerts.length <= 1) {
      setIsVisible(false);
      onDismiss?.();
    }
  };

  const handleReview = (alertId: string, decision: "dismiss" | "escalate") => {
    dismissMutation.mutate(alertId);
    handleDismiss(alertId);
  };

  if (isLoading || !isVisible || !mostCriticalAlert) {
    return null;
  }

  // Get alert styling based on severity
  const getAlertStyle = (severity: string) => {
    switch (severity) {
      case "critical":
        return {
          variant: "destructive" as const,
          icon: ShieldOff,
          iconColor: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-50 dark:bg-red-900/20",
          borderColor: "border-red-200 dark:border-red-800",
        };
      case "high":
        return {
          variant: "default" as const,
          icon: AlertTriangle,
          iconColor: "text-orange-600 dark:text-orange-400",
          bgColor: "bg-orange-50 dark:bg-orange-900/20",
          borderColor: "border-orange-200 dark:border-orange-800",
        };
      case "medium":
        return {
          variant: "default" as const,
          icon: AlertTriangle,
          iconColor: "text-yellow-600 dark:text-yellow-400",
          bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
          borderColor: "border-yellow-200 dark:border-yellow-800",
        };
      default:
        return {
          variant: "default" as const,
          icon: AlertTriangle,
          iconColor: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-50 dark:bg-blue-900/20",
          borderColor: "border-blue-200 dark:border-blue-800",
        };
    }
  };

  const style = getAlertStyle(mostCriticalAlert.severity);
  const Icon = style.icon;

  return (
    <Alert
      variant={style.variant}
      className={cn("relative", style.bgColor, style.borderColor, className)}
      data-testid="suspicious-activity-alert"
    >
      <Icon className={cn("h-5 w-5", style.iconColor)} />
      <AlertTitle className="flex items-center justify-between pr-8">
        <span className="flex items-center gap-2">
          Suspicious Activity Detected
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              mostCriticalAlert.severity === "critical" &&
                "border-red-600 text-red-600",
              mostCriticalAlert.severity === "high" &&
                "border-orange-600 text-orange-600",
              mostCriticalAlert.severity === "medium" &&
                "border-yellow-600 text-yellow-600",
              mostCriticalAlert.severity === "low" &&
                "border-blue-600 text-blue-600",
            )}
          >
            {mostCriticalAlert.severity.toUpperCase()}
          </Badge>
          {mostCriticalAlert.autoBlocked && (
            <Badge variant="destructive" className="text-xs">
              AUTO-BLOCKED
            </Badge>
          )}
        </span>
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-2">
          <p className="text-sm">{mostCriticalAlert.description}</p>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              Detected{" "}
              {new Date(mostCriticalAlert.timestamp).toLocaleTimeString()}
            </span>
            {activeAlerts.length > 1 && (
              <>
                <span>•</span>
                <span>
                  {activeAlerts.length - 1} more alert
                  {activeAlerts.length > 2 ? "s" : ""}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleReview(mostCriticalAlert.id, "escalate")}
              disabled={dismissMutation.isPending}
              data-testid="button-escalate-alert"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Escalate
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleReview(mostCriticalAlert.id, "dismiss")}
              disabled={dismissMutation.isPending}
              data-testid="button-dismiss-alert"
            >
              <CheckCircle className="w-3 h-3 mr-1" />
              Dismiss
            </Button>
          </div>
        </div>
      </AlertDescription>

      {dismissable && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6"
          onClick={() => handleDismiss(mostCriticalAlert.id)}
          data-testid="button-close-alert"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      )}
    </Alert>
  );
}
