import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  Linking,
  Alert,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { CookPotLoader } from "@/components/CookPotLoader";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useStoreKit } from "@/hooks/useStoreKit";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { webAccessibilityProps } from "@/lib/web-accessibility";
import {
  MONTHLY_PRICES,
  ANNUAL_PRICES,
  SubscriptionTier,
} from "../../shared/subscription";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const PRO_FEATURES = [
  { key: "pantryItems", name: "Pantry Items", basic: "25", pro: "Unlimited" },
  { key: "aiRecipes", name: "AI Recipes/Month", basic: "5", pro: "Unlimited" },
  { key: "cookware", name: "Cookware Items", basic: "5", pro: "Unlimited" },
  { key: "recipeScanning", name: "Recipe Scanning", basic: false, pro: true },
  { key: "bulkScanning", name: "Bulk Scanning", basic: false, pro: true },
  {
    key: "aiAssistant",
    name: "Live AI Kitchen Assistant",
    basic: false,
    pro: true,
  },
  {
    key: "customStorage",
    name: "Custom Storage Areas",
    basic: false,
    pro: true,
  },
  {
    key: "weeklyMealPrep",
    name: "Weekly Meal Prepping",
    basic: false,
    pro: true,
  },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type SubscriptionRouteProp = RouteProp<RootStackParamList, "Subscription">;

export default function SubscriptionScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SubscriptionRouteProp>();
  const menuItems: MenuItemConfig[] = [];
  const { token, isAuthenticated } = useAuth();
  const {
    tier,
    status,
    isProUser,
    isTrialing,
    isActive,
    isLoading,
    isTrialExpired,
    trialDaysRemaining,
    entitlements,
    usage,
    refetch,
  } = useSubscription();

  // Check if this is a blocking subscription gate (trial/subscription expired)
  // Block when: routed with expired reason, trial is expired, or subscription is inactive (but user is authenticated)
  const reason = route.params?.reason;
  const subscriptionInactive = !isActive && !isLoading && isAuthenticated;
  const isBlocking =
    reason === "expired" || isTrialExpired || subscriptionInactive;

  // Block hardware back button when subscription is required
  useEffect(() => {
    if (!isBlocking) return;

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // Prevent going back when subscription is required
        return true;
      },
    );

    return () => backHandler.remove();
  }, [isBlocking]);

  const {
    isAvailable: isStoreKitAvailable,
    offerings,
    purchasePackage,
    restorePurchases,
    presentCustomerCenter,
    isCustomerCenterAvailable,
  } = useStoreKit();

  const shouldUseStoreKit =
    (Platform.OS === "ios" || Platform.OS === "android") && isStoreKitAvailable;

  const [isManaging, setIsManaging] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">(
    "annual",
  );
  const [selectedTier, setSelectedTier] = useState<"basic" | "pro">("pro");

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
        return {
          label: `Trial (${trialDaysRemaining} days left)`,
          color: AppColors.warning,
        };
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

  const handleNavigateToAuth = () => {
    navigation.navigate("Auth");
  };

  const handleOpenPrivacyPolicy = () => {
    if (Platform.OS === "web") {
      window.open("/privacy", "_blank");
    } else {
      navigation.navigate("Privacy" as any);
    }
  };

  const handleOpenTermsOfUse = () => {
    if (Platform.OS === "web") {
      window.open("/terms", "_blank");
    } else {
      navigation.navigate("Terms" as any);
    }
  };

  const handleUpgrade = async (
    tier: "basic" | "pro" = "pro",
    plan: "monthly" | "annual" = "annual",
  ) => {
    setIsCheckingOut(true);
    const tierName = tier === "pro" ? "Pro" : "Basic";

    try {
      if (Platform.OS === "ios" || Platform.OS === "android") {
        if (!shouldUseStoreKit || !offerings) {
          Alert.alert(
            "Not Available",
            "In-app purchases are not available. Please try again later or contact support.",
            [{ text: "OK" }],
          );
          return;
        }

        // Build tier-specific package identifier
        // RevenueCat packages should be named: basic_monthly, basic_annual, pro_monthly, pro_annual
        const expectedPackageId = `${tier}_${plan}`;

        // Find package that matches the specific tier and plan - NO FALLBACK to prevent wrong tier purchase
        const pkg = offerings.availablePackages.find((p) => {
          const id = p.identifier.toLowerCase();
          // Match tier-specific identifiers only
          return (
            id === expectedPackageId ||
            (id.includes(tier) && id.includes(plan)) ||
            (id.includes(tier) &&
              p.packageType === (plan === "monthly" ? "MONTHLY" : "ANNUAL"))
          );
        });

        if (!pkg) {
          Alert.alert(
            "Package Not Available",
            `The ${tierName} ${plan} subscription is not yet configured. Please contact support or try a different option.`,
            [{ text: "OK" }],
          );
          return;
        }

        const success = await purchasePackage(pkg);
        if (success) {
          refetch();
          // Show different message for unauthenticated users (Apple 5.1.1 compliance)
          if (!isAuthenticated) {
            Alert.alert(
              "Subscription Active!",
              `Thank you for subscribing to ${tierName}! You can now use ChefSpAIce. Creating an account is optional but lets you sync across devices.`,
              [
                {
                  text: "Continue to App",
                  onPress: () => navigation.navigate("Onboarding"),
                },
                {
                  text: "Create Account",
                  onPress: () => navigation.navigate("Auth"),
                },
              ],
            );
          } else {
            Alert.alert("Success", `Thank you for subscribing to ${tierName}!`);
          }
        }
        return;
      }

      if (Platform.OS === "web") {
        const baseUrl = getApiUrl();

        const pricesResponse = await fetch(
          `${baseUrl}/api/subscriptions/prices`,
        );
        const prices = await pricesResponse.json();

        // Get price ID based on tier and plan - require exact match, no fallback
        const priceKey =
          tier === "pro"
            ? plan === "monthly"
              ? "proMonthly"
              : "proAnnual"
            : plan === "monthly"
              ? "basicMonthly"
              : "basicAnnual";
        const priceId = prices[priceKey]?.id;

        if (!priceId) {
          Alert.alert(
            "Price Not Available",
            `The ${tierName} ${plan} subscription pricing is not yet configured. Please contact support or try a different option.`,
            [{ text: "OK" }],
          );
          return;
        }

        const response = await fetch(
          `${baseUrl}/api/subscriptions/create-checkout-session`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: "include",
            body: JSON.stringify({
              priceId,
              tier,
              successUrl: `${window.location.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
              cancelUrl: `${window.location.origin}/subscription-canceled`,
            }),
          },
        );

        if (response.ok) {
          const data = await response.json();
          if (data.url) {
            window.location.href = data.url;
          }
        } else {
          const errorData = await response.json();
          Alert.alert(
            "Error",
            errorData.error || "Failed to start checkout. Please try again.",
          );
        }
      }
    } catch (error) {
      console.error("Error starting checkout:", error);
      Alert.alert("Error", "Something went wrong. Please try again later.");
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
        Alert.alert("Success", "Purchases restored successfully!");
        refetch();
      } else {
        Alert.alert(
          "No Purchases Found",
          "No previous purchases were found to restore.",
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to restore purchases. Please try again.");
    } finally {
      setIsRestoring(false);
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
      console.error("Error opening customer center:", error);
      handleManageSubscription();
    }
  };

  const statusInfo = getStatusDisplay();

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <CookPotLoader size="lg" text="Loading subscription..." />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ExpoGlassHeader
        title={isBlocking ? "Choose Your Plan" : "Subscription"}
        screenKey="subscription"
        showSearch={false}
        showBackButton={!isBlocking}
        menuItems={menuItems}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: "transparent" }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 56 + insets.top + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isBlocking && (
          <GlassCard
            style={[
              styles.blockingBanner,
              { backgroundColor: `${AppColors.warning}15` },
            ]}
          >
            <Feather name="alert-circle" size={24} color={AppColors.warning} />
            <View style={styles.blockingTextContainer}>
              <ThemedText type="h4" style={{ color: AppColors.warning }}>
                Subscription Required
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Your trial has ended. Choose a plan below to continue using
                ChefSpAIce.
              </ThemedText>
            </View>
          </GlassCard>
        )}

        <GlassCard style={styles.planCard}>
          <View style={styles.sectionHeader}>
            <Feather
              name="credit-card"
              size={20}
              color={theme.textSecondaryOnGlass}
            />
            <ThemedText
              style={[
                styles.sectionTitle,
                { color: theme.textSecondaryOnGlass },
              ]}
            >
              Current Plan
            </ThemedText>
          </View>
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
                <ThemedText
                  style={[styles.planPrice, { color: theme.textSecondary }]}
                >
                  {getMonthlyPrice()}
                </ThemedText>
              </View>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${statusInfo.color}20` },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusInfo.color },
                ]}
              />
              <ThemedText
                style={[styles.statusText, { color: statusInfo.color }]}
              >
                {statusInfo.label}
              </ThemedText>
            </View>
          </View>

          {isTrialing && trialDaysRemaining !== null && (
            <View
              style={[
                styles.trialBanner,
                { backgroundColor: `${AppColors.warning}15` },
              ]}
            >
              <Feather name="clock" size={16} color={AppColors.warning} />
              <View style={styles.trialTextContainer}>
                <ThemedText
                  style={[styles.trialTitle, { color: AppColors.warning }]}
                >
                  Trial expires in {trialDaysRemaining} day
                  {trialDaysRemaining !== 1 ? "s" : ""}
                </ThemedText>
                <ThemedText
                  style={[styles.trialSubtitle, { color: theme.textSecondary }]}
                >
                  Choose a plan below to continue using ChefSpAIce after your
                  trial.
                </ThemedText>
              </View>
            </View>
          )}
        </GlassCard>

        <GlassCard style={styles.usageCard}>
          <View style={styles.sectionHeader}>
            <Feather
              name="bar-chart-2"
              size={20}
              color={theme.textSecondaryOnGlass}
            />
            <ThemedText
              style={[
                styles.sectionTitle,
                { color: theme.textSecondaryOnGlass },
              ]}
            >
              Usage Summary
            </ThemedText>
          </View>
          <View style={styles.usageGrid}>
            <View style={styles.usageItem}>
              <View
                style={[
                  styles.usageIconContainer,
                  { backgroundColor: `${AppColors.primary}15` },
                ]}
              >
                <Feather name="package" size={18} color={AppColors.primary} />
              </View>
              <View style={styles.usageTextContainer}>
                <ThemedText
                  style={[styles.usageLabel, { color: theme.textSecondary }]}
                >
                  Pantry Items
                </ThemedText>
                <ThemedText style={styles.usageValue}>
                  {formatLimit(
                    entitlements.maxPantryItems,
                    usage.pantryItemCount,
                  )}
                </ThemedText>
              </View>
            </View>

            <View style={styles.usageItem}>
              <View
                style={[
                  styles.usageIconContainer,
                  { backgroundColor: `${AppColors.secondary}15` },
                ]}
              >
                <Feather name="zap" size={18} color={AppColors.secondary} />
              </View>
              <View style={styles.usageTextContainer}>
                <ThemedText
                  style={[styles.usageLabel, { color: theme.textSecondary }]}
                >
                  AI Recipes This Month
                </ThemedText>
                <ThemedText style={styles.usageValue}>
                  {formatLimit(
                    entitlements.maxAiRecipes,
                    usage.aiRecipesUsedThisMonth,
                  )}
                </ThemedText>
              </View>
            </View>

            <View style={styles.usageItem}>
              <View
                style={[
                  styles.usageIconContainer,
                  { backgroundColor: `${AppColors.accent}15` },
                ]}
              >
                <Feather name="tool" size={18} color={AppColors.accent} />
              </View>
              <View style={styles.usageTextContainer}>
                <ThemedText
                  style={[styles.usageLabel, { color: theme.textSecondary }]}
                >
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
          <View style={styles.sectionHeader}>
            <Feather
              name="layers"
              size={20}
              color={theme.textSecondaryOnGlass}
            />
            <ThemedText
              style={[
                styles.sectionTitle,
                { color: theme.textSecondaryOnGlass },
              ]}
            >
              Feature Comparison
            </ThemedText>
          </View>
          <View style={styles.comparisonHeader}>
            <ThemedText style={[styles.featureLabel, { flex: 1 }]}>
              Feature
            </ThemedText>
            <ThemedText
              style={[styles.tierLabel, { color: theme.textSecondary }]}
            >
              Basic
            </ThemedText>
            <ThemedText
              style={[styles.tierLabel, { color: AppColors.warning }]}
            >
              Pro
            </ThemedText>
          </View>

          {PRO_FEATURES.map((feature, index) => {
            const isUpgradeHighlight = !isProUser && feature.pro === true;
            return (
              <View
                key={feature.key}
                style={[
                  styles.featureRow,
                  index === PRO_FEATURES.length - 1 && styles.featureRowLast,
                  isUpgradeHighlight && {
                    backgroundColor: `${AppColors.primary}08`,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.featureName,
                    { color: theme.textSecondaryOnGlass },
                  ]}
                  numberOfLines={2}
                >
                  {feature.name}
                </ThemedText>
                <View style={styles.tierValue}>
                  {typeof feature.basic === "boolean" ? (
                    <Feather
                      name={feature.basic ? "check" : "x"}
                      size={16}
                      color={
                        feature.basic ? AppColors.success : theme.textSecondary
                      }
                    />
                  ) : (
                    <ThemedText
                      style={[
                        styles.tierValueText,
                        { color: theme.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {feature.basic}
                    </ThemedText>
                  )}
                </View>
                <View style={styles.tierValue}>
                  {typeof feature.pro === "boolean" ? (
                    <Feather
                      name={feature.pro ? "check" : "x"}
                      size={16}
                      color={
                        feature.pro ? AppColors.success : theme.textSecondary
                      }
                    />
                  ) : (
                    <ThemedText
                      style={[
                        styles.tierValueText,
                        { color: AppColors.success },
                      ]}
                      numberOfLines={1}
                    >
                      {feature.pro}
                    </ThemedText>
                  )}
                </View>
              </View>
            );
          })}
        </GlassCard>

        {/* Show purchase options for: unauthenticated users OR authenticated users without subscription */}
        {(!isAuthenticated || (!isProUser && !isTrialing)) && (
          <GlassCard style={styles.upgradeCard}>
            <View style={styles.upgradeHeader}>
              <Feather
                name="shopping-bag"
                size={20}
                color={theme.textSecondaryOnGlass}
              />
              <ThemedText
                style={[
                  styles.upgradeTitle,
                  { color: theme.textSecondaryOnGlass },
                ]}
              >
                Choose Your Plan
              </ThemedText>
            </View>
            <ThemedText
              style={[
                styles.upgradeDescription,
                { color: theme.textSecondaryOnGlass },
              ]}
            >
              Select the plan that works best for you.
            </ThemedText>

            {/* Billing Period Toggle */}
            <View style={styles.billingToggleContainer}>
              <Pressable
                style={[
                  styles.billingToggleButton,
                  selectedPlan === "monthly" &&
                    styles.billingToggleButtonActive,
                ]}
                onPress={() => setSelectedPlan("monthly")}
                data-testid="button-billing-monthly"
                {...webAccessibilityProps(() => setSelectedPlan("monthly"))}
              >
                <ThemedText
                  style={[
                    styles.billingToggleText,
                    selectedPlan === "monthly" &&
                      styles.billingToggleTextActive,
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
                onPress={() => setSelectedPlan("annual")}
                data-testid="button-billing-annual"
                {...webAccessibilityProps(() => setSelectedPlan("annual"))}
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

            {/* Tier Selection */}
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
                onPress={() => setSelectedTier("basic")}
                data-testid="button-select-basic"
                {...webAccessibilityProps(() => setSelectedTier("basic"))}
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
                >
                  $
                  {selectedPlan === "monthly"
                    ? MONTHLY_PRICES.BASIC.toFixed(2)
                    : ANNUAL_PRICES.BASIC.toFixed(2)}
                  <ThemedText
                    style={[
                      styles.tierCardInterval,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {selectedPlan === "monthly" ? "/month" : "/year"}
                  </ThemedText>
                </ThemedText>
                {selectedPlan === "annual" && (
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
                onPress={() => setSelectedTier("pro")}
                data-testid="button-select-pro"
                {...webAccessibilityProps(() => setSelectedTier("pro"))}
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
                >
                  $
                  {selectedPlan === "monthly"
                    ? MONTHLY_PRICES.PRO.toFixed(2)
                    : ANNUAL_PRICES.PRO.toFixed(2)}
                  <ThemedText
                    style={[
                      styles.tierCardInterval,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {selectedPlan === "monthly" ? "/month" : "/year"}
                  </ThemedText>
                </ThemedText>
                {selectedPlan === "annual" && (
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

            <GlassButton
              onPress={() => handleUpgrade(selectedTier, selectedPlan)}
              disabled={isCheckingOut}
              style={styles.upgradeButton}
              icon={
                isCheckingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather
                    name={selectedTier === "pro" ? "star" : "check-circle"}
                    size={18}
                    color="#FFFFFF"
                  />
                )
              }
              testID="button-subscribe"
            >
              {isCheckingOut
                ? "Loading..."
                : `Subscribe to ${selectedTier === "pro" ? "Pro" : "Basic"}`}
            </GlassButton>

            <ThemedText
              style={[styles.subscriptionTerms, { color: theme.textSecondary }]}
            >
              Subscription automatically renews unless auto-renew is turned off
              at least 24 hours before the end of the current period. Payment
              will be charged to your Apple ID account at confirmation of
              purchase. Manage subscriptions in Account Settings after purchase.
            </ThemedText>
            <View style={styles.legalLinksContainer}>
              <Pressable
                onPress={handleOpenPrivacyPolicy}
                data-testid="link-privacy-policy"
                {...webAccessibilityProps(handleOpenPrivacyPolicy)}
              >
                <ThemedText
                  style={[styles.legalLink, { color: AppColors.primary }]}
                >
                  Privacy Policy
                </ThemedText>
              </Pressable>
              <ThemedText
                style={[styles.legalSeparator, { color: theme.textSecondary }]}
              >
                |
              </ThemedText>
              <Pressable
                onPress={handleOpenTermsOfUse}
                data-testid="link-terms-of-use"
                {...webAccessibilityProps(handleOpenTermsOfUse)}
              >
                <ThemedText
                  style={[styles.legalLink, { color: AppColors.primary }]}
                >
                  Terms of Use
                </ThemedText>
              </Pressable>
            </View>
          </GlassCard>
        )}

        {isProUser && isActive && !isTrialing && (
          <GlassCard style={styles.manageCard}>
            <View style={styles.sectionHeader}>
              <Feather
                name="settings"
                size={20}
                color={theme.textSecondaryOnGlass}
              />
              <ThemedText
                style={[
                  styles.sectionTitle,
                  { color: theme.textSecondaryOnGlass },
                ]}
              >
                Manage Subscription
              </ThemedText>
            </View>
            <ThemedText
              style={[styles.manageDescription, { color: theme.textSecondary }]}
            >
              Update your payment method, change your billing cycle, or cancel
              your subscription.
            </ThemedText>

            <GlassButton
              onPress={
                shouldUseStoreKit
                  ? handleOpenCustomerCenter
                  : handleManageSubscription
              }
              disabled={isManaging}
              style={styles.manageButton}
              icon={
                isManaging ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather
                    name={shouldUseStoreKit ? "settings" : "external-link"}
                    size={18}
                    color="#FFFFFF"
                  />
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
              <Feather
                name="shopping-bag"
                size={20}
                color={theme.textSecondaryOnGlass}
              />
              <ThemedText
                style={[
                  styles.upgradeTitle,
                  { color: theme.textSecondaryOnGlass },
                ]}
              >
                Choose Your Plan
              </ThemedText>
            </View>
            <ThemedText
              style={[
                styles.upgradeDescription,
                { color: theme.textSecondaryOnGlass },
              ]}
            >
              Your trial ends soon. Choose a plan to continue using ChefSpAIce.
            </ThemedText>

            {/* Billing Period Toggle */}
            <View style={styles.billingToggleContainer}>
              <Pressable
                style={[
                  styles.billingToggleButton,
                  selectedPlan === "monthly" &&
                    styles.billingToggleButtonActive,
                ]}
                onPress={() => setSelectedPlan("monthly")}
                data-testid="button-trial-billing-monthly"
                {...webAccessibilityProps(() => setSelectedPlan("monthly"))}
              >
                <ThemedText
                  style={[
                    styles.billingToggleText,
                    selectedPlan === "monthly" &&
                      styles.billingToggleTextActive,
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
                onPress={() => setSelectedPlan("annual")}
                data-testid="button-trial-billing-annual"
                {...webAccessibilityProps(() => setSelectedPlan("annual"))}
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

            {/* Tier Selection */}
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
                onPress={() => setSelectedTier("basic")}
                data-testid="button-trial-select-basic"
                {...webAccessibilityProps(() => setSelectedTier("basic"))}
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
                >
                  $
                  {selectedPlan === "monthly"
                    ? MONTHLY_PRICES.BASIC.toFixed(2)
                    : ANNUAL_PRICES.BASIC.toFixed(2)}
                  <ThemedText
                    style={[
                      styles.tierCardInterval,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {selectedPlan === "monthly" ? "/month" : "/year"}
                  </ThemedText>
                </ThemedText>
                {selectedPlan === "annual" && (
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
                onPress={() => setSelectedTier("pro")}
                data-testid="button-trial-select-pro"
                {...webAccessibilityProps(() => setSelectedTier("pro"))}
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
                >
                  $
                  {selectedPlan === "monthly"
                    ? MONTHLY_PRICES.PRO.toFixed(2)
                    : ANNUAL_PRICES.PRO.toFixed(2)}
                  <ThemedText
                    style={[
                      styles.tierCardInterval,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {selectedPlan === "monthly" ? "/month" : "/year"}
                  </ThemedText>
                </ThemedText>
                {selectedPlan === "annual" && (
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

            <GlassButton
              onPress={() => handleUpgrade(selectedTier, selectedPlan)}
              disabled={isCheckingOut}
              style={styles.upgradeButton}
              icon={
                isCheckingOut ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather
                    name={selectedTier === "pro" ? "star" : "check-circle"}
                    size={18}
                    color="#FFFFFF"
                  />
                )
              }
              testID="button-trial-subscribe"
            >
              {isCheckingOut
                ? "Loading..."
                : `Subscribe to ${selectedTier === "pro" ? "Pro" : "Basic"}`}
            </GlassButton>

            <ThemedText
              style={[styles.subscriptionTerms, { color: theme.textSecondary }]}
            >
              Subscription automatically renews unless auto-renew is turned off
              at least 24 hours before the end of the current period. Payment
              will be charged to your Apple ID account at confirmation of
              purchase. Manage subscriptions in Account Settings after purchase.
            </ThemedText>
            <View style={styles.legalLinksContainer}>
              <Pressable
                onPress={handleOpenPrivacyPolicy}
                data-testid="link-trial-privacy-policy"
                {...webAccessibilityProps(handleOpenPrivacyPolicy)}
              >
                <ThemedText
                  style={[styles.legalLink, { color: AppColors.primary }]}
                >
                  Privacy Policy
                </ThemedText>
              </Pressable>
              <ThemedText
                style={[styles.legalSeparator, { color: theme.textSecondary }]}
              >
                |
              </ThemedText>
              <Pressable
                onPress={handleOpenTermsOfUse}
                data-testid="link-trial-terms-of-use"
                {...webAccessibilityProps(handleOpenTermsOfUse)}
              >
                <ThemedText
                  style={[styles.legalLink, { color: AppColors.primary }]}
                >
                  Terms of Use
                </ThemedText>
              </Pressable>
            </View>
          </GlassCard>
        )}

        {shouldUseStoreKit && (
          <Pressable
            onPress={handleRestorePurchases}
            disabled={isRestoring}
            style={[styles.refreshButton, { borderColor: theme.border }]}
            data-testid="button-restore-purchases"
            {...webAccessibilityProps(handleRestorePurchases)}
          >
            {isRestoring ? (
              <ActivityIndicator
                size="small"
                color={theme.textSecondaryOnGlass}
              />
            ) : (
              <Feather
                name="rotate-ccw"
                size={16}
                color={theme.textSecondaryOnGlass}
              />
            )}
            <ThemedText
              style={[
                styles.refreshText,
                { color: theme.textSecondaryOnGlass },
              ]}
            >
              {isRestoring ? "Restoring..." : "Restore Purchases"}
            </ThemedText>
          </Pressable>
        )}

        {isAuthenticated && (
          <Pressable
            onPress={refetch}
            style={[styles.refreshButton, { borderColor: theme.border }]}
            data-testid="button-refresh-subscription"
            {...webAccessibilityProps(refetch)}
          >
            <Feather name="refresh-cw" size={16} color={theme.textSecondary} />
            <ThemedText
              style={[styles.refreshText, { color: theme.textSecondary }]}
            >
              Refresh subscription status
            </ThemedText>
          </Pressable>
        )}

        {/* Continue to App option for unauthenticated users with active subscription (Apple 5.1.1 compliance) */}
        {!isAuthenticated && isActive && (
          <GlassCard style={styles.successCard}>
            <View style={styles.sectionHeader}>
              <Feather
                name="check-circle"
                size={20}
                color={AppColors.success}
              />
              <ThemedText
                style={[styles.sectionTitle, { color: AppColors.success }]}
              >
                Subscription Active!
              </ThemedText>
            </View>
            <ThemedText
              style={[
                styles.successDescription,
                { color: theme.textSecondaryOnGlass },
              ]}
            >
              You're all set! You can start using ChefSpAIce right away.
            </ThemedText>
            <GlassButton
              onPress={() => navigation.navigate("Onboarding")}
              style={styles.continueButton}
              icon={<Feather name="arrow-right" size={18} color="#FFFFFF" />}
              testID="button-continue-to-app"
            >
              Continue to App
            </GlassButton>
          </GlassCard>
        )}

        {/* Optional account creation for unauthenticated users (Apple 5.1.1 compliance) */}
        {!isAuthenticated && (
          <GlassCard style={styles.signInCard}>
            <View style={styles.sectionHeader}>
              <Feather
                name="user"
                size={20}
                color={theme.textSecondaryOnGlass}
              />
              <ThemedText
                style={[
                  styles.sectionTitle,
                  { color: theme.textSecondaryOnGlass },
                ]}
              >
                {isActive
                  ? "Optional: Create an Account"
                  : "Already have an account?"}
              </ThemedText>
            </View>
            <ThemedText
              style={[
                styles.signInDescription,
                { color: theme.textSecondaryOnGlass },
              ]}
            >
              {isActive
                ? "Creating an account lets you sync your subscription and data across all your devices. This is optional."
                : "Sign in to sync your subscription across all your devices."}
            </ThemedText>
            <GlassButton
              onPress={handleNavigateToAuth}
              variant="secondary"
              style={styles.signInButton}
              icon={
                <Feather name="log-in" size={18} color={AppColors.primary} />
              }
              testID="button-sign-in"
            >
              {isActive ? "Create Account" : "Sign In"}
            </GlassButton>
          </GlassCard>
        )}
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
  blockingBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  blockingTextContainer: {
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
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
    width: 70,
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
  subscriptionTerms: {
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: Spacing.md,
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
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
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
  successCard: {
    padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  successDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  continueButton: {
    marginTop: Spacing.sm,
  },
  signInCard: {
    padding: Spacing.lg,
    marginTop: Spacing.sm,
  },
  signInHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  signInTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  signInDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  signInButton: {
    marginTop: Spacing.sm,
  },
  legalLinksContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  legalLink: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  legalSeparator: {
    fontSize: 14,
  },
});
