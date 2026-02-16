import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";

export const STANDARD_FEATURES = [
  { key: "pantryItems", name: "Unlimited Pantry Items", included: true },
  { key: "aiRecipes", name: "Unlimited AI Recipes", included: true },
  { key: "cookware", name: "Unlimited Cookware Items", included: true },
  { key: "recipeScanning", name: "Recipe Scanning", included: true },
  { key: "bulkScanning", name: "Bulk Scanning", included: true },
  { key: "aiAssistant", name: "Live AI Kitchen Assistant", included: true },
  { key: "customStorage", name: "Custom Storage Areas", included: true },
  { key: "weeklyMealPrep", name: "Weekly Meal Prepping", included: true },
];

export type StandardFeature = (typeof STANDARD_FEATURES)[number];

interface FeatureComparisonTableProps {
  features: StandardFeature[];
}

export function FeatureComparisonTable({
  features,
}: FeatureComparisonTableProps) {
  const { theme, style: themeStyle } = useTheme();

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
          What's Included
        </ThemedText>
      </View>

      {features.map((feature, index) => (
        <View
          key={feature.key}
          style={[
            styles.featureRow,
            { borderBottomColor: themeStyle.glass.borderSubtle },
            index === features.length - 1 && styles.featureRowLast,
          ]}
        >
          <Feather
            name="check-circle"
            size={18}
            color={AppColors.success}
          />
          <ThemedText
            style={[
              styles.featureName,
              { color: theme.textSecondaryOnGlass },
            ]}
          >
            {feature.name}
          </ThemedText>
        </View>
      ))}
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
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
});
