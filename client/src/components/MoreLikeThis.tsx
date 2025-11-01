import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentCard } from "@/components/ContentCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, Filter, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MoreLikeThisItem {
  id: string;
  title: string;
  description?: string;
  type: string;
  score: number;
  metadata?: any;
}

interface MoreLikeThisProps {
  contentId: string;
  contentType?: string;
  contentTitle?: string;
  initialLimit?: number;
  maxLimit?: number;
  onItemClick?: (item: MoreLikeThisItem) => void;
  className?: string;
}

export const MoreLikeThis = ({
  contentId,
  contentType = "article",
  contentTitle = "this",
  initialLimit = 6,
  maxLimit = 20,
  onItemClick,
  className = ""
}: MoreLikeThisProps) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<"relevance" | "recent" | "popular">("relevance");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const displayLimit = isExpanded ? maxLimit : initialLimit;

  // Fetch related content
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/content", contentId, "related", displayLimit],
    queryFn: async () => {
      const response = await fetch(
        `/api/content/${contentId}/related?type=${contentType}&limit=${displayLimit}`
      );
      if (!response.ok) throw new Error("Failed to fetch related content");
      return response.json();
    },
    enabled: !!contentId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Clear cache first
      await apiRequest("DELETE", `/api/content/${contentId}/cache?type=${contentType}`);
      // Then refetch
      await refetch();
      toast({
        title: "Content refreshed",
        description: "Related content recommendations updated",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Could not refresh related content",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const sortedItems = () => {
    if (!data?.related) return [];
    
    let items = [...data.related];
    
    switch (sortBy) {
      case "relevance":
        return items.sort((a, b) => b.score - a.score);
      case "recent":
        return items.sort((a, b) => {
          const dateA = new Date(a.metadata?.publishedAt || 0).getTime();
          const dateB = new Date(b.metadata?.publishedAt || 0).getTime();
          return dateB - dateA;
        });
      case "popular":
        return items.sort((a, b) => {
          const ratingA = a.metadata?.rating || 0;
          const ratingB = b.metadata?.rating || 0;
          return ratingB - ratingA;
        });
      default:
        return items;
    }
  };

  const items = sortedItems();
  const hasMoreItems = data?.related?.length > initialLimit;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold">
            More like "{contentTitle}"
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-36" data-testid="select-sort-by">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">
                <div className="flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Relevance
                </div>
              </SelectItem>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            data-testid="button-refresh-more"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: initialLimit }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.slice(0, displayLimit).map((item: MoreLikeThisItem) => (
              <ContentCard
                key={item.id}
                id={item.id}
                title={item.title}
                description={item.description}
                type={item.type}
                similarityScore={item.score}
                metadata={item.metadata}
                onClick={() => onItemClick?.(item)}
                className="h-full"
              />
            ))}
          </div>

          {/* Show More/Less Button */}
          {hasMoreItems && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setIsExpanded(!isExpanded)}
                className="min-w-[200px]"
                data-testid="button-toggle-expand"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Show More ({items.length - initialLimit} more)
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Summary Stats */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Found {items.length} related items
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average relevance: {(
                      items.reduce((acc, item) => acc + item.score, 0) / items.length * 100
                    ).toFixed(0)}%
                  </p>
                </div>
                <div className="flex gap-2">
                  {/* Category distribution */}
                  {Array.from(
                    new Set(items.map(i => i.metadata?.category).filter(Boolean))
                  ).slice(0, 3).map(category => (
                    <Badge key={category} variant="secondary">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="bg-muted/50">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No similar content found</p>
              <p className="text-xs mt-1">
                Try refreshing or check back later for recommendations
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                className="mt-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Recommendations
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};