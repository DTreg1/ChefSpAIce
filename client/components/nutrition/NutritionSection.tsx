import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { NutritionLabel } from "./NutritionLabel";
import {
  NutritionScoreBadge,
  NutritionScoreDetail,
} from "./NutritionScoreBadge";
import { NutritionCorrectionModal } from "./NutritionCorrectionModal";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors, Typography } from "@/constants/theme";
import { AnimationDurations } from "@/constants/animations";
import type { NutritionFacts } from "@shared/schema";

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
}: NutritionSectionProps) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [servingCount, setServingCount] = useState(defaultQuantity);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const expandProgress = useSharedValue(0);

  const nutritionFacts = convertToNutritionFacts(existingNutrition);
  const hasNutrition = !!nutritionFacts;

  const toggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    expandProgress.value = withTiming(newExpanded ? 1 : 0, { duration: AnimationDurations.moderate });
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

  const getServingText = () => {
    return servingCount === 1 ? "per serving" : `per ${servingCount} servings`;
  };

  const renderContent = () => {
    if (!hasNutrition || !nutritionFacts) {
      return (
        <View style={styles.noDataContainer}>
          <Feather name="alert-circle" size={32} color={theme.textSecondary} />
          <ThemedText type="body" style={styles.noDataText}>
            No nutrition data available
          </ThemedText>
          <ThemedText type="small" style={styles.noDataSubtext}>
            Items added via the food search include USDA nutrition data.
          </ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.nutritionContent}>
        {existingNutrition && (
          <NutritionScoreDetail nutrition={existingNutrition} />
        )}

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
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel="Decrease serving"
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
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              accessibilityRole="button"
              accessibilityLabel="Increase serving"
            >
              <Feather name="plus" size={18} color={theme.text} />
            </Pressable>
          </View>
          <ThemedText type="caption" style={styles.servingContext}>
            {getServingText()}
          </ThemedText>
        </View>

        <NutritionLabel
          nutrition={nutritionFacts}
          quantity={servingCount}
          style={styles.nutritionLabel}
        />

        <View style={styles.attribution}>
          <ThemedText type="caption" style={styles.attributionText}>
            Source: USDA FoodData Central
          </ThemedText>
        </View>

        <Pressable
          style={styles.reportIssueButton}
          onPress={() => setShowCorrectionModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Report incorrect nutrition info"
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
      <Pressable style={styles.header} onPress={toggleExpand} accessibilityRole="button" accessibilityLabel={isExpanded ? "Collapse nutrition information" : "Expand nutrition information"}>
        <View style={styles.headerLeft}>
          <Feather name="activity" size={20} color={AppColors.primary} />
          <ThemedText type="h4" style={styles.headerTitle}>
            Nutrition Information
          </ThemedText>
          {existingNutrition ? (
            <NutritionScoreBadge nutrition={existingNutrition} size="small" />
          ) : null}
        </View>
        <Animated.View style={chevronStyle}>
          <Feather name="chevron-down" size={24} color={theme.textSecondary} />
        </Animated.View>
      </Pressable>

      {!isExpanded && hasNutrition && nutritionFacts ? (
        <View style={styles.collapsedPreview}>
          <NutritionLabel
            nutrition={nutritionFacts}
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
        originalSource="usda"
        originalNutrition={nutritionFacts || undefined}
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
    fontSize: Typography.tiny.fontSize,
  },
  expandedContent: {
    overflow: "hidden",
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
    minHeight: 44,
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
  attribution: {
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: Spacing.sm,
  },
  attributionText: {
    opacity: 0.5,
    fontSize: Typography.tiny.fontSize,
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
