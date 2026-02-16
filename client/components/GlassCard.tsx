import React from "react";
import {
  StyleSheet,
  Pressable,
  View,
  ViewProps,
  ViewStyle,
  Platform,
  StyleProp,
} from "react-native";
import { GlassView, isLiquidGlassAvailable } from "@/lib/glass-effect-safe";

type A11yRole = ViewProps["accessibilityRole"];

/*
 * ============================================
 * EXPO-GLASS-EFFECT OPTIONS REFERENCE
 * ============================================
 *
 * GlassView Props:
 * ----------------
 * glassEffectStyle?: "clear" | "regular"
 *   - "clear": More transparent, subtle glass effect
 *   - "regular": Standard frosted glass effect (default)
 *
 * tintColor?: string
 *   - Any valid color string (e.g., "#FF0000", "rgba(255,0,0,0.5)", "red")
 *   - Applies a color tint to the glass effect
 *
 * isInteractive?: boolean
 *   - false (default): Static glass effect
 *   - true: Glass responds to user interactions
 *
 * style?: ViewStyle
 *   - All standard React Native View styles apply (see below)
 *
 * GlassContainer Props (for grouping glass elements):
 * ---------------------------------------------------
 * spacing?: number
 *   - Controls the distance at which glass elements start merging together
 *
 * ============================================
 * COMMON VIEW STYLES FOR GLASS ELEMENTS
 * ============================================
 *
 * DIMENSIONS:
 *   width, height, minWidth, maxWidth, minHeight, maxHeight, aspectRatio
 *
 * SPACING:
 *   padding, paddingTop/Bottom/Left/Right, paddingHorizontal/Vertical
 *   margin, marginTop/Bottom/Left/Right, marginHorizontal/Vertical
 *
 * LAYOUT:
 *   flex, flexDirection, justifyContent, alignItems, alignSelf
 *   flexWrap, flexGrow, flexShrink, gap
 *
 * POSITIONING:
 *   position ("relative" | "absolute"), top, bottom, left, right, zIndex
 *
 * BORDERS:
 *   borderRadius (all corners), borderTopLeftRadius, etc.
 *   borderWidth, borderColor, borderStyle
 *
 * BACKGROUND:
 *   backgroundColor, opacity
 *
 * SHADOWS (iOS):
 *   shadowColor, shadowOffset, shadowOpacity, shadowRadius
 *
 * SHADOWS (Android):
 *   elevation
 *
 * TRANSFORMS:
 *   transform: [{ scale: 1.5 }, { rotate: "45deg" }, { translateX: 10 }]
 *
 * OVERFLOW:
 *   overflow: "visible" | "hidden" | "scroll"
 *
 * ============================================
 * USAGE EXAMPLES:
 * ============================================
 *
 * <GlassView
 *   glassEffectStyle="regular"    // or "clear"
 *   tintColor="#5E8C3A"           // optional color tint
 *   isInteractive={false}          // optional interaction
 *   style={{
 *     borderRadius: 16,
 *     padding: 20,
 *     margin: 10,
 *   }}
 * >
 *   {children}
 * </GlassView>
 *
 * <GlassContainer spacing={10}>
 *   <GlassView>...</GlassView>
 *   <GlassView>...</GlassView>
 * </GlassContainer>
 *
 */
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { GlassProvider } from "@/contexts/GlassContext";

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
  accessibilityRole?: string;
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
  accessibilityRole,
}: GlassCardProps) {
  const { isDark, style: themeStyle } = useTheme();
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

  const glassRadius = themeStyle.glassEffect.borderRadius.lg;

  const glassStyles = {
    borderColor: themeStyle.glass.border,
    borderWidth: useLiquidGlass ? 0 : themeStyle.glassEffect.borderWidth,
  };

  const textBackingColor = isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.8)";

  const content = (
    <GlassProvider>
      <View style={[styles.content, { backgroundColor: textBackingColor, borderRadius: glassRadius }, contentStyle]}>
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
    </GlassProvider>
  );

  const renderGlassContent = () => {
    if (Platform.OS === "web") {
      return (
        <View
          testID={testID}
          accessibilityRole={accessibilityRole as A11yRole}
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={accessibilityHint}
          style={[
            styles.card,
            styles.webGlass,
            {
              backgroundColor: themeStyle.glass.background,
              borderColor: themeStyle.glass.border,
              borderRadius: glassRadius,
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
          accessibilityRole={accessibilityRole as A11yRole}
          accessibilityLabel={accessibilityLabel}
          glassEffectStyle={glassEffectStyle}
          style={[styles.card, { borderRadius: glassRadius }, style]}
        >
          {content}
        </GlassView>
      );
    }

    return (
      <View testID={testID} accessibilityRole={accessibilityRole as A11yRole} accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint}>
        <BlurView
          intensity={blurIntensity}
          tint={glassTint}
          style={[styles.card, { borderRadius: glassRadius }, glassStyles, style]}
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
        accessibilityRole={(accessibilityRole as A11yRole) ?? "button"}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.card,
          styles.webGlass,
          {
            backgroundColor: themeStyle.glass.background,
            borderColor: themeStyle.glass.border,
            borderRadius: glassRadius,
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
        accessibilityRole={(accessibilityRole as A11yRole) ?? "button"}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle]}
      >
        <GlassView
          glassEffectStyle={glassEffectStyle}
          style={[styles.card, { borderRadius: glassRadius }, style]}
        >
          {content}
        </GlassView>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      testID={testID}
      accessibilityRole={(accessibilityRole as A11yRole) ?? "button"}
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
        style={[styles.card, { borderRadius: glassRadius }, glassStyles, style]}
      >
        <View style={styles.glassOverlay}>{content}</View>
      </BlurView>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
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
      } as Record<string, string>,
    }),
  },
  cardTitle: {
    marginBottom: Spacing.sm,
  },
  cardDescription: {},
});
