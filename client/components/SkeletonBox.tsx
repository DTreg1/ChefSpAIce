import { View } from "react-native";
import Animated, { useAnimatedStyle, withRepeat, withTiming, useSharedValue, useReducedMotion } from "react-native-reanimated";
import { useEffect } from "react";
import { useTheme } from "@/hooks/useTheme";

interface SkeletonBoxProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
}

export function SkeletonBox({ width, height, borderRadius = 8, style }: SkeletonBoxProps) {
  const { theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (!reduceMotion) {
      opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
    }
  }, [reduceMotion]);

  if (reduceMotion) {
    return (
      <View
        style={[
          { width: width as import("react-native").DimensionValue, height, borderRadius, backgroundColor: theme.glass.border, opacity: 0.5 },
          style,
        ]}
      />
    );
  }

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width: width as import("react-native").DimensionValue, height, borderRadius, backgroundColor: theme.glass.border },
        animatedStyle,
        style,
      ]}
    />
  );
}
