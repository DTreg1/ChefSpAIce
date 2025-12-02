import { useState, useEffect, useRef } from "react";
import { Check, AlertCircle, Lightbulb, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

interface ValidationError {
  field: string;
  message: string;
  type: "error" | "warning" | "info";
}

interface ValidationSuggestion {
  value: string;
  confidence: number;
  reasoning: string;
  action?: string;
}

interface QuickFix {
  label: string;
  value: string;
  action: string;
}

interface SmartValidationProps {
  fieldName: string;
  fieldType: string;
  value: string;
  errors?: string[];
  suggestions?: ValidationSuggestion[];
  quickFixes?: QuickFix[];
  formatHints?: string[];
  onApplySuggestion?: (value: string, action?: string) => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * SmartValidation Component
 * Displays validation errors with intelligent suggestions and quick fixes
 */
export function SmartValidation({
  fieldName,
  fieldType,
  value,
  errors = [],
  suggestions = [],
  quickFixes = [],
  formatHints = [],
  onApplySuggestion,
  onDismiss,
  className,
}: SmartValidationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [appliedSuggestion, setAppliedSuggestion] = useState<string | null>(
    null,
  );

  const handleApplySuggestion = (suggestionValue: string, action?: string) => {
    setAppliedSuggestion(suggestionValue);
    onApplySuggestion?.(suggestionValue, action);

    // Auto-collapse after applying
    setTimeout(() => setIsExpanded(false), 1500);
  };

  if (errors.length === 0) {
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "mt-2 rounded-md border bg-background p-3",
          errors.length > 0 && "border-destructive/50 bg-destructive/5",
          className,
        )}
        data-testid={`validation-error-${fieldName}`}
      >
        {/* Error Message */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                {errors[0]}
              </p>

              {/* Format Hints */}
              {formatHints.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatHints[0]}
                </p>
              )}
            </div>
          </div>

          {(suggestions.length > 0 || quickFixes.length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs"
              data-testid={`button-expand-suggestions-${fieldName}`}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {isExpanded ? "Hide" : "Show"} Suggestions
            </Button>
          )}
        </div>

        {/* Expanded Suggestions */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 space-y-2"
            >
              {/* Quick Fixes */}
              {quickFixes.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    Quick Fixes:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {quickFixes.map((fix, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleApplySuggestion(fix.value, fix.action)
                        }
                        className="text-xs h-7"
                        data-testid={`button-quick-fix-${fieldName}-${index}`}
                      >
                        {fix.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Suggestions */}
              {suggestions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    AI Suggestions:
                  </p>
                  <div className="space-y-1">
                    {suggestions.map((suggestion, index) => (
                      <SuggestionCard
                        key={index}
                        suggestion={suggestion}
                        onApply={() =>
                          handleApplySuggestion(
                            suggestion.value,
                            suggestion.action,
                          )
                        }
                        isApplied={appliedSuggestion === suggestion.value}
                        fieldName={fieldName}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * SuggestionCard Component
 * Individual suggestion with confidence indicator
 */
function SuggestionCard({
  suggestion,
  onApply,
  isApplied,
  fieldName,
  index,
}: {
  suggestion: ValidationSuggestion;
  onApply: () => void;
  isApplied: boolean;
  fieldName: string;
  index: number;
}) {
  const confidenceColor =
    suggestion.confidence >= 0.8
      ? "text-green-600"
      : suggestion.confidence >= 0.5
        ? "text-yellow-600"
        : "text-red-600";

  const confidenceLabel =
    suggestion.confidence >= 0.8
      ? "High"
      : suggestion.confidence >= 0.5
        ? "Medium"
        : "Low";

  return (
    <div
      className={cn(
        "flex items-start gap-2 p-2 rounded-md border",
        isApplied ? "bg-green-50 border-green-200" : "bg-muted/50",
      )}
      data-testid={`suggestion-card-${fieldName}-${index}`}
    >
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <code className="text-xs bg-background px-1.5 py-0.5 rounded">
            {suggestion.value}
          </code>
          <Badge variant="outline" className={cn("text-xs", confidenceColor)}>
            {confidenceLabel} ({Math.round(suggestion.confidence * 100)}%)
          </Badge>
          {isApplied && (
            <Badge variant="default" className="text-xs">
              <Check className="h-3 w-3 mr-1" />
              Applied
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{suggestion.reasoning}</p>
      </div>
      {!isApplied && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onApply}
          className="h-7 px-2 text-xs"
          data-testid={`button-apply-suggestion-${fieldName}-${index}`}
        >
          Apply
        </Button>
      )}
    </div>
  );
}

/**
 * ValidationSuccess Component
 * Shows success state after validation passes
 */
export function ValidationSuccess({
  fieldName,
  message = "Valid",
  className,
}: {
  fieldName: string;
  message?: string;
  className?: string;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "mt-2 flex items-center gap-2 text-sm text-green-600",
          className,
        )}
        data-testid={`validation-success-${fieldName}`}
      >
        <Check className="h-4 w-4" />
        <span>{message}</span>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * FormatHelper Component
 * Shows format examples and hints
 */
export function FormatHelper({
  fieldType,
  examples,
  className,
}: {
  fieldType: string;
  examples: string[];
  className?: string;
}) {
  if (examples.length === 0) return null;

  return (
    <div className={cn("mt-1 text-xs text-muted-foreground", className)}>
      <span className="font-medium">Format:</span> {examples.join(" or ")}
    </div>
  );
}

/**
 * InlineCorrection Component
 * Shows inline correction options directly in the input
 */
export function InlineCorrection({
  suggestion,
  onApply,
  onDismiss,
}: {
  suggestion: string;
  onApply: () => void;
  onDismiss: () => void;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1 ml-2 text-sm">
            <button
              onClick={onApply}
              className="text-blue-600 hover:text-blue-700 underline"
              data-testid="button-inline-correction-apply"
            >
              {suggestion}
            </button>
            <button
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-inline-correction-dismiss"
            >
              ×
            </button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Click to apply this suggestion</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
