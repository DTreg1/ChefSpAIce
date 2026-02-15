import { StyleSheet, View, Platform, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/hooks/useTheme";
import { GlassEffect } from "@/constants/theme";
import { getLandingColors } from "./landing-colors";

const isWeb = Platform.OS === "web";

export function GlassCard({
  children,
  style,
  testId,
  accessibilityLabel,
  accessibilityRole,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  testId?: string;
  accessibilityLabel?: string;
  accessibilityRole?: "button" | "summary" | "none";
}) {
  const { isDark } = useTheme();
  const lc = getLandingColors(isDark);

  if (isWeb) {
    return (
      <View
        style={[
          styles.glassCardWeb,
          {
            backgroundColor: lc.glassBg,
            borderColor: lc.glassBorder,
          },
          style,
        ]}
        data-testid={testId}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
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
            backgroundColor: lc.glassBg,
            borderColor: lc.glassBorder,
          },
        ]}
        data-testid={testId}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
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
