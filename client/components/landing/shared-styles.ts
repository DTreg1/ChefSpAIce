import { StyleSheet } from "react-native";
import type { StyleDefinition } from "@/constants/styleDefinition";

export const sharedStyles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: "center",
  },
});

export function getLandingTextStyles(landing: StyleDefinition['landing']) {
  return {
    sectionTitle: {
      fontSize: 32,
      fontWeight: "700" as const,
      color: landing.textPrimary,
      textAlign: "center" as const,
      marginBottom: 12,
    },
    sectionSubtitle: {
      fontSize: 16,
      color: landing.textSecondary,
      textAlign: "center" as const,
      marginBottom: 40,
    },
  };
}
