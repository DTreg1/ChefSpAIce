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
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { WebInfoColors } from "@/constants/theme";
import { useNavigate } from "@/lib/web-router";

const isWeb = Platform.OS === "web";

const DONATION_AMOUNTS = [
  { label: "$5", value: 500 },
  { label: "$10", value: 1000 },
  { label: "$25", value: 2500 },
  { label: "$50", value: 5000 },
  { label: "$100", value: 10000 },
];

const NAV_LINKS = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Privacy", path: "/privacy" },
  { label: "Terms", path: "/terms" },
  { label: "Support", path: "/support" },
];

export default function SupportScreen() {
  const colors = WebInfoColors;
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
      const isDev =
        window.location.port === "" || window.location.port === "80";
      const apiBase = isDev
        ? `${window.location.protocol}//${window.location.hostname}:5000`
        : "";

      const response = await fetch(
        `${apiBase}/api/donations/create-checkout-session`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount,
            anonymous: true,
            successUrl: window.location.origin + "/support?donation=success",
            cancelUrl: window.location.origin + "/support?donation=cancelled",
          }),
        },
      );

      const data = (await response.json()).data as any;

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
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <AnimatedBackground />

      {isWeb && (
        <View style={styles.header} role="banner" accessibilityLabel="Site header">
          <Pressable
            style={styles.logoContainer}
            onPress={() => navigate("/")}
            accessibilityRole="link"
            accessibilityLabel="Go to home page"
          >
            <MaterialCommunityIcons
              name="chef-hat"
              size={32}
              color={colors.iconLight}
            />
            <Text style={[styles.logoText, { color: colors.textPrimary }]}>
              ChefSpAIce
            </Text>
          </Pressable>
          <View style={styles.navLinks} role="navigation" accessibilityLabel="Site navigation">
            {NAV_LINKS.map((link) => (
              <Pressable
                key={link.path}
                onPress={() => navigate(link.path)}
                style={styles.navLink}
                data-testid={`nav-link-${link.label.toLowerCase()}`}
                accessibilityRole="link"
                accessibilityLabel={`Navigate to ${link.label}`}
              >
                <Text
                  style={[
                    styles.navLinkText,
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

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Feather name="heart" size={48} color={colors.brandGreen} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Support ChefSpAIce
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          ChefSpAIce is free to use. If you find it helpful, consider supporting
          our mission to reduce food waste worldwide.
        </Text>

        {isWeb && (
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Make a Donation
            </Text>
            <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
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

            <Text style={[styles.stripeNote, { color: colors.textMuted }]}>
              Secure payments powered by Stripe
            </Text>
          </View>
        )}

        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Other Ways to Help
          </Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Not ready to donate? You can still help by spreading the word! Share
            ChefSpAIce with friends and family who want to reduce food waste.
            Leave us a review on the App Store or Google Play.
          </Text>
        </View>
      </View>

      {isWeb && (
        <View style={[styles.footer, { backgroundColor: colors.footerBg }]} role="contentinfo">
          <Text style={[styles.copyright, { color: colors.textMuted }]}>
            © {new Date().getFullYear()} ChefSpAIce. All rights reserved.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { minHeight: "100%" },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    cursor: "pointer" as any,
    marginBottom: 16,
  },
  logoText: { fontSize: 24, fontWeight: "700" },
  navLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  navLink: { cursor: "pointer" as any },
  navLinkText: { fontSize: 14, fontWeight: "500" },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 60,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 42,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 40,
    maxWidth: 600,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    marginBottom: 24,
    width: "100%",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  paragraph: { fontSize: 16, lineHeight: 26, textAlign: "center" },
  donationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  donationButton: {
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 28,
    paddingVertical: 16,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  donationButtonPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  donationButtonLoading: { opacity: 0.7 },
  donationButtonText: { fontSize: 20, fontWeight: "700" },
  errorText: { color: "#E53E3E", textAlign: "center", marginTop: 8 },
  stripeNote: { fontSize: 12, textAlign: "center", marginTop: 8 },
  footer: { paddingVertical: 32, paddingHorizontal: 24, alignItems: "center" },
  copyright: { fontSize: 12 },
});
