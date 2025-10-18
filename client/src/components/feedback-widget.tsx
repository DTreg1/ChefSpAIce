import { MessageSquarePlus, Bug, Lightbulb, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { InsertFeedback } from "@shared/schema";

type FeedbackType = 'bug' | 'feature' | 'general';

interface FeedbackWidgetProps {
  mode?: 'floating' | 'inline';
}

export function FeedbackWidget({ mode = 'floating' }: FeedbackWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [satisfaction, setSatisfaction] = useState<'positive' | 'negative' | 'neutral'>('neutral');
  const { toast } = useToast();
  const [location] = useLocation();

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: Partial<InsertFeedback>) => {
      const res = await apiRequest('POST', '/api/feedback', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Thank you for your feedback!",
        description: "We'll review it and take action as needed.",
      });
      setIsOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
    },
    onError: () => {
      toast({
        title: "Failed to submit feedback",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFeedbackType('general');
    setContent("");
    setPriority('medium');
    setSatisfaction('neutral');
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      toast({
        title: "Please enter your feedback",
        description: "We need to know what you're thinking!",
        variant: "destructive"
      });
      return;
    }

    submitFeedbackMutation.mutate({
      type: feedbackType,
      content: content.trim(),
      priority: feedbackType === 'bug' ? priority : undefined,
      sentiment: satisfaction,
      metadata: {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    });
  };

  // Adjust positioning when on the chat page to avoid overlapping with chat input
  // Both '/' and '/chat' routes render the Chat component
  const isOnChatPage = location === '/' || location.startsWith('/chat');

  const triggerButton = (
    <button
      onClick={() => setIsOpen(true)}
      className={cn(
        mode === 'floating' && "fixed z-50",
        mode === 'floating' && (isOnChatPage ? "bottom-48 right-6" : "bottom-6 right-6"),
        mode === 'inline' && "flex-shrink-0",
        "glass-subtle backdrop-blur-md",
        mode === 'floating' ? "rounded-full p-4" : "rounded-full p-3",
        "shadow-glass hover:shadow-glass-hover",
        "transition-all duration-300 hover:scale-105",
        "group"
      )}
      data-testid="button-feedback-widget"
      title="Send Feedback"
    >
      <MessageSquarePlus className={cn(
        mode === 'floating' ? "w-5 h-5" : "w-4 h-4",
        "text-foreground group-hover:rotate-12 transition-transform"
      )} />
    </button>
  );

  const feedbackForm = (
    <div
      className={cn(
        mode === 'floating' && "fixed z-50",
        mode === 'floating' && (isOnChatPage ? "bottom-48 right-6" : "bottom-6 right-6"),
        mode === 'inline' && "absolute bottom-full mb-2 left-0 z-50",
        "glass-subtle backdrop-blur-md",
        "rounded-2xl shadow-glass",
        "w-96 max-h-[600px]",
        "animate-in slide-in-from-bottom-5 fade-in duration-300"
      )}
      style={{ borderRadius: "var(--radius)" }}
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Send Feedback</h3>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8"
            data-testid="button-close-feedback"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Feedback Type</Label>
            <RadioGroup value={feedbackType} onValueChange={(v) => setFeedbackType(v as FeedbackType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="general" id="general" />
                <Label htmlFor="general" className="flex items-center gap-2 cursor-pointer">
                  <MessageSquarePlus className="w-4 h-4" />
                  General Feedback
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bug" id="bug" />
                <Label htmlFor="bug" className="flex items-center gap-2 cursor-pointer">
                  <Bug className="w-4 h-4" />
                  Report a Bug
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="feature" id="feature" />
                <Label htmlFor="feature" className="flex items-center gap-2 cursor-pointer">
                  <Lightbulb className="w-4 h-4" />
                  Request Feature
                </Label>
              </div>
            </RadioGroup>
          </div>

          {feedbackType === 'bug' && (
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as 'low' | 'medium' | 'high')}>
                <SelectTrigger data-testid="select-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Minor issue</SelectItem>
                  <SelectItem value="medium">Medium - Affects my work</SelectItem>
                  <SelectItem value="high">High - Blocking my work</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>How's your experience?</Label>
            <RadioGroup value={satisfaction} onValueChange={(v) => setSatisfaction(v as 'positive' | 'negative' | 'neutral')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="positive" id="positive" />
                <Label htmlFor="positive" className="cursor-pointer">😊 Great</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="neutral" id="neutral" />
                <Label htmlFor="neutral" className="cursor-pointer">😐 Okay</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="negative" id="negative" />
                <Label htmlFor="negative" className="cursor-pointer">😔 Needs improvement</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>
              {feedbackType === 'bug' ? 'Describe the issue' :
               feedbackType === 'feature' ? 'Describe your idea' :
               'Your feedback'}
            </Label>
            <Textarea
              placeholder={
                feedbackType === 'bug' ? 
                  "What happened? What did you expect to happen?" :
                feedbackType === 'feature' ?
                  "What would you like to see added or improved?" :
                  "Share your thoughts with us..."
              }
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
              data-testid="input-feedback-content"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
              data-testid="button-cancel-feedback"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitFeedbackMutation.isPending || !content.trim()}
              data-testid="button-submit-feedback"
            >
              {submitFeedbackMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (mode === 'inline') {
    return (
      <div className="relative">
        {triggerButton}
        {isOpen && feedbackForm}
      </div>
    );
  }

  return isOpen ? feedbackForm : triggerButton;
}