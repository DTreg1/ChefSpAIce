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
import { Button } from "@/components/ui/button";
import { ChefHat, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { ChatMessage as ChatMessageType, Recipe } from "@shared/schema";

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
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
      setMessages(chatHistory);
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
        await queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      }
    } catch (error) {
      console.error("Failed to save recipe message:", error);
      // Still show the message locally even if save fails
      const recipeMessage: ChatMessageType = {
        id: Date.now().toString(),
        userId: user?.id || "",
        role: "assistant",
        content: `I've created a recipe for you: ${recipe.title}`,
        timestamp: new Date(),
        metadata: JSON.stringify({ recipeId: recipe.id }),
        attachments: [],
      };
      setMessages((prev) => [...prev, recipeMessage]);
    }
  };

  const handleSendMessage = async (content: string, attachments?: Array<{
    type: 'image' | 'audio' | 'file';
    url: string;
    name?: string;
    size?: number;
    mimeType?: string;
  }>) => {
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      userId: user?.id || "",
      role: "user",
      content,
      timestamp: new Date(),
      metadata: null,
      attachments: attachments || [],
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingContent("");

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: content,
          attachments: attachments 
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

      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              const aiMessage: ChatMessageType = {
                id: (Date.now() + 1).toString(),
                userId: user?.id || "",
                role: "assistant",
                content: accumulated,
                timestamp: new Date(),
                metadata: null,
                attachments: [],
              };
              setMessages((prev) => [...prev, aiMessage]);
              setStreamingContent("");
              setIsStreaming(false);
              abortControllerRef.current = null;
              
              // Invalidate chat messages query to refetch with saved messages
              await queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulated += parsed.content;
                setStreamingContent(accumulated);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Chat stream aborted');
        abortControllerRef.current = null;
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setIsStreaming(false);
      setStreamingContent("");
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border p-4 bg-gradient-to-r from-lime-950/50 to-green-50/30 dark:from-lime-50/20 dark:to-green-950/20 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Chat with Chef</h2>
            <p className="text-sm text-muted-foreground">Get recipe suggestions and manage your inventory</p>
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
            <RecipeCustomizationDialog onRecipeGenerated={handleRecipeGenerated} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gradient-to-br from-lime-950/50 to-green-50/30 dark:from-lime-50/20 dark:to-green-950/20">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-6">
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
                  timestamp={new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                >
                  <>
                    {message.metadata && message.metadata.includes("recipeId") && generatedRecipe && (
                      <RecipeCard
                        id={generatedRecipe.id}
                        title={generatedRecipe.title}
                        prepTime={generatedRecipe.prepTime || undefined}
                        cookTime={generatedRecipe.cookTime || undefined}
                        servings={generatedRecipe.servings || undefined}
                        ingredients={generatedRecipe.ingredients}
                        instructions={generatedRecipe.instructions}
                        usedIngredients={generatedRecipe.usedIngredients}
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

      <div  className="shadow-2xl">
        <ChatInput onSend={handleSendMessage} disabled={isStreaming} showFeedbackWidget={true} />
      </div>
    </div>
  );
}
