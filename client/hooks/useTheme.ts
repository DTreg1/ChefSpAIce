import { Colors } from "@/constants/theme";
import { useTheme as useThemeContext } from "@/contexts/ThemeContext";

export function useTheme() {
  const { colorScheme, isDark, setThemePreference } = useThemeContext();
  const theme = Colors[colorScheme];

  return {
    theme,
    isDark,
    colorScheme,
    setThemePreference,
    setTheme: setThemePreference,
  };
}

export const useAppTheme = useTheme;
