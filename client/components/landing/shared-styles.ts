import { StyleSheet } from "react-native";

export const sharedStyles = StyleSheet.create({
  section: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.95)",
    textAlign: "center",
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    marginBottom: 40,
  },
});
