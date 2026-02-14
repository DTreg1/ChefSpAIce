import { useState, useRef, useCallback, useEffect } from "react";
import { FlatList } from "react-native";
import { logger } from "@/lib/logger";
import { useNavigation } from "@react-navigation/native";
import type { RootNavigation } from "@/lib/types";
import { useFloatingChat } from "@/contexts/FloatingChatContext";
import {
  storage,
  ChatMessage,
  generateId,
  FoodItem,
  getDaysUntilExpiration,
  UserPreferences,
} from "@/lib/storage";
import { apiClient } from "@/lib/api-client";
import { useAIVoice } from "@/hooks/useAIVoice";
import type { WasteTip } from "@/components/chat/TipBanner";

export function useChatMessages() {
  const { isChatOpen, closeChat, initialMessage, setInitialMessage } = useFloatingChat();
  const navigation = useNavigation<RootNavigation>();
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
  const [isReplayLoading, setIsReplayLoading] = useState<string | null>(null);
  const prevMessageCountRef = useRef(0);
  const [chatStatusLabel, setChatStatusLabel] = useState("");
  const pendingInitialMessageRef = useRef<string | null>(null);

  const replayVoice = useAIVoice();

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
        const data = await apiClient.post<{ suggestions: string[] }>(
          "/api/suggestions/waste-reduction",
          { expiringItems },
        );

        if (data.suggestions && data.suggestions.length > 0) {
          const randomIndex = Math.floor(
            Math.random() * data.suggestions.length,
          );
          setCurrentTip(data.suggestions[randomIndex]);
        }
      } catch (error) {
        logger.error("Failed to load tip:", error);
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
      loadData();
    }
  }, [isChatOpen, loadData]);

  useEffect(() => {
    const currentCount = messages.length;
    if (sending) {
      setChatStatusLabel("Sending message");
    } else if (currentCount > prevMessageCountRef.current) {
      const lastMessage = messages[currentCount - 1];
      if (lastMessage?.role === "assistant") {
        setChatStatusLabel("New response received");
      }
    }
    prevMessageCountRef.current = currentCount;
  }, [messages.length, sending]);

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

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const handleClearChat = useCallback(async () => {
    await storage.clearChatHistory();
    setMessages([]);
  }, []);

  const handleSend = useCallback(async () => {
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

      const authToken = await storage.getAuthToken();

      const data = await apiClient.post<{ reply?: string; refreshData?: boolean; navigateTo?: any }>("/api/chat", {
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
      });

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
          logger.error("Failed to sync after chat action:", syncError);
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
      logger.error("Chat error:", error);

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
  }, [inputText, sending, messages, inventory, preferences, equipment, scrollToBottom, closeChat, navigation, loadTip]);

  const handleReplayMessage = useCallback(async (messageId: string, content: string) => {
    if (isReplayLoading || replayVoice.isSpeaking) return;

    setIsReplayLoading(messageId);

    try {
      const data = await apiClient.post<{ audioUrl?: string }>("/api/voice/speak", { text: content });
      if (data.audioUrl) {
        await replayVoice.play(data.audioUrl);
      }
    } catch (error) {
      logger.error("Failed to replay message:", error);
    } finally {
      setIsReplayLoading(null);
    }
  }, [isReplayLoading, replayVoice]);

  const addVoiceMessage = useCallback((role: "user" | "assistant", content: string) => {
    const chatMessage: ChatMessage = {
      id: generateId(),
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => {
      const updated = [...prev, chatMessage];
      storage.setChatHistory(updated);
      return updated;
    });
    scrollToBottom();
  }, [scrollToBottom]);

  const refreshTip = useCallback(() => {
    loadTip(inventory);
  }, [loadTip, inventory]);

  return {
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
    inventory,
    handleSend,
    handleClearChat,
    handleReplayMessage,
    scrollToBottom,
    addVoiceMessage,
    refreshTip,
  };
}
