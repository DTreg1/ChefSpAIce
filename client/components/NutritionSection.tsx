import React, { useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";

import { ThemedText } from "./ThemedText";
import { GlassCard } from "./GlassCard";
import { GlassButton } from "./GlassButton";
import { NutritionLabel } from "./NutritionLabel";
import { NutritionScoreBadge, NutritionScoreDetail } from "./NutritionScoreBadge";
import { NutritionCorrectionModal } from "./NutritionCorrectionModal";
import { useTheme } from "@/hooks/useTheme";
import type { NutritionInfo } from "@/lib/storage";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import type { NutritionFacts } from "@shared/schema";

interface NutritionResponse {
  nutrition: NutritionFacts;
  source: "usda" | "openfoodfacts" | "ai" | "cache";
  originalSource?: "usda" | "openfoodfacts" | "ai";
  sourceId?: string | number;
  foodName?: string;
  incomplete: boolean;
  cached: boolean;
  warning?: string;
}

interface NutritionSectionProps {
  foodId: string;
  foodName: string;
  defaultQuantity?: number;
  barcode?: string;
  brand?: string;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    servingSize?: string;
  };
  onSearchNutrition?: () => void;
  onManualEntry?: () => void;
}

const SOURCE_LABELS: Record<string, string> = {
  usda: "USDA FoodData Central",
  openfoodfacts: "Open Food Facts",
  ai: "AI Estimate",
  cache: "Cached",
  local: "Saved Data",
};

function isValidUSDAId(id: string): boolean {
  const numericId = parseInt(id, 10);
  return !isNaN(numericId) && numericId > 0 && String(numericId) === id;
}

async function fetchNutrition(
  foodId: string,
  foodName: string,
): Promise<NutritionResponse | null> {
  const baseUrl = getApiUrl();

  const hasValidUSDAId = isValidUSDAId(foodId);

  if (hasValidUSDAId) {
    try {
      const directUrl = new URL(
        `/api/nutrition/${encodeURIComponent(foodId)}`,
        baseUrl,
      );
      const directRes = await fetch(directUrl, { credentials: "include" });
      if (directRes.ok) {
        return directRes.json();
      }
    } catch (e) {
      console.warn("Nutrition fetch error:", e);
    }
  }

  try {
    const estimateUrl = new URL("/api/nutrition/estimate", baseUrl);
    const estimateRes = await fetch(estimateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foodName }),
      credentials: "include",
    });

    if (estimateRes.ok) {
      return estimateRes.json();
    }
  } catch (e) {
    console.warn("Nutrition estimate error:", e);
  }

  return null;
}

function convertToNutritionFacts(
  nutrition: NutritionSectionProps["nutrition"],
): NutritionFacts | null {
  if (!nutrition) return null;
  return {
    servingSize: nutrition.servingSize || "1 serving",
    calories: nutrition.calories,
    totalFat: nutrition.fat,
    sodium: nutrition.sodium ?? 0,
    totalCarbohydrates: nutrition.carbs,
    protein: nutrition.protein,
    dietaryFiber: nutrition.fiber,
    totalSugars: nutrition.sugar,
  };
}

export function NutritionSection({
  foodId,
  foodName,
  defaultQuantity = 1,
  barcode,
  brand,
  nutrition: existingNutrition,
  onSearchNutrition,
  onManualEntry,
}: NutritionSectionProps) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [servingCount, setServingCount] = useState(defaultQuantity);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const expandProgress = useSharedValue(0);

  const hasExistingNutrition = !!existingNutrition;

  const {
    data: fetchedData,
    isLoading,
    error,
    refetch,
  } = useQuery<NutritionResponse | null>({
    queryKey: ["/api/nutrition", foodId, foodName],
    queryFn: () => fetchNutrition(foodId, foodName),
    enabled: !!foodId && !!foodName && !hasExistingNutrition,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const data: NutritionResponse | null = hasExistingNutrition
    ? {
        nutrition: convertToNutritionFacts(existingNutrition)!,
        source: "cache",
        originalSource: "usda",
        incomplete: false,
        cached: false,
      }
    : (fetchedData ?? null);

  const effectiveIsLoading = !hasExistingNutrition && isLoading;

  const toggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    expandProgress.value = withTiming(newExpanded ? 1 : 0, { duration: 300 });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${interpolate(expandProgress.value, [0, 1], [0, 180])}deg` },
    ],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: expandProgress.value,
    maxHeight: interpolate(expandProgress.value, [0, 1], [0, 1000]),
  }));

  const adjustServing = (delta: number) => {
    setServingCount((prev) => Math.max(1, prev + delta));
  };

  const getSourceLabel = () => {
    if (!data) return "";
    const source = data.originalSource || data.source;
    return SOURCE_LABELS[source] || source;
  };

  const getServingText = () => {
    return servingCount === 1 ? "per serving" : `per ${servingCount} servings`;
  };

  const getNutritionInfoForScore = (): NutritionInfo | null => {
    if (existingNutrition) {
      return existingNutrition;
    }
    if (data?.nutrition) {
      return {
        calories: data.nutrition.calories,
        protein: data.nutrition.protein,
        carbs: data.nutrition.totalCarbohydrates,
        fat: data.nutrition.totalFat,
        fiber: data.nutrition.dietaryFiber,
        sugar: data.nutrition.totalSugars,
        sodium: data.nutrition.sodium,
      };
    }
    return null;
  };

  const nutritionForScore = getNutritionInfoForScore();

  const renderContent = () => {
    if (effectiveIsLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={AppColors.primary} />
          <ThemedText type="small" style={styles.loadingText}>
            Loading nutrition data...
          </ThemedText>
        </View>
      );
    }

    if (error || !data) {
      return (
        <View style={styles.noDataContainer}>
          <Feather name="alert-circle" size={32} color={theme.textSecondary} />
          <ThemedText type="body" style={styles.noDataText}>
            No nutrition data available
          </ThemedText>
          <ThemedText type="small" style={styles.noDataSubtext}>
            We could not find nutrition information for this item.
          </ThemedText>
          <View style={styles.noDataActions}>
            {onSearchNutrition ? (
              <GlassButton
                variant="outline"
                onPress={onSearchNutrition}
                style={styles.noDataButton}
                icon={
                  <Feather name="search" size={16} color={AppColors.primary} />
                }
              >
                <ThemedText style={{ color: AppColors.primary }}>
                  Search
                </ThemedText>
              </GlassButton>
            ) : null}
            {onManualEntry ? (
              <GlassButton
                variant="outline"
                onPress={onManualEntry}
                style={styles.noDataButton}
                icon={
                  <Feather name="edit-2" size={16} color={AppColors.primary} />
                }
              >
                <ThemedText style={{ color: AppColors.primary }}>
                  Enter Manually
                </ThemedText>
              </GlassButton>
            ) : null}
            <GlassButton
              variant="outline"
              onPress={() => refetch()}
              style={styles.noDataButton}
              icon={
                <Feather
                  name="refresh-cw"
                  size={16}
                  color={theme.textSecondary}
                />
              }
            >
              <ThemedText style={{ color: theme.textSecondary }}>
                Retry
              </ThemedText>
            </GlassButton>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.nutritionContent}>
        {nutritionForScore ? (
          <NutritionScoreDetail nutrition={nutritionForScore} />
        ) : null}

        <View style={styles.servingAdjuster}>
          <ThemedText type="small" style={styles.servingLabel}>
            Servings
          </ThemedText>
          <View style={styles.servingControls}>
            <Pressable
              style={[
                styles.servingButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={() => adjustServing(-1)}
            >
              <Feather name="minus" size={18} color={theme.text} />
            </Pressable>
            <ThemedText type="h4" style={styles.servingCount}>
              {servingCount}
            </ThemedText>
            <Pressable
              style={[
                styles.servingButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
              onPress={() => adjustServing(1)}
            >
              <Feather name="plus" size={18} color={theme.text} />
            </Pressable>
          </View>
          <ThemedText type="caption" style={styles.servingContext}>
            {getServingText()}
          </ThemedText>
        </View>

        <NutritionLabel
          nutrition={data.nutrition}
          quantity={servingCount}
          style={styles.nutritionLabel}
        />

        {data.incomplete ? (
          <View style={styles.warningBanner}>
            <Feather
              name="alert-triangle"
              size={14}
              color={AppColors.warning}
            />
            <ThemedText type="caption" style={styles.warningText}>
              Some nutrition values may be estimated
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.attribution}>
          <ThemedText type="caption" style={styles.attributionText}>
            Source: {getSourceLabel()}
          </ThemedText>
          {data.cached ? (
            <ThemedText type="caption" style={styles.attributionText}>
              {" "}
              (cached)
            </ThemedText>
          ) : null}
        </View>

        <Pressable
          style={styles.reportIssueButton}
          onPress={() => setShowCorrectionModal(true)}
        >
          <Feather name="flag" size={14} color={theme.textSecondary} />
          <ThemedText type="caption" style={styles.reportIssueText}>
            Report incorrect info
          </ThemedText>
        </Pressable>
      </View>
    );
  };

  return (
    <GlassCard style={styles.container}>
      <Pressable style={styles.header} onPress={toggleExpand}>
        <View style={styles.headerLeft}>
          <Feather name="activity" size={20} color={AppColors.primary} />
          <ThemedText type="h4" style={styles.headerTitle}>
            Nutrition Information
          </ThemedText>
          {nutritionForScore ? (
            <NutritionScoreBadge nutrition={nutritionForScore} size="small" />
          ) : null}
        </View>
        <Animated.View style={chevronStyle}>
          <Feather name="chevron-down" size={24} color={theme.textSecondary} />
        </Animated.View>
      </Pressable>

      {!isExpanded && data ? (
        <View style={styles.collapsedPreview}>
          <NutritionLabel
            nutrition={data.nutrition}
            quantity={servingCount}
            compact
          />
          <ThemedText type="caption" style={styles.collapsedServingContext}>
            {getServingText()}
          </ThemedText>
        </View>
      ) : null}

      {isExpanded ? (
        <Animated.View style={[styles.expandedContent, contentStyle]}>
          {renderContent()}
        </Animated.View>
      ) : null}

      <NutritionCorrectionModal
        visible={showCorrectionModal}
        onClose={() => setShowCorrectionModal(false)}
        productName={foodName}
        barcode={barcode}
        brand={brand}
        originalSource={data?.originalSource || data?.source}
        originalSourceId={data?.sourceId?.toString()}
        originalNutrition={data?.nutrition}
      />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  headerTitle: {
    marginBottom: 0,
  },
  collapsedPreview: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  collapsedServingContext: {
    opacity: 0.5,
    fontSize: 11,
  },
  expandedContent: {
    overflow: "hidden",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  loadingText: {
    opacity: 0.7,
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  noDataText: {
    marginTop: Spacing.sm,
    fontWeight: "600",
  },
  noDataSubtext: {
    opacity: 0.7,
    textAlign: "center",
  },
  noDataActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  noDataButton: {
    paddingHorizontal: Spacing.md,
  },
  nutritionContent: {
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  servingAdjuster: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  servingLabel: {
    opacity: 0.7,
  },
  servingControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  servingButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  servingCount: {
    minWidth: 40,
    textAlign: "center",
  },
  servingContext: {
    opacity: 0.6,
  },
  nutritionLabel: {
    marginTop: Spacing.sm,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: "rgba(255, 193, 7, 0.15)",
    borderRadius: BorderRadius.sm,
  },
  warningText: {
    color: "#856404",
  },
  attribution: {
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: Spacing.sm,
  },
  attributionText: {
    opacity: 0.5,
    fontSize: 11,
  },
  reportIssueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  reportIssueText: {
    opacity: 0.6,
  },
});

export default NutritionSection;
