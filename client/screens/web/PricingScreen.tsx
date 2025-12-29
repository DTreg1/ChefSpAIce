import { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useWebTheme } from "@/contexts/WebThemeContext";

const BRAND_GREEN = "#27AE60";
const AUTH_TOKEN_KEY = "chefspaice-auth-token";

interface PriceInfo {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  trialDays: number;
  productName: string;
}

interface SubscriptionStatus {
  status: string;
  planType: string | null;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

function getThemeColors(isDark: boolean) {
  return {
    background: isDark ? "#0F1419" : "#F8FAFC",
    backgroundGradient: isDark ? "#0A0F14" : "#EDF2F7",
    card: isDark ? "#1A1F25" : "#FFFFFF",
    cardBorder: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.08)",
    cardHighlight: isDark ? "#1E2530" : "#F0FDF4",
    textPrimary: isDark ? "#FFFFFF" : "#1A202C",
    textSecondary: isDark ? "#A0AEC0" : "#4A5568",
    textMuted: isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.5)",
    footerBg: isDark ? "#0A0D10" : "#F1F5F9",
    success: isDark ? "#22C55E" : "#16A34A",
    warning: isDark ? "#F59E0B" : "#D97706",
  };
}

function getApiBase(): string {
  if (typeof window === "undefined") return "";
  // In development, the server runs on port 5000 while Metro runs on 8081
  // In production, use relative URLs (empty string) since API is on same origin
  const isDev = window.location.port === "8081";
  return isDev ? `${window.location.protocol}//${window.location.hostname}:5000` : "";
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const FEATURES = [
  "Unlimited food inventory tracking",
  "AI-powered recipe generation",
  "Smart meal planning",
  "Expiration alerts & notifications",
  "Nutrition tracking & analytics",
  "Cloud sync across devices",
  "Shopping list management",
  "Waste reduction insights",
];

interface PricingCardProps {
  title: string;
  price: string;
  period: string;
  badge?: string;
  isPopular?: boolean;
  onSelect: () => void;
  loading: boolean;
  disabled: boolean;
  colors: ReturnType<typeof getThemeColors>;
}

function PricingCard({ title, price, period, badge, isPopular, onSelect, loading, disabled, colors }: PricingCardProps) {
  return (
    <View
      style={[
        styles.pricingCard,
        {
          backgroundColor: isPopular ? colors.cardHighlight : colors.card,
          borderColor: isPopular ? BRAND_GREEN : colors.cardBorder,
          borderWidth: isPopular ? 2 : 1,
        },
      ]}
      data-testid={`card-pricing-${title.toLowerCase()}`}
    >
      {isPopular && (
        <View style={styles.popularBadge} data-testid="badge-popular">
          <Text style={styles.popularBadgeText}>Most Popular</Text>
        </View>
      )}
      {badge && (
        <View style={styles.saveBadge} data-testid="badge-savings">
          <Text style={styles.saveBadgeText}>{badge}</Text>
        </View>
      )}
      <Text style={[styles.planTitle, { color: colors.textPrimary }]} data-testid={`text-plan-title-${title.toLowerCase()}`}>
        {title}
      </Text>
      <View style={styles.priceContainer}>
        <Text style={[styles.price, { color: colors.textPrimary }]} data-testid={`text-price-${title.toLowerCase()}`}>
          {price}
        </Text>
        <Text style={[styles.period, { color: colors.textSecondary }]}>/{period}</Text>
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.selectButton,
          { backgroundColor: BRAND_GREEN },
          pressed && styles.buttonPressed,
          disabled && styles.buttonDisabled,
        ]}
        onPress={onSelect}
        disabled={disabled || loading}
        data-testid={`button-select-${title.toLowerCase()}`}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.selectButtonText}>Start Free Trial</Text>
        )}
      </Pressable>
    </View>
  );
}

interface SubscriptionStatusCardProps {
  status: SubscriptionStatus;
  onManage: () => void;
  loading: boolean;
  colors: ReturnType<typeof getThemeColors>;
}

function SubscriptionStatusCard({ status, onManage, loading, colors }: SubscriptionStatusCardProps) {
  const isActive = status.status === "active" || status.status === "trialing";
  const isTrial = status.status === "trialing";

  return (
    <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid="card-subscription-status">
      <View style={styles.statusHeader}>
        <Feather name={isActive ? "check-circle" : "alert-circle"} size={24} color={isActive ? colors.success : colors.warning} />
        <Text style={[styles.statusTitle, { color: colors.textPrimary }]} data-testid="text-subscription-status">
          {isTrial ? "Free Trial Active" : isActive ? "Subscription Active" : "Subscription " + status.status}
        </Text>
      </View>
      <View style={styles.statusDetails}>
        {status.planType && (
          <Text style={[styles.statusText, { color: colors.textSecondary }]} data-testid="text-plan-type">
            Plan: {status.planType.charAt(0).toUpperCase() + status.planType.slice(1)}
          </Text>
        )}
        {isTrial && status.trialEnd && (
          <Text style={[styles.statusText, { color: colors.textSecondary }]} data-testid="text-trial-end">
            Trial ends: {formatDate(status.trialEnd)}
          </Text>
        )}
        {!isTrial && status.currentPeriodEnd && (
          <Text style={[styles.statusText, { color: colors.textSecondary }]} data-testid="text-period-end">
            {status.cancelAtPeriodEnd ? "Cancels on" : "Renews on"}: {formatDate(status.currentPeriodEnd)}
          </Text>
        )}
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.manageButton,
          { borderColor: BRAND_GREEN },
          pressed && styles.buttonPressed,
        ]}
        onPress={onManage}
        disabled={loading}
        data-testid="button-manage-subscription"
      >
        {loading ? (
          <ActivityIndicator size="small" color={BRAND_GREEN} />
        ) : (
          <Text style={[styles.manageButtonText, { color: BRAND_GREEN }]}>Manage Subscription</Text>
        )}
      </Pressable>
    </View>
  );
}

export default function PricingScreen() {
  const { isDark, toggleTheme } = useWebTheme();
  const colors = getThemeColors(isDark);
  const [prices, setPrices] = useState<{ monthly: PriceInfo | null; annual: PriceInfo | null } | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = !!getAuthToken();

  useEffect(() => {
    fetchPrices();
    if (isLoggedIn) {
      fetchSubscriptionStatus();
    } else {
      setLoadingStatus(false);
    }
  }, [isLoggedIn]);

  const fetchPrices = async () => {
    try {
      const response = await fetch(`${getApiBase()}/api/subscriptions/prices`);
      if (response.ok) {
        const data = await response.json();
        setPrices(data);
      }
    } catch (err) {
      console.error("Error fetching prices:", err);
    } finally {
      setLoadingPrices(false);
    }
  };

  const fetchSubscriptionStatus = async () => {
    const token = getAuthToken();
    if (!token) {
      setLoadingStatus(false);
      return;
    }

    try {
      const response = await fetch(`${getApiBase()}/api/subscriptions/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setSubscriptionStatus(data);
      }
    } catch (err) {
      console.error("Error fetching subscription status:", err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleSelectPlan = async (priceId: string) => {
    if (!isLoggedIn) {
      window.location.href = "/signup?redirect=/pricing";
      return;
    }

    setCheckoutLoading(priceId);
    setError(null);

    const token = getAuthToken();
    try {
      const response = await fetch(`${getApiBase()}/api/subscriptions/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId,
          successUrl: window.location.origin + "/pricing?success=true",
          cancelUrl: window.location.origin + "/pricing?cancelled=true",
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Unable to start checkout. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    const token = getAuthToken();
    if (!token) return;

    setPortalLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getApiBase()}/api/subscriptions/create-portal-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          returnUrl: window.location.origin + "/pricing",
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Unable to open billing portal. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };

  const isSubscribed = subscriptionStatus && (subscriptionStatus.status === "active" || subscriptionStatus.status === "trialing");
  const monthlyPrice = prices?.monthly;
  const annualPrice = prices?.annual;

  const annualSavings = monthlyPrice && annualPrice ? (monthlyPrice.amount * 12 - annualPrice.amount) / 100 : 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      <LinearGradient colors={[colors.background, colors.backgroundGradient]} style={StyleSheet.absoluteFillObject} />

      <View style={styles.header}>
        <Pressable style={styles.logoContainer} onPress={() => (window.location.href = "/")} data-testid="link-home-logo">
          <MaterialCommunityIcons name="chef-hat" size={32} color={BRAND_GREEN} />
          <Text style={[styles.logoText, { color: colors.textPrimary }]}>ChefSpAIce</Text>
        </Pressable>
        <Pressable
          onPress={toggleTheme}
          style={[styles.themeToggle, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
          data-testid="button-theme-toggle"
        >
          {isDark ? <Feather name="sun" size={20} color={colors.textPrimary} /> : <Feather name="moon" size={20} color={colors.textPrimary} />}
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.trialBanner} data-testid="banner-trial">
          <Feather name="gift" size={24} color="#FFFFFF" />
          <Text style={styles.trialBannerText}>Start with a 7-day free trial - no credit card required to start</Text>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]} data-testid="text-pricing-title">
          Simple, Transparent Pricing
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} data-testid="text-pricing-subtitle">
          Choose the plan that works best for you. Cancel anytime.
        </Text>

        {isSubscribed && subscriptionStatus && !loadingStatus && (
          <SubscriptionStatusCard status={subscriptionStatus} onManage={handleManageSubscription} loading={portalLoading} colors={colors} />
        )}

        {loadingPrices ? (
          <ActivityIndicator size="large" color={BRAND_GREEN} style={styles.loader} />
        ) : (
          <View style={styles.pricingGrid}>
            <PricingCard
              title="Monthly"
              price={monthlyPrice ? formatPrice(monthlyPrice.amount, monthlyPrice.currency) : "$4.99"}
              period="month"
              onSelect={() => monthlyPrice && handleSelectPlan(monthlyPrice.id)}
              loading={checkoutLoading === monthlyPrice?.id}
              disabled={!!checkoutLoading || isSubscribed === true}
              colors={colors}
            />
            <PricingCard
              title="Annual"
              price={annualPrice ? formatPrice(annualPrice.amount, annualPrice.currency) : "$49.90"}
              period="year"
              badge={annualSavings > 0 ? `Save $${annualSavings.toFixed(0)}` : "Save $10"}
              isPopular
              onSelect={() => annualPrice && handleSelectPlan(annualPrice.id)}
              loading={checkoutLoading === annualPrice?.id}
              disabled={!!checkoutLoading || isSubscribed === true}
              colors={colors}
            />
          </View>
        )}

        {error && (
          <Text style={styles.errorText} data-testid="text-error">
            {error}
          </Text>
        )}

        <View style={[styles.featuresCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid="card-features">
          <Text style={[styles.featuresTitle, { color: colors.textPrimary }]}>Everything Included</Text>
          <View style={styles.featuresList}>
            {FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureItem} data-testid={`feature-item-${index}`}>
                <Feather name="check" size={18} color={BRAND_GREEN} />
                <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.guaranteeCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid="card-guarantee">
          <Feather name="shield" size={32} color={BRAND_GREEN} />
          <Text style={[styles.guaranteeTitle, { color: colors.textPrimary }]}>30-Day Money-Back Guarantee</Text>
          <Text style={[styles.guaranteeText, { color: colors.textSecondary }]}>
            Not satisfied? Get a full refund within 30 days, no questions asked.
          </Text>
        </View>

        <Pressable style={styles.backButton} onPress={() => (window.location.href = "/")} data-testid="button-back-home">
          <Feather name="arrow-left" size={20} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Back to Home</Text>
        </Pressable>
      </View>

      <View style={[styles.footer, { backgroundColor: colors.footerBg }]}>
        <Text style={[styles.copyright, { color: colors.textMuted }]}>
          © {new Date().getFullYear()} ChefSpAIce. All rights reserved.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { minHeight: "100%" },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoContainer: { flexDirection: "row", alignItems: "center", gap: 10, cursor: "pointer" as any },
  logoText: { fontSize: 24, fontWeight: "700" },
  themeToggle: { padding: 10, borderRadius: 10 },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    maxWidth: 900,
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
  },
  trialBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: BRAND_GREEN,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 32,
    width: "100%",
  },
  trialBannerText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  title: { fontSize: 42, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  subtitle: { fontSize: 18, textAlign: "center", marginBottom: 40, maxWidth: 600 },
  pricingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 24,
    width: "100%",
    marginBottom: 40,
  },
  pricingCard: {
    borderRadius: 16,
    padding: 32,
    minWidth: 280,
    maxWidth: 350,
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  popularBadge: {
    position: "absolute",
    top: -12,
    backgroundColor: BRAND_GREEN,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  saveBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  saveBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  planTitle: { fontSize: 24, fontWeight: "600", marginBottom: 16, marginTop: 8 },
  priceContainer: { flexDirection: "row", alignItems: "baseline", marginBottom: 24 },
  price: { fontSize: 48, fontWeight: "700" },
  period: { fontSize: 16, marginLeft: 4 },
  selectButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  selectButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  buttonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  buttonDisabled: { opacity: 0.5 },
  statusCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    marginBottom: 32,
    width: "100%",
    maxWidth: 500,
  },
  statusHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  statusTitle: { fontSize: 20, fontWeight: "600" },
  statusDetails: { marginBottom: 20 },
  statusText: { fontSize: 15, marginBottom: 4 },
  manageButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
  },
  manageButtonText: { fontSize: 16, fontWeight: "600" },
  featuresCard: {
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    marginBottom: 24,
    width: "100%",
  },
  featuresTitle: { fontSize: 24, fontWeight: "600", textAlign: "center", marginBottom: 24 },
  featuresList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "48%",
    minWidth: 220,
  },
  featureText: { fontSize: 15, flex: 1 },
  guaranteeCard: {
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    marginBottom: 32,
    width: "100%",
    alignItems: "center",
  },
  guaranteeTitle: { fontSize: 20, fontWeight: "600", marginTop: 16, marginBottom: 8, textAlign: "center" },
  guaranteeText: { fontSize: 15, textAlign: "center", maxWidth: 400 },
  loader: { marginVertical: 40 },
  errorText: { color: "#E53E3E", textAlign: "center", marginBottom: 16, fontSize: 14 },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: BRAND_GREEN,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 20,
  },
  backButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  footer: { paddingVertical: 32, paddingHorizontal: 24, alignItems: "center" },
  copyright: { fontSize: 12 },
});
