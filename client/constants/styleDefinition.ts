export interface StyleDefinition {
  name: string;
  glass: {
    background: string;
    backgroundStrong: string;
    backgroundSubtle: string;
    border: string;
    borderStrong: string;
    borderSubtle: string;
    overlay: string;
    shadowColor: string;
    insetHighlight: string;
  };
  glassEffect: {
    blur: { subtle: number; regular: number; strong: number; intense: number };
    saturation: number;
    borderWidth: number;
    borderRadius: { sm: number; md: number; lg: number; xl: number; pill: number };
  };
  landing: {
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textHint: string;
    glassBg: string;
    glassBorder: string;
    iconColor: string;
    borderSubtle: string;
    borderMedium: string;
    borderStrong: string;
    surfaceSubtle: string;
    surfaceMedium: string;
    footerBg: string;
    footerDivider: string;
    iconBgTint: string;
    taglineBg: string;
    taglineBorder: string;
    taglineIcon: string;
    backgrounds: {
      gradient: { web: readonly string[]; native: readonly string[] };
      animated: {
        base: { web: string; native: string };
        highlight: { web: string; native: string };
      };
    };
  };
  webInfo: {
    card: string;
    cardBorder: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    footerBg: string;
    iconLight: string;
    brandGreen: string;
  };
  animatedBackground: {
    base: { web: string; native: string };
    highlight: { web: string; native: string };
    bubbleBg: string;
    bubbleBorder: string;
  };
  animatedScreens: readonly string[];
}

export function getGlassStyle(isDark: boolean): StyleDefinition {
  return {
    name: "glass",

    glass: isDark
      ? {
          background: "rgba(0, 0, 0, 0.45)",
          backgroundStrong: "rgba(0, 0, 0, 0.55)",
          backgroundSubtle: "rgba(0, 0, 0, 0.3)",
          border: "rgba(255, 255, 255, 0.15)",
          borderStrong: "rgba(255, 255, 255, 0.25)",
          borderSubtle: "rgba(255, 255, 255, 0.08)",
          overlay: "rgba(0, 0, 0, 0.15)",
          shadowColor: "rgba(0, 0, 0, 0.4)",
          insetHighlight: "rgba(255, 255, 255, 0.1)",
        }
      : {
          background: "rgba(255, 255, 255, 0.75)",
          backgroundStrong: "rgba(255, 255, 255, 0.9)",
          backgroundSubtle: "rgba(255, 255, 255, 0.6)",
          border: "rgba(160, 165, 175, 0.5)",
          borderStrong: "rgba(140, 145, 155, 0.7)",
          borderSubtle: "rgba(180, 185, 195, 0.4)",
          overlay: "rgba(255, 255, 255, 0.4)",
          shadowColor: "rgba(31, 38, 135, 0.15)",
          insetHighlight: "rgba(255, 255, 255, 0.5)",
        },

    glassEffect: {
      blur: { subtle: 4, regular: 6, strong: 10, intense: 20 },
      saturation: 180,
      borderWidth: 1,
      borderRadius: { sm: 12, md: 16, lg: 20, xl: 24, pill: 32 },
    },

    landing: {
      textPrimary: isDark ? "rgba(255, 255, 255, 0.95)" : "rgba(20, 50, 20, 0.92)",
      textSecondary: isDark ? "rgba(255, 255, 255, 0.9)" : "rgba(20, 50, 20, 0.78)",
      textMuted: isDark ? "rgba(255, 255, 255, 0.8)" : "rgba(20, 50, 20, 0.6)",
      textHint: isDark ? "rgba(255, 255, 255, 0.7)" : "rgba(20, 50, 20, 0.5)",
      glassBg: isDark ? "rgba(0, 0, 0, 0.45)" : "rgba(255, 255, 255, 0.75)",
      glassBorder: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 50, 0, 0.15)",
      iconColor: isDark ? "rgba(255, 255, 255, 0.8)" : "rgba(20, 80, 20, 0.75)",
      borderSubtle: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 50, 0, 0.1)",
      borderMedium: isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 50, 0, 0.18)",
      borderStrong: isDark ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 50, 0, 0.25)",
      surfaceSubtle: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 50, 0, 0.06)",
      surfaceMedium: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 50, 0, 0.08)",
      footerBg: isDark ? "rgba(0, 0, 0, 0.3)" : "rgba(0, 50, 0, 0.08)",
      footerDivider: isDark ? "rgba(255, 255, 255, 0.35)" : "rgba(20, 50, 20, 0.3)",
      iconBgTint: isDark ? "rgba(39, 174, 96, 0.15)" : "rgba(39, 174, 96, 0.12)",
      taglineBg: isDark ? "rgba(39, 174, 96, 0.15)" : "rgba(39, 174, 96, 0.12)",
      taglineBorder: isDark ? "rgba(39, 174, 96, 0.3)" : "rgba(39, 174, 96, 0.25)",
      taglineIcon: isDark ? "#FFFFFF" : "#1a5c1a",
      backgrounds: isDark
        ? {
            gradient: {
              web: ["oklch(24% 0.06 132)", "oklch(27.4% 0.072 132.109)", "oklch(21% 0.055 132)"] as const,
              native: ["#1a3510", "#1f3a0e", "#152c0b"] as const,
            },
            animated: {
              base: { web: "oklch(27.4% 0.072 132.109)", native: "#1f3a0e" },
              highlight: { web: "oklch(32% 0.08 132)", native: "#2d5015" },
            },
          }
        : {
            gradient: {
              web: ["oklch(92.5% 0.084 155.995)", "oklch(90% 0.075 155)", "oklch(94% 0.07 155)"] as const,
              native: ["#d4eec8", "#c5e4b5", "#ddf4d4"] as const,
            },
            animated: {
              base: { web: "oklch(92.5% 0.084 155.995)", native: "#d4eec8" },
              highlight: { web: "oklch(88% 0.065 155)", native: "#c5e4b5" },
            },
          },
    },

    webInfo: {
      card: "rgba(255, 255, 255, 0.08)",
      cardBorder: "rgba(255, 255, 255, 0.15)",
      textPrimary: "rgba(255, 255, 255, 0.95)",
      textSecondary: "rgba(255, 255, 255, 0.85)",
      textMuted: "rgba(255, 255, 255, 0.7)",
      footerBg: "rgba(0, 0, 0, 0.3)",
      iconLight: "rgba(255, 255, 255, 0.8)",
      brandGreen: "#1a2e05",
    },

    animatedBackground: isDark
      ? {
          base: { web: "oklch(27.4% 0.072 132.109)", native: "#1f3a0e" },
          highlight: { web: "oklch(32% 0.08 132)", native: "#2d5015" },
          bubbleBg: "rgba(255, 255, 255, 0.15)",
          bubbleBorder: "rgba(255, 255, 255, 0.25)",
        }
      : {
          base: { web: "oklch(92.5% 0.084 155.995)", native: "#d4eec8" },
          highlight: { web: "oklch(88% 0.065 155)", native: "#c5e4b5" },
          bubbleBg: "rgba(0, 80, 30, 0.08)",
          bubbleBorder: "rgba(0, 80, 30, 0.12)",
        },

    animatedScreens: ["Landing", "Auth", "Onboarding"] as const,
  };
}

export type GlassStyleTokens = ReturnType<typeof getGlassStyle>;
