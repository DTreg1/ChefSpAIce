import { StyleSheet, View, Text, ScrollView, Pressable, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";

const chefHatDark = require("../../../assets/images/transparent/chef-hat-dark-64.png");

const BRAND_GREEN = "#27AE60";

function getThemeColors(isDark: boolean) {
  return {
    background: isDark ? "#0F1419" : "#F8FAFC",
    backgroundGradient: isDark ? "#0A0F14" : "#EDF2F7",
    card: isDark ? "#1A1F25" : "#FFFFFF",
    cardBorder: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.08)",
    textPrimary: isDark ? "#FFFFFF" : "#1A202C",
    textSecondary: isDark ? "#A0AEC0" : "#4A5568",
    textMuted: isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.5)",
  };
}

export default function SubscriptionCanceledScreen() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.contentContainer}>
      <LinearGradient colors={[colors.background, colors.backgroundGradient]} style={StyleSheet.absoluteFillObject} />

      <View style={styles.header}>
        <Pressable style={styles.logoContainer} onPress={() => (window.location.href = "/")} data-testid="link-home-logo">
          <Image source={chefHatDark} style={{ width: 32, height: 32 }} resizeMode="contain" />
          <Text style={[styles.logoText, { color: colors.textPrimary }]}>ChefSpAIce</Text>
        </Pressable>
        <Pressable
          style={[styles.themeToggle, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
          data-testid="button-theme-toggle"
        >
          {isDark ? <Feather name="sun" size={20} color={colors.textPrimary} /> : <Feather name="moon" size={20} color={colors.textPrimary} />}
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer} data-testid="icon-info">
          <MaterialCommunityIcons name="arrow-left-circle" size={80} color={colors.textSecondary} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]} data-testid="text-title">
          No Worries!
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]} data-testid="text-subtitle">
          You've left the checkout process. Your subscription was not created, and you haven't been charged.
        </Text>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} data-testid="card-info">
          <MaterialCommunityIcons name="information-outline" size={24} color={BRAND_GREEN} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Take Your Time</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              There's no rush. You can come back and start your free trial whenever you're ready. 
              We'll be here when you need us!
            </Text>
          </View>
        </View>

        <View style={styles.benefitsSection}>
          <Text style={[styles.benefitsTitle, { color: colors.textPrimary }]}>
            When you're ready, you'll get:
          </Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <MaterialCommunityIcons name="check" size={18} color={BRAND_GREEN} />
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>7-day free trial with full access</Text>
            </View>
            <View style={styles.benefitItem}>
              <MaterialCommunityIcons name="check" size={18} color={BRAND_GREEN} />
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>Cancel anytime, no questions asked</Text>
            </View>
            <View style={styles.benefitItem}>
              <MaterialCommunityIcons name="check" size={18} color={BRAND_GREEN} />
              <Text style={[styles.benefitText, { color: colors.textSecondary }]}>30-day money-back guarantee</Text>
            </View>
          </View>
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() => (window.location.href = "/")}
          data-testid="button-view-pricing"
        >
          <Text style={styles.primaryButtonText}>View Plans & Pricing</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => (window.location.href = "/")}
          data-testid="button-back-home"
        >
          <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Back to Home</Text>
        </Pressable>

        <Text style={[styles.footerNote, { color: colors.textMuted }]} data-testid="text-footer">
          Questions? We're happy to help at support@chefspaice.com
        </Text>
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
  iconContainer: {
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
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 32,
    width: "100%",
    gap: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
  },
  benefitsSection: {
    width: "100%",
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefitText: {
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: BRAND_GREEN,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
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
    marginBottom: 32,
  },
  secondaryButtonText: {
    fontSize: 14,
  },
  footerNote: {
    fontSize: 13,
    textAlign: "center",
  },
});
