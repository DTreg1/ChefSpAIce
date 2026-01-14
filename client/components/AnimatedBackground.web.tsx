import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { LinearGradient } from "expo-linear-gradient";

const LIME_950 = "#1a2e05";
const LIME_900 = "#3d6b1c";

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
  bubbleCount: _bubbleCount = 15,
}: AnimatedBackgroundProps) {
  const { isDark } = useTheme();

  return (
    <View style={[styles.container, styles.noPointerEvents]}>
      <GradientBackground isDark={isDark} />
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
});
