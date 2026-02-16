import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  useReducedMotion,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { AppColors, BorderRadius, Spacing } from "@/constants/theme";

type BadgeSize = "small" | "medium" | "large";

interface ExpiryBadgeProps {
  daysUntilExpiry: number;
  size?: BadgeSize;
}

const COLORS = {
  urgent: AppColors.expiryUrgent,
  warning: AppColors.expiryWarning,
  caution: AppColors.expiryCaution,
  soon: AppColors.expirySoon,
  neutral: AppColors.expiryNeutral,
};

const TEXT_COLORS = {
  urgent: AppColors.expiryTextLight,
  warning: AppColors.expiryTextLight,
  caution: AppColors.expiryTextLight,
  soon: AppColors.expiryTextSoon,
  neutral: AppColors.expiryTextNeutral,
};

function getColorKey(days: number): keyof typeof COLORS {
  if (days < 0) return "urgent";
  if (days <= 1) return "urgent";
  if (days <= 3) return "warning";
  if (days <= 5) return "caution";
  if (days <= 7) return "soon";
  return "neutral";
}

function getDisplayText(days: number): string {
  if (days < 0) return "Expired";
  if (days === 0) return "Today!";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

function getAccessibilityLabel(days: number): string {
  if (days < -1) return `Expired ${Math.abs(days)} days ago`;
  if (days === -1) return "Expired 1 day ago";
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

function getSizeStyles(size: BadgeSize) {
  switch (size) {
    case "small":
      return {
        paddingHorizontal: Spacing.xs,
        paddingVertical: 2,
        iconSize: 10,
        gap: 2,
        textType: "caption" as const,
      };
    case "medium":
      return {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        iconSize: 12,
        gap: Spacing.xs,
        textType: "small" as const,
      };
    case "large":
      return {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        iconSize: 16,
        gap: Spacing.sm,
        textType: "body" as const,
      };
  }
}

export function ExpiryBadge({
  daysUntilExpiry,
  size = "medium",
}: ExpiryBadgeProps) {
  const colorKey = getColorKey(daysUntilExpiry);
  const backgroundColor = COLORS[colorKey];
  const textColor = TEXT_COLORS[colorKey];
  const displayText = getDisplayText(daysUntilExpiry);
  const sizeStyles = getSizeStyles(size);
  const isUrgent = daysUntilExpiry <= 1;

  const reduceMotion = useReducedMotion();
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (isUrgent && !reduceMotion) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        true,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
        true,
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = 1;
      pulseOpacity.value = 1;
    }

    return () => {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
    };
  }, [isUrgent, reduceMotion, pulseScale, pulseOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const iconName: keyof typeof Feather.glyphMap = isUrgent
    ? "alert-triangle"
    : daysUntilExpiry <= 3
      ? "alert-circle"
      : "clock";

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          backgroundColor,
          paddingHorizontal: sizeStyles.paddingHorizontal,
          paddingVertical: sizeStyles.paddingVertical,
          gap: sizeStyles.gap,
        },
        animatedStyle,
      ]}
      accessibilityRole="text"
      accessibilityLabel={getAccessibilityLabel(daysUntilExpiry)}
    >
      <Feather name={iconName} size={sizeStyles.iconSize} color={textColor} />
      <ThemedText
        type={sizeStyles.textType}
        style={[styles.text, { color: textColor }]}
        numberOfLines={1}
      >
        {displayText}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.full,
  },
  text: {
    fontWeight: "600",
  },
});
