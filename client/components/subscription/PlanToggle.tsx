import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, AppColors } from "@/constants/theme";
import { webAccessibilityProps } from "@/lib/web-accessibility";
import { useTheme } from "@/hooks/useTheme";

interface PlanToggleProps {
  selectedPlan: "monthly" | "annual";
  onSelectPlan: (plan: "monthly" | "annual") => void;
  testIdPrefix?: string;
}

export function PlanToggle({
  selectedPlan,
  onSelectPlan,
  testIdPrefix = "",
}: PlanToggleProps) {
  const { theme, style: themeStyle } = useTheme();
  const monthlyTestId = testIdPrefix
    ? `button-${testIdPrefix}-billing-monthly`
    : "button-billing-monthly";
  const annualTestId = testIdPrefix
    ? `button-${testIdPrefix}-billing-annual`
    : "button-billing-annual";

  return (
    <View style={[styles.billingToggleContainer, { backgroundColor: themeStyle.surface.feedbackBg }]}>
      <Pressable
        style={[
          styles.billingToggleButton,
          selectedPlan === "monthly" && styles.billingToggleButtonActive,
        ]}
        onPress={() => onSelectPlan("monthly")}
        testID={monthlyTestId}
        {...webAccessibilityProps(() => onSelectPlan("monthly"))}
        accessibilityRole="button"
        accessibilityLabel={`Select monthly billing${selectedPlan === "monthly" ? ", currently selected" : ""}`}
        accessibilityState={{ selected: selectedPlan === "monthly" }}
      >
        <ThemedText
          style={[
            styles.billingToggleText,
            selectedPlan === "monthly" && { color: theme.buttonText },
          ]}
        >
          Monthly
        </ThemedText>
      </Pressable>
      <Pressable
        style={[
          styles.billingToggleButton,
          selectedPlan === "annual" && styles.billingToggleButtonActive,
        ]}
        onPress={() => onSelectPlan("annual")}
        testID={annualTestId}
        {...webAccessibilityProps(() => onSelectPlan("annual"))}
        accessibilityRole="button"
        accessibilityLabel={`Select annual billing, best value${selectedPlan === "annual" ? ", currently selected" : ""}`}
        accessibilityState={{ selected: selectedPlan === "annual" }}
      >
        <ThemedText
          style={[
            styles.billingToggleText,
            selectedPlan === "annual" && { color: theme.buttonText },
          ]}
        >
          Annual
        </ThemedText>
        <View style={styles.saveBadge}>
          <ThemedText style={[styles.saveBadgeText, { color: theme.buttonText }]}>
            {Platform.OS === "web" ? "Save 17%" : "Best Value"}
          </ThemedText>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  billingToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    borderRadius: 24,
    padding: 4,
  },
  billingToggleButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  billingToggleButtonActive: {
    backgroundColor: AppColors.primary,
  },
  billingToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.textSecondary,
  },
  billingToggleTextActive: {},
  saveBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
