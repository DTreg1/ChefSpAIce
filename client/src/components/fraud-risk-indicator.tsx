import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, ShieldCheck, Shield, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface FraudScore {
  score: number;
  timestamp: string;
  factors: {
    behaviorScore: number;
    accountAgeScore: number;
    transactionVelocityScore: number;
    contentPatternScore: number;
    networkScore: number;
    deviceScore: number;
    geoScore: number;
  };
}

interface FraudRiskIndicatorProps {
  userId?: string;
  compact?: boolean;
  showDetails?: boolean;
  className?: string;
}

export function FraudRiskIndicator({
  userId,
  compact = false,
  showDetails = true,
  className
}: FraudRiskIndicatorProps) {
  // Fetch latest fraud alerts
  const { data: alertData = { recentScores: [], alerts: [] }, isLoading } = useQuery<{ recentScores: any[]; alerts: any[] }>({
    queryKey: ["/api/fraud/alerts", userId],
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="h-6 w-24 bg-muted rounded"></div>
      </div>
    );
  }

  if (!alertData || !alertData.recentScores || alertData.recentScores.length === 0) {
    return null;
  }

  // Get the most recent score for the user
  const mostRecentScore = alertData.recentScores.find((score: any) => 
    !userId || score.userId === userId
  );

  if (!mostRecentScore) {
    return null;
  }

  const score = mostRecentScore.score;
  const factors = mostRecentScore.factors;

  // Determine risk level and styling
  const getRiskLevel = (score: number) => {
    if (score <= 0.25) return { level: "low", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30", icon: ShieldCheck };
    if (score <= 0.5) return { level: "medium", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/30", icon: Shield };
    if (score <= 0.75) return { level: "high", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30", icon: ShieldAlert };
    return { level: "critical", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30", icon: AlertTriangle };
  };

  const risk = getRiskLevel(score);
  const Icon = risk.icon;

  // Get progress bar color based on risk
  const getProgressColor = (score: number) => {
    if (score <= 0.25) return "bg-green-500";
    if (score <= 0.5) return "bg-yellow-500";
    if (score <= 0.75) return "bg-orange-500";
    return "bg-red-500";
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(risk.bg, risk.color, "border-current", className)}
              data-testid="fraud-risk-badge"
            >
              <Icon className="w-3 h-3 mr-1" />
              {risk.level.toUpperCase()}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p>Fraud Risk Score: {(score * 100).toFixed(0)}%</p>
              <p className="text-muted-foreground">
                Last checked: {new Date(mostRecentScore.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("space-y-2", className)} data-testid="fraud-risk-indicator">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-5 h-5", risk.color)} />
          <span className="font-medium">Fraud Risk</span>
        </div>
        <Badge 
          variant="outline" 
          className={cn(risk.bg, risk.color, "border-current")}
        >
          {risk.level.toUpperCase()}
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Risk Score</span>
          <span className="font-mono">{(score * 100).toFixed(0)}%</span>
        </div>
        <Progress 
          value={score * 100} 
          className="h-2"
        />
      </div>

      {showDetails && factors && (
        <div className="pt-2 space-y-1 text-xs">
          <div className="font-medium text-muted-foreground">Risk Factors:</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Behavior:</span>
              <span className="font-mono">{(factors.behaviorScore * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account Age:</span>
              <span className="font-mono">{(factors.accountAgeScore * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Velocity:</span>
              <span className="font-mono">{(factors.transactionVelocityScore * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Content:</span>
              <span className="font-mono">{(factors.contentPatternScore * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network:</span>
              <span className="font-mono">{(factors.networkScore * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Device:</span>
              <span className="font-mono">{(factors.deviceScore * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}

      {alertData.alerts && alertData.alerts.length > 0 && (
        <div className="pt-2 border-t">
          <div className="flex items-center gap-1 text-xs">
            <AlertTriangle className="w-3 h-3 text-orange-500" />
            <span className="text-orange-600 dark:text-orange-400 font-medium">
              {alertData.alerts.length} active alert{alertData.alerts.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}