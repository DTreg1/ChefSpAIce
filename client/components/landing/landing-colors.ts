export function getLandingColors(isDark: boolean) {
  return {
    // Text colors
    textPrimary: isDark ? "rgba(255, 255, 255, 0.95)" : "rgba(20, 50, 20, 0.92)",
    textSecondary: isDark ? "rgba(255, 255, 255, 0.9)" : "rgba(20, 50, 20, 0.78)",
    textMuted: isDark ? "rgba(255, 255, 255, 0.8)" : "rgba(20, 50, 20, 0.6)",
    textHint: isDark ? "rgba(255, 255, 255, 0.7)" : "rgba(20, 50, 20, 0.5)",

    // Glass card colors
    glassBg: isDark ? "rgba(0, 0, 0, 0.45)" : "rgba(255, 255, 255, 0.75)",
    glassBorder: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 50, 0, 0.15)",

    // Icon colors
    iconColor: isDark ? "rgba(255, 255, 255, 0.8)" : "rgba(20, 80, 20, 0.75)",

    // Border/divider colors
    borderSubtle: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 50, 0, 0.1)",
    borderMedium: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 50, 0, 0.18)",
    borderStrong: isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 50, 0, 0.25)",

    // Surface colors (for buttons, badges, toggles on the landing page)
    surfaceSubtle: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 50, 0, 0.06)",
    surfaceMedium: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 50, 0, 0.08)",

    // Footer
    footerBg: isDark ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 50, 0, 0.08)",
    footerDivider: isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(20, 50, 20, 0.3)",

    // Icon background tint (for benefit/feature icon containers)
    iconBgTint: isDark ? "rgba(39, 174, 96, 0.15)" : "rgba(39, 174, 96, 0.12)",

    // Tagline badge
    taglineBg: isDark ? "rgba(39, 174, 96, 0.15)" : "rgba(39, 174, 96, 0.12)",
    taglineBorder: isDark ? "rgba(39, 174, 96, 0.3)" : "rgba(39, 174, 96, 0.25)",

    // Leaf/tag icon color
    taglineIcon: isDark ? "#FFFFFF" : "#1a5c1a",
  };
}

export type LandingColors = ReturnType<typeof getLandingColors>;

export const LandingBackgrounds = {
  dark: {
    gradient: [
      "oklch(24% 0.06 132)",
      "oklch(27.4% 0.072 132.109)",
      "oklch(21% 0.055 132)",
    ] as const,
    animated: {
      base: "oklch(27.4% 0.072 132.109)",
      highlight: "oklch(32% 0.08 132)",
    },
  },
  light: {
    gradient: [
      "oklch(92.5% 0.084 155.995)",
      "oklch(90% 0.075 155)",
      "oklch(94% 0.07 155)",
    ] as const,
    animated: {
      base: "oklch(92.5% 0.084 155.995)",
      highlight: "oklch(88% 0.065 155)",
    },
  },
};
