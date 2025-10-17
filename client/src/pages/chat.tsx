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
    const firstInitial = firstName ? firstName.charAt(0) : "";
    const lastInitial = lastName ? lastName.charAt(0) : "";
    return `${firstInitial}${lastInitial}`.toUpperCase();
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
      // Safely abort any ongoing request on unmount
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
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
      };
      setMessages((prev) => [...prev, recipeMessage]);
    }
  };

  const handleSendMessage = async (content: string, retryCount = 0) => {
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      userId: user?.id || "",
      role: "user",
      content,
      timestamp: new Date(),
      metadata: null,
    };

    // Only add user message on first attempt
    if (retryCount === 0) {
      setMessages((prev) => [...prev, userMessage]);
    }
    
    setIsStreaming(true);
    setStreamingContent("");
    
    // Track accumulated content separately to prevent loss on error
    let accumulatedContent = "";

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Set timeout for streaming (15 seconds - matches stall detection)
    const timeoutId = setTimeout(() => {
      if (abortController && !abortController.signal.aborted) {
        try {
          abortController.abort();
          abortControllerRef.current = null;
          
          // Save any accumulated content before aborting
          if (accumulatedContent) {
            const partialMessage: ChatMessageType = {
              id: (Date.now() + 1).toString(),
              userId: user?.id || "",
              role: "assistant",
              content: accumulatedContent + "\n\n[Response interrupted due to timeout]",
              timestamp: new Date(),
              metadata: null,
            };
            setMessages((prev) => [...prev, partialMessage]);
            setStreamingContent("");
          }
          
          toast({
            title: "Connection Timeout",
            description: "The response took too long. Partial response has been saved.",
            variant: "destructive",
          });
        } catch (error) {
          console.error("Error during timeout abort:", error);
        }
      }
    }, 15000); // 15 seconds timeout

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Server error: ${response.status}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          if (errorText) {
            errorMessage = errorText.substring(0, 200);
          }
        }
        
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body received from server");
      }

      // Use the accumulatedContent variable declared above
      let buffer = ""; // Buffer for incomplete lines
      let lastActivityTime = Date.now();
      let hasReceivedData = false; // Track if we've received any data
      let stallWarningShown = false; // Track if we've shown the stall warning
      
      // Monitor for stalled streams with improved detection
      const stallCheckInterval = setInterval(() => {
        const timeSinceLastActivity = Date.now() - lastActivityTime;
        
        // Show warning after 10 seconds, abort after 15 seconds
        if (timeSinceLastActivity > 10000 && !stallWarningShown && hasReceivedData) {
          stallWarningShown = true;
          toast({
            title: "Slow Connection",
            description: "Response is taking longer than usual...",
            variant: "default",
          });
        }
        
        if (timeSinceLastActivity > 15000) { // 15 seconds of no activity (reduced from 30)
          clearInterval(stallCheckInterval);
          if (!abortController.signal.aborted) {
            try {
              abortController.abort();
              abortControllerRef.current = null;
              
              // Save partial content if available
              if (accumulatedContent) {
                const partialMessage: ChatMessageType = {
                  id: (Date.now() + 1).toString(),
                  userId: user?.id || "",
                  role: "assistant",
                  content: accumulatedContent + "\n\n[Stream interrupted - partial response saved]",
                  timestamp: new Date(),
                  metadata: null,
                };
                setMessages((prev) => [...prev, partialMessage]);
                setStreamingContent("");
                setIsStreaming(false);
                
                toast({
                  title: "Connection Timeout",
                  description: "Response saved. You can continue the conversation.",
                  variant: "default",
                });
              } else {
                setIsStreaming(false);
                toast({
                  title: "Connection Timeout",
                  description: "Stream stopped responding. Please try again.",
                  variant: "destructive",
                });
              }
            } catch (error) {
              console.error("Error during stall abort:", error);
              setIsStreaming(false);
            }
          }
        }
      }, 2000); // Check more frequently (every 2 seconds instead of 5)

      try {
        while (true) {
          let result;
          try {
            result = await reader.read();
          } catch (readError: any) {
            console.error("Error reading from stream:", readError);
            clearInterval(stallCheckInterval);
            
            // If we have accumulated content, save it before erroring
            if (accumulatedContent && !abortController.signal.aborted) {
              const aiMessage: ChatMessageType = {
                id: (Date.now() + 1).toString(),
                userId: user?.id || "",
                role: "assistant",
                content: accumulatedContent,
                timestamp: new Date(),
                metadata: null,
              };
              setMessages((prev) => [...prev, aiMessage]);
              setStreamingContent("");
              setIsStreaming(false);
              await queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
            }
            
            throw new Error(`Stream read error: ${readError.message || 'Unknown error'}`);
          }
          
          const { done, value } = result;
          
          if (done) {
            clearInterval(stallCheckInterval);
            
            // Process any remaining buffer content
            if (buffer.trim() && buffer.startsWith("data: ")) {
              const data = buffer.slice(6).trim();
              if (data && data !== "[DONE]") {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content) {
                    accumulatedContent += parsed.content;
                  }
                } catch (e) {
                  console.warn("Failed to parse final buffer data:", data);
                }
              }
            }
            
            // Handle case where stream ended without [DONE] marker
            if (accumulatedContent && !abortController.signal.aborted) {
              const aiMessage: ChatMessageType = {
                id: (Date.now() + 1).toString(),
                userId: user?.id || "",
                role: "assistant",
                content: accumulatedContent,
                timestamp: new Date(),
                metadata: null,
              };
              setMessages((prev) => [...prev, aiMessage]);
              setStreamingContent("");
              setIsStreaming(false);
              
              // Invalidate chat messages query to refetch with saved messages
              await queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
            }
            break;
          }

          if (!value) {
            console.warn("Received empty chunk from stream");
            continue;
          }

          lastActivityTime = Date.now();
          hasReceivedData = true;
          
          let chunk;
          try {
            chunk = decoder.decode(value, { stream: true });
          } catch (decodeError: any) {
            console.error("Error decoding chunk:", decodeError);
            // If we can't decode, but have accumulated content, save it
            if (accumulatedContent && retryCount === 0) {
              const partialMessage: ChatMessageType = {
                id: (Date.now() + 1).toString(),
                userId: user?.id || "",
                role: "assistant",
                content: accumulatedContent + "\n\n[Decoding error - partial response saved]",
                timestamp: new Date(),
                metadata: null,
              };
              setMessages((prev) => [...prev, partialMessage]);
            }
            continue; // Skip this chunk but continue processing
          }
          
          // Combine with buffer from previous incomplete chunk
          const fullChunk = buffer + chunk;
          const lines = fullChunk.split("\n");
          
          // Keep last line in buffer if it's incomplete (and not empty)
          buffer = lines.length > 1 ? lines[lines.length - 1] : "";
          const completeLines = lines.slice(0, -1);

          for (const line of completeLines) {
            if (!line.trim()) continue; // Skip empty lines
            
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
              
              if (data === "[DONE]") {
                clearInterval(stallCheckInterval);
                const aiMessage: ChatMessageType = {
                  id: (Date.now() + 1).toString(),
                  userId: user?.id || "",
                  role: "assistant",
                  content: accumulatedContent || "I apologize, but I couldn't generate a response. Please try again.",
                  timestamp: new Date(),
                  metadata: null,
                };
                setMessages((prev) => [...prev, aiMessage]);
                setStreamingContent("");
                setIsStreaming(false);
                abortControllerRef.current = null;
                
                // Invalidate chat messages query to refetch with saved messages
                await queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
                return;
              }

              if (data && data.startsWith("{") && data.endsWith("}")) {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content !== undefined && parsed.content !== null) {
                    accumulatedContent += parsed.content;
                    setStreamingContent(accumulatedContent);
                  } else if (parsed.error) {
                    // Handle error messages in stream
                    console.error("Stream error:", parsed.error);
                    throw new Error(parsed.error);
                  }
                } catch (parseError: any) {
                  // Only log if it looks like JSON but failed to parse
                  if (data.includes('"') || data.includes("{")) {
                    console.warn("Failed to parse SSE data:", data, parseError);
                  }
                  // Continue processing other lines
                }
              }
            }
          }
        }
      } finally {
        clearInterval(stallCheckInterval);
      }
      
      abortControllerRef.current = null;
    } catch (error: any) {
      clearTimeout(timeoutId);
      setIsStreaming(false);
      setStreamingContent("");
      abortControllerRef.current = null;
      
      if (error.name === 'AbortError') {
        console.log('Chat stream aborted by user or timeout');
        return;
      }
      
      // Retry logic for network errors
      if (retryCount < 2 && (error.message.includes('fetch') || error.message.includes('network'))) {
        toast({
          title: "Connection Error",
          description: `Retrying... (${retryCount + 1}/2)`,
          variant: "default",
        });
        
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        return handleSendMessage(content, retryCount + 1);
      }
      
      // Show specific error messages
      let errorTitle = "Error";
      let errorDescription = "Failed to send message. Please try again.";
      
      if (error.message.includes('network') || error.message.includes('fetch')) {
        errorTitle = "Network Error";
        errorDescription = "Unable to connect to the server. Please check your connection.";
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorTitle = "Authentication Error";
        errorDescription = "Your session has expired. Please refresh the page to log in again.";
      } else if (error.message.includes('500') || error.message.includes('Internal')) {
        errorTitle = "Server Error";
        errorDescription = "The server encountered an error. Please try again later.";
      } else if (error.message) {
        errorDescription = error.message.substring(0, 200);
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
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
