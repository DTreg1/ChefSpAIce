import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
  Image,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useNavigation, useRoute, CommonActions, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type AuthScreenRouteProp = RouteProp<RootStackParamList, 'Auth'>;

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

const AppIcon = require("../../assets/images/icon.png");
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import { useOnboardingStatus } from "@/contexts/OnboardingContext";
import { useAuth } from "@/contexts/AuthContext";
import { syncManager } from "@/lib/sync-manager";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const FEATURES = [
  {
    icon: "package" as keyof typeof Feather.glyphMap,
    title: "Track Your Food",
    description: "Never forget what's in your fridge, freezer, or pantry",
    color: "#3B82F6",
  },
  {
    icon: "clock" as keyof typeof Feather.glyphMap,
    title: "Reduce Waste",
    description: "Get alerts before food expires so nothing goes bad",
    color: "#F59E0B",
  },
  {
    icon: "book-open" as keyof typeof Feather.glyphMap,
    title: "Smart Recipes",
    description: "AI generates recipes from ingredients you already have",
    color: "#8B5CF6",
  },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<AuthScreenRouteProp>();
  const { recheckOnboarding, markOnboardingComplete } = useOnboardingStatus();
  
  const initialTier = route.params?.selectedTier || 'pro';
  const initialBilling = route.params?.billingPeriod || 'monthly';
  const {
    signIn,
    signUp,
    signInWithApple,
    signInWithGoogle,
    isAppleAuthAvailable,
    isGoogleAuthAvailable,
  } = useAuth();

  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<"basic" | "pro">(initialTier);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(initialBilling);

  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const prices = {
    basic: { monthly: 4.99, annual: 49.90 },
    pro: { monthly: 9.99, annual: 99.90 },
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setAuthError("Please enter email and password");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setAuthError("Passwords do not match");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      let result;
      if (isSignUp) {
        result = await signUp(email.trim(), password, undefined, selectedTier);
      } else {
        result = await signIn(email.trim(), password);
      }

      if (!result.success) {
        setAuthError(result.error || "Authentication failed");
        return;
      }

      await syncManager.clearQueue();

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      if (!isSignUp) {
        await recheckOnboarding();
        const needsOnboarding = await storage.needsOnboarding();
        if (!needsOnboarding) {
          markOnboardingComplete();
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Main" }],
            }),
          );
          return;
        }
      }

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Onboarding" }],
        }),
      );
    } catch (err) {
      console.error("Auth error:", err);
      setAuthError("An unexpected error occurred");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "apple" | "google") => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      let result;
      if (provider === "apple") {
        result = await signInWithApple(selectedTier);
      } else {
        result = await signInWithGoogle(selectedTier);
      }

      if (!result.success) {
        if (result.error !== "User cancelled") {
          setAuthError(result.error || "Authentication failed");
        }
        return;
      }

      await syncManager.clearQueue();

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      await recheckOnboarding();
      const needsOnboarding = await storage.needsOnboarding();
      if (!needsOnboarding) {
        markOnboardingComplete();
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Main" }],
          }),
        );
        return;
      }

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Onboarding" }],
        }),
      );
    } catch (err) {
      console.error("Social auth error:", err);
      setAuthError("An unexpected error occurred");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // For web users, go back to Landing; for mobile users who can't go back,
      // Auth is already the entry point so just stay here (this case is rare)
      if (Platform.OS === "web") {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Landing" }],
          }),
        );
      }
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.header}>
      </View>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeHeader}>
        </View>

        

        <Animated.View
          entering={FadeIn.delay(700).duration(400)}
          style={styles.authSection}
        >
          {isSignUp && (
            <View style={styles.planSelectionContainer}>
              <ThemedText style={styles.planSelectionTitle}>Choose Your Plan</ThemedText>
              <ThemedText style={[styles.planSelectionSubtitle, { color: theme.textSecondary }]}>
                Start with a free 7-day trial. Cancel anytime.
              </ThemedText>

              <View style={styles.billingToggleContainer}>
                <Pressable
                  style={[
                    styles.billingToggleButton,
                    billingPeriod === "monthly" && styles.billingToggleButtonActive,
                  ]}
                  onPress={() => {
                    setBillingPeriod("monthly");
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  data-testid="button-billing-monthly"
                >
                  <ThemedText style={[
                    styles.billingToggleText,
                    billingPeriod === "monthly" && styles.billingToggleTextActive,
                  ]}>Monthly</ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.billingToggleButton,
                    billingPeriod === "annual" && styles.billingToggleButtonActive,
                  ]}
                  onPress={() => {
                    setBillingPeriod("annual");
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  data-testid="button-billing-annual"
                >
                  <ThemedText style={[
                    styles.billingToggleText,
                    billingPeriod === "annual" && styles.billingToggleTextActive,
                  ]}>Annual</ThemedText>
                  {billingPeriod === "annual" && (
                    <View style={styles.saveBadge}>
                      <ThemedText style={styles.saveBadgeText}>Save 17%</ThemedText>
                    </View>
                  )}
                </Pressable>
              </View>

              <View style={styles.featuresListContainer}>
                <ThemedText style={styles.featuresListTitle}>Everything you get:</ThemedText>
                <View style={styles.featuresGrid}>
                  {[
                    "Unlimited inventory",
                    "AI recipes",
                    "Meal planning",
                    "Expiration alerts",
                    "Nutrition tracking",
                    "Cloud sync",
                    "Shopping lists",
                    "Waste reduction",
                  ].map((feature, index) => (
                    <View key={index} style={styles.featureGridItem}>
                      <Feather name="check-circle" size={12} color={AppColors.primary} />
                      <ThemedText style={styles.featureGridItemText}>{feature}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.planCardsRow}>
                <Pressable
                  style={[
                    styles.planCard,
                    styles.planCardLeft,
                    { 
                      backgroundColor: theme.glass.background,
                      borderColor: selectedTier === "basic" ? AppColors.primary : theme.glass.border,
                      borderTopWidth: 2,
                      borderBottomWidth: 2,
                      borderLeftWidth: 2,
                      borderRightWidth: 1,
                    },
                  ]}
                  onPress={() => {
                    setSelectedTier("basic");
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  data-testid="button-tier-basic"
                >
                  <View style={styles.planCardContent}>
                    <ThemedText style={styles.planCardName}>Basic</ThemedText>
                    <ThemedText style={[styles.planCardPrice, { color: AppColors.primary }]}>
                      ${prices.basic[billingPeriod].toFixed(2)}
                      <ThemedText style={[styles.planCardInterval, { color: theme.textSecondary }]}>/{billingPeriod === "monthly" ? "mo" : "yr"}</ThemedText>
                    </ThemedText>
                    {billingPeriod === "annual" && (
                      <ThemedText style={[styles.planCardMonthly, { color: theme.textSecondary }]}>
                        ${(prices.basic.annual / 12).toFixed(2)}/mo
                      </ThemedText>
                    )}
                  </View>
                  <View style={[
                    styles.planCardRadio,
                    selectedTier === "basic" && { backgroundColor: AppColors.primary, borderColor: AppColors.primary }
                  ]}>
                    {selectedTier === "basic" && <Feather name="check" size={12} color="#FFFFFF" />}
                  </View>
                </Pressable>

                <Pressable
                  style={[
                    styles.planCard,
                    styles.planCardRight,
                    { 
                      backgroundColor: theme.glass.background,
                      borderColor: selectedTier === "pro" ? AppColors.primary : theme.glass.border,
                      borderTopWidth: 2,
                      borderBottomWidth: 2,
                      borderRightWidth: 2,
                      borderLeftWidth: 1,
                    },
                  ]}
                  onPress={() => {
                    setSelectedTier("pro");
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  data-testid="button-tier-pro"
                >
                  <View style={styles.popularBadge}>
                    <ThemedText style={styles.popularBadgeText}>Popular</ThemedText>
                  </View>
                  <View style={styles.planCardContent}>
                    <ThemedText style={styles.planCardName}>Pro</ThemedText>
                    <ThemedText style={[styles.planCardPrice, { color: AppColors.primary }]}>
                      ${prices.pro[billingPeriod].toFixed(2)}
                      <ThemedText style={[styles.planCardInterval, { color: theme.textSecondary }]}>/{billingPeriod === "monthly" ? "mo" : "yr"}</ThemedText>
                    </ThemedText>
                    {billingPeriod === "annual" && (
                      <ThemedText style={[styles.planCardMonthly, { color: theme.textSecondary }]}>
                        ${(prices.pro.annual / 12).toFixed(2)}/mo
                      </ThemedText>
                    )}
                  </View>
                  <View style={[
                    styles.planCardRadio,
                    selectedTier === "pro" && { backgroundColor: AppColors.primary, borderColor: AppColors.primary }
                  ]}>
                    {selectedTier === "pro" && <Feather name="check" size={12} color="#FFFFFF" />}
                  </View>
                </Pressable>
              </View>
            </View>
          )}

          <ThemedText style={styles.authTitle}>
            {isSignUp ? "Create Account" : "Welcome Back"}
          </ThemedText>

          {authError && (
            <View style={[styles.authErrorContainer, { backgroundColor: `${AppColors.error}15` }]}>
              <Feather name="alert-circle" size={16} color={AppColors.error} />
              <ThemedText style={[styles.authErrorText, { color: AppColors.error }]}>
                {authError}
              </ThemedText>
            </View>
          )}

          <View style={styles.authInputContainer}>
            <View
              style={[
                styles.authInputWrapper,
                { backgroundColor: theme.glass.background, borderColor: theme.glass.border },
              ]}
            >
              <Feather name="mail" size={20} color={theme.textSecondary} style={styles.authInputIcon} />
              <TextInput
                style={[styles.authInput, { color: theme.text }]}
                placeholder="Email"
                placeholderTextColor={theme.textSecondary}
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

            <View
              style={[
                styles.authInputWrapper,
                { backgroundColor: theme.glass.background, borderColor: theme.glass.border },
              ]}
            >
              <Feather name="lock" size={20} color={theme.textSecondary} style={styles.authInputIcon} />
              <TextInput
                ref={passwordRef}
                style={[styles.authInput, { color: theme.text }]}
                placeholder="Password"
                placeholderTextColor={theme.textSecondary}
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
                <Feather name={showPassword ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            {isSignUp && (
              <View
                style={[
                  styles.authInputWrapper,
                  { backgroundColor: theme.glass.background, borderColor: theme.glass.border },
                ]}
              >
                <Feather name="lock" size={20} color={theme.textSecondary} style={styles.authInputIcon} />
                <TextInput
                  ref={confirmPasswordRef}
                  style={[styles.authInput, { color: theme.text }]}
                  placeholder="Confirm Password"
                  placeholderTextColor={theme.textSecondary}
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
            style={[
              styles.authButton,
              { backgroundColor: AppColors.primary },
              authLoading && styles.authButtonDisabled,
            ]}
            onPress={handleAuth}
            disabled={authLoading}
            data-testid="button-auth-submit"
          >
            {authLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.authButtonText}>
                {isSignUp ? "Create Account" : "Sign In"}
              </ThemedText>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setIsSignUp(!isSignUp);
              setAuthError(null);
            }}
            style={styles.authSwitchButton}
            data-testid="button-switch-auth-mode"
          >
            <ThemedText style={[styles.authSwitchText, { color: theme.textSecondary }]}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <ThemedText style={{ color: AppColors.primary, fontWeight: "600" }}>
                {isSignUp ? "Sign In" : "Sign Up"}
              </ThemedText>
            </ThemedText>
          </Pressable>

          {(isAppleAuthAvailable || isGoogleAuthAvailable) && (
            <>
              <View style={styles.authDividerContainer}>
                <View style={[styles.authDivider, { backgroundColor: theme.glass.border }]} />
                <ThemedText style={[styles.authDividerText, { color: theme.textSecondary }]}>
                  or continue with
                </ThemedText>
                <View style={[styles.authDivider, { backgroundColor: theme.glass.border }]} />
              </View>

              <View style={styles.authSocialButtons}>
                {isAppleAuthAvailable && (
                  <Pressable
                    style={[
                      styles.authSocialButton,
                      { backgroundColor: theme.glass.background, borderColor: theme.glass.border },
                    ]}
                    onPress={() => handleSocialAuth("apple")}
                    disabled={authLoading}
                    data-testid="button-signin-apple"
                  >
                    <Ionicons name="logo-apple" size={24} color={theme.text} />
                    <ThemedText style={styles.authSocialButtonText}>Apple</ThemedText>
                  </Pressable>
                )}

                {isGoogleAuthAvailable && (
                  <Pressable
                    style={[
                      styles.authSocialButton,
                      { backgroundColor: theme.glass.background, borderColor: theme.glass.border },
                    ]}
                    onPress={() => handleSocialAuth("google")}
                    disabled={authLoading}
                    data-testid="button-signin-google"
                  >
                    <Image
                      source={{ uri: "https://www.google.com/favicon.ico" }}
                      style={styles.authGoogleIcon}
                    />
                    <ThemedText style={styles.authSocialButtonText}>Google</ThemedText>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </Animated.View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  welcomeHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  appIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  appIconImage: {
    width: "100%",
    height: "100%",
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  appTagline: {
    fontSize: 14,
    textAlign: "center",
  },
  featuresContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  featureIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 12,
  },
  authSection: {
    marginTop: Spacing.md,
  },
  planSelectionContainer: {
    marginBottom: Spacing.lg,
  },
  planSelectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  planSelectionSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  billingToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 24,
    padding: 4,
    alignSelf: "center",
  },
  billingToggleButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  billingToggleButtonActive: {
    backgroundColor: AppColors.primary,
  },
  billingToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  billingToggleTextActive: {
    color: "#FFFFFF",
  },
  saveBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  planCardMonthly: {
    fontSize: 11,
    marginTop: 2,
  },
  featuresListContainer: {
    marginBottom: Spacing.md,
  },
  featuresListTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  featureGridItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    gap: Spacing.xs,
  },
  featureGridItemText: {
    fontSize: 12,
  },
  planCardsRow: {
    flexDirection: "row",
  },
  planCard: {
    flex: 1,
    padding: Spacing.md,
    position: "relative",
  },
  planCardLeft: {
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  planCardRight: {
    borderTopRightRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  planCardContent: {
    flex: 1,
  },
  planCardHeader: {
    marginBottom: Spacing.xs,
  },
  planCardName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  planCardPrice: {
    fontSize: 20,
    fontWeight: "700",
  },
  planCardInterval: {
    fontSize: 12,
    fontWeight: "400",
  },
  planCardRadio: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#666",
    alignItems: "center",
    justifyContent: "center",
  },
  popularBadge: {
    position: "absolute",
    top: -8,
    right: Spacing.sm,
    backgroundColor: AppColors.warning,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  authTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  authErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  authErrorText: {
    fontSize: 13,
    flex: 1,
  },
  authInputContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  authInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 50,
  },
  authInputIcon: {
    marginRight: Spacing.sm,
  },
  authInput: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  authEyeButton: {
    padding: Spacing.xs,
  },
  authButton: {
    height: 50,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
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
    paddingVertical: Spacing.sm,
  },
  authSwitchText: {
    fontSize: 14,
  },
  authDividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.md,
  },
  authDivider: {
    flex: 1,
    height: 1,
  },
  authDividerText: {
    marginHorizontal: Spacing.md,
    fontSize: 12,
  },
  authSocialButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  authSocialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    height: 50,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  authSocialButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  authGoogleIcon: {
    width: 20,
    height: 20,
  },
});
