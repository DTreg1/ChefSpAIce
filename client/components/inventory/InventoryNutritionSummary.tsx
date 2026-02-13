import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { Spacing, AppColors } from "@/constants/theme";

interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  itemsWithNutrition: number;
}

interface InventoryNutritionSummaryProps {
  nutritionTotals: NutritionTotals;
}

export function InventoryNutritionSummary({
  nutritionTotals,
}: InventoryNutritionSummaryProps) {
  return (
    <View style={styles.listFooter} accessibilityLiveRegion="polite">
      <GlassCard style={styles.nutritionSummary} accessibilityLabel={`Nutrition summary: ${nutritionTotals.calories.toLocaleString()} calories, ${nutritionTotals.protein}g protein, ${nutritionTotals.carbs}g carbs, ${nutritionTotals.fat}g fat`}>
        <View style={styles.nutritionSummaryContent}>
          <Feather name="zap" size={16} color={AppColors.primary} />
          <ThemedText type="caption" style={styles.nutritionSummaryText}>
            {nutritionTotals.calories.toLocaleString()} cal |{" "}
            {nutritionTotals.protein}g protein | {nutritionTotals.carbs}g
            carbs | {nutritionTotals.fat}g fat
          </ThemedText>
        </View>
        <ThemedText type="caption" style={styles.nutritionSummaryMeta}>
          Based on {nutritionTotals.itemsWithNutrition} items with nutrition
          data
        </ThemedText>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  listFooter: {},
  nutritionSummary: {
    gap: Spacing.sm,
  },
  nutritionSummaryContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  nutritionSummaryText: {
    flex: 1,
    flexShrink: 1,
  },
  nutritionSummaryMeta: {
    marginTop: Spacing.xs,
    marginLeft: Spacing.xl,
  },
});
