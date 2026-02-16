import { useState, useCallback, useEffect, useRef } from "react";
import * as Speech from "expo-speech";
import { Platform } from "react-native";

interface TTSOptions {
  voice?: string;
  rate?: number;
  pitch?: number;
  language?: string;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

interface TTSState {
  isSpeaking: boolean;
  isPaused: boolean;
  availableVoices: Speech.Voice[];
  currentText: string;
  queueLength: number;
}

export function useTextToSpeech(options: TTSOptions = {}) {
  const {
    voice,
    rate = 1.0,
    pitch = 1.0,
    language = "en-US",
    onStart,
    onDone,
    onError,
  } = options;

  const [state, setState] = useState<TTSState>({
    isSpeaking: false,
    isPaused: false,
    availableVoices: [],
    currentText: "",
    queueLength: 0,
  });

  const queueRef = useRef<string[]>([]);
  const isProcessingQueueRef = useRef(false);
  const isMountedRef = useRef(true);

  const updateState = useCallback((updates: Partial<TTSState>) => {
    if (isMountedRef.current) {
      setState((prev) => ({ ...prev, ...updates }));
    }
  }, []);

  useEffect(() => {
    Speech.getAvailableVoicesAsync().then((voices: Speech.Voice[]) => {
      if (isMountedRef.current) {
        updateState({ availableVoices: voices });
      }
    });
  }, [updateState]);

  const speakText = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        updateState({ isSpeaking: true, isPaused: false, currentText: text });
        onStart?.();

        const speechOptions: Speech.SpeechOptions = {
          rate: Math.max(0.5, Math.min(2.0, rate)),
          pitch: Math.max(0.5, Math.min(2.0, pitch)),
          language,
          onDone: () => {
            updateState({
              isSpeaking: false,
              isPaused: false,
              currentText: "",
            });
            onDone?.();
            resolve();
          },
          onError: (error: { message?: string }) => {
            updateState({
              isSpeaking: false,
              isPaused: false,
              currentText: "",
            });
            onError?.(new Error(error.message || "Speech synthesis error"));
            resolve();
          },
          onStopped: () => {
            updateState({
              isSpeaking: false,
              isPaused: false,
              currentText: "",
            });
            resolve();
          },
        };

        if (voice) {
          speechOptions.voice = voice;
        }

        Speech.speak(text, speechOptions);
      });
    },
    [voice, rate, pitch, language, onStart, onDone, onError, updateState],
  );

  const processQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || queueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;
    const text = queueRef.current.shift();
    updateState({ queueLength: queueRef.current.length });

    if (text) {
      await speakText(text);
    }

    isProcessingQueueRef.current = false;

    if (queueRef.current.length > 0) {
      processQueue();
    }
  }, [speakText, updateState]);

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      if (state.isSpeaking) {
        queueRef.current.push(text);
        updateState({ queueLength: queueRef.current.length });
        return;
      }

      await speakText(text);

      if (queueRef.current.length > 0) {
        processQueue();
      }
    },
    [state.isSpeaking, speakText, processQueue, updateState],
  );

  const stop = useCallback(async () => {
    queueRef.current = [];
    isProcessingQueueRef.current = false;
    await Speech.stop();
    updateState({
      isSpeaking: false,
      isPaused: false,
      currentText: "",
      queueLength: 0,
    });
  }, [updateState]);

  const speakNow = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      await stop();
      await speakText(text);
    },
    [speakText, stop],
  );

  const queueText = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      queueRef.current.push(text);
      updateState({ queueLength: queueRef.current.length });

      if (!state.isSpeaking && !isProcessingQueueRef.current) {
        processQueue();
      }
    },
    [state.isSpeaking, processQueue, updateState],
  );

  const queueMultiple = useCallback(
    (texts: string[]) => {
      const validTexts = texts.filter((t) => t.trim());
      if (validTexts.length === 0) return;

      queueRef.current.push(...validTexts);
      updateState({ queueLength: queueRef.current.length });

      if (!state.isSpeaking && !isProcessingQueueRef.current) {
        processQueue();
      }
    },
    [state.isSpeaking, processQueue, updateState],
  );

  const pause = useCallback(() => {
    if (Platform.OS === "ios" && state.isSpeaking && !state.isPaused) {
      Speech.pause();
      updateState({ isPaused: true });
    }
  }, [state.isSpeaking, state.isPaused, updateState]);

  const resume = useCallback(() => {
    if (Platform.OS === "ios" && state.isPaused) {
      Speech.resume();
      updateState({ isPaused: false });
    }
  }, [state.isPaused, updateState]);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    updateState({ queueLength: 0 });
  }, [updateState]);

  const getVoicesForLanguage = useCallback(
    (lang: string) => {
      return state.availableVoices.filter((v) =>
        v.language.startsWith(lang.split("-")[0]),
      );
    },
    [state.availableVoices],
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      Speech.stop();
      queueRef.current = [];
    };
  }, []);

  return {
    isSpeaking: state.isSpeaking,
    isPaused: state.isPaused,
    availableVoices: state.availableVoices,
    currentText: state.currentText,
    queueLength: state.queueLength,
    speak,
    speakNow,
    queueText,
    queueMultiple,
    stop,
    pause,
    resume,
    clearQueue,
    getVoicesForLanguage,
    canPause: Platform.OS === "ios",
  };
}
