import { Progress } from "@/components/ui/progress";
import { Loader2, Mic } from "lucide-react";

interface ModelLoadingIndicatorProps {
  isLoading: boolean;
  progress: number;
}

export function ModelLoadingIndicator({ isLoading, progress }: ModelLoadingIndicatorProps) {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4 shadow-lg border">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-full">
            <Mic className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Loading Voice Model</h3>
            <p className="text-sm text-muted-foreground">
              Downloading Whisper for offline voice recognition...
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {progress < 100 ? 'This only happens once' : 'Almost ready...'}
            </span>
            <span className="font-medium">{progress}%</span>
          </div>
        </div>
        
        {progress < 30 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> The voice model is about 30MB and enables fully offline speech recognition that works everywhere, even in Replit!
            </p>
          </div>
        )}
        
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Please wait while the model downloads...</span>
        </div>
      </div>
    </div>
  );
}