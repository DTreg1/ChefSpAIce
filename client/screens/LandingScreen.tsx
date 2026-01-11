import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useTheme } from "@/hooks/useTheme";
import { GlassColors, GlassEffect, AppColors } from "@/constants/theme";

const isWeb = Platform.OS === "web";

function GlassCard({
  children,
  style,
  testId,
}: {
  children: React.ReactNode;
  style?: any;
  testId?: string;
}) {
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
          style,
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
          },
        ]}
        data-testid={testId}
      >
        {children}
      </View>
    </BlurView>
  );
}

interface LandingScreenProps {
  onGetStarted?: (
    tier?: "basic" | "pro",
    billing?: "monthly" | "annual",
  ) => void;
  onSignIn?: () => void;
  onAbout?: () => void;
  onPrivacy?: () => void;
  onTerms?: () => void;
  onSupport?: () => void;
}

export default function LandingScreen({}: LandingScreenProps) {
  const { isDark } = useTheme();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={
          isDark
            ? ["#0A1F0F", "#0F1419", "#0A0F14"]
            : ["#1A3D2A", "#1E4D35", "#0F2A1A"]
        }
      />

      <View style={styles.logoContainer}>
        {/* iOS 26 Liquid Glass Button for Logo */}
        {Platform.OS === "ios" && isLiquidGlassAvailable() ? (
          <View style={styles.glassButtonShadow}>
            <GlassView
              glassEffectStyle="clear"
              isInteractive={true}
              style={styles.glassIconButton}
            >
              <View style={styles.iconContainer}>
                {/* Shadow icon with blur */}
                <BlurView
                  intensity={30}
                  tint="dark"
                  style={styles.iconShadowBlur}
                >
                  <MaterialCommunityIcons
                    name="chef-hat"
                    size={140}
                    color="rgba(0, 0, 0, 0.5)"
                    style={styles.iconShadowLayer}
                  />
                </BlurView>
                {/* Main frosted icon */}
                <MaterialCommunityIcons
                  name="chef-hat"
                  size={140}
                  color="rgba(255, 255, 255, 0.7)"
                  style={styles.iconMainLayer}
                />
              </View>
            </GlassView>
          </View>
        ) : (
          <View style={styles.glassButtonShadow}>
            <BlurView
              intensity={20}
              tint="light"
              style={styles.glassIconButton}
            >
              <View style={styles.glassOverlay}>
                <View style={styles.iconContainer}>
                  <BlurView
                    intensity={30}
                    tint="dark"
                    style={styles.iconShadowBlur}
                  >
                    <MaterialCommunityIcons
                      name="chef-hat"
                      size={140}
                      color="rgba(0, 0, 0, 0.5)"
                      style={styles.iconShadowLayer}
                    />
                  </BlurView>
                  <MaterialCommunityIcons
                    name="chef-hat"
                    size={140}
                    color="rgba(255, 255, 255, 0.7)"
                    style={styles.iconMainLayer}
                  />
                </View>
              </View>
            </BlurView>
          </View>
        )}
      </View>
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
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  glassButtonShadow: {
    shadowColor: "rgba(0, 0, 0, 0.35)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 18,
  },
  glassIconButton: {
    width: 240,
    height: 240,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  glassOverlay: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  iconContainer: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  iconShadowBlur: {
    position: "absolute",
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 90,
  },
  iconShadowLayer: {
    transform: [{ scale: 1.15 }],
  },
  iconMainLayer: {
    position: "absolute",
    top: 0,
    left: 0,
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
    paddingVertical: 24,
    alignItems: "center",
  },
  heroSectionWide: {
    paddingVertical: 40,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
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
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: GlassEffect.borderRadius.pill,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  trialText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
  },
  trustSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.5)",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 24,
  },
  trustLogos: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 32,
  },
  trustLogosWide: {
    gap: 48,
  },
  trustLogoItem: {
    alignItems: "center",
    gap: 8,
  },
  trustLogoIconContainer: {
    height: 24,
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  trustLogoText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
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
  benefitsGrid: {
    flexDirection: "column",
    gap: 24,
    width: "100%",
    maxWidth: 800,
  },
  benefitsGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 32,
  },
  benefitCard: {
    alignItems: "center",
    padding: 24,
  },
  benefitCardWide: {
    width: "45%",
    minWidth: 280,
  },
  benefitIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  benefitTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  benefitDescription: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 24,
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
  billingToggleContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  billingToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 30,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  billingOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 26,
    gap: 8,
  },
  billingOptionActive: {
    backgroundColor: AppColors.primary,
  },
  billingOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
  },
  billingOptionTextActive: {
    color: "#FFFFFF",
  },
  saveBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pricingGrid: {
    flexDirection: "column",
    gap: 20,
    width: "100%",
    maxWidth: 400,
  },
  pricingGridWide: {
    flexDirection: "row",
    justifyContent: "center",
    maxWidth: 1000,
    gap: 24,
  },
  pricingCard: {
    padding: 28,
    alignItems: "center",
  },
  pricingCardWide: {
    flex: 1,
    minWidth: 280,
    maxWidth: 320,
  },
  pricingCardPopular: {
    borderColor: AppColors.primary,
    borderWidth: 2,
  },
  popularBadge: {
    position: "absolute",
    top: -12,
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: GlassEffect.borderRadius.pill,
  },
  popularBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  pricingTier: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
    marginTop: 8,
  },
  pricingPriceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  pricingPrice: {
    fontSize: 48,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  pricingPeriod: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.6)",
  },
  pricingDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 24,
  },
  pricingFeatures: {
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  pricingFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pricingFeatureText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  pricingButtonPrimary: {
    width: "100%",
    borderRadius: GlassEffect.borderRadius.pill,
    overflow: "hidden",
  },
  pricingButtonSecondary: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: GlassEffect.borderRadius.pill,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
  },
  pricingButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  pricingButtonTextPrimary: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pricingButtonTextSecondary: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  testimonialsGrid: {
    flexDirection: "column",
    gap: 20,
    width: "100%",
    maxWidth: 400,
  },
  testimonialsGridWide: {
    flexDirection: "row",
    justifyContent: "center",
    maxWidth: 1000,
    gap: 24,
  },
  testimonialCard: {
    padding: 24,
  },
  testimonialCardWide: {
    flex: 1,
    minWidth: 280,
    maxWidth: 320,
  },
  testimonialStars: {
    flexDirection: "row",
    gap: 4,
    marginBottom: 16,
  },
  testimonialQuote: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 24,
    marginBottom: 20,
    fontStyle: "italic",
  },
  testimonialAuthor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  testimonialAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  testimonialAvatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  testimonialName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  testimonialRole: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  faqContainer: {
    width: "100%",
    maxWidth: 700,
    gap: 12,
  },
  faqCard: {
    padding: 20,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
    paddingRight: 16,
  },
  faqAnswer: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 22,
    marginTop: 16,
  },
  ctaSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
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
  ctaNote: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 16,
  },
  footer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingVertical: 24,
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
  qrCodeSection: {
    alignItems: "center",
    marginBottom: 24,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  qrCodeContainer: {
    padding: 8,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    borderRadius: 12,
    marginBottom: 12,
  },
  qrCodeLabel: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
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
