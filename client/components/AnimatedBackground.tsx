import React, { useEffect, useMemo } from "react";
import { StyleSheet, Dimensions, View, useColorScheme } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const LIME_950 = "#1a2e05";
const LIME_900 = "#3d6b1c";

interface BubbleConfig {
  id: number;
  size: number;
  startX: number;
  delay: number;
  duration: number;
  opacity: number;
  wobbleAmount: number;
}

interface BubbleProps {
  config: BubbleConfig;
}

function Bubble({ config }: BubbleProps) {
  const progress = useSharedValue(0);
  const wobble = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(1, {
          duration: config.duration,
          easing: Easing.linear,
        }),
        -1,
        false,
      ),
    );

    wobble.value = withDelay(
      config.delay,
      withRepeat(
        withTiming(1, {
          duration: config.duration * 0.3,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      ),
    );
  }, [config.delay, config.duration, progress, wobble]);

  const animatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      progress.value,
      [0, 1],
      [SCREEN_HEIGHT + config.size, -config.size * 2],
    );

    const translateX = interpolate(
      wobble.value,
      [0, 1],
      [-config.wobbleAmount, config.wobbleAmount],
    );

    const scale = interpolate(
      progress.value,
      [0, 0.2, 0.8, 1],
      [0.3, 1, 1, 0.5],
    );

    const opacity = interpolate(
      progress.value,
      [0, 0.1, 0.8, 1],
      [0, config.opacity, config.opacity, 0],
    );

    return {
      transform: [{ translateY }, { translateX }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          left: config.startX,
        },
        animatedStyle,
      ]}
    />
  );
}

function GradientBackground({ isDark }: { isDark: boolean }) {
  const gradientColor = isDark ? LIME_900 : LIME_950;
  const transparentColor = isDark
    ? "rgba(61, 107, 28, 0)"
    : "rgba(26, 46, 5, 0)";

  return (
    <LinearGradient
      colors={[gradientColor, transparentColor]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    />
  );
}

interface AnimatedBackgroundProps {
  bubbleCount?: number;
}

export function AnimatedBackground({
  bubbleCount = 15,
}: AnimatedBackgroundProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const bubbles = useMemo(() => {
    const configs: BubbleConfig[] = [];
    for (let i = 0; i < bubbleCount; i++) {
      configs.push({
        id: i,
        size: Math.random() * 15 + 8,
        startX: Math.random() * SCREEN_WIDTH,
        delay: Math.random() * 8000,
        duration: Math.random() * 6000 + 8000,
        opacity: Math.random() * 0.3 + 0.1,
        wobbleAmount: Math.random() * 30 + 10,
      });
    }
    return configs;
  }, [bubbleCount]);

  return (
    <View style={[styles.container, styles.noPointerEvents]}>
      <GradientBackground isDark={isDark} />
      {bubbles.map((config) => (
        <Bubble key={config.id} config={config} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  noPointerEvents: {
    pointerEvents: "none",
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  bubble: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
});
