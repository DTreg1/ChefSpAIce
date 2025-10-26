import { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, ChefHat, Wrench, Lightbulb, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { CookingTerm } from "@shared/schema";

interface CookingTermTooltipProps {
  term: string;
  children: React.ReactNode;
  className?: string;
  usePopover?: boolean; // Use popover for mobile-friendly interaction
}

export function CookingTermTooltip({ 
  term, 
  children, 
  className = "",
  usePopover = false 
}: CookingTermTooltipProps) {
  const [open, setOpen] = useState(false);

  // Fetch the cooking term data
  const { data: termData, isLoading } = useQuery<CookingTerm>({
    queryKey: ["/api/cooking-terms", term],
    enabled: !!term,
  });

  if (!termData || isLoading) {
    return <span className={className}>{children}</span>;
  }

  // Category colors
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "knife_skills":
        return "default";
      case "cooking_methods":
        return "secondary";
      case "prep_techniques":
        return "outline";
      case "baking_pastry":
        return "secondary";
      case "sauces_liquids":
        return "default";
      case "heat_doneness":
        return "destructive";
      case "kitchen_tools":
        return "outline";
      default:
        return "default";
    }
  };

  // Difficulty colors
  const getDifficultyColor = (difficulty?: string | null) => {
    switch (difficulty) {
      case "beginner":
        return "text-green-600 dark:text-green-400";
      case "intermediate":
        return "text-yellow-600 dark:text-yellow-400";
      case "advanced":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const formatCategory = (category: string) => {
    return category
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const content = (
    <div className="space-y-3 max-w-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-base flex items-center gap-2">
            <ChefHat className="w-4 h-4" />
            {termData.term}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={getCategoryColor(termData.category)} className="text-xs">
              {formatCategory(termData.category)}
            </Badge>
            {termData.difficulty && (
              <span className={`text-xs font-medium ${getDifficultyColor(termData.difficulty)}`}>
                {termData.difficulty}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {termData.shortDefinition}
        </p>
        
        {termData.longDefinition && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {termData.longDefinition}
          </p>
        )}
      </div>

      {termData.tips && termData.tips.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs font-medium">
            <Lightbulb className="w-3 h-3" />
            Tips:
          </div>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {termData.tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-primary mt-1">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {termData.tools && termData.tools.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs font-medium">
            <Wrench className="w-3 h-3" />
            Tools needed:
          </div>
          <div className="flex flex-wrap gap-1">
            {termData.tools.map((tool, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tool}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {termData.relatedTerms && termData.relatedTerms.length > 0 && (
        <div className="pt-2 border-t">
          <div className="text-xs font-medium mb-1">Related terms:</div>
          <div className="flex flex-wrap gap-1">
            {termData.relatedTerms.map((relatedTerm, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {relatedTerm}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Use popover for touch devices or when explicitly requested
  if (usePopover) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={`underline decoration-dotted decoration-primary/50 hover:decoration-primary cursor-help inline-flex items-center gap-0.5 ${className}`}
            data-testid={`term-trigger-${term}`}
          >
            {children}
            <Info className="w-3 h-3 text-primary/50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          {content}
        </PopoverContent>
      </Popover>
    );
  }

  // Use tooltip for desktop
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`underline decoration-dotted decoration-primary/50 hover:decoration-primary cursor-help inline-flex items-center gap-0.5 ${className}`}
            data-testid={`term-trigger-${term}`}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm p-3">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Component to parse text and automatically add tooltips for detected cooking terms
 */
interface CookingTermsParserProps {
  text: string;
  className?: string;
  usePopover?: boolean;
}

export function CookingTermsParser({ 
  text, 
  className = "",
  usePopover = false 
}: CookingTermsParserProps) {
  const [parsedContent, setParsedContent] = useState<React.ReactNode[]>([]);

  // Fetch detected terms from the backend
  const { data: detectedTerms, isLoading } = useQuery<any[]>({
    queryKey: ["/api/cooking-terms/detect", text],
    enabled: !!text && text.length > 0,
  });

  useEffect(() => {
    if (!detectedTerms || detectedTerms.length === 0) {
      setParsedContent([text]);
      return;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    detectedTerms.forEach((termData, index) => {
      // Add text before the term
      if (termData.startIndex > lastIndex) {
        elements.push(
          <span key={`text-${index}`}>
            {text.substring(lastIndex, termData.startIndex)}
          </span>
        );
      }

      // Add the term with tooltip
      elements.push(
        <CookingTermTooltip
          key={`term-${index}`}
          term={termData.term}
          usePopover={usePopover}
        >
          {text.substring(termData.startIndex, termData.endIndex)}
        </CookingTermTooltip>
      );

      lastIndex = termData.endIndex;
    });

    // Add any remaining text
    if (lastIndex < text.length) {
      elements.push(
        <span key="text-end">
          {text.substring(lastIndex)}
        </span>
      );
    }

    setParsedContent(elements);
  }, [detectedTerms, text]);

  if (isLoading) {
    return <span className={className}>{text}</span>;
  }

  return <span className={className}>{parsedContent}</span>;
}