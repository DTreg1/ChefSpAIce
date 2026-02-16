import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import Animated from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";

interface VoiceModeViewProps {
  voiceChat: {
    isListening: boolean;
    isProcessing: boolean;
    isSpeaking: boolean;
    isActive: boolean;
    lastUserTranscript: string | null;
    error: string | null;
    cancelConversation: () => void;
  };
  theme: any;
  pulseStyle: any;
  onVoiceTap: () => void;
  onVoicePressIn: () => void;
  onVoicePressOut: () => void;
}

export function VoiceModeView({
  voiceChat,
  theme,
  pulseStyle,
  onVoiceTap,
  onVoicePressIn,
  onVoicePressOut,
}: VoiceModeViewProps) {
  const { style: themeStyle } = useTheme();
  const getVoiceState = () => {
    if (voiceChat.isSpeaking) return "speaking";
    if (voiceChat.isProcessing) return "processing";
    if (voiceChat.isListening) return "listening";
    return "idle";
  };

  const voiceState = getVoiceState();

  const getStatusText = () => {
    switch (voiceState) {
      case "listening":
        return "Listening... (release to send)";
      case "processing":
        return "Thinking...";
      case "speaking":
        return "Speaking...";
      default:
        return "Tap or hold to speak";
    }
  };

  const getIconName = (): keyof typeof Feather.glyphMap => {
    switch (voiceState) {
      case "speaking":
        return "volume-2";
      default:
        return "mic";
    }
  };

  const getMicButtonColor = () => {
    switch (voiceState) {
      case "listening":
        return AppColors.error;
      case "processing":
        return AppColors.warning;
      case "speaking":
        return AppColors.primary;
      default:
        return theme.textSecondary;
    }
  };

  return (
    <View style={styles.voiceInputContainer}>
      <View style={styles.voiceMicWrapper}>
        {voiceState === "listening" && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: AppColors.error,
              },
              pulseStyle,
            ]}
          />
        )}
        <Pressable
          style={[
            styles.voiceMicButton,
            {
              backgroundColor: themeStyle.surface.feedbackBg,
              borderColor:
                voiceState === "listening"
                  ? AppColors.error
                  : voiceState === "processing"
                    ? AppColors.warning
                    : voiceState === "speaking"
                      ? AppColors.primary
                      : "transparent",
              borderWidth: voiceState !== "idle" ? 2 : 0,
            },
          ]}
          onPress={onVoiceTap}
          onPressIn={onVoicePressIn}
          onPressOut={onVoicePressOut}
          disabled={voiceChat.isProcessing || voiceChat.isSpeaking}
          testID="button-voice-mic"
          accessibilityRole="button"
          accessibilityLabel={getStatusText()}
          accessibilityHint="Tap to start voice input. Press and hold for push-to-talk"
          accessibilityState={{ disabled: voiceChat.isProcessing || voiceChat.isSpeaking }}
        >
          {voiceState === "processing" ? (
            <ActivityIndicator size="large" color={AppColors.warning} />
          ) : (
            <Feather
              name={getIconName()}
              size={32}
              color={getMicButtonColor()}
            />
          )}
        </Pressable>
      </View>

      <ThemedText
        type="caption"
        style={[
          styles.voiceStatusText,
          {
            color:
              voiceState === "listening"
                ? AppColors.error
                : voiceState === "processing"
                  ? AppColors.warning
                  : voiceState === "speaking"
                    ? AppColors.primary
                    : theme.textSecondary,
          },
        ]}
        accessibilityLiveRegion="polite"
      >
        {getStatusText()}
      </ThemedText>

      {voiceChat.lastUserTranscript && voiceChat.isProcessing && (
        <View
          style={[
            styles.transcriptPreview,
            {
              backgroundColor: themeStyle.surface.feedbackBg,
            },
          ]}
          accessibilityLiveRegion="polite"
          accessibilityLabel={`Transcript: ${voiceChat.lastUserTranscript}`}
        >
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary }}
            numberOfLines={2}
          >
            "{voiceChat.lastUserTranscript}"
          </ThemedText>
        </View>
      )}

      {voiceChat.error && (
        <View style={styles.voiceErrorContainer} accessibilityRole="alert" accessibilityLiveRegion="assertive">
          <ThemedText
            type="caption"
            style={{ color: AppColors.error, textAlign: "center" }}
          >
            {voiceChat.error}
          </ThemedText>
        </View>
      )}

      {voiceChat.isActive && (
        <Pressable
          style={[
            styles.cancelVoiceButton,
            {
              backgroundColor: themeStyle.colorScheme === "dark"
                ? "rgba(255,100,100,0.2)"
                : "rgba(200,50,50,0.1)",
            },
          ]}
          onPress={() => voiceChat.cancelConversation()}
          testID="button-voice-cancel"
          accessibilityRole="button"
          accessibilityLabel="Cancel voice conversation"
        >
          <Feather name="x" size={14} color={AppColors.error} />
          <ThemedText
            type="caption"
            style={{ color: AppColors.error, marginLeft: 4 }}
          >
            Cancel
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  voiceInputContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    width: "100%",
  },
  voiceMicWrapper: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  pulseRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  voiceMicButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceStatusText: {
    marginTop: Spacing.sm,
    fontSize: 12,
    fontWeight: "500",
  },
  transcriptPreview: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    maxWidth: "90%",
  },
  voiceErrorContainer: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  cancelVoiceButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
});
