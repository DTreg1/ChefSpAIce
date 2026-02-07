import React from "react";
import { View, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, AppColors } from "@/constants/theme";
import { webAccessibilityProps } from "@/lib/web-accessibility";

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
  const monthlyTestId = testIdPrefix
    ? `button-${testIdPrefix}-billing-monthly`
    : "button-billing-monthly";
  const annualTestId = testIdPrefix
    ? `button-${testIdPrefix}-billing-annual`
    : "button-billing-annual";

  return (
    <View style={styles.billingToggleContainer}>
      <Pressable
        style={[
          styles.billingToggleButton,
          selectedPlan === "monthly" && styles.billingToggleButtonActive,
        ]}
        onPress={() => onSelectPlan("monthly")}
        data-testid={monthlyTestId}
        {...webAccessibilityProps(() => onSelectPlan("monthly"))}
      >
        <ThemedText
          style={[
            styles.billingToggleText,
            selectedPlan === "monthly" && styles.billingToggleTextActive,
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
        data-testid={annualTestId}
        {...webAccessibilityProps(() => onSelectPlan("annual"))}
      >
        <ThemedText
          style={[
            styles.billingToggleText,
            selectedPlan === "annual" && styles.billingToggleTextActive,
          ]}
        >
          Annual
        </ThemedText>
        <View style={styles.saveBadge}>
          <ThemedText style={styles.saveBadgeText}>Save 17%</ThemedText>
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
    backgroundColor: "rgba(0,0,0,0.05)",
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
    color: "#666",
  },
  billingToggleTextActive: {
    color: "#FFFFFF",
  },
  saveBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
