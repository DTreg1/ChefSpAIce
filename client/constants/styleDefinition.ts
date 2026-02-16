export interface StyleDefinition {
  name: string;
  colorScheme: "light" | "dark";
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
  blur: {
    tintDefault: "dark" | "light";
    tintThickMaterial: "systemThickMaterialDark" | "systemThickMaterial";
    tintChromeMaterial: "systemChromeMaterialDark" | "systemChromeMaterial";
  };
  surface: {
    modalHeader: string;
    pillBg: string;
    overlayStrong: string;
    overlayMedium: string;
    overlaySubtle: string;
    textBacking: string;
    inputSubtle: string;
    feedbackBg: string;
    tabBarBase: string;
  };
  text: {
    primary: string;
    contrast: string;
    statusHint: string;
  };
  button: {
    primaryBg: string;
    primaryText: string;
    secondaryBg: string;
    secondaryText: string;
    outlineBg: string;
    ghostBg: string;
    outlineText: string;
    ghostText: string;
    outlineBorder: string;
  };
  nutritionLabel: {
    text: string;
    border: string;
    background: string;
  };
  chat: {
    userBubble: string;
    assistantBubble: string;
    codeBlockBg: string;
    codeBlockBorder: string;
    userCodeBg: string;
    userCodeBorder: string;
  };
  webPage: {
    background: string;
    backgroundGradient: string;
    card: string;
    cardBorder: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    footerBg: string;
    toggleBg: string;
  };
  icon: {
    themeToggle: "moon" | "sun";
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
    colorScheme: isDark ? "dark" : "light",

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

    blur: {
      tintDefault: isDark ? "dark" : "light",
      tintThickMaterial: isDark ? "systemThickMaterialDark" : "systemThickMaterial",
      tintChromeMaterial: isDark ? "systemChromeMaterialDark" : "systemChromeMaterial",
    },

    surface: {
      modalHeader: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(255, 255, 255, 0.7)",
      pillBg: isDark ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.6)",
      overlayStrong: isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.8)",
      overlayMedium: isDark ? "rgba(0, 0, 0, 0.6)" : "rgba(255, 255, 255, 0.7)",
      overlaySubtle: isDark ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.8)",
      textBacking: isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.8)",
      inputSubtle: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)",
      feedbackBg: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
      tabBarBase: isDark ? "rgba(28, 28, 30, 0.85)" : "rgba(255, 255, 255, 0.85)",
    },

    text: {
      primary: isDark ? "#FFFFFF" : "#000000",
      contrast: isDark ? "#FFFFFF" : "#000000",
      statusHint: isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.5)",
    },

    button: {
      primaryBg: isDark ? "#649344" : "#578136",
      primaryText: "#FFFFFF",
      secondaryBg: isDark ? "#E67E22" : "#b2611a",
      secondaryText: "#FFFFFF",
      outlineBg: isDark ? "rgba(0, 0, 0, 0.55)" : "rgba(255, 255, 255, 0.85)",
      ghostBg: isDark ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.8)",
      outlineText: isDark ? "#8FBF5F" : "#3D6B1A",
      ghostText: isDark ? "#FFFFFF" : "#1a3a1a",
      outlineBorder: isDark ? "#649344" : "#578136",
    },

    nutritionLabel: {
      text: isDark ? "#FFFFFF" : "#000000",
      border: isDark ? "#FFFFFF" : "#000000",
      background: isDark ? "#1A1A1A" : "#FFFFFF",
    },

    chat: {
      userBubble: isDark ? "rgba(87, 129, 54, 0.4)" : "rgba(87, 129, 54, 0.15)",
      assistantBubble: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
      codeBlockBg: isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.06)",
      codeBlockBorder: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
      userCodeBg: isDark ? "rgba(0, 0, 0, 0.3)" : "rgba(255, 255, 255, 0.4)",
      userCodeBorder: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.08)",
    },

    webPage: {
      background: isDark ? "#0F1419" : "#F8FAFC",
      backgroundGradient: isDark ? "#0A0F14" : "#EDF2F7",
      card: isDark ? "#1A1F25" : "#FFFFFF",
      cardBorder: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.08)",
      textPrimary: isDark ? "#FFFFFF" : "#1A202C",
      textSecondary: isDark ? "#A0AEC0" : "#4A5568",
      textMuted: isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.5)",
      footerBg: isDark ? "#0A0D10" : "#F1F5F9",
      toggleBg: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
    },

    icon: {
      themeToggle: isDark ? "moon" : "sun",
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
