import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
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
import { useManageSubscription } from "@/hooks/useManageSubscription";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { webAccessibilityProps } from "@/lib/web-accessibility";
import {
  MONTHLY_PRICES,
  ANNUAL_PRICES,
  SubscriptionTier,
} from "@shared/subscription";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { logger } from "@/lib/logger";

import { CurrentPlanCard } from "@/components/subscription/CurrentPlanCard";
import { FeatureComparisonTable, PRO_FEATURES } from "@/components/subscription/FeatureComparisonTable";
import { PlanToggle } from "@/components/subscription/PlanToggle";
import { TierSelector } from "@/components/subscription/TierSelector";
import { CancellationFlowModal } from "@/components/subscription/CancellationFlowModal";
import { SubscriptionLegalLinks } from "@/components/subscription/SubscriptionLegalLinks";

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
    tier: currentTier,
    status: currentStatus,
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

  const reason = route.params?.reason;
  const subscriptionInactive = !isActive && !isLoading && isAuthenticated;
  const isBlocking =
    reason === "expired" || isTrialExpired || subscriptionInactive;

  useEffect(() => {
    if (!isBlocking) return;

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
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
    presentPaywall,
  } = useStoreKit();
  const { handleManageSubscription, isManaging } = useManageSubscription();

  const shouldUseStoreKit =
    (Platform.OS === "ios" || Platform.OS === "android") && isStoreKitAvailable;

  const storeKitPrices = useMemo(() => {
    if (!shouldUseStoreKit || !offerings?.availablePackages) return null;

    const prices: { basicMonthly?: string; basicAnnual?: string; proMonthly?: string; proAnnual?: string } = {};

    for (const pkg of offerings.availablePackages) {
      const id = pkg.identifier.toLowerCase();
      const priceStr = pkg.product.priceString;

      if (id.includes('basic') && (pkg.packageType === 'MONTHLY' || id.includes('monthly'))) {
        prices.basicMonthly = priceStr;
      } else if (id.includes('basic') && (pkg.packageType === 'ANNUAL' || id.includes('annual'))) {
        prices.basicAnnual = priceStr;
      } else if (id.includes('pro') && (pkg.packageType === 'MONTHLY' || id.includes('monthly'))) {
        prices.proMonthly = priceStr;
      } else if (id.includes('pro') && (pkg.packageType === 'ANNUAL' || id.includes('annual'))) {
        prices.proAnnual = priceStr;
      }
    }

    return Object.keys(prices).length > 0 ? prices : null;
  }, [shouldUseStoreKit, offerings]);

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [_prorationPreview, setProrationPreview] = useState<{ proratedAmount: number; creditAmount: number; newAmount: number; currency: string } | null>(null);
  const [_isPreviewingProration, setIsPreviewingProration] = useState(false);
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
    switch (currentStatus) {
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
    if (currentTier === SubscriptionTier.PRO) return "Pro";
    if (currentTier === SubscriptionTier.BASIC) return "Basic";
    return isTrialing ? "Trial" : "No Plan";
  };

  const getMonthlyPrice = (): string => {
    if (currentTier === SubscriptionTier.PRO) {
      if (shouldUseStoreKit) {
        return storeKitPrices?.proMonthly ? `${storeKitPrices.proMonthly}/month` : "Pro Plan";
      }
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        return "Pro Plan";
      }
      return `$${MONTHLY_PRICES.PRO.toFixed(2)}/month`;
    }
    if (currentTier === SubscriptionTier.BASIC) {
      if (shouldUseStoreKit) {
        return storeKitPrices?.basicMonthly ? `${storeKitPrices.basicMonthly}/month` : "Basic Plan";
      }
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        return "Basic Plan";
      }
      return `$${MONTHLY_PRICES.BASIC.toFixed(2)}/month`;
    }
    return isTrialing ? "7-Day Trial" : "—";
  };

  const getSubscribeButtonPrice = () => {
    const tier = selectedTier;
    const plan = selectedPlan;

    if (storeKitPrices) {
      const key = `${tier}${plan === 'monthly' ? 'Monthly' : 'Annual'}` as keyof typeof storeKitPrices;
      if (storeKitPrices[key]) {
        return `${storeKitPrices[key]}/${plan === 'monthly' ? 'mo' : 'yr'}`;
      }
    }

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      return `${tier === "pro" ? "Pro" : "Basic"} ${plan === "monthly" ? "Monthly" : "Annual"}`;
    }

    const price = plan === "monthly"
      ? (tier === "pro" ? MONTHLY_PRICES.PRO : MONTHLY_PRICES.BASIC)
      : (tier === "pro" ? ANNUAL_PRICES.PRO : ANNUAL_PRICES.BASIC);
    return `$${price.toFixed(2)}/${plan === "monthly" ? "mo" : "yr"}`;
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
        if (!isStoreKitAvailable) {
          Alert.alert(
            "Not Available",
            "In-app purchases are not available on this device. Please try again later.",
            [{ text: "OK" }],
          );
          return;
        }

        let pkg = null;
        if (offerings?.availablePackages) {
          const expectedPackageId = `${tier}_${plan}`;
          pkg = offerings.availablePackages.find((p) => {
            const id = p.identifier.toLowerCase();
            const matchesType = plan === "monthly"
              ? p.packageType === "MONTHLY"
              : p.packageType === "ANNUAL";
            return (
              id === expectedPackageId ||
              (id.includes(tier) && id.includes(plan)) ||
              (id.includes(tier) && matchesType) ||
              (matchesType && !id.includes(tier === "pro" ? "basic" : "pro"))
            );
          });
        }

        if (pkg) {
          const success = await purchasePackage(pkg);
          if (success) {
            refetch();
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
        } else {
          const result = await presentPaywall();
          if (result === "purchased" || result === "restored") {
            refetch();
            Alert.alert("Success", `Thank you for subscribing!`);
          }
        }
        return;
      }

      if (Platform.OS === "web") {
        const baseUrl = getApiUrl();

        const pricesResponse = await fetch(
          `${baseUrl}/api/subscriptions/prices`,
        );
        const prices = (await pricesResponse.json()).data as any;

        const priceKey =
          tier === "pro"
            ? plan === "monthly"
              ? "proMonthly"
              : "proAnnual"
            : plan === "monthly"
              ? "basicMonthly"
              : "basicAnnual";
        const fallbackKey = plan === "monthly" ? "monthly" : "annual";
        const selectedPriceId = prices[priceKey]?.id || prices[fallbackKey]?.id;

        if (!selectedPriceId) {
          Alert.alert(
            "Price Not Available",
            `The ${tierName} ${plan} subscription pricing is not yet configured. Please contact support or try a different option.`,
            [{ text: "OK" }],
          );
          return;
        }

        const isExistingPaidSubscriber =
          (currentStatus === "active" || currentStatus === "trialing") &&
          (currentTier === SubscriptionTier.BASIC || currentTier === SubscriptionTier.PRO);

        if (isExistingPaidSubscriber) {
          setIsPreviewingProration(true);
          try {
            const previewResponse = await fetch(
              `${baseUrl}/api/subscriptions/preview-proration`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                credentials: "include",
                body: JSON.stringify({ newPriceId: selectedPriceId }),
              },
            );

            if (!previewResponse.ok) {
              const errorData = await previewResponse.json();
              Alert.alert("Error", errorData.error || "Failed to preview proration.");
              return;
            }

            const preview = (await previewResponse.json()).data as any;
            setProrationPreview(preview);

            const formattedAmount = (preview.immediatePayment / 100).toFixed(2);
            const currencySymbol = preview.currency === "usd" ? "$" : preview.currency.toUpperCase() + " ";

            Alert.alert(
              "Confirm Plan Change",
              `You'll be charged ${currencySymbol}${formattedAmount} now (prorated for the remaining billing period). Your new plan starts immediately.`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Confirm Upgrade",
                  onPress: async () => {
                    try {
                      setIsCheckingOut(true);
                      const upgradeResponse = await fetch(
                        `${baseUrl}/api/subscriptions/upgrade`,
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          credentials: "include",
                          body: JSON.stringify({
                            priceId: selectedPriceId,
                            billingPeriod: plan,
                          }),
                        },
                      );

                      if (upgradeResponse.ok) {
                        const upgradeData = (await upgradeResponse.json()).data as any;
                        if (upgradeData.upgraded) {
                          await refetch();
                          Alert.alert("Success", `Your plan has been upgraded to ${tierName}!`);
                        }
                      } else {
                        const errorData = await upgradeResponse.json();
                        Alert.alert("Error", errorData.error || "Failed to upgrade. Please try again.");
                      }
                    } catch (err) {
                      logger.error("Error upgrading subscription:", err);
                      Alert.alert("Error", "Something went wrong during upgrade.");
                    } finally {
                      setIsCheckingOut(false);
                    }
                  },
                },
              ],
            );
          } catch (err) {
            logger.error("Error previewing proration:", err);
            Alert.alert("Error", "Failed to preview plan change. Please try again.");
          } finally {
            setIsPreviewingProration(false);
          }
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
              priceId: selectedPriceId,
              tier,
              successUrl: `${window.location.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
              cancelUrl: `${window.location.origin}/subscription-canceled`,
            }),
          },
        );

        if (response.ok) {
          const data = (await response.json()).data as any;
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
      logger.error("Error starting checkout:", error);
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
            maxWidth: 600,
            width: "100%",
            alignSelf: "center" as const,
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

        <CurrentPlanCard
          planName={getPlanName()}
          monthlyPrice={getMonthlyPrice()}
          isProUser={isProUser}
          tier={currentTier}
          statusInfo={statusInfo}
          isTrialing={isTrialing}
          trialDaysRemaining={trialDaysRemaining}
        />

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

        <FeatureComparisonTable
          features={PRO_FEATURES}
          isProUser={isProUser}
        />

        {!isTrialing && (!isAuthenticated || !isProUser) && (
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

            <PlanToggle
              selectedPlan={selectedPlan}
              onSelectPlan={setSelectedPlan}
            />

            <TierSelector
              selectedTier={selectedTier}
              onSelectTier={setSelectedTier}
              selectedPlan={selectedPlan}
              storeKitPrices={storeKitPrices}
            />

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
                : `Subscribe to ${selectedTier === "pro" ? "Pro" : "Basic"} — ${getSubscribeButtonPrice()}`}
            </GlassButton>

            <SubscriptionLegalLinks
              onOpenPrivacyPolicy={handleOpenPrivacyPolicy}
              onOpenTermsOfUse={handleOpenTermsOfUse}
            />
          </GlassCard>
        )}

        {(isProUser || currentTier === SubscriptionTier.BASIC) && isActive && !isTrialing && (
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
              Update your payment method, change your billing cycle, or manage
              your subscription.
            </ThemedText>

            <GlassButton
              onPress={handleManageSubscription}
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

            {!shouldUseStoreKit && (
              <GlassButton
                onPress={() => setShowCancelModal(true)}
                variant="outline"
                style={styles.cancelButton}
                icon={
                  <Feather
                    name="x-circle"
                    size={18}
                    color={AppColors.error}
                  />
                }
                testID="button-cancel-subscription"
              >
                Cancel Subscription
              </GlassButton>
            )}
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

            <PlanToggle
              selectedPlan={selectedPlan}
              onSelectPlan={setSelectedPlan}
              testIdPrefix="trial"
            />

            <TierSelector
              selectedTier={selectedTier}
              onSelectTier={setSelectedTier}
              selectedPlan={selectedPlan}
              testIdPrefix="trial"
              storeKitPrices={storeKitPrices}
            />

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
                : `Subscribe to ${selectedTier === "pro" ? "Pro" : "Basic"} — ${getSubscribeButtonPrice()}`}
            </GlassButton>

            <SubscriptionLegalLinks
              onOpenPrivacyPolicy={handleOpenPrivacyPolicy}
              onOpenTermsOfUse={handleOpenTermsOfUse}
              testIdPrefix="trial"
            />
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

      <CancellationFlowModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onCanceled={() => refetch()}
        token={token}
      />
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
  cancelButton: {
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
  signInDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  signInButton: {
    marginTop: Spacing.sm,
  },
});
