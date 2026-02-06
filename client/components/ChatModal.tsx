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
  useWindowDimensions,
  Image,
} from "react-native";
import { logger } from "@/lib/logger";
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

import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useFloatingChat } from "@/contexts/FloatingChatContext";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import {
  storage,
  ChatMessage,
  generateId,
  FoodItem,
  getDaysUntilExpiration,
  UserPreferences,
} from "@/lib/storage";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { useVoiceChat } from "@/hooks/useVoiceChat";
import { useAIVoice } from "@/hooks/useAIVoice";

const chefHatDark = require("../../assets/images/transparent/chef-hat-dark-64.png");

const TAB_BAR_HEIGHT = 54;
const FAB_SIZE = 56;
const CHAT_WIDTH = 340;
const CHAT_MAX_HEIGHT_RATIO = 0.55;

interface WasteTip {
  text: string;
  category: "recipe" | "storage" | "freeze" | "preserve" | "general";
}

const TIP_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  recipe: "book-open",
  storage: "box",
  freeze: "thermometer",
  preserve: "archive",
  general: "zap",
};

const TIP_COLORS: Record<string, string> = {
  recipe: AppColors.primary,
  storage: AppColors.secondary,
  freeze: "#4FC3F7",
  preserve: AppColors.accent,
  general: AppColors.warning,
};

export function ChatModal() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { isChatOpen, closeChat, initialMessage, setInitialMessage } = useFloatingChat();
  const navigation = useNavigation<any>();
  const flatListRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [inventory, setInventory] = useState<FoodItem[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [equipment, setEquipment] = useState<number[]>([]);
  const [currentTip, setCurrentTip] = useState<WasteTip | null>(null);
  const [expiringCount, setExpiringCount] = useState(0);
  const [tipLoading, setTipLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isReplayLoading, setIsReplayLoading] = useState<string | null>(null);
  const isPressAndHoldRef = useRef(false);

  const animationProgress = useSharedValue(0);
  const pulseAnimation = useSharedValue(1);

  const voiceChat = useVoiceChat({
    onUserMessage: (msg) => {
      const chatMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      };
      setMessages((prev) => {
        const updated = [...prev, chatMessage];
        storage.setChatHistory(updated);
        return updated;
      });
      scrollToBottom();
    },
    onAssistantMessage: (msg) => {
      const chatMessage: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      };
      setMessages((prev) => {
        const updated = [...prev, chatMessage];
        storage.setChatHistory(updated);
        return updated;
      });
      scrollToBottom();
    },
  });

  const replayVoice = useAIVoice();

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

  const getExpiringItems = useCallback((items: FoodItem[]) => {
    const today = new Date();
    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

    return items
      .filter((item) => {
        const expiryDate = new Date(item.expirationDate);
        return expiryDate >= today && expiryDate <= fiveDaysFromNow;
      })
      .map((item) => ({
        id: typeof item.id === "string" ? parseInt(item.id, 10) || 0 : item.id,
        name: item.name,
        daysUntilExpiry: getDaysUntilExpiration(item.expirationDate),
        quantity: item.quantity,
      }))
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  }, []);

  const loadTip = useCallback(
    async (items: FoodItem[]) => {
      const expiringItems = getExpiringItems(items);
      setExpiringCount(expiringItems.length);

      if (expiringItems.length === 0) {
        setCurrentTip(null);
        return;
      }

      setTipLoading(true);
      try {
        const response = await apiRequest(
          "POST",
          "/api/suggestions/waste-reduction",
          { expiringItems },
        );
        const data = await response.json();

        if (data.suggestions && data.suggestions.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * data.suggestions.length,
          );
          setCurrentTip(data.suggestions[randomIndex]);
        }
      } catch (error) {
        console.error("Failed to load tip:", error);
        setCurrentTip(null);
      } finally {
        setTipLoading(false);
      }
    },
    [getExpiringItems],
  );

  const loadData = useCallback(async () => {
    const [chatHistory, items, userPrefs, cookware] = await Promise.all([
      storage.getChatHistory(),
      storage.getInventory(),
      storage.getPreferences(),
      storage.getCookware(),
    ]);
    setMessages(chatHistory);
    setInventory(items);
    setPreferences(userPrefs);
    setEquipment(cookware);
    loadTip(items);
  }, [loadTip]);

  useEffect(() => {
    if (isChatOpen) {
      animationProgress.value = isChatOpen ? 1 : 0;
      loadData();
    }
  }, [isChatOpen, loadData]);

  const pendingInitialMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialMessage) {
      pendingInitialMessageRef.current = initialMessage;
      setInitialMessage(null);
    }
  }, [initialMessage, setInitialMessage]);

  useEffect(() => {
    if (isChatOpen && pendingInitialMessageRef.current && !sending) {
      const messageToSend = pendingInitialMessageRef.current;
      pendingInitialMessageRef.current = null;
      setInputText(messageToSend);
    }
  }, [isChatOpen, sending]);

  const handleClearChat = async () => {
    await storage.clearChatHistory();
    setMessages([]);
    voiceChat.clearHistory();
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
          ? `Available ingredients: ${inventory.map((i) => `${i.quantity} ${i.unit} ${i.name}`).join(", ")}`
          : "No ingredients in inventory";

      const baseUrl = getApiUrl();

      const authToken = await storage.getAuthToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(new URL("/api/chat", baseUrl).href, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          message: userMessage.content,
          context: inventoryContext,
          inventory: inventory.map((i) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            expirationDate: i.expirationDate,
            storageLocation: i.storageLocation,
            category: i.category,
          })),
          preferences: preferences
            ? {
                dietaryRestrictions: preferences.dietaryRestrictions,
                cuisinePreferences: preferences.cuisinePreferences,
                macroTargets: preferences.macroTargets,
              }
            : null,
          equipment: equipment,
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

      if (data.refreshData && authToken) {
        logger.log("[Chat] Actions performed, refreshing local data...");
        try {
          const syncResult = await storage.syncFromCloud();
          if (syncResult.success) {
            const updatedInventory = await storage.getInventory();
            setInventory(updatedInventory);
            loadTip(updatedInventory);
          }
        } catch (syncError) {
          console.error("Failed to sync after chat action:", syncError);
        }
      }

      if (data.navigateTo) {
        logger.log("[Chat] Navigation requested:", data.navigateTo);
        closeChat();
        setTimeout(() => {
          if (data.navigateTo.screen === "RecipeDetail") {
            navigation.navigate("RecipesTab", {
              screen: "RecipeDetail",
              params: data.navigateTo.params,
            });
          } else if (data.navigateTo.screen === "GenerateRecipe") {
            navigation.navigate("RecipesTab", {
              screen: "GenerateRecipe",
              params: data.navigateTo.params || {},
            });
          } else {
            navigation.navigate(data.navigateTo.screen, data.navigateTo.params);
          }
        }, 300);
      }
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

  const handleVoiceTap = async () => {
    if (isPressAndHoldRef.current) {
      isPressAndHoldRef.current = false;
      return;
    }
    if (voiceChat.isListening) {
      await voiceChat.endConversation();
    } else if (!voiceChat.isProcessing && !voiceChat.isSpeaking) {
      await voiceChat.startConversation();
    }
  };

  const handleVoicePressIn = async () => {
    isPressAndHoldRef.current = true;
    if (!voiceChat.isProcessing && !voiceChat.isSpeaking && !voiceChat.isListening) {
      await voiceChat.startConversation();
    }
  };

  const handleVoicePressOut = async () => {
    if (isPressAndHoldRef.current && voiceChat.isListening) {
      await voiceChat.endConversation();
    }
    isPressAndHoldRef.current = false;
  };

  const handleReplayMessage = async (messageId: string, content: string) => {
    if (isReplayLoading || replayVoice.isSpeaking) return;
    
    setIsReplayLoading(messageId);
    const baseUrl = getApiUrl();
    const authToken = await storage.getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    try {
      const response = await fetch(new URL("/api/voice/speak", baseUrl).href, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ text: content }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audioUrl) {
          await replayVoice.play(data.audioUrl);
        }
      }
    } catch (error) {
      console.error("Failed to replay message:", error);
    } finally {
      setIsReplayLoading(null);
    }
  };

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

  const renderAssistantBubble = (content: string, messageId: string) => {
    const isThisMessageLoading = isReplayLoading === messageId;
    const isPlaying = replayVoice.isSpeaking && isReplayLoading === null;
    
    return (
      <View style={styles.assistantBubbleWrapper}>
        <GlassView
          style={[
            styles.assistantBubble,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(0,0,0,0.05)",
            },
          ]}
        >
          <ThemedText type="small" style={{ color: theme.text }}>
            {content}
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
          onPress={() => handleReplayMessage(messageId, content)}
          disabled={isReplayLoading !== null || replayVoice.isSpeaking}
          data-testid={`button-replay-${messageId}`}
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
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";

    if (!isUser) {
      return (
        <GlassView style={styles.assistantBubbleContainer} accessibilityRole="text">
          {renderAssistantBubble(item.content, item.id)}
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
  };

  const renderEmptyState = () => (
    <GlassView style={styles.emptyState}>
      <Image
        source={chefHatDark}
        style={{ width: 32, height: 32, opacity: 0.7 }}
        resizeMode="contain"
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
                  ? isDark
                    ? "#ff8888"
                    : "#cc4444"
                  : isDark
                    ? "#88ccff"
                    : "#4488cc"
              }
              style={{ marginRight: 4 }}
            />
            <ThemedText
              type="caption"
              style={{
                fontSize: 10,
                color:
                  suggestion === "Report Bug"
                    ? isDark
                      ? "#ff8888"
                      : "#cc4444"
                    : isDark
                      ? "#88ccff"
                      : "#4488cc",
              }}
            >
              {suggestion}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </GlassView>
  );

  const renderVoiceInput = () => {
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
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.05)",
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
            onPress={handleVoiceTap}
            onPressIn={handleVoicePressIn}
            onPressOut={handleVoicePressOut}
            disabled={voiceChat.isProcessing || voiceChat.isSpeaking}
            data-testid="button-voice-mic"
            accessibilityRole="button"
            accessibilityLabel={getStatusText()}
            accessibilityHint="Tap to start voice input. Press and hold for push-to-talk"
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
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.05)",
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
          <View style={styles.voiceErrorContainer} accessibilityRole="alert">
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
                backgroundColor: isDark
                  ? "rgba(255,100,100,0.2)"
                  : "rgba(200,50,50,0.1)",
              },
            ]}
            onPress={() => voiceChat.cancelConversation()}
            data-testid="button-voice-cancel"
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
  };

  if (!isChatOpen) {
    return null;
  }

  const chatContent = (
    <>
      <GlassView style={styles.header}>
        <GlassView style={styles.headerLeft}>
          <Image
            source={chefHatDark}
            style={{ width: 18, height: 18 }}
            resizeMode="contain"
          />
          <ThemedText type="caption" style={styles.headerTitle}>
            Kitchen Chef
          </ThemedText>
        </GlassView>
        <GlassView style={styles.headerRight}>
          <Pressable onPress={handleClearChat} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Clear chat history">
            <Feather name="trash-2" size={14} color={theme.textSecondary} />
          </Pressable>
          <Pressable onPress={closeChat} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Close chat">
            <Feather name="x" size={16} color={theme.text} />
          </Pressable>
        </GlassView>
      </GlassView>

      {currentTip || tipLoading || expiringCount > 0 ? (
        <Pressable
          style={[
            styles.tipBanner,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.05)",
            },
          ]}
          onPress={() => loadTip(inventory)}
          accessibilityRole="button"
          accessibilityLabel="Kitchen tip. Tap for another tip"
        >
          {tipLoading ? (
            <ActivityIndicator size="small" color={AppColors.primary} />
          ) : currentTip ? (
            <>
              <View
                style={[
                  styles.tipIcon,
                  {
                    backgroundColor: `${TIP_COLORS[currentTip.category] || TIP_COLORS.general}20`,
                  },
                ]}
              >
                <Feather
                  name={TIP_ICONS[currentTip.category] || TIP_ICONS.general}
                  size={12}
                  color={TIP_COLORS[currentTip.category] || TIP_COLORS.general}
                />
              </View>
              <ThemedText
                type="caption"
                style={styles.tipText}
                numberOfLines={2}
              >
                {currentTip.text}
              </ThemedText>
              {expiringCount > 0 ? (
                <View
                  style={[
                    styles.expiringBadge,
                    { backgroundColor: AppColors.warning },
                  ]}
                >
                  <ThemedText type="caption" style={styles.expiringBadgeText}>
                    {expiringCount}
                  </ThemedText>
                </View>
              ) : null}
            </>
          ) : expiringCount > 0 ? (
            <>
              <Feather
                name="alert-circle"
                size={14}
                color={AppColors.warning}
              />
              <ThemedText type="caption" style={styles.tipText}>
                {expiringCount} item{expiringCount > 1 ? "s" : ""} expiring soon
              </ThemedText>
            </>
          ) : null}
        </Pressable>
      ) : null}

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
            },
          ]}
        >
          {renderVoiceInput()}
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
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modeToggleButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modeToggleButtonVoice: {
    position: "absolute",
    right: Spacing.sm,
    bottom: Spacing.sm,
  },
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
  tipBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    minHeight: 44,
  },
  tipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tipText: {
    flex: 1,
    fontSize: 12,
  },
  expiringBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
    minWidth: 20,
    alignItems: "center",
  },
  expiringBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
});
