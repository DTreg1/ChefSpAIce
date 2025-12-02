import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Volume2 } from "lucide-react";

interface TranscriptDisplayProps {
  transcript: string;
  isListening: boolean;
  className?: string;
}

export function TranscriptDisplay({
  transcript,
  isListening,
  className,
}: TranscriptDisplayProps) {
  const [animatedTranscript, setAnimatedTranscript] = useState("");

  useEffect(() => {
    if (transcript) {
      // Animate text appearance
      let index = 0;
      const interval = setInterval(() => {
        if (index <= transcript.length) {
          setAnimatedTranscript(transcript.slice(0, index));
          index++;
        } else {
          clearInterval(interval);
        }
      }, 30);

      return () => clearInterval(interval);
    } else {
      setAnimatedTranscript("");
    }
  }, [transcript]);

  if (!transcript && !isListening) return null;

  return (
    <div
      className={cn(
        "bg-muted/50 backdrop-blur-sm border rounded-lg p-4 transition-all duration-300",
        isListening && "border-primary",
        className,
      )}
      data-testid="transcript-display"
    >
      <div className="flex items-start gap-2">
        {isListening && (
          <div className="mt-1">
            <Volume2 className="h-4 w-4 text-primary animate-pulse" />
          </div>
        )}
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">
            {isListening ? "Listening..." : "You said:"}
          </p>
          <p className="text-base font-medium">
            {animatedTranscript ||
              (isListening && (
                <span className="inline-flex gap-1">
                  <span
                    className="animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  >
                    .
                  </span>
                  <span
                    className="animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  >
                    .
                  </span>
                  <span
                    className="animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  >
                    .
                  </span>
                </span>
              ))}
          </p>
        </div>
      </div>
    </div>
  );
}
