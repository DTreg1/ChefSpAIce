import React, { useEffect } from "react";
import { View, StyleSheet, Text } from "react-native";
import Svg, { Rect, Path, Circle, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface CookPotLoaderProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  text?: string;
  textClassName?: string;
}

const sizeMap = {
  xs: { container: 48, svg: 48, fontSize: 10 },
  sm: { container: 64, svg: 64, fontSize: 12 },
  md: { container: 96, svg: 96, fontSize: 14 },
  lg: { container: 128, svg: 128, fontSize: 16 },
  xl: { container: 160, svg: 160, fontSize: 18 },
};

export function CookPotLoader({
  size = "md",
  text = "Prepping the Kitchen",
}: CookPotLoaderProps) {
  const { theme, isDark } = useTheme();
  const dimensions = sizeMap[size];

  // Animation values for bubbles
  const bubble1 = useSharedValue(0);
  const bubble2 = useSharedValue(0);
  const bubble3 = useSharedValue(0);

  // Animation values for steam clouds
  const steam1 = useSharedValue(0);
  const steam2 = useSharedValue(0);
  const steam3 = useSharedValue(0);

  useEffect(() => {
    // Bubble animations
    bubble1.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    bubble2.value = withDelay(
      200,
      withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
    bubble3.value = withDelay(
      400,
      withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );

    // Steam animations
    steam1.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    steam2.value = withDelay(
      300,
      withRepeat(
        withTiming(1, { duration: 2700, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
    steam3.value = withDelay(
      600,
      withRepeat(
        withTiming(1, { duration: 3300, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, [bubble1, bubble2, bubble3, steam1, steam2, steam3]);

  // Animated props for bubbles
  const bubble1Props = useAnimatedProps(() => ({
    cy: interpolate(bubble1.value, [0, 1], [80, 60]),
  }));

  const bubble2Props = useAnimatedProps(() => ({
    cy: interpolate(bubble2.value, [0, 1], [85, 65]),
  }));

  const bubble3Props = useAnimatedProps(() => ({
    cy: interpolate(bubble3.value, [0, 1], [75, 55]),
  }));

  // Animated props for steam clouds
  const steam1Props = useAnimatedProps(() => ({
    cy: interpolate(steam1.value, [0, 1], [12, 8]),
    r: interpolate(steam1.value, [0, 1], [8, 10]),
  }));

  const steam2Props = useAnimatedProps(() => ({
    cy: interpolate(steam2.value, [0, 1], [5, 0]),
    r: interpolate(steam2.value, [0, 1], [10, 12]),
  }));

  const steam3Props = useAnimatedProps(() => ({
    cy: interpolate(steam3.value, [0, 1], [12, 8]),
    r: interpolate(steam3.value, [0, 1], [8, 10]),
  }));

  // Colors based on theme
  const potFill = isDark
    ? "rgba(101, 163, 13, 0.2)"
    : "rgba(101, 163, 13, 0.15)";
  const potStroke = isDark ? "#84cc16" : "#65a30d";
  const lidFill = isDark ? "#a3e635" : "#84cc16";
  const steamFill = isDark
    ? "rgba(101, 163, 13, 0.4)"
    : "rgba(101, 163, 13, 0.3)";
  const bubbleFill = isDark
    ? "rgba(163, 230, 53, 0.7)"
    : "rgba(132, 204, 22, 0.7)";
  const textColor = theme.text;

  return (
    <View style={styles.container} accessibilityLiveRegion="polite" accessibilityLabel={text}>
      <View
        style={{ width: dimensions.container, height: dimensions.container }}
      >
        <Svg
          viewBox="0 0 100 100"
          width={dimensions.svg}
          height={dimensions.svg}
          style={{ overflow: "visible" }}
        >
          {/* Pot Body */}
          <Rect
            x="10"
            y="50"
            width="80"
            height="50"
            rx="10"
            fill={potFill}
            stroke={potStroke}
            strokeWidth="4"
          />

          {/* Water line */}
          <Path
            d="M15 70 L85 70"
            stroke="#507f45"
            strokeWidth="2"
            strokeOpacity="0.3"
            fill="none"
          />

          {/* Pot rim */}
          <Path
            d="M10 55 L90 55"
            stroke="#707070"
            strokeWidth="2"
            strokeOpacity="0.7"
            fill="none"
          />

          {/* Left Handle */}
          <Path
            d="M5 70 Q0 70 0 60 Q0 50 5 50"
            stroke={potStroke}
            strokeWidth="4"
            fill="none"
          />

          {/* Right Handle */}
          <Path
            d="M95 70 Q100 70 100 60 Q100 50 95 50"
            stroke={potStroke}
            strokeWidth="4"
            fill="none"
          />

          {/* Pot Lid */}
          <Rect x="20" y="40" width="60" height="10" rx="5" fill={lidFill} />
          <Circle cx="50" cy="40" r="7" fill={lidFill} />

          {/* Steam Clouds - Animated */}
          <G>
            <AnimatedCircle
              cx="30"
              animatedProps={steam1Props}
              fill={steamFill}
            />
            <AnimatedCircle
              cx="50"
              animatedProps={steam2Props}
              fill={steamFill}
            />
            <AnimatedCircle
              cx="70"
              animatedProps={steam3Props}
              fill={steamFill}
            />
          </G>

          {/* Bubbles - Animated */}
          <G>
            <AnimatedCircle
              cx="30"
              r="4"
              animatedProps={bubble1Props}
              fill={bubbleFill}
            />
            <AnimatedCircle
              cx="50"
              r="3"
              animatedProps={bubble2Props}
              fill={bubbleFill}
            />
            <AnimatedCircle
              cx="70"
              r="5"
              animatedProps={bubble3Props}
              fill={bubbleFill}
            />
          </G>
        </Svg>
      </View>

      <Text
        style={[
          styles.text,
          { color: textColor, fontSize: dimensions.fontSize },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    marginTop: 8,
    textAlign: "center",
  },
});

export default CookPotLoader;
