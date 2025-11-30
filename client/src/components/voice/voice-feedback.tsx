import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Loader2, Mic } from "lucide-react";

interface VoiceFeedbackProps {
  status: "idle" | "listening" | "processing" | "success" | "error";
  message?: string;
  className?: string;
  autoHide?: boolean;
}

export function VoiceFeedback({ 
  status, 
  message, 
  className,
  autoHide = true 
}: VoiceFeedbackProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status !== "idle") {
      setVisible(true);
      
      if (autoHide && (status === "success" || status === "error")) {
        const timer = setTimeout(() => {
          setVisible(false);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [status, autoHide]);

  if (!visible) return null;

  const statusConfig = {
    idle: {
      icon: null,
      color: "",
      defaultMessage: ""
    },
    listening: {
      icon: <Mic className="h-5 w-5 animate-pulse" />,
      color: "text-primary border-primary",
      defaultMessage: "Listening..."
    },
    processing: {
      icon: <Loader2 className="h-5 w-5 animate-spin" />,
      color: "text-muted-foreground border-muted",
      defaultMessage: "Processing command..."
    },
    success: {
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: "text-green-600 border-green-600 bg-green-50 dark:bg-green-950/20",
      defaultMessage: "Command executed successfully"
    },
    error: {
      icon: <XCircle className="h-5 w-5" />,
      color: "text-destructive border-destructive bg-destructive/10",
      defaultMessage: "Failed to process command"
    }
  };

  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50",
        "min-w-[300px] max-w-[500px]",
        "bg-background border rounded-lg shadow-lg",
        "p-4 flex items-center gap-3",
        "animate-in fade-in slide-in-from-bottom-2 duration-300",
        config.color,
        className
      )}
      data-testid="voice-feedback"
    >
      {config.icon}
      <div className="flex-1">
        <p className="text-sm font-medium">
          {message || config.defaultMessage}
        </p>
      </div>
    </div>
  );
}

// Hook to use VoiceFeedback
export function useVoiceFeedback() {
  const [feedbackState, setFeedbackState] = useState<{
    status: VoiceFeedbackProps["status"];
    message?: string;
  }>({
    status: "idle"
  });

  const showFeedback = (status: VoiceFeedbackProps["status"], message?: string) => {
    setFeedbackState({ status, message });
  };

  const hideFeedback = () => {
    setFeedbackState({ status: "idle" });
  };

  return {
    feedbackState,
    showFeedback,
    hideFeedback,
    VoiceFeedbackComponent: () => (
      <VoiceFeedback 
        status={feedbackState.status} 
        message={feedbackState.message}
      />
    )
  };
}