import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface VoiceConversationOptions {
  onTranscript?: (text: string) => void;
  onSendMessage?: (text: string) => void;
  autoSend?: boolean;
  silenceTimeout?: number;
  locale?: string;
}

export interface VoiceState {
  isVoiceMode: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  currentTranscript: string;
}

export function useVoiceConversation(options: VoiceConversationOptions = {}) {
  const {
    onTranscript,
    onSendMessage,
    autoSend = true,
    silenceTimeout = 2000,
    locale = 'en-US'
  } = options;

  const { toast } = useToast();
  
  // Voice state
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isVoiceMode: false,
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    currentTranscript: ''
  });

  // Speech synthesis state
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [speechVolume, setSpeechVolume] = useState(1.0);

  // Refs for speech APIs
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const isStoppingRef = useRef(false);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
      
      // Try to select a natural-sounding English voice
      if (!selectedVoice && availableVoices.length > 0) {
        const preferredVoice = availableVoices.find(voice => 
          voice.lang.startsWith('en') && voice.name.includes('Natural')
        ) || availableVoices.find(voice => 
          voice.lang.startsWith('en')
        ) || availableVoices[0];
        
        setSelectedVoice(preferredVoice);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoice]);

  // Initialize speech recognition
  const initializeRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || 
                              (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: "Voice not supported",
        description: "Speech recognition is not supported in your browser. Please use Chrome or Edge.",
        variant: "destructive",
      });
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = locale;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setVoiceState(prev => ({ ...prev, isListening: true }));
      finalTranscriptRef.current = '';
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        finalTranscriptRef.current += finalTranscript;
        setVoiceState(prev => ({ 
          ...prev, 
          currentTranscript: finalTranscriptRef.current + interimTranscript 
        }));
        
        if (onTranscript) {
          onTranscript(finalTranscriptRef.current);
        }

        // Reset silence timer for auto-send
        if (autoSend && !isStoppingRef.current) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          silenceTimerRef.current = setTimeout(() => {
            handleAutoSend();
          }, silenceTimeout);
        }
      } else {
        setVoiceState(prev => ({ 
          ...prev, 
          currentTranscript: finalTranscriptRef.current + interimTranscript 
        }));
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      if (event.error === 'network') {
        // Network error - common in Replit environment
        toast({
          title: "Voice recognition unavailable",
          description: "Voice input isn't available in this environment. Try opening your app in a new browser tab or using it locally.",
          variant: "destructive",
        });
        setVoiceState(prev => ({ 
          ...prev, 
          isVoiceMode: false, 
          isListening: false 
        }));
        return;
      }
      
      if (event.error === 'no-speech') {
        // This is normal, just restart if in voice mode
        if (voiceState.isVoiceMode && !isStoppingRef.current) {
          setTimeout(() => {
            if (recognitionRef.current && voiceState.isVoiceMode) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.log('Recognition already started');
              }
            }
          }, 100);
        }
      } else if (event.error === 'not-allowed') {
        toast({
          title: "Microphone access denied",
          description: "Please allow microphone access and try again.",
          variant: "destructive",
        });
        setVoiceState(prev => ({ 
          ...prev, 
          isVoiceMode: false, 
          isListening: false 
        }));
      } else {
        toast({
          title: "Voice recognition error",
          description: `Error: ${event.error}`,
          variant: "destructive",
        });
      }
    };

    recognition.onend = () => {
      setVoiceState(prev => ({ ...prev, isListening: false }));
      
      // Restart if in voice mode and not manually stopping
      if (voiceState.isVoiceMode && !voiceState.isSpeaking && !isStoppingRef.current) {
        setTimeout(() => {
          if (recognitionRef.current && voiceState.isVoiceMode) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.log('Recognition already started');
            }
          }
        }, 100);
      }
    };

    return recognition;
  }, [locale, toast, onTranscript, autoSend, silenceTimeout, voiceState.isVoiceMode, voiceState.isSpeaking]);

  // Handle auto-send when silence detected
  const handleAutoSend = useCallback(() => {
    const transcript = finalTranscriptRef.current.trim();
    if (transcript && onSendMessage) {
      // Stop listening temporarily
      if (recognitionRef.current) {
        isStoppingRef.current = true;
        recognitionRef.current.stop();
      }
      
      setVoiceState(prev => ({ 
        ...prev, 
        isProcessing: true,
        currentTranscript: ''
      }));
      
      onSendMessage(transcript);
      finalTranscriptRef.current = '';
      
      // Will restart listening after response is spoken
      setTimeout(() => {
        isStoppingRef.current = false;
      }, 500);
    }
  }, [onSendMessage]);

  // Start voice mode
  const startVoiceMode = useCallback(() => {
    if (!recognitionRef.current) {
      recognitionRef.current = initializeRecognition();
    }
    
    if (recognitionRef.current) {
      setVoiceState(prev => ({ ...prev, isVoiceMode: true }));
      isStoppingRef.current = false;
      
      try {
        recognitionRef.current.start();
        toast({
          title: "Voice mode activated",
          description: "Start speaking. I'll listen and respond automatically.",
        });
      } catch (error) {
        console.error('Failed to start recognition:', error);
      }
    }
  }, [initializeRecognition, toast]);

  // Stop voice mode
  const stopVoiceMode = useCallback(() => {
    isStoppingRef.current = true;
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    setVoiceState({
      isVoiceMode: false,
      isListening: false,
      isSpeaking: false,
      isProcessing: false,
      currentTranscript: ''
    });
    
    finalTranscriptRef.current = '';
  }, []);

  // Toggle voice mode
  const toggleVoiceMode = useCallback(() => {
    if (voiceState.isVoiceMode) {
      stopVoiceMode();
    } else {
      startVoiceMode();
    }
  }, [voiceState.isVoiceMode, startVoiceMode, stopVoiceMode]);

  // Speak text using text-to-speech
  const speak = useCallback((text: string, options: { 
    onEnd?: () => void,
    onStart?: () => void 
  } = {}) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = speechVolume;
    utterance.lang = locale;
    
    utterance.onstart = () => {
      setVoiceState(prev => ({ ...prev, isSpeaking: true }));
      // Pause recognition while speaking
      if (recognitionRef.current && voiceState.isListening) {
        recognitionRef.current.stop();
      }
      options.onStart?.();
    };
    
    utterance.onend = () => {
      setVoiceState(prev => ({ 
        ...prev, 
        isSpeaking: false,
        isProcessing: false 
      }));
      
      // Resume listening if in voice mode
      if (voiceState.isVoiceMode && !isStoppingRef.current) {
        setTimeout(() => {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.log('Recognition already started');
            }
          }
        }, 500);
      }
      
      options.onEnd?.();
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setVoiceState(prev => ({ 
        ...prev, 
        isSpeaking: false,
        isProcessing: false 
      }));
    };
    
    synthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [selectedVoice, speechRate, speechPitch, speechVolume, locale, voiceState.isVoiceMode, voiceState.isListening]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setVoiceState(prev => ({ ...prev, isSpeaking: false }));
  }, []);

  // Manual transcript send
  const sendTranscript = useCallback(() => {
    const transcript = finalTranscriptRef.current.trim();
    if (transcript && onSendMessage) {
      onSendMessage(transcript);
      finalTranscriptRef.current = '';
      setVoiceState(prev => ({ ...prev, currentTranscript: '' }));
    }
  }, [onSendMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  return {
    // State
    voiceState,
    voices,
    selectedVoice,
    speechRate,
    speechPitch,
    speechVolume,
    
    // Actions
    toggleVoiceMode,
    startVoiceMode,
    stopVoiceMode,
    speak,
    stopSpeaking,
    sendTranscript,
    
    // Settings
    setSelectedVoice,
    setSpeechRate,
    setSpeechPitch,
    setSpeechVolume,
  };
}