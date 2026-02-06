import { StyleSheet, View, Platform, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/hooks/useTheme";
import { GlassColors, GlassEffect } from "@/constants/theme";

const isWeb = Platform.OS === "web";

export function GlassCard({
  children,
  style,
  testId,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  testId?: string;
}) {
  const { isDark } = useTheme();
  const glassColors = isDark ? GlassColors.dark : GlassColors.light;

  if (isWeb) {
    return (
      <View
        style={[
          styles.glassCardWeb,
          {
            backgroundColor: glassColors.background,
            borderColor: glassColors.border,
          },
          style,
        ]}
        data-testid={testId}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={GlassEffect.blur.regular}
      tint={isDark ? "dark" : "light"}
      style={[styles.glassCard, style]}
    >
      <View
        style={[
          styles.glassCardInner,
          {
            backgroundColor: glassColors.background,
            borderColor: glassColors.border,
          },
        ]}
        data-testid={testId}
      >
        {children}
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  glassCard: {
    borderRadius: GlassEffect.borderRadius.lg,
    overflow: "hidden",
  },
  glassCardWeb: {
    borderRadius: GlassEffect.borderRadius.lg,
    borderWidth: 1,
  },
  glassCardInner: {
    borderRadius: GlassEffect.borderRadius.lg,
    borderWidth: 1,
    padding: 20,
  },
});
