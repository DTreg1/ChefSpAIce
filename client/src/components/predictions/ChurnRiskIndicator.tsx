import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingDown, Activity, Users } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { UserPrediction } from "@shared/schema";

interface ChurnRiskIndicatorProps {
  userId?: string;
  onInterventionClick?: (prediction: UserPrediction) => void;
}

export function ChurnRiskIndicator({ userId, onInterventionClick }: ChurnRiskIndicatorProps) {
  const { data, isLoading } = useQuery<{ predictions: UserPrediction[] }>({
    queryKey: ['/api/predict/user', userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/predict/user/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch predictions');
      return response.json();
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Churn Risk Analysis
          </CardTitle>
          <CardDescription>Loading prediction data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const churnPrediction = data?.predictions?.find(p => p.predictionType === 'churn_risk');
  
  if (!churnPrediction) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Churn Risk Analysis
          </CardTitle>
          <CardDescription>No churn prediction available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const riskPercentage = Math.round((churnPrediction.probability || 0) * 100);
  const riskLevel = riskPercentage >= 80 ? 'critical' : riskPercentage >= 60 ? 'high' : riskPercentage >= 40 ? 'medium' : 'low';
  const riskColor = riskLevel === 'critical' ? 'destructive' : riskLevel === 'high' ? 'default' : riskLevel === 'medium' ? 'secondary' : 'outline';

  const factors = churnPrediction.factors || {};
  const topFactors = Object.entries(factors)
    .filter(([_, value]) => typeof value === 'number' && value > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 3);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Churn Risk Analysis
          </span>
          <Badge variant={riskColor} data-testid="badge-risk-level">
            {riskLevel.toUpperCase()} RISK
          </Badge>
        </CardTitle>
        <CardDescription>
          Probability of user churning in the next 30 days
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Churn Probability</span>
            <span className="font-semibold">{riskPercentage}%</span>
          </div>
          <Progress value={riskPercentage} className="h-2" />
        </div>

        {riskPercentage >= 60 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>High Churn Risk Detected</AlertTitle>
            <AlertDescription>
              This user has a {riskPercentage}% probability of churning. Immediate intervention recommended.
            </AlertDescription>
          </Alert>
        )}

        {topFactors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Risk Factors</h4>
            <div className="space-y-1">
              {topFactors.map(([factor, value]) => (
                <div key={factor} className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">
                    {factor.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {Math.round((value as number) * 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => onInterventionClick?.(churnPrediction)}
            data-testid="button-suggest-intervention"
          >
            <TrendingDown className="h-4 w-4 mr-2" />
            Suggest Intervention
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            data-testid="button-view-history"
          >
            <Users className="h-4 w-4 mr-2" />
            View History
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          Prediction generated: {new Date(churnPrediction.createdAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}