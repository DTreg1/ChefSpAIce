import { Text, type TextProps, Platform } from "react-native";

import { useTheme } from "@/hooks/useTheme";
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
  const { theme, isDark } = useTheme();
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

  const getTextShadow = () => {
    if (isDark) return {};
    
    return Platform.select({
      web: {
        textShadow: "0px 1px 2px rgba(0, 0, 0, 0.3)",
      },
      default: {
        textShadowColor: "rgba(0, 0, 0, 0.3)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
    });
  };

  return (
    <Text style={[{ color: getColor() }, getTypeStyle(), getTextShadow(), style]} {...rest} />
  );
}
