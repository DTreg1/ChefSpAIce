/**
 * WritingEditor Component
 *
 * Main text editor with inline suggestions and real-time improvements.
 * Features highlighting for errors, suggestions, and improvements.
 */

import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WritingSuggestion {
  id: string;
  suggestionType: "grammar" | "spelling" | "style" | "tone" | "clarity";
  originalSnippet: string;
  suggestedSnippet: string;
  reason: string;
  position?: number;
  length?: number;
  severity: "error" | "warning" | "suggestion";
  accepted?: boolean;
}

interface WritingEditorProps {
  initialText?: string;
  suggestions: WritingSuggestion[];
  onTextChange: (text: string) => void;
  onAcceptSuggestion: (suggestionId: string) => void;
  onRejectSuggestion: (suggestionId: string) => void;
  onAnalyze: () => void;
  isAnalyzing?: boolean;
  className?: string;
}

export function WritingEditor({
  initialText = "",
  suggestions,
  onTextChange,
  onAcceptSuggestion,
  onRejectSuggestion,
  onAnalyze,
  isAnalyzing = false,
  className,
}: WritingEditorProps) {
  const [text, setText] = useState(initialText);
  const [highlightedSuggestion, setHighlightedSuggestion] = useState<
    string | null
  >(null);
  const [activeSuggestion, setActiveSuggestion] =
    useState<WritingSuggestion | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    onTextChange(newText);
  };

  const applySuggestion = (suggestion: WritingSuggestion) => {
    if (suggestion.position !== undefined && suggestion.length !== undefined) {
      const before = text.substring(0, suggestion.position);
      const after = text.substring(suggestion.position + suggestion.length);
      const newText = before + suggestion.suggestedSnippet + after;
      setText(newText);
      onTextChange(newText);
      onAcceptSuggestion(suggestion.id);
      setActiveSuggestion(null);
    } else {
      // Fallback: Replace all occurrences
      const newText = text.replace(
        suggestion.originalSnippet,
        suggestion.suggestedSnippet,
      );
      setText(newText);
      onTextChange(newText);
      onAcceptSuggestion(suggestion.id);
      setActiveSuggestion(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "bg-destructive/20 border-destructive";
      case "warning":
        return "bg-yellow-500/20 border-yellow-500";
      case "suggestion":
        return "bg-primary/20 border-primary";
      default:
        return "bg-muted border-border";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "grammar":
        return "📝";
      case "spelling":
        return "🔤";
      case "style":
        return "✨";
      case "tone":
        return "🎯";
      case "clarity":
        return "💡";
      default:
        return "📋";
    }
  };

  // Group suggestions by position for inline display
  const positionedSuggestions = suggestions.filter(
    (s) => s.position !== undefined,
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          placeholder="Enter your text here to get writing suggestions..."
          className="min-h-[400px] text-base leading-relaxed p-4 font-sans"
          data-testid="input-writing-text"
        />

        {/* Analyze button */}
        <div className="absolute bottom-4 right-4">
          <Button
            onClick={onAnalyze}
            disabled={isAnalyzing || text.length === 0}
            size="sm"
            data-testid="button-analyze"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                Analyzing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Analyze
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Active suggestion popup */}
      {activeSuggestion && (
        <Card
          className={cn(
            "p-4 space-y-3 transition-morph",
            getSeverityColor(activeSuggestion.severity),
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {getTypeIcon(activeSuggestion.suggestionType)}
                </span>
                <Badge variant="secondary" className="capitalize">
                  {activeSuggestion.suggestionType}
                </Badge>
                <Badge
                  variant={
                    activeSuggestion.severity === "error"
                      ? "destructive"
                      : "outline"
                  }
                  className="capitalize"
                >
                  {activeSuggestion.severity}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Original:
                  </span>
                  <span className="text-sm line-through opacity-70">
                    {activeSuggestion.originalSnippet}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Suggested:
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {activeSuggestion.suggestedSnippet}
                  </span>
                </div>
                {activeSuggestion.reason && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Reason:
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {activeSuggestion.reason}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => applySuggestion(activeSuggestion)}
                className="h-8 w-8 p-0"
                data-testid={`button-accept-${activeSuggestion.id}`}
              >
                <Check className="w-4 h-4 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onRejectSuggestion(activeSuggestion.id);
                  setActiveSuggestion(null);
                }}
                className="h-8 w-8 p-0"
                data-testid={`button-reject-${activeSuggestion.id}`}
              >
                <X className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Inline suggestion indicators */}
      {suggestions.length > 0 && !activeSuggestion && (
        <div className="flex flex-wrap gap-2">
          {suggestions.slice(0, 5).map((suggestion) => (
            <Button
              key={suggestion.id}
              variant="outline"
              size="sm"
              onClick={() => setActiveSuggestion(suggestion)}
              className={cn("text-xs", getSeverityColor(suggestion.severity))}
              data-testid={`button-suggestion-${suggestion.id}`}
            >
              <span className="mr-1">
                {getTypeIcon(suggestion.suggestionType)}
              </span>
              {suggestion.originalSnippet.length > 20
                ? suggestion.originalSnippet.substring(0, 20) + "..."
                : suggestion.originalSnippet}
            </Button>
          ))}
          {suggestions.length > 5 && (
            <Badge variant="secondary">
              +{suggestions.length - 5} more suggestions
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
