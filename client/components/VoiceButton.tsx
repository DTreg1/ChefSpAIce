import React, { useCallback, useEffect, useRef } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  AccessibilityInfo,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  cancelAnimation,
  Easing,
  interpolate,
  interpolateColor,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

import { useTheme } from "@/hooks/useTheme";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { parseVoiceCommand, ParsedCommand } from "@/lib/voice-commands";
import { useVoiceSounds } from "@/lib/voice-sounds";
import { ThemedText } from "@/components/ThemedText";
import { Colors, Spacing, BorderRadius, GlassEffect } from "@/constants/theme";

type VoiceButtonSize = "small" | "medium" | "large";
type VoiceButtonState = "idle" | "listening" | "processing";

interface VoiceButtonProps {
  onCommand: (command: ParsedCommand) => void;
  size?: VoiceButtonSize;
  style?: ViewStyle;
  showTranscript?: boolean;
  enableVoiceFeedback?: boolean;
  floating?: boolean;
  enableSoundEffects?: boolean;
}

const SIZE_CONFIG: Record<VoiceButtonSize, { button: number; icon: number }> = {
  small: { button: 48, icon: 20 },
  medium: { button: 56, icon: 24 },
  large: { button: 64, icon: 28 },
};

const FRIENDLY_ERROR_MESSAGES: Record<
  string,
  { visual: string; spoken: string }
> = {
  "Microphone permission denied": {
    visual: "I need microphone access to hear you",
    spoken:
      "I need microphone access to hear you. Please enable it in your device settings.",
  },
  "No speech detected": {
    visual: "I didn't catch that. Try again?",
    spoken:
      "I didn't catch that. Try speaking a bit louder or closer to your device.",
  },
  "Network error": {
    visual: "Having trouble connecting",
    spoken:
      "I'm having trouble connecting. Please check your internet and try again.",
  },
  "Voice input not available": {
    visual: "Voice not available here",
    spoken: "Voice input works best in the Expo Go app on your phone.",
  },
  default: {
    visual: "Oops! Let's try that again",
    spoken: "Oops, something went wrong. Let's try that again.",
  },
};

const COMMAND_CONFIRMATIONS: Record<string, string> = {
  ADD_FOOD: "Got it, adding that to your inventory.",
  SEARCH_INVENTORY: "Let me check that for you.",
  GENERATE_RECIPE: "I'll find some recipe ideas for you.",
  WHAT_EXPIRES: "Checking what's expiring soon.",
  NEXT_STEP: "Moving to the next step.",
  PREVIOUS_STEP: "Going back to the previous step.",
  REPEAT_STEP: "Let me repeat that.",
  START_RECIPE: "Starting from the beginning.",
  STOP_READING: "Okay, I'll stop reading.",
  UNKNOWN:
    "I didn't quite understand that. Try saying something like 'add milk' or 'what's expiring'.",
};

function getFriendlyErrorMessage(error: string): {
  visual: string;
  spoken: string;
} {
  for (const [key, message] of Object.entries(FRIENDLY_ERROR_MESSAGES)) {
    if (error.toLowerCase().includes(key.toLowerCase())) {
      return message;
    }
  }
  return FRIENDLY_ERROR_MESSAGES.default;
}

export function VoiceButton({
  onCommand,
  size = "medium",
  style,
  showTranscript = true,
  enableVoiceFeedback = true,
  floating = true,
  enableSoundEffects = false,
}: VoiceButtonProps) {
  const { isDark, theme } = useTheme();
  const sizeConfig = SIZE_CONFIG[size];
  const lastStateRef = useRef<VoiceButtonState>("idle");

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const glowIntensity = useSharedValue(0);
  const waveProgress = useSharedValue(0);
  const wave2Progress = useSharedValue(0);
  const wave3Progress = useSharedValue(0);

  const {
    speak,
    stop: stopSpeaking,
    isSpeaking,
  } = useTextToSpeech({
    rate: 0.95,
    pitch: 1.0,
  });

  const { playStart, playStop, playSuccess, playError } =
    useVoiceSounds(enableSoundEffects);

  const handleTranscript = useCallback(
    (text: string) => {
      const command = parseVoiceCommand(text);
      onCommand(command);

      if (command.intent !== "UNKNOWN") {
        playSuccess();
      }

      if (enableVoiceFeedback) {
        const confirmation =
          COMMAND_CONFIRMATIONS[command.intent] ||
          COMMAND_CONFIRMATIONS.UNKNOWN;
        speak(confirmation);
      }
    },
    [onCommand, enableVoiceFeedback, speak, playSuccess],
  );

  const handleError = useCallback(
    (error: Error) => {
      const friendlyMessage = getFriendlyErrorMessage(error.message);

      playError();

      if (enableVoiceFeedback) {
        speak(friendlyMessage.spoken);
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [enableVoiceFeedback, speak, playError],
  );

  const {
    isListening,
    isProcessing,
    transcript,
    error,
    startListening,
    stopListening,
    clearError,
  } = useVoiceInput({
    onTranscript: handleTranscript,
    onError: handleError,
  });

  const currentState: VoiceButtonState = isProcessing
    ? "processing"
    : isListening
      ? "listening"
      : "idle";

  useEffect(() => {
    if (currentState !== lastStateRef.current) {
      if (Platform.OS !== "web") {
        if (currentState === "listening") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else if (
          currentState === "idle" &&
          lastStateRef.current === "listening"
        ) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (currentState === "processing") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }
      }

      const accessibilityMessage =
        currentState === "listening"
          ? "Listening for your voice command"
          : currentState === "processing"
            ? "Processing what you said"
            : "Ready for voice command";

      AccessibilityInfo.announceForAccessibility(accessibilityMessage);
      lastStateRef.current = currentState;
    }
  }, [currentState]);

  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.15, {
            duration: 800,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        false,
      );

      glowIntensity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.5, { duration: 600 }),
        ),
        -1,
        false,
      );

      waveProgress.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.linear }),
        -1,
        false,
      );
      wave2Progress.value = withDelay(
        200,
        withRepeat(
          withTiming(1, { duration: 1200, easing: Easing.linear }),
          -1,
          false,
        ),
      );
      wave3Progress.value = withDelay(
        400,
        withRepeat(
          withTiming(1, { duration: 1200, easing: Easing.linear }),
          -1,
          false,
        ),
      );

      buttonScale.value = withSpring(1.05, { damping: 15 });
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      cancelAnimation(glowIntensity);
      cancelAnimation(waveProgress);
      cancelAnimation(wave2Progress);
      cancelAnimation(wave3Progress);

      pulseScale.value = withTiming(1, { duration: 300 });
      pulseOpacity.value = withTiming(0, { duration: 300 });
      glowIntensity.value = withTiming(0, { duration: 300 });
      waveProgress.value = 0;
      wave2Progress.value = 0;
      wave3Progress.value = 0;
      buttonScale.value = withSpring(1, { damping: 15 });
    }
  }, [
    isListening,
    pulseScale,
    pulseOpacity,
    buttonScale,
    glowIntensity,
    waveProgress,
    wave2Progress,
    wave3Progress,
  ]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowIntensity.value, [0, 1], [0, 0.6]),
    transform: [{ scale: interpolate(glowIntensity.value, [0, 1], [1, 1.1]) }],
  }));

  const waveStyle1 = useAnimatedStyle(() => ({
    opacity: interpolate(waveProgress.value, [0, 0.5, 1], [0.6, 0.3, 0]),
    transform: [{ scale: interpolate(waveProgress.value, [0, 1], [1, 2]) }],
  }));

  const waveStyle2 = useAnimatedStyle(() => ({
    opacity: interpolate(wave2Progress.value, [0, 0.5, 1], [0.5, 0.25, 0]),
    transform: [{ scale: interpolate(wave2Progress.value, [0, 1], [1, 2.2]) }],
  }));

  const waveStyle3 = useAnimatedStyle(() => ({
    opacity: interpolate(wave3Progress.value, [0, 0.5, 1], [0.4, 0.2, 0]),
    transform: [{ scale: interpolate(wave3Progress.value, [0, 1], [1, 2.4]) }],
  }));

  const handlePress = useCallback(async () => {
    clearError();

    if (isListening) {
      playStop();
      await stopListening();
    } else if (!isProcessing) {
      stopSpeaking();
      playStart();
      await startListening();
    }
  }, [
    isListening,
    isProcessing,
    startListening,
    stopListening,
    stopSpeaking,
    clearError,
    playStart,
    playStop,
  ]);

  const getButtonColor = () => {
    if (isProcessing) return theme.textSecondary;
    if (isListening) return "#E53935";
    return theme.primary;
  };

  const getStateLabel = (): string => {
    if (isProcessing) return "Thinking...";
    if (isListening) return "Listening...";
    if (isSpeaking) return "Speaking...";
    return "";
  };

  const getAccessibilityLabel = () => {
    if (isProcessing) return "Processing your command, please wait";
    if (isListening) return "Listening, tap to stop";
    if (error)
      return `Error: ${getFriendlyErrorMessage(error).visual}. Tap to try again`;
    return "Tap to start voice command";
  };

  const getAccessibilityHint = () => {
    if (isListening)
      return "Double tap to stop listening and process your command";
    return "Double tap to speak a command like 'add milk' or 'what's expiring soon'";
  };

  const renderWaveIndicators = () => {
    if (!isListening) return null;

    const waveSize = sizeConfig.button + 40;

    return (
      <>
        <Animated.View
          style={[
            styles.waveRing,
            {
              width: waveSize,
              height: waveSize,
              borderRadius: waveSize / 2,
              borderColor: "#E53935",
            },
            waveStyle1,
          ]}
        />
        <Animated.View
          style={[
            styles.waveRing,
            {
              width: waveSize,
              height: waveSize,
              borderRadius: waveSize / 2,
              borderColor: "#E53935",
            },
            waveStyle2,
          ]}
        />
        <Animated.View
          style={[
            styles.waveRing,
            {
              width: waveSize,
              height: waveSize,
              borderRadius: waveSize / 2,
              borderColor: "#E53935",
            },
            waveStyle3,
          ]}
        />
      </>
    );
  };

  const renderButton = () => (
    <View style={styles.buttonWrapper}>
      {renderWaveIndicators()}

      <Animated.View
        style={[
          styles.glowRing,
          {
            width: sizeConfig.button + 20,
            height: sizeConfig.button + 20,
            borderRadius: (sizeConfig.button + 20) / 2,
            backgroundColor: isListening ? "#E53935" : theme.primary,
          },
          glowAnimatedStyle,
        ]}
      />

      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: sizeConfig.button + 24,
            height: sizeConfig.button + 24,
            borderRadius: (sizeConfig.button + 24) / 2,
            backgroundColor: "#E53935",
          },
          pulseAnimatedStyle,
        ]}
      />

      <Animated.View style={buttonAnimatedStyle}>
        <Pressable
          onPress={handlePress}
          disabled={isProcessing}
          accessibilityLabel={getAccessibilityLabel()}
          accessibilityHint={getAccessibilityHint()}
          accessibilityRole="button"
          accessibilityState={{
            disabled: isProcessing,
            busy: isProcessing,
          }}
          style={({ pressed }) => [
            styles.button,
            {
              width: sizeConfig.button,
              height: sizeConfig.button,
              borderRadius: sizeConfig.button / 2,
              backgroundColor: getButtonColor(),
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather
              name={isListening ? "mic" : "mic"}
              size={sizeConfig.icon}
              color="#FFFFFF"
            />
          )}
        </Pressable>
      </Animated.View>
    </View>
  );

  const renderTranscriptBubble = () => {
    if (!showTranscript) return null;

    const stateLabel = getStateLabel();
    const hasContent =
      transcript || error || isListening || isProcessing || isSpeaking;

    if (!hasContent) return null;

    const friendlyError = error ? getFriendlyErrorMessage(error) : null;

    return (
      <View style={styles.transcriptContainer}>
        {Platform.OS === "web" ? (
          <View
            style={[
              styles.transcriptBubble,
              {
                backgroundColor: isDark
                  ? "rgba(30, 30, 30, 0.9)"
                  : "rgba(255, 255, 255, 0.9)",
                borderColor: isDark
                  ? Colors.dark.glass.border
                  : Colors.light.glass.border,
              },
            ]}
          >
            {renderTranscriptContent(friendlyError, stateLabel)}
          </View>
        ) : Platform.OS === "ios" && isLiquidGlassAvailable() ? (
          <GlassView
            glassEffectStyle="regular"
            style={[
              styles.transcriptBubble,
              {
                borderColor: "transparent",
              },
            ]}
          >
            {renderTranscriptContent(friendlyError, stateLabel)}
          </GlassView>
        ) : (
          <BlurView
            intensity={GlassEffect.blur.strong}
            tint={isDark ? "dark" : "light"}
            style={[
              styles.transcriptBubble,
              {
                backgroundColor: isDark
                  ? Colors.dark.glass.background
                  : Colors.light.glass.background,
                borderColor: isDark
                  ? Colors.dark.glass.border
                  : Colors.light.glass.border,
              },
            ]}
          >
            {renderTranscriptContent(friendlyError, stateLabel)}
          </BlurView>
        )}
      </View>
    );
  };

  const renderTranscriptContent = (
    friendlyError: { visual: string; spoken: string } | null,
    stateLabel: string,
  ) => {
    if (friendlyError) {
      return (
        <View style={styles.transcriptInner}>
          <Feather
            name="alert-circle"
            size={16}
            color={theme.error}
            style={styles.transcriptIcon}
          />
          <View style={styles.transcriptTextContainer}>
            <ThemedText style={[styles.transcriptText, { color: theme.error }]}>
              {friendlyError.visual}
            </ThemedText>
            <ThemedText
              style={[styles.retryHint, { color: theme.textSecondary }]}
            >
              Tap to try again
            </ThemedText>
          </View>
        </View>
      );
    }

    if (transcript) {
      return (
        <View style={styles.transcriptInner}>
          <Feather
            name="message-circle"
            size={16}
            color={theme.primary}
            style={styles.transcriptIcon}
          />
          <ThemedText style={styles.transcriptText}>"{transcript}"</ThemedText>
        </View>
      );
    }

    if (stateLabel) {
      const iconName = isListening
        ? "mic"
        : isProcessing
          ? "loader"
          : "volume-2";
      const iconColor = isListening ? "#E53935" : theme.textSecondary;

      return (
        <View style={styles.transcriptInner}>
          <Feather
            name={iconName}
            size={16}
            color={iconColor}
            style={styles.transcriptIcon}
          />
          <ThemedText
            style={[styles.transcriptText, { color: theme.textSecondary }]}
          >
            {stateLabel}
          </ThemedText>
        </View>
      );
    }

    return null;
  };

  if (floating) {
    return (
      <View style={[styles.floatingContainer, style]}>
        {renderTranscriptBubble()}
        {renderButton()}
      </View>
    );
  }

  return (
    <View style={[styles.inlineContainer, style]}>
      {renderButton()}
      {renderTranscriptBubble()}
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: "absolute",
    bottom: Spacing.xl,
    right: Spacing.lg,
    alignItems: "flex-end",
    zIndex: 1000,
  },
  inlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  buttonWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
  },
  glowRing: {
    position: "absolute",
  },
  waveRing: {
    position: "absolute",
    borderWidth: 2,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: {
        boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.3)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      },
    }),
  },
  transcriptContainer: {
    marginBottom: Spacing.sm,
    maxWidth: 280,
    minWidth: 120,
  },
  transcriptBubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  transcriptInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  transcriptIcon: {
    marginRight: Spacing.sm,
  },
  transcriptTextContainer: {
    flex: 1,
  },
  transcriptText: {
    fontSize: 14,
    flexShrink: 1,
  },
  retryHint: {
    fontSize: 12,
    marginTop: 2,
  },
});

export type { VoiceButtonProps, VoiceButtonSize, VoiceButtonState };
