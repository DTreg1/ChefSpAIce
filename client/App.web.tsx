/**
 * =============================================================================
 * CHEFSP-AICE WEB LANDING PAGE
 * =============================================================================
 *
 * Web-specific entry point that renders the LandingScreen component for
 * visitors to chefpspaice.com. This provides a native React component experience
 * for the marketing landing page instead of static HTML.
 *
 * This file is used by Expo when building for web platform, allowing us to
 * show a streamlined landing experience without the full app navigation stack.
 */

import { useState, useEffect } from "react";
import { StyleSheet, View, Linking, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ScreenIdentifierOverlay } from "@/components/ScreenIdentifierOverlay";
import LandingScreen from "@/screens/LandingScreen";
import AboutScreen from "@/screens/web/AboutScreen";
import PrivacyScreen from "@/screens/web/PrivacyScreen";
import TermsScreen from "@/screens/web/TermsScreen";
import SupportScreen from "@/screens/web/SupportScreen";
import Constants from "expo-constants";

type WebRoute = "landing" | "about" | "privacy" | "terms" | "support";

function getRouteFromPath(): WebRoute {
  if (typeof window === "undefined") return "landing";
  const path = window.location.pathname.toLowerCase();
  if (path === "/about") return "about";
  if (path === "/privacy") return "privacy";
  if (path === "/terms") return "terms";
  if (path === "/support") return "support";
  return "landing";
}

/**
 * Get the Expo Go deep link URL for mobile app downloads
 */
function getExpoDeepLink(): string {
  const expoConfig = Constants.expoConfig;
  const slug = expoConfig?.slug || "chefspaice";
  const owner = expoConfig?.owner || "dtreg1";
  return `exp://exp.host/@${owner}/${slug}`;
}

/**
 * Handle navigation actions from the LandingScreen
 */
function handleGetStarted(tier?: 'basic' | 'pro', billing?: 'monthly' | 'annual') {
  const deepLink = getExpoDeepLink();
  Linking.openURL(deepLink).catch(() => {
    Linking.openURL('https://apps.apple.com/app/id982107779');
  });
}

function handleSignIn() {
  const deepLink = getExpoDeepLink();
  Linking.openURL(deepLink).catch(() => {
    Linking.openURL('https://apps.apple.com/app/id982107779');
  });
}

function handleAbout() {
  if (Platform.OS === 'web') {
    window.location.href = '/about';
  }
}

function handlePrivacy() {
  if (Platform.OS === 'web') {
    window.location.href = '/privacy';
  }
}

function handleTerms() {
  if (Platform.OS === 'web') {
    window.location.href = '/terms';
  }
}

function handleSupport() {
  if (Platform.OS === 'web') {
    window.location.href = '/support';
  }
}

/**
 * Web Router
 * 
 * Simple URL-based router for web pages.
 */
function WebRouter() {
  const [route, setRoute] = useState<WebRoute>(getRouteFromPath);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getRouteFromPath());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  switch (route) {
    case "about":
      return (
        <View style={styles.container}>
          <AnimatedBackground bubbleCount={20} />
          <AboutScreen />
          <ScreenIdentifierOverlay screenName="AboutScreen" />
        </View>
      );
    case "privacy":
      return (
        <View style={styles.container}>
          <AnimatedBackground bubbleCount={20} />
          <PrivacyScreen />
          <ScreenIdentifierOverlay screenName="PrivacyScreen" />
        </View>
      );
    case "terms":
      return (
        <View style={styles.container}>
          <AnimatedBackground bubbleCount={20} />
          <TermsScreen />
          <ScreenIdentifierOverlay screenName="TermsScreen" />
        </View>
      );
    case "support":
      return (
        <View style={styles.container}>
          <AnimatedBackground bubbleCount={20} />
          <SupportScreen />
          <ScreenIdentifierOverlay screenName="SupportScreen" />
        </View>
      );
    default:
      return (
        <View style={styles.container}>
          <AnimatedBackground bubbleCount={20} />
          <View style={styles.content}>
            <LandingScreen
              onGetStarted={handleGetStarted}
              onSignIn={handleSignIn}
              onAbout={handleAbout}
              onPrivacy={handlePrivacy}
              onTerms={handleTerms}
              onSupport={handleSupport}
            />
          </View>
          <ScreenIdentifierOverlay screenName="LandingScreen" />
          <StatusBar style="light" />
        </View>
      );
  }
}

/**
 * APP.WEB - Web Entry Point
 *
 * Minimal provider setup for web landing page:
 * - QueryClientProvider for any data fetching
 * - SafeAreaProvider for layout
 * - ThemeProvider for dark/light theming
 * - WebThemeProvider for web-specific theme handling
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <WebRouter />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: "100vh" as unknown as number,
  },
  content: {
    flex: 1,
    position: "relative",
    zIndex: 1,
  },
});
