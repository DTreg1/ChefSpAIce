import React from "react";
import {
  StyleSheet,
  Pressable,
  View,
  ViewStyle,
  Platform,
  StyleProp,
} from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, GlassEffect } from "@/constants/theme";

interface GlassCardProps {
  intensity?: "subtle" | "regular" | "strong";
  title?: string;
  description?: string;
  children?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  tint?: "light" | "dark" | "default";
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

const getBlurIntensity = (
  intensity: "subtle" | "regular" | "strong",
): number => {
  switch (intensity) {
    case "subtle":
      return 20;
    case "regular":
      return 40;
    case "strong":
      return 60;
    default:
      return 40;
  }
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassCard({
  intensity = "regular",
  title,
  description,
  children,
  onPress,
  style,
  contentStyle,
  tint = "default",
  testID,
  accessibilityLabel,
  accessibilityHint,
}: GlassCardProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const blurIntensity = getBlurIntensity(intensity);
  const glassTint = tint === "default" ? (isDark ? "dark" : "light") : tint;
  const useLiquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();
  const glassEffectStyle = intensity === "subtle" ? "clear" : "regular";

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const glassStyles = {
    borderColor: theme.glass.border,
    borderWidth: useLiquidGlass ? 0 : GlassEffect.borderWidth,
  };

  const content = (
    <View style={[styles.content, contentStyle]}>
      {title ? (
        <ThemedText type="h4" style={styles.cardTitle}>
          {title}
        </ThemedText>
      ) : null}
      {description ? (
        <ThemedText type="small" style={styles.cardDescription}>
          {description}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );

  const renderGlassContent = () => {
    if (Platform.OS === "web") {
      return (
        <View
          testID={testID}
          style={[
            styles.card,
            styles.webGlass,
            {
              backgroundColor: theme.glass.background,
              borderColor: theme.glass.border,
            },
            style,
          ]}
        >
          {content}
        </View>
      );
    }

    if (useLiquidGlass) {
      return (
        <GlassView
          testID={testID}
          glassEffectStyle={glassEffectStyle}
          style={[styles.card, style]}
        >
          {content}
        </GlassView>
      );
    }

    return (
      <View testID={testID}>
        <BlurView
          intensity={blurIntensity}
          tint={glassTint}
          style={[styles.card, glassStyles, style]}
        >
          <View style={styles.glassOverlay}>{content}</View>
        </BlurView>
      </View>
    );
  };

  if (!onPress) {
    return renderGlassContent();
  }

  if (Platform.OS === "web") {
    return (
      <AnimatedPressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          styles.webGlass,
          {
            backgroundColor: theme.glass.background,
            borderColor: theme.glass.border,
          },
          animatedStyle,
          style,
        ]}
      >
        {content}
      </AnimatedPressable>
    );
  }

  if (useLiquidGlass) {
    return (
      <AnimatedPressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle]}
      >
        <GlassView
          glassEffectStyle={glassEffectStyle}
          style={[styles.card, style]}
        >
          {content}
        </GlassView>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle]}
    >
      <BlurView
        intensity={blurIntensity}
        tint={glassTint}
        style={[styles.card, glassStyles, style]}
      >
        <View style={styles.glassOverlay}>{content}</View>
      </BlurView>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: GlassEffect.borderRadius.lg,
    overflow: "hidden",
  },
  content: {
    padding: Spacing.lg,
  },
  glassOverlay: {
    flex: 1,
  },
  webGlass: {
    borderWidth: 1,
    ...Platform.select({
      web: {
        backdropFilter: "blur(10px) saturate(180%)",
        WebkitBackdropFilter: "blur(10px) saturate(180%)",
      } as any,
    }),
  },
  cardTitle: {
    marginBottom: Spacing.sm,
  },
  cardDescription: {},
});
