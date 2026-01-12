import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useStoreKit } from "@/hooks/useStoreKit";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { MONTHLY_PRICES, ANNUAL_PRICES, SubscriptionTier } from "../../shared/subscription";

const PRO_FEATURES = [
  { key: "pantryItems", name: "Pantry Items", basic: "25", pro: "Unlimited" },
  { key: "aiRecipes", name: "AI Recipes/Month", basic: "5", pro: "Unlimited" },
  { key: "cookware", name: "Cookware Items", basic: "5", pro: "Unlimited" },
  { key: "recipeScanning", name: "Recipe Scanning", basic: false, pro: true },
  { key: "bulkScanning", name: "Bulk Scanning", basic: false, pro: true },
  { key: "aiAssistant", name: "Live AI Kitchen Assistant", basic: false, pro: true },
  { key: "customStorage", name: "Custom Storage Areas", basic: false, pro: true },
  { key: "weeklyMealPrep", name: "Weekly Meal Prepping", basic: false, pro: true },
];

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const menuItems: MenuItemConfig[] = [];
  const { token } = useAuth();
  const {
    tier,
    status,
    isProUser,
    isTrialing,
    isActive,
    isLoading,
    trialDaysRemaining,
    entitlements,
    usage,
    refetch,
  } = useSubscription();

  const {
    isAvailable: isStoreKitAvailable,
    offerings,
    purchasePackage,
    restorePurchases,
    isLoading: isStoreKitLoading,
    presentPaywall,
    presentCustomerCenter,
    isPaywallAvailable,
    isCustomerCenterAvailable,
  } = useStoreKit();

  const shouldUseStoreKit = (Platform.OS === 'ios' || Platform.OS === 'android') && isStoreKitAvailable;

  const [isManaging, setIsManaging] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

  const formatLimit = (value: number | "unlimited", used: number): string => {
    if (value === "unlimited") {
      return `${used} (unlimited)`;
    }
    return `${used}/${value}`;
  };

  const getStatusDisplay = (): { label: string; color: string } => {
    switch (status) {
      case "active":
        return { label: "Active", color: AppColors.success };
      case "trialing":
        return { label: `Trial (${trialDaysRemaining} days left)`, color: AppColors.warning };
      case "past_due":
        return { label: "Past Due", color: AppColors.error };
      case "canceled":
        return { label: "Canceled", color: AppColors.error };
      case "expired":
        return { label: "Expired", color: AppColors.error };
      default:
        return { label: "No Plan", color: theme.textSecondary };
    }
  };

  const getPlanName = (): string => {
    if (tier === SubscriptionTier.PRO) {
      return "Pro";
    }
    return "Basic";
  };

  const getMonthlyPrice = (): string => {
    if (tier === SubscriptionTier.PRO) {
      return `$${MONTHLY_PRICES.PRO.toFixed(2)}/month`;
    }
    return `$${MONTHLY_PRICES.BASIC.toFixed(2)}/month`;
  };

  const handleManageSubscription = async () => {
    setIsManaging(true);
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/subscriptions/create-portal-session", baseUrl);

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          if (Platform.OS === "web") {
            window.open(data.url, "_blank");
          } else {
            await Linking.openURL(data.url);
          }
        }
      } else {
        console.error("Failed to create portal session");
      }
    } catch (error) {
      console.error("Error opening billing portal:", error);
    } finally {
      setIsManaging(false);
    }
  };

  const handleUpgrade = async (plan: 'monthly' | 'annual' = 'annual') => {
    setIsCheckingOut(true);
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        if (!shouldUseStoreKit || !offerings) {
          Alert.alert(
            'Not Available',
            'In-app purchases are not available. Please try again later or contact support.',
            [{ text: 'OK' }]
          );
          return;
        }

        const packageId = plan === 'monthly' ? '$rc_monthly' : '$rc_annual';
        const pkg = offerings.availablePackages.find(
          (p) => p.identifier === packageId || p.packageType === (plan === 'monthly' ? 'MONTHLY' : 'ANNUAL')
        );

        if (!pkg) {
          Alert.alert('Error', 'Subscription package not available. Please try again later.');
          return;
        }

        const success = await purchasePackage(pkg);
        if (success) {
          Alert.alert('Success', 'Thank you for subscribing to Pro!');
          refetch();
        }
        return;
      }

      if (Platform.OS === 'web') {
        const baseUrl = getApiUrl();
        
        const pricesResponse = await fetch(`${baseUrl}/api/subscriptions/prices`);
        const prices = await pricesResponse.json();
        
        const priceId = plan === 'monthly' ? prices.monthly?.id : prices.annual?.id;
        
        if (!priceId) {
          Alert.alert('Error', 'Subscription pricing not available. Please try again later.');
          return;
        }

        const response = await fetch(`${baseUrl}/api/subscriptions/create-checkout-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            priceId,
            successUrl: `${window.location.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${window.location.origin}/subscription-canceled`,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.url) {
            window.location.href = data.url;
          }
        } else {
          const errorData = await response.json();
          Alert.alert('Error', errorData.error || 'Failed to start checkout. Please try again.');
        }
      }
    } catch (error) {
      console.error("Error starting checkout:", error);
      Alert.alert('Error', 'Something went wrong. Please try again later.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (!shouldUseStoreKit) return;
    
    setIsRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert('Success', 'Purchases restored successfully!');
        refetch();
      } else {
        Alert.alert('No Purchases Found', 'No previous purchases were found to restore.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePresentPaywall = async () => {
    if (!isPaywallAvailable) {
      Alert.alert('Not Available', 'Paywall is not available on this platform.');
      return;
    }
    
    setIsCheckingOut(true);
    try {
      const result = await presentPaywall();
      if (result === 'purchased' || result === 'restored') {
        Alert.alert('Success', 'Thank you for subscribing to ChefSpAIce Pro!');
        refetch();
      }
    } catch (error) {
      console.error('Error presenting paywall:', error);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleOpenCustomerCenter = async () => {
    if (!isCustomerCenterAvailable) {
      handleManageSubscription();
      return;
    }
    
    try {
      await presentCustomerCenter();
      refetch();
    } catch (error) {
      console.error('Error opening customer center:', error);
      handleManageSubscription();
    }
  };

  const statusInfo = getStatusDisplay();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={AppColors.primary} />
        <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading subscription...
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ExpoGlassHeader
        title="Subscription"
        screenKey="subscription"
        showSearch={false}
        showBackButton={true}
        menuItems={menuItems}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: "transparent" }]}
        contentContainerStyle={[
          styles.content,
          { paddingTop: 56 + insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
      <GlassCard style={styles.planCard}>
        <View style={styles.planHeader}>
          <View style={styles.planInfo}>
            <View style={styles.planBadge}>
              <Feather
                name={isProUser ? "star" : "user"}
                size={20}
                color={isProUser ? AppColors.warning : AppColors.primary}
              />
            </View>
            <View>
              <ThemedText style={styles.planName}>{getPlanName()}</ThemedText>
              <ThemedText style={[styles.planPrice, { color: theme.textSecondary }]}>
                {getMonthlyPrice()}
              </ThemedText>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
            <ThemedText style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </ThemedText>
          </View>
        </View>

        {isTrialing && trialDaysRemaining !== null && (
          <View style={[styles.trialBanner, { backgroundColor: `${AppColors.warning}15` }]}>
            <Feather name="clock" size={16} color={AppColors.warning} />
            <View style={styles.trialTextContainer}>
              <ThemedText style={[styles.trialTitle, { color: AppColors.warning }]}>
                Trial expires in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? "s" : ""}
              </ThemedText>
              <ThemedText style={[styles.trialSubtitle, { color: theme.textSecondary }]}>
                After your trial ends, you'll be moved to the Basic plan with limited features.
              </ThemedText>
            </View>
          </View>
        )}
      </GlassCard>

      <GlassCard style={styles.usageCard}>
        <ThemedText style={styles.sectionTitle}>Usage Summary</ThemedText>
        <View style={styles.usageGrid}>
          <View style={styles.usageItem}>
            <View style={[styles.usageIconContainer, { backgroundColor: `${AppColors.primary}15` }]}>
              <Feather name="package" size={18} color={AppColors.primary} />
            </View>
            <View style={styles.usageTextContainer}>
              <ThemedText style={[styles.usageLabel, { color: theme.textSecondary }]}>
                Pantry Items
              </ThemedText>
              <ThemedText style={styles.usageValue}>
                {formatLimit(entitlements.maxPantryItems, usage.pantryItemCount)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.usageItem}>
            <View style={[styles.usageIconContainer, { backgroundColor: `${AppColors.secondary}15` }]}>
              <Feather name="zap" size={18} color={AppColors.secondary} />
            </View>
            <View style={styles.usageTextContainer}>
              <ThemedText style={[styles.usageLabel, { color: theme.textSecondary }]}>
                AI Recipes This Month
              </ThemedText>
              <ThemedText style={styles.usageValue}>
                {formatLimit(entitlements.maxAiRecipes, usage.aiRecipesUsedThisMonth)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.usageItem}>
            <View style={[styles.usageIconContainer, { backgroundColor: `${AppColors.accent}15` }]}>
              <Feather name="tool" size={18} color={AppColors.accent} />
            </View>
            <View style={styles.usageTextContainer}>
              <ThemedText style={[styles.usageLabel, { color: theme.textSecondary }]}>
                Cookware
              </ThemedText>
              <ThemedText style={styles.usageValue}>
                {formatLimit(entitlements.maxCookware, usage.cookwareCount)}
              </ThemedText>
            </View>
          </View>
        </View>
      </GlassCard>

      <GlassCard style={styles.featuresCard}>
        <ThemedText style={styles.sectionTitle}>Feature Comparison</ThemedText>
        <View style={styles.comparisonHeader}>
          <ThemedText style={[styles.featureLabel, { flex: 1 }]}>Feature</ThemedText>
          <ThemedText style={[styles.tierLabel, { color: theme.textSecondary }]}>Basic</ThemedText>
          <ThemedText style={[styles.tierLabel, { color: AppColors.warning }]}>Pro</ThemedText>
        </View>

        {PRO_FEATURES.map((feature, index) => {
          const isUpgradeHighlight = !isProUser && feature.pro === true;
          return (
            <View
              key={feature.key}
              style={[
                styles.featureRow,
                index === PRO_FEATURES.length - 1 && styles.featureRowLast,
                isUpgradeHighlight && { backgroundColor: `${AppColors.primary}08` },
              ]}
            >
              <ThemedText
                style={[styles.featureName, isUpgradeHighlight && { color: AppColors.primary }]}
                numberOfLines={2}
              >
                {feature.name}
              </ThemedText>
              <View style={styles.tierValue}>
                {typeof feature.basic === "boolean" ? (
                  <Feather
                    name={feature.basic ? "check" : "x"}
                    size={16}
                    color={feature.basic ? AppColors.success : theme.textSecondary}
                  />
                ) : (
                  <ThemedText style={[styles.tierValueText, { color: theme.textSecondary }]}>
                    {feature.basic}
                  </ThemedText>
                )}
              </View>
              <View style={styles.tierValue}>
                {typeof feature.pro === "boolean" ? (
                  <Feather
                    name={feature.pro ? "check" : "x"}
                    size={16}
                    color={feature.pro ? AppColors.success : theme.textSecondary}
                  />
                ) : (
                  <ThemedText style={[styles.tierValueText, { color: AppColors.success }]}>
                    {feature.pro}
                  </ThemedText>
                )}
              </View>
            </View>
          );
        })}
      </GlassCard>

      {!isProUser && (
        <GlassCard style={styles.upgradeCard}>
          <View style={styles.upgradeHeader}>
            <Feather name="trending-up" size={24} color={AppColors.warning} />
            <ThemedText style={styles.upgradeTitle}>Upgrade to Pro</ThemedText>
          </View>
          <ThemedText style={[styles.upgradeDescription, { color: theme.textSecondary }]}>
            Unlock unlimited pantry items, AI recipes, and access to all premium features.
          </ThemedText>

          <View style={styles.pricingOptions}>
            <View style={styles.priceOption}>
              <ThemedText style={styles.priceLabel}>Monthly</ThemedText>
              <ThemedText style={styles.priceAmount}>${MONTHLY_PRICES.PRO.toFixed(2)}</ThemedText>
              <ThemedText style={[styles.priceFrequency, { color: theme.textSecondary }]}>
                per month
              </ThemedText>
            </View>
            <View style={[styles.priceOption, styles.priceOptionHighlight]}>
              <View style={[styles.savingsBadge, { backgroundColor: AppColors.success }]}>
                <ThemedText style={styles.savingsText}>Save 17%</ThemedText>
              </View>
              <ThemedText style={styles.priceLabel}>Annual</ThemedText>
              <ThemedText style={styles.priceAmount}>${(ANNUAL_PRICES.PRO / 12).toFixed(2)}</ThemedText>
              <ThemedText style={[styles.priceFrequency, { color: theme.textSecondary }]}>
                per month (${ANNUAL_PRICES.PRO.toFixed(2)}/year)
              </ThemedText>
            </View>
          </View>

          <GlassButton
            onPress={isPaywallAvailable ? handlePresentPaywall : () => handleUpgrade('annual')}
            disabled={isCheckingOut}
            style={styles.upgradeButton}
            icon={
              isCheckingOut ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="star" size={18} color="#FFFFFF" />
              )
            }
            testID="button-upgrade-pro"
          >
            {isCheckingOut ? "Loading..." : "Upgrade to Pro"}
          </GlassButton>
        </GlassCard>
      )}

      {isProUser && isActive && !isTrialing && (
        <GlassCard style={styles.manageCard}>
          <ThemedText style={styles.sectionTitle}>Manage Subscription</ThemedText>
          <ThemedText style={[styles.manageDescription, { color: theme.textSecondary }]}>
            Update your payment method, change your billing cycle, or cancel your subscription.
          </ThemedText>

          <GlassButton
            onPress={shouldUseStoreKit ? handleOpenCustomerCenter : handleManageSubscription}
            disabled={isManaging}
            style={styles.manageButton}
            icon={
              isManaging ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name={shouldUseStoreKit ? "settings" : "external-link"} size={18} color="#FFFFFF" />
              )
            }
            testID="button-manage-subscription"
          >
            {isManaging ? "Opening..." : "Manage Subscription"}
          </GlassButton>
        </GlassCard>
      )}

      {isTrialing && (
        <GlassCard style={styles.upgradeCard}>
          <View style={styles.upgradeHeader}>
            <Feather name="star" size={24} color={AppColors.warning} />
            <ThemedText style={styles.upgradeTitle}>Subscribe to Keep Pro</ThemedText>
          </View>
          <ThemedText style={[styles.upgradeDescription, { color: theme.textSecondary }]}>
            Your trial ends soon. Subscribe now to keep unlimited access to all Pro features.
          </ThemedText>

          <View style={styles.pricingOptions}>
            <View style={styles.priceOption}>
              <ThemedText style={styles.priceLabel}>Monthly</ThemedText>
              <ThemedText style={styles.priceAmount}>${MONTHLY_PRICES.PRO.toFixed(2)}</ThemedText>
              <ThemedText style={[styles.priceFrequency, { color: theme.textSecondary }]}>
                per month
              </ThemedText>
            </View>
            <View style={[styles.priceOption, styles.priceOptionHighlight]}>
              <View style={[styles.savingsBadge, { backgroundColor: AppColors.success }]}>
                <ThemedText style={styles.savingsText}>Save 17%</ThemedText>
              </View>
              <ThemedText style={styles.priceLabel}>Annual</ThemedText>
              <ThemedText style={styles.priceAmount}>${(ANNUAL_PRICES.PRO / 12).toFixed(2)}</ThemedText>
              <ThemedText style={[styles.priceFrequency, { color: theme.textSecondary }]}>
                per month (${ANNUAL_PRICES.PRO.toFixed(2)}/year)
              </ThemedText>
            </View>
          </View>

          <GlassButton
            onPress={isPaywallAvailable ? handlePresentPaywall : () => handleUpgrade('annual')}
            disabled={isCheckingOut}
            style={styles.upgradeButton}
            icon={
              isCheckingOut ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="credit-card" size={18} color="#FFFFFF" />
              )
            }
            testID="button-subscribe-pro"
          >
            {isCheckingOut ? "Loading..." : "Subscribe to Pro"}
          </GlassButton>
        </GlassCard>
      )}

      {shouldUseStoreKit && (
        <Pressable
          onPress={handleRestorePurchases}
          disabled={isRestoring}
          style={[styles.refreshButton, { borderColor: theme.border }]}
          data-testid="button-restore-purchases"
        >
          {isRestoring ? (
            <ActivityIndicator size="small" color={theme.textSecondary} />
          ) : (
            <Feather name="rotate-ccw" size={16} color={theme.textSecondary} />
          )}
          <ThemedText style={[styles.refreshText, { color: theme.textSecondary }]}>
            {isRestoring ? "Restoring..." : "Restore Purchases"}
          </ThemedText>
        </Pressable>
      )}

      <Pressable
        onPress={refetch}
        style={[styles.refreshButton, { borderColor: theme.border }]}
        data-testid="button-refresh-subscription"
      >
        <Feather name="refresh-cw" size={16} color={theme.textSecondary} />
        <ThemedText style={[styles.refreshText, { color: theme.textSecondary }]}>
          Refresh subscription status
        </ThemedText>
      </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: 16,
  },
  planCard: {
    padding: Spacing.lg,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  planBadge: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: `${AppColors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  planName: {
    fontSize: 22,
    fontWeight: "700",
  },
  planPrice: {
    fontSize: 14,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  trialBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  trialTextContainer: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  trialSubtitle: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  usageCard: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  usageGrid: {
    gap: Spacing.md,
  },
  usageItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  usageIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  usageTextContainer: {
    flex: 1,
  },
  usageLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  usageValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  featuresCard: {
    padding: Spacing.lg,
  },
  comparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  featureLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tierLabel: {
    width: 60,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.05)",
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
  tierValue: {
    width: 60,
    alignItems: "center",
  },
  tierValueText: {
    fontSize: 13,
    fontWeight: "500",
  },
  upgradeCard: {
    padding: Spacing.lg,
  },
  upgradeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  upgradeDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  pricingOptions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  priceOption: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    alignItems: "center",
  },
  priceOptionHighlight: {
    borderColor: AppColors.primary,
    borderWidth: 2,
    position: "relative",
  },
  savingsBadge: {
    position: "absolute",
    top: -10,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  savingsText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 28,
    fontWeight: "700",
  },
  priceFrequency: {
    fontSize: 11,
    marginTop: 2,
    textAlign: "center",
  },
  upgradeButton: {
    marginTop: Spacing.sm,
  },
  manageCard: {
    padding: Spacing.lg,
  },
  manageDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  manageButton: {
    marginTop: Spacing.sm,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  refreshText: {
    fontSize: 14,
  },
});
