import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  TrendingUp,
  Clock,
  User,
  ChevronRight,
  Star,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ContentCardProps {
  id: string;
  title: string;
  description?: string;
  type: string;
  similarityScore?: number;
  metadata?: {
    author?: string;
    readTime?: number;
    category?: string;
    imageUrl?: string;
    rating?: number;
    tags?: string[];
    publishedAt?: string;
  };
  onClick?: () => void;
  className?: string;
  showSimilarity?: boolean;
}

export const ContentCard = ({
  id,
  title,
  description,
  type,
  similarityScore,
  metadata,
  onClick,
  className = "",
  showSimilarity = true,
}: ContentCardProps) => {
  const formatScore = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 0.9) return "bg-emerald-500";
    if (score >= 0.8) return "bg-green-500";
    if (score >= 0.7) return "bg-yellow-500";
    return "bg-gray-400";
  };

  const getSimilarityBadgeVariant = (
    score: number,
  ): "default" | "secondary" | "outline" => {
    if (score >= 0.9) return "default";
    if (score >= 0.8) return "secondary";
    return "outline";
  };

  const formatDate = (dateString: string | undefined) => {
    // Guard against undefined or empty dates
    if (!dateString) return "Unknown";

    const date = new Date(dateString);

    // Guard against invalid dates
    if (isNaN(date.getTime())) return "Unknown";

    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <Card
      className={`group cursor-pointer hover-elevate transition-all duration-200 overflow-hidden ${className}`}
      onClick={onClick}
      data-testid={`content-card-${id}`}
    >
      {/* Optional Image */}
      {metadata?.imageUrl && (
        <div className="aspect-video w-full overflow-hidden">
          <img
            src={metadata.imageUrl}
            alt={title}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="space-y-2">
          {/* Type and Category badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs capitalize">
              {type}
            </Badge>
            {metadata?.category && (
              <Badge variant="secondary" className="text-xs">
                {metadata.category}
              </Badge>
            )}
            {showSimilarity && similarityScore !== undefined && (
              <Badge
                variant={getSimilarityBadgeVariant(similarityScore)}
                className="text-xs"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                {formatScore(similarityScore)} match
              </Badge>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>

          {/* Meta information */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {metadata?.author && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{metadata.author}</span>
              </div>
            )}
            {metadata?.readTime && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{metadata.readTime} min read</span>
              </div>
            )}
            {metadata?.publishedAt &&
              formatDate(metadata.publishedAt) !== "Unknown" && (
                <span>{formatDate(metadata.publishedAt)}</span>
              )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {description}
          </p>
        )}

        {/* Tags */}
        {metadata?.tags && metadata.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {metadata.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {metadata.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{metadata.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Rating */}
        {metadata?.rating !== undefined && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${
                  i < Math.floor(metadata.rating || 0)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            ))}
            <span className="text-xs text-muted-foreground ml-1">
              ({metadata.rating.toFixed(1)})
            </span>
          </div>
        )}

        {/* Similarity Progress Bar */}
        {showSimilarity && similarityScore !== undefined && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Relevance</span>
              <span className="font-medium">
                {formatScore(similarityScore)}
              </span>
            </div>
            <Progress value={(similarityScore || 0) * 100} className="h-1.5" />
          </div>
        )}

        {/* Action Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full group-hover:bg-primary/10"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          View Details
          <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
};
