import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/cards";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface RecommendationItem {
  id: string;
  title: string;
  description?: string;
  type: string;
  score: number;
  metadata?: any;
}

interface RecommendationCarouselProps {
  userId?: string;
  contentType?: string;
  title?: string;
  subtitle?: string;
  onItemClick?: (item: RecommendationItem) => void;
  className?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export const RecommendationCarousel = ({
  userId,
  contentType = "article",
  title = "Recommended for You",
  subtitle = "Based on your interests",
  onItemClick,
  className = "",
  autoPlay = false,
  autoPlayInterval = 5000,
}: RecommendationCarouselProps) => {
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Fetch personalized recommendations
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/recommendations/user", userId],
    queryFn: async () => {
      if (!userId) {
        // If no userId, fetch general trending content
        const response = await fetch(`/api/content/search/semantic`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "trending popular interesting",
            contentType,
            limit: 12,
          }),
        });
        if (!response.ok) throw new Error("Failed to fetch recommendations");
        return response.json();
      }

      const response = await fetch(
        `/api/recommendations/user/${userId}?type=${contentType}&limit=12`,
      );
      if (!response.ok) throw new Error("Failed to fetch recommendations");
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });

  const items = data?.recommendations || data?.results || [];
  const itemsPerView = 3;
  const maxIndex = Math.max(0, items.length - itemsPerView);

  useEffect(() => {
    if (autoPlay && items.length > itemsPerView) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= maxIndex) return 0;
          return prev + 1;
        });
      }, autoPlayInterval);

      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }
  }, [autoPlay, autoPlayInterval, items.length, itemsPerView, maxIndex]);

  const handlePrevious = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Recommendations updated",
        description: "Fresh content recommendations loaded",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Could not refresh recommendations",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDotClick = (index: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrentIndex(index * itemsPerView);
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">{title}</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              data-testid="button-refresh-carousel"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentIndex === 0 || isLoading}
                data-testid="button-carousel-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleNext}
                disabled={currentIndex >= maxIndex || isLoading}
                data-testid="button-carousel-next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: itemsPerView }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <>
            <div ref={carouselRef} className="overflow-hidden">
              <div
                className="flex transition-transform duration-300 ease-in-out"
                style={{
                  transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
                }}
              >
                {items.map((item: RecommendationItem) => (
                  <div
                    key={item.id}
                    className="w-full md:w-1/2 lg:w-1/3 flex-shrink-0 px-2"
                  >
                    <ContentCard
                      id={item.id}
                      title={item.title}
                      description={item.description}
                      type={item.type}
                      similarityScore={item.score}
                      metadata={item.metadata}
                      onClick={() => onItemClick?.(item)}
                      className="h-full"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Dots indicator */}
            {items.length > itemsPerView && (
              <div className="flex justify-center mt-4 gap-1">
                {Array.from({
                  length: Math.ceil(items.length / itemsPerView),
                }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handleDotClick(i)}
                    className={`h-2 w-2 rounded-full transition-all ${
                      Math.floor(currentIndex / itemsPerView) === i
                        ? "bg-primary w-6"
                        : "bg-muted-foreground/30"
                    }`}
                    data-testid={`carousel-dot-${i}`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No recommendations available</p>
            <p className="text-xs mt-1">
              Check back later for personalized content
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
