/**
 * GrammarHighlighter Component
 * 
 * Displays text with visual underlines for grammar, spelling, and style issues.
 * Different colors and styles for different severity levels.
 */

import { cn } from "@/lib/utils";
import { WritingSuggestion } from "./writing-editor";

interface GrammarHighlighterProps {
  text: string;
  suggestions: WritingSuggestion[];
  onSuggestionClick?: (suggestion: WritingSuggestion) => void;
  className?: string;
}

export function GrammarHighlighter({
  text,
  suggestions,
  onSuggestionClick,
  className,
}: GrammarHighlighterProps) {
  // Sort suggestions by position to process them in order
  const sortedSuggestions = [...suggestions]
    .filter(s => s.position !== undefined && s.length !== undefined)
    .sort((a, b) => (a.position || 0) - (b.position || 0));

  // Build the highlighted text with spans for each suggestion
  const buildHighlightedText = () => {
    if (sortedSuggestions.length === 0) {
      return <span>{text}</span>;
    }

    const elements: JSX.Element[] = [];
    let lastEnd = 0;

    sortedSuggestions.forEach((suggestion, index) => {
      const start = suggestion.position || 0;
      const end = start + (suggestion.length || 0);

      // Add text before this suggestion
      if (start > lastEnd) {
        elements.push(
          <span key={`text-${index}`}>{text.substring(lastEnd, start)}</span>
        );
      }

      // Add the highlighted suggestion
      elements.push(
        <span
          key={`suggestion-${index}`}
          className={cn(
            "cursor-pointer relative inline-block transition-colors",
            getUnderlineClass(suggestion.severity, suggestion.suggestionType)
          )}
          onClick={() => onSuggestionClick?.(suggestion)}
          data-testid={`highlight-${suggestion.id}`}
          title={suggestion.reason}
        >
          {text.substring(start, end)}
          <span className={cn(
            "absolute bottom-0 left-0 right-0 h-0.5",
            getUnderlineStyle(suggestion.severity, suggestion.suggestionType)
          )} />
        </span>
      );

      lastEnd = end;
    });

    // Add remaining text
    if (lastEnd < text.length) {
      elements.push(
        <span key={`text-final`}>{text.substring(lastEnd)}</span>
      );
    }

    return <>{elements}</>;
  };

  const getUnderlineClass = (severity: string, type: string) => {
    if (severity === "error") {
      return "hover:bg-destructive/10";
    } else if (severity === "warning") {
      return "hover:bg-yellow-500/10";
    } else {
      return "hover:bg-primary/10";
    }
  };

  const getUnderlineStyle = (severity: string, type: string) => {
    if (severity === "error") {
      if (type === "spelling") {
        return "bg-destructive border-b-2 border-destructive border-dashed";
      }
      return "bg-destructive";
    } else if (severity === "warning") {
      return "bg-yellow-500";
    } else {
      if (type === "style") {
        return "bg-primary opacity-50 border-b border-primary border-dotted";
      }
      return "bg-primary/50";
    }
  };

  return (
    <div className={cn("font-mono text-sm leading-relaxed whitespace-pre-wrap", className)}>
      {buildHighlightedText()}
    </div>
  );
}