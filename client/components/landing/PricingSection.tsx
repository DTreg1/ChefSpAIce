import { StyleSheet, View, Text, Pressable } from "react-native";
import { useState } from "react";
import { AppColors } from "@/constants/theme";
import { PricingCard } from "./PricingCard";
import { BASIC_FEATURES, PRO_FEATURES } from "@/data/landing-data";
import { sharedStyles } from "./shared-styles";

interface PricingSectionProps {
  isWide: boolean;
  onDownloadApp: (store: "ios" | "android") => void;
}

export function PricingSection({ isWide, onDownloadApp }: PricingSectionProps) {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <View style={sharedStyles.section} data-testid="section-pricing">
      <Text style={sharedStyles.sectionTitle} data-testid="text-pricing-title">
        Simple, Transparent Pricing
      </Text>
      <Text
        style={sharedStyles.sectionSubtitle}
        data-testid="text-pricing-subtitle"
      >
        Choose the plan that works best for you
      </Text>

      <View style={styles.billingToggleContainer}>
        <Pressable
          style={styles.billingToggle}
          onPress={() => setIsAnnual(!isAnnual)}
          data-testid="toggle-billing-period"
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
                isAnnual && styles.billingOptionTextActive,
              ]}
            >
              Annually
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save 17%</Text>
            </View>
          </View>
        </Pressable>
      </View>

      <View style={[styles.pricingGrid, isWide && styles.pricingGridWide]}>
        <PricingCard
          tier="Basic"
          price={isAnnual ? "$49.90" : "$4.99"}
          period={isAnnual ? "year" : "month"}
          description="Perfect for getting started"
          features={BASIC_FEATURES}
          buttonText="Download App"
          onPress={() => {}}
          testId="basic"
          isWide={isWide}
          showDownloadButtons={true}
          onDownloadiOS={() => onDownloadApp("ios")}
          onDownloadAndroid={() => onDownloadApp("android")}
        />
        <PricingCard
          tier="Pro"
          price={isAnnual ? "$99.90" : "$9.99"}
          period={isAnnual ? "year" : "month"}
          description="Best for home cooks"
          features={PRO_FEATURES}
          isPopular={true}
          buttonText="Download App"
          onPress={() => {}}
          testId="pro"
          isWide={isWide}
          showDownloadButtons={true}
          onDownloadiOS={() => onDownloadApp("ios")}
          onDownloadAndroid={() => onDownloadApp("android")}
        />
      </View>
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
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
    color: "rgba(255, 255, 255, 0.6)",
  },
  billingOptionTextActive: {
    color: "rgba(255, 255, 255, 0.5)",
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
    color: "rgba(255, 255, 255, 0.5)",
  },
  pricingGrid: {
    flexDirection: "column",
    gap: 20,
    width: "100%",
    maxWidth: 400,
  },
  pricingGridWide: {
    flexDirection: "row",
    justifyContent: "center",
    maxWidth: 1000,
    gap: 24,
  },
});
