import { StyleSheet, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export function GradientBackground() {
  const { style } = useTheme();
  const bg = style.animatedBackground;

  return (
    <View style={styles.container}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: bg.base.web,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(to bottom right, ${bg.highlight.web}, transparent)`,
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
