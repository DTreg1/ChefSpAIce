import { StyleSheet, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { AppColors } from "@/constants/theme";

export function GradientBackground() {
  const { isDark } = useTheme();

  const baseColor = isDark ? AppColors.backgroundBase : AppColors.backgroundHighlight;
  const highlightColor = isDark ? AppColors.backgroundHighlight : AppColors.backgroundHighlightLight;

  return (
    <View style={[styles.container, { backgroundColor: baseColor }]}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(to bottom right, ${highlightColor}, transparent)`,
        }}
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
});
