import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { GradientBackground } from "@/components/GradientBackground.web";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "@/lib/web-router";
import { apiClient } from "@/lib/api-client";
import { Spacing, BorderRadius, Typography, AppColors } from "@/constants/theme";
import { webSharedStyles, WebTypography, NAV_LINKS } from "./sharedStyles";

const isWeb = Platform.OS === "web";

const DONATION_AMOUNTS = [
  { label: "$5", value: 500 },
  { label: "$10", value: 1000 },
  { label: "$25", value: 2500 },
  { label: "$50", value: 5000 },
  { label: "$100", value: 10000 },
];

export default function SupportScreen() {
  const { style } = useTheme();
  const colors = style.webInfo;
  const currentPath = "/support";
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleDonate = async (amount: number) => {
    if (!isWeb || typeof window === "undefined") {
      setError("Donations are only available on the web version.");
      return;
    }

    setLoading(amount);
    setError(null);

    try {
      const data = await apiClient.post<{ url?: string }>("/api/donations/create-checkout-session", {
        amount,
        anonymous: true,
        successUrl: window.location.origin + "/support?donation=success",
        cancelUrl: window.location.origin + "/support?donation=cancelled",
      }, { skipAuth: true });

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Unable to start checkout. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <ScrollView
      style={webSharedStyles.container}
      contentContainerStyle={webSharedStyles.contentContainer}
    >
      <GradientBackground />

      {isWeb && (
        <View style={webSharedStyles.header} role="banner" accessibilityLabel="Site header">
          <Pressable
            style={webSharedStyles.logoContainer}
            onPress={() => navigate("/")}
            accessibilityRole="link"
            accessibilityLabel="Go to home page"
          >
            <MaterialCommunityIcons
              name="chef-hat"
              size={32}
              color={colors.iconLight}
            />
            <Text style={[WebTypography.logoText, { color: colors.textPrimary }]}>
              ChefSpAIce
            </Text>
          </Pressable>
          <View style={webSharedStyles.navLinks} role="navigation" accessibilityLabel="Site navigation">
            {NAV_LINKS.map((link) => (
              <Pressable
                key={link.path}
                onPress={() => navigate(link.path)}
                style={webSharedStyles.navLink}
                data-testid={`nav-link-${link.label.toLowerCase()}`}
                accessibilityRole="link"
                accessibilityLabel={`Navigate to ${link.label}`}
              >
                <Text
                  style={[
                    WebTypography.navLinkText,
                    {
                      color:
                        currentPath === link.path
                          ? colors.brandGreen
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {link.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={webSharedStyles.contentCentered}>
        <View style={styles.iconContainer}>
          <Feather name="heart" size={48} color={colors.brandGreen} />
        </View>
        <Text style={[WebTypography.pageTitle, { color: colors.textPrimary, marginBottom: Spacing.lg }]}>
          Support ChefSpAIce
        </Text>
        <Text style={[WebTypography.subtitle, { color: colors.textSecondary, maxWidth: 600 }]}>
          ChefSpAIce is free to use. If you find it helpful, consider supporting
          our mission to reduce food waste worldwide.
        </Text>

        {isWeb && (
          <View
            style={[
              webSharedStyles.card,
              { backgroundColor: colors.card, borderColor: colors.cardBorder, width: "100%" },
            ]}
          >
            <Text style={[WebTypography.sectionTitle, { color: colors.textPrimary, textAlign: "center" }]}>
              Make a Donation
            </Text>
            <Text style={[WebTypography.paragraph, { color: colors.textSecondary, textAlign: "center" }]}>
              Your donation helps us maintain the app, add new features, and keep
              ChefSpAIce free for everyone.
            </Text>

            <View style={styles.donationGrid}>
              {DONATION_AMOUNTS.map(({ label, value }) => (
                <Pressable
                  key={value}
                  style={({ pressed }) => [
                    styles.donationButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.brandGreen,
                    },
                    pressed && styles.donationButtonPressed,
                    loading === value && styles.donationButtonLoading,
                  ]}
                  onPress={() => handleDonate(value)}
                  disabled={loading !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`Donate ${label}`}
                  accessibilityState={{ disabled: loading !== null }}
                >
                  {loading === value ? (
                    <ActivityIndicator size="small" color={colors.brandGreen} />
                  ) : (
                    <Text
                      style={[
                        styles.donationButtonText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {label}
                    </Text>
                  )}
                </Pressable>
              ))}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={[WebTypography.copyright, { color: colors.textMuted, textAlign: "center", marginTop: Spacing.sm }]}>
              Secure payments powered by Stripe
            </Text>
          </View>
        )}

        <View
          style={[
            webSharedStyles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder, width: "100%" },
          ]}
        >
          <Text style={[WebTypography.sectionTitle, { color: colors.textPrimary, textAlign: "center" }]}>
            Other Ways to Help
          </Text>
          <Text style={[WebTypography.paragraph, { color: colors.textSecondary, textAlign: "center" }]}>
            Not ready to donate? You can still help by spreading the word! Share
            ChefSpAIce with friends and family who want to reduce food waste.
            Leave us a review on the App Store or Google Play.
          </Text>
        </View>
      </View>

      {isWeb && (
        <View style={[webSharedStyles.footer, { backgroundColor: colors.footerBg }]} role="contentinfo">
          <Text style={[WebTypography.copyright, { color: colors.textMuted }]}>
            © {new Date().getFullYear()} ChefSpAIce. All rights reserved.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  donationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  donationButton: {
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    paddingHorizontal: 28,
    paddingVertical: Spacing.lg,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  donationButtonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  donationButtonLoading: { opacity: 0.7 },
  donationButtonText: { fontSize: Typography.h3.fontSize, fontWeight: "700" as const },
  errorText: { color: AppColors.errorDark, textAlign: "center", marginTop: Spacing.sm },
});
