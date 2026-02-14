import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  TextInput,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useNavigation, CommonActions } from "@react-navigation/native";
import type { RootNavigation } from "@/lib/types";

import { ThemedText } from "@/components/ThemedText";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { storage } from "@/lib/storage";
import { apiClient } from "@/lib/api-client";
import { useOnboardingStatus } from "@/contexts/OnboardingContext";
import { useAuth } from "@/contexts/AuthContext";
import { syncManager } from "@/lib/sync-manager";
import { webAccessibilityProps } from "@/lib/web-accessibility";
import { logger } from "@/lib/logger";

type NavigationProp = RootNavigation;

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

  const handleOpenPrivacyPolicy = () => {
    if (Platform.OS === "web") {
      window.open("/privacy", "_blank");
    } else {
      navigation.navigate("Privacy");
    }
  };

  const handleOpenTermsOfUse = () => {
    if (Platform.OS === "web") {
      window.open("/terms", "_blank");
    } else {
      navigation.navigate("Terms");
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
              await apiClient.post<void>("/api/auth/forgot-password", { email: inputEmail.trim() }, { skipAuth: true });
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
                  await apiClient.post<void>("/api/auth/forgot-password", { email: email.trim() }, { skipAuth: true });
                  Alert.alert("Check Your Email", "If an account exists with that email, we've sent password reset instructions.");
                } catch {
                  Alert.alert("Error", "Failed to send reset email. Please try again.");
                }
              },
            },
          ],
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

    const subscriptionData = await apiClient.get<{ status?: string } | null>("/api/subscriptions/me");
    const isSubscriptionActive =
      subscriptionData?.status === "active";

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
      <AnimatedBackground />
      <View style={styles.header}>
        <ThemedText style={{ fontSize: 17, fontWeight: "600", textAlign: "center" }}>
          {isSignUp ? "Sign Up" : "Sign In"}
        </ThemedText>
      </View>

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
                  <Feather name="zap" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.trialTextContainer}>
                  <ThemedText style={styles.trialTitle}>
                    Your Smart Kitchen Awaits
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.trialSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Create an account to get started with ChefSpAIce
                  </ThemedText>
                </View>
              </View>

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
                    testID="button-signin-apple"
                    {...webAccessibilityProps(() => handleSocialAuth("apple"))}
                    accessibilityRole="button"
                    accessibilityLabel="Sign in with Apple"
                    accessibilityState={{ disabled: authLoading }}
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
                    testID="button-signin-google"
                    {...webAccessibilityProps(() => handleSocialAuth("google"))}
                    accessibilityRole="button"
                    accessibilityLabel="Sign in with Google"
                    accessibilityState={{ disabled: authLoading }}
                  >
                    <Image
                      source={{ uri: "https://www.google.com/favicon.ico" }}
                      style={styles.authGoogleIcon}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                      transition={200}
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
                testID="input-email"
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
                textContentType="oneTimeCode"
                autoComplete="off"
                returnKeyType={isSignUp ? "next" : "done"}
                onSubmitEditing={() => {
                  if (isSignUp) {
                    confirmPasswordRef.current?.focus();
                  } else {
                    handleAuth();
                  }
                }}
                testID="input-password"
              />
              <Pressable
                accessibilityLabel="Toggle password visibility"
                accessibilityRole="button"
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
                <ThemedText testID="text-password-requirements" style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
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
                  textContentType="oneTimeCode"
                  autoComplete="off"
                  returnKeyType="done"
                  onSubmitEditing={handleAuth}
                  testID="input-confirm-password"
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
            testID="button-auth-submit"
            {...webAccessibilityProps(handleAuth)}
            accessibilityRole="button"
            accessibilityLabel={isSignUp ? "Create account" : "Sign in"}
            accessibilityState={{ disabled: authLoading }}
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
            testID="button-switch-auth-mode"
            {...webAccessibilityProps(() => { setIsSignUp(!isSignUp); setAuthError(null); })}
            accessibilityRole="button"
            accessibilityLabel={isSignUp ? "Switch to sign in" : "Switch to sign up"}
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
              testID="button-forgot-password"
              {...webAccessibilityProps(handleForgotPassword)}
              accessibilityRole="button"
              accessibilityLabel="Forgot password"
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
                testID="link-auth-privacy-policy"
                {...webAccessibilityProps(handleOpenPrivacyPolicy)}
                accessibilityRole="link"
                accessibilityLabel="Open privacy policy"
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
                testID="link-auth-terms-of-use"
                {...webAccessibilityProps(handleOpenTermsOfUse)}
                accessibilityRole="link"
                accessibilityLabel="Open terms of service"
              >
                <ThemedText
                  style={[styles.legalLink, { color: AppColors.primary }]}
                >
                  Terms of Service
                </ThemedText>
              </Pressable>
            </View>
          </View>

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
    minHeight: 40,
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
    minHeight: 32,
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
    minHeight: 44,
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
    minHeight: 50,
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
    minHeight: 50,
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
    minHeight: 50,
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
});
