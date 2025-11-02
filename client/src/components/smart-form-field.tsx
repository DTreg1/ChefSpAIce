/**
 * SmartFormField Component
 * 
 * Intelligent form field wrapper that adds ML-powered auto-completion
 * to any form field. Integrates with react-hook-form and shadcn/ui.
 * 
 * Features:
 * - Seamless integration with existing forms
 * - Automatic context detection
 * - Form memory toggle
 * - Privacy controls
 * - Field-specific learning
 */

import { useState } from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AutoCompleteInput } from "./auto-complete-input";
import { Input } from "@/components/ui/input";
import {
  Brain,
  Shield,
  History,
  Sparkles,
  Info,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Control, FieldPath, FieldValues } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface SmartFormFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  control: Control<TFieldValues>;
  name: TName;
  label?: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  enableAutoComplete?: boolean;
  enableLearning?: boolean;
  showPrivacyToggle?: boolean;
  showHistoryButton?: boolean;
  context?: Record<string, any>;
  type?: string;
  autoFocus?: boolean;
  required?: boolean;
}

export function SmartFormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  control,
  name,
  label,
  placeholder,
  description,
  disabled = false,
  className,
  enableAutoComplete = true,
  enableLearning = true,
  showPrivacyToggle = false,
  showHistoryButton = false,
  context = {},
  type = "text",
  autoFocus = false,
  required = false,
}: SmartFormFieldProps<TFieldValues, TName>) {
  const [autoCompleteEnabled, setAutoCompleteEnabled] = useState(enableAutoComplete);
  const [learningEnabled, setLearningEnabled] = useState(enableLearning);
  const [showHistory, setShowHistory] = useState(false);

  // Clear field history
  const { mutate: clearHistory } = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/autocomplete/history?fieldName=${name}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to clear history");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "History cleared",
        description: `Your ${name} history has been cleared`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear history",
        variant: "destructive",
      });
    },
  });

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={cn("space-y-2", className)}>
          <div className="flex items-center justify-between">
            {label && (
              <FormLabel className="flex items-center gap-2">
                {label}
                {required && <span className="text-destructive">*</span>}
                {autoCompleteEnabled && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Brain className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Smart suggestions enabled based on your history and patterns
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </FormLabel>
            )}
            
            <div className="flex items-center gap-2">
              {showPrivacyToggle && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <Shield className="h-3 w-3 text-muted-foreground" />
                        <Switch
                          checked={learningEnabled}
                          onCheckedChange={setLearningEnabled}
                          aria-label="Toggle learning"
                          data-testid={`switch-learning-${name}`}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {learningEnabled
                          ? "Learning from your inputs"
                          : "Learning disabled - no data saved"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {showHistoryButton && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => clearHistory()}
                        data-testid={`button-clear-history-${name}`}
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Clear history for this field</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          
          <FormControl>
            {autoCompleteEnabled ? (
              <AutoCompleteInput
                name={name as string}
                value={field.value || ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder={placeholder}
                disabled={disabled || field.disabled}
                context={context}
                enableLearning={learningEnabled}
                autoFocus={autoFocus}
                data-testid={`smart-input-${name}`}
              />
            ) : (
              <Input
                type={type}
                {...field}
                value={field.value || ""}
                placeholder={placeholder}
                disabled={disabled || field.disabled}
                autoFocus={autoFocus}
                data-testid={`input-${name}`}
              />
            )}
          </FormControl>
          
          {description && <FormDescription>{description}</FormDescription>}
          
          <FormMessage />
          
          {autoCompleteEnabled && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              <span>
                Press Tab or Enter to accept suggestions
              </span>
            </div>
          )}
        </FormItem>
      )}
    />
  );
}

/**
 * FormMemoryToggle Component
 * 
 * Global toggle for form memory/auto-completion features
 */
export function FormMemoryToggle({
  enabled,
  onChange,
  className,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Brain className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">Form Memory</span>
      <Switch
        checked={enabled}
        onCheckedChange={onChange}
        aria-label="Toggle form memory"
        data-testid="switch-form-memory"
      />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3 w-3 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs text-xs">
              When enabled, forms will remember your previous inputs and suggest them
              as you type. Your data is stored securely and never shared.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

/**
 * AutoFillAllButton Component
 * 
 * Button to auto-fill all form fields with smart suggestions
 */
export function AutoFillAllButton({
  onClick,
  disabled = false,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={cn("gap-2", className)}
            data-testid="button-autofill-all"
          >
            <Sparkles className="h-4 w-4" />
            Auto-fill Form
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Fill all fields with your most commonly used values
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}