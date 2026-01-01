import { StyleSheet, View, Text, Pressable, ScrollView, useWindowDimensions, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Feather, MaterialCommunityIcons, FontAwesome, Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { GlassColors, GlassEffect, AppColors } from "@/constants/theme";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

const isWeb = Platform.OS === "web";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  testId: string;
  isDark: boolean;
  isWide?: boolean;
}

function GlassCard({ children, style, testId }: { children: React.ReactNode; style?: any; testId?: string }) {
  const { isDark } = useTheme();
  const glassColors = isDark ? GlassColors.dark : GlassColors.light;
  
  if (isWeb) {
    return (
      <View 
        style={[
          styles.glassCardWeb,
          { 
            backgroundColor: glassColors.background,
            borderColor: glassColors.border,
          },
          style
        ]}
        data-testid={testId}
      >
        {children}
      </View>
    );
  }
  
  return (
    <BlurView
      intensity={GlassEffect.blur.regular}
      tint={isDark ? "dark" : "light"}
      style={[styles.glassCard, style]}
    >
      <View 
        style={[
          styles.glassCardInner,
          { 
            backgroundColor: glassColors.background,
            borderColor: glassColors.border,
          }
        ]}
        data-testid={testId}
      >
        {children}
      </View>
    </BlurView>
  );
}

function FeatureCard({ icon, title, description, testId, isDark, isWide }: FeatureCardProps) {
  return (
    <GlassCard style={[styles.featureCard, isWide && styles.featureCardWide]} testId={`card-feature-${testId}`}>
      <View style={styles.featureIconContainer}>{icon}</View>
      <Text style={[styles.featureTitle, { color: "#FFFFFF" }]} data-testid={`text-feature-title-${testId}`}>
        {title}
      </Text>
      <Text style={[styles.featureDescription, { color: "rgba(255,255,255,0.8)" }]} data-testid={`text-feature-desc-${testId}`}>
        {description}
      </Text>
    </GlassCard>
  );
}

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  isDark: boolean;
  isWide?: boolean;
}

function StepCard({ number, title, description, isDark, isWide }: StepCardProps) {
  return (
    <GlassCard style={[styles.stepCard, isWide && styles.stepCardWide]} testId={`card-step-${number}`}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: "#FFFFFF" }]} data-testid={`text-step-title-${number}`}>
          {title}
        </Text>
        <Text style={[styles.stepDescription, { color: "rgba(255,255,255,0.8)" }]} data-testid={`text-step-desc-${number}`}>
          {description}
        </Text>
      </View>
    </GlassCard>
  );
}

interface LandingScreenProps {
  onGetStarted?: () => void;
  onSignIn?: () => void;
  onAbout?: () => void;
  onPrivacy?: () => void;
  onTerms?: () => void;
  onSupport?: () => void;
}

export default function LandingScreen({ onGetStarted, onSignIn, onAbout, onPrivacy, onTerms, onSupport }: LandingScreenProps) {
  const { width } = useWindowDimensions();
  const { isDark } = useTheme();
  const isWide = width > 768;
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  const handleGetStarted = () => {
    if (onGetStarted) {
      onGetStarted();
    }
  };

  const handleSignIn = () => {
    if (onSignIn) {
      onSignIn();
    }
  };

  const handleAbout = () => {
    if (onAbout) {
      onAbout();
    }
  };

  const handlePrivacy = () => {
    if (onPrivacy) {
      onPrivacy();
    }
  };

  const handleTerms = () => {
    if (onTerms) {
      onTerms();
    }
  };

  const handleSupport = () => {
    if (onSupport) {
      onSupport();
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#0A1F0F", "#0F1419", "#0A0F14"] : ["#1A3D2A", "#1E4D35", "#0F2A1A"]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header} data-testid="header">
          <View style={styles.logoContainer}>
            <MaterialCommunityIcons name="chef-hat" size={32} color={AppColors.primary} />
            <Text style={styles.logoText} data-testid="text-logo">ChefSpAIce</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.buttonPressed
            ]}
            onPress={handleSignIn}
            data-testid="button-signin-header"
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </Pressable>
        </View>

        <View style={[styles.heroSection, isWide && styles.heroSectionWide]} data-testid="section-hero">
          <View style={styles.heroContent}>
            <View style={styles.tagline}>
              <Feather name="zap" size={16} color={AppColors.primary} />
              <Text style={styles.taglineText} data-testid="text-tagline">Reduce Food Waste</Text>
            </View>
            
            <Text style={styles.heroTitle} data-testid="text-hero-title">
              Your AI-Powered{"\n"}Kitchen Assistant
            </Text>
            
            <Text style={styles.heroSubtitle} data-testid="text-hero-subtitle">
              Manage your pantry, generate recipes from what you have, plan meals, 
              and never let food go to waste again.
            </Text>

            <View style={styles.heroButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed
                ]}
                onPress={handleGetStarted}
                data-testid="button-get-started"
              >
                <LinearGradient
                  colors={[AppColors.primary, "#1E8449"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.primaryButtonGradient}
                >
                  <Text style={styles.primaryButtonText}>Get Started Free</Text>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
              
              <Text style={styles.trialText}>7-day free trial, no credit card required</Text>
            </View>
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
              isDark={isDark}
              isWide={isWide}
            />
            <StepCard
              number="2"
              title="Get AI Recipes"
              description="Tell us what you're craving and we'll create recipes using your ingredients."
              isDark={isDark}
              isWide={isWide}
            />
            <StepCard
              number="3"
              title="Plan & Cook"
              description="Add recipes to your meal plan and follow step-by-step instructions."
              isDark={isDark}
              isWide={isWide}
            />
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
              isDark={isDark}
              isWide={isWide}
              icon={<MaterialCommunityIcons name="barcode-scan" size={28} color={AppColors.primary} />}
              title="Barcode Scanning"
              description="Quickly add items to your inventory by scanning barcodes. Automatic product info lookup."
            />
            <FeatureCard
              testId="ai-recipes"
              isDark={isDark}
              isWide={isWide}
              icon={<MaterialCommunityIcons name="creation" size={28} color={AppColors.primary} />}
              title="AI Recipe Generation"
              description="Get personalized recipes based on what's in your pantry. No more wasted ingredients."
            />
            <FeatureCard
              testId="expiration"
              isDark={isDark}
              isWide={isWide}
              icon={<Feather name="clock" size={28} color={AppColors.primary} />}
              title="Expiration Tracking"
              description="Never forget about food again. Get notifications before items expire."
            />
            <FeatureCard
              testId="meal-planning"
              isDark={isDark}
              isWide={isWide}
              icon={<Feather name="calendar" size={28} color={AppColors.primary} />}
              title="Meal Planning"
              description="Plan your week with a beautiful calendar view. Drag and drop recipes to any day."
            />
            <FeatureCard
              testId="shopping"
              isDark={isDark}
              isWide={isWide}
              icon={<Feather name="shopping-cart" size={28} color={AppColors.primary} />}
              title="Smart Shopping Lists"
              description="Auto-generate shopping lists from recipes. Check off items as you shop."
            />
            <FeatureCard
              testId="analytics"
              isDark={isDark}
              isWide={isWide}
              icon={<Feather name="bar-chart-2" size={28} color={AppColors.primary} />}
              title="Waste Analytics"
              description="Track your food waste and savings over time. See your environmental impact."
            />
          </View>
        </View>

        <View style={styles.ctaSection} data-testid="section-cta">
          <GlassCard style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Ready to reduce food waste?</Text>
            <Text style={styles.ctaSubtitle}>
              Join thousands of users saving money and the planet
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.ctaButton,
                pressed && styles.buttonPressed
              ]}
              onPress={handleGetStarted}
              data-testid="button-cta-get-started"
            >
              <LinearGradient
                colors={[AppColors.primary, "#1E8449"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaButtonGradient}
              >
                <Text style={styles.ctaButtonText}>Start Your Free Trial</Text>
              </LinearGradient>
            </Pressable>
          </GlassCard>
        </View>

        <View style={styles.footer} data-testid="footer">
          <View style={styles.footerContent}>
            <View style={styles.footerLogo}>
              <MaterialCommunityIcons name="chef-hat" size={24} color={AppColors.primary} />
              <Text style={styles.footerLogoText}>ChefSpAIce</Text>
            </View>
            <Text style={styles.footerText}>Your AI-powered kitchen companion</Text>
            <View style={[styles.footerLinks, isWide ? {} : styles.footerLinksWrap]}>
              <Pressable onPress={handleAbout} data-testid="link-about">
                <Text style={styles.footerLink}>About</Text>
              </Pressable>
              <Text style={styles.footerDivider}>|</Text>
              <Pressable onPress={handlePrivacy} data-testid="link-privacy">
                <Text style={styles.footerLink}>Privacy</Text>
              </Pressable>
              <Text style={styles.footerDivider}>|</Text>
              <Pressable onPress={handleTerms} data-testid="link-terms">
                <Text style={styles.footerLink}>Terms</Text>
              </Pressable>
              <Text style={styles.footerDivider}>|</Text>
              <Pressable onPress={handleSupport} data-testid="link-support">
                <Text style={styles.footerLink}>Support</Text>
              </Pressable>
            </View>
            <Text style={styles.copyright}>&copy; 2025 ChefSpAIce. All rights reserved.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 16,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  signInButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: GlassEffect.borderRadius.pill,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  signInButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: "center",
  },
  heroSectionWide: {
    paddingVertical: 80,
  },
  heroContent: {
    alignItems: "center",
    maxWidth: 600,
  },
  tagline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: GlassEffect.borderRadius.pill,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(39, 174, 96, 0.3)",
    marginBottom: 24,
  },
  taglineText: {
    fontSize: 14,
    fontWeight: "600",
    color: AppColors.primary,
  },
  heroTitle: {
    fontSize: 40,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 48,
  },
  heroSubtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 28,
    maxWidth: 500,
  },
  heroButtons: {
    alignItems: "center",
    gap: 16,
  },
  primaryButton: {
    borderRadius: GlassEffect.borderRadius.pill,
    overflow: "hidden",
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  trialText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginBottom: 40,
  },
  featuresGrid: {
    flexDirection: "column",
    gap: 16,
    width: "100%",
  },
  featuresGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    maxWidth: 1000,
    gap: 20,
  },
  glassCard: {
    borderRadius: GlassEffect.borderRadius.lg,
    overflow: "hidden",
  },
  glassCardWeb: {
    borderRadius: GlassEffect.borderRadius.lg,
    borderWidth: 1,
  },
  glassCardInner: {
    borderRadius: GlassEffect.borderRadius.lg,
    borderWidth: 1,
    padding: 20,
  },
  featureCard: {
    padding: 24,
  },
  featureCardWide: {
    minWidth: 280,
    maxWidth: 300,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  stepsContainer: {
    flexDirection: "column",
    gap: 16,
    width: "100%",
  },
  stepsContainerWide: {
    flexDirection: "row",
    justifyContent: "center",
    maxWidth: 1000,
    gap: 20,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
  },
  stepCardWide: {
    flex: 1,
    minWidth: 280,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  ctaSection: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: "center",
  },
  ctaCard: {
    padding: 40,
    alignItems: "center",
    maxWidth: 500,
    width: "100%",
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 12,
  },
  ctaSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: 24,
  },
  ctaButton: {
    borderRadius: GlassEffect.borderRadius.pill,
    overflow: "hidden",
  },
  ctaButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  footer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
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
    color: "#FFFFFF",
  },
  footerText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 24,
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  footerLinksWrap: {
    flexWrap: "wrap",
    justifyContent: "center",
  },
  footerLink: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  footerDivider: {
    color: "rgba(255, 255, 255, 0.2)",
  },
  copyright: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.4)",
  },
});
