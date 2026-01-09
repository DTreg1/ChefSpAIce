import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useColorScheme as useSystemColorScheme, View, ActivityIndicator, StyleSheet, Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_STORAGE_KEY = "@chefspaice/theme_preference";

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
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemePreferenceState(stored);
      } else {
        // No stored preference - default to "system"
        setThemePreferenceState("system");
      }
      setIsLoaded(true);
    });
  }, []);

  const setThemePreference = useCallback((preference: ThemePreference) => {
    setThemePreferenceState(preference);
    AsyncStorage.setItem(THEME_STORAGE_KEY, preference);
  }, []);

  // While loading, don't render children to prevent theme flash
  if (!isLoaded || themePreference === null) {
    // Show a minimal loading state with a dark background to prevent flash
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#E67E22" />
      </View>
    );
  }

  // Use synchronous Appearance.getColorScheme() as fallback when hook returns null
  // This ensures we get the correct system theme on initial render
  const effectiveSystemScheme = systemColorScheme ?? Appearance.getColorScheme() ?? "dark";
  
  const colorScheme: ColorScheme = 
    themePreference === "system" 
      ? effectiveSystemScheme 
      : themePreference;

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
