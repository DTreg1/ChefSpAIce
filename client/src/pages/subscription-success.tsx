import { useState, useEffect } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useWebTheme } from "@/contexts/WebThemeContext";

const BRAND_GREEN = "#27AE60";

interface SessionDetails {
  customerEmail: string | null;
  subscriptionId: string | null;
  planType: string | null;
  trialEnd: string | null;
  amount: number | null;
  currency: string | null;
}

function getThemeColors(isDark: boolean) {
  return {
    background: isDark ? "#0F1419" : "#F8FAFC",
    backgroundGradient: isDark ? "#0A0F14" : "#EDF2F7",
    card: isDark ? "#1A1F25" : "#FFFFFF",
    cardBorder: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.08)",
    textPrimary: isDark ? "#FFFFFF" : "#1A202C",
    textSecondary: isDark ? "#A0AEC0" : "#4A5568",
    textMuted: isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.5)",
    success: isDark ? "#22C55E" : "#16A34A",
  };
}

function getApiBase(): string {
  if (typeof window === "undefined") return "";
  const isDev = window.location.port === "8081";
  return isDev ? `${window.location.protocol}//${window.location.hostname}:5000` : "";
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function SubscriptionSuccessScreen() {
  const { isDark, toggleTheme } = useWebTheme();
  const colors = getThemeColors(isDark);
  const [sessionDetails, setSessionDetails] = useState<SessionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (sessionId) {
      fetchSessionDetails(sessionId);
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchSessionDetails(sessionId: string) {
    try {
      const response = await fetch(`${getApiBase()}/api/subscriptions/session/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSessionDetails(data);
      }
    } catch (err) {
      setError("Could not load session details");
    } finally {
      setLoading(false);
    }
  }

  const trialDaysRemaining = sessionDetails?.trialEnd
    ? Math.ceil((new Date(sessionDetails.trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

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
        {loading ? (
          <View style={styles.loadingContainer} data-testid="loading-spinner">
            <ActivityIndicator size="large" color={BRAND_GREEN} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Confirming your subscription...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer} data-testid="error-container">
            <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#EF4444" />
            <Text style={[styles.errorTitle, { color: colors.textPrimary }]} data-testid="text-error-title">
              Something went wrong
            </Text>
            <Text style={[styles.errorText, { color: colors.textSecondary }]} data-testid="text-error-message">
              We couldn't verify your subscription details, but don't worry - your payment was successful.
            </Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => (window.location.href = "/")}
              data-testid="button-continue-anyway"
            >
              <Text style={styles.primaryButtonText}>Continue to App</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => window.location.reload()}
              data-testid="button-retry"
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Try Again</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.successIcon} data-testid="icon-success">
              <MaterialCommunityIcons name="check-circle" size={80} color={colors.success} />
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]} data-testid="text-title">
              Welcome to ChefSpAIce!
            </Text>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]} data-testid="text-subtitle">
              Your subscription is now active. Thank you for joining us!
            </Text>

            {trialDaysRemaining && trialDaysRemaining > 0 && (
              <View style={[styles.trialCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid="card-trial-info">
                <MaterialCommunityIcons name="gift-outline" size={24} color={BRAND_GREEN} />
                <View style={styles.trialInfo}>
                  <Text style={[styles.trialTitle, { color: colors.textPrimary }]} data-testid="text-trial-title">
                    Your 7-Day Free Trial Has Started
                  </Text>
                  <Text style={[styles.trialText, { color: colors.textSecondary }]} data-testid="text-trial-details">
                    Enjoy full access until {sessionDetails?.trialEnd ? formatDate(sessionDetails.trialEnd) : "your trial ends"}.
                    {"\n"}You won't be charged until your trial period ends.
                  </Text>
                </View>
              </View>
            )}

            {sessionDetails?.customerEmail && (
              <Text style={[styles.emailNote, { color: colors.textMuted }]} data-testid="text-email-confirmation">
                A confirmation email has been sent to {sessionDetails.customerEmail}
              </Text>
            )}

            <View style={styles.featuresCard} data-testid="card-whats-next">
              <Text style={[styles.featuresTitle, { color: colors.textPrimary }]} data-testid="text-whats-next-title">What's Next?</Text>
              <View style={styles.featuresList}>
                <View style={styles.featureItem} data-testid="feature-item-inventory">
                  <MaterialCommunityIcons name="food-apple" size={20} color={BRAND_GREEN} />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>Add items to your inventory</Text>
                </View>
                <View style={styles.featureItem} data-testid="feature-item-recipes">
                  <MaterialCommunityIcons name="chef-hat" size={20} color={BRAND_GREEN} />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>Generate AI-powered recipes</Text>
                </View>
                <View style={styles.featureItem} data-testid="feature-item-meal-plan">
                  <MaterialCommunityIcons name="calendar-check" size={20} color={BRAND_GREEN} />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>Plan your meals for the week</Text>
                </View>
                <View style={styles.featureItem} data-testid="feature-item-alerts">
                  <MaterialCommunityIcons name="bell-ring" size={20} color={BRAND_GREEN} />
                  <Text style={[styles.featureText, { color: colors.textSecondary }]}>Get expiration alerts</Text>
                </View>
              </View>
            </View>

            <Pressable
              style={styles.primaryButton}
              onPress={() => (window.location.href = "/")}
              data-testid="button-start-app"
            >
              <Text style={styles.primaryButtonText}>Start Using ChefSpAIce</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() => (window.location.href = "/")}
              data-testid="button-view-plans"
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Manage Subscription</Text>
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    minHeight: "100%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 24,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoText: {
    fontSize: 20,
    fontWeight: "700",
  },
  themeToggle: {
    padding: 10,
    borderRadius: 8,
  },
  content: {
    flex: 1,
    alignItems: "center",
    padding: 24,
    paddingTop: 40,
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    width: "100%",
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  successIcon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 26,
  },
  trialCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    width: "100%",
    gap: 16,
  },
  trialInfo: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  trialText: {
    fontSize: 14,
    lineHeight: 22,
  },
  emailNote: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
  },
  featuresCard: {
    width: "100%",
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontSize: 15,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: BRAND_GREEN,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    marginBottom: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    fontSize: 14,
  },
});
