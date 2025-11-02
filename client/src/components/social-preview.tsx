/**
 * SocialPreview Component
 * 
 * Shows how an excerpt will appear on different social media platforms
 * (Twitter, LinkedIn, Facebook) with platform-specific styling.
 * 
 * @module client/src/components/social-preview
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, ThumbsUp } from "lucide-react";

interface SocialPreviewProps {
  excerpt: string;
  platform: string;
  metadata?: {
    title?: string;
    description?: string;
    imageUrl?: string;
    author?: string;
    authorAvatar?: string;
    timestamp?: string;
  };
}

export function SocialPreview({ excerpt, platform, metadata = {} }: SocialPreviewProps) {
  const {
    title = "Your Content Title",
    description = excerpt,
    imageUrl = "/api/placeholder/600/300",
    author = "You",
    authorAvatar = "",
    timestamp = "Just now",
  } = metadata;

  // Twitter/X Preview
  if (platform === 'twitter') {
    return (
      <Card className="max-w-[600px]" data-testid="preview-twitter">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={authorAvatar} />
              <AvatarFallback>{author[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="font-semibold">{author}</span>
                  <Badge variant="secondary" className="text-xs px-1">@{author.toLowerCase().replace(/\s/g, '')}</Badge>
                  <span className="text-sm text-muted-foreground">· {timestamp}</span>
                </div>
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </div>
              
              <p className="mt-2 text-sm whitespace-pre-wrap">
                {excerpt}
              </p>
              
              {imageUrl && (
                <div className="mt-3 rounded-xl overflow-hidden bg-muted aspect-video">
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    Preview Image
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between mt-4 text-muted-foreground">
                <button className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-sm">12</span>
                </button>
                <button className="flex items-center gap-2 hover:text-green-500 transition-colors">
                  <Share2 className="h-4 w-4 rotate-90" />
                  <span className="text-sm">5</span>
                </button>
                <button className="flex items-center gap-2 hover:text-red-500 transition-colors">
                  <Heart className="h-4 w-4" />
                  <span className="text-sm">42</span>
                </button>
                <button className="hover:text-blue-500 transition-colors">
                  <Bookmark className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // LinkedIn Preview
  if (platform === 'linkedin') {
    return (
      <Card className="max-w-[600px]" data-testid="preview-linkedin">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={authorAvatar} />
              <AvatarFallback>{author[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div>
                <p className="font-semibold">{author}</p>
                <p className="text-xs text-muted-foreground">Professional Title</p>
                <p className="text-xs text-muted-foreground">{timestamp} • 🌐</p>
              </div>
            </div>
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <p className="mt-3 text-sm whitespace-pre-wrap">
            {excerpt}
          </p>
          
          {imageUrl && (
            <div className="mt-3 -mx-4">
              <div className="bg-muted aspect-video flex items-center justify-center text-muted-foreground">
                Preview Image
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                23
              </span>
              <span>• 4 comments</span>
            </div>
          </div>
          
          <div className="flex items-center justify-around mt-3 pt-3 border-t text-muted-foreground">
            <button className="flex items-center gap-2 hover:text-blue-600 transition-colors">
              <ThumbsUp className="h-4 w-4" />
              <span className="text-sm">Like</span>
            </button>
            <button className="flex items-center gap-2 hover:text-blue-600 transition-colors">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">Comment</span>
            </button>
            <button className="flex items-center gap-2 hover:text-blue-600 transition-colors">
              <Share2 className="h-4 w-4" />
              <span className="text-sm">Share</span>
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Facebook Preview
  if (platform === 'facebook') {
    return (
      <Card className="max-w-[600px]" data-testid="preview-facebook">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={authorAvatar} />
              <AvatarFallback>{author[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{author}</p>
              <p className="text-xs text-muted-foreground">{timestamp}</p>
            </div>
          </div>
          
          <p className="mt-3 text-sm whitespace-pre-wrap">
            {excerpt}
          </p>
          
          {imageUrl && (
            <div className="mt-3 -mx-4">
              <div className="bg-muted aspect-video flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg font-medium">{title}</p>
                  <p className="text-sm mt-2">{description.substring(0, 100)}...</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between mt-4 pt-3 border-t text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>👍❤️ 42</span>
            </div>
            <div className="flex items-center gap-3">
              <span>8 comments</span>
              <span>3 shares</span>
            </div>
          </div>
          
          <div className="flex items-center justify-around mt-3 pt-3 border-t">
            <button className="flex items-center gap-2 text-muted-foreground hover:text-blue-600 transition-colors">
              <ThumbsUp className="h-4 w-4" />
              <span className="text-sm">Like</span>
            </button>
            <button className="flex items-center gap-2 text-muted-foreground hover:text-blue-600 transition-colors">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">Comment</span>
            </button>
            <button className="flex items-center gap-2 text-muted-foreground hover:text-blue-600 transition-colors">
              <Share2 className="h-4 w-4" />
              <span className="text-sm">Share</span>
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generic/Meta Preview
  return (
    <Card className="max-w-[600px]" data-testid="preview-generic">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Preview Card</CardTitle>
      </CardHeader>
      <CardContent>
        {imageUrl && (
          <div className="rounded-md overflow-hidden bg-muted aspect-video mb-4">
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              Preview Image
            </div>
          </div>
        )}
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {description}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {author} · {timestamp}
        </p>
      </CardContent>
    </Card>
  );
}