import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalyticsInsight } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { useToast } from "@/hooks/use-toast";

interface InsightCardProps {
  insight: AnalyticsInsight;
  onMarkAsRead?: (insightId: string) => void;
}

export function InsightCard({ insight, onMarkAsRead }: InsightCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const { toast } = useToast();

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (insightId: string) => {
      return apiRequest(
        `${API_ENDPOINTS.ai.analysis.insights.all}/${insightId}/read`,
        "PATCH",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [API_ENDPOINTS.ai.analysis.insights.all],
      });
      onMarkAsRead?.(insight.id);
    },
  });

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async ({ helpful }: { helpful: boolean }) => {
      return apiRequest(
        `${API_ENDPOINTS.ai.analysis.insights.all}/${insight.id}/feedback`,
        "POST",
        {
          helpfulScore: helpful ? 5 : 2,
          wasActionable: helpful,
          comments: helpful
            ? "This insight was helpful"
            : "This insight wasn't helpful",
        },
      );
    },
    onSuccess: () => {
      setFeedbackGiven(true);
      toast({
        title: "Feedback received",
        description: "Thank you for your feedback!",
      });
    },
  });

  // Get icon based on insight type
  const getIcon = () => {
    switch (insight.insightType) {
      case "anomaly":
        return (
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
        );
      case "trend":
        return insight.metrics?.trend === "up" ? (
          <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
        ) : insight.metrics?.trend === "down" ? (
          <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
        ) : (
          <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        );
      case "recommendation":
        return (
          <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        );
      default:
        return (
          <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        );
    }
  };

  // Get severity badge color
  const getSeverityColor = () => {
    if (insight.severity === "critical") return "destructive";
    if (insight.severity === "warning") return "default";
    return "secondary";
  };

  // Format percentage change
  const formatPercentage = (value: number) => {
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  // Handle marking as read when expanded
  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && !insight.isRead) {
      markAsReadMutation.mutate(insight.id);
    }
  };

  return (
    <Card
      className={cn(
        "hover-elevate transition-all duration-200",
        !insight.isRead && "border-primary/50",
      )}
      data-testid={`card-insight-${insight.id}`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            {getIcon()}
            <div className="flex-1 space-y-1">
              <CardTitle className="text-base leading-tight">
                {insight.title}
              </CardTitle>
              <CardDescription className="text-sm mt-2">
                {insight.description}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getSeverityColor()} className="text-xs">
              {insight.severity === "critical"
                ? "Critical"
                : insight.severity === "warning"
                  ? "Warning"
                  : "Info"}
            </Badge>
            {!insight.isRead && (
              <Badge variant="outline" className="text-xs">
                New
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Key metrics display */}
        {insight.metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {insight.metrics.currentValue !== undefined && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Current</p>
                <p
                  className="text-sm font-semibold"
                  data-testid={`text-current-${insight.id}`}
                >
                  {insight.metrics.currentValue.toLocaleString()}
                </p>
              </div>
            )}
            {insight.metrics.percentageChange !== undefined && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Change</p>
                <p
                  className={cn(
                    "text-sm font-semibold",
                    insight.metrics.percentageChange > 0
                      ? "text-green-600 dark:text-green-400"
                      : insight.metrics.percentageChange < 0
                        ? "text-red-600 dark:text-red-400"
                        : "",
                  )}
                  data-testid={`text-change-${insight.id}`}
                >
                  {formatPercentage(insight.metrics.percentageChange)}
                </p>
              </div>
            )}
            {insight.metrics.average !== undefined && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Average</p>
                <p
                  className="text-sm font-semibold"
                  data-testid={`text-average-${insight.id}`}
                >
                  {insight.metrics.average.toLocaleString()}
                </p>
              </div>
            )}
            {insight.metrics.period && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Period</p>
                <p
                  className="text-sm font-semibold"
                  data-testid={`text-period-${insight.id}`}
                >
                  {insight.metrics.period}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Expandable details */}
        {insight.recommendations && insight.recommendations.length > 0 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExpand}
              className="w-full justify-between"
              data-testid={`button-expand-${insight.id}`}
            >
              <span className="text-xs">View Recommendations</span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>

            {isExpanded && (
              <div className="mt-4 space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recommendations</h4>
                  <ul className="space-y-1">
                    {insight.recommendations.map(
                      (recommendation: string | { action?: string; reason?: string }, idx: number) => {
                        const displayText = typeof recommendation === 'string'
                          ? recommendation
                          : typeof recommendation === 'object' && recommendation !== null
                            ? recommendation.action || JSON.stringify(recommendation)
                            : String(recommendation);
                        return (
                          <li
                            key={idx}
                            className="text-sm text-muted-foreground flex items-start gap-2"
                          >
                            <span className="text-primary mt-0.5">•</span>
                            <span
                              data-testid={`text-recommendation-${insight.id}-${idx}`}
                            >
                              {displayText}
                            </span>
                          </li>
                        );
                      },
                    )}
                  </ul>
                </div>

                {/* Feedback buttons */}
                {!feedbackGiven && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-sm text-muted-foreground">
                      Was this helpful?
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        submitFeedbackMutation.mutate({ helpful: true })
                      }
                      disabled={submitFeedbackMutation.isPending}
                      data-testid={`button-helpful-${insight.id}`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        submitFeedbackMutation.mutate({ helpful: false })
                      }
                      disabled={submitFeedbackMutation.isPending}
                      data-testid={`button-not-helpful-${insight.id}`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
