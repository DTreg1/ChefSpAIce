import { useState, useEffect, useCallback } from "react";
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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Info, 
  ChefHat, 
  Wrench, 
  Lightbulb, 
  ExternalLink,
  BookOpen,
  Star,
  Clock,
  Users,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { CookingTerm } from "@shared/schema";

interface CookingTermTooltipProps {
  term: string;
  children: React.ReactNode;
  className?: string;
  usePopover?: boolean; // Use popover for mobile-friendly interaction
  showGlossaryLink?: boolean;
  onRelatedTermClick?: (term: string) => void;
}

export function CookingTermTooltip({ 
  term, 
  children, 
  className = "",
  usePopover = false,
  showGlossaryLink = true,
  onRelatedTermClick
}: CookingTermTooltipProps) {
  const [open, setOpen] = useState(false);
  const [showFullDefinition, setShowFullDefinition] = useState(false);
  const { toast } = useToast();

  // Fetch the cooking term data
  const { data: termData, isLoading } = useQuery<CookingTerm>({
    queryKey: [`/api/cooking-terms/${encodeURIComponent(term)}`],
    enabled: !!term,
  });

  if (!termData || isLoading) {
    return <span className={className}>{children}</span>;
  }

  // Category colors and icons
  const getCategoryConfig = (category: string) => {
    const configs: Record<string, { color: string; icon: any; bgClass: string }> = {
      knife_skills: {
        color: "default",
        icon: ChefHat,
        bgClass: "bg-gray-50 dark:bg-gray-900"
      },
      cooking_methods: {
        color: "secondary",
        icon: Clock,
        bgClass: "bg-yellow-50 dark:bg-yellow-900/20"
      },
      prep_techniques: {
        color: "outline",
        icon: Wrench,
        bgClass: "bg-blue-50 dark:bg-blue-900/20"
      },
      baking_pastry: {
        color: "secondary",
        icon: Sparkles,
        bgClass: "bg-purple-50 dark:bg-purple-900/20"
      },
      sauces_liquids: {
        color: "default",
        icon: ChefHat,
        bgClass: "bg-indigo-50 dark:bg-indigo-900/20"
      },
      heat_doneness: {
        color: "destructive",
        icon: Clock,
        bgClass: "bg-red-50 dark:bg-red-900/20"
      },
      kitchen_tools: {
        color: "outline",
        icon: Wrench,
        bgClass: "bg-green-50 dark:bg-green-900/20"
      }
    };
    return configs[category] || configs.knife_skills;
  };

  // Difficulty colors and icons
  const getDifficultyConfig = (difficulty?: string | null) => {
    switch (difficulty) {
      case "beginner":
        return {
          color: "text-green-600 dark:text-green-400",
          icon: "⭐",
          label: "Beginner"
        };
      case "intermediate":
        return {
          color: "text-yellow-600 dark:text-yellow-400",
          icon: "⭐⭐",
          label: "Intermediate"
        };
      case "advanced":
        return {
          color: "text-red-600 dark:text-red-400",
          icon: "⭐⭐⭐",
          label: "Advanced"
        };
      default:
        return {
          color: "text-gray-600 dark:text-gray-400",
          icon: "",
          label: ""
        };
    }
  };

  const formatCategory = (category: string) => {
    return category
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const categoryConfig = getCategoryConfig(termData.category);
  const difficultyConfig = getDifficultyConfig(termData.difficulty);
  const CategoryIcon = categoryConfig.icon;

  const handleRelatedTermClick = useCallback((relatedTerm: string) => {
    if (onRelatedTermClick) {
      onRelatedTermClick(relatedTerm);
      setOpen(false);
    } else {
      toast({
        title: "Related term",
        description: `Look for "${relatedTerm}" in the glossary!`,
      });
    }
  }, [onRelatedTermClick, toast]);

  const content = (
    <ScrollArea className="max-h-[500px]">
      <div className="space-y-3 max-w-sm p-1">
        {/* Header with term name and badges */}
        <div className={`${categoryConfig.bgClass} rounded-md p-3 -m-1`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-semibold text-base flex items-center gap-2">
                <CategoryIcon className="w-4 h-4 text-primary" />
                {termData.term}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={categoryConfig.color as any} className="text-xs">
                  {formatCategory(termData.category)}
                </Badge>
                {termData.difficulty && difficultyConfig.label && (
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-medium ${difficultyConfig.color}`}>
                      {difficultyConfig.icon} {difficultyConfig.label}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Definitions */}
        <div className="space-y-2">
          <p className="text-sm leading-relaxed">
            {termData.shortDefinition}
          </p>
          
          {termData.longDefinition && (
            <>
              {!showFullDefinition ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullDefinition(true)}
                  className="h-auto p-0 text-xs text-primary hover:bg-transparent"
                >
                  <ChevronRight className="w-3 h-3 mr-1" />
                  Show more details
                </Button>
              ) : (
                <div className="space-y-2">
                  <Separator />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {termData.longDefinition}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Tips section */}
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

        {/* Tools section */}
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

        {/* Related terms section */}
        {termData.relatedTerms && termData.relatedTerms.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-xs font-medium mb-1">Related terms:</div>
            <div className="flex flex-wrap gap-1">
              {termData.relatedTerms.map((relatedTerm, index) => (
                <Button
                  key={index}
                  variant="secondary"
                  size="sm"
                  className="h-auto py-1 px-2 text-xs"
                  onClick={() => handleRelatedTermClick(relatedTerm)}
                >
                  {relatedTerm}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Footer with glossary link */}
        {showGlossaryLink && (
          <div className="pt-2 border-t">
            <Link href="/glossary">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto py-1 px-2 text-xs w-full justify-start"
              >
                <BookOpen className="w-3 h-3 mr-1" />
                View in Glossary
                <ExternalLink className="w-3 h-3 ml-auto" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </ScrollArea>
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