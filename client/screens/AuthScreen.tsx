import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Image,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";
import { useOnboardingStatus } from "@/contexts/OnboardingContext";
import { useAuth } from "@/contexts/AuthContext";
import { syncManager } from "@/lib/sync-manager";
import { webAccessibilityProps } from "@/lib/web-accessibility";
import { logger } from "@/lib/logger";
import { useStoreKit } from "@/hooks/useStoreKit";
import { MONTHLY_PRICE } from "@shared/subscription";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  return null;
}

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { recheckOnboarding, markOnboardingComplete } = useOnboardingStatus();

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

  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const {
    isAvailable: isStoreKitAvailable,
    offerings,
  } = useStoreKit();

  const shouldUseStoreKit =
    (Platform.OS === "ios" || Platform.OS === "android") && isStoreKitAvailable;

  const getPreviewPrice = (): string => {
    if (shouldUseStoreKit && offerings?.availablePackages) {
      for (const pkg of offerings.availablePackages) {
        const id = pkg.identifier.toLowerCase();
        const isMonthly = pkg.packageType === "MONTHLY" || id.includes("monthly");
        if (isMonthly) {
          return `${pkg.product.priceString}/mo`;
        }
      }
    }
    if (Platform.OS === "ios" || Platform.OS === "android") {
      return "ChefSpAIce";
    }
    return `$${MONTHLY_PRICE.toFixed(2)}/mo`;
  };

  const handleOpenPrivacyPolicy = () => {
    if (Platform.OS === "web") {
      window.open("/privacy", "_blank");
    } else {
      navigation.navigate("Privacy" as any);
    }
  };

  const handleOpenTermsOfUse = () => {
    if (Platform.OS === "web") {
      window.open("/terms", "_blank");
    } else {
      navigation.navigate("Terms" as any);
    }
  };

  const handleForgotPassword = () => {
    Alert.prompt
      ? Alert.prompt(
          "Forgot Password",
          "Enter your email address and we'll send you a reset link.",
          async (inputEmail: string) => {
            if (!inputEmail?.trim()) return;
            try {
              const baseUrl = getApiUrl();
              await fetch(`${baseUrl}/api/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inputEmail.trim() }),
              });
              Alert.alert("Check Your Email", "If an account exists with that email, we've sent password reset instructions.");
            } catch {
              Alert.alert("Error", "Failed to send reset email. Please try again.");
            }
          },
          "plain-text",
          email || "",
        )
      : Alert.alert(
          "Forgot Password",
          "Enter your email address in the email field above, then tap OK.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "OK",
              onPress: async () => {
                if (!email?.trim()) {
                  Alert.alert("Error", "Please enter your email address in the email field first.");
                  return;
                }
                try {
                  const baseUrl = getApiUrl();
                  await fetch(`${baseUrl}/api/auth/forgot-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: email.trim() }),
                  });
                  Alert.alert("Check Your Email", "If an account exists with that email, we've sent password reset instructions.");
                } catch {
                  Alert.alert("Error", "Failed to send reset email. Please try again.");
                }
              },
            },
          ],
        );
  };

  const handleContinueAsGuest = () => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Onboarding" }],
      }),
    );
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

    if (isSignUp) {
      const pwError = validatePassword(password);
      if (pwError) {
        setAuthError(pwError);
        return;
      }
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      let result;
      if (isSignUp) {
        result = await signUp(email.trim(), password, undefined, undefined);
      } else {
        result = await signIn(email.trim(), password);
      }

      if (!result.success) {
        setAuthError(result.error || "Authentication failed");
        return;
      }

      await handlePostAuthNavigation();
    } catch (err) {
      logger.error("Auth error:", err);
      setAuthError("An unexpected error occurred");
    } finally {
      setAuthLoading(false);
    }
  };

  const handlePostAuthNavigation = async () => {
    await syncManager.clearQueue();

    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    await recheckOnboarding();
    const needsOnboarding = await storage.needsOnboarding();

    if (needsOnboarding) {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Onboarding" }],
        }),
      );
      return;
    }

    const baseUrl = getApiUrl();
    const subscriptionResponse = await fetch(
      `${baseUrl}/api/subscriptions/me`,
      {
        credentials: "include",
      },
    );
    const subscriptionData = (await subscriptionResponse.json()).data as any;
    const isSubscriptionActive =
      subscriptionData?.status === "active" ||
      subscriptionData?.status === "trialing";

    if (isSubscriptionActive) {
      markOnboardingComplete();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Main" }],
        }),
      );
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Subscription", params: { reason: "expired" } }],
        }),
      );
    }
  };

  const handleSocialAuth = async (provider: "apple" | "google") => {
    setAuthLoading(true);
    setAuthError(null);

    try {
      let result;
      if (provider === "apple") {
        result = await signInWithApple(undefined);
      } else {
        result = await signInWithGoogle(undefined);
      }

      if (!result.success) {
        if (result.error !== "User cancelled") {
          setAuthError(result.error || "Authentication failed");
        }
        return;
      }

      await handlePostAuthNavigation();
    } catch (err) {
      logger.error("Social auth error:", err);
      setAuthError("An unexpected error occurred");
    } finally {
      setAuthLoading(false);
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
      <View style={styles.header}></View>

      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeHeader}></View>

        <Animated.View
          entering={FadeIn.delay(700).duration(400)}
          style={styles.authSection}
        >
          {isSignUp && (
            <View style={styles.planSelectionContainer}>
              {/* Free Trial Banner */}
              <View
                style={[
                  styles.trialBanner,
                  { backgroundColor: `${AppColors.primary}15` },
                ]}
              >
                <View
                  style={[
                    styles.trialIconContainer,
                    { backgroundColor: AppColors.primary },
                  ]}
                >
                  <Feather name="gift" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.trialTextContainer}>
                  <ThemedText style={styles.trialTitle}>
                    7-Day Free Trial
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.trialSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Full access to all features. No payment required.
                  </ThemedText>
                </View>
              </View>

              {/* Features List */}
              <View style={styles.featuresListContainer}>
                <ThemedText style={styles.featuresListTitle}>
                  What you'll get:
                </ThemedText>
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
                      <Feather
                        name="check-circle"
                        size={12}
                        color={AppColors.primary}
                      />
                      <ThemedText style={styles.featureGridItemText}>
                        {feature}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>

              {/* Subscription Options Preview */}
              <View
                style={[
                  styles.subscriptionPreview,
                  {
                    backgroundColor: theme.glass.background,
                    borderColor: theme.glass.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.subscriptionPreviewTitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  After your trial, subscribe to continue:
                </ThemedText>
                <View style={styles.planPreviewRow}>
                  <View style={styles.planPreviewItem}>
                    <ThemedText style={styles.planPreviewName}>
                      ChefSpAIce
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.planPreviewPrice,
                        { color: AppColors.primary },
                      ]}
                      data-testid="text-subscription-price"
                    >
                      {getPreviewPrice()}
                    </ThemedText>
                  </View>
                </View>
              </View>
            </View>
          )}

          <ThemedText style={styles.authTitle}>
            {isSignUp ? "Create Account" : "Welcome Back"}
          </ThemedText>

          {authError && (
            <View
              style={[
                styles.authErrorContainer,
                { backgroundColor: `${AppColors.error}15` },
              ]}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <Feather name="alert-circle" size={16} color={AppColors.error} />
              <ThemedText
                style={[styles.authErrorText, { color: AppColors.error }]}
              >
                {authError}
              </ThemedText>
            </View>
          )}

          {(isAppleAuthAvailable || isGoogleAuthAvailable) && (
            <>
              <View style={styles.authSocialButtons}>
                {isAppleAuthAvailable && (
                  <Pressable
                    style={[
                      styles.authSocialButton,
                      {
                        backgroundColor: theme.glass.background,
                        borderColor: theme.glass.border,
                      },
                    ]}
                    onPress={() => handleSocialAuth("apple")}
                    disabled={authLoading}
                    data-testid="button-signin-apple"
                    {...webAccessibilityProps(() => handleSocialAuth("apple"))}
                  >
                    <Ionicons name="logo-apple" size={24} color={theme.text} />
                    <ThemedText style={styles.authSocialButtonText}>
                      Sign in with Apple
                    </ThemedText>
                  </Pressable>
                )}

                {isGoogleAuthAvailable && (
                  <Pressable
                    style={[
                      styles.authSocialButton,
                      {
                        backgroundColor: theme.glass.background,
                        borderColor: theme.glass.border,
                      },
                    ]}
                    onPress={() => handleSocialAuth("google")}
                    disabled={authLoading}
                    data-testid="button-signin-google"
                    {...webAccessibilityProps(() => handleSocialAuth("google"))}
                  >
                    <Image
                      source={{ uri: "https://www.google.com/favicon.ico" }}
                      style={styles.authGoogleIcon}
                      accessibilityLabel="Google logo"
                    />
                    <ThemedText style={styles.authSocialButtonText}>
                      Sign in with Google
                    </ThemedText>
                  </Pressable>
                )}
              </View>

              <View style={styles.authDividerContainer}>
                <View
                  style={[
                    styles.authDivider,
                    { backgroundColor: theme.glass.border },
                  ]}
                />
                <ThemedText
                  style={[
                    styles.authDividerText,
                    { color: theme.textSecondary },
                  ]}
                >
                  or continue with email
                </ThemedText>
                <View
                  style={[
                    styles.authDivider,
                    { backgroundColor: theme.glass.border },
                  ]}
                />
              </View>
            </>
          )}

          <View style={styles.authInputContainer}>
            <View
              style={[
                styles.authInputWrapper,
                {
                  backgroundColor: theme.glass.background,
                  borderColor: theme.glass.border,
                },
              ]}
            >
              <Feather
                name="mail"
                size={20}
                color={theme.textSecondary}
                style={styles.authInputIcon}
              />
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
                {
                  backgroundColor: theme.glass.background,
                  borderColor: theme.glass.border,
                },
              ]}
            >
              <Feather
                name="lock"
                size={20}
                color={theme.textSecondary}
                style={styles.authInputIcon}
              />
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
              <Pressable
                accessibilityLabel="Toggle password visibility"
                onPress={() => setShowPassword(!showPassword)}
                style={styles.authEyeButton}
                {...webAccessibilityProps(() => setShowPassword(!showPassword))}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>

            {isSignUp && (
              <View style={{ paddingHorizontal: 4, marginTop: -4, marginBottom: 4 }}>
                <ThemedText data-testid="text-password-requirements" style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                  Password must be at least 8 characters and contain an uppercase letter, lowercase letter, and number.
                </ThemedText>
              </View>
            )}

            {isSignUp && (
              <View
                style={[
                  styles.authInputWrapper,
                  {
                    backgroundColor: theme.glass.background,
                    borderColor: theme.glass.border,
                  },
                ]}
              >
                <Feather
                  name="lock"
                  size={20}
                  color={theme.textSecondary}
                  style={styles.authInputIcon}
                />
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
            {...webAccessibilityProps(handleAuth)}
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
            {...webAccessibilityProps(() => { setIsSignUp(!isSignUp); setAuthError(null); })}
          >
            <ThemedText
              style={[styles.authSwitchText, { color: theme.textSecondary }]}
            >
              {isSignUp
                ? "Already have an account? "
                : "Don't have an account? "}
              <ThemedText
                style={{ color: AppColors.primary, fontWeight: "600" }}
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </ThemedText>
            </ThemedText>
          </Pressable>

          {!isSignUp && (
            <Pressable
              onPress={handleForgotPassword}
              style={styles.forgotPasswordButton}
              data-testid="button-forgot-password"
              {...webAccessibilityProps(handleForgotPassword)}
            >
              <ThemedText
                style={[styles.forgotPasswordText, { color: AppColors.primary }]}
              >
                Forgot Password?
              </ThemedText>
            </Pressable>
          )}

          <View style={styles.legalLinksContainer}>
            {isSignUp && (
              <ThemedText
                style={[styles.legalText, { color: theme.textSecondary }]}
              >
                By creating an account, you agree to our
              </ThemedText>
            )}
            <View style={styles.legalLinksRow}>
              <Pressable
                onPress={handleOpenPrivacyPolicy}
                data-testid="link-auth-privacy-policy"
                {...webAccessibilityProps(handleOpenPrivacyPolicy)}
              >
                <ThemedText
                  style={[styles.legalLink, { color: AppColors.primary }]}
                >
                  Privacy Policy
                </ThemedText>
              </Pressable>
              <ThemedText
                style={[styles.legalSeparator, { color: theme.textSecondary }]}
              >
                {" and "}
              </ThemedText>
              <Pressable
                onPress={handleOpenTermsOfUse}
                data-testid="link-auth-terms-of-use"
                {...webAccessibilityProps(handleOpenTermsOfUse)}
              >
                <ThemedText
                  style={[styles.legalLink, { color: AppColors.primary }]}
                >
                  Terms of Service
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {isSignUp && Platform.OS !== "web" && (
            <Pressable
              onPress={handleContinueAsGuest}
              style={styles.guestButton}
              data-testid="button-continue-as-guest"
              {...webAccessibilityProps(handleContinueAsGuest)}
            >
              <ThemedText
                style={[styles.guestButtonText, { color: theme.textSecondary }]}
              >
                Skip for now - Start your free trial
              </ThemedText>
            </Pressable>
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
  trialBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  trialIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  trialTextContainer: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  trialSubtitle: {
    fontSize: 13,
  },
  subscriptionPreview: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.sm,
  },
  subscriptionPreviewTitle: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  planPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  planPreviewItem: {
    flex: 1,
    alignItems: "center",
  },
  planPreviewName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  planPreviewPrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  planPreviewDivider: {
    width: 1,
    height: 32,
    marginHorizontal: Spacing.md,
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
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  authSocialButton: {
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
  forgotPasswordButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "500",
  },
  legalLinksContainer: {
    alignItems: "center",
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  legalText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  legalLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 2,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: "500",
    textDecorationLine: "underline" as const,
  },
  legalSeparator: {
    fontSize: 12,
  },
  guestButton: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
  },
  guestButtonText: {
    fontSize: 14,
    fontWeight: "400",
    textDecorationLine: "underline" as const,
  },
});
