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

import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { StyleSheet, View, Platform } from "react-native";
import { logger } from "@/lib/logger";
import { useTheme } from "@/hooks/useTheme";
import { ThemeProvider } from "@/contexts/ThemeContext";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  Theme,
  NavigationState,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import Feather from "@expo/vector-icons/Feather";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import Ionicons from "@expo/vector-icons/Ionicons";
import AntDesign from "@expo/vector-icons/AntDesign";
import Entypo from "@expo/vector-icons/Entypo";

SplashScreen.preventAutoHideAsync();

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { storeKitService } from "@/lib/storekit-service";
import { storage } from "@/lib/storage";
import { linkingConfig, savePendingDeepLink } from '@/lib/deep-linking';
import * as Linking from 'expo-linking';

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { PendingSyncBanner } from "@/components/PendingSyncBanner";
import { PaymentFailedBanner } from "@/components/PaymentFailedBanner";
import { FloatingChatProvider } from "@/contexts/FloatingChatContext";
import { SearchProvider } from "@/contexts/SearchContext";
import {
  OnboardingProvider,
  useOnboardingStatus,
} from "@/contexts/OnboardingContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SubscriptionProvider, useSubscription } from "./hooks/useSubscription";
import { FloatingChatButton } from "@/components/FloatingChatButton";
import { ChatModal } from "@/components/ChatModal";
import { VoiceQuickAction } from "@/components/VoiceQuickAction";
import { ScreenIdentifierOverlay } from "@/components/ScreenIdentifierOverlay";
import { useExpirationNotifications } from "@/hooks/useExpirationNotifications";
import { usePaymentNotifications } from "@/hooks/usePaymentNotifications";
import { initOfflineProcessor } from "@/lib/offline-processor";
import { navigationRef } from "@/lib/navigationRef";

/**
 * Screens where the floating chat button should NOT appear even after auth/onboarding.
 * Currently only the AddItem screen where the chat would interfere with the UI.
 */
const SCREENS_WITHOUT_CHAT = [
  "AddItem",
  "Auth",
  "Landing",
  "Onboarding",
  "Subscription",
  "Profile",
  "Settings",
];

const CONTENT_HEAVY_SCREENS = [
  "ItemDetail",
  "RecipeDetail",
  "Chat",
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
  const colorScheme = useTheme();
  const isDark = colorScheme.isDark;
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    user,
    setSignOutCallback,
  } = useAuth();
  const { isOnboardingComplete, isCheckingOnboarding } = useOnboardingStatus();
  const { isActive: isSubscriptionActive, isLoading: isSubscriptionLoading } =
    useSubscription();
  const [currentRoute, setCurrentRoute] = useState<string | undefined>(
    undefined,
  );
  // Using shared navigationRef from @/lib/navigationRef
  // so non-React code (e.g. SyncManager) can navigate.

  useExpirationNotifications();
  usePaymentNotifications();

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      storeKitService.setUserId(user.id);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    setSignOutCallback(() => {
      storeKitService.logout();
    });
  }, [setSignOutCallback]);

  useEffect(() => {
    initOfflineProcessor();
  }, []);

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

  const onStateChange = useCallback((state: NavigationState | undefined) => {
    const routeName = getActiveRouteName(state);
    setCurrentRoute(routeName);
  }, []);

  /**
   * Only show chat button when:
   * 1. Navigation route is known (not undefined/initial state)
   * 2. All loading states are complete (auth, subscription, onboarding checks)
   * 3. User is authenticated (has an account)
   * 4. User has an active subscription
   * 5. Onboarding is complete
   * 6. Not on excluded screens (like AddItem where chat would interfere)
   *
   * IMPORTANT: We require currentRoute to be defined to prevent the chat button
   * from flashing during initial navigation setup, before we know which screen
   * the user is on. This ensures the button never appears on auth/onboarding screens.
   */
  const isAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const linking = useMemo(() => ({
    ...linkingConfig,
    async getInitialURL() {
      const url = await Linking.getInitialURL();
      if (url && !isAuthenticatedRef.current) {
        await savePendingDeepLink(url);
        return null;
      }
      return url;
    },
    subscribe(listener: (url: string) => void) {
      const subscription = Linking.addEventListener('url', ({ url }) => {
        if (!isAuthenticatedRef.current) {
          savePendingDeepLink(url);
          return;
        }
        listener(url);
      });
      return () => subscription.remove();
    },
  }), []);

  const showChat =
    currentRoute !== undefined &&
    !isAuthLoading &&
    !isSubscriptionLoading &&
    isAuthenticated &&
    isSubscriptionActive &&
    !isCheckingOnboarding &&
    isOnboardingComplete &&
    !SCREENS_WITHOUT_CHAT.includes(currentRoute);

  return (
    <FloatingChatProvider>
      <NavigationContainer
        ref={navigationRef}
        theme={navigationTheme}
        onStateChange={onStateChange}
        linking={linking}
      >
        {/* Animated gradient background - disabled on content-heavy screens for performance */}
        <AnimatedBackground
          bubbleCount={20}
          enabled={!currentRoute || !CONTENT_HEAVY_SCREENS.includes(currentRoute)}
        />

        {/* Shows when device is offline */}
        <OfflineIndicator />

        {/* Shows when changes are pending sync */}
        <PendingSyncBanner />

        {/* Shows when payment has failed during grace period */}
        <PaymentFailedBanner />

        {/* Web max-width container for better readability on large screens */}
        <View style={styles.webContainer}>
          <View style={styles.webContent}>
            {/* Main navigation stack */}
            <RootStackNavigator />

            {/* Floating chat button and modal - only shown after auth + onboarding */}
            {showChat ? (
              <>
                <VoiceQuickAction />
                <FloatingChatButton />
                <ChatModal />
              </>
            ) : null}

            {/* Development overlay showing current screen name */}
            <ScreenIdentifierOverlay screenName={currentRoute} />
          </View>
        </View>
      </NavigationContainer>
      <StatusBar style="auto" translucent backgroundColor="transparent" />
    </FloatingChatProvider>
  );
}

/**
 * ROOT WRAPPER
 *
 * Sets up the core infrastructure providers:
 * - ThemeProvider for theme management
 * - GestureHandlerRootView for gesture recognition
 * - KeyboardProvider for keyboard-aware scrolling
 * - AuthProvider for user authentication state
 * - SubscriptionProvider for Stripe subscription management
 * - OnboardingProvider for first-time user experience
 *
 * Also sets the root background color based on theme.
 */
function RootWrapper() {
  useEffect(() => {
    storeKitService.initialize();
    storage.cleanupDeletedInventory().then((purged) => {
      if (purged > 0) {
        logger.log(`[Cleanup] Purged ${purged} expired soft-deleted inventory items`);
      }
    }).catch((err) => {
      logger.warn("[Cleanup] Failed to cleanup deleted inventory:", err);
    });
  }, []);

  return (
    <ThemeProvider>
      <GestureHandlerRootView>
        <KeyboardProvider>
          <AuthProvider>
            <SubscriptionProvider>
              <OnboardingProvider>
                <SearchProvider>
                  <MobileAppContent />
                </SearchProvider>
              </OnboardingProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
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
 *
 * Also handles font loading to ensure icons render properly on Android.
 */
export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          ...Feather.font,
          ...MaterialIcons.font,
          ...MaterialCommunityIcons.font,
          ...FontAwesome.font,
          ...Ionicons.font,
          ...AntDesign.font,
          ...Entypo.font,
        });
      } catch (e) {
        logger.warn("Error loading fonts:", e);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <View style={styles.root} onLayout={onLayoutRootView}>
            <RootWrapper />
          </View>
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
  webContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  webContent: {
    flex: 1,
    maxWidth: Platform.OS === "web" ? 800 : undefined,
    position: "relative" as const,
    overflow: "hidden" as const,
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
