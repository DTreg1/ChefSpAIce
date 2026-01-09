import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { View, ActivityIndicator, StyleSheet, Appearance, AppState, AppStateStatus, Platform } from "react-native";
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
  const [themePreference, setThemePreferenceState] = useState<ThemePreference | null>(null);
  const [cachedResolvedScheme, setCachedResolvedScheme] = useState<ColorScheme | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasPersistedScheme = useRef(false);
  // Initialize with current appearance - this is our single source of truth for system theme
  // Default to "light" if system returns null (common on iOS initial load)
  const [liveSystemScheme, setLiveSystemScheme] = useState<ColorScheme>(() => {
    const initial = Appearance.getColorScheme();
    return initial === "light" || initial === "dark" ? initial : "light";
  });
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

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

  // Listen for app state changes to refresh theme when app comes back to foreground
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextAppState;
      
      // Only update theme when transitioning TO active state
      if (nextAppState === "active" && previousState !== "active") {
        // Small delay to let iOS settle and report the correct scheme
        setTimeout(() => {
          const currentScheme = Appearance.getColorScheme();
          console.log("[Theme] App resumed, system scheme:", currentScheme, "preference:", themePreference);
          if (currentScheme === "light" || currentScheme === "dark") {
            setLiveSystemScheme(currentScheme);
          }
        }, 100);
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [themePreference]);

  // Also listen for Appearance changes directly (handles real-time system theme changes)
  // BUT only when the app is active - ignore changes while backgrounded
  useEffect(() => {
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      // Only update if app is currently active
      if (appStateRef.current === "active") {
        if (colorScheme === "light" || colorScheme === "dark") {
          console.log("[Theme] Appearance changed while active:", colorScheme);
          setLiveSystemScheme(colorScheme);
        }
      } else {
        console.log("[Theme] Ignoring appearance change while backgrounded:", colorScheme);
      }
    });
    return () => listener.remove();
  }, []);

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
