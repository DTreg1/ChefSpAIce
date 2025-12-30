import { useState, useEffect, useRef } from "react";
import { 
  StyleSheet, 
  View, 
  Text, 
  Pressable, 
  ScrollView, 
  Linking, 
  useWindowDimensions, 
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons, FontAwesome, Ionicons } from "@expo/vector-icons";
import { useWebTheme } from "@/contexts/WebThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";

const BRAND_GREEN = "#27AE60";
const BRAND_GREEN_DARK = "#1E8449";

const APP_STORE_URL = "#"; 
const PLAY_STORE_URL = "#"; 

interface PriceInfo {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  trialDays: number;
  productName: string;
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
    footerBg: isDark ? "#0A0D10" : "#F1F5F9",
    storeBadgeBg: isDark ? "#1A1F25" : "#FFFFFF",
    storeBadgeBorder: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    inputBg: isDark ? "#1A1F25" : "#FFFFFF",
    inputBorder: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    errorBg: isDark ? "rgba(239, 68, 68, 0.15)" : "rgba(239, 68, 68, 0.1)",
  };
}

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
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

const PLAN_FEATURES = [
  "Unlimited food inventory tracking",
  "AI-powered recipe generation",
  "Smart meal planning",
  "Expiration alerts & notifications",
  "Nutrition tracking & analytics",
  "Cloud sync across devices",
  "Shopping list management",
  "Waste reduction insights",
];

export default function LandingScreen() {
  const { width } = useWindowDimensions();
  const isWide = width > 768;
  const { isDark, toggleTheme } = useWebTheme();
  const colors = getThemeColors(isDark);
  const { signUp, signIn, signInWithApple, signInWithGoogle, isAppleAuthAvailable, isGoogleAuthAvailable, isAuthenticated } = useAuth();
  
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");
  const [prices, setPrices] = useState<{ monthly: PriceInfo | null; annual: PriceInfo | null }>({ monthly: null, annual: null });
  const [pricesLoading, setPricesLoading] = useState(true);
  
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const signupSectionRef = useRef<View>(null);

  useEffect(() => {
    fetchPrices();
  }, []);

  useEffect(() => {
    if (isAuthenticated && Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = "/onboarding";
    }
  }, [isAuthenticated]);

  const fetchPrices = async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/subscriptions/prices", baseUrl);
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        setPrices(data);
      }
    } catch (error) {
      console.error("Error fetching prices:", error);
    } finally {
      setPricesLoading(false);
    }
  };

  const handleAuth = async () => {
    setAuthError(null);
    
    if (!email || !password) {
      setAuthError("Please enter your email and password");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setAuthError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters");
      return;
    }

    setAuthLoading(true);
    try {
      if (isSignUp) {
        const result = await signUp(email, password, undefined, selectedPlan);
        if (!result.success) {
          setAuthError(result.error || "Registration failed");
        }
      } else {
        const result = await signIn(email, password);
        if (!result.success) {
          setAuthError(result.error || "Sign in failed");
        }
      }
    } catch (error) {
      setAuthError("An unexpected error occurred");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "apple" | "google") => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const result = provider === "apple" 
        ? await signInWithApple(selectedPlan)
        : await signInWithGoogle(selectedPlan);
      if (!result.success) {
        setAuthError(result.error || `${provider} sign in failed`);
      }
    } catch (error) {
      setAuthError("An unexpected error occurred");
    } finally {
      setAuthLoading(false);
    }
  };

  const scrollToSignup = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const element = document.getElementById("signup-section");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const navigateTo = (path: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.location.href = path;
    }
  };

  const annualPrice = prices.annual;
  const monthlyPrice = prices.monthly;
  const annualSavings = annualPrice && monthlyPrice
    ? Math.round(((monthlyPrice.amount * 12 - annualPrice.amount) / (monthlyPrice.amount * 12)) * 100)
    : 0;

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

          <View style={styles.heroCtas}>
            <Pressable
              style={[styles.primaryCta]}
              onPress={scrollToSignup}
              data-testid="button-get-started"
            >
              <LinearGradient
                colors={[BRAND_GREEN, BRAND_GREEN_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryCtaGradient}
              >
                <Text style={styles.primaryCtaText}>Start Free Trial</Text>
                <Feather name="arrow-right" size={20} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
            <Text style={[styles.trialNote, { color: colors.textSecondary }]}>
              7 days free, then pay as you go
            </Text>
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

      <View 
        style={styles.pricingSection} 
        data-testid="section-pricing"
        nativeID="signup-section"
        ref={signupSectionRef}
      >
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} data-testid="text-pricing-title">
          Choose Your Plan
        </Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]} data-testid="text-pricing-subtitle">
          Start with a free 7-day trial. Cancel anytime.
        </Text>

        <View style={[styles.pricingContainer, isWide && styles.pricingContainerWide]}>
          <View style={styles.planCards}>
            <Pressable
              style={[
                styles.planCard,
                { backgroundColor: colors.card, borderColor: selectedPlan === "monthly" ? BRAND_GREEN : colors.cardBorder },
                selectedPlan === "monthly" && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan("monthly")}
              data-testid="button-plan-monthly"
            >
              <View style={styles.planHeader}>
                <Text style={[styles.planName, { color: colors.textPrimary }]}>Monthly</Text>
                {pricesLoading ? (
                  <ActivityIndicator size="small" color={BRAND_GREEN} />
                ) : monthlyPrice ? (
                  <Text style={[styles.planPrice, { color: BRAND_GREEN }]}>
                    {formatPrice(monthlyPrice.amount, monthlyPrice.currency)}
                    <Text style={[styles.planInterval, { color: colors.textSecondary }]}>/mo</Text>
                  </Text>
                ) : null}
              </View>
              <View style={[styles.planRadio, selectedPlan === "monthly" && styles.planRadioSelected]}>
                {selectedPlan === "monthly" && <Feather name="check" size={14} color="#FFFFFF" />}
              </View>
            </Pressable>

            <Pressable
              style={[
                styles.planCard,
                { backgroundColor: colors.card, borderColor: selectedPlan === "annual" ? BRAND_GREEN : colors.cardBorder },
                selectedPlan === "annual" && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan("annual")}
              data-testid="button-plan-annual"
            >
              {annualSavings > 0 && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsBadgeText}>Save {annualSavings}%</Text>
                </View>
              )}
              <View style={styles.planHeader}>
                <Text style={[styles.planName, { color: colors.textPrimary }]}>Annual</Text>
                {pricesLoading ? (
                  <ActivityIndicator size="small" color={BRAND_GREEN} />
                ) : annualPrice ? (
                  <View>
                    <Text style={[styles.planPrice, { color: BRAND_GREEN }]}>
                      {formatPrice(annualPrice.amount, annualPrice.currency)}
                      <Text style={[styles.planInterval, { color: colors.textSecondary }]}>/yr</Text>
                    </Text>
                    <Text style={[styles.planMonthly, { color: colors.textSecondary }]}>
                      {formatPrice(Math.round(annualPrice.amount / 12), annualPrice.currency)}/mo
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={[styles.planRadio, selectedPlan === "annual" && styles.planRadioSelected]}>
                {selectedPlan === "annual" && <Feather name="check" size={14} color="#FFFFFF" />}
              </View>
            </Pressable>
          </View>

          <View style={styles.featuresListContainer}>
            <Text style={[styles.featuresListTitle, { color: colors.textPrimary }]}>Everything included:</Text>
            <View style={styles.featuresList}>
              {PLAN_FEATURES.map((feature, index) => (
                <View key={index} style={styles.featuresListItem}>
                  <Feather name="check-circle" size={16} color={BRAND_GREEN} />
                  <Text style={[styles.featuresListText, { color: colors.textSecondary }]}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.signupCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.signupTitle, { color: colors.textPrimary }]}>
              {isSignUp ? "Create Your Account" : "Welcome Back"}
            </Text>
            <Text style={[styles.signupSubtitle, { color: colors.textSecondary }]}>
              {isSignUp ? "Start your 7-day free trial" : "Sign in to continue"}
            </Text>

            {authError && (
              <View style={[styles.authErrorContainer, { backgroundColor: colors.errorBg }]}>
                <Feather name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.authErrorText}>{authError}</Text>
              </View>
            )}

            <View style={styles.authInputContainer}>
              <View style={[styles.authInputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <Feather name="mail" size={20} color={colors.textSecondary} style={styles.authInputIcon} />
                <TextInput
                  style={[styles.authInput, { color: colors.textPrimary }]}
                  placeholder="Email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  data-testid="input-email"
                />
              </View>

              <View style={[styles.authInputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <Feather name="lock" size={20} color={colors.textSecondary} style={styles.authInputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={[styles.authInput, { color: colors.textPrimary }]}
                  placeholder="Password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType={isSignUp ? "next" : "done"}
                  onSubmitEditing={() => {
                    if (isSignUp) {
                      confirmPasswordRef.current?.focus();
                    } else {
                      handleAuth();
                    }
                  }}
                  data-testid="input-password"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.authEyeButton}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              {isSignUp && (
                <View style={[styles.authInputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  <Feather name="lock" size={20} color={colors.textSecondary} style={styles.authInputIcon} />
                  <TextInput
                    ref={confirmPasswordRef}
                    style={[styles.authInput, { color: colors.textPrimary }]}
                    placeholder="Confirm Password"
                    placeholderTextColor={colors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleAuth}
                    data-testid="input-confirm-password"
                  />
                </View>
              )}
            </View>

            <Pressable
              style={[styles.authButton, authLoading && styles.authButtonDisabled]}
              onPress={handleAuth}
              disabled={authLoading}
              data-testid="button-auth-submit"
            >
              <LinearGradient
                colors={[BRAND_GREEN, BRAND_GREEN_DARK]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.authButtonGradient}
              >
                {authLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.authButtonText}>
                    {isSignUp ? "Start Free Trial" : "Sign In"}
                  </Text>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => {
                setIsSignUp(!isSignUp);
                setAuthError(null);
              }}
              style={styles.authSwitchButton}
              data-testid="button-switch-auth-mode"
            >
              <Text style={[styles.authSwitchText, { color: colors.textSecondary }]}>
                {isSignUp ? "Already have an account? " : "Don't have an account? "}
                <Text style={{ color: BRAND_GREEN, fontWeight: "600" }}>
                  {isSignUp ? "Sign In" : "Sign Up"}
                </Text>
              </Text>
            </Pressable>

            {(isAppleAuthAvailable || isGoogleAuthAvailable) && (
              <>
                <View style={styles.authDividerContainer}>
                  <View style={[styles.authDivider, { backgroundColor: colors.cardBorder }]} />
                  <Text style={[styles.authDividerText, { color: colors.textSecondary }]}>
                    or continue with
                  </Text>
                  <View style={[styles.authDivider, { backgroundColor: colors.cardBorder }]} />
                </View>

                <View style={styles.authSocialButtons}>
                  {isAppleAuthAvailable && (
                    <Pressable
                      style={[styles.authSocialButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                      onPress={() => handleSocialAuth("apple")}
                      disabled={authLoading}
                      data-testid="button-auth-apple"
                    >
                      <FontAwesome name="apple" size={20} color={colors.textPrimary} />
                      <Text style={[styles.authSocialButtonText, { color: colors.textPrimary }]}>Apple</Text>
                    </Pressable>
                  )}
                  {isGoogleAuthAvailable && (
                    <Pressable
                      style={[styles.authSocialButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                      onPress={() => handleSocialAuth("google")}
                      disabled={authLoading}
                      data-testid="button-auth-google"
                    >
                      <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
                      <Text style={[styles.authSocialButtonText, { color: colors.textPrimary }]}>Google</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </View>

      <View style={styles.mobileSection} data-testid="section-mobile">
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Available on All Devices</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Web, iOS, and Android - your kitchen assistant everywhere
        </Text>
        <View style={styles.storeBadges}>
          <StoreBadge type="apple" colors={colors} />
          <StoreBadge type="google" colors={colors} />
        </View>
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
            <Text style={[styles.footerDivider, { color: colors.textMuted }]}>|</Text>
            <Pressable onPress={() => navigateTo("/terms")} data-testid="link-terms">
              <Text style={[styles.footerLink, { color: colors.textSecondary }]}>Terms of Service</Text>
            </Pressable>
            <Text style={[styles.footerDivider, { color: colors.textMuted }]}>|</Text>
            <Pressable onPress={() => navigateTo("/about")} data-testid="link-about">
              <Text style={[styles.footerLink, { color: colors.textSecondary }]}>About</Text>
            </Pressable>
            <Text style={[styles.footerDivider, { color: colors.textMuted }]}>|</Text>
            <Pressable onPress={() => navigateTo("/support")} data-testid="link-support">
              <Text style={[styles.footerLink, { color: colors.textSecondary }]}>Support</Text>
            </Pressable>
            <Text style={[styles.footerDivider, { color: colors.textMuted }]}>|</Text>
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
  heroCtas: {
    alignItems: "center",
    gap: 12,
  },
  primaryCta: {
    borderRadius: 12,
    overflow: "hidden",
  },
  primaryCtaGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  primaryCtaText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  trialNote: {
    fontSize: 14,
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
  pricingSection: {
    paddingHorizontal: 24,
    paddingVertical: 60,
    alignItems: "center",
  },
  pricingContainer: {
    width: "100%",
    maxWidth: 500,
    gap: 24,
  },
  pricingContainerWide: {
    maxWidth: 800,
  },
  planCards: {
    flexDirection: "row",
    gap: 16,
  },
  planCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    position: "relative",
  },
  planCardSelected: {
    backgroundColor: "rgba(39, 174, 96, 0.05)",
  },
  planHeader: {
    gap: 8,
  },
  planName: {
    fontSize: 18,
    fontWeight: "600",
  },
  planPrice: {
    fontSize: 28,
    fontWeight: "700",
  },
  planInterval: {
    fontSize: 16,
    fontWeight: "400",
  },
  planMonthly: {
    fontSize: 14,
    marginTop: 4,
  },
  planRadio: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  planRadioSelected: {
    backgroundColor: BRAND_GREEN,
    borderColor: BRAND_GREEN,
  },
  savingsBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: "#F59E0B",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  featuresListContainer: {
    gap: 12,
  },
  featuresListTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  featuresList: {
    gap: 8,
  },
  featuresListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featuresListText: {
    fontSize: 14,
  },
  signupCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    gap: 16,
  },
  signupTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  signupSubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 8,
  },
  authErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  authErrorText: {
    color: "#EF4444",
    fontSize: 14,
    flex: 1,
  },
  authInputContainer: {
    gap: 12,
  },
  authInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
  },
  authInputIcon: {
    marginRight: 12,
  },
  authInput: {
    flex: 1,
    fontSize: 16,
    height: "100%",
    outlineStyle: "none",
  } as any,
  authEyeButton: {
    padding: 4,
  },
  authButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  authButtonGradient: {
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  authButtonDisabled: {
    opacity: 0.7,
  },
  authButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  authSwitchButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  authSwitchText: {
    fontSize: 14,
  },
  authDividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  authDivider: {
    flex: 1,
    height: 1,
  },
  authDividerText: {
    fontSize: 13,
  },
  authSocialButtons: {
    flexDirection: "row",
    gap: 12,
  },
  authSocialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
  },
  authSocialButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  mobileSection: {
    paddingHorizontal: 24,
    paddingVertical: 60,
    alignItems: "center",
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
