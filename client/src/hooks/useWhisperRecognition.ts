import { useState, useCallback, useRef, useEffect } from 'react';
import { pipeline, env } from '@xenova/transformers';
import { useToast } from '@/hooks/use-toast';

// Configure Transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.numThreads = 1;

interface WhisperState {
  isLoading: boolean;
  isListening: boolean;
  isProcessing: boolean;
  loadingProgress: number;
  currentTranscript: string;
  error: string | null;
}

interface UseWhisperRecognitionOptions {
  modelName?: string;
  language?: string;
  chunkDuration?: number; // seconds
  onTranscript?: (transcript: string) => void;
  onPartialTranscript?: (transcript: string) => void;
}

export function useWhisperRecognition(options: UseWhisperRecognitionOptions = {}) {
  const {
    modelName = 'Xenova/whisper-tiny.en',
    language = 'en',
    chunkDuration = 3, // 3 second chunks for real-time feel
    onTranscript,
    onPartialTranscript,
  } = options;

  const { toast } = useToast();
  const [state, setState] = useState<WhisperState>({
    isLoading: false,
    isListening: false,
    isProcessing: false,
    loadingProgress: 0,
    currentTranscript: '',
    error: null,
  });

  const transcriber = useRef<any>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const processingQueue = useRef<Blob[]>([]);
  const isProcessingRef = useRef(false);
  const accumulatedTranscript = useRef('');

  // Load the Whisper model
  const loadModel = useCallback(async () => {
    if (transcriber.current) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('Loading Whisper model:', modelName);
      
      transcriber.current = await pipeline(
        'automatic-speech-recognition',
        modelName,
        {
          progress_callback: (progress: any) => {
            if (progress.status === 'progress') {
              const percent = Math.round((progress.progress || 0) * 100);
              setState(prev => ({ ...prev, loadingProgress: percent }));
              console.log(`Model loading: ${percent}%`);
            }
          },
        }
      );

      console.log('Whisper model loaded successfully');
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        loadingProgress: 100,
        error: null 
      }));

      toast({
        title: "Voice recognition ready",
        description: "Whisper model loaded successfully. Voice input will work offline!",
      });
    } catch (error) {
      console.error('Failed to load Whisper model:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: 'Failed to load voice model' 
      }));
      
      toast({
        title: "Failed to load voice model",
        description: "Voice input won't be available. Please refresh and try again.",
        variant: "destructive",
      });
    }
  }, [modelName, toast]);

  // Process audio blob with Whisper
  const processAudioChunk = useCallback(async (audioBlob: Blob) => {
    if (!transcriber.current) {
      console.error('Transcriber not loaded');
      return;
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true }));

      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Decode audio
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      // Convert to mono 16kHz for Whisper
      const offlineContext = new OfflineAudioContext(1, audioBuffer.duration * 16000, 16000);
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start();
      
      const resampled = await offlineContext.startRendering();
      const float32Array = resampled.getChannelData(0);

      // Run transcription
      console.log('Running transcription on audio chunk...');
      const result = await transcriber.current(float32Array, {
        language: language === 'en' ? 'english' : language,
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      if (result?.text) {
        const transcript = result.text.trim();
        console.log('Transcription result:', transcript);
        
        if (transcript) {
          accumulatedTranscript.current += ' ' + transcript;
          const fullTranscript = accumulatedTranscript.current.trim();
          
          setState(prev => ({ 
            ...prev, 
            currentTranscript: fullTranscript,
            isProcessing: false 
          }));

          if (onPartialTranscript) {
            onPartialTranscript(transcript);
          }
          
          if (onTranscript) {
            onTranscript(fullTranscript);
          }
        }
      }

      setState(prev => ({ ...prev, isProcessing: false }));
    } catch (error) {
      console.error('Transcription error:', error);
      setState(prev => ({ 
        ...prev, 
        isProcessing: false,
        error: 'Transcription failed' 
      }));
    }
  }, [transcriber, language, onTranscript, onPartialTranscript]);

  // Process queued audio chunks
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || processingQueue.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    const chunk = processingQueue.current.shift();
    
    if (chunk) {
      await processAudioChunk(chunk);
    }

    isProcessingRef.current = false;
    
    // Process next chunk if any
    if (processingQueue.current.length > 0) {
      setTimeout(() => processQueue(), 100);
    }
  }, [processAudioChunk]);

  // Start recording
  const startListening = useCallback(async () => {
    try {
      // Load model if not loaded
      if (!transcriber.current) {
        await loadModel();
      }

      // Request microphone access
      mediaStream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
          channelCount: 1,
        },
      });

      // Create MediaRecorder for chunking
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      mediaRecorder.current = new MediaRecorder(mediaStream.current, {
        mimeType,
      });

      audioChunks.current = [];
      accumulatedTranscript.current = '';
      processingQueue.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        if (audioChunks.current.length > 0) {
          const audioBlob = new Blob(audioChunks.current, { type: mimeType });
          processingQueue.current.push(audioBlob);
          audioChunks.current = [];
          processQueue();
        }
      };

      // Start recording in chunks
      mediaRecorder.current.start();
      
      // Set up interval to process chunks
      const chunkInterval = setInterval(() => {
        if (mediaRecorder.current?.state === 'recording') {
          mediaRecorder.current.stop();
          setTimeout(() => {
            if (mediaRecorder.current && state.isListening) {
              audioChunks.current = [];
              mediaRecorder.current.start();
            }
          }, 50);
        }
      }, chunkDuration * 1000);

      // Store interval ID for cleanup
      (mediaRecorder.current as any).chunkInterval = chunkInterval;

      setState(prev => ({ 
        ...prev, 
        isListening: true, 
        error: null,
        currentTranscript: '' 
      }));

      console.log('Started listening with Whisper');
    } catch (error) {
      console.error('Failed to start listening:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to access microphone' 
      }));
      
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access and try again.",
        variant: "destructive",
      });
    }
  }, [loadModel, chunkDuration, processQueue, state.isListening, toast]);

  // Stop recording
  const stopListening = useCallback(() => {
    if (mediaRecorder.current) {
      const interval = (mediaRecorder.current as any).chunkInterval;
      if (interval) {
        clearInterval(interval);
      }

      if (mediaRecorder.current.state === 'recording') {
        mediaRecorder.current.stop();
      }
      mediaRecorder.current = null;
    }

    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach(track => track.stop());
      mediaStream.current = null;
    }

    if (audioContext.current) {
      audioContext.current.close();
      audioContext.current = null;
    }

    setState(prev => ({ 
      ...prev, 
      isListening: false 
    }));

    console.log('Stopped listening');
  }, []);

  // Clear transcript
  const clearTranscript = useCallback(() => {
    accumulatedTranscript.current = '';
    setState(prev => ({ ...prev, currentTranscript: '' }));
  }, []);

  // Initialize model on mount
  useEffect(() => {
    loadModel();

    return () => {
      stopListening();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // State
    ...state,
    modelLoaded: !!transcriber.current,
    
    // Actions
    startListening,
    stopListening,
    clearTranscript,
    loadModel,
  };
}