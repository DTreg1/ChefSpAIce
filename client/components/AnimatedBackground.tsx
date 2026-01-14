import React, { useEffect, useMemo } from "react";
import { StyleSheet, Dimensions, View, Platform } from "react-native";
import { useTheme } from "@/hooks/useTheme";
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

function NativeBubble({ config }: BubbleProps) {
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

function WebBubble({ config }: BubbleProps) {
  const animationStyle = {
    animationName: 'floatUp',
    animationDuration: `${config.duration}ms`,
    animationDelay: `${config.delay}ms`,
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
  } as React.CSSProperties;

  return (
    <div
      style={{
        position: 'absolute',
        width: config.size,
        height: config.size,
        borderRadius: config.size / 2,
        left: config.startX,
        bottom: -config.size,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        opacity: config.opacity + 0.1,
        ...animationStyle,
      }}
    />
  );
}

function GradientBackground({ isDark }: { isDark: boolean }) {
  const baseColor = isDark ? LIME_950 : LIME_900;
  const highlightColor = isDark ? LIME_900 : "#4a7a25";

  return (
    <View style={[styles.gradient, { backgroundColor: baseColor }]}>
      <LinearGradient
        colors={[highlightColor, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
    </View>
  );
}

interface AnimatedBackgroundProps {
  bubbleCount?: number;
}

export function AnimatedBackground({
  bubbleCount = 15,
}: AnimatedBackgroundProps) {
  const { isDark } = useTheme();

  const bubbles = useMemo(() => {
    const configs: BubbleConfig[] = [];
    const screenWidth = Platform.OS === 'web' && typeof window !== 'undefined' 
      ? window.innerWidth 
      : SCREEN_WIDTH;
    
    for (let i = 0; i < bubbleCount; i++) {
      configs.push({
        id: i,
        size: Math.random() * 20 + 10,
        startX: Math.random() * screenWidth,
        delay: Math.random() * 5000,
        duration: Math.random() * 8000 + 10000,
        opacity: Math.random() * 0.4 + 0.2,
        wobbleAmount: Math.random() * 30 + 10,
      });
    }
    return configs;
  }, [bubbleCount]);

  if (Platform.OS === 'web') {
    return (
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        <style>
          {`
            @keyframes floatUp {
              0% {
                transform: translateY(0) translateX(0) scale(0.5);
                opacity: 0;
              }
              10% {
                opacity: 0.4;
                transform: translateY(-10vh) translateX(-10px) scale(1);
              }
              50% {
                transform: translateY(-50vh) translateX(10px) scale(1);
              }
              90% {
                opacity: 0.4;
                transform: translateY(-90vh) translateX(-10px) scale(1);
              }
              100% {
                transform: translateY(-110vh) translateX(0) scale(0.5);
                opacity: 0;
              }
            }
          `}
        </style>
        <GradientBackground isDark={isDark} />
        {bubbles.map((config) => (
          <WebBubble key={config.id} config={config} />
        ))}
      </div>
    );
  }

  return (
    <View style={[styles.container, styles.noPointerEvents]}>
      <GradientBackground isDark={isDark} />
      {bubbles.map((config) => (
        <NativeBubble key={config.id} config={config} />
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
