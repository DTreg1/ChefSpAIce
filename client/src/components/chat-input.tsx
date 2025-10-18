import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-background p-4">
      <div className="max-w-4xl mx-auto flex gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="flex-shrink-0"
          data-testid="button-attach"
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your AI Chef anything... (e.g., 'What can I make with chicken?', 'Add eggs to my fridge')"
          className="resize-none min-h-[60px] max-h-[120px] rounded-xl"
          disabled={disabled}
          data-testid="input-chat-message"
        />

        <Button
          size="icon"
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="flex-shrink-0 rounded-full w-12 h-12"
          data-testid="button-send-message"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
