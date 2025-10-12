import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChatMessage } from "@/components/chat-message";
import { ChatInput } from "@/components/chat-input";
import { EmptyState } from "@/components/empty-state";
import { RecipeCard } from "@/components/recipe-card";
import { RecipeGenerator } from "@/components/recipe-generator";
import { ExpirationAlert } from "@/components/expiration-alert";
import { LoadingDots } from "@/components/loading-dots";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { ChatMessage as ChatMessageType, Recipe } from "@shared/schema";

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: chatHistory } = useQuery<ChatMessageType[]>({
    queryKey: ["/api/chat/messages"],
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

  const handleRecipeGenerated = (recipe: Recipe) => {
    setGeneratedRecipe(recipe);
    const recipeMessage: ChatMessageType = {
      id: Date.now().toString(),
      userId: user?.id || "",
      role: "assistant",
      content: `I've created a recipe for you: ${recipe.title}`,
      timestamp: new Date(),
      metadata: JSON.stringify({ recipeId: recipe.id }),
    };
    setMessages((prev) => [...prev, recipeMessage]);
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      userId: user?.id || "",
      role: "user",
      content,
      timestamp: new Date(),
      metadata: null,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    setStreamingContent("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
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
              };
              setMessages((prev) => [...prev, aiMessage]);
              setStreamingContent("");
              setIsStreaming(false);
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
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Chat with AI Chef</h2>
            <p className="text-sm text-muted-foreground">Get recipe suggestions and manage your inventory</p>
          </div>
          <RecipeGenerator onRecipeGenerated={handleRecipeGenerated} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
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
                  timestamp={new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                >
                  {message.metadata && message.metadata.includes("recipeId") && generatedRecipe && (
                    <RecipeCard
                      title={generatedRecipe.title}
                      prepTime={generatedRecipe.prepTime || undefined}
                      cookTime={generatedRecipe.cookTime || undefined}
                      servings={generatedRecipe.servings || undefined}
                      ingredients={generatedRecipe.ingredients}
                      instructions={generatedRecipe.instructions}
                      usedIngredients={generatedRecipe.usedIngredients}
                      missingIngredients={generatedRecipe.missingIngredients || []}
                    />
                  )}
                </ChatMessage>
              ))}

              {isStreaming && streamingContent && (
                <ChatMessage
                  role="assistant"
                  content={streamingContent}
                />
              )}

              {isStreaming && !streamingContent && (
                <div className="flex gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <LoadingDots />
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

      <ChatInput onSend={handleSendMessage} disabled={isStreaming} />
    </div>
  );
}
