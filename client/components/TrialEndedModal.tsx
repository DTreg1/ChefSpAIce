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
import { MONTHLY_PRICES, ANNUAL_PRICES } from "../../shared/subscription";

const PRO_FEATURES = [
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

const BASIC_FEATURES = [
  {
    icon: "cube" as const,
    name: "25 Pantry Items",
    description: "Track your essentials",
  },
  {
    icon: "restaurant" as const,
    name: "5 AI Recipes/Month",
    description: "Get recipe inspiration",
  },
  {
    icon: "construct" as const,
    name: "5 Cookware Items",
    description: "Basic equipment tracking",
  },
];

interface TrialEndedModalProps {
  visible: boolean;
  onSelectPlan: (tier: "basic" | "pro", plan: "monthly" | "annual") => void;
  isLoading?: boolean;
  onOpenPrivacyPolicy?: () => void;
  onOpenTermsOfUse?: () => void;
}

export function TrialEndedModal({
  visible,
  onSelectPlan,
  isLoading = false,
  onOpenPrivacyPolicy,
  onOpenTermsOfUse,
}: TrialEndedModalProps) {
  const { theme, isDark } = useTheme();
  const [selectedTier, setSelectedTier] = useState<"basic" | "pro">("pro");
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">(
    "annual",
  );

  const handleSubscribe = () => {
    onSelectPlan(selectedTier, selectedPlan);
  };

  const getPrice = (tier: "basic" | "pro", plan: "monthly" | "annual") => {
    if (tier === "basic") {
      return plan === "monthly"
        ? MONTHLY_PRICES.BASIC
        : ANNUAL_PRICES.BASIC / 12;
    }
    return plan === "monthly" ? MONTHLY_PRICES.PRO : ANNUAL_PRICES.PRO / 12;
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
    <Modal visible={visible} transparent animationType="fade">
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
                Choose a plan to continue using ChefSpAIce
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
                    Save 17%
                  </ThemedText>
                </View>
              </Pressable>
            </View>

            <Pressable
              style={[
                styles.tierCard,
                {
                  borderColor:
                    selectedTier === "basic" ? AppColors.primary : theme.border,
                },
                selectedTier === "basic" && {
                  backgroundColor: AppColors.primary + "10",
                },
              ]}
              onPress={() => setSelectedTier("basic")}
              data-testid="button-select-basic-tier"
            >
              <View style={styles.tierHeader}>
                <View>
                  <ThemedText type="h3" style={{ color: theme.text }}>
                    Basic
                  </ThemedText>
                  <ThemedText type="h2" style={{ color: AppColors.primary }}>
                    ${getPrice("basic", selectedPlan).toFixed(2)}
                    <ThemedText
                      type="body"
                      style={{ color: theme.textSecondary }}
                    >
                      /mo
                    </ThemedText>
                  </ThemedText>
                </View>
                {selectedTier === "basic" && (
                  <View
                    style={[
                      styles.checkCircle,
                      { backgroundColor: AppColors.primary },
                    ]}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </View>
              <View style={styles.tierFeatures}>
                {BASIC_FEATURES.map((feature, index) => (
                  <View key={index} style={styles.tierFeatureRow}>
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
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.tierCard,
                {
                  borderColor:
                    selectedTier === "pro" ? AppColors.warning : theme.border,
                },
                selectedTier === "pro" && {
                  backgroundColor: AppColors.warning + "10",
                },
              ]}
              onPress={() => setSelectedTier("pro")}
              data-testid="button-select-pro-tier"
            >
              <View
                style={[
                  styles.popularBadge,
                  { backgroundColor: AppColors.warning },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{ color: "#fff", fontSize: 10 }}
                >
                  MOST POPULAR
                </ThemedText>
              </View>
              <View style={styles.tierHeader}>
                <View>
                  <ThemedText type="h3" style={{ color: theme.text }}>
                    Pro
                  </ThemedText>
                  <ThemedText type="h2" style={{ color: AppColors.warning }}>
                    ${getPrice("pro", selectedPlan).toFixed(2)}
                    <ThemedText
                      type="body"
                      style={{ color: theme.textSecondary }}
                    >
                      /mo
                    </ThemedText>
                  </ThemedText>
                </View>
                {selectedTier === "pro" && (
                  <View
                    style={[
                      styles.checkCircle,
                      { backgroundColor: AppColors.warning },
                    ]}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </View>
              <View style={styles.tierFeatures}>
                {PRO_FEATURES.slice(0, 4).map((feature, index) => (
                  <View key={index} style={styles.tierFeatureRow}>
                    <Ionicons
                      name={feature.icon}
                      size={14}
                      color={AppColors.warning}
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
                  style={{ color: AppColors.warning, marginTop: 4 }}
                >
                  + 4 more premium features
                </ThemedText>
              </View>
            </Pressable>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={[
                styles.subscribeButton,
                {
                  backgroundColor:
                    selectedTier === "pro"
                      ? AppColors.warning
                      : AppColors.primary,
                },
                isLoading && { opacity: 0.7 },
              ]}
              onPress={handleSubscribe}
              disabled={isLoading}
              data-testid="button-subscribe-trial-ended"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={selectedTier === "pro" ? "star" : "checkmark-circle"}
                    size={20}
                    color="#fff"
                  />
                  <ThemedText type="button" style={styles.subscribeButtonText}>
                    Subscribe to {selectedTier === "pro" ? "Pro" : "Basic"}
                  </ThemedText>
                </>
              )}
            </Pressable>
            <ThemedText
              type="caption"
              style={[styles.subscriptionTerms, { color: theme.textSecondary }]}
            >
              Subscription automatically renews unless auto-renew is turned off
              at least 24 hours before the end of the current period. Payment
              will be charged to your Apple ID account at confirmation of
              purchase.
            </ThemedText>
            <View style={styles.legalLinksContainer}>
              <Pressable
                onPress={handleOpenPrivacyPolicy}
                data-testid="link-modal-privacy-policy"
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
              >
                <ThemedText
                  type="caption"
                  style={[styles.legalLink, { color: AppColors.primary }]}
                >
                  Terms of Use (EULA)
                </ThemedText>
              </Pressable>
            </View>
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
  tierCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.sm,
    position: "relative",
  },
  tierHeader: {
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
  popularBadge: {
    position: "absolute",
    top: -10,
    right: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tierFeatures: {
    gap: 4,
  },
  tierFeatureRow: {
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
});
