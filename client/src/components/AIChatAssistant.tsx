/**
 * AI Chat Assistant Component (Task 7)
 * 
 * Provides a comprehensive chat interface with conversation management.
 */

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { MessageCircle, Plus, MoreVertical, Trash2, Edit, Bot, User, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  tokensUsed: number;
}

export function AIChatAssistant() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isNewConversation, setIsNewConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Fetch conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ["/api/assistant/conversations"],
    enabled: true
  });

  // Fetch messages for selected conversation
  const { data: conversationData, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/assistant/conversations", selectedConversation],
    enabled: !!selectedConversation
  });

  const messages = conversationData?.messages || [];

  // Create new conversation
  const createConversationMutation = useMutation({
    mutationFn: async (title: string) => {
      return apiRequest("POST", "/api/assistant/conversations", { title });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/conversations"] });
      setSelectedConversation(data.id);
      setIsNewConversation(false);
      toast({
        title: "Conversation created",
        description: "New conversation started successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create conversation.",
        variant: "destructive"
      });
    }
  });

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      return apiRequest("POST", `/api/assistant/conversations/${conversationId}/messages`, { content });
    },
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/assistant/conversations", conversationId] 
      });
      setMessageInput("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message.",
        variant: "destructive"
      });
    }
  });

  // Delete conversation
  const deleteConversationMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/assistant/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/conversations"] });
      setSelectedConversation(null);
      toast({
        title: "Conversation deleted",
        description: "Conversation removed successfully."
      });
    }
  });

  // Rename conversation
  const renameConversationMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      return apiRequest("PUT", `/api/assistant/conversations/${id}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assistant/conversations"] });
      toast({
        title: "Conversation renamed",
        description: "Title updated successfully."
      });
    }
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
        content: messageInput
      });
    } else {
      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversation,
        content: messageInput
      });
    }
  };

  const handleRenameConversation = (id: string) => {
    const newTitle = prompt("Enter new title:");
    if (newTitle) {
      renameConversationMutation.mutate({ id, title: newTitle });
    }
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
                  ? conversations.find((c: Conversation) => c.id === selectedConversation)?.title
                  : "New Conversation"}
              </h2>
              <p className="text-sm text-muted-foreground">
                AI-powered chat assistant
              </p>
            </div>
            {selectedConversation && (
              <Badge variant="secondary">
                {messages.length} messages
              </Badge>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-4xl mx-auto">
            {messagesLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center p-8">
                <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
                <p className="text-muted-foreground">
                  Ask me anything! I'm here to help.
                </p>
              </div>
            ) : (
              messages.map((message: Message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "flex-row-reverse" : ""
                  }`}
                  data-testid={`message-${message.id}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {message.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`flex-1 ${
                      message.role === "user" ? "text-right" : ""
                    }`}
                  >
                    <div
                      className={`inline-block p-3 rounded-lg ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(message.timestamp), "h:mm a")}
                      {message.tokensUsed > 0 && (
                        <span className="ml-2">• {message.tokensUsed} tokens</span>
                      )}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
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