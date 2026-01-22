import { useTheme as useThemeContext } from "@/contexts/ThemeContext";

export function useTheme() {
  const context = useThemeContext();

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
