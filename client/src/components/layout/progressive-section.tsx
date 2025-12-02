import { ReactNode, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Settings2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProgressiveSection } from "@/hooks/useProgressiveDisclosure";

interface ProgressiveSectionProps {
  id: string;
  title: string;
  summary?: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  icon?: "chevron" | "plus" | "settings";
  showLabel?: boolean;
  label?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "sm" | "default" | "lg";
  persist?: boolean;
  onToggle?: (expanded: boolean) => void;
  testId?: string;
}

export function ProgressiveSection({
  id,
  title,
  summary,
  children,
  defaultExpanded = false,
  className,
  triggerClassName,
  contentClassName,
  icon = "chevron",
  showLabel = true,
  label,
  variant = "ghost",
  size = "default",
  persist = true,
  onToggle,
  testId,
}: ProgressiveSectionProps) {
  // Always call the hook to maintain consistent hook order
  const persistedState = useProgressiveSection(id, defaultExpanded);

  // Local state for non-persisted sections
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);

  // Use persisted state if persist is true, otherwise use local state
  const expanded = persist ? persistedState.expanded : localExpanded;
  const setExpandedState = persist
    ? persistedState.setExpanded
    : setLocalExpanded;

  const handleToggle = () => {
    const newExpanded = !expanded;
    setExpandedState(newExpanded);
    onToggle?.(newExpanded);
  };

  const renderIcon = () => {
    switch (icon) {
      case "plus":
        return (
          <Plus
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              expanded && "rotate-45",
            )}
          />
        );
      case "settings":
        return (
          <Settings2
            className={cn(
              "h-4 w-4 transition-transform duration-200",
              expanded && "rotate-90",
            )}
          />
        );
      case "chevron":
      default:
        return expanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        );
    }
  };

  const displayLabel = label || (expanded ? "Show Less" : "Show More");

  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpandedState}
      className={cn("space-y-2", className)}
      data-testid={testId || `progressive-section-${id}`}
    >
      <CollapsibleTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn(
            "w-full justify-between hover-elevate",
            triggerClassName,
          )}
          onClick={handleToggle}
          data-testid={`${testId || `progressive-section-${id}`}-trigger`}
        >
          <div className="flex items-center gap-2">
            {renderIcon()}
            <span className="font-medium">{title}</span>
            {summary && !expanded && (
              <span className="text-sm text-muted-foreground ml-2">
                {summary}
              </span>
            )}
          </div>
          {showLabel && (
            <span className="text-sm text-muted-foreground">
              {displayLabel}
            </span>
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn("space-y-2", contentClassName)}
        data-testid={`${testId || `progressive-section-${id}`}-content`}
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

// Simplified version for inline use (e.g., in cards)
interface InlineProgressiveProps {
  id: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  persist?: boolean;
  triggerContent?: ReactNode;
  testId?: string;
}

export function InlineProgressive({
  id,
  children,
  defaultExpanded = false,
  className,
  persist = true,
  triggerContent,
  testId,
}: InlineProgressiveProps) {
  const { expanded, setExpanded } = persist
    ? useProgressiveSection(id, defaultExpanded)
    : { expanded: defaultExpanded, setExpanded: () => {} };

  const toggle = () => {
    setExpanded(!expanded);
  };

  return (
    <Collapsible
      open={expanded}
      onOpenChange={(open) => persist && toggle()}
      className={className}
      data-testid={testId || `inline-progressive-${id}`}
    >
      <CollapsibleTrigger asChild>
        <button
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          data-testid={`${testId || `inline-progressive-${id}`}-trigger`}
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          {triggerContent || (expanded ? "Show less" : "Show more")}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent
        className="pt-2"
        data-testid={`${testId || `inline-progressive-${id}`}-content`}
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
