/**
 * =============================================================================
 * CHEFSP-AICE ROOT APPLICATION
 * =============================================================================
 * 
 * This is the main entry point for the ChefSpAIce mobile application.
 * It sets up all the providers and context needed for the app to function.
 * 
 * Architecture Overview:
 * - React Native + Expo framework
 * - React Navigation for screen management
 * - React Query for server state management
 * - Context providers for global state (Auth, Subscription, Onboarding, Chat)
 * 
 * Provider Hierarchy (from outer to inner):
 * 1. ErrorBoundary - Catches and displays errors gracefully
 * 2. QueryClientProvider - React Query for API calls and caching
 * 3. SafeAreaProvider - Safe area insets for notches/status bars
 * 4. GestureHandlerRootView - Gesture handling for swipes/touches
 * 5. KeyboardProvider - Keyboard-aware scroll handling
 * 6. AuthProvider - User authentication state
 * 7. SubscriptionProvider - Stripe subscription state
 * 8. OnboardingProvider - First-time user experience
 * 9. FloatingChatProvider - AI assistant chat modal
 */

import React, { useMemo, useState, useCallback, useRef } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  Theme,
  NavigationState,
  NavigationContainerRef,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { FloatingChatProvider } from "@/contexts/FloatingChatContext";
import {
  OnboardingProvider,
  useOnboardingStatus,
} from "@/contexts/OnboardingContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { FloatingChatButton } from "@/components/FloatingChatButton";
import { ChatModal } from "@/components/ChatModal";
import { ScreenIdentifierOverlay } from "@/components/ScreenIdentifierOverlay";
import { useExpirationNotifications } from "@/hooks/useExpirationNotifications";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

/**
 * Screens where the floating chat button should NOT appear.
 * These are typically screens where the chat would interfere with the UI
 * or where the user hasn't completed authentication/setup yet.
 */
const SCREENS_WITHOUT_CHAT = [
  "AddItem",     // Adding items - chat would interfere
  "Pricing",     // Subscription flow - chat would distract
  "Onboarding",  // Initial setup - not ready for chat
  "Login",       // Auth screens - not authenticated yet
  "Register",    // Auth screens - not authenticated yet
  "ForgotPassword", // Auth screens - not authenticated yet
];

/**
 * Recursively traverses the navigation state to find the currently active screen.
 * React Navigation stores state as a nested structure, so we need to traverse
 * down to find the deepest active route.
 * 
 * @param state - The current navigation state
 * @returns The name of the currently active route
 */
function getActiveRouteName(
  state: NavigationState | undefined,
): string | undefined {
  if (!state) return undefined;
  const route = state.routes[state.index];
  // If this route has nested navigation, go deeper
  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }
  return route.name;
}

/**
 * MOBILE APP CONTENT
 * 
 * The main content component that renders the navigation structure.
 * This is wrapped by all the context providers and handles:
 * - Navigation container setup with theming
 * - Route tracking for chat button visibility
 * - Animated background effects
 * - Floating chat button and modal
 * - Screen identifier overlay (for development)
 */
function MobileAppContent() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isOnboardingComplete, isCheckingOnboarding } = useOnboardingStatus();
  const [currentRoute, setCurrentRoute] = useState<string | undefined>(
    undefined,
  );
  const navigationRef =
    useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Set up expiration notifications for food items
  useExpirationNotifications();

  // Create a custom navigation theme with transparent backgrounds
  // This allows the animated gradient background to show through
  const navigationTheme: Theme = useMemo(() => {
    const baseTheme = isDark ? DarkTheme : DefaultTheme;
    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        background: "transparent",
        card: "transparent",
      },
    };
  }, [isDark]);

  // Track navigation state changes to update current route
  const onStateChange = useCallback((state: NavigationState | undefined) => {
    const routeName = getActiveRouteName(state);
    setCurrentRoute(routeName);
  }, []);

  // Only show chat button after onboarding is complete and not on excluded screens
  const showChat =
    !isCheckingOnboarding &&
    isOnboardingComplete &&
    !SCREENS_WITHOUT_CHAT.includes(currentRoute || "");

  return (
    <FloatingChatProvider>
      <NavigationContainer
        ref={navigationRef}
        theme={navigationTheme}
        onStateChange={onStateChange}
      >
        {/* Animated gradient background with floating bubbles */}
        <AnimatedBackground bubbleCount={20} />
        
        {/* Shows when device is offline */}
        <OfflineIndicator />
        
        {/* Main navigation stack */}
        <RootStackNavigator />
        
        {/* Floating chat button and modal - only shown after onboarding */}
        {showChat ? (
          <>
            <FloatingChatButton />
            <ChatModal />
          </>
        ) : null}
        
        {/* Development overlay showing current screen name */}
        <ScreenIdentifierOverlay screenName={currentRoute} />
      </NavigationContainer>
      <StatusBar />
    </FloatingChatProvider>
  );
}

/**
 * ROOT WRAPPER
 * 
 * Sets up the core infrastructure providers:
 * - GestureHandlerRootView for gesture recognition
 * - KeyboardProvider for keyboard-aware scrolling
 * - AuthProvider for user authentication state
 * - SubscriptionProvider for Stripe subscription management
 * - OnboardingProvider for first-time user experience
 * 
 * Also sets the root background color based on theme.
 */
function RootWrapper() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  // Deep green background color for the app
  const backgroundColor = isDark ? "#0a1205" : "#1a2e05";

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor }]}>
      <KeyboardProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <OnboardingProvider>
              <MobileAppContent />
            </OnboardingProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

/**
 * APP - Main Export
 * 
 * The top-level component exported as the app entry point.
 * Wraps everything in:
 * - ErrorBoundary for graceful error handling
 * - QueryClientProvider for React Query data fetching
 * - SafeAreaProvider for handling device notches and safe areas
 */
export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <RootWrapper />
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

/**
 * STYLES
 */
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  layoutRoot: {
    flex: 1,
    position: "relative",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
