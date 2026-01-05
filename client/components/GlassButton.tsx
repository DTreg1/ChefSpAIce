import React, { ReactNode } from "react";
import {
  StyleSheet,
  Pressable,
  ViewStyle,
  StyleProp,
  ActivityIndicator,
  View,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, AppColors, GlassEffect } from "@/constants/theme";

type GlassButtonVariant = "primary" | "secondary" | "outline" | "ghost";

export interface GlassButtonProps {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  variant?: GlassButtonVariant;
  loading?: boolean;
  icon?: ReactNode;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassButton({
  onPress,
  children,
  style,
  disabled = false,
  variant = "primary",
  loading = false,
  icon,
  testID,
  accessibilityLabel,
  accessibilityHint,
}: GlassButtonProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.97, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case "primary":
        return `${AppColors.primary}80`;
      case "secondary":
        return `${AppColors.secondary}80`;
      case "outline":
        return theme.glass.background;
      case "ghost":
        return theme.glass.background;
      default:
        return `${AppColors.primary}80`;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "primary":
      case "secondary":
        return "#FFFFFF";
      case "outline":
        return AppColors.primary;
      case "ghost":
        return theme.textOnGlass;
      default:
        return "#FFFFFF";
    }
  };

  const getBorderStyle = () => {
    if (variant === "outline") {
      return {
        borderWidth: 2,
        borderColor: AppColors.primary,
      };
    }
    return {
      borderWidth: GlassEffect.borderWidth,
      borderColor: theme.glass.border,
    };
  };

  const getBlurTint = () => {
    switch (variant) {
      case "primary":
      case "secondary":
        return "dark";
      default:
        return isDark ? "dark" : "light";
    }
  };

  if (Platform.OS !== "web") {
    return (
      <AnimatedPressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || (typeof children === "string" ? children : undefined)}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: disabled || loading }}
        onPress={disabled || loading ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.glassButtonWrapper,
          { opacity: disabled ? 0.5 : 1 },
          style,
          animatedStyle,
        ]}
      >
        <BlurView
          intensity={40}
          tint={getBlurTint()}
          style={[
            styles.glassButton,
            { backgroundColor: getBackgroundColor() },
            getBorderStyle(),
          ]}
        >
          {loading ? (
            <ActivityIndicator color={getTextColor()} size="small" />
          ) : (
            <View style={styles.glassButtonContent}>
              {icon}
              <ThemedText
                type="button"
                style={[
                  styles.buttonText,
                  { color: getTextColor(), marginLeft: icon ? Spacing.sm : 0 },
                ]}
              >
                {children}
              </ThemedText>
            </View>
          )}
        </BlurView>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof children === "string" ? children : undefined)}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          opacity: disabled ? 0.5 : 1,
        },
        getBorderStyle(),
        style,
        animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <View style={styles.glassButtonContent}>
          {icon}
          <ThemedText
            type="button"
            style={[
              styles.buttonText,
              { color: getTextColor(), marginLeft: icon ? Spacing.sm : 0 },
            ]}
          >
            {children}
          </ThemedText>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: Spacing.buttonHeight,
    borderRadius: GlassEffect.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
  },
  buttonText: {
    fontWeight: "600",
  },
  glassButtonWrapper: {
    height: Spacing.buttonHeight,
    borderRadius: GlassEffect.borderRadius.lg,
    overflow: "hidden",
  },
  glassButton: {
    flex: 1,
    borderRadius: GlassEffect.borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  glassButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
});
