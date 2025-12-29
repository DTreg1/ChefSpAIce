import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { storage } from "@/lib/storage";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const {
    signIn,
    signUp,
    signInWithApple,
    signInWithGoogle,
    isAppleAuthAvailable,
    isGoogleAuthAvailable,
  } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const handleAuth = async () => {
    if (!username.trim() || !password.trim()) {
      setAuthError("Please enter username and password");
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
        result = await signUp(username.trim(), password);
      } else {
        result = await signIn(username.trim(), password);
      }

      if (!result.success) {
        setAuthError(result.error || "Authentication failed");
        return;
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Check if user needs onboarding
      const needsOnboarding = await storage.needsOnboarding();
      
      if (isSignUp || needsOnboarding) {
        // New user or hasn't completed onboarding - go to Onboarding
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Onboarding" as never }],
          })
        );
      } else {
        // Existing user with completed onboarding - go to Main (or Pricing if no subscription)
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Main" as never }],
          })
        );
      }
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
        result = await signInWithApple();
      } else {
        result = await signInWithGoogle();
      }

      if (!result.success) {
        if (result.error !== "User cancelled") {
          setAuthError(result.error || "Authentication failed");
        }
        return;
      }

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Check if user needs onboarding
      const needsOnboarding = await storage.needsOnboarding();
      
      if (needsOnboarding) {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Onboarding" as never }],
          })
        );
      } else {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Main" as never }],
          })
        );
      }
    } catch (err) {
      console.error("Social auth error:", err);
      setAuthError("An unexpected error occurred");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.xl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image
            source={require("@assets/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText type="h1" style={styles.title}>
            ChefSpAIce
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
            Your AI-powered kitchen companion
          </ThemedText>
        </View>

        <View style={styles.formContainer}>
          <ThemedText type="h2" style={styles.formTitle}>
            {isSignUp ? "Create Account" : "Welcome Back"}
          </ThemedText>

          {authError && (
            <View style={[styles.errorContainer, { backgroundColor: `${AppColors.error}15` }]}>
              <Feather name="alert-circle" size={16} color={AppColors.error} />
              <ThemedText style={[styles.errorText, { color: AppColors.error }]}>
                {authError}
              </ThemedText>
            </View>
          )}

          <View style={styles.inputContainer}>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.glass.background, borderColor: theme.glass.border },
              ]}
            >
              <Feather name="user" size={20} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Username"
                placeholderTextColor={theme.textSecondary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                data-testid="input-username"
              />
            </View>

            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.glass.background, borderColor: theme.glass.border },
              ]}
            >
              <Feather name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={[styles.input, { color: theme.text }]}
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
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Feather name={showPassword ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
              </Pressable>
            </View>

            {isSignUp && (
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.glass.background, borderColor: theme.glass.border },
                ]}
              >
                <Feather name="lock" size={20} color={theme.textSecondary} style={styles.inputIcon} />
                <TextInput
                  ref={confirmPasswordRef}
                  style={[styles.input, { color: theme.text }]}
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
              authLoading && styles.buttonDisabled,
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
            style={styles.switchButton}
            data-testid="button-switch-auth-mode"
          >
            <ThemedText style={[styles.switchText, { color: theme.textSecondary }]}>
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
              <ThemedText style={{ color: AppColors.primary, fontWeight: "600" }}>
                {isSignUp ? "Sign In" : "Sign Up"}
              </ThemedText>
            </ThemedText>
          </Pressable>

          {(isAppleAuthAvailable || isGoogleAuthAvailable) && (
            <>
              <View style={styles.dividerContainer}>
                <View style={[styles.divider, { backgroundColor: theme.glass.border }]} />
                <ThemedText style={[styles.dividerText, { color: theme.textSecondary }]}>
                  or continue with
                </ThemedText>
                <View style={[styles.divider, { backgroundColor: theme.glass.border }]} />
              </View>

              <View style={styles.socialButtons}>
                {isAppleAuthAvailable && (
                  <Pressable
                    style={[
                      styles.socialButton,
                      { backgroundColor: theme.glass.background, borderColor: theme.glass.border },
                    ]}
                    onPress={() => handleSocialAuth("apple")}
                    disabled={authLoading}
                    data-testid="button-signin-apple"
                  >
                    <Ionicons name="logo-apple" size={24} color={theme.text} />
                    <ThemedText style={styles.socialButtonText}>Apple</ThemedText>
                  </Pressable>
                )}

                {isGoogleAuthAvailable && (
                  <Pressable
                    style={[
                      styles.socialButton,
                      { backgroundColor: theme.glass.background, borderColor: theme.glass.border },
                    ]}
                    onPress={() => handleSocialAuth("google")}
                    disabled={authLoading}
                    data-testid="button-signin-google"
                  >
                    <Image
                      source={{ uri: "https://www.google.com/favicon.ico" }}
                      style={styles.googleIcon}
                    />
                    <ThemedText style={styles.socialButtonText}>Google</ThemedText>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  inputContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: "100%",
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  authButton: {
    height: 52,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  authButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  switchButton: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  switchText: {
    fontSize: 14,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: 14,
  },
  socialButtons: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.md,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
    flex: 1,
    maxWidth: 160,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
});
