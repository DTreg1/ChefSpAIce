import { Star } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { InsertFeedback } from "@shared/schema";

interface StarRatingProps {
  contextId: string;
  contextType: 'recipe' | 'food_item';
  initialRating?: number;
  showTextFeedback?: boolean;
  className?: string;
  onRatingSubmit?: (rating: number, comment?: string) => void;
}

export function StarRating({
  contextId,
  contextType,
  initialRating = 0,
  showTextFeedback = false,
  className,
  onRatingSubmit
}: StarRatingProps) {
  const [rating, setRating] = useState(initialRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const submitRatingMutation = useMutation({
    mutationFn: async (data: Partial<InsertFeedback>) => {
      const res = await apiRequest('POST', '/api/feedback', data);
      return res.json();
    },
    onSuccess: () => {
      setHasSubmitted(true);
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      if (contextType === 'recipe') {
        queryClient.invalidateQueries({ queryKey: ['/api/recipes'] });
      }
      if (onRatingSubmit) {
        onRatingSubmit(rating, comment);
      }
    }
  });

  const handleRatingClick = (newRating: number) => {
    setRating(newRating);
    
    if (showTextFeedback) {
      setIsOpen(true);
    } else {
      // Submit immediately without text feedback
      submitRatingMutation.mutate({
        type: newRating >= 4 ? 'praise' : 'improvement',
        sentiment: newRating >= 4 ? 'positive' : newRating <= 2 ? 'negative' : 'neutral',
        subject: `${newRating} star rating for ${contextType}`,
        description: `User gave ${newRating} stars (${contextId})`
      });
    }
  };

  const handleSubmitWithComment = () => {
    submitRatingMutation.mutate({
      type: rating >= 4 ? 'praise' : 'improvement',
      subject: `${rating} star rating for ${contextType}`,
      description: comment ? `${comment} (${rating} stars - ${contextId})` : `User gave ${rating} stars (${contextId})`,
      sentiment: rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral'
    });
  };

  const stars = Array.from({ length: 5 }, (_, i) => i + 1);

  const ratingComponent = (
    <div className={cn("flex items-center gap-1", className)}>
      {stars.map((star) => (
        <button
          key={star}
          onClick={() => handleRatingClick(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          disabled={submitRatingMutation.isPending || hasSubmitted}
          className={cn(
            "transition-all focus:outline-none",
            hasSubmitted && "cursor-default"
          )}
          data-testid={`button-star-${star}`}
        >
          <Star
            className={cn(
              "w-5 h-5 transition-colors",
              (hoverRating >= star || rating >= star)
                ? "fill-yellow-500 text-yellow-500"
                : "text-muted-foreground hover:text-yellow-500/70",
              submitRatingMutation.isPending && "opacity-50"
            )}
          />
        </button>
      ))}
      {hasSubmitted && (
        <span className="text-xs text-muted-foreground ml-2">
          Thanks for rating!
        </span>
      )}
    </div>
  );

  if (!showTextFeedback) {
    return ratingComponent;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div>{ratingComponent}</div>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="font-medium text-sm">
            {rating >= 4 ? "Great! What did you like?" :
             rating <= 2 ? "Sorry to hear that. What went wrong?" :
             "Thanks for rating! Any comments?"}
          </div>
          <Textarea
            placeholder="Optional feedback..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="resize-none"
            data-testid="input-feedback-comment"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                // Submit without comment
                submitRatingMutation.mutate({
                  type: rating >= 4 ? 'praise' : 'improvement',
                  sentiment: rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral',
                  subject: `${rating} star rating for ${contextType}`,
                  description: `User gave ${rating} stars (${contextId})`
                });
              }}
              data-testid="button-skip-comment"
            >
              Skip
            </Button>
            <Button
              size="sm"
              onClick={handleSubmitWithComment}
              disabled={submitRatingMutation.isPending}
              data-testid="button-submit-rating"
            >
              Submit
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}