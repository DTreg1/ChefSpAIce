import { StyleSheet, View, Text, Pressable, Platform } from "react-native";
import { useState } from "react";
import { webAccessibilityProps } from "@/lib/web-accessibility";
import { AppColors } from "@/constants/theme";
import { PricingCard } from "./PricingCard";
import { SUBSCRIPTION_FEATURES } from "@/data/landing-data";
import { sharedStyles, getLandingTextStyles } from "./shared-styles";
import { useTheme } from "@/hooks/useTheme";

interface PricingSectionProps {
  isWide: boolean;
  onDownloadApp: (store: "ios" | "android") => void;
}

export function PricingSection({ isWide, onDownloadApp }: PricingSectionProps) {
  const [isAnnual, setIsAnnual] = useState(false);
  const { style } = useTheme();
  const lc = style.landing;
  const textStyles = getLandingTextStyles(style.landing);

  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return null;
  }

  return (
    <View style={sharedStyles.section} data-testid="section-pricing">
      <Text style={textStyles.sectionTitle} data-testid="text-pricing-title">
        Simple, Transparent Pricing
      </Text>
      <Text
        style={textStyles.sectionSubtitle}
        data-testid="text-pricing-subtitle"
      >
        One plan, everything included. Start with a 7-day free trial.
      </Text>

      <View style={styles.billingToggleContainer}>
        <Pressable
          style={[styles.billingToggle, { backgroundColor: lc.surfaceMedium, borderColor: lc.borderMedium }]}
          onPress={() => setIsAnnual(!isAnnual)}
          {...webAccessibilityProps(() => setIsAnnual(!isAnnual))}
          data-testid="toggle-billing-period"
          accessibilityRole="button"
          accessibilityLabel={`Switch billing period, currently ${isAnnual ? 'annual' : 'monthly'}`}
        >
          <View
            style={[
              styles.billingOption,
              !isAnnual && styles.billingOptionActive,
            ]}
          >
            <Text
              style={[
                styles.billingOptionText,
                { color: lc.textMuted },
                !isAnnual && styles.billingOptionTextActive,
              ]}
            >
              Monthly
            </Text>
          </View>
          <View
            style={[
              styles.billingOption,
              isAnnual && styles.billingOptionActive,
            ]}
          >
            <Text
              style={[
                styles.billingOptionText,
                { color: lc.textMuted },
                isAnnual && styles.billingOptionTextActive,
              ]}
            >
              Annually
            </Text>
            <View style={[styles.saveBadge, !isAnnual && { backgroundColor: lc.surfaceMedium }]}>
              <Text style={[styles.saveBadgeText, !isAnnual && { color: lc.textPrimary }]}>Save 17%</Text>
            </View>
          </View>
        </Pressable>
      </View>

      <View style={[styles.pricingGrid, isWide && styles.pricingGridWide]}>
        <PricingCard
          tier="ChefSpAIce"
          price={isAnnual ? "$99.90" : "$9.99"}
          period={isAnnual ? "year" : "month"}
          description="Full access to all features"
          features={SUBSCRIPTION_FEATURES}
          buttonText="Download App"
          onPress={() => {}}
          testId="subscription"
          isWide={isWide}
          showDownloadButtons={true}
          onDownloadiOS={() => onDownloadApp("ios")}
          onDownloadAndroid={() => onDownloadApp("android")}
        />
      </View>

      <Text style={[styles.trialText, { color: lc.textMuted }]} data-testid="text-trial-info">
        7-day free trial included
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  billingToggleContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  billingToggle: {
    flexDirection: "row",
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
  },
  billingOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 26,
    gap: 8,
  },
  billingOptionActive: {
    backgroundColor: AppColors.primary,
  },
  billingOptionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  billingOptionTextActive: {
    color: "rgba(255, 255, 255, 0.95)",
  },
  saveBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.95)",
  },
  trialText: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center" as const,
  },
  pricingGrid: {
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  pricingGridWide: {
    maxWidth: 420,
  },
});
