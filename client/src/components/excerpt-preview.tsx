/**
 * ExcerptPreview Component
 * 
 * Displays a preview of an excerpt with performance metrics and interaction buttons.
 * Shows character count, word count, CTR, and allows copying and activation.
 * 
 * @module client/src/components/excerpt-preview
 */

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Copy, 
  CheckCircle, 
  TrendingUp, 
  Eye, 
  MousePointer, 
  Share2,
  BarChart3,
  Star,
  Edit2,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Excerpt } from "@shared/schema";

interface ExcerptPreviewProps {
  excerpt: Excerpt;
  performance?: {
    views: number;
    clicks: number;
    shares: number;
    ctr: number;
  };
  isActive?: boolean;
  onActivate?: (excerptId: string) => void;
  onEdit?: (excerptId: string) => void;
  onTrackClick?: (excerptId: string) => void;
  showControls?: boolean;
  variant?: 'compact' | 'full';
}

export function ExcerptPreview({
  excerpt,
  performance,
  isActive = false,
  onActivate,
  onEdit,
  onTrackClick,
  showControls = true,
  variant = 'full',
}: ExcerptPreviewProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(excerpt.excerpt);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Excerpt copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy excerpt",
        variant: "destructive",
      });
    }
  };

  const handleCardClick = () => {
    if (onTrackClick) {
      onTrackClick(excerpt.id);
    }
  };

  const getPlatformColor = (platform?: string) => {
    switch (platform) {
      case 'twitter': return 'bg-blue-500';
      case 'linkedin': return 'bg-blue-700';
      case 'facebook': return 'bg-blue-600';
      case 'instagram': return 'bg-gradient-to-br from-purple-600 to-pink-500';
      default: return 'bg-muted';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'social': return <Share2 className="h-3 w-3" />;
      case 'email': return <Eye className="h-3 w-3" />;
      case 'meta': return <BarChart3 className="h-3 w-3" />;
      default: return null;
    }
  };

  const ctrPercentage = performance ? performance.ctr * 100 : 0;
  const ctrTarget = 20; // 20% target CTR

  if (variant === 'compact') {
    return (
      <Card 
        className={`hover-elevate cursor-pointer ${isActive ? 'ring-2 ring-primary' : ''}`}
        onClick={handleCardClick}
        data-testid={`card-excerpt-${excerpt.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {excerpt.category && (
                <Badge variant="outline" className="text-xs">
                  {excerpt.category}
                </Badge>
              )}
              {isActive && (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              )}
              {excerpt.importance && (
                <Badge variant="outline" className="text-xs">
                  Importance: {(excerpt.importance * 100).toFixed(0)}%
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {excerpt.excerpt.length} chars
            </span>
          </div>
          
          <p className="text-sm line-clamp-3 mb-2">
            {excerpt.excerpt}
          </p>
          
          {performance && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MousePointer className="h-3 w-3" />
                CTR: {ctrPercentage.toFixed(1)}%
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {performance.views}
              </span>
              <span className="flex items-center gap-1">
                <Share2 className="h-3 w-3" />
                {performance.shares || 0}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`hover-elevate ${isActive ? 'ring-2 ring-primary' : ''}`}
      data-testid={`card-excerpt-full-${excerpt.id}`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">
              {excerpt.category || 'Excerpt'}
            </CardTitle>
            {isActive && (
              <Badge className="bg-green-500 text-white">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getTypeIcon(excerpt.category || '')}
            {excerpt.importance && (
              <Badge variant="outline" className="text-xs">
                Importance: {(excerpt.importance * 100).toFixed(0)}%
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          {excerpt.excerpt.length} characters • {excerpt.excerpt.split(/\s+/).length} words
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div 
          className="bg-muted p-4 rounded-md cursor-pointer hover:bg-muted/80 transition-colors"
          onClick={handleCardClick}
        >
          <p className="text-sm whitespace-pre-wrap">
            {excerpt.excerpt}
          </p>
        </div>

        {performance && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Performance Metrics</span>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>CTR</span>
                  <span className="font-medium">{ctrPercentage.toFixed(1)}%</span>
                </div>
                <Progress value={(ctrPercentage / ctrTarget) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Target: {ctrTarget}% {ctrPercentage >= ctrTarget && '✅'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="space-y-1">
                  <Eye className="h-4 w-4 mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Views</p>
                  <p className="text-sm font-medium">{performance.views}</p>
                </div>
                <div className="space-y-1">
                  <MousePointer className="h-4 w-4 mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Clicks</p>
                  <p className="text-sm font-medium">{performance.clicks}</p>
                </div>
                <div className="space-y-1">
                  <Share2 className="h-4 w-4 mx-auto text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Shares</p>
                  <p className="text-sm font-medium">{performance.shares || 0}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Generation params section removed - not available in database schema */}
      </CardContent>

      {showControls && (
        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              data-testid={`button-copy-${excerpt.id}`}
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(excerpt.id)}
                data-testid={`button-edit-${excerpt.id}`}
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
          {onActivate && !isActive && (
            <Button
              size="sm"
              onClick={() => onActivate(excerpt.id)}
              data-testid={`button-activate-${excerpt.id}`}
            >
              <Star className="h-4 w-4 mr-1" />
              Set Active
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}