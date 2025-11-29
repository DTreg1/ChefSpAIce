import { useState } from "react";
import {
  MessageCircle,
  X,
  MessageSquarePlus,
  Bug,
  Lightbulb,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChatInterface } from "./ChatInterface";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
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
import type { InsertFeedback } from "@shared/schema";

type FeedbackType = "bug" | "feature" | "praise" | "complaint" | "question";
type WidgetMode = "chat" | "feedback";

interface ChatWidgetProps {
  mode?: "floating" | "inline";
}

export function ChatWidget({ mode = "floating" }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [location] = useLocation();
  const [widgetMode, setWidgetMode] = useState<WidgetMode>("chat");

  const [feedbackType, setFeedbackType] = useState<FeedbackType>("praise");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [satisfaction, setSatisfaction] = useState<number>(3);
  const { toast } = useToast();

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: Partial<InsertFeedback>) => {
      const res = await apiRequest("POST", "/api/feedback", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Thank you for your feedback!",
        description: "We'll review it and take action as needed.",
      });
      resetFeedbackForm();
      setWidgetMode("chat");
      void queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
    },
    onError: () => {
      toast({
        title: "Failed to submit feedback",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const resetFeedbackForm = () => {
    setFeedbackType("praise");
    setContent("");
    setPriority("medium");
    setSatisfaction(3);
  };

  const handleSubmitFeedback = () => {
    if (!content.trim()) {
      toast({
        title: "Please enter your feedback",
        description: "We need to know what you're thinking!",
        variant: "destructive",
      });
      return;
    }

    const subject =
      feedbackType === "bug"
        ? "Bug Report"
        : feedbackType === "feature"
          ? "Feature Request"
          : feedbackType === "complaint"
            ? "Complaint"
            : feedbackType === "praise"
              ? "Praise"
              : "Question";

    submitFeedbackMutation.mutate({
      type: feedbackType,
      subject,
      message: content.trim(),
      priority: feedbackType === "bug" ? priority : undefined,
      rating: satisfaction,
      userAgent: navigator.userAgent,
      pageUrl: location,
    });
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const isOnChatPage = location === "/" || location.startsWith("/chat");

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {!isOpen && (
        <Button
          onClick={toggleChat}
          className="rounded-full w-14 h-14 shadow-lg"
          size="icon"
          data-testid="button-chat-widget-toggle"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {isOpen && (
        <Card
          className={cn(
            "w-96 h-[600px] shadow-xl",
            "flex flex-col",
            "animate-in fade-in slide-in-from-bottom-5 duration-300",
          )}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWidgetMode("chat")}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  widgetMode === "chat"
                    ? "bg-primary text-primary-foreground"
                    : "hover-elevate text-muted-foreground",
                )}
                data-testid="button-widget-mode-chat"
              >
                <MessageCircle className="w-4 h-4" />
                Chat
              </button>
              <button
                onClick={() => setWidgetMode("feedback")}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                  widgetMode === "feedback"
                    ? "bg-primary text-primary-foreground"
                    : "hover-elevate text-muted-foreground",
                )}
                data-testid="button-widget-mode-feedback"
              >
                <MessageSquarePlus className="w-4 h-4" />
                Feedback
              </button>
            </div>
            <Button
              onClick={toggleChat}
              variant="ghost"
              size="icon"
              data-testid="button-close-chat-widget"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-hidden">
            {widgetMode === "chat" ? (
              <ChatInterface
                conversationId={conversationId}
                onNewConversation={setConversationId}
              />
            ) : (
              <div className="h-full overflow-auto p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Feedback Type</Label>
                  <RadioGroup
                    value={feedbackType}
                    onValueChange={(v) => setFeedbackType(v as FeedbackType)}
                    data-testid="radio-feedback-type"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="praise" id="praise" />
                      <Label
                        htmlFor="praise"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <MessageSquarePlus className="w-4 h-4" />
                        General Feedback
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="bug" id="bug" />
                      <Label
                        htmlFor="bug"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Bug className="w-4 h-4" />
                        Report a Bug
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="feature" id="feature" />
                      <Label
                        htmlFor="feature"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Lightbulb className="w-4 h-4" />
                        Request Feature
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {feedbackType === "bug" && (
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={priority}
                      onValueChange={(v) =>
                        setPriority(v as "low" | "medium" | "high")
                      }
                    >
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - Minor issue</SelectItem>
                        <SelectItem value="medium">
                          Medium - Affects my work
                        </SelectItem>
                        <SelectItem value="high">
                          High - Blocking my work
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>How's your experience? (1-5)</Label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => setSatisfaction(rating)}
                        className={cn(
                          "w-10 h-10 rounded-full text-sm font-medium transition-all",
                          satisfaction === rating
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover-elevate",
                        )}
                        data-testid={`button-rating-${rating}`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    {feedbackType === "bug"
                      ? "Describe the issue"
                      : feedbackType === "feature"
                        ? "Describe your idea"
                        : "Your feedback"}
                  </Label>
                  <Textarea
                    placeholder={
                      feedbackType === "bug"
                        ? "What happened? What did you expect to happen?"
                        : feedbackType === "feature"
                          ? "What would you like to see added or improved?"
                          : "Share your thoughts with us..."
                    }
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={4}
                    className="resize-none"
                    data-testid="input-feedback-content"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      resetFeedbackForm();
                      setWidgetMode("chat");
                    }}
                    data-testid="button-cancel-feedback"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitFeedback}
                    disabled={
                      submitFeedbackMutation.isPending || !content.trim()
                    }
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
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
