import { useState } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useWebTheme } from "@/contexts/WebThemeContext";

const BRAND_GREEN = "#27AE60";

const DONATION_AMOUNTS = [
  { label: "$5", value: 500 },
  { label: "$10", value: 1000 },
  { label: "$25", value: 2500 },
  { label: "$50", value: 5000 },
  { label: "$100", value: 10000 },
];

function getThemeColors(isDark: boolean) {
  return {
    background: isDark ? "#0F1419" : "#F8FAFC",
    backgroundGradient: isDark ? "#0A0F14" : "#EDF2F7",
    card: isDark ? "#1A1F25" : "#FFFFFF",
    cardBorder: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.08)",
    textPrimary: isDark ? "#FFFFFF" : "#1A202C",
    textSecondary: isDark ? "#A0AEC0" : "#4A5568",
    textMuted: isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.5)",
    footerBg: isDark ? "#0A0D10" : "#F1F5F9",
  };
}

export default function SupportScreen() {
  const { isDark, toggleTheme } = useWebTheme();
  const colors = getThemeColors(isDark);
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDonate = async (amount: number) => {
    setLoading(amount);
    setError(null);
    
    try {
      const isDev = window.location.port === "" || window.location.port === "80";
      const apiBase = isDev ? `${window.location.protocol}//${window.location.hostname}:5000` : "";
      
      const response = await fetch(`${apiBase}/api/donations/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          anonymous: true,
          successUrl: window.location.origin + "/support?donation=success",
          cancelUrl: window.location.origin + "/support?donation=cancelled",
        }),
      });

      const data = await response.json();
      
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      <LinearGradient colors={[colors.background, colors.backgroundGradient]} style={StyleSheet.absoluteFillObject} />
      
      <View style={styles.header}>
        <Pressable style={styles.logoContainer} onPress={() => window.location.href = "/"}>
          <MaterialCommunityIcons name="chef-hat" size={32} color={BRAND_GREEN} />
          <Text style={[styles.logoText, { color: colors.textPrimary }]}>ChefSpAIce</Text>
        </Pressable>
        <Pressable
          onPress={toggleTheme}
          style={[styles.themeToggle, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
        >
          {isDark ? <Feather name="sun" size={20} color={colors.textPrimary} /> : <Feather name="moon" size={20} color={colors.textPrimary} />}
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Feather name="heart" size={48} color={BRAND_GREEN} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Support ChefSpAIce</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          ChefSpAIce is free to use. If you find it helpful, consider supporting our mission to reduce food waste worldwide.
        </Text>
        
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Make a Donation</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Your donation helps us maintain the app, add new features, and keep ChefSpAIce free for everyone.
          </Text>
          
          <View style={styles.donationGrid}>
            {DONATION_AMOUNTS.map(({ label, value }) => (
              <Pressable
                key={value}
                style={({ pressed }) => [
                  styles.donationButton,
                  { backgroundColor: colors.card, borderColor: BRAND_GREEN },
                  pressed && styles.donationButtonPressed,
                  loading === value && styles.donationButtonLoading,
                ]}
                onPress={() => handleDonate(value)}
                disabled={loading !== null}
              >
                {loading === value ? (
                  <ActivityIndicator size="small" color={BRAND_GREEN} />
                ) : (
                  <Text style={[styles.donationButtonText, { color: colors.textPrimary }]}>{label}</Text>
                )}
              </Pressable>
            ))}
          </View>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <Text style={[styles.stripeNote, { color: colors.textMuted }]}>
            Secure payments powered by Stripe
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Other Ways to Help</Text>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Not ready to donate? You can still help by spreading the word! Share ChefSpAIce with friends and family 
            who want to reduce food waste. Leave us a review on the App Store or Google Play.
          </Text>
        </View>

        <Pressable style={styles.backButton} onPress={() => window.location.href = "/"}>
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
  content: { paddingHorizontal: 24, paddingVertical: 60, maxWidth: 800, alignSelf: "center", width: "100%", alignItems: "center" },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: { fontSize: 42, fontWeight: "700", textAlign: "center", marginBottom: 16 },
  subtitle: { fontSize: 18, textAlign: "center", marginBottom: 40, maxWidth: 600 },
  card: { borderRadius: 16, padding: 24, borderWidth: 1, marginBottom: 24, width: "100%" },
  sectionTitle: { fontSize: 22, fontWeight: "600", marginBottom: 12, textAlign: "center" },
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
