import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  StyleSheet,
  Pressable,
  Platform,
  View,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
  cancelAnimation,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";

import {
  GlassView,
  isLiquidGlassAvailable,
} from "@/components/GlassViewWithContext";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useAIVoice } from "@/hooks/useAIVoice";
import { useFloatingChat } from "@/contexts/FloatingChatContext";
import { useSubscription } from "@/hooks/useSubscription";
import { storage, FoodItem, generateId } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import { logger } from "@/lib/logger";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const BUTTON_SIZE = 48;
const TAB_BAR_HEIGHT = 55;
const SILENCE_TIMEOUT = 30000;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

type VoiceState = "idle" | "listening" | "processing" | "speaking";

interface ParsedIntent {
  intent: "ADD_FOOD" | "WHAT_EXPIRES" | "SEARCH_INVENTORY" | "GENERATE_RECIPE" | "UNKNOWN";
  entities: {
    foodName?: string;
    quantity?: number;
    unit?: string;
    expirationDate?: string;
    searchQuery?: string;
    recipeRequest?: string;
  };
  confidence: number;
  rawTranscript: string;
}

export function VoiceQuickAction() {
  const insets = useSafeAreaInsets();
  const { isDark, theme } = useTheme();
  const { openChat, setInitialMessage } = useFloatingChat();
  const { checkFeature } = useSubscription();

  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [statusText, setStatusText] = useState("Tap to speak");
  const [transcript, setTranscript] = useState("");

  const scale = useSharedValue(1);
  const pulseAnimation = useSharedValue(1);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const canUseAiAssistant = checkFeature("canUseAiKitchenAssistant");

  const aiVoice = useAIVoice({
    onStart: () => {
      if (isMountedRef.current) {
        setVoiceState("speaking");
        setStatusText("Speaking...");
      }
    },
    onEnd: () => {
      if (isMountedRef.current) {
        setTimeout(() => {
          if (isMountedRef.current) {
            setIsOverlayVisible(false);
            resetState();
          }
        }, 500);
      }
    },
    onError: () => {
      if (isMountedRef.current) {
        setIsOverlayVisible(false);
        resetState();
      }
    },
  });

  const voiceInput = useVoiceInput({
    onTranscript: async (text) => {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      setTranscript(text);
      await processVoiceCommand(text);
    },
    onError: (error) => {
      if (Platform.OS === "web") {
        logger.error("Voice Error:", error.message);
      } else {
        Alert.alert("Voice Error", error.message);
      }
      setIsOverlayVisible(false);
      resetState();
    },
  });

  const resetState = useCallback(() => {
    setVoiceState("idle");
    setStatusText("Tap to speak");
    setTranscript("");
    cancelAnimation(pulseAnimation);
    pulseAnimation.value = 1;
  }, [pulseAnimation]);

  const startSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    silenceTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && voiceState === "listening") {
        if (Platform.OS !== "web") {
          Alert.alert("No speech detected", "Please try again");
        }
        voiceInput.cancelListening();
        setIsOverlayVisible(false);
        resetState();
      }
    }, SILENCE_TIMEOUT);
  }, [voiceState, voiceInput, resetState]);

  const parseVoiceCommand = async (transcript: string): Promise<ParsedIntent> => {
    const baseUrl = getApiUrl();
    const url = new URL("/api/voice/parse", baseUrl);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ transcript }),
    });

    if (!response.ok) {
      throw new Error("Failed to parse command");
    }

    return (await response.json()).data as ParsedIntent;
  };

  const synthesizeSpeech = async (text: string): Promise<string> => {
    const baseUrl = getApiUrl();
    const url = new URL("/api/voice/synthesize", baseUrl);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error("Failed to synthesize speech");
    }

    const { audioUrl } = (await response.json()).data as any;
    return audioUrl;
  };

  const speakResponse = async (text: string) => {
    try {
      const audioUrl = await synthesizeSpeech(text);
      await aiVoice.play(audioUrl);
    } catch {
      setIsOverlayVisible(false);
      resetState();
    }
  };

  const executeAddFood = async (entities: ParsedIntent["entities"]): Promise<string> => {
    if (!entities.foodName) {
      return "I didn't catch what food item to add. Please try again.";
    }

    const newItem: FoodItem = {
      id: generateId(),
      name: entities.foodName,
      quantity: entities.quantity || 1,
      unit: entities.unit || "item",
      storageLocation: "fridge",
      purchaseDate: new Date().toISOString().split("T")[0],
      expirationDate: entities.expirationDate || 
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      category: "Other",
    };

    await storage.addInventoryItem(newItem);
    const quantityText = entities.quantity && entities.quantity > 1 
      ? `${entities.quantity} ${entities.unit || "items"}` 
      : "";
    return `Added ${quantityText} ${entities.foodName} to your inventory.`;
  };

  const executeWhatExpires = async (): Promise<string> => {
    const inventory = await storage.getInventory();
    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

    const expiringItems = inventory.filter((item) => {
      const expDate = new Date(item.expirationDate);
      return expDate <= threeDaysFromNow && expDate >= today;
    });

    if (expiringItems.length === 0) {
      return "Good news! You have no items expiring in the next 3 days.";
    }

    const itemNames = expiringItems.slice(0, 5).map((item) => item.name);
    const remaining = expiringItems.length - 5;
    
    let response = `You have ${expiringItems.length} item${expiringItems.length > 1 ? "s" : ""} expiring soon: ${itemNames.join(", ")}`;
    if (remaining > 0) {
      response += ` and ${remaining} more.`;
    }
    return response;
  };

  const executeSearchInventory = async (entities: ParsedIntent["entities"]): Promise<string> => {
    const searchQuery = entities.searchQuery || entities.foodName;
    if (!searchQuery) {
      return "What item would you like to search for?";
    }

    const inventory = await storage.getInventory();
    const matches = inventory.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (matches.length === 0) {
      return `I couldn't find any ${searchQuery} in your inventory.`;
    }

    if (matches.length === 1) {
      const item = matches[0];
      return `You have ${item.quantity} ${item.unit} of ${item.name} in your ${item.storageLocation}.`;
    }

    return `You have ${matches.length} items matching "${searchQuery}" in your inventory.`;
  };

  const executeGenerateRecipe = (entities: ParsedIntent["entities"]) => {
    const request = entities.recipeRequest || "Generate a recipe using my available ingredients";
    setInitialMessage(request);
    setIsOverlayVisible(false);
    resetState();
    openChat();
  };

  const processVoiceCommand = async (text: string) => {
    setVoiceState("processing");
    setStatusText("Processing...");

    try {
      const parsed = await parseVoiceCommand(text);

      let responseText: string;

      switch (parsed.intent) {
        case "ADD_FOOD":
          responseText = await executeAddFood(parsed.entities);
          break;
        case "WHAT_EXPIRES":
          responseText = await executeWhatExpires();
          break;
        case "SEARCH_INVENTORY":
          responseText = await executeSearchInventory(parsed.entities);
          break;
        case "GENERATE_RECIPE":
          executeGenerateRecipe(parsed.entities);
          return;
        default:
          responseText = "I'm not sure what you want me to do. Try saying 'add milk', 'what's expiring', or 'make me a recipe'.";
      }

      await speakResponse(responseText);
    } catch {
      if (Platform.OS !== "web") {
        Alert.alert("Command Failed", "Could not process your command. Please try again.");
      }
      setIsOverlayVisible(false);
      resetState();
    }
  };

  const handleFabPress = () => {
    if (!canUseAiAssistant) {
      if (Platform.OS !== "web") {
        Alert.alert("Upgrade Required", "Voice commands require a subscription");
      }
      return;
    }
    setIsOverlayVisible(true);
  };

  const handleMicPress = async () => {
    if (voiceState === "idle") {
      setVoiceState("listening");
      setStatusText("Listening...");
      startSilenceTimeout();
      pulseAnimation.value = withRepeat(
        withTiming(1.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      await voiceInput.startListening();
    } else if (voiceState === "listening") {
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      cancelAnimation(pulseAnimation);
      pulseAnimation.value = 1;
      await voiceInput.stopListening();
    }
  };

  const handleCancel = () => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    voiceInput.cancelListening();
    aiVoice.stop();
    setIsOverlayVisible(false);
    resetState();
  };

  const handleFabPressIn = () => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  };

  const handleFabPressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnimation.value }],
    opacity: 2 - pulseAnimation.value,
  }));

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (voiceInput.isListening) {
      setVoiceState("listening");
    } else if (voiceInput.isProcessing) {
      setVoiceState("processing");
      setStatusText("Transcribing...");
    }
  }, [voiceInput.isListening, voiceInput.isProcessing]);

  const bottomPadding = Math.max(insets.bottom, 10);
  const fabBottomPosition = TAB_BAR_HEIGHT + bottomPadding + Spacing.md + BUTTON_SIZE + Spacing.md;

  const useLiquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const getMicButtonColor = () => {
    switch (voiceState) {
      case "listening":
        return AppColors.error;
      case "processing":
        return AppColors.warning;
      case "speaking":
        return AppColors.primary;
      default:
        return AppColors.accent;
    }
  };

  const renderFabContent = () => {
    const iconContent = <Feather name="mic" size={22} color="#FFFFFF" />;

    if (useLiquidGlass) {
      return (
        <GlassView
          glassEffectStyle="regular"
          style={[styles.fabInner, styles.fabGlass]}
        >
          {iconContent}
        </GlassView>
      );
    }

    if (Platform.OS === "ios") {
      return (
        <View style={styles.fabBlurContainer}>
          <BlurView
            intensity={80}
            tint={isDark ? "systemThickMaterialDark" : "systemThickMaterial"}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, styles.fabOverlay]} />
          {iconContent}
        </View>
      );
    }

    return <View style={styles.fabInner}>{iconContent}</View>;
  };

  return (
    <>
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={[
          styles.fabContainer,
          { bottom: fabBottomPosition, right: Spacing.lg },
        ]}
      >
        <AnimatedPressable
          onPress={handleFabPress}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          style={[styles.fabWrapper, fabAnimatedStyle]}
          data-testid="button-voice-quick-action"
          accessibilityRole="button"
          accessibilityLabel="Quick voice command"
        >
          {renderFabContent()}
        </AnimatedPressable>
      </Animated.View>

      {isOverlayVisible && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.overlay}
        >
          <Pressable
            style={styles.overlayBackground}
            onPress={handleCancel}
            data-testid="button-voice-overlay-dismiss"
          />

          <Pressable
            style={styles.cancelButton}
            onPress={handleCancel}
            data-testid="button-voice-cancel"
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <View
              style={[
                styles.cancelButtonInner,
                { backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" },
              ]}
            >
              <Feather name="x" size={24} color={theme.text} />
            </View>
          </Pressable>

          <View style={styles.overlayContent}>
            {transcript && voiceState === "processing" && (
              <GlassView
                style={[
                  styles.transcriptBubble,
                  { backgroundColor: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(255, 255, 255, 0.7)" },
                ]}
              >
                <ThemedText type="small" style={{ color: theme.text, textAlign: "center" }}>
                  "{transcript}"
                </ThemedText>
              </GlassView>
            )}

            <View style={styles.micWrapper}>
              {voiceState === "listening" && (
                <Animated.View
                  style={[
                    styles.pulseRing,
                    { borderColor: AppColors.error },
                    pulseStyle,
                  ]}
                />
              )}
              <Pressable
                style={[
                  styles.micButton,
                  {
                    backgroundColor: getMicButtonColor(),
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
                onPress={handleMicPress}
                disabled={voiceState === "processing" || voiceState === "speaking"}
                data-testid="button-voice-mic-overlay"
                accessibilityRole="button"
                accessibilityLabel={statusText}
              >
                {voiceState === "processing" ? (
                  <ActivityIndicator size="large" color="#FFFFFF" />
                ) : voiceState === "speaking" ? (
                  <Feather name="volume-2" size={40} color="#FFFFFF" />
                ) : (
                  <Feather name="mic" size={40} color="#FFFFFF" />
                )}
              </Pressable>
            </View>

            <ThemedText
              type="body"
              style={[styles.statusText, { color: isDark ? "#FFFFFF" : theme.text }]}
            >
              {statusText}
            </ThemedText>

            <ThemedText
              type="small"
              style={[styles.hintText, { color: isDark ? "rgba(255,255,255,0.6)" : theme.textSecondary }]}
            >
              Try: "Add milk" or "What's expiring?"
            </ThemedText>
          </View>
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    zIndex: 899,
  },
  fabWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  fabInner: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: AppColors.accent,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: {
        boxShadow: "0px 2px 4px rgba(52, 152, 219, 0.3)",
      },
      ios: {
        shadowColor: AppColors.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  fabGlass: {
    backgroundColor: `${AppColors.accent}CC`,
    overflow: "hidden",
  },
  fabBlurContainer: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: AppColors.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
    }),
  },
  fabOverlay: {
    backgroundColor: `${AppColors.accent}CC`,
    borderRadius: BUTTON_SIZE / 2,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  cancelButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 1001,
  },
  cancelButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  transcriptBubble: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
    maxWidth: SCREEN_WIDTH * 0.8,
  },
  micWrapper: {
    width: 120,
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: {
        boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.3)",
      },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  statusText: {
    marginTop: Spacing.xl,
    fontWeight: "600",
    textAlign: "center",
  },
  hintText: {
    marginTop: Spacing.sm,
    textAlign: "center",
  },
});
