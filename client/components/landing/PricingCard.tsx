import { StyleSheet, View, Text, Pressable, ViewStyle } from "react-native";
import { webAccessibilityProps } from "@/lib/web-accessibility";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCard } from "./GlassCard";
import { AppColors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

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
  const { style } = useTheme();
  const lc = style.landing;
  const ge = style.glassEffect;

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
        <View style={[styles.popularBadge, { borderRadius: ge.borderRadius.pill }]}>
          <Text style={styles.popularBadgeText}>Most Popular</Text>
        </View>
      )}
      <Text
        style={[styles.pricingTier, { color: lc.textPrimary }]}
        data-testid={`text-pricing-tier-${testId}`}
      >
        {tier}
      </Text>
      <View style={styles.pricingPriceContainer}>
        <Text
          style={[styles.pricingPrice, { color: lc.textPrimary }]}
          data-testid={`text-pricing-price-${testId}`}
        >
          {price}
        </Text>
        {period && <Text style={[styles.pricingPeriod, { color: lc.textSecondary }]}>/{period}</Text>}
      </View>
      <Text
        style={[styles.pricingDescription, { color: lc.textSecondary }]}
        data-testid={`text-pricing-desc-${testId}`}
      >
        {description}
      </Text>
      <View style={styles.pricingFeatures}>
        {features.map((feature, index) => (
          <View key={index} style={styles.pricingFeatureRow}>
            <Feather name="check" size={16} color={AppColors.primary} />
            <Text style={[styles.pricingFeatureText, { color: lc.textSecondary }]}>{feature}</Text>
          </View>
        ))}
      </View>
      {showDownloadButtons ? (
        <View style={styles.downloadButtonsContainer}>
          <Text style={[styles.downloadLabel, { color: lc.textMuted }]}>Download the app:</Text>
          <View style={styles.downloadButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.downloadButton,
                { borderColor: lc.borderMedium, backgroundColor: lc.surfaceMedium, borderRadius: ge.borderRadius.pill },
                pressed && styles.buttonPressed,
              ]}
              onPress={onDownloadiOS}
              {...webAccessibilityProps(onDownloadiOS)}
              data-testid={`button-download-ios-${testId}`}
              accessibilityRole="button"
              accessibilityLabel="Download on the App Store"
            >
              <MaterialCommunityIcons name="apple" size={20} color="#FFFFFF" />
              <Text style={[styles.downloadButtonText, { color: lc.textSecondary }]}>App Store</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.downloadButton,
                { borderColor: lc.borderMedium, backgroundColor: lc.surfaceMedium, borderRadius: ge.borderRadius.pill },
                pressed && styles.buttonPressed,
              ]}
              onPress={onDownloadAndroid}
              {...webAccessibilityProps(onDownloadAndroid)}
              data-testid={`button-download-android-${testId}`}
              accessibilityRole="button"
              accessibilityLabel="Download on Google Play"
            >
              <MaterialCommunityIcons
                name="google-play"
                size={20}
                color="#FFFFFF"
              />
              <Text style={[styles.downloadButtonText, { color: lc.textSecondary }]}>Google Play</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [
            isPopular
              ? [styles.pricingButtonPrimary, { borderRadius: ge.borderRadius.pill }]
              : [styles.pricingButtonSecondary, { borderColor: lc.borderStrong, backgroundColor: lc.surfaceSubtle, borderRadius: ge.borderRadius.pill }],
            pressed && styles.buttonPressed,
          ]}
          onPress={onPress}
          {...webAccessibilityProps(onPress)}
          data-testid={`button-pricing-${testId}`}
          accessibilityRole="button"
          accessibilityLabel={`${buttonText} for ${tier} plan`}
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
            <Text style={[styles.pricingButtonTextSecondary, { color: lc.textPrimary }]}>{buttonText}</Text>
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
    width: "100%",
    maxWidth: 420,
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
  },
  popularBadgeText: {
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 12,
    fontWeight: "700",
  },
  pricingTier: {
    fontSize: 20,
    fontWeight: "600",
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
  },
  pricingPeriod: {
    fontSize: 16,
  },
  pricingDescription: {
    fontSize: 14,
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
  },
  pricingButtonPrimary: {
    width: "100%",
    overflow: "hidden",
  },
  pricingButtonSecondary: {
    width: "100%",
    paddingVertical: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  pricingButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  pricingButtonTextPrimary: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.95)",
  },
  pricingButtonTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
  },
  downloadButtonsContainer: {
    width: "100%",
    alignItems: "center",
    gap: 12,
  },
  downloadLabel: {
    fontSize: 14,
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
    borderWidth: 1,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
