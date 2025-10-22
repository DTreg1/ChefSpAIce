import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { CookingTerm } from "@shared/schema";

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
    const regex = new RegExp(pattern);
    
    while ((match = regex.exec(textCopy)) !== null) {
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

// Separate component for the highlighted term (will add tooltip and popover later)
interface HighlightedTermProps {
  term: string;
  data: CookingTerm;
}

function HighlightedTerm({ term, data }: HighlightedTermProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <span
      className="relative inline-block border-b-2 border-dashed border-primary/40 cursor-help hover:border-primary transition-colors"
      data-cooking-term={data.term}
      data-testid={`cooking-term-${data.term}`}
      onClick={() => setIsPopoverOpen(true)}
    >
      {term}
    </span>
  );
}