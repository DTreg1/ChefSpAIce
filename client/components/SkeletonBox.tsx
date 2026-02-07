import Animated, { useAnimatedStyle, withRepeat, withTiming, useSharedValue } from "react-native-reanimated";
import { useEffect } from "react";
import { useAppTheme } from "@/hooks/useTheme";

interface SkeletonBoxProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonBox({ width, height, borderRadius = 8, style }: SkeletonBoxProps) {
  const { theme } = useAppTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: theme.glass.border },
        animatedStyle,
        style,
      ]}
    />
  );
}
