import React, { useRef, useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { GlassView } from "@/components/GlassViewWithContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolation,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useFloatingChat } from "@/contexts/FloatingChatContext";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { generateId } from "@/lib/storage";
import type { ChatMessage } from "@/lib/storage";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { useChatMessages } from "@/hooks/useChatMessages";
import { ChatMessageItem, ChatEmptyState, TipBanner, VoiceModeView } from "@/components/chat";

const chefHatDark = require("../assets/images/transparent/chef-hat-dark-64.png");

const TAB_BAR_HEIGHT = 54;
const FAB_SIZE = 56;
const CHAT_WIDTH = 340;
const CHAT_MAX_HEIGHT_RATIO = 0.55;

export function ChatModal() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { isChatOpen, closeChat } = useFloatingChat();
  const { focusTargetRef, containerRef, onAccessibilityEscape } = useFocusTrap({
    visible: isChatOpen,
    onDismiss: closeChat,
  });

  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const isPressAndHoldRef = useRef(false);

  const animationProgress = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);

  const {
    messages,
    inputText,
    setInputText,
    sending,
    currentTip,
    expiringCount,
    tipLoading,
    isReplayLoading,
    replayVoice,
    chatStatusLabel,
    flatListRef,
    handleSend,
    handleClearChat,
    handleReplayMessage,
    scrollToBottom,
    addVoiceMessage,
    refreshTip,
  } = useChatMessages();

  const voiceChat = useVoiceChat({
    onUserMessage: (msg) => {
      addVoiceMessage("user", msg.content);
    },
    onAssistantMessage: (msg) => {
      addVoiceMessage("assistant", msg.content);
    },
  });

  const chatWidth = Math.min(CHAT_WIDTH, screenWidth * 0.85);
  const chatHeight = Math.min(screenHeight * CHAT_MAX_HEIGHT_RATIO, 450);
  const bottomPadding = Math.max(insets.bottom, 10);
  const bottomPosition = TAB_BAR_HEIGHT + bottomPadding + FAB_SIZE + Spacing.xl;

  useEffect(() => {
    if (voiceChat.isListening) {
      pulseAnimation.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(pulseAnimation);
      pulseAnimation.value = withTiming(1, { duration: 200 });
    }
  }, [voiceChat.isListening]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
  }));

  useEffect(() => {
    if (isChatOpen) {
      animationProgress.value = isChatOpen ? 1 : 0;
    }
  }, [isChatOpen]);

  const handleClearChatWithVoice = useCallback(async () => {
    await handleClearChat();
    voiceChat.clearHistory();
  }, [handleClearChat, voiceChat]);

  const handleVoiceTap = useCallback(async () => {
    if (isPressAndHoldRef.current) {
      isPressAndHoldRef.current = false;
      return;
    }
    if (voiceChat.isListening) {
      await voiceChat.endConversation();
    } else if (!voiceChat.isProcessing && !voiceChat.isSpeaking) {
      await voiceChat.startConversation();
    }
  }, [voiceChat]);

  const handleVoicePressIn = useCallback(async () => {
    isPressAndHoldRef.current = true;
    if (!voiceChat.isProcessing && !voiceChat.isSpeaking && !voiceChat.isListening) {
      await voiceChat.startConversation();
    }
  }, [voiceChat]);

  const handleVoicePressOut = useCallback(async () => {
    if (isPressAndHoldRef.current && voiceChat.isListening) {
      await voiceChat.endConversation();
    }
    isPressAndHoldRef.current = false;
  }, [voiceChat]);

  const containerStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      animationProgress.value,
      [0, 1],
      [0.8, 1],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      animationProgress.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      animationProgress.value,
      [0, 1],
      [20, 0],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ scale }, { translateY }],
      opacity,
    };
  });

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <ChatMessageItem
      item={item}
      isDark={isDark}
      theme={theme}
      isReplayLoading={isReplayLoading}
      replayVoiceSpeaking={replayVoice.isSpeaking}
      onReplayMessage={handleReplayMessage}
    />
  ), [isDark, theme, isReplayLoading, replayVoice.isSpeaking, handleReplayMessage]);

  const renderEmptyState = useCallback(() => (
    <ChatEmptyState
      isDark={isDark}
      theme={theme}
      isVoiceMode={isVoiceMode}
      setIsVoiceMode={setIsVoiceMode}
      setInputText={setInputText}
    />
  ), [isDark, theme, isVoiceMode, setInputText]);

  if (!isChatOpen) {
    return null;
  }

  const chatContent = (
    <>
      <GlassView style={[styles.header, { backgroundColor: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(255, 255, 255, 0.7)" }]}>
        <GlassView style={styles.headerLeft}>
          <Image
            source={chefHatDark}
            style={{ width: 18, height: 18 }}
            contentFit="contain"
            cachePolicy="memory-disk"
            accessibilityElementsHidden={true}
            importantForAccessibility="no-hide-descendants"
          />
          <ThemedText type="caption" style={styles.headerTitle} ref={focusTargetRef}>
            Kitchen Chef
          </ThemedText>
        </GlassView>
        <GlassView style={styles.headerRight}>
          <Pressable onPress={handleClearChatWithVoice} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Clear chat history">
            <Feather name="trash-2" size={14} color={theme.textSecondary} />
          </Pressable>
          <Pressable onPress={closeChat} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Close chat">
            <Feather name="x" size={16} color={theme.text} />
          </Pressable>
        </GlassView>
      </GlassView>

      <TipBanner
        currentTip={currentTip}
        tipLoading={tipLoading}
        expiringCount={expiringCount}
        isDark={isDark}
        onRefreshTip={refreshTip}
      />

      <View
        accessibilityLiveRegion="polite"
        accessibilityLabel={chatStatusLabel}
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}
      />
      <FlatList
        ref={flatListRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        ListEmptyComponent={renderEmptyState}
        onContentSizeChange={scrollToBottom}
        keyboardShouldPersistTaps="handled"
        accessibilityRole="list"
        accessibilityLabel="Chat messages"
      />

      {isVoiceMode ? (
        <GlassView
          style={[
            styles.inputContainer,
            styles.voiceInputWrapper,
            {
              borderTopColor: theme.glass.border,
              backgroundColor: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(255, 255, 255, 0.7)",
            },
          ]}
        >
          <VoiceModeView
            voiceChat={voiceChat}
            isDark={isDark}
            theme={theme}
            pulseStyle={pulseStyle}
            onVoiceTap={handleVoiceTap}
            onVoicePressIn={handleVoicePressIn}
            onVoicePressOut={handleVoicePressOut}
          />
          <Pressable
            style={[
              styles.modeToggleButton,
              styles.modeToggleButtonVoice,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.05)",
              },
            ]}
            onPress={() => setIsVoiceMode(false)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            data-testid="button-mode-text"
            accessibilityRole="button"
            accessibilityLabel="Switch to text mode"
          >
            <Feather name="type" size={16} color={theme.textSecondary} />
          </Pressable>
        </GlassView>
      ) : (
        <GlassView
          style={[
            styles.inputContainer,
            {
              borderTopColor: theme.glass.border,
              backgroundColor: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(255, 255, 255, 0.7)",
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.05)",
              },
            ]}
            placeholder="Type a message..."
            data-testid="input-chat-message"
            placeholderTextColor={theme.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!sending}
            accessibilityLabel="Type a message"
            accessibilityHint="Enter your message to the kitchen assistant"
          />
          <Pressable
            style={[
              styles.modeToggleButton,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.05)",
              },
            ]}
            onPress={() => setIsVoiceMode(true)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            data-testid="button-mode-voice"
            accessibilityRole="button"
            accessibilityLabel="Switch to voice mode"
          >
            <Feather name="mic" size={14} color={theme.textSecondary} />
          </Pressable>
          <Pressable
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  inputText.trim() && !sending
                    ? AppColors.primary
                    : theme.backgroundSecondary,
              },
            ]}
            onPress={handleSend}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            disabled={!inputText.trim() || sending}
            data-testid="button-chat-send"
            accessibilityRole="button"
            accessibilityLabel={sending ? "Sending message" : "Send message"}
            accessibilityState={{ disabled: !inputText.trim() || sending }}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Feather
                name="send"
                size={14}
                color={inputText.trim() ? "#FFFFFF" : theme.textSecondary}
              />
            )}
          </Pressable>
        </GlassView>
      )}
    </>
  );

  return (
    <>
      <Animated.View
        style={[
          {
            ...styles.backdrop,
            backgroundColor: AppColors.background,
          },
          { opacity: 0.3 },
          { pointerEvents: isChatOpen ? "auto" : "none" },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeChat} accessibilityLabel="Close chat" accessibilityRole="button" />
      </Animated.View>

      <Animated.View
        ref={containerRef}
        onAccessibilityEscape={onAccessibilityEscape}
        style={[
          styles.chatContainer,
          {
            width: chatWidth,
            height: chatHeight,
            bottom: bottomPosition,
            right: Spacing.lg,
            borderRadius: BorderRadius.xl,
          },
          containerStyle,
        ]}
        accessibilityViewIsModal={true}
        accessibilityRole="none"
      >
        <GlassView
          style={[
            styles.chatContent,
            {
              borderColor: theme.glass.border,
              backgroundColor:
                Platform.OS === "web"
                  ? isDark
                    ? "rgba(30, 30, 30, 0.92)"
                    : "rgba(255, 255, 255, 0.92)"
                  : undefined,
            },
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
            keyboardVerticalOffset={0}
          >
            {chatContent}
          </KeyboardAvoidingView>
        </GlassView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    zIndex: 1050,
  },
  chatContainer: {
    position: "absolute",
    zIndex: 1150,
    ...Platform.select({
      web: {
        boxShadow: "0px 8px 8px rgba(0, 0, 0, 0.2)",
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  chatContent: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: "hidden",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  headerTitle: {
    fontSize: 18,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    flexGrow: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.xs,
  },
  voiceInputWrapper: {
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: Spacing.md,
    position: "relative",
  },
  input: {
    flex: 1,
    fontSize: 13,
    minHeight: 44,
    maxHeight: 80,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    textAlignVertical: "top",
  },
  sendButton: {
    width: 28,
    height: 28,
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modeToggleButton: {
    width: 28,
    height: 28,
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modeToggleButtonVoice: {
    position: "absolute",
    right: Spacing.sm,
    bottom: Spacing.sm,
  },
});
