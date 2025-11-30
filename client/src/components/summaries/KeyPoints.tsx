import { memo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb,
  Star,
  Info,
  TrendingUp,
  Copy,
  Check,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface KeyPointsProps {
  keyPoints: string[];
  title?: string;
  variant?: 'default' | 'highlight' | 'compact' | 'cards';
  showCopyButton?: boolean;
  onPointClick?: (index: number, point: string) => void;
  onRemove?: (index: number) => void;
  className?: string;
}

export const KeyPoints = memo(function KeyPoints({
  keyPoints,
  title = "Key Points",
  variant = 'default',
  showCopyButton = false,
  onPointClick,
  onRemove,
  className = ""
}: KeyPointsProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  const handleCopy = async (point: string, index: number) => {
    try {
      await navigator.clipboard.writeText(point);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast({
        description: "Key point copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Could not copy key point to clipboard",
        variant: "destructive",
      });
    }
  };

  const getIcon = (index: number) => {
    const icons = [
      <Star className="h-4 w-4" />,
      <TrendingUp className="h-4 w-4" />,
      <Lightbulb className="h-4 w-4" />,
      <Info className="h-4 w-4" />
    ];
    return icons[index % icons.length];
  };

  if (keyPoints.length === 0) {
    return null;
  }

  const renderDefault = () => (
    <ul className="space-y-3">
      {keyPoints.map((point, index) => (
        <motion.li
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-start gap-3 group"
          data-testid={`keypoint-${index}`}
        >
          <span className="text-primary mt-1 flex-shrink-0">
            {getIcon(index)}
          </span>
          <span 
            className={`flex-1 text-sm ${onPointClick ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
            onClick={() => onPointClick?.(index, point)}
          >
            {point}
          </span>
          {(showCopyButton || onRemove) && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {showCopyButton && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => handleCopy(point, index)}
                  data-testid={`button-copy-keypoint-${index}`}
                >
                  {copiedIndex === index ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              )}
              {onRemove && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={() => onRemove(index)}
                  data-testid={`button-remove-keypoint-${index}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </motion.li>
      ))}
    </ul>
  );

  const renderHighlight = () => (
    <div className="space-y-3">
      {keyPoints.map((point, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-primary/5 border-l-4 border-primary p-3 rounded-md"
          data-testid={`keypoint-highlight-${index}`}
        >
          <div className="flex items-start gap-2">
            <span className="text-primary flex-shrink-0">
              {getIcon(index)}
            </span>
            <p className="text-sm font-medium">{point}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderCompact = () => (
    <div className="flex flex-wrap gap-2">
      {keyPoints.map((point, index) => (
        <Badge
          key={index}
          variant="secondary"
          className={`${onPointClick ? 'cursor-pointer hover-elevate' : ''}`}
          onClick={() => onPointClick?.(index, point)}
          data-testid={`keypoint-compact-${index}`}
        >
          {point.length > 30 ? `${point.substring(0, 30)}...` : point}
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
              className="ml-2 hover:text-destructive"
              data-testid={`button-remove-compact-${index}`}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      ))}
    </div>
  );

  const renderCards = () => (
    <div className="grid gap-3 md:grid-cols-2">
      <AnimatePresence>
        {keyPoints.map((point, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card 
              className={`hover-elevate ${onPointClick ? 'cursor-pointer' : ''}`}
              onClick={() => onPointClick?.(index, point)}
              data-testid={`keypoint-card-${index}`}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <span className="text-primary flex-shrink-0 mt-1">
                    {getIcon(index)}
                  </span>
                  <p className="text-sm flex-1">{point}</p>
                  {onRemove && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(index);
                      }}
                      data-testid={`button-remove-card-${index}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  const renderContent = () => {
    switch (variant) {
      case 'highlight':
        return renderHighlight();
      case 'compact':
        return renderCompact();
      case 'cards':
        return renderCards();
      default:
        return renderDefault();
    }
  };

  return (
    <Card className={`hover-elevate ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            {title}
          </span>
          <Badge variant="outline">{keyPoints.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
});

interface InlineKeyPointsProps {
  keyPoints: string[];
  className?: string;
}

export const InlineKeyPoints = memo(function InlineKeyPoints({
  keyPoints,
  className = ""
}: InlineKeyPointsProps) {
  if (keyPoints.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {keyPoints.map((point, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium"
          data-testid={`inline-keypoint-${index}`}
        >
          <Star className="h-3 w-3" />
          {point}
        </span>
      ))}
    </div>
  );
});