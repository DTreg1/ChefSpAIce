import { useState, useCallback } from "react";
import { VoiceButton } from "./VoiceButton";
import { VoicePermissionModal } from "./VoicePermissionModal";
import { TranscriptDisplay } from "./TranscriptDisplay";
import { VoiceCommandHelper } from "./VoiceCommandHelper";
import { useVoiceFeedback } from "./VoiceFeedback";
import { Button } from "@/components/ui/button";
import { HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceControlProps {
  className?: string;
  showHelper?: boolean;
}

export function VoiceControl({ className, showHelper = false }: VoiceControlProps) {
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showHelperPanel, setShowHelperPanel] = useState(showHelper);
  const { feedbackState, showFeedback, VoiceFeedbackComponent } = useVoiceFeedback();

  const handleTranscript = useCallback((text: string) => {
    setTranscript(text);
    setIsListening(false);
    showFeedback("processing", "Processing your command...");
  }, [showFeedback]);

  const handleCommand = useCallback((command: any) => {
    if (command.interpretation?.success) {
      showFeedback("success", command.interpretation.response || command.interpretation.actionTaken);
      
      // Handle navigation
      if (command.interpretation.navigationPath) {
        setTimeout(() => {
          window.location.href = command.interpretation.navigationPath;
        }, 1000);
      }
    } else {
      showFeedback("error", "Failed to understand command. Please try again.");
    }
    
    // Clear transcript after a delay
    setTimeout(() => {
      setTranscript("");
    }, 3000);
  }, [showFeedback]);

  const handleRecordingStateChange = useCallback((recording: boolean) => {
    setIsListening(recording);
    if (recording) {
      showFeedback("listening");
      setTranscript("");
    }
  }, [showFeedback]);

  const handlePermissionAllow = useCallback(() => {
    setShowPermissionModal(false);
    // Permission will be requested when the user starts recording
  }, []);

  const handlePermissionDeny = useCallback(() => {
    setShowPermissionModal(false);
  }, []);

  const handleTryCommand = useCallback((exampleCommand: string) => {
    setTranscript(exampleCommand);
    handleTranscript(exampleCommand);
  }, [handleTranscript]);

  return (
    <div className={cn("relative", className)}>
      {/* Main Voice Button */}
      <div className="flex items-center gap-2">
        <VoiceButton 
          onTranscript={handleTranscript}
          onCommand={handleCommand}
        />
        
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setShowHelperPanel(!showHelperPanel)}
          data-testid="button-voice-help"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>

      {/* Transcript Display */}
      {(transcript || isListening) && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 max-w-md w-full px-4">
          <TranscriptDisplay 
            transcript={transcript}
            isListening={isListening}
          />
        </div>
      )}

      {/* Helper Panel */}
      {showHelperPanel && (
        <div className="fixed right-4 top-20 z-30 w-96 animate-in slide-in-from-right duration-300">
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              className="absolute -top-2 -right-2 z-10 bg-background border"
              onClick={() => setShowHelperPanel(false)}
              data-testid="button-close-helper"
            >
              <X className="h-4 w-4" />
            </Button>
            <VoiceCommandHelper 
              onTryCommand={handleTryCommand}
            />
          </div>
        </div>
      )}

      {/* Permission Modal */}
      <VoicePermissionModal
        open={showPermissionModal}
        onOpenChange={setShowPermissionModal}
        onAllow={handlePermissionAllow}
        onDeny={handlePermissionDeny}
      />

      {/* Feedback Display */}
      <VoiceFeedbackComponent />
    </div>
  );
}

// Standalone Voice Bar for integration in headers
export function VoiceBar({ className }: { className?: string }) {
  const [transcript, setTranscript] = useState("");
  const { showFeedback, VoiceFeedbackComponent } = useVoiceFeedback();

  const handleTranscript = useCallback((text: string) => {
    setTranscript(text);
    showFeedback("processing");
  }, [showFeedback]);

  const handleCommand = useCallback((command: any) => {
    if (command.interpretation?.success) {
      showFeedback("success", command.interpretation.response);
      if (command.interpretation.navigationPath) {
        window.location.href = command.interpretation.navigationPath;
      }
    } else {
      showFeedback("error");
    }
    setTimeout(() => setTranscript(""), 3000);
  }, [showFeedback]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <VoiceButton 
        onTranscript={handleTranscript}
        onCommand={handleCommand}
      />
      {transcript && (
        <span className="text-sm text-muted-foreground italic animate-in fade-in">
          "{transcript}"
        </span>
      )}
      <VoiceCommandHelper compact />
      <VoiceFeedbackComponent />
    </div>
  );
}