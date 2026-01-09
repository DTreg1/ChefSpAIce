import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { View, ActivityIndicator, StyleSheet, Appearance, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/theme";

const THEME_STORAGE_KEY = "@chefspaice/theme_preference";

export type ThemePreference = "light" | "dark" | "system";
export type ColorScheme = "light" | "dark";
export type ThemeColors = typeof Colors.light;

interface ThemeContextType {
  theme: ThemeColors;
  colorScheme: ColorScheme;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemScheme(): ColorScheme {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  const scheme = Appearance.getColorScheme();
  return scheme === "light" || scheme === "dark" ? scheme : "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>("system");
  const [systemScheme, setSystemScheme] = useState<ColorScheme>(getSystemScheme);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemePreferenceState(stored);
      }
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        setSystemScheme(e.matches ? "dark" : "light");
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      const subscription = Appearance.addChangeListener(({ colorScheme }) => {
        if (colorScheme === "light" || colorScheme === "dark") {
          setSystemScheme(colorScheme);
        }
      });
      return () => subscription.remove();
    }
  }, []);

  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
    AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
    
    if (Platform.OS === "web" && typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem("chefspaice-theme", preference);
      const resolved = preference === "system" ? getSystemScheme() : preference;
      document.documentElement?.classList?.toggle("dark", resolved === "dark");
    }
  }, []);

  const colorScheme: ColorScheme = 
    themePreference === "system" ? systemScheme : themePreference;

  const theme = useMemo(() => Colors[colorScheme], [colorScheme]);
  
  const isDark = colorScheme === "dark";

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && typeof document !== "undefined") {
      document.documentElement?.classList?.toggle("dark", isDark);
    }
  }, [isDark]);

  if (!isLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#E67E22" />
      </View>
    );
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colorScheme,
        themePreference,
        setThemePreference,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a2e05",
  },
});

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}
