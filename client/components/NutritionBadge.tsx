import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { NutritionInfo } from "@/lib/storage";

interface NutritionBadgeProps {
  nutrition: NutritionInfo;
  quantity?: number;
  showCalories?: boolean;
  showMacros?: boolean;
}

export function NutritionBadge({
  nutrition,
  quantity = 1,
  showCalories = true,
  showMacros = true,
}: NutritionBadgeProps) {
  const { theme } = useTheme();

  const calories = Math.round(nutrition.calories * quantity);
  const protein = Math.round(nutrition.protein * quantity);
  const carbs = Math.round(nutrition.carbs * quantity);
  const fat = Math.round(nutrition.fat * quantity);

  const totalMacroGrams = protein + carbs + fat;
  const proteinPercent =
    totalMacroGrams > 0 ? Math.round((protein / totalMacroGrams) * 100) : 0;
  const carbsPercent =
    totalMacroGrams > 0 ? Math.round((carbs / totalMacroGrams) * 100) : 0;
  const fatPercent =
    totalMacroGrams > 0 ? Math.round((fat / totalMacroGrams) * 100) : 0;

  return (
    <View style={styles.wrapper}>
      {showCalories ? (
        <View
          style={[
            styles.calorieRow,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="zap" size={12} color={theme.textSecondary} />
          <ThemedText
            type="caption"
            style={[styles.text, { color: theme.textSecondary }]}
          >
            {calories} cal
          </ThemedText>
        </View>
      ) : null}
      {showMacros ? (
        <View style={styles.macroRow}>
          <View
            style={[
              styles.macroBadge,
              { backgroundColor: "rgba(46, 204, 113, 0.15)" },
            ]}
          >
            <ThemedText
              type="caption"
              style={[styles.macroText, { color: theme.success }]}
            >
              P {protein}g
            </ThemedText>
            <ThemedText
              type="caption"
              style={[styles.percentText, { color: theme.success }]}
            >
              {proteinPercent}%
            </ThemedText>
          </View>
          <View
            style={[
              styles.macroBadge,
              { backgroundColor: "rgba(52, 152, 219, 0.15)" },
            ]}
          >
            <ThemedText
              type="caption"
              style={[styles.macroText, { color: theme.accent }]}
            >
              C {carbs}g
            </ThemedText>
            <ThemedText
              type="caption"
              style={[styles.percentText, { color: theme.accent }]}
            >
              {carbsPercent}%
            </ThemedText>
          </View>
          <View
            style={[
              styles.macroBadge,
              { backgroundColor: "rgba(230, 126, 34, 0.15)" },
            ]}
          >
            <ThemedText
              type="caption"
              style={[styles.macroText, { color: theme.secondary }]}
            >
              F {fat}g
            </ThemedText>
            <ThemedText
              type="caption"
              style={[styles.percentText, { color: theme.secondary }]}
            >
              {fatPercent}%
            </ThemedText>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "flex-end",
    gap: 4,
  },
  calorieRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: "500",
  },
  macroRow: {
    flexDirection: "row",
    gap: 4,
  },
  macroBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    gap: 2,
  },
  macroText: {
    fontSize: 9,
    fontWeight: "600",
  },
  percentText: {
    fontSize: 8,
    fontWeight: "500",
    opacity: 0.8,
  },
});
