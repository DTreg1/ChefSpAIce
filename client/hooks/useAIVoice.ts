import { useState, useCallback, useRef, useEffect } from "react";
import { useAudioPlayer, useAudioPlayerStatus, AudioSource } from "expo-audio";

interface AIVoiceState {
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
  currentAudioUrl: string | null;
}

interface AIVoiceOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export function useAIVoice(options: AIVoiceOptions = {}) {
  const { onStart, onEnd, onError } = options;

  const [state, setState] = useState<AIVoiceState>({
    isSpeaking: false,
    isLoading: false,
    error: null,
    currentAudioUrl: null,
  });

  const isMountedRef = useRef(true);
  const onEndCalledRef = useRef(false);
  const audioSourceRef = useRef<AudioSource | null>(null);

  const player = useAudioPlayer(audioSourceRef.current);
  const status = useAudioPlayerStatus(player);

  const updateState = useCallback((updates: Partial<AIVoiceState>) => {
    if (isMountedRef.current) {
      setState((prev) => ({ ...prev, ...updates }));
    }
  }, []);

  useEffect(() => {
    if (status.playing) {
      if (!state.isSpeaking) {
        updateState({ isSpeaking: true, isLoading: false });
        onStart?.();
      }
      onEndCalledRef.current = false;
    } else if (state.isSpeaking && !status.playing && !onEndCalledRef.current) {
      updateState({ isSpeaking: false });
      onEndCalledRef.current = true;
      onEnd?.();
    }
  }, [status.playing, state.isSpeaking, onStart, onEnd, updateState]);

  const play = useCallback(
    async (audioUrl: string) => {
      try {
        updateState({ isLoading: true, error: null, currentAudioUrl: audioUrl });
        onEndCalledRef.current = false;

        player.replace({ uri: audioUrl });
        player.play();
      } catch (error) {
        updateState({
          isSpeaking: false,
          isLoading: false,
          error: (error as Error).message,
        });
        onError?.(error as Error);
      }
    },
    [player, onError, updateState]
  );

  const stop = useCallback(() => {
    try {
      player.pause();
      player.seekTo(0);
    } catch {}
    updateState({ isSpeaking: false, isLoading: false });
  }, [player, updateState]);

  const pause = useCallback(() => {
    try {
      player.pause();
      updateState({ isSpeaking: false });
    } catch {}
  }, [player, updateState]);

  const resume = useCallback(() => {
    try {
      player.play();
      updateState({ isSpeaking: true });
    } catch {}
  }, [player, updateState]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    isSpeaking: state.isSpeaking,
    isLoading: state.isLoading,
    error: state.error,
    play,
    stop,
    pause,
    resume,
  };
}
