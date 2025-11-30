/**
 * TagCloud Component
 * 
 * Displays popular tags in a visually engaging cloud format.
 * Features:
 * - Dynamic font sizing based on usage count
 * - Interactive hover effects
 * - Click to filter/select tags
 * - Responsive layout
 */

import { useMemo } from "react";
import { Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface TagData {
  id: string;
  name: string;
  slug: string;
  usageCount: number;
}

interface TrendingTagsResponse {
  tags: TagData[];
}

interface TagCloudProps {
  onTagClick?: (tag: TagData) => void;
  selectedTags?: string[];
  limit?: number;
  className?: string;
}

export function TagCloud({
  onTagClick,
  selectedTags = [],
  limit = 20,
  className,
}: TagCloudProps) {
  // Fetch trending tags
  const { data: trendingTags, isLoading } = useQuery<TrendingTagsResponse>({
    queryKey: ["/api/ml/tags/trending", limit],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Calculate tag sizes based on usage count
  const tagSizes = useMemo(() => {
    if (!trendingTags?.tags) return [];
    
    const tags = trendingTags.tags;
    const maxCount = Math.max(...tags.map((t: TagData) => t.usageCount), 1);
    const minCount = Math.min(...tags.map((t: TagData) => t.usageCount), 0);
    const range = maxCount - minCount || 1;
    
    return tags.map((tag: TagData) => {
      // Calculate relative size (0.5 to 1.5)
      const relativeSize = 0.5 + ((tag.usageCount - minCount) / range) * 1;
      
      // Determine variant based on usage
      let variant: "default" | "secondary" | "outline" = "outline";
      if (tag.usageCount > maxCount * 0.7) {
        variant = "default";
      } else if (tag.usageCount > maxCount * 0.4) {
        variant = "secondary";
      }
      
      return {
        ...tag,
        fontSize: `${relativeSize}rem`,
        variant,
      };
    });
  }, [trendingTags]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="text-muted-foreground">Loading tags...</div>
      </div>
    );
  }

  if (!tagSizes || tagSizes.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="text-muted-foreground">No tags available</div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Tag className="h-4 w-4" />
        <span>Popular Tags</span>
      </div>
      
      <div className="flex flex-wrap gap-2 justify-center items-center">
        {tagSizes.map((tag) => (
          <Badge
            key={tag.id}
            variant={tag.variant}
            className={cn(
              "cursor-pointer transition-all hover-elevate active-elevate-2",
              selectedTags.includes(tag.id) && "ring-2 ring-primary",
            )}
            style={{ fontSize: tag.fontSize }}
            onClick={() => onTagClick?.(tag)}
            data-testid={`tag-cloud-${tag.name}`}
          >
            {tag.name}
            <span className="ml-1 opacity-60 text-xs">
              ({tag.usageCount})
            </span>
          </Badge>
        ))}
      </div>
      
      {limit < (trendingTags?.tags?.length || 0) && (
        <p className="text-center text-sm text-muted-foreground">
          Showing top {limit} tags
        </p>
      )}
    </div>
  );
}