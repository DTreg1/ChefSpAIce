import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, BarChart2, Award, AlertCircle, CheckCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TranslationQualityProps {
  quality: "fast" | "balanced" | "high";
  isVerified?: boolean;
  confidence?: number;
  className?: string;
}

export function TranslationQuality({
  quality,
  isVerified = false,
  confidence,
  className,
}: TranslationQualityProps) {
  const qualityConfig = {
    fast: {
      icon: Zap,
      label: "Fast",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      description: "Quick translation, may lack nuance",
      speed: 100,
      accuracy: 60,
    },
    balanced: {
      icon: BarChart2,
      label: "Balanced",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      description: "Good balance of speed and quality",
      speed: 70,
      accuracy: 80,
    },
    high: {
      icon: Award,
      label: "High Quality",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      description: "Most accurate, context-aware translation",
      speed: 40,
      accuracy: 95,
    },
  };

  const config = qualityConfig[quality];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-3 ${className}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${config.bgColor}`}>
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{config.label}</span>
                  {isVerified && (
                    <Badge variant="outline" className="h-5">
                      <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                      Verified
                    </Badge>
                  )}
                </div>

                {confidence !== undefined && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      Confidence:
                    </span>
                    <Progress
                      value={confidence}
                      className="h-1.5 w-20"
                      data-testid="progress-confidence"
                    />
                    <span className="text-xs text-muted-foreground">
                      {confidence}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </TooltipTrigger>

          <TooltipContent>
            <div className="space-y-2 p-1">
              <p className="text-sm">{config.description}</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-muted-foreground">Speed:</span>
                  <div className="flex items-center gap-1">
                    <Progress value={config.speed} className="h-1 w-16" />
                    <span className="text-xs">{config.speed}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs text-muted-foreground">
                    Accuracy:
                  </span>
                  <div className="flex items-center gap-1">
                    <Progress value={config.accuracy} className="h-1 w-16" />
                    <span className="text-xs">{config.accuracy}%</span>
                  </div>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        {!isVerified && quality !== "high" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">
                Consider using higher quality setting for important content
              </p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
