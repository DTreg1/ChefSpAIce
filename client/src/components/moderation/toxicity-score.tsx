import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToxicityScoreProps {
  scores: { [key: string]: number };
  threshold?: number;
  showLabels?: boolean;
  compact?: boolean;
}

const scoreLabels: { [key: string]: string } = {
  toxicity: "Overall Toxicity",
  severeToxicity: "Severe Toxicity",
  identityAttack: "Identity Attack",
  insult: "Insults",
  profanity: "Profanity",
  threat: "Threats",
  sexuallyExplicit: "Sexually Explicit",
  obscene: "Obscene",
  harassment: "Harassment",
  harassmentThreatening: "Threatening Harassment",
  hate: "Hate Speech",
  hateThreatening: "Threatening Hate",
  selfHarm: "Self-Harm",
  selfHarmIntent: "Self-Harm Intent",
  selfHarmInstruction: "Self-Harm Instructions",
  sexual: "Sexual Content",
  sexualMinors: "Sexual Content (Minors)",
  violence: "Violence",
  violenceGraphic: "Graphic Violence"
};

function getScoreColor(score: number): string {
  if (score >= 0.8) return "text-red-600 dark:text-red-400";
  if (score >= 0.6) return "text-orange-600 dark:text-orange-400";
  if (score >= 0.4) return "text-yellow-600 dark:text-yellow-400";
  return "text-green-600 dark:text-green-400";
}

function getProgressColor(score: number): string {
  if (score >= 0.8) return "bg-red-600";
  if (score >= 0.6) return "bg-orange-600";
  if (score >= 0.4) return "bg-yellow-600";
  return "bg-green-600";
}

function getScoreIcon(score: number, threshold: number) {
  if (score >= threshold) {
    return <XCircle className="h-4 w-4 text-red-600" />;
  }
  if (score >= threshold * 0.7) {
    return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
  }
  return <CheckCircle className="h-4 w-4 text-green-600" />;
}

export function ToxicityScore({
  scores,
  threshold = 0.5,
  showLabels = true,
  compact = false
}: ToxicityScoreProps) {
  // Sort scores by value (highest first)
  const sortedScores = Object.entries(scores)
    .filter(([_, value]) => value !== undefined && value !== null)
    .sort((a, b) => b[1] - a[1]);

  if (sortedScores.length === 0) {
    return (
      <div className="text-sm text-muted-foreground" data-testid="text-no-scores">
        No toxicity scores available
      </div>
    );
  }

  if (compact) {
    // Show only the highest score in compact mode
    const [topCategory, topScore] = sortedScores[0];
    const label = scoreLabels[topCategory] || topCategory;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2" data-testid="toxicity-score-compact">
              {getScoreIcon(topScore, threshold)}
              <span className={cn("text-sm font-medium", getScoreColor(topScore))}>
                {(topScore * 100).toFixed(0)}%
              </span>
              <Badge variant="outline" className="text-xs">
                {label}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">All Toxicity Scores</p>
              {sortedScores.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 text-xs">
                  <span>{scoreLabels[key] || key}:</span>
                  <span className={getScoreColor(value)}>
                    {(value * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-3" data-testid="toxicity-score-detailed">
      {sortedScores.map(([key, value]) => {
        const label = scoreLabels[key] || key;
        const percentage = Math.round(value * 100);
        const isAboveThreshold = value >= threshold;
        
        return (
          <div key={key} className="space-y-1" data-testid={`score-${key}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getScoreIcon(value, threshold)}
                {showLabels && (
                  <span className="text-sm font-medium">{label}</span>
                )}
              </div>
              <span 
                className={cn(
                  "text-sm font-medium",
                  getScoreColor(value),
                  isAboveThreshold && "font-bold"
                )}
                data-testid={`score-value-${key}`}
              >
                {percentage}%
              </span>
            </div>
            <div className="relative">
              <Progress 
                value={percentage} 
                className="h-2"
              />
              {isAboveThreshold && (
                <div 
                  className="absolute top-0 h-full border-l-2 border-red-600 dark:border-red-400"
                  style={{ left: `${threshold * 100}%` }}
                />
              )}
            </div>
          </div>
        );
      })}
      
      <div className="mt-2 pt-2 border-t">
        <p className="text-xs text-muted-foreground">
          Threshold: {(threshold * 100).toFixed(0)}% • 
          Violations: {sortedScores.filter(([_, v]) => v >= threshold).length}
        </p>
      </div>
    </div>
  );
}