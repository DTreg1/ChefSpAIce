import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, TrendingUp, ChevronRight, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";

interface RelatedContentItem {
  id: string;
  type: string;
  title: string;
  score: number;
  metadata?: {
    description?: string;
    category?: string;
    imageUrl?: string;
    author?: string;
    readTime?: number;
  };
}

interface RelatedContentProps {
  contentId: string;
  contentType?: string;
  title?: string;
  onItemClick?: (item: RelatedContentItem) => void;
  className?: string;
}

export const RelatedContentSidebar = ({
  contentId,
  contentType = "article",
  title = "Related Content",
  onItemClick,
  className = ""
}: RelatedContentProps) => {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch related content
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/content", contentId, "related"],
    queryFn: async () => {
      const response = await fetch(`/api/content/${contentId}/related?type=${contentType}&limit=10`);
      if (!response.ok) throw new Error("Failed to fetch related content");
      return response.json();
    },
    enabled: !!contentId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Clear cache and refresh embeddings
      await apiRequest(`/api/content/${contentId}/cache?type=${contentType}`, "DELETE");
      await refetch();
      toast({
        title: "Content refreshed",
        description: "Related content has been updated",
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
  }, [contentId, contentType, refetch, toast]);

  const getRelevanceColor = (score: number) => {
    if (score >= 0.9) return "text-emerald-500";
    if (score >= 0.8) return "text-green-500";
    if (score >= 0.7) return "text-yellow-500";
    return "text-gray-400";
  };

  const getRelevanceBadgeVariant = (score: number): "default" | "secondary" | "outline" | "destructive" => {
    if (score >= 0.9) return "default";
    if (score >= 0.8) return "secondary";
    return "outline";
  };

  const formatScore = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            data-testid="button-refresh-related"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          ) : data?.related?.length > 0 ? (
            <div className="space-y-3">
              {data.related.map((item: RelatedContentItem) => (
                <div
                  key={item.id}
                  className="group cursor-pointer rounded-lg border p-3 hover-elevate transition-all duration-200"
                  onClick={() => onItemClick?.(item)}
                  data-testid={`related-item-${item.id}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-sm font-medium line-clamp-2 flex-1 group-hover:text-primary transition-colors">
                      {item.title}
                    </h4>
                    <ChevronRight className="h-4 w-4 text-muted-foreground ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                  
                  {item.metadata?.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {item.metadata.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={getRelevanceBadgeVariant(item.score)}
                        className="text-xs"
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {formatScore(item.score)} match
                      </Badge>
                      {item.metadata?.category && (
                        <Badge variant="outline" className="text-xs">
                          {item.metadata.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Visual similarity indicator */}
                  <div className="mt-2">
                    <Progress 
                      value={item.score * 100} 
                      className="h-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No related content found</p>
              <p className="text-xs mt-1">Try refreshing to update recommendations</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};