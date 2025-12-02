import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ChatMessage, ChatInput } from "@/components/chat";
import { EmptyState } from "@/components/cards";
import { RecipeCard, UnifiedRecipeDialog } from "@/components/recipes";
import { ExpirationAlert } from "@/components/expiration-alert";
import { LoadingDots } from "@/components/loaders";
import { FeedbackButtons } from "@/components/feedback-buttons";
import { AIErrorDisplay, ConnectionStatus } from "@/components/ai-errors";
import { QuickActions } from "@/components/quick-actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, RotateCcw, MessageSquare, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useAIErrorHandler, parseAPIError } from "@/hooks/use-ai-error-handler";
import { useStreamedContent } from "@/hooks/use-streamed-content";
import { useVoiceConversation } from "@/hooks/useVoiceConversation";
import { ExpirationTicker } from "@/components/expiration-ticker";
import { format } from "date-fns";
import type { Recipe } from "@shared/schema";

type ChatMessageType = {
  id: string;
  userId: string;
  role: string;
  content: string;
  createdAt: Date | null;
  metadata?: string | null;
};

interface ChatMessageUI {
  id: string;
  userId: string;
  role: string;
  content: string;
  createdAt: Date | null;
  timestamp?: Date;
  attachments?: Array<{
    type: "image" | "audio" | "file";
    url: string;
    name?: string;
    size?: number;
    mimeType?: string;
  }>;
  metadata?: string | null;
}

type RecipeUI = Recipe;

function hasRecipeMetadata(metadata: string | null | undefined): boolean {
  if (!metadata || typeof metadata !== "string") return false;
  try {
    const parsed = JSON.parse(metadata);
    return parsed && typeof parsed.recipeId !== "undefined";
  } catch {
    return metadata.includes("recipeId");
  }
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<RecipeUI | null>(null);
  const [wasVoiceInput, setWasVoiceInput] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [pendingQuickAction, setPendingQuickAction] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  
  const {
    error: aiError,
    isRetrying,
    retryCount,
    canRetry,
    handleError: handleAIError,
    clearError: clearAIError,
    retry: retryLastMessage
  } = useAIErrorHandler({
    showToast: false,
    maxRetries: 3,
    onRetry: () => {
      if (lastFailedMessage) {
        handleSendMessage(lastFailedMessage);
      }
    }
  });
  
  const {
    displayContent: streamingContent,
    appendChunk,
    complete: completeStreaming,
    reset: resetStreaming,
    getFullContent,
  } = useStreamedContent({
    batchInterval: 100,
  });
  
  const { user } = useAuth();

  const handleSendMessage = async (
    content: string,
    attachments?: Array<{
      type: "image" | "audio" | "file";
      url: string;
      name?: string;
      size?: number;
      mimeType?: string;
    }>,
    wasVoice?: boolean,
  ) => {
    if (wasVoice) {
      setWasVoiceInput(true);
    }

    const userMessage: ChatMessageUI = {
      id: Date.now().toString(),
      userId: user?.id || "",
      role: "user",
      content,
      createdAt: new Date(),
      timestamp: new Date(),
      metadata: null,
      attachments: attachments || [],
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    resetStreaming();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          attachments: attachments,
        }),
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
                userId: user?.id || "",
                role: "assistant",
                content: finalContent,
                createdAt: new Date(),
                timestamp: new Date(),
                metadata: null,
                attachments: [],
              };
              setMessages((prev) => [...prev, aiMessage]);
              setIsStreaming(false);
              abortControllerRef.current = null;

              if (wasVoiceInput && finalContent) {
                speak(finalContent);
                setWasVoiceInput(false);
              }

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
            } catch (e) {
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        abortControllerRef.current = null;
        return;
      }
      
      setLastFailedMessage(content);
      
      if (error instanceof Response) {
        const aiErr = await parseAPIError(error);
        handleAIError(aiErr);
      } else {
        handleAIError({
          message: error instanceof Error ? error.message : "Failed to send message. Please try again.",
          code: "NETWORK_ERROR",
          retryable: true
        });
      }
      
      setIsStreaming(false);
      resetStreaming();
      abortControllerRef.current = null;
    }
  };

  const {
    voiceState,
    voices,
    selectedVoice,
    speechRate,
    speechPitch,
    toggleVoiceMode,
    stopSpeaking,
    speak,
    setSelectedVoice,
    setSpeechRate,
    setSpeechPitch,
  } = useVoiceConversation({
    onSendMessage: (text) => {
      handleSendMessage(text, undefined, true);
    },
    autoSend: true,
    silenceTimeout: 2000,
  });

  const getUserInitials = () => {
    if (!user) return "";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const { data: chatHistory } = useQuery<ChatMessageType[]>({
    queryKey: ["/api/chat/messages"],
  });

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/chat/messages", "DELETE");
    },
    onSuccess: () => {
      setMessages([]);
      setGeneratedRecipe(null);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      toast({
        title: "Chat cleared",
        description: "Your chat history has been cleared successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear chat history. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (chatHistory) {
      const uiMessages: ChatMessageUI[] = chatHistory.map(msg => ({
        ...msg,
        timestamp: msg.createdAt ? new Date(msg.createdAt) : new Date(),
        attachments: [],
        metadata: msg.metadata || null,
      }));
      setMessages(uiMessages);
    }
  }, [chatHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, generatedRecipe]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (pendingQuickAction && !isStreaming) {
      handleSendMessage(pendingQuickAction);
      setPendingQuickAction(null);
    }
  }, [pendingQuickAction, isStreaming]);

  const handleQuickAction = (prompt: string) => {
    if (!isStreaming) {
      handleSendMessage(prompt);
    } else {
      setPendingQuickAction(prompt);
    }
  };

  const handleRecipeGenerated = async (recipe: Recipe) => {
    setGeneratedRecipe(recipe);

    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "assistant",
          content: `I've created a recipe for you: ${recipe.title}`,
          metadata: JSON.stringify({ recipeId: recipe.id }),
        }),
      });

      if (response.ok) {
        await queryClient.invalidateQueries({
          queryKey: ["/api/chat/messages"],
        });
      }
    } catch (error) {
      console.error("Failed to save recipe message:", error);
      const recipeMessage: ChatMessageUI = {
        id: Date.now().toString(),
        userId: user?.id || "",
        role: "assistant",
        content: `I've created a recipe for you: ${recipe.title}`,
        createdAt: new Date(),
        timestamp: new Date(),
        metadata: JSON.stringify({ recipeId: recipe.id }),
        attachments: [],
      };
      setMessages((prev) => [...prev, recipeMessage]);
    }
  };

  return (
    <div className="flex gap-4 p-4 h-[calc(100vh-5rem)]">
      {/* Sidebar with chat history info */}
      <div className="w-80 flex-shrink-0 h-full">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Chat History</CardTitle>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => clearChatMutation.mutate()}
                  disabled={clearChatMutation.isPending || isStreaming}
                  data-testid="button-clear-chat-sidebar"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            <CardDescription className="text-xs">
              Your conversation with the AI Assistant
            </CardDescription>
          </CardHeader>
          <ScrollArea className="flex-1 px-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Start a conversation below</p>
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {messages.slice(-10).map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2 rounded-lg text-xs ${
                      msg.role === "user"
                        ? "bg-primary/10 ml-4"
                        : "bg-muted mr-4"
                    }`}
                    data-testid={`sidebar-message-${msg.id}`}
                  >
                    <p className="line-clamp-2">{msg.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {msg.createdAt
                        ? format(new Date(msg.createdAt), "h:mm a")
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="p-4 border-t">
            <ExpirationTicker />
          </div>
        </Card>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Header */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                  <Bot className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <CardTitle>AI Assistant</CardTitle>
                  <CardDescription>
                    Ask me anything about recipes, cooking, or managing your kitchen
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                {messages.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => clearChatMutation.mutate()}
                    disabled={clearChatMutation.isPending || isStreaming}
                    data-testid="button-clear-chat"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    New Chat
                  </Button>
                )}
                <UnifiedRecipeDialog onRecipeGenerated={handleRecipeGenerated} />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Quick Actions - show only when no messages */}
        {messages.length === 0 && !isStreaming && (
          <QuickActions onActionClick={handleQuickAction} />
        )}

        {/* Chat Interface */}
        <Card className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-3xl mx-auto">
              {/* Expiration Alert */}
              <div className="mb-4">
                <ExpirationAlert />
              </div>
              
              {/* AI Error Display */}
              {aiError && (
                <div className="mb-4">
                  <AIErrorDisplay
                    error={aiError}
                    isRetrying={isRetrying}
                    canRetry={canRetry ?? false}
                    retryCount={retryCount}
                    maxRetries={3}
                    onRetry={retryLastMessage}
                    onDismiss={clearAIError}
                  />
                </div>
              )}

              {messages.length === 0 && !isStreaming && !generatedRecipe ? (
                <EmptyState type="chat" />
              ) : (
                <>
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      role={message.role as "user" | "assistant" | "system"}
                      content={message.content}
                      userProfileImageUrl={user?.profileImageUrl || undefined}
                      userInitials={getUserInitials()}
                      timestamp={new Date(message.timestamp || message.createdAt || Date.now()).toLocaleTimeString(
                        [],
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    >
                      <>
                        {hasRecipeMetadata(message.metadata) && generatedRecipe && (
                          <RecipeCard
                            id={generatedRecipe.id}
                            title={generatedRecipe.title}
                            prepTime={generatedRecipe.prepTime || undefined}
                            cookTime={generatedRecipe.cookTime || undefined}
                            servings={generatedRecipe.servings || undefined}
                            ingredients={generatedRecipe.ingredients}
                            instructions={generatedRecipe.instructions}
                            usedIngredients={generatedRecipe.usedIngredients || []}
                            missingIngredients={generatedRecipe.missingIngredients || []}
                            showControls={true}
                          />
                        )}
                        {message.role === "assistant" && (
                          <FeedbackButtons
                            contextId={message.id}
                            contextType="chat_message"
                            className="mt-2"
                          />
                        )}
                      </>
                    </ChatMessage>
                  ))}

                  {isStreaming && streamingContent && (
                    <ChatMessage
                      role="assistant"
                      content={streamingContent}
                      userProfileImageUrl={user?.profileImageUrl || undefined}
                      userInitials={getUserInitials()}
                      autoPlayVoice={wasVoiceInput}
                    />
                  )}

                  {isStreaming && !streamingContent && (
                    <div className="flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-accent-foreground" />
                      </div>
                      <div className="bg-accent rounded-2xl px-4 py-3 text-accent-foreground">
                        <LoadingDots />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Chat Input with Voice Support */}
          <div className="border-t">
            <ChatInput
              onSend={handleSendMessage}
              disabled={isStreaming}
              voiceState={voiceState}
              voiceTranscript={voiceState.currentTranscript}
              onVoiceModeToggle={toggleVoiceMode}
              onStopSpeaking={stopSpeaking}
              voices={voices}
              selectedVoice={selectedVoice}
              onVoiceChange={setSelectedVoice}
              speechRate={speechRate}
              onSpeechRateChange={setSpeechRate}
              speechPitch={speechPitch}
              onSpeechPitchChange={setSpeechPitch}
            />
          </div>
        </Card>
      </div>
      
      <ConnectionStatus />
    </div>
  );
}
