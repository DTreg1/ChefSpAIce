import { View, type ViewProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  ...otherProps
}: ThemedViewProps) {
  const { theme, style: themeStyle } = useTheme();

  const backgroundColor =
    themeStyle.colorScheme === "dark" && darkColor
      ? darkColor
      : themeStyle.colorScheme !== "dark" && lightColor
        ? lightColor
        : theme.backgroundRoot;

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
