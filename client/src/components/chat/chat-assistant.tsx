/**
 * AI Chat Assistant Component (Task 7)
 *
 * Provides a comprehensive chat interface with conversation management.
 */

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import DOMPurify from "isomorphic-dompurify";
import { VoiceControls } from "@/components/voice";
import { EnrichedContent } from "@/components/enriched-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ChefHat,
  MessageCircle,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Bot,
  User,
  Send,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessageProps {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  tokensUsed: number;
  children?: React.ReactNode;
  userProfileImageUrl?: string;
  userInitials?: string;
  autoPlayVoice?: boolean;
}

export function AIChatAssistant({
  role,
  content,
  timestamp,
  children,
  userProfileImageUrl,
  userInitials,
  autoPlayVoice = false,
}: ChatMessageProps) {
  const isUser = role === "user";
  const isSystem = role === "system";

  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messageInput, setMessageInput] = useState("");
  const [isNewConversation, setIsNewConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } =
    useQuery({
      queryKey: ["/api/assistant/conversations"],
      queryFn: async () => {
        const response = await apiRequest(
          "/api/assistant/conversations",
          "GET",
        );
        return response;
      },
      enabled: true,
    });

  // Fetch messages for selected conversation
  const { data: conversationData, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/assistant/conversations", selectedConversation],
    queryFn: async () => {
      const response = await apiRequest(
        `/api/assistant/conversations/${selectedConversation}`,
        "GET",
      );
      return response;
    },
    enabled: !!selectedConversation,
  });

  const messages = conversationData?.messages || [];

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest(
        "/api/assistant/conversations",
        "POST",
        { title },
      );
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/assistant/conversations"],
      });
      setSelectedConversation(data.id);
      setIsNewConversation(false);
      toast({
        title: "Conversation created",
        description: "New conversation started successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create conversation.",
        variant: "destructive",
      });
    },
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async ({
      conversationId,
      content,
    }: {
      conversationId: string;
      content: string;
    }) => {
      const response = await apiRequest(
        `/api/assistant/conversations/${conversationId}/messages`,
        "POST",
        { content },
      );
      return response;
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: ["/api/assistant/conversations", conversationId],
      });
      setMessageInput("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive",
      });
    },
  });

  // Delete conversation
  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(
        `/api/assistant/conversations/${id}`,
        "DELETE",
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/assistant/conversations"],
      });
      setSelectedConversation(null);
      toast({
        title: "Conversation deleted",
        description: "Conversation removed successfully.",
      });
    },
  });

  // Rename conversation
  const renameConversationMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const response = await apiRequest(
        `/api/assistant/conversations/${id}`,
        "PUT",
        { title },
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/assistant/conversations"],
      });
      toast({
        title: "Conversation renamed",
        description: "Title updated successfully.",
      });
    },
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    if (!selectedConversation) {
      // Create new conversation first
      const newConv = await createConversationMutation.mutateAsync("New Chat");
      await sendMessageMutation.mutateAsync({
        conversationId: newConv.id,
        content: messageInput,
      });
    } else {
      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversation,
        content: messageInput,
      });
    }
  };

  const handleRenameConversation = (id: string) => {
    const newTitle = prompt("Enter new title:");
    if (newTitle) {
      renameConversationMutation.mutate({ id, title: newTitle });
    }
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-6" data-testid="message-system">
        <div
          className="glass-subtle border-2 border-border/50 rounded-xl px-4 py-2 text-sm text-muted-foreground max-w-md text-center shadow-glass transition-morph"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      {/* Sidebar - Conversation List */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <Button
            onClick={() => {
              setSelectedConversation(null);
              setIsNewConversation(true);
            }}
            className="w-full"
            data-testid="button-new-conversation"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Conversation
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {conversationsLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-center text-muted-foreground p-4">
                No conversations yet
              </p>
            ) : (
              conversations.map((conv: Conversation) => (
                <Card
                  key={conv.id}
                  className={`cursor-pointer transition-colors hover-elevate ${
                    selectedConversation === conv.id ? "border-primary" : ""
                  }`}
                  onClick={() => setSelectedConversation(conv.id)}
                  data-testid={`card-conversation-${conv.id}`}
                >
                  <CardHeader className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-sm line-clamp-1">
                          {conv.title}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          {format(new Date(conv.updatedAt), "MMM d, h:mm a")}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            data-testid={`button-conversation-menu-${conv.id}`}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameConversation(conv.id);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteConversationMutation.mutate(conv.id);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">
                {selectedConversation
                  ? conversations.find(
                      (c: Conversation) => c.id === selectedConversation,
                    )?.title
                  : "New Conversation"}
              </h2>
              <p className="text-sm text-muted-foreground">
                AI-powered chat assistant
              </p>
            </div>
            {selectedConversation && (
              <Badge variant="secondary">{messages.length} messages</Badge>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div
            className={cn(
              "flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
              isUser ? "flex-row-reverse" : "flex-row",
            )}
            data-testid={`message-${role}`}
          >
            {isUser ? (
              <Avatar className="w-8 h-8 flex-shrink-0 transition-spring">
                <AvatarImage src={userProfileImageUrl || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {userInitials || <User className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0 transition-spring">
                <ChefHat className="w-4 h-4 text-accent-foreground" />
              </div>
            )}

            <div
              className={cn(
                "flex flex-col gap-2",
                isUser ? "items-end" : "items-start",
                "max-w-2xl",
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 glass-subtle shadow-glass transition-morph",
                  isUser
                    ? "bg-primary/90 text-primary-foreground backdrop-blur-sm"
                    : "bg-accent/90 text-foreground backdrop-blur-sm",
                )}
                style={{ borderRadius: "var(--radius)" }}
              >
                {isUser ? (
                  <p
                    className="text-base leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
                  />
                ) : (
                  <div className="text-base leading-relaxed whitespace-pre-wrap">
                    <EnrichedContent
                      text={content}
                      usePopover={true}
                      enableDetection={true}
                    />
                  </div>
                )}
              </div>

              {!!children && <div className="w-full mt-1">{children}</div>}

              <div className="flex items-center gap-2 mt-1">
                {!isUser && (
                  <VoiceControls
                    text={content}
                    autoPlay={autoPlayVoice}
                    className="h-6 w-6"
                  />
                )}
                {timestamp && (
                  <span
                    className="text-xs text-muted-foreground"
                    data-testid="text-timestamp"
                  >
                    {timestamp}
                  </span>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2 max-w-4xl mx-auto"
          >
            <Input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type your message..."
              disabled={sendMessageMutation.isPending}
              className="flex-1"
              data-testid="input-message"
            />
            <Button
              type="submit"
              disabled={!messageInput.trim() || sendMessageMutation.isPending}
              data-testid="button-send-message"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
