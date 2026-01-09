import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { View, ActivityIndicator, StyleSheet, Appearance, AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_STORAGE_KEY = "@chefspaice/theme_preference";
const RESOLVED_SCHEME_KEY = "@chefspaice/resolved_scheme";

export type ThemePreference = "light" | "dark" | "system";
export type ColorScheme = "light" | "dark";

interface ThemeContextType {
  colorScheme: ColorScheme;
  setThemePreference: (preference: ThemePreference) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themePreference, setThemePreferenceState] = useState<ThemePreference | null>(null);
  const [cachedResolvedScheme, setCachedResolvedScheme] = useState<ColorScheme | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasPersistedScheme = useRef(false);
  // Initialize with current appearance - this is our single source of truth for system theme
  const [liveSystemScheme, setLiveSystemScheme] = useState<ColorScheme>(() => {
    const initial = Appearance.getColorScheme();
    return initial === "light" || initial === "dark" ? initial : "dark";
  });

  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
    AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
  }, []);

  // liveSystemScheme is now our single source of truth for system theme
  // It's initialized on mount and only updated when app is active
  const effectiveSystemScheme: ColorScheme = liveSystemScheme;

  // Calculate the final color scheme
  const colorScheme: ColorScheme = 
    themePreference === "system" || themePreference === null
      ? effectiveSystemScheme 
      : themePreference;

  // Persist the resolved scheme whenever it changes (for next app launch)
  useEffect(() => {
    if (isLoaded && colorScheme && !hasPersistedScheme.current) {
      hasPersistedScheme.current = true;
      AsyncStorage.setItem(RESOLVED_SCHEME_KEY, colorScheme);
    } else if (isLoaded && colorScheme) {
      // Always update when scheme changes
      AsyncStorage.setItem(RESOLVED_SCHEME_KEY, colorScheme);
    }
  }, [isLoaded, colorScheme]);


  const isDark = colorScheme === "dark";

  return (
    <ThemeContext.Provider
      value={{
        colorScheme,
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
    backgroundColor: "#1a1a2e", // Dark background to match app's dark theme
  },
});

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}
