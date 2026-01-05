import { Colors } from "@/constants/theme";
import { useThemeContext } from "@/contexts/ThemeContext";

export function useTheme() {
  const { colorScheme, isDark, themePreference, setThemePreference } = useThemeContext();
  const theme = Colors[colorScheme];

  return {
    theme,
    isDark,
    colorScheme,
    themePreference,
    setThemePreference,
  };
}
