import { Text, type TextProps } from "react-native";

import { useAppTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/theme";
import { useGlassContext } from "@/contexts/GlassContext";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?:
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "body"
    | "small"
    | "caption"
    | "link"
    | "button";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "body",
  ...rest
}: ThemedTextProps) {
  const { theme, isDark } = useAppTheme();
  const { isOnGlass } = useGlassContext();

  const getColor = () => {
    if (isDark && darkColor) {
      return darkColor;
    }

    if (!isDark && lightColor) {
      return lightColor;
    }

    if (type === "link") {
      return theme.link;
    }

    if (isOnGlass) {
      if (type === "caption") {
        return theme.textSecondaryOnGlass;
      }
      return theme.textOnGlass;
    }

    if (type === "caption") {
      return theme.textSecondary;
    }

    return theme.text;
  };

  const getTypeStyle = () => {
    switch (type) {
      case "h1":
        return Typography.h1;
      case "h2":
        return Typography.h2;
      case "h3":
        return Typography.h3;
      case "h4":
        return Typography.h4;
      case "body":
        return Typography.body;
      case "small":
        return Typography.small;
      case "caption":
        return Typography.caption;
      case "link":
        return Typography.link;
      case "button":
        return Typography.button;
      default:
        return Typography.body;
    }
  };

  const getAccessibilityProps = () => {
    if (["h1", "h2", "h3", "h4"].includes(type)) {
      return {
        accessibilityRole: "header" as const,
      };
    }
    return {};
  };

  return (
    <Text
      allowFontScaling={true}
      maxFontSizeMultiplier={1.5}
      style={[{ color: getColor() }, getTypeStyle(), style]}
      {...getAccessibilityProps()}
      {...rest}
    />
  );
}
