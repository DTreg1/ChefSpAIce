import React from "react";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import { useTheme } from "@/hooks/useTheme";

export interface CookPotLoaderProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  text?: string;
  textClassName?: string;
}

const sizeMap = {
  xs: { indicator: "small" as const, fontSize: 10 },
  sm: { indicator: "small" as const, fontSize: 12 },
  md: { indicator: "large" as const, fontSize: 14 },
  lg: { indicator: "large" as const, fontSize: 16 },
  xl: { indicator: "large" as const, fontSize: 18 },
};

export function CookPotLoader({
  size = "md",
  text,
}: CookPotLoaderProps) {
  const { theme } = useTheme();
  const dimensions = sizeMap[size];

  return (
    <View style={styles.container} accessibilityLiveRegion="polite" accessibilityLabel={text || "Loading"}>
      <ActivityIndicator
        size={dimensions.indicator}
        color={theme.primary || "#65a30d"}
      />
      {text ? (
        <Text
          style={[
            styles.text,
            { color: theme.text, fontSize: dimensions.fontSize },
          ]}
        >
          {text}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    marginTop: 8,
    textAlign: "center",
  },
});

export default CookPotLoader;
