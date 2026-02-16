import { Platform } from "react-native";

export const AppColors = {
  primary: "#578136",
  secondary: "#b2611a",
  background: "#F8F9FA",
  text: "#2C3E50",
  accent: "#2b7cb3",
  warning: "#a4690c",
  success: "#1f874b",
  surface: "#FFFFFF",
  border: "#E9ECEF",
  textSecondary: "#495057",
  error: "#d24536",
  errorDark: "#E53935",
  confidenceHigh: "#188841",
  confidenceMedium: "#947105",
  confidenceLow: "#bf5811",
  paymentWarning: "#b45309",
  offline: "#a46a07",
  backgroundBase: "#1f3a0e",
  backgroundHighlight: "#2d5015",
  backgroundHighlightLight: "#d4eec8",
  expiryUrgent: "#ef4444",
  expiryWarning: "#f97316",
  expiryCaution: "#eab308",
  expirySoon: "#fef3c7",
  expiryNeutral: "#9ca3af",
  expiryTextLight: "#1a1a1a",
  expiryTextSoon: "#92400e",
  expiryTextNeutral: "#1f2937",
  sourceOpenFoodFacts: "#1a2e05",
  sourceLocal: "#6C757D",
};

export const Colors = {
  light: {
    text: "#1a3a1a",
    textSecondary: "#3d5a3d",
    textOnGlass: "#1a3a1a",
    textSecondaryOnGlass: "#3d5a3d",
    buttonText: "#FFFFFF",
    tabIconDefault: "#5a7a5a",
    tabIconSelected: AppColors.primary,
    link: AppColors.accent,
    backgroundRoot: "transparent",
    backgroundDefault: "rgba(255, 255, 255, 0.85)",
    backgroundSecondary: "rgba(233, 236, 239, 0.9)",
    backgroundTertiary: "rgba(222, 226, 230, 0.9)",
    primary: AppColors.primary,
    secondary: AppColors.secondary,
    accent: AppColors.accent,
    warning: AppColors.warning,
    success: AppColors.success,
    error: AppColors.error,
    border: AppColors.border,
    surface: "rgba(255, 255, 255, 0.9)",
    linkHighlight: "#2B6CA3",
    linkHighlightActive: "#cc4444",
    confidenceHigh: "#188841",
    confidenceMedium: "#947105",
    confidenceLow: "#bf5811",
    offline: "#a46a07",
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#B0B8C0",
    textOnGlass: "#FFFFFF",
    textSecondaryOnGlass: "rgba(255, 255, 255, 0.8)",
    buttonText: "#FFFFFF",
    tabIconDefault: "#8B9299",
    tabIconSelected: "#649344",
    link: "#3498DB",
    backgroundRoot: "transparent",
    backgroundDefault: "rgba(26, 26, 26, 0.85)",
    backgroundSecondary: "rgba(37, 37, 37, 0.9)",
    backgroundTertiary: "rgba(48, 48, 48, 0.9)",
    primary: "#649344",
    secondary: "#E67E22",
    accent: "#3498DB",
    warning: "#F39C12",
    success: "#2ECC71",
    error: "#E74C3C",
    border: AppColors.border,
    surface: "rgba(26, 26, 26, 0.9)",
    linkHighlight: "#88ccff",
    linkHighlightActive: "#ff8888",
    confidenceHigh: "#22c55e",
    confidenceMedium: "#eab308",
    confidenceLow: "#f97316",
    offline: "#f59e0b",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 48,
  "5xl": 56,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  pill: 9999,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  button: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
};

export const Shadows = {
  sm: Platform.select({
    web: { boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.05)" },
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
  }),
  md: Platform.select({
    web: { boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.1)" },
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
  }),
  lg: Platform.select({
    web: { boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.15)" },
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
  }),
};

export const TabBarColors = {
  light: {
    selected: "#0088FF",
    unselected: "#404040",
    selectionBg: "#EDEDED",
    pillBg: "rgba(255, 255, 255, 0.92)",
    pillBorder: "rgba(200, 200, 200, 0.5)",
  },
  dark: {
    selected: "#0A84FF",
    unselected: "#8E8E93",
    selectionBg: "rgba(255, 255, 255, 0.12)",
    pillBg: "rgba(28, 28, 30, 0.95)",
    pillBorder: "rgba(255, 255, 255, 0.1)",
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
