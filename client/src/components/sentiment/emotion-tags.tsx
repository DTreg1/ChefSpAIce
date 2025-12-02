/**
 * Emotion Tags Component
 *
 * Displays detected emotions as interactive tags with visual representations
 */

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smile,
  Frown,
  Angry,
  AlertCircle,
  Zap,
  HeartCrack,
  Star,
  CloudLightning,
  Heart,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

export interface EmotionData {
  emotion: string;
  intensity: number;
  Icon?: LucideIcon;
}

interface EmotionTagsProps {
  emotions: { [key: string]: number } | EmotionData[];
  maxItems?: number;
  animated?: boolean;
  interactive?: boolean;
  onEmotionClick?: (emotion: string) => void;
  className?: string;
}

const defaultEmotionConfig: {
  [key: string]: { Icon: LucideIcon; color: string };
} = {
  happy: {
    Icon: Smile,
    color:
      "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
  },
  sad: {
    Icon: Frown,
    color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
  },
  angry: {
    Icon: Angry,
    color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
  },
  fearful: {
    Icon: AlertCircle,
    color:
      "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
  },
  surprised: {
    Icon: Zap,
    color:
      "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20",
  },
  disgusted: {
    Icon: HeartCrack,
    color:
      "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
  },
  excited: {
    Icon: Star,
    color: "text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20",
  },
  frustrated: {
    Icon: CloudLightning,
    color:
      "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20",
  },
  satisfied: {
    Icon: Heart,
    color: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20",
  },
  disappointed: {
    Icon: Frown,
    color: "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20",
  },
};

export function EmotionTags({
  emotions,
  maxItems = 5,
  animated = false,
  interactive = false,
  onEmotionClick,
  className,
}: EmotionTagsProps) {
  // Normalize emotions to EmotionData array
  const emotionArray: EmotionData[] = Array.isArray(emotions)
    ? emotions
    : Object.entries(emotions)
        .map(([emotion, intensity]) => ({ emotion, intensity }))
        .filter((e) => e.intensity > 0);

  // Sort by intensity and limit
  const topEmotions = emotionArray
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, maxItems);

  if (topEmotions.length === 0) {
    return null;
  }

  const TagWrapper = animated ? motion.div : "div";
  const tagVariants = animated
    ? {
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.8 },
      }
    : {};

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <AnimatePresence mode="popLayout">
        {topEmotions.map((emotionData, index) => {
          const config = defaultEmotionConfig[emotionData.emotion] || {
            Icon: MessageCircle,
            color: "text-muted-foreground bg-muted",
          };
          const IconComponent = emotionData.Icon || config.Icon;

          const intensitySize =
            emotionData.intensity > 0.7
              ? "text-base"
              : emotionData.intensity > 0.4
                ? "text-sm"
                : "text-xs";

          const wrapperProps =
            animated && tagVariants
              ? {
                  variants: tagVariants,
                  initial: "hidden" as const,
                  animate: "visible" as const,
                  exit: "exit" as const,
                  transition: { delay: index * 0.05 },
                }
              : {};

          return (
            <TagWrapper key={emotionData.emotion} {...(wrapperProps as any)}>
              <Badge
                variant="outline"
                className={cn(
                  "px-2.5 py-1 border transition-all flex items-center gap-1.5",
                  config.color,
                  intensitySize,
                  interactive &&
                    "cursor-pointer hover:scale-105 hover:shadow-md",
                  "data-[intensity='high']:font-semibold",
                  "data-[intensity='low']:opacity-70",
                )}
                onClick={() =>
                  interactive && onEmotionClick?.(emotionData.emotion)
                }
                data-testid={`emotion-tag-${emotionData.emotion}`}
                data-intensity={
                  emotionData.intensity > 0.7
                    ? "high"
                    : emotionData.intensity > 0.4
                      ? "medium"
                      : "low"
                }
              >
                <IconComponent className="w-4 h-4" />
                <span className="capitalize">{emotionData.emotion}</span>
                <span className="ml-1.5 opacity-60 text-xs">
                  {Math.round(emotionData.intensity * 100)}%
                </span>
              </Badge>
            </TagWrapper>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
