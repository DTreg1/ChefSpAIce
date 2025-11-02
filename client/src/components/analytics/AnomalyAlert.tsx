import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AnalyticsInsight } from "@shared/schema";

interface AnomalyAlertProps {
  insights: AnalyticsInsight[];
}

export function AnomalyAlert({ insights }: AnomalyAlertProps) {
  // Filter for anomalies with high importance
  const anomalies = insights.filter(
    i => i.category === "anomaly" && i.importance >= 4
  );

  if (anomalies.length === 0) {
    return null;
  }

  const latestAnomaly = anomalies[0];
  const hasMultiple = anomalies.length > 1;

  return (
    <Alert className="border-yellow-600/50 bg-yellow-50/50 dark:bg-yellow-900/20">
      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <AlertTitle className="text-yellow-900 dark:text-yellow-100">
        Anomaly Detected {hasMultiple && <Badge variant="outline" className="ml-2">+{anomalies.length - 1} more</Badge>}
      </AlertTitle>
      <AlertDescription className="mt-2 text-yellow-800 dark:text-yellow-200">
        <div className="space-y-2">
          <p data-testid="text-anomaly-description">{latestAnomaly.insightText}</p>
          {latestAnomaly.metricData?.percentageChange !== undefined && (
            <div className="flex items-center gap-2 mt-2">
              {latestAnomaly.metricData.percentageChange > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="font-semibold" data-testid="text-anomaly-change">
                {Math.abs(latestAnomaly.metricData.percentageChange).toFixed(1)}% change detected
              </span>
            </div>
          )}
          {hasMultiple && (
            <p className="text-sm mt-2" data-testid="text-anomaly-multiple">
              Check your dashboard for {anomalies.length} important anomalies requiring attention.
            </p>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}