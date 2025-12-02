import { cn } from "@/lib/utils";

interface SearchHighlightProps {
  text: string;
  query?: string;
  className?: string;
  highlightClassName?: string;
  maxLength?: number;
}

/**
 * Highlights matching text segments and shows context around matches
 * For semantic search, this provides visual emphasis even when exact words don't match
 */
export function SearchHighlight({
  text,
  query = "",
  className,
  highlightClassName = "bg-yellow-200 dark:bg-yellow-800 font-medium",
  maxLength = 200,
}: SearchHighlightProps) {
  if (!text) return null;

  // For semantic search, we don't have exact word matches
  // Instead, we show a snippet of the most relevant part
  // In a real implementation, the backend would provide the relevant snippet

  // Truncate text if too long
  let displayText = text;
  if (text.length > maxLength) {
    // Try to find the query terms in the text for better context
    const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
    let bestStart = 0;
    let bestScore = 0;

    // Find the section with the most query word matches
    for (let i = 0; i < text.length - maxLength; i++) {
      const snippet = text.substring(i, i + maxLength).toLowerCase();
      let score = 0;

      queryWords.forEach((word) => {
        if (snippet.includes(word)) {
          score += 1;
          // Bonus points if the word appears at the start
          if (snippet.indexOf(word) < 50) {
            score += 0.5;
          }
        }
      });

      if (score > bestScore) {
        bestScore = score;
        bestStart = i;
      }
    }

    // Extract the best snippet
    const start = Math.max(0, bestStart);
    const end = Math.min(text.length, start + maxLength);
    displayText = text.substring(start, end);

    // Add ellipsis if truncated
    if (start > 0) displayText = "..." + displayText;
    if (end < text.length) displayText = displayText + "...";
  }

  // If no query, just return the text
  if (!query || query.trim() === "") {
    return <span className={className}>{displayText}</span>;
  }

  // Highlight matching words (case-insensitive)
  const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
  const regex = new RegExp(`\\b(${queryWords.join("|")})\\b`, "gi");

  const parts = displayText.split(regex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = queryWords.some(
          (word) => part.toLowerCase() === word.toLowerCase(),
        );

        return isMatch ? (
          <span
            key={index}
            className={highlightClassName}
            data-testid={`highlight-match-${index}`}
          >
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </span>
  );
}

/**
 * Enhanced version that shows multiple matching contexts
 */
export function SearchHighlightWithContext({
  text,
  query = "",
  className,
  highlightClassName,
  contextLength = 80,
  maxContexts = 3,
}: SearchHighlightProps & {
  contextLength?: number;
  maxContexts?: number;
}) {
  if (!text || !query) {
    return <SearchHighlight text={text} query={query} className={className} />;
  }

  const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
  const contexts: Array<{ start: number; end: number; score: number }> = [];

  // Find all matching contexts
  queryWords.forEach((word) => {
    let index = text.toLowerCase().indexOf(word);
    while (index !== -1) {
      const start = Math.max(0, index - contextLength / 2);
      const end = Math.min(
        text.length,
        index + word.length + contextLength / 2,
      );

      // Check if this overlaps with existing contexts
      const overlapping = contexts.find(
        (c) =>
          (start >= c.start && start <= c.end) ||
          (end >= c.start && end <= c.end),
      );

      if (overlapping) {
        // Merge contexts
        overlapping.start = Math.min(overlapping.start, start);
        overlapping.end = Math.max(overlapping.end, end);
        overlapping.score += 1;
      } else {
        contexts.push({ start, end, score: 1 });
      }

      index = text.toLowerCase().indexOf(word, index + 1);
    }
  });

  // Sort by score and take top contexts
  contexts.sort((a, b) => b.score - a.score);
  const topContexts = contexts.slice(0, maxContexts);

  if (topContexts.length === 0) {
    return <SearchHighlight text={text} query={query} className={className} />;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {topContexts.map((context, i) => {
        let snippet = text.substring(context.start, context.end);
        if (context.start > 0) snippet = "..." + snippet;
        if (context.end < text.length) snippet = snippet + "...";

        return (
          <div key={i} className="text-sm">
            <SearchHighlight
              text={snippet}
              query={query}
              highlightClassName={highlightClassName}
            />
          </div>
        );
      })}
    </div>
  );
}
