import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, AudioLines, Camera } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  showFeedbackWidget?: boolean;
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
    <div className="border-t border-border bg-gradient-to-br p-4">
      <div className="max-w-4xl mx-auto flex gap-2">
        <div className="flex flex-col gap-2 flex-shrink-0 pt-2">
          {/* New button for attaching files */}
          <Button
            size="icon"
            variant="outline"
            className="flex-shrink-0 rounded-full w-10 h-10"
            data-testid="button-attach"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          {/* New button for taking photos */}
          <Button
            size="icon"
            variant="outline"
            className="flex-shrink-0 rounded-full w-10 h-10"
            data-testid="button-attach"
          >
            <Camera className="w-5 h-5" />
          </Button>
        </div>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your ChefSpAIce anything... (e.g., 'What can I make with chicken?', 'Add eggs to my fridge')"
          className="resize-y text-sm min-h-[100px] max-h-[300px]"
          disabled={disabled}
          data-testid="input-chat-message"
        />
        <div className="flex flex-col gap-2 flex-shrink-0 pt-2">
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            className="flex-shrink-0 rounded-full w-10 h-10"
            data-testid="button-send-message"
          >
            <Send className="w-5 h-5" />
          </Button>

          {/* New button for audio input */}
          <Button
            size="icon"
            variant="outline"
            className="flex-shrink-0 rounded-full w-10 h-10"
            data-testid="button-attach"
          >
            <AudioLines className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
