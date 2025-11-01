import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CookingTerm } from "@shared/schema";
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
import { Clock, ChefHat, Utensils, Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface CookingTermHighlighterProps {
  text: string;
  className?: string;
}

export function CookingTermHighlighter({ text, className = "" }: CookingTermHighlighterProps) {
  // Fetch all cooking terms from the API
  const { data: cookingTerms = [], isLoading } = useQuery<CookingTerm[]>({
    queryKey: ["/api/cooking-terms"],
  });

  // Process the text to identify and highlight cooking terms
  const highlightedContent = useMemo(() => {
    if (isLoading || cookingTerms.length === 0) {
      return <span className={className}>{text}</span>;
    }

    // Create a map for quick lookup (case-insensitive)
    const termMap = new Map<string, CookingTerm>();
    cookingTerms.forEach(term => {
      // Add the main term
      termMap.set(term.term.toLowerCase(), term);
      // Also add any search terms/alternative names
      if (term.searchTerms) {
        term.searchTerms.forEach(searchTerm => {
          termMap.set(searchTerm.toLowerCase(), term);
        });
      }
    });

    // Sort terms by length (longest first) to match longer terms before shorter ones
    const sortedTerms = Array.from(termMap.keys()).sort((a, b) => b.length - a.length);

    // Build a regex pattern to match all terms (case-insensitive, word boundaries)
    const escapedTerms = sortedTerms.map(term => 
      term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex characters
    );
    
    if (escapedTerms.length === 0) {
      return <span className={className}>{text}</span>;
    }

    // Create regex with word boundaries to match whole words only
    const pattern = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi');

    // Split text by the pattern and build highlighted content
    const parts = [];
    let lastIndex = 0;
    let match;

    const textCopy = text;
    
    while ((match = pattern.exec(textCopy)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {textCopy.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Add the highlighted term
      const matchedText = match[0];
      const termData = termMap.get(matchedText.toLowerCase());
      
      if (termData) {
        parts.push(
          <HighlightedTerm
            key={`term-${match.index}`}
            term={matchedText}
            data={termData}
          />
        );
      }

      lastIndex = match.index + matchedText.length;
    }

    // Add remaining text
    if (lastIndex < textCopy.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {textCopy.substring(lastIndex)}
        </span>
      );
    }

    return <span className={className}>{parts.length > 0 ? parts : text}</span>;
  }, [text, cookingTerms, isLoading, className]);

  return highlightedContent;
}

// Separate component for the highlighted term with tooltip and popover
interface HighlightedTermProps {
  term: string;
  data: CookingTerm;
}

function HighlightedTerm({ term, data }: HighlightedTermProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Determine the category badge color
  const getCategoryBadgeVariant = (category: string): "default" | "secondary" | "outline" => {
    switch (category) {
      case "knife_skills":
        return "default";
      case "cooking_methods":
        return "secondary";
      case "prep_techniques":
        return "outline";
      default:
        return "default";
    }
  };

  // Format category for display
  const formatCategory = (category: string): string => {
    return category
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <TooltipProvider>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <span
                className="relative inline-block border-b-2 border-dashed border-primary/40 cursor-help hover:border-primary transition-colors"
                data-cooking-term={data.term}
                data-testid={`cooking-term-${data.term}`}
              >
                {term}
              </span>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <p className="text-sm">{data.shortDefinition}</p>
            <p className="text-xs text-muted-foreground mt-1">Click for detailed instructions</p>
          </TooltipContent>
        </Tooltip>
        
        <PopoverContent className="w-96 max-h-[600px] overflow-y-auto" align="start">
          <div className="space-y-3">
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{data.term}</h3>
                <Badge variant={getCategoryBadgeVariant(data.category)}>
                  {formatCategory(data.category)}
                </Badge>
              </div>
              
              {/* Metadata badges */}
              <div className="flex gap-2 flex-wrap">
                {!!data.difficulty && (
                  <Badge variant="outline" className="text-xs">
                    <ChefHat className="w-3 h-3 mr-1" />
                    {data.difficulty}
                  </Badge>
                )}
                {!!data.timeEstimate && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {data.timeEstimate}
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Long definition */}
            <div>
              <h4 className="font-semibold mb-2 text-sm">How to {data.term}</h4>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{data.longDefinition}</p>
            </div>

            {/* Tools needed */}
            {data.tools && data.tools.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2 text-sm flex items-center gap-1">
                    <Utensils className="w-4 h-4" />
                    Tools Needed
                  </h4>
                  <ul className="text-sm space-y-1">
                    {data.tools.map((tool, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-primary" />
                        {tool}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Tips */}
            {data.tips && data.tips.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2 text-sm flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    Pro Tips
                  </h4>
                  <ul className="text-sm space-y-2">
                    {data.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span className="text-muted-foreground">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* Related terms */}
            {data.relatedTerms && data.relatedTerms.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2 text-sm">Related Techniques</h4>
                  <div className="flex gap-2 flex-wrap">
                    {data.relatedTerms.map((relatedTerm, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {relatedTerm}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}