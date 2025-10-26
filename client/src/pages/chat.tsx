import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { EmptyState } from "@/components/empty-state";
import { RecipeCard } from "@/components/recipe-card";
import { RecipeCustomizationDialog } from "@/components/recipe-customization-dialog";
import { ExpirationAlert } from "@/components/expiration-alert";
import { LoadingDots } from "@/components/loading-dots";
import { FeedbackButtons } from "@/components/feedback-buttons";
import { VoiceActivityIndicator } from "@/components/voice-activity-indicator";
import { Button } from "@/components/ui/button";
import { ChefHat, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceConversation } from "@/hooks/useVoiceConversation";
import type { ChatMessage as ChatMessageType, Recipe } from "@shared/schema";
import { ExpirationTicker } from "@/components/expiration-ticker";
import { useStreamedContent } from "@/hooks/use-streamed-content";

// Extended type for UI-only properties
interface ChatMessageUI {
  id: string;
  userId: string;
  role: string;
  content: string;
  createdAt: Date | null;
  timestamp?: Date; // For UI display
  attachments?: Array<{
    type: "image" | "audio" | "file";
    url: string;
    name?: string;
    size?: number;
    mimeType?: string;
  }>;
  metadata?: any;
}

// Extended Recipe type for UI - Recipe already has these fields, just ensuring compatibility
type RecipeUI = Recipe;

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<RecipeUI | null>(null);
  const [wasVoiceInput, setWasVoiceInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  
  // Use batched streaming hook for better performance
  const {
    displayContent: streamingContent,
    appendChunk,
    complete: completeStreaming,
    reset: resetStreaming,
    getFullContent,
  } = useStreamedContent({
    batchInterval: 100, // Update UI every 100ms
    onComplete: (content) => {
      console.log("Streaming completed with content length:", content.length);
    }
  });
  const { user } = useAuth();

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
      return apiRequest("DELETE", "/api/chat/messages");
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
      // Convert ChatMessageType[] to ChatMessageUI[]
      const uiMessages: ChatMessageUI[] = chatHistory.map(msg => ({
        ...msg,
        timestamp: msg.createdAt || new Date(),
        attachments: [],
        metadata: null,
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

  const handleRecipeGenerated = async (recipe: Recipe) => {
    setGeneratedRecipe(recipe);

    // Save the recipe notification message to the database
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
        // Refresh chat messages to get the saved message with proper ID
        await queryClient.invalidateQueries({
          queryKey: ["/api/chat/messages"],
        });
      }
    } catch (error) {
      console.error("Failed to save recipe message:", error);
      // Still show the message locally even if save fails
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
    // Set whether this was voice input for auto-playing response
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
    resetStreaming(); // Clear any previous streaming content

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
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              // Complete the streaming
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

              // Auto-play voice response if the input was from voice
              if (wasVoiceInput && finalContent) {
                // The VoiceControls component will handle auto-playing
                setWasVoiceInput(false); // Reset for next message
              }

              // Invalidate chat messages query to refetch with saved messages
              await queryClient.invalidateQueries({
                queryKey: ["/api/chat/messages"],
              });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                // Use batched streaming - this will update UI every 100ms
                appendChunk(parsed.content);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Chat stream aborted");
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

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border p-4 pb-1 bg-gradient-to-r from-lime-950/50 to-green-50/30 dark:from-lime-50/20 dark:to-green-950/20 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Chat with Chef
            </h2>
            <p className="text-sm text-muted-foreground">
              Get recipe suggestions and manage your inventory
            </p>
            <div>
              <ExpirationTicker />
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
                Start New Chat
              </Button>
            )}
            <RecipeCustomizationDialog
              onRecipeGenerated={handleRecipeGenerated}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-lime-950/50 to-green-50/30 dark:from-lime-50/20 dark:to-green-950/20">
        <div className="max-w-4xl mx-auto p-6 pt-0">
          <div className="mt-6 mb-6">
            <ExpirationAlert />
          </div>

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
                  timestamp={(message.timestamp || message.createdAt || new Date()).toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                >
                  <>
                    {message.metadata &&
                      message.metadata.includes("recipeId") &&
                      generatedRecipe && (
                        <RecipeCard
                          id={generatedRecipe.id}
                          title={generatedRecipe.title}
                          prepTime={generatedRecipe.prepTime || undefined}
                          cookTime={generatedRecipe.cookTime || undefined}
                          servings={generatedRecipe.servings || undefined}
                          ingredients={generatedRecipe.ingredients}
                          instructions={generatedRecipe.instructions}
                          usedIngredients={generatedRecipe.usedIngredients || []}
                          missingIngredients={
                            generatedRecipe.missingIngredients || []
                          }
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
                    <ChefHat className="w-4 h-4 text-accent-foreground" />
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

      <div className="shadow-2xl">
        <ChatInput
          onSend={handleSendMessage}
          disabled={isStreaming}
          showFeedbackWidget={true}
        />
      </div>
    </div>
  );
}
