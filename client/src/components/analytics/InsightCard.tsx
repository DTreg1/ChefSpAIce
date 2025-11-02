import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, AlertCircle, Lightbulb, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalyticsInsight } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
      return apiRequest(`/api/insights/${insightId}/read`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
      onMarkAsRead?.(insight.insightId);
    }
  });

  // Submit feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async ({ helpful }: { helpful: boolean }) => {
      return apiRequest(`/api/insights/${insight.insightId}/feedback`, {
        method: "POST",
        body: JSON.stringify({
          helpfulScore: helpful ? 5 : 2,
          wasActionable: helpful,
          comments: helpful ? "This insight was helpful" : "This insight wasn't helpful"
        }),
      });
    },
    onSuccess: () => {
      setFeedbackGiven(true);
      toast({
        title: "Feedback received",
        description: "Thank you for your feedback!",
      });
    }
  });

  // Get icon based on category
  const getIcon = () => {
    switch (insight.category) {
      case "anomaly":
        return <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case "trend":
        return insight.metricData?.trend === "up" 
          ? <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          : insight.metricData?.trend === "down"
          ? <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
          : <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "prediction":
        return <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      default:
        return <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    }
  };

  // Get importance badge color
  const getImportanceColor = () => {
    if (insight.importance >= 4) return "destructive";
    if (insight.importance >= 3) return "default";
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
      markAsReadMutation.mutate(insight.insightId);
    }
  };

  return (
    <Card 
      className={cn(
        "hover-elevate transition-all duration-200",
        !insight.isRead && "border-primary/50"
      )}
      data-testid={`card-insight-${insight.insightId}`}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            {getIcon()}
            <div className="flex-1 space-y-1">
              <CardTitle className="text-base leading-tight">
                {insight.metricName.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </CardTitle>
              <CardDescription className="text-sm mt-2">
                {insight.insightText}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getImportanceColor()} className="text-xs">
              {insight.importance === 5 ? "Critical" :
               insight.importance === 4 ? "Important" :
               insight.importance === 3 ? "Notable" :
               insight.importance === 2 ? "Minor" : "Info"}
            </Badge>
            {!insight.isRead && (
              <Badge variant="outline" className="text-xs">New</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Key metrics display */}
        {insight.metricData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {insight.metricData.currentValue !== undefined && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="text-sm font-semibold" data-testid={`text-current-${insight.insightId}`}>
                  {insight.metricData.currentValue.toLocaleString()}
                </p>
              </div>
            )}
            {insight.metricData.percentageChange !== undefined && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Change</p>
                <p className={cn(
                  "text-sm font-semibold",
                  insight.metricData.percentageChange > 0 ? "text-green-600 dark:text-green-400" : 
                  insight.metricData.percentageChange < 0 ? "text-red-600 dark:text-red-400" : ""
                )} data-testid={`text-change-${insight.insightId}`}>
                  {formatPercentage(insight.metricData.percentageChange)}
                </p>
              </div>
            )}
            {insight.metricData.average !== undefined && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Average</p>
                <p className="text-sm font-semibold" data-testid={`text-average-${insight.insightId}`}>
                  {insight.metricData.average.toLocaleString()}
                </p>
              </div>
            )}
            {insight.period && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Period</p>
                <p className="text-sm font-semibold" data-testid={`text-period-${insight.insightId}`}>
                  {insight.period}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Expandable details */}
        {(insight.aiContext?.suggestedActions || insight.aiContext?.reasoning) && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExpand}
              className="w-full justify-between"
              data-testid={`button-expand-${insight.insightId}`}
            >
              <span className="text-xs">View Details</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            
            {isExpanded && (
              <div className="mt-4 space-y-4 pt-4 border-t">
                {insight.aiContext?.suggestedActions && insight.aiContext.suggestedActions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Suggested Actions</h4>
                    <ul className="space-y-1">
                      {insight.aiContext.suggestedActions.map((action, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span data-testid={`text-action-${insight.insightId}-${idx}`}>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {insight.aiContext?.reasoning && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Technical Details</h4>
                    <p className="text-sm text-muted-foreground" data-testid={`text-reasoning-${insight.insightId}`}>
                      {insight.aiContext.reasoning}
                    </p>
                  </div>
                )}

                {insight.aiContext?.relatedMetrics && insight.aiContext.relatedMetrics.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Related Metrics</h4>
                    <div className="flex flex-wrap gap-2">
                      {insight.aiContext.relatedMetrics.map((metric, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {metric.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback buttons */}
                {!feedbackGiven && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-sm text-muted-foreground">Was this helpful?</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => submitFeedbackMutation.mutate({ helpful: true })}
                      disabled={submitFeedbackMutation.isPending}
                      data-testid={`button-helpful-${insight.insightId}`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => submitFeedbackMutation.mutate({ helpful: false })}
                      disabled={submitFeedbackMutation.isPending}
                      data-testid={`button-not-helpful-${insight.insightId}`}
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