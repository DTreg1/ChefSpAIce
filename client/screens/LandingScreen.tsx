import { StyleSheet, View, Text, Pressable, ScrollView, Linking, useWindowDimensions, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons, FontAwesome, Ionicons } from "@expo/vector-icons";
import { useWebTheme } from "@/contexts/WebThemeContext";

const BRAND_GREEN = "#27AE60";
const BRAND_GREEN_DARK = "#1E8449";

const APP_STORE_URL = "#"; 
const PLAY_STORE_URL = "#"; 

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
    storeBadgeBg: isDark ? "#1A1F25" : "#FFFFFF",
    storeBadgeBorder: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
  };
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  testId: string;
  colors: ReturnType<typeof getThemeColors>;
}

function FeatureCard({ icon, title, description, testId, colors }: FeatureCardProps) {
  return (
    <View 
      style={[
        styles.featureCard, 
        { backgroundColor: colors.card, borderColor: colors.cardBorder }
      ]} 
      data-testid={`card-feature-${testId}`}
    >
      <View style={styles.featureIconContainer}>{icon}</View>
      <Text style={[styles.featureTitle, { color: colors.textPrimary }]} data-testid={`text-feature-title-${testId}`}>{title}</Text>
      <Text style={[styles.featureDescription, { color: colors.textSecondary }]} data-testid={`text-feature-desc-${testId}`}>{description}</Text>
    </View>
  );
}

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  colors: ReturnType<typeof getThemeColors>;
}

function StepCard({ number, title, description, colors }: StepCardProps) {
  return (
    <View style={styles.stepCard} data-testid={`card-step-${number}`}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: colors.textPrimary }]} data-testid={`text-step-title-${number}`}>{title}</Text>
        <Text style={[styles.stepDescription, { color: colors.textSecondary }]} data-testid={`text-step-desc-${number}`}>{description}</Text>
      </View>
    </View>
  );
}

interface StoreBadgeProps {
  type: "apple" | "google";
  colors: ReturnType<typeof getThemeColors>;
}

function StoreBadge({ type, colors }: StoreBadgeProps) {
  const isApple = type === "apple";
  const url = isApple ? APP_STORE_URL : PLAY_STORE_URL;
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.storeBadge,
        { backgroundColor: colors.storeBadgeBg, borderColor: colors.storeBadgeBorder },
        pressed && styles.storeBadgePressed
      ]}
      onPress={() => Linking.openURL(url)}
      data-testid={`button-download-${type}`}
    >
      <View style={styles.storeBadgeContent}>
        {isApple ? (
          <FontAwesome name="apple" size={24} color={colors.textPrimary} />
        ) : (
          <Ionicons name="logo-google-playstore" size={24} color={colors.textPrimary} />
        )}
        <View style={styles.storeBadgeText}>
          <Text style={[styles.storeBadgeSubtext, { color: colors.textSecondary }]}>
            {isApple ? "Download on the" : "Get it on"}
          </Text>
          <Text style={[styles.storeBadgeTitle, { color: colors.textPrimary }]}>
            {isApple ? "App Store" : "Google Play"}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function LandingScreen() {
  const { width } = useWindowDimensions();
  const isWide = width > 768;
  const { isDark, toggleTheme } = useWebTheme();
  const colors = getThemeColors(isDark);

  const navigateTo = (path: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = path;
    }
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      contentContainerStyle={styles.contentContainer}
    >
      <LinearGradient
        colors={[colors.background, colors.backgroundGradient]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.header} data-testid="header">
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons name="chef-hat" size={32} color={BRAND_GREEN} />
          <Text style={[styles.logoText, { color: colors.textPrimary }]} data-testid="text-logo">ChefSpAIce</Text>
        </View>
        <Pressable
          onPress={toggleTheme}
          style={[styles.themeToggle, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)" }]}
          data-testid="button-theme-toggle"
        >
          {isDark ? (
            <Feather name="sun" size={20} color={colors.textPrimary} />
          ) : (
            <Feather name="moon" size={20} color={colors.textPrimary} />
          )}
        </Pressable>
      </View>

      <View style={[styles.heroSection, isWide && styles.heroSectionWide]} data-testid="section-hero">
        <View style={styles.heroContent}>
          <View style={styles.tagline}>
            <Feather name="feather" size={16} color={BRAND_GREEN} />
            <Text style={styles.taglineText} data-testid="text-tagline">Reduce Food Waste</Text>
          </View>
          
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]} data-testid="text-hero-title">
            Your AI-Powered{"\n"}Kitchen Assistant
          </Text>
          
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]} data-testid="text-hero-subtitle">
            Manage your pantry, generate recipes from what you have, plan meals, 
            and never let food go to waste again.
          </Text>

          <View style={styles.storeBadges}>
            <StoreBadge type="apple" colors={colors} />
            <StoreBadge type="google" colors={colors} />
          </View>
        </View>
      </View>

      <View style={styles.section} data-testid="section-features">
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} data-testid="text-features-title">Smart Features</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]} data-testid="text-features-subtitle">
          Everything you need to run an efficient kitchen
        </Text>
        
        <View style={[styles.featuresGrid, isWide && styles.featuresGridWide]}>
          <FeatureCard
            testId="barcode"
            icon={<MaterialCommunityIcons name="barcode-scan" size={28} color={BRAND_GREEN} />}
            title="Barcode Scanning"
            description="Quickly add items to your inventory by scanning barcodes. Automatic product info lookup."
            colors={colors}
          />
          <FeatureCard
            testId="ai-recipes"
            icon={<MaterialCommunityIcons name="creation" size={28} color={BRAND_GREEN} />}
            title="AI Recipe Generation"
            description="Get personalized recipes based on what's in your pantry. No more wasted ingredients."
            colors={colors}
          />
          <FeatureCard
            testId="expiration"
            icon={<Feather name="clock" size={28} color={BRAND_GREEN} />}
            title="Expiration Tracking"
            description="Never forget about food again. Get notifications before items expire."
            colors={colors}
          />
          <FeatureCard
            testId="meal-planning"
            icon={<Feather name="calendar" size={28} color={BRAND_GREEN} />}
            title="Meal Planning"
            description="Plan your week with a beautiful calendar view. Drag and drop recipes to any day."
            colors={colors}
          />
          <FeatureCard
            testId="shopping"
            icon={<Feather name="shopping-cart" size={28} color={BRAND_GREEN} />}
            title="Smart Shopping Lists"
            description="Auto-generate shopping lists from recipes. Check off items as you shop."
            colors={colors}
          />
          <FeatureCard
            testId="analytics"
            icon={<Feather name="bar-chart-2" size={28} color={BRAND_GREEN} />}
            title="Waste Analytics"
            description="Track your food waste and savings over time. See your environmental impact."
            colors={colors}
          />
        </View>
      </View>

      <View style={styles.section} data-testid="section-how-it-works">
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} data-testid="text-howitworks-title">How It Works</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]} data-testid="text-howitworks-subtitle">
          Get started in three simple steps
        </Text>
        
        <View style={[styles.stepsContainer, isWide && styles.stepsContainerWide]}>
          <StepCard number="1" title="Add Your Food" description="Scan barcodes, take photos, or manually add items to your inventory." colors={colors} />
          <StepCard number="2" title="Get AI Recipes" description="Tell us what you're craving and we'll create recipes using your ingredients." colors={colors} />
          <StepCard number="3" title="Plan & Cook" description="Add recipes to your meal plan and follow step-by-step instructions." colors={colors} />
        </View>
      </View>

      <View style={styles.ctaSection} data-testid="section-cta">
        <LinearGradient
          colors={[BRAND_GREEN_DARK, BRAND_GREEN]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaGradient}
        >
          <Text style={styles.ctaTitle} data-testid="text-cta-title">Ready to Transform Your Kitchen?</Text>
          <Text style={styles.ctaSubtitle} data-testid="text-cta-subtitle">
            Download ChefSpAIce free today and start saving food, time, and money.
          </Text>
          <View style={styles.storeBadges}>
            <StoreBadge type="apple" colors={{ ...colors, storeBadgeBg: "rgba(255,255,255,0.15)", storeBadgeBorder: "rgba(255,255,255,0.2)", textPrimary: "#FFFFFF", textSecondary: "rgba(255,255,255,0.8)" }} />
            <StoreBadge type="google" colors={{ ...colors, storeBadgeBg: "rgba(255,255,255,0.15)", storeBadgeBorder: "rgba(255,255,255,0.2)", textPrimary: "#FFFFFF", textSecondary: "rgba(255,255,255,0.8)" }} />
          </View>
        </LinearGradient>
      </View>

      <View style={[styles.footer, { backgroundColor: colors.footerBg }]} data-testid="footer">
        <View style={styles.footerContent}>
          <View style={styles.footerLogo}>
            <MaterialCommunityIcons name="chef-hat" size={24} color={BRAND_GREEN} />
            <Text style={[styles.footerLogoText, { color: colors.textPrimary }]} data-testid="text-footer-logo">ChefSpAIce</Text>
          </View>
          <Text style={[styles.footerText, { color: colors.textSecondary }]} data-testid="text-footer-tagline">
            Helping you reduce food waste, one meal at a time.
          </Text>
          <View style={styles.footerLinks}>
            <Pressable onPress={() => navigateTo("/privacy")} data-testid="link-privacy">
              <Text style={[styles.footerLink, { color: colors.textSecondary }]}>Privacy Policy</Text>
            </Pressable>
            <Text style={[styles.footerDivider, { color: colors.textMuted }]}>•</Text>
            <Pressable onPress={() => navigateTo("/terms")} data-testid="link-terms">
              <Text style={[styles.footerLink, { color: colors.textSecondary }]}>Terms of Service</Text>
            </Pressable>
            <Text style={[styles.footerDivider, { color: colors.textMuted }]}>•</Text>
            <Pressable onPress={() => navigateTo("/about")} data-testid="link-about">
              <Text style={[styles.footerLink, { color: colors.textSecondary }]}>About</Text>
            </Pressable>
            <Text style={[styles.footerDivider, { color: colors.textMuted }]}>•</Text>
            <Pressable onPress={() => navigateTo("/support")} data-testid="link-support">
              <Text style={[styles.footerLink, { color: colors.textSecondary }]}>Support</Text>
            </Pressable>
            <Text style={[styles.footerDivider, { color: colors.textMuted }]}>•</Text>
            <Pressable onPress={() => navigateTo("/attributions")} data-testid="link-attributions">
              <Text style={[styles.footerLink, { color: colors.textSecondary }]}>Attributions</Text>
            </Pressable>
          </View>
          <Text style={[styles.copyright, { color: colors.textMuted }]} data-testid="text-copyright">
            © {new Date().getFullYear()} ChefSpAIce. All rights reserved.
          </Text>
        </View>
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
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: "700",
  },
  themeToggle: {
    padding: 10,
    borderRadius: 10,
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingVertical: 60,
    alignItems: "center",
  },
  heroSectionWide: {
    paddingVertical: 100,
  },
  heroContent: {
    maxWidth: 600,
    alignItems: "center",
  },
  tagline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  taglineText: {
    color: BRAND_GREEN,
    fontSize: 14,
    fontWeight: "600",
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 56,
    marginBottom: 20,
  },
  heroSubtitle: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 40,
  },
  storeBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "center",
  },
  storeBadge: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  storeBadgePressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  storeBadgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  storeBadgeText: {
    alignItems: "flex-start",
  },
  storeBadgeSubtext: {
    fontSize: 11,
  },
  storeBadgeTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 60,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 48,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 20,
    maxWidth: 1200,
  },
  featuresGridWide: {
    gap: 24,
  },
  featureCard: {
    borderRadius: 16,
    padding: 24,
    width: 320,
    borderWidth: 1,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  stepsContainer: {
    gap: 24,
    maxWidth: 600,
    width: "100%",
  },
  stepsContainerWide: {
    flexDirection: "row",
    maxWidth: 1000,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 20,
    flex: 1,
  },
  stepNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BRAND_GREEN,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  ctaSection: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  ctaGradient: {
    borderRadius: 24,
    padding: 48,
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
  },
  ctaSubtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 32,
    maxWidth: 500,
  },
  footer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  footerContent: {
    alignItems: "center",
  },
  footerLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  footerLogoText: {
    fontSize: 20,
    fontWeight: "600",
  },
  footerText: {
    fontSize: 14,
    marginBottom: 24,
  },
  footerLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
  },
  footerLink: {
    fontSize: 14,
  },
  footerDivider: {},
  copyright: {
    fontSize: 12,
  },
});
