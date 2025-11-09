import { useState, useEffect, useMemo, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CookingTermTooltip } from "./cooking-term-tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DetectedTerm {
  term: string;
  termId: string;
  originalTerm: string;
  start: number;
  end: number;
  shortDefinition: string;
  category: string;
  difficulty?: string | null;
}

interface EnrichedContentProps {
  text: string;
  className?: string;
  enableDetection?: boolean;
  excludeCategories?: string[];
  maxTerms?: number;
  usePopover?: boolean;
  highlightClassName?: string;
}

/**
 * EnrichedContent Component
 * 
 * Displays text with automatically detected and highlighted cooking terms.
 * Terms are interactive with tooltips showing definitions.
 * 
 * Features:
 * - Automatic term detection via API
 * - Interactive tooltips with definitions
 * - Category-based filtering
 * - Performance optimization with caching
 * - Graceful error handling
 */
export const EnrichedContent = memo(function EnrichedContent({
  text,
  className = "",
  enableDetection = true,
  excludeCategories = [],
  maxTerms = 50,
  usePopover = false,
  highlightClassName = ""
}: EnrichedContentProps) {
  const [isClient, setIsClient] = useState(false);

  // Ensure client-side rendering for tooltips
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch detected terms from API
  const { data: detectedTerms, isLoading, error } = useQuery<{ matches: DetectedTerm[] }>({
    queryKey: ["/api/cooking-terms/detect-enhanced", text, excludeCategories, maxTerms],
    queryFn: async () => {
      if (!text || text.length < 10) {
        return { matches: [] };
      }
      
      const response = await apiRequest("/api/cooking-terms/detect-enhanced", "POST", {
        text,
        excludeCategories,
        maxMatches: maxTerms,
        contextAware: true
      });
      
      return await response.json();
    },
    enabled: enableDetection && text.length >= 10,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    retry: 1
  });

  // Generate enriched content with highlighted terms
  const enrichedElements = useMemo(() => {
    if (!isClient || !detectedTerms?.matches || detectedTerms.matches.length === 0) {
      return <span className={className}>{text}</span>;
    }

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    const terms = detectedTerms.matches;

    // Sort terms by position
    const sortedTerms = [...terms].sort((a, b) => a.start - b.start);

    sortedTerms.forEach((term, index) => {
      // Add text before the term
      if (term.start > lastIndex) {
        const beforeText = text.substring(lastIndex, term.start);
        elements.push(
          <span key={`text-before-${index}`}>
            {beforeText}
          </span>
        );
      }

      // Add the term with tooltip
      const termText = text.substring(term.start, term.end);
      const termClass = `cooking-term-highlight ${highlightClassName} cooking-term--${term.category.replace(/_/g, '-')}`;
      
      elements.push(
        <CookingTermTooltip
          key={`term-${index}-${term.termId}`}
          term={term.originalTerm}
          usePopover={usePopover}
          className={termClass}
          data-testid={`term-${term.originalTerm.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {termText}
        </CookingTermTooltip>
      );

      lastIndex = term.end;
    });

    // Add any remaining text
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      elements.push(
        <span key={`text-after-${sortedTerms.length}`}>
          {remainingText}
        </span>
      );
    }

    return elements;
  }, [isClient, detectedTerms, text, usePopover, highlightClassName]);

  // Show loading state for long texts
  if (isLoading && text.length > 500) {
    return (
      <div className={className}>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  // Show error state gracefully
  if (error) {
    console.error("Error detecting cooking terms:", error);
    // Fall back to plain text on error
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={`enriched-content ${className}`} data-testid="enriched-content">
      {enrichedElements}
    </span>
  );
});

/**
 * EnrichedParagraph Component
 * 
 * Wrapper for paragraph-level content with term enrichment.
 * Handles multiple lines and maintains paragraph formatting.
 */
export const EnrichedParagraph = memo(function EnrichedParagraph({
  text,
  className = "",
  ...props
}: EnrichedContentProps) {
  return (
    <p className={`enriched-paragraph ${className}`}>
      <EnrichedContent text={text} {...props} />
    </p>
  );
});

/**
 * EnrichedHTML Component
 * 
 * Displays pre-enriched HTML content from the server.
 * Used when the server has already processed and marked up terms.
 */
export function EnrichedHTML({
  html,
  className = "",
  onClick
}: {
  html: string;
  className?: string;
  onClick?: (termId: string) => void;
}) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle clicks on terms
  useEffect(() => {
    if (!isClient || !onClick) return;

    const handleTermClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains("cooking-term") || target.closest(".cooking-term")) {
        const termElement = target.classList.contains("cooking-term") 
          ? target 
          : target.closest(".cooking-term") as HTMLElement;
        
        const termId = termElement?.dataset.termId;
        if (termId) {
          e.preventDefault();
          onClick(termId);
        }
      }
    };

    document.addEventListener("click", handleTermClick);
    return () => document.removeEventListener("click", handleTermClick);
  }, [isClient, onClick]);

  if (!isClient) {
    return <div className={className}>{html}</div>;
  }

  return (
    <div 
      className={`enriched-html ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
      data-testid="enriched-html"
    />
  );
}

/**
 * Hook to fetch enriched HTML from server
 */
export function useEnrichedText(text: string, options?: {
  excludeCategories?: string[];
  linkToGlossary?: boolean;
  includeTooltip?: boolean;
}) {
  return useQuery<{ text: string }>({
    queryKey: ["/api/cooking-terms/enrich", text, options],
    queryFn: async () => {
      if (!text || text.length < 10) {
        return { text };
      }
      
      const response = await apiRequest("/api/cooking-terms/enrich", "POST", {
        text,
        ...options
      });
      
      return await response.json();
    },
    enabled: !!text && text.length >= 10,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10
  });
}