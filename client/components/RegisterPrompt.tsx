/**
 * =============================================================================
 * REGISTER PROMPT
 * =============================================================================
 *
 * A dismissible banner encouraging guest users to register.
 * Shows benefits of registration and provides quick access to sign up.
 *
 * FEATURES:
 * - Dismissible for 24 hours (configurable)
 * - Shows only for guest users
 * - Clear messaging about benefits
 * - Non-intrusive design
 *
 * @module components/RegisterPrompt
 */

import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { GlassButton } from "@/components/GlassButton";
import { logger } from "@/lib/logger";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { storage } from "@/lib/storage";
import { BorderRadius, Spacing, AppColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

interface RegisterPromptProps {
  variant?: "banner" | "card";
  showInSettings?: boolean;
  dismissHours?: number;
}

export function RegisterPrompt({
  variant = "banner",
  showInSettings = false,
  dismissHours = 24,
}: RegisterPromptProps) {
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isAuthenticated } = useAuth();
  const { isTrialing, daysRemaining } = useTrialStatus();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkShouldShow = useCallback(async () => {
    if (isAuthenticated) {
      setIsVisible(false);
      setIsLoading(false);
      return;
    }

    if (showInSettings) {
      setIsVisible(true);
      setIsLoading(false);
      return;
    }

    try {
      const shouldShow = await storage.shouldShowRegisterPrompt(dismissHours);
      setIsVisible(shouldShow);
    } catch (error) {
      logger.error("[RegisterPrompt] Error checking visibility:", error);
      setIsVisible(false);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, dismissHours, showInSettings]);

  useEffect(() => {
    checkShouldShow();
  }, [checkShouldShow]);

  const handleDismiss = useCallback(async () => {
    setIsVisible(false);
    if (!showInSettings) {
      try {
        await storage.setRegisterPromptDismissedAt(new Date().toISOString());
      } catch (error) {
        logger.error("[RegisterPrompt] Error saving dismissal:", error);
      }
    }
  }, [showInSettings]);

  const handleRegister = useCallback(() => {
    navigation.navigate("Auth");
  }, [navigation]);

  if (isLoading || !isVisible || isAuthenticated) {
    return null;
  }

  const trialMessage =
    isTrialing && daysRemaining > 0
      ? `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left in your trial`
      : null;

  if (variant === "card" || showInSettings) {
    return (
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={[
          styles.cardContainer,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: AppColors.primary + "40",
          },
        ]}
        data-testid="card-register-prompt"
      >
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: AppColors.primary + "20" },
            ]}
          >
            <Feather name="user-plus" size={20} color={AppColors.primary} />
          </View>
          <Pressable
            onPress={handleDismiss}
            style={styles.dismissButton}
            hitSlop={12}
            data-testid="button-dismiss-register-prompt"
            accessibilityLabel="Dismiss prompt"
          >
            <Feather name="x" size={18} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ThemedText style={styles.cardTitle}>
          Create a Free Account
        </ThemedText>
        <ThemedText style={[styles.cardDescription, { color: theme.textSecondary }]}>
          Sync your data across devices and never lose your recipes, inventory,
          or meal plans.
        </ThemedText>

        {trialMessage && (
          <View
            style={[
              styles.trialBadge,
              { backgroundColor: AppColors.warning + "20" },
            ]}
          >
            <Feather name="clock" size={14} color={AppColors.warning} />
            <ThemedText
              style={[styles.trialBadgeText, { color: AppColors.warning }]}
            >
              {trialMessage}
            </ThemedText>
          </View>
        )}

        <ThemedText
          style={[styles.optionalNote, { color: theme.textSecondary }]}
        >
          Registration is optional during your trial
        </ThemedText>

        <View style={styles.cardButtons}>
          <GlassButton
            onPress={handleRegister}
            variant="primary"
            style={styles.registerButton}
            testID="button-register-from-prompt"
          >
            Sign Up
          </GlassButton>
          <GlassButton
            onPress={handleDismiss}
            variant="secondary"
            style={styles.laterButton}
            testID="button-later-register"
          >
            Maybe Later
          </GlassButton>
        </View>
      </Animated.View>
    );
  }

  const bannerTrialText =
    isTrialing && daysRemaining > 0
      ? `${daysRemaining}d left`
      : null;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={[
        styles.bannerContainer,
        { backgroundColor: AppColors.primary + "15" },
      ]}
      data-testid="banner-register-prompt"
    >
      <View style={styles.bannerContent}>
        <Feather name="cloud" size={18} color={AppColors.primary} />
        <View style={styles.bannerTextContainer}>
          <ThemedText style={styles.bannerText}>
            Sign up to sync your data (optional)
          </ThemedText>
          {bannerTrialText && (
            <ThemedText
              style={[styles.bannerTrialText, { color: theme.textSecondary }]}
            >
              {bannerTrialText} in trial
            </ThemedText>
          )}
        </View>
      </View>
      <View style={styles.bannerActions}>
        <Pressable
          onPress={handleRegister}
          style={[
            styles.bannerButton,
            { backgroundColor: AppColors.primary },
          ]}
          data-testid="button-register-banner"
        >
          <ThemedText style={styles.bannerButtonText}>Register</ThemedText>
        </Pressable>
        <Pressable
          onPress={handleDismiss}
          style={styles.bannerDismiss}
          hitSlop={8}
          data-testid="button-dismiss-banner"
          accessibilityLabel="Dismiss prompt"
        >
          <Feather name="x" size={16} color={theme.textSecondary} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: "500",
  },
  bannerTrialText: {
    fontSize: 11,
    marginTop: 2,
  },
  bannerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  bannerButton: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  bannerButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  bannerDismiss: {
    padding: 4,
  },
  cardContainer: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  dismissButton: {
    padding: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  trialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignSelf: "flex-start",
    marginBottom: Spacing.sm,
  },
  trialBadgeText: {
    fontSize: 13,
    fontWeight: "500",
  },
  optionalNote: {
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: Spacing.md,
  },
  cardButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  registerButton: {
    flex: 1,
  },
  laterButton: {
    flex: 1,
  },
});
