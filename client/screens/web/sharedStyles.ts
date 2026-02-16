import { StyleSheet } from "react-native";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";
import { webClickable } from "@/lib/types";

export const WebTypography = {
  pageTitle: {
    fontSize: 42,
    fontWeight: "700" as const,
    textAlign: "center" as const,
  },
  sectionTitle: {
    ...Typography.h3,
    fontWeight: "600" as const,
    marginBottom: Spacing.md,
  },
  subtitle: {
    ...Typography.h4,
    textAlign: "center" as const,
    marginBottom: Spacing["3xl"],
  },
  paragraph: {
    ...Typography.body,
    lineHeight: 26,
  },
  logoText: {
    ...Typography.h2,
    fontWeight: "700" as const,
  },
  navLinkText: {
    ...Typography.small,
    fontWeight: "500" as const,
  },
  lastUpdated: {
    ...Typography.small,
    textAlign: "center" as const,
    marginBottom: Spacing["3xl"],
  },
  copyright: {
    ...Typography.micro,
  },
  itemName: {
    ...Typography.h3,
    fontWeight: "600" as const,
    marginBottom: Spacing.xs,
  },
  itemDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  itemUrl: {
    ...Typography.small,
  },
  backButtonText: {
    color: "#FFFFFF",
    ...Typography.button,
  },
};

export const webSharedStyles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { minHeight: "100%" },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 20,
    paddingBottom: Spacing.md,
    alignItems: "center",
  },
  headerRow: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...webClickable,
    marginBottom: Spacing.lg,
  },
  logoContainerNoMargin: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...webClickable,
  },
  navLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xl,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  navLink: { ...webClickable },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: 60,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  contentCentered: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: 60,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
    alignItems: "center",
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  footer: {
    paddingVertical: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
    alignItems: "center",
  },
  themeToggle: {
    padding: 10,
    borderRadius: 10,
  },
});

export const NAV_LINKS = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Privacy", path: "/privacy" },
  { label: "Terms", path: "/terms" },
  { label: "Support", path: "/support" },
];
