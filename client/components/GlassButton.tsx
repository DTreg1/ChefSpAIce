import React, { ReactNode, memo, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Pressable,
  ViewProps,
  ViewStyle,
  StyleProp,
  ActivityIndicator,
  View,
  Platform,
} from "react-native";

type A11yRole = ViewProps["accessibilityRole"];
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, AppColors } from "@/constants/theme";

type GlassButtonVariant = "primary" | "secondary" | "outline" | "ghost";

interface GlassButtonProps {
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
  accessibilityRole?: string;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const GlassButton = memo(function GlassButton({
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
  accessibilityRole,
}: GlassButtonProps) {
  const { style: themeStyle } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.97, springConfig);
    }
  }, [disabled, loading, scale]);

  const handlePressOut = useCallback(() => {
    if (!disabled && !loading) {
      scale.value = withSpring(1, springConfig);
    }
  }, [disabled, loading, scale]);

  const backgroundColor = useMemo(() => {
    switch (variant) {
      case "primary":
        return AppColors.primary;
      case "secondary":
        return AppColors.secondary;
      case "outline":
        return themeStyle.button.outlineBg;
      case "ghost":
        return themeStyle.button.ghostBg;
      default:
        return AppColors.primary;
    }
  }, [variant, themeStyle.button.outlineBg, themeStyle.button.ghostBg]);

  const textColor = useMemo(() => {
    switch (variant) {
      case "primary":
      case "secondary":
        return "#FFFFFF";
      case "outline":
        return themeStyle.button.outlineText;
      case "ghost":
        return themeStyle.button.ghostText;
      default:
        return "#FFFFFF";
    }
  }, [variant, themeStyle.button.outlineText, themeStyle.button.ghostText]);

  const borderStyle = useMemo(() => {
    if (variant === "outline") {
      return {
        borderWidth: 2,
        borderColor: AppColors.primary,
      };
    }
    return {
      borderWidth: themeStyle.glassEffect.borderWidth,
      borderColor: themeStyle.glass.border,
    };
  }, [variant, themeStyle.glass.border]);

  const blurTint = useMemo(() => {
    switch (variant) {
      case "primary":
      case "secondary":
        return "dark";
      default:
        return themeStyle.blur.tintDefault;
    }
  }, [variant, themeStyle.blur.tintDefault]);

  if (Platform.OS !== "web") {
    return (
      <AnimatedPressable
        testID={testID}
        accessibilityRole={(accessibilityRole as A11yRole) ?? "button"}
        accessibilityLabel={
          accessibilityLabel ||
          (typeof children === "string" ? children : undefined)
        }
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: disabled || loading }}
        onPress={disabled || loading ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.glassButtonWrapper,
          { opacity: disabled ? 0.5 : 1, borderRadius: themeStyle.glassEffect.borderRadius.lg },
          style,
          animatedStyle,
        ]}
      >
        <BlurView
          intensity={40}
          tint={blurTint}
          style={[styles.glassButton, { backgroundColor, borderRadius: themeStyle.glassEffect.borderRadius.lg }, borderStyle]}
        >
          {loading ? (
            <ActivityIndicator color={textColor} size="small" />
          ) : (
            <View style={styles.glassButtonContent}>
              {icon}
              <ThemedText
                type="button"
                style={[
                  styles.buttonText,
                  { color: textColor, marginLeft: icon ? Spacing.sm : 0 },
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
      accessibilityRole={(accessibilityRole as A11yRole) ?? "button"}
      accessibilityLabel={
        accessibilityLabel ||
        (typeof children === "string" ? children : undefined)
      }
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading }}
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor,
          opacity: disabled ? 0.5 : 1,
          borderRadius: themeStyle.glassEffect.borderRadius.lg,
        },
        borderStyle,
        style,
        animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.glassButtonContent}>
          {icon}
          <ThemedText
            type="button"
            style={[
              styles.buttonText,
              { color: textColor, marginLeft: icon ? Spacing.sm : 0 },
            ]}
          >
            {children}
          </ThemedText>
        </View>
      )}
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  button: {
    minHeight: Spacing.buttonHeight,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: Spacing.xl,
  },
  buttonText: {
    fontWeight: "600",
  },
  glassButtonWrapper: {
    minHeight: Spacing.buttonHeight,
    overflow: "hidden",
  },
  glassButton: {
    flex: 1,
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
