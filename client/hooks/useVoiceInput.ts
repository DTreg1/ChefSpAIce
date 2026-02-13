import { useState, useCallback, useRef, useEffect } from "react";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from "expo-audio";
import { Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";

interface VoiceInputOptions {
  onTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
  locale?: string;
}

interface VoiceInputState {
  isListening: boolean;
  transcript: string;
  isProcessing: boolean;
  error: string | null;
}

interface SpeechRecognitionResult {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
  readonly isFinal: boolean;
}

interface WebSpeechRecognitionEvent extends Event {
  readonly results: { readonly length: number; [index: number]: SpeechRecognitionResultList };
  readonly resultIndex: number;
}

interface WebSpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface WebSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onaudiostart: (() => void) | null;
  onaudioend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => WebSpeechRecognition;
    webkitSpeechRecognition: new () => WebSpeechRecognition;
  }
}

function isWebSpeechAvailable(): boolean {
  if (Platform.OS !== "web") return false;
  return !!(
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

async function transcribeAudio(uri: string): Promise<string> {
  const baseUrl = getApiUrl();
  const url = new URL("/api/voice/transcribe", baseUrl);

  const formData = new FormData();
  formData.append("file", {
    uri,
    type: "audio/m4a",
    name: "recording.m4a",
  } as unknown as Blob);

  const response = await fetch(url.toString(), {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Transcription failed");
  }

  const { transcript } = (await response.json()).data as { transcript: string };
  return transcript;
}

export function useVoiceInput(options: VoiceInputOptions = {}) {
  const { onTranscript, onError, locale = "en-US" } = options;

  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    transcript: "",
    isProcessing: false,
    error: null,
  });

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const isRecordingRef = useRef(false);
  const webRecognitionRef = useRef<WebSpeechRecognition | null>(null);
  const isMountedRef = useRef(true);

  const updateState = useCallback((updates: Partial<VoiceInputState>) => {
    if (isMountedRef.current) {
      setState((prev) => ({ ...prev, ...updates }));
    }
  }, []);

  const handleError = useCallback(
    (error: Error, message?: string) => {
      const errorMessage = message || error.message;
      updateState({
        isListening: false,
        isProcessing: false,
        error: errorMessage,
      });
      onError?.(error);
    },
    [onError, updateState],
  );

  const startWebSpeechRecognition = useCallback(() => {
    if (!isWebSpeechAvailable()) {
      handleError(
        new Error("Voice input not available"),
        "Voice input works best in the Expo Go app. Web browsers have limited support.",
      );
      return;
    }

    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = locale;

      recognition.onresult = (event: WebSpeechRecognitionEvent) => {
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript;

        if (lastResult.isFinal) {
          updateState({
            transcript,
            isListening: false,
            isProcessing: false,
          });
          onTranscript?.(transcript);
        } else {
          updateState({ transcript });
        }
      };

      recognition.onerror = (event: WebSpeechRecognitionErrorEvent) => {
        let errorMessage = "Speech recognition error";
        let friendlyMessage = "Something went wrong with voice input";

        switch (event.error) {
          case "not-allowed":
            errorMessage = "Microphone permission denied";
            friendlyMessage =
              "Please allow microphone access to use voice commands";
            break;
          case "no-speech":
            errorMessage = "No speech detected";
            friendlyMessage =
              "I didn't hear anything. Try speaking closer to your device.";
            break;
          case "network":
            errorMessage = "Network error during recognition";
            friendlyMessage = "Network issue - please check your connection";
            break;
          case "aborted":
            errorMessage = "Recognition was aborted";
            friendlyMessage = "Voice input was cancelled";
            break;
          case "audio-capture":
            errorMessage = "No microphone found";
            friendlyMessage =
              "No microphone detected. Please connect a microphone.";
            break;
          case "service-not-allowed":
            errorMessage = "Speech service not allowed";
            friendlyMessage =
              "Voice input is not available in this browser. Try using Chrome or the Expo Go app.";
            break;
        }
        handleError(new Error(errorMessage), friendlyMessage);
      };

      recognition.onend = () => {
        if (isMountedRef.current) {
          updateState({ isListening: false });
        }
        webRecognitionRef.current = null;
      };

      recognition.onaudiostart = () => {
        if (isMountedRef.current) {
          updateState({ isListening: true, error: null, transcript: "" });
        }
      };

      webRecognitionRef.current = recognition;

      updateState({ isListening: true, error: null, transcript: "" });
      recognition.start();
    } catch (error) {
      const err = error as Error;
      let friendlyMessage = "Failed to start voice input";

      if (
        err.message?.includes("permission") ||
        err.message?.includes("denied")
      ) {
        friendlyMessage =
          "Please allow microphone access to use voice commands";
      } else if (err.message?.includes("not supported")) {
        friendlyMessage =
          "Voice input is not supported in this browser. Try Chrome or the Expo Go app.";
      }

      handleError(err, friendlyMessage);
    }
  }, [locale, onTranscript, handleError, updateState]);

  const startNativeRecording = useCallback(async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        throw new Error("Microphone permission not granted");
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      isRecordingRef.current = true;
      updateState({ isListening: true, error: null, transcript: "" });
    } catch (error) {
      if ((error as Error).message?.includes("permission")) {
        handleError(error as Error, "Microphone permission denied");
      } else {
        handleError(error as Error, "Failed to start recording");
      }
    }
  }, [audioRecorder, handleError, updateState]);

  const startListening = useCallback(async () => {
    if (state.isListening || state.isProcessing) return;

    if (Platform.OS === "web" && isWebSpeechAvailable()) {
      startWebSpeechRecognition();
    } else if (Platform.OS !== "web") {
      await startNativeRecording();
    } else {
      handleError(
        new Error("Voice input not available"),
        "Voice input requires Expo Go on iOS/Android or a browser with Web Speech API support",
      );
    }
  }, [
    state.isListening,
    state.isProcessing,
    startWebSpeechRecognition,
    startNativeRecording,
    handleError,
  ]);

  const stopListening = useCallback(async () => {
    if (webRecognitionRef.current) {
      webRecognitionRef.current.stop();
      webRecognitionRef.current = null;
      return;
    }

    if (!isRecordingRef.current) return;

    try {
      updateState({ isListening: false, isProcessing: true });

      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      isRecordingRef.current = false;

      await setAudioModeAsync({
        allowsRecording: false,
      });

      if (uri) {
        const transcript = await transcribeAudio(uri);
        updateState({ transcript, isProcessing: false });
        onTranscript?.(transcript);
      } else {
        throw new Error("No audio recorded");
      }
    } catch (error) {
      if ((error as Error).message?.includes("network")) {
        handleError(
          error as Error,
          "Network error - please check your connection",
        );
      } else if ((error as Error).message?.includes("Transcription")) {
        handleError(
          error as Error,
          "Failed to transcribe audio - please try again",
        );
      } else {
        handleError(error as Error, "Failed to process audio");
      }
    }
  }, [audioRecorder, onTranscript, handleError, updateState]);

  const cancelListening = useCallback(async () => {
    if (webRecognitionRef.current) {
      webRecognitionRef.current.abort();
      webRecognitionRef.current = null;
      updateState({ isListening: false, isProcessing: false });
      return;
    }

    if (isRecordingRef.current) {
      try {
        await audioRecorder.stop();
      } catch {}
      isRecordingRef.current = false;
      await setAudioModeAsync({
        allowsRecording: false,
      });
    }
    updateState({ isListening: false, isProcessing: false });
  }, [audioRecorder, updateState]);

  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  const clearTranscript = useCallback(() => {
    updateState({ transcript: "" });
  }, [updateState]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (webRecognitionRef.current) {
        webRecognitionRef.current.abort();
        webRecognitionRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    cancelListening,
    clearError,
    clearTranscript,
    isWebSpeechAvailable: Platform.OS === "web" && isWebSpeechAvailable(),
    isNativeAvailable: Platform.OS !== "web",
  };
}
