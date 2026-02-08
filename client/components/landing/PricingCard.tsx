import { StyleSheet, View, Text, Pressable, ViewStyle } from "react-native";
import { webAccessibilityProps } from "@/lib/web-accessibility";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCard } from "./GlassCard";
import { AppColors, GlassEffect } from "@/constants/theme";

interface PricingCardProps {
  tier: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  buttonText: string;
  onPress: () => void;
  testId: string;
  isWide?: boolean;
  showDownloadButtons?: boolean;
  onDownloadiOS?: () => void;
  onDownloadAndroid?: () => void;
}

export function PricingCard({
  tier,
  price,
  period,
  description,
  features,
  isPopular,
  buttonText,
  onPress,
  testId,
  isWide,
  showDownloadButtons,
  onDownloadiOS,
  onDownloadAndroid,
}: PricingCardProps) {
  return (
    <GlassCard
      style={[
        styles.pricingCard,
        isWide && styles.pricingCardWide,
        isPopular && styles.pricingCardPopular,
      ] as ViewStyle[]}
      testId={`card-pricing-${testId}`}
    >
      {isPopular && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularBadgeText}>Most Popular</Text>
        </View>
      )}
      <Text
        style={styles.pricingTier}
        data-testid={`text-pricing-tier-${testId}`}
      >
        {tier}
      </Text>
      <View style={styles.pricingPriceContainer}>
        <Text
          style={styles.pricingPrice}
          data-testid={`text-pricing-price-${testId}`}
        >
          {price}
        </Text>
        {period && <Text style={styles.pricingPeriod}>/{period}</Text>}
      </View>
      <Text
        style={styles.pricingDescription}
        data-testid={`text-pricing-desc-${testId}`}
      >
        {description}
      </Text>
      <View style={styles.pricingFeatures}>
        {features.map((feature, index) => (
          <View key={index} style={styles.pricingFeatureRow}>
            <Feather name="check" size={16} color={AppColors.primary} />
            <Text style={styles.pricingFeatureText}>{feature}</Text>
          </View>
        ))}
      </View>
      {showDownloadButtons ? (
        <View style={styles.downloadButtonsContainer}>
          <Text style={styles.downloadLabel}>Download the app:</Text>
          <View style={styles.downloadButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.downloadButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onDownloadiOS}
              {...webAccessibilityProps(onDownloadiOS)}
              data-testid={`button-download-ios-${testId}`}
            >
              <MaterialCommunityIcons name="apple" size={20} color="#FFFFFF" />
              <Text style={styles.downloadButtonText}>App Store</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.downloadButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onDownloadAndroid}
              {...webAccessibilityProps(onDownloadAndroid)}
              data-testid={`button-download-android-${testId}`}
              accessibilityLabel="Download on Google Play"
            >
              <MaterialCommunityIcons
                name="google-play"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.downloadButtonText}>Google Play</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            isPopular
              ? styles.pricingButtonPrimary
              : styles.pricingButtonSecondary,
            pressed && styles.buttonPressed,
          ]}
          onPress={onPress}
          {...webAccessibilityProps(onPress)}
          data-testid={`button-pricing-${testId}`}
        >
          {isPopular ? (
            <LinearGradient
              colors={[AppColors.primary, "#1E8449"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pricingButtonGradient}
            >
              <Text style={styles.pricingButtonTextPrimary}>{buttonText}</Text>
            </LinearGradient>
          ) : (
            <Text style={styles.pricingButtonTextSecondary}>{buttonText}</Text>
          )}
        </Pressable>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  pricingCard: {
    padding: 28,
    alignItems: "center",
  },
  pricingCardWide: {
    flex: 1,
    minWidth: 280,
    maxWidth: 320,
  },
  pricingCardPopular: {
    borderColor: AppColors.primary,
    borderWidth: 2,
  },
  popularBadge: {
    position: "absolute",
    top: -12,
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: GlassEffect.borderRadius.pill,
  },
  popularBadgeText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
    fontWeight: "700",
  },
  pricingTier: {
    fontSize: 20,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 8,
    marginTop: 8,
  },
  pricingPriceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  pricingPrice: {
    fontSize: 48,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.5)",
  },
  pricingPeriod: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
  },
  pricingDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 24,
  },
  pricingFeatures: {
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  pricingFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pricingFeatureText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  pricingButtonPrimary: {
    width: "100%",
    borderRadius: GlassEffect.borderRadius.pill,
    overflow: "hidden",
  },
  pricingButtonSecondary: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: GlassEffect.borderRadius.pill,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
  },
  pricingButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  pricingButtonTextPrimary: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.5)",
  },
  pricingButtonTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.5)",
  },
  downloadButtonsContainer: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  downloadLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 4,
  },
  downloadButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: GlassEffect.borderRadius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
