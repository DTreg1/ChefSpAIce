import React from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { webAccessibilityProps } from "@/lib/web-accessibility";
import {
  MONTHLY_PRICES,
  ANNUAL_PRICES,
} from "@shared/subscription";

interface TierSelectorProps {
  selectedTier: "basic" | "pro";
  onSelectTier: (tier: "basic" | "pro") => void;
  selectedPlan: "monthly" | "annual";
  testIdPrefix?: string;
  storeKitPrices?: {
    basicMonthly?: string;
    basicAnnual?: string;
    proMonthly?: string;
    proAnnual?: string;
  } | null;
}

export function TierSelector({
  selectedTier,
  onSelectTier,
  selectedPlan,
  testIdPrefix = "",
  storeKitPrices,
}: TierSelectorProps) {
  const { theme } = useTheme();

  const isNative = Platform.OS === "ios" || Platform.OS === "android";

  const basicPrice = selectedPlan === "monthly"
    ? (storeKitPrices?.basicMonthly || (isNative ? "Basic" : `$${MONTHLY_PRICES.BASIC.toFixed(2)}`))
    : (storeKitPrices?.basicAnnual || (isNative ? "Basic" : `$${ANNUAL_PRICES.BASIC.toFixed(2)}`));

  const proPrice = selectedPlan === "monthly"
    ? (storeKitPrices?.proMonthly || (isNative ? "Pro" : `$${MONTHLY_PRICES.PRO.toFixed(2)}`))
    : (storeKitPrices?.proAnnual || (isNative ? "Pro" : `$${ANNUAL_PRICES.PRO.toFixed(2)}`));

  const basicTestId = testIdPrefix
    ? `button-${testIdPrefix}-select-basic`
    : "button-select-basic";
  const proTestId = testIdPrefix
    ? `button-${testIdPrefix}-select-pro`
    : "button-select-pro";

  return (
    <View style={styles.tierSelectionContainer}>
      <Pressable
        style={[
          styles.tierCard,
          {
            backgroundColor: theme.glass.background,
            borderColor:
              selectedTier === "basic"
                ? AppColors.primary
                : theme.glass.border,
          },
        ]}
        onPress={() => onSelectTier("basic")}
        data-testid={basicTestId}
        {...webAccessibilityProps(() => onSelectTier("basic"))}
      >
        <View style={styles.tierCardHeader}>
          <ThemedText style={styles.tierCardName}>Basic</ThemedText>
          {selectedTier === "basic" && (
            <View
              style={[
                styles.tierSelectedBadge,
                { backgroundColor: AppColors.primary },
              ]}
            >
              <Feather name="check" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>
        <ThemedText
          style={[styles.tierCardPrice, { color: AppColors.primary }]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
        >
          {basicPrice}
          <ThemedText
            style={[
              styles.tierCardInterval,
              { color: theme.textSecondary },
            ]}
          >
            {selectedPlan === "monthly" ? "/month" : "/year"}
          </ThemedText>
        </ThemedText>
        {selectedPlan === "annual" && !storeKitPrices && !isNative && (
          <ThemedText
            style={[
              styles.tierCardMonthlyCalc,
              { color: theme.textSecondary },
            ]}
          >
            (${(ANNUAL_PRICES.BASIC / 12).toFixed(2)}/mo equivalent)
          </ThemedText>
        )}
        <ThemedText
          style={[
            styles.tierCardFeature,
            { color: theme.textSecondary },
          ]}
        >
          25 pantry items, 5 AI recipes/mo
        </ThemedText>
      </Pressable>

      <Pressable
        style={[
          styles.tierCard,
          {
            backgroundColor: theme.glass.background,
            borderColor:
              selectedTier === "pro"
                ? AppColors.warning
                : theme.glass.border,
          },
        ]}
        onPress={() => onSelectTier("pro")}
        data-testid={proTestId}
        {...webAccessibilityProps(() => onSelectTier("pro"))}
      >
        <View
          style={[
            styles.popularBadge,
            { backgroundColor: AppColors.warning },
          ]}
        >
          <ThemedText style={styles.popularBadgeText}>
            Popular
          </ThemedText>
        </View>
        <View style={styles.tierCardHeader}>
          <ThemedText style={styles.tierCardName}>Pro</ThemedText>
          {selectedTier === "pro" && (
            <View
              style={[
                styles.tierSelectedBadge,
                { backgroundColor: AppColors.warning },
              ]}
            >
              <Feather name="check" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>
        <ThemedText
          style={[styles.tierCardPrice, { color: AppColors.warning }]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
        >
          {proPrice}
          <ThemedText
            style={[
              styles.tierCardInterval,
              { color: theme.textSecondary },
            ]}
          >
            {selectedPlan === "monthly" ? "/month" : "/year"}
          </ThemedText>
        </ThemedText>
        {selectedPlan === "annual" && !storeKitPrices && !isNative && (
          <ThemedText
            style={[
              styles.tierCardMonthlyCalc,
              { color: theme.textSecondary },
            ]}
          >
            (${(ANNUAL_PRICES.PRO / 12).toFixed(2)}/mo equivalent)
          </ThemedText>
        )}
        <ThemedText
          style={[
            styles.tierCardFeature,
            { color: theme.textSecondary },
          ]}
        >
          Unlimited everything
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tierSelectionContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  tierCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    position: "relative",
  },
  tierCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  tierCardName: {
    fontSize: 16,
    fontWeight: "700",
  },
  tierSelectedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tierCardPrice: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  tierCardInterval: {
    fontSize: 12,
    fontWeight: "400",
  },
  tierCardMonthlyCalc: {
    fontSize: 9,
    fontWeight: "400",
    marginTop: 4,
    opacity: 0.5,
  },
  tierCardFeature: {
    fontSize: 11,
    marginTop: Spacing.xs,
  },
  popularBadge: {
    position: "absolute",
    top: -10,
    right: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  popularBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
