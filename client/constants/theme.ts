import { Platform } from "react-native";

export const AppColors = {
  primary: "#5E8C3A",
  secondary: "#E67E22",
  background: "#F8F9FA",
  text: "#2C3E50",
  accent: "#3498DB",
  warning: "#F39C12",
  success: "#2ECC71",
  surface: "#FFFFFF",
  border: "#E9ECEF",
  textSecondary: "#495057",
  error: "#E74C3C",
  confidenceHigh: "#22c55e",
  confidenceMedium: "#eab308",
  confidenceLow: "#f97316",
};

export const GlassColors = {
  light: {
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
  dark: {
    background: "rgba(0, 0, 0, 0.2)",
    backgroundStrong: "rgba(0, 0, 0, 0.35)",
    backgroundSubtle: "rgba(0, 0, 0, 0.1)",
    border: "rgba(255, 255, 255, 0.15)",
    borderStrong: "rgba(255, 255, 255, 0.25)",
    borderSubtle: "rgba(255, 255, 255, 0.08)",
    overlay: "rgba(0, 0, 0, 0.15)",
    shadowColor: "rgba(0, 0, 0, 0.4)",
    insetHighlight: "rgba(255, 255, 255, 0.1)",
  },
};

export const GlassEffect = {
  blur: {
    subtle: 4,
    regular: 6,
    strong: 10,
    intense: 20,
  },
  saturation: 180,
  borderWidth: 1,
  borderRadius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    pill: 32,
  },
};

export const Colors = {
  light: {
    text: "#1a3a1a",
    textSecondary: "#3d5a3d",
    textOnGlass: "#FFFFFF",
    textSecondaryOnGlass: "rgba(255, 255, 255, 0.85)",
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
    glass: GlassColors.light,
  },
  dark: {
    text: "#ECEDEE",
    textSecondary: "#B0B8C0",
    textOnGlass: "#FFFFFF",
    textSecondaryOnGlass: "rgba(255, 255, 255, 0.8)",
    buttonText: "#FFFFFF",
    tabIconDefault: AppColors.textSecondary,
    tabIconSelected: AppColors.primary,
    link: AppColors.accent,
    backgroundRoot: "transparent",
    backgroundDefault: "rgba(26, 26, 26, 0.85)",
    backgroundSecondary: "rgba(37, 37, 37, 0.9)",
    backgroundTertiary: "rgba(48, 48, 48, 0.9)",
    primary: AppColors.primary,
    secondary: AppColors.secondary,
    accent: AppColors.accent,
    warning: AppColors.warning,
    success: AppColors.success,
    error: AppColors.error,
    border: AppColors.border,
    surface: "rgba(26, 26, 26, 0.9)",
    glass: GlassColors.dark,
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
  glass: Platform.select({
    web: { boxShadow: "0px 8px 32px rgba(31, 38, 135, 0.37)" },
    default: {
      shadowColor: "rgba(31, 38, 135, 0.37)",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 32,
      elevation: 8,
    },
  }),
  glassSubtle: Platform.select({
    web: { boxShadow: "0px 4px 16px rgba(31, 38, 135, 0.2)" },
    default: {
      shadowColor: "rgba(31, 38, 135, 0.2)",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 1,
      shadowRadius: 16,
      elevation: 4,
    },
  }),
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
