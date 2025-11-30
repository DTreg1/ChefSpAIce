import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface VoiceButtonProps {
  onTranscript: (transcript: string) => void;
  onCommand?: (command: any) => void;
  className?: string;
}

export function VoiceButton({ onTranscript, onCommand, className }: VoiceButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const { toast } = useToast();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check for Web Speech API support
  const supportsWebSpeech = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    // Initialize Web Speech API if available
    if (supportsWebSpeech) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        
        if (event.results[0].isFinal) {
          onTranscript(transcript);
          processCommand(transcript);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setHasPermission(false);
        }
        toast({
          title: "Speech Recognition Error",
          description: "Failed to recognize speech. Please try again.",
          variant: "destructive"
        });
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setHasPermission(false);
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to use voice commands.",
        variant: "destructive"
      });
      return false;
    }
  };

  const startRecording = async () => {
    // Request permission if not already granted
    if (hasPermission === null || !hasPermission) {
      const granted = await requestMicrophonePermission();
      if (!granted) return;
    }

    setIsRecording(true);
    audioChunksRef.current = [];

    if (supportsWebSpeech && recognitionRef.current) {
      // Use Web Speech API for real-time transcription
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
      }
    }

    // Also record audio for Whisper API fallback
    if (!streamRef.current) {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'audio/webm'
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      // If Web Speech API didn't work, fall back to Whisper
      if (!supportsWebSpeech || !recognitionRef.current) {
        await transcribeWithWhisper();
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
  };

  const stopRecording = () => {
    setIsRecording(false);

    // Stop Web Speech API
    if (recognitionRef.current && supportsWebSpeech) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const transcribeWithWhisper = async () => {
    if (audioChunksRef.current.length === 0) return;

    setIsProcessing(true);
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    try {
      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await response.json();

      if (data.useWebSpeech) {
        // API key not available, already using Web Speech as fallback
        toast({
          title: "Using Browser Speech Recognition",
          description: "Whisper API not available, using browser's speech recognition.",
        });
      } else if (data.transcript) {
        onTranscript(data.transcript);
        await processCommand(data.transcript);
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: "Transcription Failed",
        description: "Failed to transcribe audio. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processCommand = async (transcript: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/voice/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.interpretation) {
        // Show feedback
        toast({
          title: "Voice Command",
          description: data.response || data.interpretation.actionTaken,
        });

        // Execute navigation if needed
        if (data.interpretation.navigationPath) {
          window.location.href = data.interpretation.navigationPath;
        }

        // Call the callback if provided
        if (onCommand) {
          onCommand(data);
        }
      }
    } catch (error) {
      console.error('Command processing error:', error);
      toast({
        title: "Command Processing Failed",
        description: "Failed to process voice command.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant={isRecording ? "destructive" : "outline"}
      size="icon"
      className={cn(
        "relative",
        isRecording && "animate-pulse",
        className
      )}
      disabled={isProcessing}
      data-testid="button-voice"
    >
      {isProcessing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isRecording ? (
        <>
          <MicOff className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </>
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}