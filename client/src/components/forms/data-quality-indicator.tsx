import { AlertCircle, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DataQualityIndicatorProps {
  score: number;
  level: 'excellent' | 'good' | 'fair' | 'poor';
  missingFields: string[];
  message?: string;
  compact?: boolean;
}

export function DataQualityIndicator({
  score,
  level,
  missingFields,
  message,
  compact = false
}: DataQualityIndicatorProps) {
  const getIcon = () => {
    switch (level) {
      case 'excellent':
        return <CheckCircle className="w-4 h-4" />;
      case 'good':
        return <CheckCircle className="w-4 h-4" />;
      case 'fair':
        return <AlertTriangle className="w-4 h-4" />;
      case 'poor':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getColor = () => {
    switch (level) {
      case 'excellent':
        return 'text-green-600 dark:text-green-400';
      case 'good':
        return 'text-blue-600 dark:text-blue-400';
      case 'fair':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'poor':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getBadgeVariant = () => {
    switch (level) {
      case 'excellent':
        return 'default';
      case 'good':
        return 'secondary';
      case 'fair':
        return 'outline';
      case 'poor':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (compact) {
    return (
      <Badge 
        variant={getBadgeVariant()} 
        className={cn("gap-1", getColor())}
        data-testid="badge-quality-indicator"
      >
        {getIcon()}
        <span>{score}%</span>
      </Badge>
    );
  }

  return (
    <div className="space-y-2" data-testid="container-quality-indicator">
      <div className="flex items-center justify-between">
        <div className={cn("flex items-center gap-2", getColor())}>
          {getIcon()}
          <span className="text-sm font-medium capitalize">{level} Data Quality</span>
        </div>
        <span className="text-sm text-muted-foreground">{score}%</span>
      </div>
      
      <Progress value={score} className="h-2" />
      
      {message && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
      
      {missingFields.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {missingFields.map((field) => (
            <Badge 
              key={field} 
              variant="outline" 
              className="text-xs"
              data-testid={`badge-missing-${field}`}
            >
              Missing: {field}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}