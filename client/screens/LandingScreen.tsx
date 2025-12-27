import { StyleSheet, View, Text, Pressable, ScrollView, Linking, useWindowDimensions, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons, FontAwesome, Ionicons } from "@expo/vector-icons";

const BRAND_GREEN = "#27AE60";
const BRAND_GREEN_DARK = "#1E8449";
const BACKGROUND_DARK = "#0F1419";
const CARD_DARK = "#1A1F25";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SECONDARY = "#A0AEC0";

const APP_STORE_URL = "#"; 
const PLAY_STORE_URL = "#"; 

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  testId: string;
}

function FeatureCard({ icon, title, description, testId }: FeatureCardProps) {
  return (
    <View style={styles.featureCard} data-testid={`card-feature-${testId}`}>
      <View style={styles.featureIconContainer}>{icon}</View>
      <Text style={styles.featureTitle} data-testid={`text-feature-title-${testId}`}>{title}</Text>
      <Text style={styles.featureDescription} data-testid={`text-feature-desc-${testId}`}>{description}</Text>
    </View>
  );
}

interface StepCardProps {
  number: string;
  title: string;
  description: string;
}

function StepCard({ number, title, description }: StepCardProps) {
  return (
    <View style={styles.stepCard} data-testid={`card-step-${number}`}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle} data-testid={`text-step-title-${number}`}>{title}</Text>
        <Text style={styles.stepDescription} data-testid={`text-step-desc-${number}`}>{description}</Text>
      </View>
    </View>
  );
}

function StoreBadge({ type }: { type: "apple" | "google" }) {
  const isApple = type === "apple";
  const url = isApple ? APP_STORE_URL : PLAY_STORE_URL;
  
  return (
    <Pressable
      style={({ pressed }) => [
        styles.storeBadge,
        pressed && styles.storeBadgePressed
      ]}
      onPress={() => Linking.openURL(url)}
      data-testid={`button-download-${type}`}
    >
      <View style={styles.storeBadgeContent}>
        {isApple ? (
          <FontAwesome name="apple" size={24} color={TEXT_PRIMARY} />
        ) : (
          <Ionicons name="logo-google-playstore" size={24} color={TEXT_PRIMARY} />
        )}
        <View style={styles.storeBadgeText}>
          <Text style={styles.storeBadgeSubtext}>
            {isApple ? "Download on the" : "Get it on"}
          </Text>
          <Text style={styles.storeBadgeTitle}>
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

  const navigateTo = (path: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = path;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <LinearGradient
        colors={[BACKGROUND_DARK, "#0A0F14"]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.header} data-testid="header">
        <View style={styles.logoContainer}>
          <MaterialCommunityIcons name="chef-hat" size={32} color={BRAND_GREEN} />
          <Text style={styles.logoText} data-testid="text-logo">ChefSpAIce</Text>
        </View>
      </View>

      <View style={[styles.heroSection, isWide && styles.heroSectionWide]} data-testid="section-hero">
        <View style={styles.heroContent}>
          <View style={styles.tagline}>
            <Feather name="feather" size={16} color={BRAND_GREEN} />
            <Text style={styles.taglineText} data-testid="text-tagline">Reduce Food Waste</Text>
          </View>
          
          <Text style={styles.heroTitle} data-testid="text-hero-title">
            Your AI-Powered{"\n"}Kitchen Assistant
          </Text>
          
          <Text style={styles.heroSubtitle} data-testid="text-hero-subtitle">
            Manage your pantry, generate recipes from what you have, plan meals, 
            and never let food go to waste again.
          </Text>

          <View style={styles.storeBadges}>
            <StoreBadge type="apple" />
            <StoreBadge type="google" />
          </View>
        </View>
      </View>

      <View style={styles.section} data-testid="section-features">
        <Text style={styles.sectionTitle} data-testid="text-features-title">Smart Features</Text>
        <Text style={styles.sectionSubtitle} data-testid="text-features-subtitle">
          Everything you need to run an efficient kitchen
        </Text>
        
        <View style={[styles.featuresGrid, isWide && styles.featuresGridWide]}>
          <FeatureCard
            testId="barcode"
            icon={<MaterialCommunityIcons name="barcode-scan" size={28} color={BRAND_GREEN} />}
            title="Barcode Scanning"
            description="Quickly add items to your inventory by scanning barcodes. Automatic product info lookup."
          />
          <FeatureCard
            testId="ai-recipes"
            icon={<MaterialCommunityIcons name="creation" size={28} color={BRAND_GREEN} />}
            title="AI Recipe Generation"
            description="Get personalized recipes based on what's in your pantry. No more wasted ingredients."
          />
          <FeatureCard
            testId="expiration"
            icon={<Feather name="clock" size={28} color={BRAND_GREEN} />}
            title="Expiration Tracking"
            description="Never forget about food again. Get notifications before items expire."
          />
          <FeatureCard
            testId="meal-planning"
            icon={<Feather name="calendar" size={28} color={BRAND_GREEN} />}
            title="Meal Planning"
            description="Plan your week with a beautiful calendar view. Drag and drop recipes to any day."
          />
          <FeatureCard
            testId="shopping"
            icon={<Feather name="shopping-cart" size={28} color={BRAND_GREEN} />}
            title="Smart Shopping Lists"
            description="Auto-generate shopping lists from recipes. Check off items as you shop."
          />
          <FeatureCard
            testId="analytics"
            icon={<Feather name="bar-chart-2" size={28} color={BRAND_GREEN} />}
            title="Waste Analytics"
            description="Track your food waste and savings over time. See your environmental impact."
          />
        </View>
      </View>

      <View style={styles.section} data-testid="section-how-it-works">
        <Text style={styles.sectionTitle} data-testid="text-howitworks-title">How It Works</Text>
        <Text style={styles.sectionSubtitle} data-testid="text-howitworks-subtitle">
          Get started in three simple steps
        </Text>
        
        <View style={[styles.stepsContainer, isWide && styles.stepsContainerWide]}>
          <StepCard
            number="1"
            title="Add Your Food"
            description="Scan barcodes, take photos, or manually add items to your inventory."
          />
          <StepCard
            number="2"
            title="Get AI Recipes"
            description="Tell us what you're craving and we'll create recipes using your ingredients."
          />
          <StepCard
            number="3"
            title="Plan & Cook"
            description="Add recipes to your meal plan and follow step-by-step instructions."
          />
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
            <StoreBadge type="apple" />
            <StoreBadge type="google" />
          </View>
        </LinearGradient>
      </View>

      <View style={styles.footer} data-testid="footer">
        <View style={styles.footerContent}>
          <View style={styles.footerLogo}>
            <MaterialCommunityIcons name="chef-hat" size={24} color={BRAND_GREEN} />
            <Text style={styles.footerLogoText} data-testid="text-footer-logo">ChefSpAIce</Text>
          </View>
          <Text style={styles.footerText} data-testid="text-footer-tagline">
            Helping you reduce food waste, one meal at a time.
          </Text>
          <View style={styles.footerLinks}>
            <Pressable onPress={() => navigateTo("/privacy")} data-testid="link-privacy">
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Pressable>
            <Text style={styles.footerDivider}>•</Text>
            <Pressable onPress={() => navigateTo("/terms")} data-testid="link-terms">
              <Text style={styles.footerLink}>Terms of Service</Text>
            </Pressable>
            <Text style={styles.footerDivider}>•</Text>
            <Pressable onPress={() => navigateTo("/about")} data-testid="link-about">
              <Text style={styles.footerLink}>About</Text>
            </Pressable>
            <Text style={styles.footerDivider}>•</Text>
            <Pressable onPress={() => navigateTo("/attributions")} data-testid="link-attributions">
              <Text style={styles.footerLink}>Attributions</Text>
            </Pressable>
          </View>
          <Text style={styles.copyright} data-testid="text-copyright">
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
    backgroundColor: BACKGROUND_DARK,
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
    color: TEXT_PRIMARY,
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
    color: TEXT_PRIMARY,
    textAlign: "center",
    lineHeight: 56,
    marginBottom: 20,
  },
  heroSubtitle: {
    fontSize: 18,
    color: TEXT_SECONDARY,
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
    backgroundColor: "#1A1F25",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
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
    color: TEXT_SECONDARY,
  },
  storeBadgeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_PRIMARY,
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 60,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: TEXT_PRIMARY,
    textAlign: "center",
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 18,
    color: TEXT_SECONDARY,
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
    backgroundColor: CARD_DARK,
    borderRadius: 16,
    padding: 24,
    width: 320,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
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
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 15,
    color: TEXT_SECONDARY,
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
    color: TEXT_PRIMARY,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 15,
    color: TEXT_SECONDARY,
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
    color: TEXT_PRIMARY,
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
    backgroundColor: "#0A0D10",
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
    color: TEXT_PRIMARY,
  },
  footerText: {
    fontSize: 14,
    color: TEXT_SECONDARY,
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
    color: TEXT_SECONDARY,
  },
  footerDivider: {
    color: "rgba(255, 255, 255, 0.2)",
  },
  copyright: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
  },
});
