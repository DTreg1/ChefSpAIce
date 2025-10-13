import { ChefHat, User } from "lucide-react";
import { cn } from "@/lib/utils";
import DOMPurify from "isomorphic-dompurify";

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  children?: React.ReactNode;
}

export function ChatMessage({ role, content, timestamp, children }: ChatMessageProps) {
  const isUser = role === "user";
  const isSystem = role === "system";

  if (isSystem) {
    return (
      <div className="flex justify-center my-6" data-testid="message-system">
        <div 
          className="border-2 border-border rounded-xl px-4 py-2 text-sm text-muted-foreground max-w-md text-center"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      data-testid={`message-${role}`}
    >
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser ? "bg-primary" : "bg-accent"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" />
        ) : (
          <ChefHat className="w-4 h-4 text-accent-foreground" />
        )}
      </div>

      <div className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start", "max-w-2xl")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-accent text-foreground"
          )}
          style={{ borderRadius: "var(--radius)" }}
        >
          <p 
            className="text-base leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
          />
        </div>

        {children && (
          <div className="w-full mt-1">
            {children}
          </div>
        )}

        {timestamp && (
          <span className="text-xs text-muted-foreground mt-1" data-testid="text-timestamp">
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}
