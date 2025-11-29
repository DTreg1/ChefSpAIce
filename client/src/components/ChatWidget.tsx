import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChatInterface } from "./ChatInterface";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";


interface ChatWidgetProps {
  mode?: "floating" | "inline";
}

export function ChatWidget({ mode = "floating" }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [location] = useLocation();

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };
  const isOnChatPage = location === "/" || location.startsWith("/chat");

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <Button
          onClick={toggleChat}
          className={cn(
            "fixed bottom-48 right-6 rounded-full w-14 h-14 shadow-lg z-50",
            mode === "floating" &&
              (isOnChatPage ? "bottom-48 right-6" : "bottom-6 right-6"),
            )}
          size="icon"
          data-testid="button-chat-widget-toggle"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card
          className={cn(
            "fixed bottom-4 right-4 w-96 h-[600px] shadow-xl z-50",
            "flex flex-col",
            "animate-in fade-in slide-in-from-bottom-5 duration-300",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h3 className="font-semibold">AI Assistant</h3>
              <p className="text-xs text-muted-foreground">Ask me anything</p>
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

          {/* Chat Interface */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              conversationId={conversationId}
              onNewConversation={setConversationId}
            />
          </div>
        </Card>
      )}
    </>
  );
}
