import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { GlassView } from "@/components/GlassViewWithContext";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import type { ChatMessage } from "@/lib/storage";

const chefHatDark = require("../../assets/images/transparent/chef-hat-dark-64.png");

interface ChatMessageItemProps {
  item: ChatMessage;
  isDark: boolean;
  theme: any;
  isReplayLoading: string | null;
  replayVoiceSpeaking: boolean;
  onReplayMessage: (messageId: string, content: string) => void;
}

export function ChatMessageItem({
  item,
  isDark,
  theme,
  isReplayLoading,
  replayVoiceSpeaking,
  onReplayMessage,
}: ChatMessageItemProps) {
  const isUser = item.role === "user";

  if (!isUser) {
    const isThisMessageLoading = isReplayLoading === item.id;
    const isPlaying = replayVoiceSpeaking && isReplayLoading === null;

    return (
      <GlassView style={styles.assistantBubbleContainer} accessibilityRole="text">
        <View style={styles.assistantBubbleWrapper}>
          <GlassView
            style={[
              styles.assistantBubble,
              {
                backgroundColor: isDark
                  ? "rgba(0, 0, 0, 0.6)"
                  : "rgba(255, 255, 255, 0.7)",
              },
            ]}
          >
            <ThemedText type="small" style={{ color: theme.text }}>
              {item.content}
            </ThemedText>
          </GlassView>
          <Pressable
            style={[
              styles.replayButton,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.05)",
              },
            ]}
            onPress={() => onReplayMessage(item.id, item.content)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            disabled={isReplayLoading !== null || replayVoiceSpeaking}
            data-testid={`button-replay-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel="Replay message"
          >
            {isThisMessageLoading ? (
              <ActivityIndicator size={12} color={theme.textSecondary} />
            ) : (
              <Feather
                name={isPlaying ? "volume-2" : "volume-2"}
                size={12}
                color={theme.textSecondary}
              />
            )}
          </Pressable>
        </View>
      </GlassView>
    );
  }

  return (
    <GlassView
      style={[
        styles.messageBubble,
        styles.userBubble,
        { backgroundColor: AppColors.primary },
      ]}
      accessibilityRole="text"
    >
      <ThemedText type="small" style={{ color: "#FFFFFF" }}>
        {item.content}
      </ThemedText>
    </GlassView>
  );
}

interface ChatEmptyStateProps {
  isDark: boolean;
  theme: any;
  isVoiceMode: boolean;
  setIsVoiceMode: (value: boolean) => void;
  setInputText: (text: string) => void;
}

export function ChatEmptyState({
  isDark,
  theme,
  isVoiceMode,
  setIsVoiceMode,
  setInputText,
}: ChatEmptyStateProps) {
  return (
    <GlassView style={[styles.emptyState, { backgroundColor: isDark ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.6)" }]}>
      <Image
        source={chefHatDark}
        style={{ width: 32, height: 32, opacity: 0.7 }}
        contentFit="contain"
        cachePolicy="memory-disk"
        accessibilityElementsHidden={true}
        importantForAccessibility="no-hide-descendants"
      />
      <ThemedText type="caption" style={styles.emptyTitle}>
        Ask me anything!
      </ThemedText>
      <View style={styles.suggestions}>
        {["What can I cook?", "Food storage tips", "Waste reduction tips"].map(
          (suggestion, index) => (
            <Pressable
              key={index}
              style={[
                styles.suggestionChip,
                {
                  borderWidth: 1,
                  borderColor: isDark
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(0,0,0,0.12)",
                },
              ]}
              onPress={() => {
                if (isVoiceMode) {
                  setIsVoiceMode(false);
                }
                setInputText(suggestion);
              }}
              testID={`suggestion-chip-${index}`}
              accessibilityRole="button"
              accessibilityLabel={suggestion}
              accessibilityHint="Tap to use this suggestion"
            >
              <ThemedText type="caption" style={{ fontSize: 11 }}>
                {suggestion}
              </ThemedText>
            </Pressable>
          ),
        )}
      </View>
      <View style={styles.feedbackSuggestions}>
        {["Send Feedback", "Report Bug"].map((suggestion, index) => (
          <Pressable
            key={`feedback-${index}`}
            style={[
              styles.feedbackChip,
              {
                borderWidth: 1,
                borderColor:
                  suggestion === "Report Bug"
                    ? isDark
                      ? "rgba(255,100,100,0.4)"
                      : "rgba(200,50,50,0.3)"
                    : isDark
                      ? "rgba(100,200,255,0.4)"
                      : "rgba(50,150,200,0.3)",
                backgroundColor:
                  suggestion === "Report Bug"
                    ? isDark
                      ? "rgba(255,100,100,0.1)"
                      : "rgba(200,50,50,0.08)"
                    : isDark
                      ? "rgba(100,200,255,0.1)"
                      : "rgba(50,150,200,0.08)",
              },
            ]}
            onPress={() => {
              if (isVoiceMode) {
                setIsVoiceMode(false);
              }
              setInputText(
                suggestion === "Send Feedback"
                  ? "I'd like to send some feedback"
                  : "I want to report a bug",
              );
            }}
            testID={`feedback-chip-${suggestion.toLowerCase().replace(" ", "-")}`}
            accessibilityRole="button"
            accessibilityLabel={suggestion}
            accessibilityHint={`Tap to ${suggestion.toLowerCase()}`}
          >
            <Feather
              name={
                suggestion === "Report Bug" ? "alert-circle" : "message-square"
              }
              size={10}
              color={
                suggestion === "Report Bug"
                  ? theme.linkHighlightActive
                  : theme.linkHighlight
              }
              style={{ marginRight: 4 }}
            />
            <ThemedText
              type="caption"
              style={{
                fontSize: 10,
                color:
                  suggestion === "Report Bug"
                    ? theme.linkHighlightActive
                    : theme.linkHighlight,
              }}
            >
              {suggestion}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  messageBubble: {
    maxWidth: "85%",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xs,
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  assistantBubbleContainer: {
    alignSelf: "flex-start",
    maxWidth: "85%",
    marginBottom: Spacing.xs,
  },
  assistantBubbleWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  assistantBubble: {
    flex: 1,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderBottomLeftRadius: 4,
  },
  replayButton: {
    width: 24,
    height: 24,
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  emptyTitle: {
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    opacity: 0.7,
  },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    justifyContent: "center",
  },
  suggestionChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  feedbackSuggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  feedbackChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
});
