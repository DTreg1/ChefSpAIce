import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Camera, X, Mic, MicOff, Volume2, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { VoiceState } from "@/hooks/useVoiceConversation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface Attachment {
  type: 'image' | 'audio' | 'file';
  url: string;
  name?: string;
  size?: number;
  mimeType?: string;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: Attachment[]) => void;
  disabled?: boolean;
  showFeedbackWidget?: boolean;
  voiceState?: VoiceState;
  voiceTranscript?: string;
  onVoiceModeToggle?: () => void;
  onStopSpeaking?: () => void;
  voices?: SpeechSynthesisVoice[];
  selectedVoice?: SpeechSynthesisVoice | null;
  onVoiceChange?: (voice: SpeechSynthesisVoice) => void;
  speechRate?: number;
  onSpeechRateChange?: (rate: number) => void;
  speechPitch?: number;
  onSpeechPitchChange?: (pitch: number) => void;
}

export function ChatInput({ 
  onSend, 
  disabled = false,
  voiceState,
  voiceTranscript,
  onVoiceModeToggle,
  onStopSpeaking,
  voices = [],
  selectedVoice,
  onVoiceChange,
  speechRate = 1,
  onSpeechRateChange,
  speechPitch = 1,
  onSpeechPitchChange
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Update message with voice transcript when in voice mode
  useEffect(() => {
    if (voiceState?.isVoiceMode && voiceTranscript) {
      setMessage(voiceTranscript);
    }
  }, [voiceTranscript, voiceState?.isVoiceMode]);
  
  // Check if voice input is broken (network error)
  const isVoiceInputBroken = voiceState?.isVoiceMode && !voiceState?.isListening;

  const handleSend = () => {
    if ((message.trim() || attachments.length > 0) && !disabled && !isUploading) {
      onSend(message.trim(), attachments.length > 0 ? attachments : undefined);
      setMessage("");
      setAttachments([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const uploadFile = async (file: File): Promise<Attachment | null> => {
    try {
      // Get upload URL from backend
      const uploadUrlResponse = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!uploadUrlResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadURL } = await uploadUrlResponse.json();

      // Upload file directly to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      // Create object path
      const objectPath = `/objects/uploads/${uploadURL.split('/').pop()}`;

      // Determine attachment type
      let type: 'image' | 'audio' | 'file' = 'file';
      if (file.type.startsWith('image/')) {
        type = 'image';
      } else if (file.type.startsWith('audio/')) {
        type = 'audio';
      }

      return {
        type,
        url: objectPath,
        name: file.name,
        size: file.size,
        mimeType: file.type,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = files.map(uploadFile);
      const uploadedAttachments = await Promise.all(uploadPromises);
      const successfulAttachments = uploadedAttachments.filter((a): a is Attachment => a !== null);
      
      if (successfulAttachments.length > 0) {
        setAttachments(prev => [...prev, ...successfulAttachments]);
        toast({
          title: "Files uploaded",
          description: `Successfully uploaded ${successfulAttachments.length} file(s)`,
        });
      }
    } catch (error) {
      console.error('Error handling file selection:', error);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Get voice mode status
  const isVoiceMode = voiceState?.isVoiceMode || false;
  const isListening = voiceState?.isListening || false;
  const isSpeaking = voiceState?.isSpeaking || false;
  const isProcessing = voiceState?.isProcessing || false;

  return (
    <div className="border-t border-border bg-gradient-to-br p-4">
      {/* Voice Mode Status Bar */}
      {isVoiceMode && (
        <div className="max-w-4xl mx-auto mb-3 flex items-center justify-between bg-accent/50 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            {isListening && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Listening...</span>
              </div>
            )}
            {isSpeaking && (
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-green-500 animate-pulse" />
                <span className="text-sm font-medium">Speaking...</span>
              </div>
            )}
            {isProcessing && !isSpeaking && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium">Processing...</span>
              </div>
            )}
            {!isListening && !isSpeaking && !isProcessing && (
              <span className="text-sm text-muted-foreground">Voice mode active - Start speaking</span>
            )}
          </div>
          {isSpeaking && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onStopSpeaking}
              data-testid="button-stop-speaking"
            >
              Stop Speaking
            </Button>
          )}
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.txt"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      {/* Show attachments preview if any */}
      {attachments.length > 0 && (
        <div className="max-w-4xl mx-auto mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-lg px-3 py-2 flex items-center gap-2"
              data-testid={`attachment-preview-${index}`}
            >
              {attachment.type === 'image' ? (
                <img src={attachment.url} alt={attachment.name} className="w-10 h-10 object-cover rounded" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
              <span className="text-sm truncate max-w-[150px]">{attachment.name}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeAttachment(index)}
                className="h-6 w-6"
                data-testid={`button-remove-attachment-${index}`}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      <div className="max-w-4xl mx-auto flex gap-2">
        <div className="flex flex-col gap-2 flex-shrink-0 pt-2">
          {/* Attachment button */}
          <Button
            size="icon"
            variant="outline"
            className="flex-shrink-0 rounded-full w-10 h-10"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            data-testid="button-attach"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          {/* Camera button */}
          <Button
            size="icon"
            variant="outline"
            className="flex-shrink-0 rounded-full w-10 h-10"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled || isUploading}
            data-testid="button-camera"
          >
            <Camera className="w-5 h-5" />
          </Button>
        </div>
        
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isVoiceMode && isListening 
              ? "Listening... speak now" 
              : isVoiceMode
              ? "Type your message (AI will speak response)..." 
              : "Ask your ChefSpAIce anything... (e.g., 'What can I make with chicken?', 'Add eggs to my fridge')"
          }
          className="resize-y text-sm min-h-[100px] max-h-[300px]"
          disabled={disabled || (isVoiceMode && isListening)}
          data-testid="input-chat-message"
        />
        
        <div className="flex flex-col gap-2 flex-shrink-0 pt-2">
          {/* Send button */}
          <Button
            size="icon"
            onClick={handleSend}
            disabled={(!message.trim() && attachments.length === 0) || disabled || isUploading || (isVoiceMode && isListening)}
            className="flex-shrink-0 rounded-full w-10 h-10"
            data-testid="button-send-message"
          >
            <Send className="w-5 h-5" />
          </Button>

          {/* Voice Mode Toggle Button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="icon"
                variant={isVoiceMode ? "default" : "outline"}
                className={`flex-shrink-0 rounded-full w-10 h-10 ${isListening ? 'animate-pulse' : ''}`}
                onClick={onVoiceModeToggle}
                disabled={disabled || isUploading}
                data-testid="button-voice-mode"
              >
                {isVoiceMode ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>
            </PopoverTrigger>
            {!isVoiceMode && (
              <PopoverContent className="w-80" side="top">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Voice Mode Tips</h4>
                  <p className="text-xs text-muted-foreground">
                    Voice recognition may not work in the Replit editor due to browser limitations. 
                    For the best experience:
                  </p>
                  <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                    <li>Open your app in a new browser tab</li>
                    <li>Or use the app locally on your computer</li>
                    <li>Make sure you're using Chrome or Edge</li>
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    Text-to-speech for AI responses will still work!
                  </p>
                </div>
              </PopoverContent>
            )}
          </Popover>
        </div>
      </div>
    </div>
  );
}