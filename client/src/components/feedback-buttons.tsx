import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { InsertFeedback } from "@shared/schema";

interface FeedbackButtonsProps {
  contextId: string;
  contextType: 'chat_message' | 'recipe' | 'food_item';
  variant?: 'inline' | 'floating';
  className?: string;
  onFeedbackSubmit?: (sentiment: 'positive' | 'negative') => void;
}

export function FeedbackButtons({ 
  contextId, 
  contextType, 
  variant = 'inline',
  className,
  onFeedbackSubmit
}: FeedbackButtonsProps) {
  const [sentiment, setSentiment] = useState<'positive' | 'negative' | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: Partial<InsertFeedback>) => {
      const res = await apiRequest('POST', '/api/feedback', data);
      return res.json();
    },
    onSuccess: (_, variables) => {
      setHasSubmitted(true);
      setSentiment(variables.sentiment as 'positive' | 'negative');
      void queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      if (onFeedbackSubmit && variables.sentiment) {
        onFeedbackSubmit(variables.sentiment as 'positive' | 'negative');
      }
    }
  });

  const handleFeedback = async (newSentiment: 'positive' | 'negative') => {
    if (hasSubmitted && sentiment === newSentiment) {
      // Already submitted this sentiment
      return;
    }

    // Map contextType to valid feedback type values
    const feedbackType: InsertFeedback['type'] = 'improvement';

    submitFeedbackMutation.mutate({
      type: feedbackType,
      subject: `${newSentiment === 'positive' ? 'Positive' : 'Negative'} feedback on ${contextType}`,
      description: `User provided ${newSentiment} feedback for ${contextType} with ID: ${contextId}`,
      sentiment: newSentiment,
      tags: [contextType, contextId, newSentiment]
    });
  };

  return (
    <div className={cn(
      "flex items-center gap-1",
      variant === 'floating' && "glass-subtle rounded-lg p-1",
      className
    )}>
      <Button
        size="icon"
        variant="ghost"
        className={cn(
          "h-7 w-7 transition-all",
          hasSubmitted && sentiment === 'positive' 
            ? "text-green-600 dark:text-green-400" 
            : "text-muted-foreground hover:text-foreground",
          submitFeedbackMutation.isPending && "opacity-50"
        )}
        onClick={() => handleFeedback('positive')}
        disabled={submitFeedbackMutation.isPending}
        data-testid="button-feedback-positive"
        title="Helpful"
      >
        <ThumbsUp className={cn(
          "w-4 h-4",
          hasSubmitted && sentiment === 'positive' && "fill-current"
        )} />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className={cn(
          "h-7 w-7 transition-all",
          hasSubmitted && sentiment === 'negative' 
            ? "text-red-600 dark:text-red-400" 
            : "text-muted-foreground hover:text-foreground",
          submitFeedbackMutation.isPending && "opacity-50"
        )}
        onClick={() => handleFeedback('negative')}
        disabled={submitFeedbackMutation.isPending}
        data-testid="button-feedback-negative"
        title="Not Helpful"
      >
        <ThumbsDown className={cn(
          "w-4 h-4",
          hasSubmitted && sentiment === 'negative' && "fill-current"
        )} />
      </Button>
    </div>
  );
}