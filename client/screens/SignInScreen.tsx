import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { storage } from "@/lib/storage";
import { Feather, FontAwesome } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { signIn, signUp, signInWithApple, signInWithGoogle, continueAsGuest, isAppleAuthAvailable, isGoogleAuthAvailable } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<"apple" | "google" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const navigateAfterAuth = async () => {
    // Check if user needs onboarding
    const needsOnboarding = await storage.needsOnboarding();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: needsOnboarding ? "Onboarding" : "Main" }],
      })
    );
  };

  const handleSubmit = async () => {
    setError(null);

    if (!email.trim()) {
      setError("Please enter an email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password.trim()) {
      setError("Please enter a password");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const result = isSignUp
        ? await signUp(email.trim(), password, displayName.trim() || undefined)
        : await signIn(email.trim(), password);

      if (result.success) {
        await navigateAfterAuth();
      } else {
        setError(result.error || "Authentication failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueAsGuest = async () => {
    continueAsGuest();
    await navigateAfterAuth();
  };

  const handleAppleSignIn = async () => {
    setError(null);
    setIsSocialLoading("apple");
    try {
      const result = await signInWithApple();
      if (result.success) {
        await navigateAfterAuth();
      } else {
        setError(result.error || "Apple sign in failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSocialLoading(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSocialLoading("google");
    try {
      const result = await signInWithGoogle();
      if (result.success) {
        await navigateAfterAuth();
      } else {
        setError(result.error || "Google sign in failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSocialLoading(null);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${AppColors.primary}15` }]}>
          <Feather name="user" size={48} color={AppColors.primary} />
        </View>
        <ThemedText type="h2" style={styles.title}>
          {isSignUp ? "Create Account" : "Welcome Back"}
        </ThemedText>
        <ThemedText type="body" style={styles.subtitle}>
          {isSignUp
            ? "Sign up to sync your data across devices"
            : "Sign in to access your synced data"}
        </ThemedText>
      </View>

      <GlassCard style={styles.formCard}>
        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: `${AppColors.error}15` }]}>
            <Feather name="alert-circle" size={16} color={AppColors.error} />
            <ThemedText type="caption" style={{ color: AppColors.error, marginLeft: Spacing.xs }}>
              {error}
            </ThemedText>
          </View>
        ) : null}

        {isSignUp ? (
          <View style={styles.inputGroup}>
            <ThemedText type="caption" style={styles.label}>
              Display Name (optional)
            </ThemedText>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="How should we call you?"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.glass.background,
                  borderColor: theme.glass.border,
                },
              ]}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <ThemedText type="caption" style={styles.label}>
            Email
          </ThemedText>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.glass.background,
                borderColor: theme.glass.border,
              },
            ]}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="caption" style={styles.label}>
            Password
          </ThemedText>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.glass.background,
                borderColor: theme.glass.border,
              },
            ]}
            secureTextEntry
            autoComplete="password"
          />
        </View>

        <Pressable
          style={[
            styles.submitButton,
            { backgroundColor: AppColors.primary },
            isLoading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <ThemedText type="body" style={styles.submitButtonText}>
              {isSignUp ? "Create Account" : "Sign In"}
            </ThemedText>
          )}
        </Pressable>

        <Pressable
          style={styles.toggleButton}
          onPress={() => {
            setIsSignUp(!isSignUp);
            setError(null);
          }}
        >
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <ThemedText type="caption" style={{ color: AppColors.primary }}>
              {isSignUp ? "Sign In" : "Sign Up"}
            </ThemedText>
          </ThemedText>
        </Pressable>
      </GlassCard>

      {(isAppleAuthAvailable || isGoogleAuthAvailable) ? (
        <>
          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { backgroundColor: theme.glass.border }]} />
            <ThemedText type="caption" style={styles.dividerText}>
              or continue with
            </ThemedText>
            <View style={[styles.divider, { backgroundColor: theme.glass.border }]} />
          </View>

          <View style={styles.socialButtonsContainer}>
            {Platform.OS === "ios" && isAppleAuthAvailable ? (
              <Pressable
                style={[
                  styles.socialButton,
                  { backgroundColor: theme.text },
                  (isLoading || isSocialLoading) && styles.submitButtonDisabled,
                ]}
                onPress={handleAppleSignIn}
                disabled={isLoading || !!isSocialLoading}
                data-testid="button-apple-signin"
              >
                {isSocialLoading === "apple" ? (
                  <ActivityIndicator color={theme.backgroundRoot} size="small" />
                ) : (
                  <>
                    <FontAwesome name="apple" size={20} color={theme.backgroundRoot} />
                    <ThemedText type="body" style={[styles.socialButtonText, { color: theme.backgroundRoot }]}>
                      Continue with Apple
                    </ThemedText>
                  </>
                )}
              </Pressable>
            ) : null}

            {Platform.OS === "android" && isGoogleAuthAvailable ? (
              <Pressable
                style={[
                  styles.socialButton,
                  { backgroundColor: "#4285F4" },
                  (isLoading || isSocialLoading) && styles.submitButtonDisabled,
                ]}
                onPress={handleGoogleSignIn}
                disabled={isLoading || !!isSocialLoading}
                data-testid="button-google-signin"
              >
                {isSocialLoading === "google" ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <FontAwesome name="google" size={18} color="#FFFFFF" />
                    <ThemedText type="body" style={[styles.socialButtonText, { color: "#FFFFFF" }]}>
                      Continue with Google
                    </ThemedText>
                  </>
                )}
              </Pressable>
            ) : null}
          </View>
        </>
      ) : null}

      <View style={styles.dividerContainer}>
        <View style={[styles.divider, { backgroundColor: theme.glass.border }]} />
        <ThemedText type="caption" style={styles.dividerText}>
          or
        </ThemedText>
        <View style={[styles.divider, { backgroundColor: theme.glass.border }]} />
      </View>

      <GlassCard contentStyle={styles.guestCard} onPress={handleContinueAsGuest}>
        <View style={styles.guestContent}>
          <View style={[styles.guestIcon, { backgroundColor: theme.glass.background }]}>
            <Feather name="user-x" size={20} color={theme.textSecondary} />
          </View>
          <View style={styles.guestText}>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Continue as Guest
            </ThemedText>
            <ThemedText type="caption">
              Use the app without syncing. You can sign in later.
            </ThemedText>
          </View>
        </View>
        <View style={styles.guestChevron}>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </GlassCard>

      <View style={styles.infoCard}>
        <Feather name="cloud" size={20} color={AppColors.primary} />
        <ThemedText type="caption" style={styles.infoText}>
          Signing in enables cloud backup and syncs your inventory, recipes, and meal plans across all your devices.
        </ThemedText>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    opacity: 0.7,
  },
  formCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xs,
    fontWeight: "500",
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  submitButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  toggleButton: {
    alignItems: "center",
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    opacity: 0.6,
  },
  socialButtonsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  socialButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  socialButtonText: {
    fontWeight: "600",
  },
  guestCard: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingHorizontal: Spacing.md,
    paddingVertical: 0,
    marginBottom: Spacing.lg,
  },
  guestContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  guestIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  guestText: {
    flex: 1,
  },
  guestChevron: {
    alignSelf: "stretch",
    justifyContent: "center",
    paddingLeft: Spacing.sm,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    opacity: 0.7,
  },
});
