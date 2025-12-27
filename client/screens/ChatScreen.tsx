import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { HeaderButton } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  BorderRadius,
  AppColors,
  GlassEffect,
} from "@/constants/theme";
import { storage, ChatMessage, generateId, FoodItem } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, colorScheme } = useTheme();
  const navigation = useNavigation();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [inventory, setInventory] = useState<FoodItem[]>([]);

  const loadData = useCallback(async () => {
    const [chatHistory, items] = await Promise.all([
      storage.getChatHistory(),
      storage.getInventory(),
    ]);
    setMessages(chatHistory);
    setInventory(items);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderButton onPress={handleClearChat}>
          <Feather name="trash-2" size={20} color={theme.textSecondary} />
        </HeaderButton>
      ),
    });
  }, [navigation, theme]);

  const handleClearChat = async () => {
    await storage.clearChatHistory();
    setMessages([]);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async () => {
    if (!inputText.trim() || sending) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: inputText.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText("");
    setSending(true);
    scrollToBottom();

    try {
      const inventoryContext =
        inventory.length > 0
          ? `Available ingredients: ${inventory.map((i) => i.name).join(", ")}`
          : "No ingredients in inventory";

      const baseUrl = getApiUrl();
      const response = await fetch(new URL("/api/chat", baseUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          context: inventoryContext,
          history: updatedMessages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content:
          data.reply ||
          "I'm sorry, I couldn't process that request. Please try again.",
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      await storage.setChatHistory(finalMessages);
    } catch (error) {
      console.error("Chat error:", error);

      const errorMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content:
          "I'm having trouble connecting right now. Here are some quick tips: Make sure to use your oldest ingredients first, and check out the Recipes tab to generate meal ideas based on what you have!",
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      await storage.setChatHistory(finalMessages);
    } finally {
      setSending(false);
      scrollToBottom();
    }
  };

  const renderAssistantBubble = (content: string) => {
    const bubbleContent = (
      <ThemedText type="body" style={{ color: theme.text }}>
        {content}
      </ThemedText>
    );

    const useLiquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

    if (useLiquidGlass) {
      return (
        <GlassView
          glassEffectStyle="regular"
          style={[
            styles.assistantBubbleWrapper,
            styles.assistantBubbleInner,
            {
              borderWidth: 1,
              borderColor: theme.glass.border,
            },
          ]}
        >
          {bubbleContent}
        </GlassView>
      );
    }

    if (Platform.OS === "ios") {
      return (
        <View
          style={[
            styles.assistantBubbleWrapper,
            {
              borderColor: theme.glass.border,
            },
          ]}
        >
          <BlurView
            intensity={GlassEffect.blur.regular * 10}
            tint={colorScheme === "dark" ? "dark" : "light"}
            style={[
              styles.assistantBubbleInner,
              { backgroundColor: theme.glass.background },
            ]}
          >
            {bubbleContent}
          </BlurView>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.assistantBubbleWrapper,
          styles.assistantBubbleInner,
          {
            backgroundColor: theme.glass.background,
            borderColor: theme.glass.border,
          },
        ]}
      >
        {bubbleContent}
      </View>
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";

    if (!isUser) {
      return (
        <View style={styles.assistantBubbleContainer}>
          {renderAssistantBubble(item.content)}
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageBubble,
          styles.userBubble,
          { backgroundColor: AppColors.accent },
        ]}
      >
        <ThemedText type="body" style={{ color: "#FFFFFF" }}>
          {item.content}
        </ThemedText>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View
        style={[
          styles.assistantAvatar,
          {
            backgroundColor: theme.glass.background,
            borderWidth: 1,
            borderColor: theme.glass.border,
          },
        ]}
      >
        <Feather name="message-circle" size={48} color={theme.textSecondary} />
      </View>
      <ThemedText type="h3" style={styles.emptyTitle}>
        Kitchen Assistant
      </ThemedText>
      <ThemedText type="body" style={styles.emptySubtitle}>
        Ask me anything about cooking, recipes, or food storage tips!
      </ThemedText>

      <View style={styles.suggestions}>
        {[
          "What can I make with chicken and rice?",
          "How long does milk last?",
          "Tips for reducing food waste",
        ].map((suggestion, index) => (
          <Pressable
            key={index}
            style={[
              styles.suggestionChip,
              {
                backgroundColor: theme.glass.background,
                borderWidth: 1,
                borderColor: theme.glass.border,
              },
            ]}
            onPress={() => setInputText(suggestion)}
          >
            <ThemedText type="small">{suggestion}</ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={headerHeight}
    >
      <FlatList
        ref={flatListRef}
        style={styles.messageList}
        contentContainerStyle={[
          styles.messageListContent,
          {
            paddingTop: Spacing.lg,
            paddingBottom: Spacing.lg,
          },
        ]}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        ListEmptyComponent={renderEmptyState}
        onContentSizeChange={scrollToBottom}
      />

      {Platform.OS === "ios" && isLiquidGlassAvailable() ? (
        <GlassView
          glassEffectStyle="regular"
          style={[
            styles.inputContainer,
            {
              paddingBottom: tabBarHeight + Spacing.lg,
            },
          ]}
        >
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: theme.glass.background },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Ask about cooking, recipes..."
              placeholderTextColor={theme.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!sending}
            />
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
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather
                  name="send"
                  size={18}
                  color={inputText.trim() ? "#FFFFFF" : theme.textSecondary}
                />
              )}
            </Pressable>
          </View>
        </GlassView>
      ) : Platform.OS === "ios" ? (
        <BlurView
          intensity={60}
          tint={
            colorScheme === "dark"
              ? "systemChromeMaterialDark"
              : "systemChromeMaterial"
          }
          style={[
            styles.inputContainer,
            {
              paddingBottom: tabBarHeight + Spacing.lg,
            },
          ]}
        >
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: theme.glass.background },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Ask about cooking, recipes..."
              placeholderTextColor={theme.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!sending}
            />
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
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather
                  name="send"
                  size={18}
                  color={inputText.trim() ? "#FFFFFF" : theme.textSecondary}
                />
              )}
            </Pressable>
          </View>
        </BlurView>
      ) : (
        <View
          style={[
            styles.inputContainer,
            {
              paddingBottom: tabBarHeight + Spacing.lg,
            },
          ]}
        >
          <View
            style={[
              styles.inputWrapper,
              { backgroundColor: theme.glass.background },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Ask about cooking, recipes..."
              placeholderTextColor={theme.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!sending}
            />
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
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather
                  name="send"
                  size={18}
                  color={inputText.trim() ? "#FFFFFF" : theme.textSecondary}
                />
              )}
            </Pressable>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: Spacing.md,
    borderRadius: GlassEffect.borderRadius.md,
    marginBottom: Spacing.sm,
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: Spacing.xs,
  },
  assistantBubbleContainer: {
    alignSelf: "flex-start",
    maxWidth: "80%",
    marginBottom: Spacing.sm,
  },
  assistantBubbleWrapper: {
    borderRadius: GlassEffect.borderRadius.md,
    borderWidth: GlassEffect.borderWidth,
    overflow: "hidden",
  },
  assistantBubbleInner: {
    padding: Spacing.md,
    borderRadius: GlassEffect.borderRadius.md,
  },
  inputContainer: {
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 0,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: BorderRadius.xl,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  assistantAvatar: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    textAlign: "center",
    opacity: 0.7,
    marginBottom: Spacing.xl,
  },
  suggestions: {
    gap: Spacing.sm,
    width: "100%",
  },
  suggestionChip: {
    padding: Spacing.md,
    borderRadius: GlassEffect.borderRadius.md,
    alignItems: "center",
  },
});
