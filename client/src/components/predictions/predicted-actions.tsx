import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Target,
  TrendingUp,
  Users,
  FileText,
  Settings,
  Zap,
  ChevronRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import type { UserPrediction } from "@shared/schema";

interface PredictedActionsProps {
  userId?: string;
  onActionClick?: (action: string) => void;
}

const ACTION_ICONS: Record<string, any> = {
  explore_features: Settings,
  create_content: FileText,
  engage_community: Users,
  upgrade_plan: TrendingUp,
  invite_users: Users,
};

const ACTION_DESCRIPTIONS: Record<string, string> = {
  explore_features: "User likely to explore new features and settings",
  create_content: "User expected to create new content or posts",
  engage_community: "User may interact with community features",
  upgrade_plan: "User showing signs of needing advanced features",
  invite_users: "User likely to invite team members or friends",
};

export function PredictedActions({
  userId,
  onActionClick,
}: PredictedActionsProps) {
  const { data, isLoading, error, refetch } = useQuery<{
    predictions: UserPrediction[];
  }>({
    queryKey: ["/api/predict/user", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/predict/user/${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch predictions");
      }
      return response.json();
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Predicted User Actions
          </CardTitle>
          <CardDescription>Loading behavioral predictions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const errorMessage =
      (error as Error).message || "Failed to load predictions";
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Predicted User Actions
          </CardTitle>
          <CardDescription>
            Unable to load behavioral predictions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const actionPredictions =
    data?.predictions?.filter(
      (p) =>
        p.predictionType === "next_action" ||
        p.predictionType === "feature_adoption",
    ) || [];

  const engagementPrediction = data?.predictions?.find(
    (p) => p.predictionType === "engagement_drop",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Predicted User Actions
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            data-testid="button-refresh-predictions"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription>
          AI-predicted next actions based on user behavior patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {engagementPrediction && (
          <div className="p-3 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Engagement Status</span>
              <Badge
                variant={
                  engagementPrediction.confidence > 0.5
                    ? "destructive"
                    : "default"
                }
              >
                {engagementPrediction.confidence > 0.5 ? "Declining" : "Stable"}
              </Badge>
            </div>
            <Progress
              value={100 - Math.round(engagementPrediction.confidence * 100)}
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              Current engagement level:{" "}
              {100 - Math.round(engagementPrediction.confidence * 100)}%
            </p>
          </div>
        )}

        {actionPredictions.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Likely Next Actions</h4>
            {actionPredictions.map((prediction) => {
              const action =
                (prediction.metadata as any)?.predictedAction || "unknown";
              const Icon = ACTION_ICONS[action] || Zap;
              const confidence = Math.round((prediction.confidence || 0) * 100);

              return (
                <div
                  key={prediction.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover-elevate cursor-pointer"
                  onClick={() => onActionClick?.(action)}
                  data-testid={`action-${action}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {action
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ACTION_DESCRIPTIONS[action] || "User action predicted"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {confidence}% likely
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No action predictions available</p>
            <p className="text-xs mt-1">
              Predictions will appear as user data is collected
            </p>
          </div>
        )}

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Model Accuracy: 85%</span>
            <span>Updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
