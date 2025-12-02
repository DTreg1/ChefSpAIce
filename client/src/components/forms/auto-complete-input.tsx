/**
 * AutoCompleteInput Component
 *
 * Smart input field with ML-powered auto-completion suggestions.
 * Learns from user behavior and provides context-aware predictions.
 *
 * Features:
 * - Real-time suggestions as user types
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Personal history prioritization
 * - Context-aware predictions
 * - Visual feedback for confidence levels
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChevronDown,
  Clock,
  TrendingUp,
  User,
  Globe,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

interface Suggestion {
  value: string;
  type: "personal" | "global" | "ai" | "context";
  confidence?: number;
  metadata?: {
    lastUsed?: string;
    frequency?: number;
    source?: string;
  };
}

interface AutoCompleteInputProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  context?: Record<string, any>;
  enableLearning?: boolean;
  minCharsForSuggestions?: number;
  maxSuggestions?: number;
  debounceMs?: number;
  showConfidence?: boolean;
  autoFocus?: boolean;
}

export function AutoCompleteInput({
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  className,
  context = {},
  enableLearning = true,
  minCharsForSuggestions = 1,
  maxSuggestions = 10,
  debounceMs = 300,
  showConfidence = false,
  autoFocus = false,
}: AutoCompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Fetch suggestions from API
  const { refetch: fetchSuggestions } = useQuery({
    queryKey: [`/api/autocomplete/suggestions`, name, debouncedValue],
    queryFn: async () => {
      if (debouncedValue.length < minCharsForSuggestions) {
        return { suggestions: [] };
      }

      const params = new URLSearchParams({
        fieldName: name,
        query: debouncedValue,
      });

      const response = await fetch(`/api/autocomplete/suggestions?${params}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      return response.json();
    },
    enabled: false,
    gcTime: 0,
  });

  // Fetch context-aware suggestions
  const { mutate: fetchContextSuggestions } = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/autocomplete/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fieldName: name,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch context suggestions");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.suggestions && data.suggestions.length > 0) {
        const contextSuggestions = data.suggestions.map((s: string) => ({
          value: s,
          type: "context" as const,
          metadata: { source: "context-aware" },
        }));
        setSuggestions((prev) =>
          [...contextSuggestions, ...prev].slice(0, maxSuggestions),
        );
      }
    },
  });

  // Record user input for learning
  const { mutate: recordInput } = useMutation({
    mutationFn: async (value: string) => {
      const response = await fetch("/api/autocomplete/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fieldName: name,
          value,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to record input");
      }

      return response.json();
    },
  });

  // Record feedback when suggestion is selected
  const { mutate: recordFeedback } = useMutation({
    mutationFn: async (data: {
      suggestedValue: string;
      wasSelected: boolean;
      finalValue: string;
    }) => {
      const response = await fetch("/api/autocomplete/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fieldName: name,
          ...data,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to record feedback");
      }

      return response.json();
    },
  });

  // Debounce value changes
  useEffect(() => {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, debounceMs);

    return () => clearTimeout(debounceTimerRef.current);
  }, [value, debounceMs]);

  // Fetch suggestions when debounced value changes
  useEffect(() => {
    if (debouncedValue.length >= minCharsForSuggestions) {
      fetchSuggestions().then((result) => {
        if (result.data?.suggestions) {
          const basicSuggestions = result.data.suggestions.map(
            (s: string, index: number) => ({
              value: s,
              type: index < 5 ? "personal" : "global",
              metadata: {},
            }),
          );
          setSuggestions(basicSuggestions.slice(0, maxSuggestions));
          setIsOpen(basicSuggestions.length > 0);
        }
      });

      // Also fetch context suggestions if context is provided
      if (Object.keys(context).length > 0) {
        fetchContextSuggestions();
      }
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [debouncedValue, name, minCharsForSuggestions, maxSuggestions]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0,
          );
          break;

        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1,
          );
          break;

        case "Enter":
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            const suggestion = suggestions[selectedIndex];
            selectSuggestion(suggestion);
          }
          break;

        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setSelectedIndex(-1);
          break;

        case "Tab":
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            e.preventDefault();
            const suggestion = suggestions[selectedIndex];
            selectSuggestion(suggestion);
          }
          break;
      }
    },
    [isOpen, suggestions, selectedIndex],
  );

  // Select a suggestion
  const selectSuggestion = useCallback(
    (suggestion: Suggestion) => {
      onChange(suggestion.value);
      setIsOpen(false);
      setSelectedIndex(-1);

      // Record feedback
      if (enableLearning) {
        recordFeedback({
          suggestedValue: suggestion.value,
          wasSelected: true,
          finalValue: suggestion.value,
        });
      }

      // Focus back on input
      inputRef.current?.focus();
    },
    [onChange, enableLearning, recordFeedback],
  );

  // Handle input blur
  const handleBlur = useCallback(() => {
    // Delay to allow clicking on suggestions
    setTimeout(() => {
      setIsOpen(false);
      setSelectedIndex(-1);

      // Record the final value if learning is ACTUALLY enabled
      if (enableLearning && value) {
        recordInput(value);
      }

      onBlur?.();
    }, 200);
  }, [value, enableLearning, recordInput, onBlur]);

  // Get icon for suggestion type
  const getIcon = (type: Suggestion["type"]) => {
    switch (type) {
      case "personal":
        return <User className="h-3 w-3" />;
      case "global":
        return <Globe className="h-3 w-3" />;
      case "ai":
        return <Sparkles className="h-3 w-3" />;
      case "context":
        return <TrendingUp className="h-3 w-3" />;
      default:
        return null;
    }
  };

  // Get type label
  const getTypeLabel = (type: Suggestion["type"]) => {
    switch (type) {
      case "personal":
        return "Your history";
      case "global":
        return "Common";
      case "ai":
        return "AI suggested";
      case "context":
        return "Based on context";
      default:
        return "";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("pr-8", className)}
          autoFocus={autoFocus}
          autoComplete="off"
          data-testid={`input-${name}`}
        />

        {suggestions.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-2"
            onClick={() => setIsOpen(!isOpen)}
            tabIndex={-1}
            data-testid={`button-suggestions-toggle-${name}`}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isOpen && "rotate-180",
              )}
            />
          </Button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <Card className="absolute z-50 mt-1 w-full overflow-hidden p-0 shadow-lg">
          <ul className="max-h-60 overflow-auto py-1">
            {suggestions.map((suggestion, index) => (
              <li
                key={`${suggestion.value}-${index}`}
                className={cn(
                  "flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-muted",
                  selectedIndex === index && "bg-muted",
                )}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => selectSuggestion(suggestion)}
                data-testid={`suggestion-${name}-${index}`}
              >
                <div className="flex items-center gap-2">
                  {getIcon(suggestion.type)}
                  <span className="text-sm">{suggestion.value}</span>
                </div>

                <div className="flex items-center gap-2">
                  {showConfidence && suggestion.confidence && (
                    <Badge variant="outline" className="text-xs">
                      {Math.round(suggestion.confidence * 100)}%
                    </Badge>
                  )}

                  <span className="text-xs text-muted-foreground">
                    {getTypeLabel(suggestion.type)}
                  </span>

                  {suggestion.metadata?.lastUsed && (
                    <Clock className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              </li>
            ))}
          </ul>

          {enableLearning && (
            <div className="border-t px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Press ↑↓ to navigate, Enter to select, Esc to close
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
