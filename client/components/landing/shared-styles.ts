import { StyleSheet } from "react-native";
import { getLandingColors } from "./landing-colors";

export const sharedStyles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: "center",
  },
});

export function getLandingTextStyles(isDark: boolean) {
  const lc = getLandingColors(isDark);
  return {
    sectionTitle: {
      fontSize: 32,
      fontWeight: "700" as const,
      color: lc.textPrimary,
      textAlign: "center" as const,
      marginBottom: 12,
    },
    sectionSubtitle: {
      fontSize: 16,
      color: lc.textSecondary,
      textAlign: "center" as const,
      marginBottom: 40,
    },
  };
}
