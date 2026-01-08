import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
  runOnJS,
  Layout,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { GlassCard } from "@/components/GlassCard";
import { ThemedText } from "@/components/ThemedText";
import { GenerateRecipeButton } from "@/components/GenerateRecipeButton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { storage, FoodItem, getDaysUntilExpiration } from "@/lib/storage";

const LAST_REFRESH_KEY = "@chefspice/waste-tips-last-refresh";
const DISMISSED_TIPS_KEY = "@chefspice/waste-tips-dismissed";
const TIPS_CACHE_KEY = "@chefspice/waste-tips-cache";
const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const TIPS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour local cache

type TipCategory = "recipe" | "storage" | "freeze" | "preserve" | "general";

interface TipAction {
  type: "navigate" | "search" | "external";
  target: string;
  params?: Record<string, string | number | boolean>;
}

interface WasteTip {
  text: string;
  category: TipCategory;
  action?: TipAction;
}

interface ExpiringItem {
  id: number;
  name: string;
  daysUntilExpiry: number;
  quantity: number;
}

interface WasteReductionResponse {
  suggestions: WasteTip[];
  expiringItems: ExpiringItem[];
}

const CATEGORY_ICONS: Record<TipCategory, keyof typeof Feather.glyphMap> = {
  recipe: "book-open",
  storage: "box",
  freeze: "thermometer",
  preserve: "archive",
  general: "zap",
};

const CATEGORY_COLORS: Record<TipCategory, string> = {
  recipe: AppColors.primary,
  storage: AppColors.secondary,
  freeze: "#4FC3F7",
  preserve: AppColors.accent,
  general: AppColors.warning,
};

function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

function generateTipId(tip: WasteTip, index: number): string {
  return `${tip.category}-${tip.text.slice(0, 30)}-${index}`;
}

function getExpiringItems(localItems: FoodItem[]): ExpiringItem[] {
  const today = new Date();
  const fiveDaysFromNow = new Date(today);
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

  return localItems
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
}

async function getCachedTips(): Promise<WasteReductionResponse | null> {
  try {
    const cached = await AsyncStorage.getItem(TIPS_CACHE_KEY);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (Date.now() - parsed.timestamp > TIPS_CACHE_TTL_MS) {
      return null;
    }
    return parsed.data as WasteReductionResponse;
  } catch {
    return null;
  }
}

async function setCachedTips(data: WasteReductionResponse): Promise<void> {
  try {
    await AsyncStorage.setItem(
      TIPS_CACHE_KEY,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      }),
    );
  } catch {
    // Ignore cache write errors
  }
}

async function fetchWasteReductionTips(
  localItems: FoodItem[],
  forceRefresh = false,
): Promise<WasteReductionResponse> {
  const expiringItems = getExpiringItems(localItems);

  if (expiringItems.length === 0) {
    return { suggestions: [], expiringItems: [] };
  }

  // Check local cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = await getCachedTips();
    if (cached && cached.expiringItems.length > 0) {
      // Verify cached items match current expiring items
      const cachedIds = new Set(cached.expiringItems.map((i) => i.id));
      const currentIds = new Set(expiringItems.map((i) => i.id));
      const match =
        cachedIds.size === currentIds.size &&
        [...cachedIds].every((id) => currentIds.has(id));
      if (match) {
        return cached;
      }
    }
  }

  const url = forceRefresh
    ? "/api/suggestions/waste-reduction?refresh=true"
    : "/api/suggestions/waste-reduction";

  const response = await apiRequest("POST", url, { expiringItems });
  const result = (await response.json()) as WasteReductionResponse;

  // Cache the result locally
  await setCachedTips(result);

  return result;
}

interface GlassTheme {
  background: string;
  backgroundStrong: string;
  backgroundSubtle: string;
  border: string;
  borderStrong: string;
  borderSubtle: string;
  overlay: string;
  shadowColor: string;
  insetHighlight: string;
}

interface ThemeColors {
  text: string;
  textSecondary: string;
  textOnGlass: string;
  textSecondaryOnGlass: string;
  buttonText: string;
  tabIconDefault: string;
  tabIconSelected: string;
  link: string;
  backgroundRoot: string;
  backgroundDefault: string;
  backgroundSecondary: string;
  backgroundTertiary: string;
  primary: string;
  secondary: string;
  accent: string;
  warning: string;
  success: string;
  error: string;
  border: string;
  surface: string;
  glass: GlassTheme;
}

interface SwipeableTipProps {
  tip: WasteTip;
  tipId: string;
  onDismiss: (tipId: string) => void;
  onAction: (tip: WasteTip) => void;
  theme: ThemeColors;
}

function SwipeableTip({
  tip,
  tipId,
  onDismiss,
  onAction,
  theme,
}: SwipeableTipProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const height = useSharedValue<number | null>(null);

  const iconName = CATEGORY_ICONS[tip.category] || CATEGORY_ICONS.general;
  const iconColor = CATEGORY_COLORS[tip.category] || CATEGORY_COLORS.general;

  const dismissTip = useCallback(() => {
    onDismiss(tipId);
  }, [tipId, onDismiss]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? 1 : -1;
        translateX.value = withTiming(
          direction * SCREEN_WIDTH,
          { duration: 200 },
          () => {
            opacity.value = withTiming(0, { duration: 100 });
            runOnJS(dismissTip)();
          },
        );
      } else {
        translateX.value = withTiming(0, { duration: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const backgroundStyle = useAnimatedStyle(() => {
    const progress = Math.min(Math.abs(translateX.value) / SWIPE_THRESHOLD, 1);
    return {
      opacity: progress * 0.8,
    };
  });

  return (
    <Animated.View
      style={styles.tipContainer}
      layout={Layout.springify()}
      exiting={FadeOut.duration(200)}
    >
      <Animated.View style={[styles.dismissBackground, backgroundStyle]}>
        <Feather name="x" size={18} color="#fff" />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.tipItem, animatedStyle]}>
          <Pressable style={styles.tipContent} onPress={() => onAction(tip)}>
            <View
              style={[
                styles.categoryIcon,
                { backgroundColor: `${iconColor}20` },
              ]}
            >
              <Feather name={iconName} size={14} color={iconColor} />
            </View>
            <View style={styles.tipTextContainer}>
              <ThemedText type="small" style={styles.tipText} numberOfLines={1}>
                {tip.text}
              </ThemedText>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

export function WasteReductionTips() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExpiringItems, setShowExpiringItems] = useState(false);
  const [localInventory, setLocalInventory] = useState<FoodItem[]>([]);
  const [dismissedTips, setDismissedTips] = useState<Set<string>>(new Set());
  const [hasCheckedDailyRefresh, setHasCheckedDailyRefresh] = useState(false);
  const [cachedData, setCachedData] = useState<WasteReductionResponse | null>(
    null,
  );

  const rotation = useSharedValue(0);
  const badgeScale = useSharedValue(1);

  // Load cached tips AND dismissed tips immediately on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(DISMISSED_TIPS_KEY),
      getCachedTips(),
    ]).then(([dismissedValue, cached]) => {
      if (dismissedValue) {
        try {
          const parsed = JSON.parse(dismissedValue);
          setDismissedTips(new Set(parsed.tips || []));
        } catch {
          setDismissedTips(new Set());
        }
      }
      if (cached) {
        setCachedData(cached);
      }
    });
  }, []);

  useEffect(() => {
    storage.getInventory().then(setLocalInventory);
  }, []);

  const expiringItemsSignature = React.useMemo(() => {
    const today = new Date();
    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

    const expiring = localInventory
      .filter((item) => {
        const expiryDate = new Date(item.expirationDate);
        return expiryDate >= today && expiryDate <= fiveDaysFromNow;
      })
      .map((item) => `${item.id}:${item.expirationDate}:${item.quantity}`)
      .sort()
      .join("|");

    return expiring || "none";
  }, [localInventory]);

  const { data, isLoading, error } = useQuery<WasteReductionResponse>({
    queryKey: ["/api/suggestions/waste-reduction", expiringItemsSignature],
    queryFn: () => fetchWasteReductionTips(localInventory),
    staleTime: 1000 * 60 * 60,
    enabled: localInventory.length > 0 && expiringItemsSignature !== "none",
  });

  const performDailyRefresh = useCallback(async () => {
    const todayStr = getTodayDateString();
    const lastRefresh = await AsyncStorage.getItem(LAST_REFRESH_KEY);

    if (lastRefresh !== todayStr) {
      await AsyncStorage.setItem(LAST_REFRESH_KEY, todayStr);
      setDismissedTips(new Set());
      await AsyncStorage.setItem(
        DISMISSED_TIPS_KEY,
        JSON.stringify({ tips: [], date: todayStr }),
      );

      setIsRefreshing(true);
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false,
      );

      try {
        const freshInventory = await storage.getInventory();
        setLocalInventory(freshInventory);
        await fetchWasteReductionTips(freshInventory, true);
        queryClient.invalidateQueries({
          queryKey: ["/api/suggestions/waste-reduction"],
        });
      } finally {
        setIsRefreshing(false);
        cancelAnimation(rotation);
        rotation.value = 0;
      }
    }
  }, [queryClient, rotation]);

  useEffect(() => {
    if (
      localInventory.length > 0 &&
      expiringItemsSignature !== "none" &&
      !hasCheckedDailyRefresh
    ) {
      setHasCheckedDailyRefresh(true);
      performDailyRefresh();
    }
  }, [
    localInventory,
    expiringItemsSignature,
    hasCheckedDailyRefresh,
    performDailyRefresh,
  ]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const badgePulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  const expiringItemsForAnimation =
    data?.expiringItems || cachedData?.expiringItems;
  React.useEffect(() => {
    if (expiringItemsForAnimation && expiringItemsForAnimation.length > 0) {
      badgeScale.value = withRepeat(
        withSequence(
          withTiming(1.1, {
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
    return () => {
      cancelAnimation(badgeScale);
    };
  }, [expiringItemsForAnimation]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
      false,
    );

    try {
      const freshInventory = await storage.getInventory();
      setLocalInventory(freshInventory);
      setDismissedTips(new Set());
      await AsyncStorage.setItem(
        DISMISSED_TIPS_KEY,
        JSON.stringify({ tips: [], date: getTodayDateString() }),
      );
      await fetchWasteReductionTips(freshInventory, true);
      queryClient.invalidateQueries({
        queryKey: ["/api/suggestions/waste-reduction"],
      });
      await AsyncStorage.setItem(LAST_REFRESH_KEY, getTodayDateString());
    } finally {
      setIsRefreshing(false);
      cancelAnimation(rotation);
      rotation.value = 0;
    }
  };

  const handleDismissTip = useCallback(async (tipId: string) => {
    setDismissedTips((prev) => {
      const newSet = new Set(prev);
      newSet.add(tipId);
      AsyncStorage.setItem(
        DISMISSED_TIPS_KEY,
        JSON.stringify({
          tips: Array.from(newSet),
          date: getTodayDateString(),
        }),
      );
      return newSet;
    });
  }, []);

  const handleTipAction = (tip: WasteTip) => {
    if (!tip.action) {
      return;
    }

    const { action } = tip;

    switch (action.type) {
      case "search":
        if (action.target === "recipes" && action.params?.query) {
          navigation.navigate("RecipesTab", {
            screen: "Recipes",
            params: {
              searchQuery: action.params.query,
            },
          });
        }
        break;

      case "navigate":
        if (action.target === "storageGuide") {
          Alert.alert(
            "Storage Tips",
            "Keep fruits and vegetables in proper containers. Store dairy on middle shelves where temperature is most consistent. Raw meats should be on bottom shelf to prevent drips.",
            [{ text: "Got it" }],
          );
        } else if (
          action.target === "editItem" &&
          expiringItemsForAnimation?.[0]
        ) {
          const expiringItem = expiringItemsForAnimation[0];
          Alert.alert(
            "Move to Freezer",
            `Would you like to move "${expiringItem.name}" to the freezer to extend its shelf life?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Move",
                onPress: () => {
                  navigation.navigate("Inventory", {
                    screen: "EditItem",
                    params: {
                      itemId: expiringItem.id,
                      suggestedLocation: "freezer",
                    },
                  });
                },
              },
            ],
          );
        }
        break;

      case "external":
        break;
    }
  };

  const visibleSuggestions = React.useMemo(() => {
    const suggestions = data?.suggestions || cachedData?.suggestions;
    if (!suggestions) return [];
    return suggestions
      .map((tip, index) => ({
        tip,
        tipId: generateTipId(tip, index),
      }))
      .filter(({ tipId }) => !dismissedTips.has(tipId));
  }, [data?.suggestions, cachedData?.suggestions, dismissedTips]);

  // Use query data if available, otherwise fall back to cached data
  const displayData = data || cachedData;

  // Only show loading if we have no data at all (neither query nor cached)
  if (isLoading && !displayData && !hasCheckedDailyRefresh) {
    return (
      <GlassCard
        intensity="regular"
        style={styles.card}
        contentStyle={styles.loadingContainer}
      >
        <ActivityIndicator size="small" color={theme.primary} />
        <ThemedText type="small" style={styles.loadingText}>
          Loading tips...
        </ThemedText>
      </GlassCard>
    );
  }

  if (error && !displayData) {
    return null;
  }

  if (!displayData || displayData.expiringItems.length === 0) {
    return null;
  }

  const hasVisibleTips = visibleSuggestions.length > 0;

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <GlassCard intensity="regular" style={styles.card}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Feather name="zap" size={20} color={theme.primary} />
            <ThemedText type="h4" style={styles.title}>
              Waste Reduction Tips
            </ThemedText>
          </View>

          <View style={styles.headerRight}>
            <Pressable onPress={() => setShowExpiringItems(!showExpiringItems)}>
              <Animated.View
                style={[
                  styles.badge,
                  { backgroundColor: theme.warning },
                  badgePulseStyle,
                ]}
              >
                <ThemedText
                  type="caption"
                  style={styles.badgeText}
                  lightColor="#fff"
                  darkColor="#fff"
                >
                  {displayData.expiringItems.length} expiring
                </ThemedText>
              </Animated.View>
            </Pressable>

            <Pressable
              onPress={handleRefresh}
              disabled={isRefreshing}
              style={styles.refreshButton}
            >
              <Animated.View style={spinStyle}>
                <Feather
                  name="refresh-cw"
                  size={18}
                  color={isRefreshing ? theme.textSecondary : theme.primary}
                />
              </Animated.View>
            </Pressable>
          </View>
        </View>

        {showExpiringItems ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.expiringList}
          >
            {displayData.expiringItems.map((item) => (
              <View key={item.id} style={styles.expiringItem}>
                <Feather
                  name="alert-circle"
                  size={14}
                  color={
                    item.daysUntilExpiry < 0 || item.daysUntilExpiry <= 1 ? theme.error : theme.warning
                  }
                />
                <ThemedText type="small" style={styles.expiringItemText}>
                  {item.name} ({item.quantity}x) -{" "}
                  {item.daysUntilExpiry < 0
                    ? "Expired"
                    : item.daysUntilExpiry === 0
                      ? "Today"
                      : item.daysUntilExpiry === 1
                        ? "Tomorrow"
                        : `${item.daysUntilExpiry} days`}
                </ThemedText>
              </View>
            ))}
          </Animated.View>
        ) : null}

        {hasVisibleTips ? (
          <View style={styles.tipsList}>
            <View style={styles.swipeHintRow}>
              <Feather
                name="chevrons-left"
                size={12}
                color={theme.textSecondary}
              />
              <ThemedText
                type="caption"
                style={[styles.swipeHint, { color: theme.textSecondary }]}
              >
                Swipe tips to dismiss
              </ThemedText>
            </View>
            {visibleSuggestions.map(({ tip, tipId }) => (
              <SwipeableTip
                key={tipId}
                tip={tip}
                tipId={tipId}
                onDismiss={handleDismissTip}
                onAction={handleTipAction}
                theme={theme}
              />
            ))}
          </View>
        ) : (
          <View style={styles.allDismissed}>
            <Feather name="check-circle" size={24} color={theme.success} />
            <ThemedText type="small" style={styles.allDismissedText}>
              All tips reviewed! Tap refresh for new tips.
            </ThemedText>
          </View>
        )}

        <GenerateRecipeButton style={styles.generateButton} />
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {},
  loadingContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: Spacing.sm,
  },
  loadingText: {
    marginLeft: Spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  title: {
    marginBottom: 0,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  badgeText: {
    fontWeight: "600",
  },
  refreshButton: {
    padding: Spacing.xs,
  },
  expiringList: {
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  expiringItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  expiringItemText: {
    flex: 1,
  },
  tipsList: {
    gap: Spacing.sm,
  },
  tipContainer: {
    position: "relative",
    overflow: "hidden",
    borderRadius: BorderRadius.md,
  },
  dismissBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: AppColors.error,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.md,
  },
  tipItem: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: BorderRadius.md,
  },
  tipContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  categoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tipTextContainer: {
    flex: 1,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 16,
  },
  swipeHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  swipeHint: {
    fontSize: 11,
  },
  allDismissed: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  allDismissedText: {},
  generateButton: {
    marginTop: Spacing.lg,
  },
});
