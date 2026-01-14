import { StyleSheet, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { LinearGradient } from "expo-linear-gradient";

const LIME_950 = "#1a2e05";
const LIME_900 = "#3d6b1c";

interface AnimatedBackgroundProps {
  bubbleCount?: number;
}

/**
 * Web version of AnimatedBackground
 * Uses CSS gradients instead of react-native-reanimated animations
 * to avoid Worklets compatibility issues on web platform.
 */
export function AnimatedBackground({
  bubbleCount: _bubbleCount = 15,
}: AnimatedBackgroundProps) {
  const { isDark } = useTheme();
  
  const baseColor = isDark ? LIME_950 : LIME_900;
  const highlightColor = isDark ? LIME_900 : "#4a7a25";

  return (
    <View style={[styles.container, { backgroundColor: baseColor }]}>
      <LinearGradient
        colors={[highlightColor, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    pointerEvents: "none",
  },
  gradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
