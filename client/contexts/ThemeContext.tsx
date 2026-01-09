import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useColorScheme as useSystemColorScheme, View, ActivityIndicator, StyleSheet, Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_STORAGE_KEY = "@chefspaice/theme_preference";
const RESOLVED_SCHEME_KEY = "@chefspaice/resolved_scheme";

export type ThemePreference = "light" | "dark" | "system";
export type ColorScheme = "light" | "dark";

interface ThemeContextType {
  themePreference: ThemePreference;
  colorScheme: ColorScheme;
  setThemePreference: (preference: ThemePreference) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference | null>(null);
  const [cachedResolvedScheme, setCachedResolvedScheme] = useState<ColorScheme | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasPersistedScheme = useRef(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_STORAGE_KEY),
      AsyncStorage.getItem(RESOLVED_SCHEME_KEY),
    ]).then(([storedPref, storedScheme]) => {
      if (storedPref === "light" || storedPref === "dark" || storedPref === "system") {
        setThemePreferenceState(storedPref);
      } else {
        setThemePreferenceState("system");
      }
      
      // Use cached resolved scheme for initial render to prevent flash
      if (storedScheme === "light" || storedScheme === "dark") {
        setCachedResolvedScheme(storedScheme);
      }
      
      setIsLoaded(true);
    });
  }, []);

  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
    AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
  }, []);

  // Calculate the effective system scheme using multiple fallbacks
  const effectiveSystemScheme: ColorScheme = 
    systemColorScheme ?? Appearance.getColorScheme() ?? cachedResolvedScheme ?? "dark";

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

  // While loading, use cached scheme or dark background
  if (!isLoaded || themePreference === null) {
    const loadingBg = cachedResolvedScheme === "light" ? "#f5f5f0" : "#1a1a2e";
    return (
      <View style={[styles.loadingContainer, { backgroundColor: loadingBg }]}>
        <ActivityIndicator size="small" color="#E67E22" />
      </View>
    );
  }

  const isDark = colorScheme === "dark";

  return (
    <ThemeContext.Provider
      value={{
        themePreference,
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

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}
