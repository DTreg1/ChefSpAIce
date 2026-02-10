import { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { MONTHLY_PRICE, ANNUAL_PRICE } from "@shared/subscription";
import { getSubscriptionTermsText, APPLE_EULA_URL, GOOGLE_PLAY_TERMS_URL } from "@/constants/subscription-terms";

const FEATURES = [
  {
    icon: "infinite" as const,
    name: "Unlimited Pantry Items",
    description: "Track everything in your kitchen",
  },
  {
    icon: "restaurant" as const,
    name: "Unlimited AI Recipes",
    description: "Generate recipes anytime",
  },
  {
    icon: "construct" as const,
    name: "Unlimited Cookware",
    description: "Equipment-aware recipes",
  },
  {
    icon: "scan" as const,
    name: "Recipe Scanning",
    description: "Scan recipes from books & websites",
  },
  {
    icon: "barcode" as const,
    name: "Bulk Scanning",
    description: "Scan multiple items at once",
  },
  {
    icon: "chatbubbles" as const,
    name: "Live AI Kitchen Assistant",
    description: "Real-time cooking help",
  },
  {
    icon: "folder-open" as const,
    name: "Custom Storage Areas",
    description: "Organize your way",
  },
  {
    icon: "calendar" as const,
    name: "Weekly Meal Prepping",
    description: "Plan meals in advance",
  },
];

interface TrialEndedModalProps {
  visible: boolean;
  onSelectPlan: (tier: "pro", plan: "monthly" | "annual") => void;
  isLoading?: boolean;
  onOpenPrivacyPolicy?: () => void;
  onOpenTermsOfUse?: () => void;
  onRestorePurchases?: () => void;
  isRestoring?: boolean;
  storeKitPrices?: {
    proMonthly?: string;
    proAnnual?: string;
  } | null;
}

export function TrialEndedModal({
  visible,
  onSelectPlan,
  isLoading = false,
  onOpenPrivacyPolicy,
  onOpenTermsOfUse,
  onRestorePurchases,
  isRestoring = false,
  storeKitPrices,
}: TrialEndedModalProps) {
  const { theme, isDark } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">(
    "annual",
  );

  const handleSubscribe = () => {
    onSelectPlan("pro", selectedPlan);
  };

  const getDisplayPrice = (plan: "monthly" | "annual") => {
    if (storeKitPrices) {
      const key = plan === 'monthly' ? 'proMonthly' : 'proAnnual';
      if (storeKitPrices[key]) return storeKitPrices[key];
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        return plan === 'monthly' ? 'Monthly' : 'Annual';
      }
    }
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      return plan === 'monthly' ? 'Monthly' : 'Annual';
    }
    return `$${plan === "monthly" ? MONTHLY_PRICE.toFixed(2) : ANNUAL_PRICE.toFixed(2)}`;
  };

  const getButtonPriceText = () => {
    if (storeKitPrices) {
      const key = selectedPlan === 'monthly' ? 'proMonthly' : 'proAnnual';
      if (storeKitPrices[key]) {
        return `${storeKitPrices[key]}/${selectedPlan === 'monthly' ? 'mo' : 'yr'}`;
      }
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        return selectedPlan === 'monthly' ? 'Monthly' : 'Annual';
      }
    }
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      return selectedPlan === 'monthly' ? 'Monthly' : 'Annual';
    }
    return selectedPlan === "monthly"
      ? `$${MONTHLY_PRICE.toFixed(2)}/mo`
      : `$${ANNUAL_PRICE.toFixed(2)}/yr`;
  };

  const handleOpenPrivacyPolicy = () => {
    if (onOpenPrivacyPolicy) {
      onOpenPrivacyPolicy();
    } else if (Platform.OS === "web") {
      window.open("/privacy", "_blank");
    } else {
      Linking.openURL("https://chefspice.app/privacy");
    }
  };

  const handleOpenTermsOfUse = () => {
    if (onOpenTermsOfUse) {
      onOpenTermsOfUse();
    } else if (Platform.OS === "web") {
      window.open("/terms", "_blank");
    } else {
      Linking.openURL("https://chefspice.app/terms");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" accessibilityViewIsModal={true}>
      <View style={styles.overlay}>
        <BlurView
          intensity={80}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.modal,
            {
              backgroundColor: isDark
                ? "rgba(26, 26, 26, 0.95)"
                : "rgba(255, 255, 255, 0.95)",
            },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${AppColors.warning}20` },
                ]}
              >
                <Ionicons name="time" size={40} color={AppColors.warning} />
              </View>
              <ThemedText type="h2" style={styles.title}>
                Your Trial Has Ended
              </ThemedText>
              <ThemedText
                type="body"
                style={[styles.subtitle, { color: theme.textSecondary }]}
              >
                Subscribe to continue using ChefSpAIce
              </ThemedText>
            </View>

            <View style={styles.billingToggle}>
              <Pressable
                style={[
                  styles.billingOption,
                  selectedPlan === "monthly" && {
                    backgroundColor: AppColors.primary + "20",
                    borderColor: AppColors.primary,
                  },
                ]}
                onPress={() => setSelectedPlan("monthly")}
                data-testid="button-monthly-toggle"
                accessibilityRole="button"
                accessibilityState={{ selected: selectedPlan === "monthly" }}
                accessibilityLabel="Monthly billing"
              >
                <ThemedText
                  type="body"
                  style={{
                    color:
                      selectedPlan === "monthly"
                        ? AppColors.primary
                        : theme.text,
                  }}
                >
                  Monthly
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.billingOption,
                  selectedPlan === "annual" && {
                    backgroundColor: AppColors.primary + "20",
                    borderColor: AppColors.primary,
                  },
                ]}
                onPress={() => setSelectedPlan("annual")}
                data-testid="button-annual-toggle"
                accessibilityRole="button"
                accessibilityState={{ selected: selectedPlan === "annual" }}
                accessibilityLabel={Platform.OS === 'web' ? "Annual billing, save 17 percent" : "Annual billing, best value"}
              >
                <ThemedText
                  type="body"
                  style={{
                    color:
                      selectedPlan === "annual"
                        ? AppColors.primary
                        : theme.text,
                  }}
                >
                  Annual
                </ThemedText>
                <View
                  style={[
                    styles.saveBadge,
                    { backgroundColor: AppColors.success },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={{ color: "#fff", fontSize: 10 }}
                  >
                    {Platform.OS === 'web' ? 'Save 17%' : 'Best Value'}
                  </ThemedText>
                </View>
              </Pressable>
            </View>

            <View
              style={[
                styles.planCard,
                {
                  borderColor: AppColors.primary,
                  backgroundColor: AppColors.primary + "10",
                },
              ]}
            >
              <View style={styles.planHeader}>
                <View>
                  <ThemedText type="h3" style={{ color: theme.text }}>
                    ChefSpAIce
                  </ThemedText>
                  <ThemedText type="h2" style={{ color: AppColors.primary }} numberOfLines={1} adjustsFontSizeToFit={true}>
                    {getDisplayPrice(selectedPlan)}
                    <ThemedText
                      type="body"
                      style={{ color: theme.textSecondary }}
                    >
                      {selectedPlan === "monthly" ? "/mo" : "/yr"}
                    </ThemedText>
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.checkCircle,
                    { backgroundColor: AppColors.primary },
                  ]}
                >
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
              </View>
              <View style={styles.planFeatures}>
                {FEATURES.slice(0, 4).map((feature, index) => (
                  <View key={index} style={styles.planFeatureRow}>
                    <Ionicons
                      name={feature.icon}
                      size={14}
                      color={AppColors.primary}
                    />
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary, flex: 1 }}
                    >
                      {feature.name}
                    </ThemedText>
                  </View>
                ))}
                <ThemedText
                  type="caption"
                  style={{ color: AppColors.primary, marginTop: 4 }}
                >
                  + {FEATURES.length - 4} more features included
                </ThemedText>
              </View>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={[
                styles.subscribeButton,
                {
                  backgroundColor: AppColors.primary,
                },
                isLoading && { opacity: 0.7 },
              ]}
              onPress={handleSubscribe}
              disabled={isLoading}
              data-testid="button-subscribe-trial-ended"
              accessibilityRole="button"
              accessibilityLabel="Subscribe to ChefSpAIce"
              accessibilityState={{ disabled: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#fff"
                  />
                  <ThemedText type="button" style={styles.subscribeButtonText}>
                    Subscribe Now — {getButtonPriceText()}
                  </ThemedText>
                </>
              )}
            </Pressable>
            <ThemedText
              type="caption"
              style={[styles.subscriptionTerms, { color: theme.textSecondary }]}
            >
              {getSubscriptionTermsText(Platform.OS)}
            </ThemedText>
            <View style={styles.legalLinksContainer}>
              <Pressable
                onPress={handleOpenPrivacyPolicy}
                data-testid="link-modal-privacy-policy"
                accessibilityRole="link"
                accessibilityLabel="Privacy Policy"
              >
                <ThemedText
                  type="caption"
                  style={[styles.legalLink, { color: AppColors.primary }]}
                >
                  Privacy Policy
                </ThemedText>
              </Pressable>
              <ThemedText
                type="caption"
                style={[styles.legalSeparator, { color: theme.textSecondary }]}
              >
                |
              </ThemedText>
              <Pressable
                onPress={handleOpenTermsOfUse}
                data-testid="link-modal-terms-of-use"
                accessibilityRole="link"
                accessibilityLabel="Terms of Use"
              >
                <ThemedText
                  type="caption"
                  style={[styles.legalLink, { color: AppColors.primary }]}
                >
                  Terms of Use
                </ThemedText>
              </Pressable>
              {Platform.OS !== 'web' && (
                <>
                  <ThemedText
                    type="caption"
                    style={[styles.legalSeparator, { color: theme.textSecondary }]}
                  >
                    |
                  </ThemedText>
                  <Pressable
                    onPress={() => {
                      if (Platform.OS === 'ios') {
                        Linking.openURL(APPLE_EULA_URL);
                      } else {
                        Linking.openURL(GOOGLE_PLAY_TERMS_URL);
                      }
                    }}
                    data-testid="link-modal-apple-eula"
                    accessibilityRole="link"
                    accessibilityLabel={Platform.OS === 'ios' ? 'EULA' : 'Google Play Terms'}
                  >
                    <ThemedText
                      type="caption"
                      style={[styles.legalLink, { color: AppColors.primary }]}
                    >
                      {Platform.OS === 'ios' ? 'EULA' : 'Google Play Terms'}
                    </ThemedText>
                  </Pressable>
                </>
              )}
            </View>
            {onRestorePurchases && (
              <Pressable
                onPress={onRestorePurchases}
                style={styles.restoreButton}
                data-testid="button-modal-restore-purchases"
              >
                <Ionicons name="refresh" size={14} color={theme.textSecondary} />
                <ThemedText
                  type="caption"
                  style={[styles.restoreText, { color: theme.textSecondary }]}
                >
                  {isRestoring ? "Restoring..." : "Restore Purchases"}
                </ThemedText>
              </Pressable>
            )}
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 22,
  },
  billingToggle: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  billingOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  saveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  planCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.sm,
    position: "relative",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  planFeatures: {
    gap: 4,
  },
  planFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  actions: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  subscribeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  subscribeButtonText: {
    color: "#fff",
  },
  subscriptionTerms: {
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16,
  },
  legalLinksContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  legalLink: {
    fontSize: 11,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  legalSeparator: {
    fontSize: 11,
  },
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: Spacing.sm,
  },
  restoreText: {
    fontSize: 12,
  },
});
