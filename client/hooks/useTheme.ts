import { useTheme as useThemeFromContext, ThemeColors, ColorScheme, ThemePreference } from "@/contexts/ThemeContext";

interface ThemeHookReturn {
  theme: ThemeColors;
  isDark: boolean;
  colorScheme: ColorScheme;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  setTheme: (preference: ThemePreference) => void;
}

export function useTheme(): ThemeHookReturn {
  const context = useThemeFromContext();
  
  return {
    theme: context.theme,
    isDark: context.isDark,
    colorScheme: context.colorScheme,
    themePreference: context.themePreference,
    setThemePreference: context.setThemePreference,
    setTheme: context.setThemePreference,
  };
}

export const useAppTheme = useTheme;
