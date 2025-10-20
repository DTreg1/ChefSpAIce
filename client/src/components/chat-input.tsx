import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, AudioLines, Camera, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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

  // Voice recognition state and functions
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startVoiceRecognition = () => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: "Not supported",
        description: "Voice recognition is not supported in your browser. Please use Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        toast({
          title: "Listening...",
          description: "Speak now. Click the audio button again to stop.",
        });
      };

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setMessage((prev) => prev + finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        toast({
          title: "Voice recognition error",
          description: event.error === 'not-allowed' 
            ? "Microphone access denied. Please allow microphone access and try again."
            : `Error: ${event.error}`,
          variant: "destructive",
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
    }
  };

  // Cleanup speech recognition on unmount
  const stopVoiceRecognition = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return (
    <div className="border-t border-border bg-gradient-to-br p-4">
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
          {/* New button for attaching files */}
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
          {/* New button for taking photos */}
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
          placeholder="Ask your ChefSpAIce anything... (e.g., 'What can I make with chicken?', 'Add eggs to my fridge')"
          className="resize-y text-sm min-h-[100px] max-h-[300px]"
          disabled={disabled}
          data-testid="input-chat-message"
        />
        <div className="flex flex-col gap-2 flex-shrink-0 pt-2">
          <Button
            size="icon"
            onClick={handleSend}
            disabled={(!message.trim() && attachments.length === 0) || disabled || isUploading}
            className="flex-shrink-0 rounded-full w-10 h-10"
            data-testid="button-send-message"
          >
            <Send className="w-5 h-5" />
          </Button>

          {/* New button for audio input */}
          <Button
            size="icon"
            variant={isListening ? "default" : "outline"}
            className={`flex-shrink-0 rounded-full w-10 h-10 ${isListening ? 'animate-pulse' : ''}`}
            onClick={startVoiceRecognition}
            disabled={disabled || isUploading}
            data-testid="button-voice-input"
          >
            <AudioLines className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
