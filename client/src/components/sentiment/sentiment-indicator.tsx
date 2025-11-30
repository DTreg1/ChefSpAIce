/**
 * Sentiment Indicator Component
 * 
 * Displays sentiment analysis results with visual indicators,
 * confidence scores, and emotion badges.
 */

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  SmileIcon, 
  FrownIcon, 
  MehIcon,
  AlertCircleIcon,
  HeartIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from "lucide-react";

export interface SentimentData {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  sentimentScores?: {
    positive: number;
    negative: number;
    neutral: number;
  };
  emotions?: {
    [key: string]: number;
  };
  aspectSentiments?: {
    [aspect: string]: string;
  };
}

interface SentimentIndicatorProps {
  data: SentimentData;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  showEmotions?: boolean;
  showAspects?: boolean;
  className?: string;
}

const sentimentConfig = {
  positive: {
    icon: SmileIcon,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    label: 'Positive',
    badge: 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  },
  negative: {
    icon: FrownIcon,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    label: 'Negative',
    badge: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  },
  neutral: {
    icon: MehIcon,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/20',
    borderColor: 'border-gray-200 dark:border-gray-800',
    label: 'Neutral',
    badge: 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800',
  },
  mixed: {
    icon: AlertCircleIcon,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    label: 'Mixed',
    badge: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  },
};

const emotionIcons: { [key: string]: any } = {
  happy: '😊',
  sad: '😢',
  angry: '😠',
  fearful: '😨',
  surprised: '😮',
  disgusted: '🤢',
  excited: '🤩',
  frustrated: '😤',
  satisfied: '😌',
  disappointed: '😞',
};

export function SentimentIndicator({
  data,
  size = 'md',
  showDetails = false,
  showEmotions = false,
  showAspects = false,
  className,
}: SentimentIndicatorProps) {
  const config = sentimentConfig[data.sentiment];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  const containerSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Get top emotions
  const topEmotions = data.emotions
    ? Object.entries(data.emotions)
        .filter(([_, intensity]) => intensity > 0.3)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
    : [];

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Main Sentiment Indicator */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-lg border",
                  config.bgColor,
                  config.borderColor,
                  containerSizeClasses[size]
                )}
                data-testid="sentiment-indicator"
              >
                <Icon className={cn(sizeClasses[size], config.color)} />
                <span className={cn("font-medium", config.color)}>
                  {config.label}
                </span>
                {showDetails && (
                  <span className={cn("text-xs opacity-70", config.color)}>
                    ({Math.round(data.confidence * 100)}%)
                  </span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                <p>Confidence: {Math.round(data.confidence * 100)}%</p>
                {data.sentimentScores && (
                  <div className="mt-1">
                    <p>Positive: {Math.round(data.sentimentScores.positive * 100)}%</p>
                    <p>Negative: {Math.round(data.sentimentScores.negative * 100)}%</p>
                    <p>Neutral: {Math.round(data.sentimentScores.neutral * 100)}%</p>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Sentiment Score Bars */}
      {showDetails && data.sentimentScores && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ThumbsUpIcon className="w-3 h-3 text-green-600 dark:text-green-400" />
            <Progress 
              value={data.sentimentScores.positive * 100} 
              className="h-2 flex-1"
              data-testid="positive-score-bar"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">
              {Math.round(data.sentimentScores.positive * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThumbsDownIcon className="w-3 h-3 text-red-600 dark:text-red-400" />
            <Progress 
              value={data.sentimentScores.negative * 100} 
              className="h-2 flex-1"
              data-testid="negative-score-bar"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">
              {Math.round(data.sentimentScores.negative * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MehIcon className="w-3 h-3 text-gray-600 dark:text-gray-400" />
            <Progress 
              value={data.sentimentScores.neutral * 100} 
              className="h-2 flex-1"
              data-testid="neutral-score-bar"
            />
            <span className="text-xs text-muted-foreground w-10 text-right">
              {Math.round(data.sentimentScores.neutral * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Emotion Tags */}
      {showEmotions && topEmotions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {topEmotions.map(([emotion, intensity]) => (
            <Badge
              key={emotion}
              variant="outline"
              className="text-xs py-0.5"
              data-testid={`emotion-tag-${emotion}`}
            >
              <span className="mr-1">{emotionIcons[emotion] || '💭'}</span>
              {emotion}
              <span className="ml-1 opacity-70">
                {Math.round((intensity as number) * 100)}%
              </span>
            </Badge>
          ))}
        </div>
      )}

      {/* Aspect-based Sentiments */}
      {showAspects && data.aspectSentiments && Object.keys(data.aspectSentiments).length > 0 && (
        <div className="space-y-1 pt-2 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-1">Aspects:</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(data.aspectSentiments).map(([aspect, sentiment]) => {
              const aspectConfig = sentimentConfig[sentiment as keyof typeof sentimentConfig] || sentimentConfig.neutral;
              return (
                <Badge
                  key={aspect}
                  variant="outline"
                  className={cn("text-xs py-0.5", aspectConfig.badge)}
                  data-testid={`aspect-${aspect}`}
                >
                  {aspect}
                  {sentiment === 'positive' && <TrendingUpIcon className="w-3 h-3 ml-1" />}
                  {sentiment === 'negative' && <TrendingDownIcon className="w-3 h-3 ml-1" />}
                </Badge>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}