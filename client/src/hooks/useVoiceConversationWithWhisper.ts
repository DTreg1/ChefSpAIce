import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useWhisperRecognition } from '@/hooks/useWhisperRecognition';

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
  isModelLoading: boolean;
  modelLoadingProgress: number;
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
  
  // Use Whisper for speech recognition
  const whisper = useWhisperRecognition({
    language: locale.startsWith('en') ? 'en' : locale.split('-')[0],
    chunkDuration: 3,
    onTranscript: (transcript) => {
      setVoiceState(prev => ({ 
        ...prev, 
        currentTranscript: transcript 
      }));
      
      if (onTranscript) {
        onTranscript(transcript);
      }
      
      // Reset silence timer for auto-send
      if (autoSend) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        
        silenceTimerRef.current = setTimeout(() => {
          handleAutoSend();
        }, silenceTimeout);
      }
    },
    onPartialTranscript: (partial) => {
      // Update current transcript with partial results for immediate feedback
      console.log('Partial transcript:', partial);
    }
  });
  
  // Voice state combining Whisper state
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isVoiceMode: false,
    isListening: false,
    isSpeaking: false,
    isProcessing: false,
    currentTranscript: '',
    isModelLoading: false,
    modelLoadingProgress: 0
  });

  // Update voice state based on Whisper state
  useEffect(() => {
    setVoiceState(prev => ({
      ...prev,
      isListening: whisper.isListening,
      isProcessing: whisper.isProcessing,
      isModelLoading: whisper.isLoading,
      modelLoadingProgress: whisper.loadingProgress,
      currentTranscript: whisper.currentTranscript
    }));
  }, [whisper.isListening, whisper.isProcessing, whisper.isLoading, whisper.loadingProgress, whisper.currentTranscript]);

  // Speech synthesis state
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [speechVolume, setSpeechVolume] = useState(1.0);

  // Refs
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef<string>('');

  // Load available voices for text-to-speech
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

  // Handle auto-send when silence detected
  const handleAutoSend = useCallback(() => {
    const transcript = whisper.currentTranscript.trim();
    if (transcript && onSendMessage) {
      // Stop listening temporarily
      whisper.stopListening();
      
      setVoiceState(prev => ({ 
        ...prev, 
        isProcessing: true,
        currentTranscript: ''
      }));
      
      onSendMessage(transcript);
      whisper.clearTranscript();
      finalTranscriptRef.current = '';
      
      // Restart listening after a short delay
      setTimeout(() => {
        if (voiceState.isVoiceMode) {
          whisper.startListening();
        }
        setVoiceState(prev => ({ ...prev, isProcessing: false }));
      }, 500);
    }
  }, [whisper, onSendMessage, voiceState.isVoiceMode]);

  // Toggle voice mode
  const toggleVoiceMode = useCallback(async () => {
    const newMode = !voiceState.isVoiceMode;
    
    if (newMode) {
      // Entering voice mode
      console.log('Entering voice mode with Whisper');
      
      // Check if model is loaded
      if (!whisper.modelLoaded) {
        toast({
          title: "Loading voice model",
          description: "Please wait while the voice recognition model loads. This only happens once.",
        });
      }
      
      setVoiceState(prev => ({ 
        ...prev, 
        isVoiceMode: true,
        currentTranscript: ''
      }));
      
      // Start listening
      await whisper.startListening();
    } else {
      // Exiting voice mode
      console.log('Exiting voice mode');
      whisper.stopListening();
      stopSpeaking();
      
      setVoiceState(prev => ({ 
        ...prev, 
        isVoiceMode: false,
        isListening: false,
        isSpeaking: false,
        currentTranscript: ''
      }));
      
      // Clear timers
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
  }, [voiceState.isVoiceMode, whisper, toast]);

  // Speak text using Web Speech API
  const speak = useCallback((text: string) => {
    if (!text || !voiceState.isVoiceMode) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    // Stop listening while speaking (to avoid feedback)
    if (whisper.isListening) {
      whisper.stopListening();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice;
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = speechVolume;
    
    utterance.onstart = () => {
      setVoiceState(prev => ({ ...prev, isSpeaking: true }));
    };
    
    utterance.onend = () => {
      setVoiceState(prev => ({ ...prev, isSpeaking: false }));
      
      // Resume listening after speaking
      if (voiceState.isVoiceMode) {
        setTimeout(() => {
          whisper.startListening();
        }, 300);
      }
    };
    
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setVoiceState(prev => ({ ...prev, isSpeaking: false }));
      
      // Resume listening even on error
      if (voiceState.isVoiceMode) {
        whisper.startListening();
      }
    };
    
    synthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [voiceState.isVoiceMode, selectedVoice, speechRate, speechPitch, speechVolume, whisper]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setVoiceState(prev => ({ ...prev, isSpeaking: false }));
    
    // Resume listening if in voice mode
    if (voiceState.isVoiceMode && !whisper.isListening) {
      setTimeout(() => {
        whisper.startListening();
      }, 300);
    }
  }, [voiceState.isVoiceMode, whisper]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      whisper.stopListening();
      window.speechSynthesis.cancel();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Voice state
    voiceState,
    
    // Voice transcript
    voiceTranscript: voiceState.currentTranscript,
    
    // Voice mode controls
    toggleVoiceMode,
    
    // Speech synthesis
    speak,
    stopSpeaking,
    
    // Voice selection
    voices,
    selectedVoice,
    setSelectedVoice,
    
    // Speech settings
    speechRate,
    setSpeechRate,
    speechPitch,
    setSpeechPitch,
    speechVolume,
    setSpeechVolume,
    
    // Whisper model state
    modelLoaded: whisper.modelLoaded,
    modelLoadingProgress: whisper.loadingProgress,
  };
}