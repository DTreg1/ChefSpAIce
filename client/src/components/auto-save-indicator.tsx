/**
 * Auto-Save Indicator Component
 * 
 * Shows the current save status with unobtrusive animations
 */

import { useEffect, useState } from 'react';
import { Check, Cloud, CloudOff, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  error?: string;
  className?: string;
}

export function AutoSaveIndicator({
  isSaving,
  lastSaved,
  hasUnsavedChanges,
  error,
  className,
}: AutoSaveIndicatorProps) {
  const [relativeTime, setRelativeTime] = useState<string>('');

  // Update relative time every second
  useEffect(() => {
    if (!lastSaved) return;

    const updateRelativeTime = () => {
      const now = new Date();
      const diff = now.getTime() - lastSaved.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (seconds < 5) {
        setRelativeTime('Just now');
      } else if (seconds < 60) {
        setRelativeTime(`${seconds} seconds ago`);
      } else if (minutes < 60) {
        setRelativeTime(`${minutes} minute${minutes === 1 ? '' : 's'} ago`);
      } else {
        setRelativeTime(`${hours} hour${hours === 1 ? '' : 's'} ago`);
      }
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 1000);

    return () => clearInterval(interval);
  }, [lastSaved]);

  // Determine status and appearance
  const getStatusConfig = () => {
    if (error) {
      return {
        icon: <AlertCircle className="w-3.5 h-3.5" />,
        text: 'Save failed',
        variant: 'destructive' as const,
        tooltip: error,
      };
    }

    if (isSaving) {
      return {
        icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
        text: 'Saving...',
        variant: 'secondary' as const,
        tooltip: 'Your work is being saved',
      };
    }

    if (hasUnsavedChanges) {
      return {
        icon: <CloudOff className="w-3.5 h-3.5" />,
        text: 'Unsaved changes',
        variant: 'outline' as const,
        tooltip: 'Changes will be saved automatically',
      };
    }

    if (lastSaved) {
      return {
        icon: <Check className="w-3.5 h-3.5" />,
        text: relativeTime || 'Saved',
        variant: 'secondary' as const,
        tooltip: `Last saved at ${lastSaved.toLocaleTimeString()}`,
      };
    }

    return {
      icon: <Cloud className="w-3.5 h-3.5" />,
      text: 'Ready',
      variant: 'secondary' as const,
      tooltip: 'Auto-save is enabled',
    };
  };

  const config = getStatusConfig();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={config.variant}
            className={cn(
              'gap-1.5 text-xs font-normal transition-all duration-200',
              'data-testid="auto-save-indicator"',
              isSaving && 'animate-pulse',
              className
            )}
          >
            {config.icon}
            <span className="hidden sm:inline">{config.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}