import { ChefHat, User } from "lucide-react";
import { cn } from "@/lib/utils";
import DOMPurify from "isomorphic-dompurify";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { VoiceControls } from "@/components/voice-controls";
import { EnrichedContent } from "@/components/enriched-content";

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  children?: React.ReactNode;
  userProfileImageUrl?: string;
  userInitials?: string;
  autoPlayVoice?: boolean;
}

export function ChatMessage({
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

  if (isSystem) {
    return (
      <div className="flex justify-center my-6" data-testid="message-system">
        <div
          className="glass-subtle border-2 border-border/50 rounded-xl px-4 py-2 text-sm text-muted-foreground max-w-md text-center shadow-glass transition-morph"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
        />
      </div>
    );
  }

  return (
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
  );
}
