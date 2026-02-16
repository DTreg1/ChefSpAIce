import { useState, useCallback, useRef } from "react";
import {
  useAudioRecorder,
  RecordingPresets,
  AudioModule,
  setAudioModeAsync,
} from "expo-audio";

import { useAIVoice } from "./useAIVoice";
import { apiClient } from "@/lib/api-client";

export interface VoiceChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface VoiceChatState {
  messages: VoiceChatMessage[];
  isProcessing: boolean;
  error: string | null;
  lastUserTranscript: string | null;
}

interface VoiceChatOptions {
  onUserMessage?: (message: VoiceChatMessage) => void;
  onAssistantMessage?: (message: VoiceChatMessage) => void;
  onError?: (error: Error) => void;
}

export function useVoiceChat(options: VoiceChatOptions = {}) {
  const { onUserMessage, onAssistantMessage, onError } = options;

  const [state, setState] = useState<VoiceChatState>({
    messages: [],
    isProcessing: false,
    error: null,
    lastUserTranscript: null,
  });

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const isRecordingRef = useRef(false);
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const aiVoice = useAIVoice();

  const updateState = useCallback((updates: Partial<VoiceChatState>) => {
    if (isMountedRef.current) {
      setState((prev) => ({ ...prev, ...updates }));
    }
  }, []);

  const handleError = useCallback(
    (error: Error, message?: string) => {
      const errorMessage = message || error.message;
      updateState({
        isProcessing: false,
        error: errorMessage,
      });
      onError?.(error);
    },
    [onError, updateState]
  );

  const startConversation = useCallback(async () => {
    if (isRecordingRef.current || state.isProcessing) return;

    try {
      updateState({ error: null });

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
    } catch (error) {
      handleError(
        error as Error,
        (error as Error).message?.includes("permission")
          ? "Microphone permission denied"
          : "Failed to start recording"
      );
    }
  }, [audioRecorder, state.isProcessing, handleError, updateState]);

  const endConversation = useCallback(async () => {
    if (!isRecordingRef.current) return;

    try {
      updateState({ isProcessing: true, error: null });

      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      isRecordingRef.current = false;

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      if (!uri) {
        throw new Error("No audio recorded");
      }

      abortControllerRef.current = new AbortController();

      const formData = new FormData();
      formData.append("file", {
        uri,
        type: "audio/m4a",
        name: "recording.m4a",
      } as unknown as Blob);

      const data = await apiClient.postFormData<{ userTranscript: string; assistantMessage: string; audioUrl?: string }>(
        "/api/ai/voice-chat",
        formData,
        { signal: abortControllerRef.current.signal },
      );
      const { userTranscript, assistantMessage, audioUrl } = data;

      const userMessage: VoiceChatMessage = {
        role: "user",
        content: userTranscript,
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        lastUserTranscript: userTranscript,
      }));
      onUserMessage?.(userMessage);

      if (audioUrl) {
        await aiVoice.play(audioUrl);
      }

      const assistantMsg: VoiceChatMessage = {
        role: "assistant",
        content: assistantMessage,
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
        isProcessing: false,
      }));
      onAssistantMessage?.(assistantMsg);

      abortControllerRef.current = null;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        updateState({ isProcessing: false });
        return;
      }

      handleError(
        error as Error,
        (error as Error).message?.includes("network")
          ? "Network error - please check your connection"
          : "Failed to process voice chat"
      );
    }
  }, [
    audioRecorder,
    aiVoice,
    onUserMessage,
    onAssistantMessage,
    handleError,
    updateState,
  ]);

  const cancelConversation = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
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

    aiVoice.stop();

    updateState({
      isProcessing: false,
      error: null,
    });
  }, [audioRecorder, aiVoice, updateState]);

  const clearHistory = useCallback(() => {
    updateState({
      messages: [],
      lastUserTranscript: null,
      error: null,
    });
  }, [updateState]);

  const isListening = isRecordingRef.current;
  const isSpeaking = aiVoice.isSpeaking;
  const isActive = isListening || state.isProcessing || isSpeaking;

  return {
    startConversation,
    endConversation,
    cancelConversation,
    clearHistory,
    messages: state.messages,
    isListening,
    isProcessing: state.isProcessing,
    isSpeaking,
    isActive,
    error: state.error,
    lastUserTranscript: state.lastUserTranscript,
  };
}
