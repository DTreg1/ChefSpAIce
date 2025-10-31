import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Package, 
  Calendar, 
  MessageSquare,
  TrendingUp,
  AlertCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchResult {
  id: string;
  type: 'recipe' | 'inventory' | 'meal_plan' | 'chat' | 'custom';
  title: string;
  description?: string;
  content: string;
  score: number; // Relevance score (0-1)
  metadata?: {
    category?: string;
    tags?: string[];
    date?: string;
    [key: string]: any;
  };
}

interface SearchResultsProps {
  results: SearchResult[];
  isLoading?: boolean;
  error?: string | null;
  onResultClick?: (result: SearchResult, position: number) => void;
  searchLogId?: string;
  className?: string;
}

const typeIcons = {
  recipe: FileText,
  inventory: Package,
  meal_plan: Calendar,
  chat: MessageSquare,
  custom: FileText,
};

const typeColors = {
  recipe: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  inventory: "bg-green-500/10 text-green-700 dark:text-green-400",
  meal_plan: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  chat: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  custom: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

function getRelevanceLabel(score: number): { label: string; color: string } {
  if (score >= 0.9) return { label: "Exact Match", color: "text-green-600 dark:text-green-400" };
  if (score >= 0.8) return { label: "High Relevance", color: "text-blue-600 dark:text-blue-400" };
  if (score >= 0.7) return { label: "Good Match", color: "text-yellow-600 dark:text-yellow-400" };
  return { label: "Related", color: "text-gray-600 dark:text-gray-400" };
}

export function SearchResults({
  results,
  isLoading = false,
  error = null,
  onResultClick,
  searchLogId,
  className,
}: SearchResultsProps) {
  const [clickStartTime] = useState(() => Date.now());

  const handleResultClick = (result: SearchResult, index: number) => {
    if (onResultClick) {
      const timeToClick = Date.now() - clickStartTime;
      onResultClick(
        {
          ...result,
          searchLogId,
          clickPosition: index + 1, // 1-based position
          timeToClick,
        } as any,
        index + 1
      );
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-destructive", className)}>
        <CardContent className="flex items-center gap-2 pt-6">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!results || results.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            No results found. Try different search terms.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className={cn("h-[600px]", className)}>
      <div className="space-y-4 pr-4">
        {results.map((result, index) => {
          const Icon = typeIcons[result.type];
          const typeColor = typeColors[result.type];
          const relevance = getRelevanceLabel(result.score);

          return (
            <Card
              key={`${result.type}-${result.id}`}
              className="cursor-pointer transition-all hover-elevate"
              onClick={() => handleResultClick(result, index)}
              data-testid={`card-search-result-${index}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={cn("p-2 rounded-lg", typeColor)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <CardTitle className="text-base line-clamp-1" data-testid={`text-result-title-${index}`}>
                        {result.title}
                      </CardTitle>
                      {result.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {result.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className="capitalize">
                      {result.type.replace('_', ' ')}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <TrendingUp className={cn("h-3 w-3", relevance.color)} />
                      <span className={cn("text-xs font-medium", relevance.color)}>
                        {relevance.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {(result.score * 100).toFixed(0)}% match
                    </span>
                  </div>
                </div>
              </CardHeader>
              {result.content && (
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3" data-testid={`text-result-content-${index}`}>
                    {result.content}
                  </p>
                  {result.metadata?.tags && result.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {result.metadata.tags.slice(0, 5).map((tag, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}