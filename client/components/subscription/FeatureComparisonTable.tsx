import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";

export const PRO_FEATURES = [
  { key: "pantryItems", name: "Pantry Items", free: "10" as string | boolean, basic: "25" as string | boolean, pro: "Unlimited" as string | boolean },
  { key: "aiRecipes", name: "AI Recipes/Month", free: "2" as string | boolean, basic: "5" as string | boolean, pro: "Unlimited" as string | boolean },
  { key: "cookware", name: "Cookware Items", free: "3" as string | boolean, basic: "5" as string | boolean, pro: "Unlimited" as string | boolean },
  { key: "recipeScanning", name: "Recipe Scanning", free: false as string | boolean, basic: false as string | boolean, pro: true as string | boolean },
  { key: "bulkScanning", name: "Bulk Scanning", free: false as string | boolean, basic: false as string | boolean, pro: true as string | boolean },
  { key: "aiAssistant", name: "Live AI Kitchen Assistant", free: false as string | boolean, basic: false as string | boolean, pro: true as string | boolean },
  { key: "customStorage", name: "Custom Storage Areas", free: false as string | boolean, basic: false as string | boolean, pro: true as string | boolean },
  { key: "weeklyMealPrep", name: "Weekly Meal Prepping", free: false as string | boolean, basic: false as string | boolean, pro: true as string | boolean },
];

export type ProFeature = (typeof PRO_FEATURES)[number];

interface FeatureComparisonTableProps {
  features: ProFeature[];
  isProUser: boolean;
}

export function FeatureComparisonTable({
  features,
  isProUser,
}: FeatureComparisonTableProps) {
  const { theme } = useTheme();

  return (
    <GlassCard style={styles.featuresCard}>
      <View style={styles.sectionHeader}>
        <Feather
          name="layers"
          size={20}
          color={theme.textSecondaryOnGlass}
        />
        <ThemedText
          style={[
            styles.sectionTitle,
            { color: theme.textSecondaryOnGlass },
          ]}
        >
          Feature Comparison
        </ThemedText>
      </View>
      <View style={styles.comparisonHeader}>
        <ThemedText style={[styles.featureLabel, { flex: 1 }]}>
          Feature
        </ThemedText>
        <ThemedText
          style={[styles.tierLabel, { color: theme.textSecondary }]}
        >
          Free
        </ThemedText>
        <ThemedText
          style={[styles.tierLabel, { color: theme.textSecondary }]}
        >
          Basic
        </ThemedText>
        <ThemedText
          style={[styles.tierLabel, { color: AppColors.warning }]}
        >
          Pro
        </ThemedText>
      </View>

      {features.map((feature, index) => {
        const isUpgradeHighlight = !isProUser && feature.pro === true;
        return (
          <View
            key={feature.key}
            style={[
              styles.featureRow,
              index === features.length - 1 && styles.featureRowLast,
              isUpgradeHighlight && {
                backgroundColor: `${AppColors.primary}08`,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.featureName,
                { color: theme.textSecondaryOnGlass },
              ]}
              numberOfLines={2}
            >
              {feature.name}
            </ThemedText>
            <View style={styles.tierValue}>
              {typeof feature.free === "boolean" ? (
                <Feather
                  name={feature.free ? "check" : "x"}
                  size={16}
                  color={
                    feature.free ? AppColors.success : theme.textSecondary
                  }
                />
              ) : (
                <ThemedText
                  style={[
                    styles.tierValueText,
                    { color: theme.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {feature.free}
                </ThemedText>
              )}
            </View>
            <View style={styles.tierValue}>
              {typeof feature.basic === "boolean" ? (
                <Feather
                  name={feature.basic ? "check" : "x"}
                  size={16}
                  color={
                    feature.basic ? AppColors.success : theme.textSecondary
                  }
                />
              ) : (
                <ThemedText
                  style={[
                    styles.tierValueText,
                    { color: theme.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {feature.basic}
                </ThemedText>
              )}
            </View>
            <View style={styles.tierValue}>
              {typeof feature.pro === "boolean" ? (
                <Feather
                  name={feature.pro ? "check" : "x"}
                  size={16}
                  color={
                    feature.pro ? AppColors.success : theme.textSecondary
                  }
                />
              ) : (
                <ThemedText
                  style={[
                    styles.tierValueText,
                    { color: AppColors.success },
                  ]}
                  numberOfLines={1}
                >
                  {feature.pro}
                </ThemedText>
              )}
            </View>
          </View>
        );
      })}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  featuresCard: {
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  comparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  featureLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tierLabel: {
    width: 60,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.05)",
    marginHorizontal: -Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  featureRowLast: {
    borderBottomWidth: 0,
  },
  featureName: {
    flex: 1,
    fontSize: 14,
  },
  tierValue: {
    width: 70,
    alignItems: "center",
  },
  tierValueText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
