import { View, Platform, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { useTheme } from "@/hooks/useTheme";

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
  const { style: themeStyle } = useTheme();
  const lc = themeStyle.landing;
  const ge = themeStyle.glassEffect;

  if (isWeb) {
    return (
      <View
        style={[
          {
            borderRadius: ge.borderRadius.lg,
            borderWidth: 1,
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
      intensity={ge.blur.regular}
      tint={themeStyle.blur.tintDefault}
      style={[{ borderRadius: ge.borderRadius.lg, overflow: "hidden" as const }, style]}
    >
      <View
        style={[
          {
            borderRadius: ge.borderRadius.lg,
            borderWidth: 1,
            padding: 20,
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
