import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { NutritionBadge } from "@/components/nutrition/NutritionBadge";
import { Spacing, AppColors } from "@/constants/theme";
import type { NutritionInfo } from "@/lib/storage";
import type { ThemeColors } from "@/lib/types";

interface RecipeNutritionCardProps {
  nutrition: NutritionInfo;
  theme: ThemeColors;
}

export function RecipeNutritionCard({ nutrition, theme }: RecipeNutritionCardProps) {
  return (
    <GlassCard style={styles.nutritionCard}>
      <View style={styles.nutritionHeader}>
        <View style={styles.nutritionTitleRow}>
          <Feather name="zap" size={18} color={theme.text} />
          <ThemedText type="h4">Nutrition</ThemedText>
        </View>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          per serving
        </ThemedText>
      </View>
      <View style={styles.nutritionContent}>
        <View style={styles.caloriesDisplay}>
          <ThemedText type="h2" style={{ color: AppColors.primary }}>
            {nutrition.calories}
          </ThemedText>
          <ThemedText type="caption">calories</ThemedText>
        </View>
        <View style={styles.macrosDisplay}>
          <NutritionBadge
            nutrition={nutrition}
            quantity={1}
            showCalories={false}
            showMacros={true}
          />
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  nutritionCard: {
    gap: Spacing.md,
  },
  nutritionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nutritionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  nutritionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  caloriesDisplay: {
    alignItems: "flex-start",
  },
  macrosDisplay: {
    alignItems: "flex-end",
  },
});
