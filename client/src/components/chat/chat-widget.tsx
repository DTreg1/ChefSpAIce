import { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  MessageSquarePlus,
  Bug,
  Lightbulb,
  Send,
  Loader2,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { useToast } from "@/hooks/use-toast";
import { useStreamedContent } from "@/hooks/use-streamed-content";
import { useAuth } from "@/hooks/useAuth";
import type { InsertFeedback } from "@shared/schema";

type FeedbackType = "bug" | "feature" | "praise" | "complaint" | "question";
type WidgetMode = "chat" | "feedback";

interface ChatWidgetProps {
  mode?: "floating" | "inline";
}

interface ChatMessageUI {
  id: string;
  role: string;
  content: string;
  timestamp: Date;
}

export function ChatWidget({ mode = "floating" }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const [widgetMode, setWidgetMode] = useState<WidgetMode>("chat");
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { user } = useAuth();

  const {
    displayContent: streamingContent,
    appendChunk,
    complete: completeStreaming,
    reset: resetStreaming,
    getFullContent,
  } = useStreamedContent({ batchInterval: 100 });

  const [feedbackType, setFeedbackType] = useState<FeedbackType>("praise");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [satisfaction, setSatisfaction] = useState<number>(3);
  const { toast } = useToast();

  const { data: chatHistory } = useQuery<Array<{ id: string; role: string; content: string; createdAt: Date | null }>>({
    queryKey: ["/api/chat/messages"],
    enabled: isOpen && widgetMode === "chat",
  });

  useEffect(() => {
    if (chatHistory) {
      const uiMessages: ChatMessageUI[] = chatHistory.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt ? new Date(msg.createdAt) : new Date(),
      }));
      setMessages(uiMessages);
    }
  }, [chatHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: Partial<InsertFeedback>) => {
      const res = await apiRequest(API_ENDPOINTS.feedback.submit, "POST", data);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Thank you for your feedback!",
        description: "We'll review it and take action as needed.",
      });
      resetFeedbackForm();
      setWidgetMode("chat");
      void queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.feedback.list] });
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

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage: ChatMessageUI = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsStreaming(true);
    resetStreaming();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        buffer += chunk;
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              completeStreaming();
              const finalContent = getFullContent();

              const aiMessage: ChatMessageUI = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: finalContent,
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, aiMessage]);
              setIsStreaming(false);
              abortControllerRef.current = null;

              await queryClient.invalidateQueries({
                queryKey: ["/api/chat/messages"],
              });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                appendChunk(parsed.content);
              }
            } catch (e) {}
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        abortControllerRef.current = null;
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setIsStreaming(false);
      resetStreaming();
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const isOnChatPage = location === "/" || location.startsWith("/ai-assistant");

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

          <div className="flex-1 overflow-hidden flex flex-col">
            {widgetMode === "chat" ? (
              <>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 && !isStreaming && (
                      <div className="text-center text-muted-foreground py-8">
                        <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-sm">Start a conversation</p>
                        <p className="text-xs mt-1">Ask me anything about cooking!</p>
                      </div>
                    )}

                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-2",
                          msg.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        {msg.role === "assistant" && (
                          <Avatar className="w-6 h-6 flex-shrink-0">
                            <AvatarFallback>
                              <Bot className="w-3 h-3" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                      </div>
                    ))}

                    {isStreaming && streamingContent && (
                      <div className="flex gap-2 justify-start">
                        <Avatar className="w-6 h-6 flex-shrink-0">
                          <AvatarFallback>
                            <Bot className="w-3 h-3" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="max-w-[80%] rounded-lg px-3 py-2 text-sm bg-muted">
                          <p className="whitespace-pre-wrap break-words">{streamingContent}</p>
                        </div>
                      </div>
                    )}

                    {isStreaming && !streamingContent && (
                      <div className="flex gap-2 justify-start">
                        <Avatar className="w-6 h-6 flex-shrink-0">
                          <AvatarFallback>
                            <Bot className="w-3 h-3" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <div className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="Ask something..."
                      className="resize-none min-h-[60px]"
                      rows={2}
                      disabled={isStreaming}
                      data-testid="input-widget-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isStreaming}
                      size="icon"
                      className="flex-shrink-0"
                      data-testid="button-widget-send"
                    >
                      {isStreaming ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
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
