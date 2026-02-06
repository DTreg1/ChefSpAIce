import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "./ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, AppColors } from "@/constants/theme";
import type { NutritionInfo } from "@/lib/storage";
import {
  calculateNutritionScore,
  getScoreDescription,
} from "@/lib/nutrition-score";

interface NutritionScoreBadgeProps {
  nutrition: NutritionInfo;
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
  onPress?: () => void;
}

export function NutritionScoreBadge({
  nutrition,
  size = "small",
  showLabel = false,
  onPress,
}: NutritionScoreBadgeProps) {
  const scoreResult = calculateNutritionScore(nutrition);

  const badgeSize = size === "large" ? 36 : size === "medium" ? 28 : 22;
  const fontSize = size === "large" ? 16 : size === "medium" ? 13 : 11;
  const labelSize = size === "large" ? 12 : size === "medium" ? 10 : 8;

  if (scoreResult.grade === "?") {
    return null;
  }

  const content = (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`Nutrition score: ${scoreResult.score} out of 100, grade ${scoreResult.grade}, ${scoreResult.label}`}
    >
      <View
        style={[
          styles.badge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: badgeSize / 2,
            backgroundColor: scoreResult.color,
          },
        ]}
      >
        <ThemedText
          style={[
            styles.gradeText,
            {
              fontSize,
              color: "#FFFFFF",
            },
          ]}
        >
          {scoreResult.grade}
        </ThemedText>
      </View>
      {showLabel ? (
        <ThemedText
          type="caption"
          style={[
            styles.label,
            {
              fontSize: labelSize,
              color: scoreResult.color,
            },
          ]}
        >
          {scoreResult.label}
        </ThemedText>
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityHint="Tap to view nutrition details"
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

interface NutritionScoreDetailProps {
  nutrition: NutritionInfo;
}

export function NutritionScoreDetail({ nutrition }: NutritionScoreDetailProps) {
  const { theme } = useTheme();
  const scoreResult = calculateNutritionScore(nutrition);
  const description = getScoreDescription(scoreResult);

  if (scoreResult.grade === "?") {
    return (
      <View
        style={[
          styles.incompleteContainer,
          {
            backgroundColor: theme.glass.background,
            borderColor: theme.glass.border,
          },
        ]}
      >
        <View style={styles.incompleteHeader}>
          <Feather name="help-circle" size={24} color={theme.textSecondary} />
          <View style={styles.incompleteInfo}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Nutrition Score Unavailable
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, opacity: 0.7 }}
            >
              {description}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.detailContainer,
        {
          backgroundColor: theme.glass.background,
          borderColor: theme.glass.border,
        },
      ]}
    >
      <View style={styles.detailHeader}>
        <View
          style={[styles.largeBadge, { backgroundColor: scoreResult.color }]}
        >
          <ThemedText style={styles.largeGradeText}>
            {scoreResult.grade}
          </ThemedText>
        </View>
        <View style={styles.detailInfo}>
          <ThemedText type="h4" style={{ color: scoreResult.color }}>
            {scoreResult.label}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            Nutrition Score: {scoreResult.score}/100
          </ThemedText>
        </View>
      </View>

      <View style={styles.scoreBar}>
        <View
          style={[
            styles.scoreBarFill,
            {
              width: `${scoreResult.score}%`,
              backgroundColor: scoreResult.color,
            },
          ]}
        />
      </View>

      <ThemedText
        type="small"
        style={[styles.description, { color: theme.textSecondary }]}
      >
        {description}
      </ThemedText>

      {scoreResult.isIncomplete ? (
        <View style={styles.partialWarning}>
          <Feather name="info" size={12} color={AppColors.warning} />
          <ThemedText type="caption" style={{ color: AppColors.warning }}>
            Score based on partial nutrition data
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badge: {
    alignItems: "center",
    justifyContent: "center",
  },
  gradeText: {
    fontWeight: "700",
  },
  label: {
    fontWeight: "600",
  },
  detailContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  largeBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  largeGradeText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  detailInfo: {
    flex: 1,
    gap: 2,
  },
  scoreBar: {
    height: 6,
    backgroundColor: "rgba(128, 128, 128, 0.2)",
    borderRadius: 3,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  description: {
    textAlign: "center",
    opacity: 0.8,
  },
  partialWarning: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: Spacing.xs,
  },
  incompleteContainer: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  incompleteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  incompleteInfo: {
    flex: 1,
    gap: 2,
  },
});
