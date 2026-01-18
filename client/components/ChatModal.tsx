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
  Dimensions,
  useWindowDimensions,
  Image,
} from "react-native";
import { GlassView } from "@/components/GlassViewWithContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
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
  const { theme, colorScheme, isDark } = useTheme();
  const { isChatOpen, closeChat } = useFloatingChat();
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

  const animationProgress = useSharedValue(0);

  const chatWidth = Math.min(CHAT_WIDTH, screenWidth * 0.85);
  const chatHeight = Math.min(screenHeight * CHAT_MAX_HEIGHT_RATIO, 450);
  const bottomPadding = Math.max(insets.bottom, 10);
  const bottomPosition = TAB_BAR_HEIGHT + bottomPadding + FAB_SIZE + Spacing.xl;

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
          ? `Available ingredients: ${inventory.map((i) => `${i.quantity} ${i.unit} ${i.name}`).join(", ")}`
          : "No ingredients in inventory";

      const baseUrl = getApiUrl();
      
      // Get auth token if user is logged in
      const authToken = await storage.getAuthToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
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
          inventory: inventory.map(i => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            expirationDate: i.expirationDate,
            storageLocation: i.storageLocation,
            category: i.category,
          })),
          preferences: preferences ? {
            dietaryRestrictions: preferences.dietaryRestrictions,
            cuisinePreferences: preferences.cuisinePreferences,
            macroTargets: preferences.macroTargets,
          } : null,
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

      // If actions were performed, refresh local data from server
      if (data.refreshData && authToken) {
        console.log("[Chat] Actions performed, refreshing local data...");
        try {
          // Trigger a full sync to get updated data
          const syncResult = await storage.syncFromCloud();
          if (syncResult.success) {
            // Reload inventory to reflect changes
            const updatedInventory = await storage.getInventory();
            setInventory(updatedInventory);
            loadTip(updatedInventory);
          }
        } catch (syncError) {
          console.error("Failed to sync after chat action:", syncError);
        }
      }

      // Handle navigation after action (e.g., navigate to RecipeDetail after generating recipe)
      if (data.navigateTo) {
        console.log("[Chat] Navigation requested:", data.navigateTo);
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

  const renderAssistantBubble = (content: string) => {
    return (
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
    );
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";

    if (!isUser) {
      return (
        <GlassView style={styles.assistantBubbleContainer}>
          {renderAssistantBubble(item.content)}
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
              onPress={() => setInputText(suggestion)}
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
                borderColor: suggestion === "Report Bug" 
                  ? (isDark ? "rgba(255,100,100,0.4)" : "rgba(200,50,50,0.3)")
                  : (isDark ? "rgba(100,200,255,0.4)" : "rgba(50,150,200,0.3)"),
                backgroundColor: suggestion === "Report Bug"
                  ? (isDark ? "rgba(255,100,100,0.1)" : "rgba(200,50,50,0.08)")
                  : (isDark ? "rgba(100,200,255,0.1)" : "rgba(50,150,200,0.08)"),
              },
            ]}
            onPress={() => setInputText(suggestion === "Send Feedback" 
              ? "I'd like to send some feedback" 
              : "I want to report a bug")}
            testID={`feedback-chip-${suggestion.toLowerCase().replace(" ", "-")}`}
            accessibilityRole="button"
            accessibilityLabel={suggestion}
            accessibilityHint={`Tap to ${suggestion.toLowerCase()}`}
          >
            <Feather 
              name={suggestion === "Report Bug" ? "alert-circle" : "message-square"} 
              size={10} 
              color={suggestion === "Report Bug" 
                ? (isDark ? "#ff8888" : "#cc4444") 
                : (isDark ? "#88ccff" : "#4488cc")} 
              style={{ marginRight: 4 }}
            />
            <ThemedText 
              type="caption" 
              style={{ 
                fontSize: 10,
                color: suggestion === "Report Bug" 
                  ? (isDark ? "#ff8888" : "#cc4444") 
                  : (isDark ? "#88ccff" : "#4488cc"),
              }}
            >
              {suggestion}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </GlassView>
  );

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
          <Pressable onPress={handleClearChat} style={styles.headerButton}>
            <Feather name="trash-2" size={14} color={theme.textSecondary} />
          </Pressable>
          <Pressable onPress={closeChat} style={styles.headerButton}>
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
      />

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
          data-testid="button-chat-send"
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
        <Pressable style={StyleSheet.absoluteFill} onPress={closeChat} />
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
  assistantBubble: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderBottomLeftRadius: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.xs,
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
