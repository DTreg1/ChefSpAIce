import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react";

interface VoiceActivityIndicatorProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  isProcessing?: boolean;
  className?: string;
}

export function VoiceActivityIndicator({
  isListening = false,
  isSpeaking = false,
  isProcessing = false,
  className,
}: VoiceActivityIndicatorProps) {
  const [pulseScale, setPulseScale] = useState(1);

  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        setPulseScale((prev) => (prev === 1 ? 1.2 : 1));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isListening]);

  if (isProcessing && !isSpeaking) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
        <span className="text-sm font-medium">Processing...</span>
      </div>
    );
  }

  if (isSpeaking) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative">
          <Volume2 className="w-5 h-5 text-green-500" />
          <div className="absolute inset-0 -z-10">
            <div className="w-full h-full bg-green-500 rounded-full animate-ping opacity-25" />
          </div>
        </div>
        <span className="text-sm font-medium text-green-600 dark:text-green-400">
          Speaking...
        </span>
      </div>
    );
  }

  if (isListening) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative">
          <Mic
            className="w-5 h-5 text-red-500 transition-transform"
            style={{ transform: `scale(${pulseScale})` }}
          />
          <div className="absolute inset-0 -z-10">
            <div className="w-full h-full bg-red-500 rounded-full animate-ping opacity-25" />
          </div>
        </div>
        <span className="text-sm font-medium text-red-600 dark:text-red-400">
          Listening...
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <MicOff className="w-5 h-5 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Voice mode inactive</span>
    </div>
  );
}
