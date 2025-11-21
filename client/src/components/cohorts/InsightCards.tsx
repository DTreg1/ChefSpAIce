import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, Info, CheckCircle, XCircle, RefreshCw, Archive, Brain } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CohortInsight } from "@shared/schema";

interface InsightCardsProps {
  cohortId: string;
  cohortName: string;
}

export function InsightCards({ cohortId, cohortName }: InsightCardsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const insightsQuery = useQuery({
    queryKey: [`/api/cohorts/${cohortId}/insights`],
    queryFn: async () => {
      const response = await fetch(`/api/cohorts/${cohortId}/insights`);
      if (!response.ok) throw new Error("Failed to fetch insights");
      const data = await response.json();
      return data.insights as CohortInsight[];
    },
  });
  
  const generateInsightsMutation = useMutation({
    mutationFn: () => 
      apiRequest(`/api/cohorts/${cohortId}/insights`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cohorts/${cohortId}/insights`] });
      toast({
        title: "Insights generated",
        description: "New AI insights have been generated for this cohort.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error generating insights",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const updateInsightStatusMutation = useMutation({
    mutationFn: ({ insightId, status }: { insightId: string; status: string }) =>
      apiRequest(`/api/cohorts/insights/${insightId}/status`, "PATCH", { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cohorts/${cohortId}/insights`] });
    },
  });
  
  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case "critical":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };
  
  const getImportanceIcon = (importance: string) => {
    switch (importance) {
      case "critical":
        return <AlertTriangle className="h-4 w-4" />;
      case "high":
        return <TrendingUp className="h-4 w-4" />;
      case "medium":
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "retention":
        return <TrendingDown className="h-4 w-4" />;
      case "behavior":
        return <Brain className="h-4 w-4" />;
      case "risk":
        return <AlertTriangle className="h-4 w-4" />;
      case "opportunity":
        return <TrendingUp className="h-4 w-4" />;
      case "comparison":
        return <Info className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "dismissed":
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      case "implemented":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };
  
  if (insightsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Insights
          </h3>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  const insights = insightsQuery.data || [];
  const activeInsights = insights.filter(i => i.validUntil && new Date(i.validUntil) > new Date());
  const dismissedInsights = insights.filter(i => !i.validUntil || new Date(i.validUntil) <= new Date());
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Insights
        </h3>
        <Button
          onClick={() => generateInsightsMutation.mutate()}
          disabled={generateInsightsMutation.isPending}
          size="sm"
          data-testid="button-generate-insights"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${generateInsightsMutation.isPending ? "animate-spin" : ""}`} />
          {generateInsightsMutation.isPending ? "Generating..." : "Generate Insights"}
        </Button>
      </div>
      
      {insights.length === 0 ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            No insights generated yet. Click "Generate Insights" to analyze this cohort with AI.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {/* Active Insights */}
          {activeInsights.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Active Insights</h4>
              <div className="grid gap-4">
                {activeInsights.map((insight) => (
                  <Card key={insight.id} data-testid={`card-insight-${insight.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            {insight.impact && (
                              <Badge variant={getImportanceColor(insight.impact)}>
                                {getImportanceIcon(insight.impact)}
                                <span className="ml-1">{insight.impact}</span>
                              </Badge>
                            )}
                            <Badge variant="outline">
                              {getCategoryIcon(insight.insightType)}
                              <span className="ml-1">{insight.insightType}</span>
                            </Badge>
                            {insight.confidence && (
                              <Badge variant="secondary">
                                {Math.round(insight.confidence * 100)}% confidence
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm">{insight.insight}</p>
                      
                      {insight.recommendations && insight.recommendations.length > 0 && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs font-medium mb-1">Recommendations:</p>
                          <ul className="text-sm space-y-1">
                            {insight.recommendations.map((rec: string, index: number) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-muted-foreground">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateInsightStatusMutation.mutate({
                            insightId: insight.id,
                            status: "implemented"
                          })}
                          data-testid={`button-implement-${insight.id}`}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark Implemented
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateInsightStatusMutation.mutate({
                            insightId: insight.id,
                            status: "dismissed"
                          })}
                          data-testid={`button-dismiss-${insight.id}`}
                        >
                          <Archive className="h-3 w-3 mr-1" />
                          Dismiss
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {/* Dismissed Insights */}
          {dismissedInsights.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Dismissed Insights ({dismissedInsights.length})
              </summary>
              <div className="mt-4 space-y-4">
                {dismissedInsights.map((insight) => (
                  <Card key={insight.id} className="opacity-60">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {insight.insightType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Dismissed</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{insight.insight}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2"
                        onClick={() => updateInsightStatusMutation.mutate({
                          insightId: insight.id,
                          status: "active"
                        })}
                      >
                        Restore
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
      
      {/* Generated by indicator */}
      {insights.length > 0 && insights[0]?.generatedBy && (
        <p className="text-xs text-muted-foreground text-center">
          Powered by {insights[0].generatedBy}
        </p>
      )}
    </div>
  );
}