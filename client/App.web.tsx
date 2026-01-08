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

import { StyleSheet, View, Linking, Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import LandingScreen from "@/screens/LandingScreen";
import Constants from "expo-constants";

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
  // On web, direct to app store or Expo Go
  const deepLink = getExpoDeepLink();
  Linking.openURL(deepLink).catch(() => {
    // Fallback to App Store if Expo link fails
    Linking.openURL('https://apps.apple.com/app/id982107779');
  });
}

function handleSignIn() {
  // Direct to Expo Go for sign in
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
 * Web Landing Content
 * 
 * Renders the LandingScreen with animated background.
 * No navigation stack needed - just the landing page.
 */
function WebLandingContent() {
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
      <StatusBar style="light" />
    </View>
  );
}

/**
 * APP.WEB - Web Entry Point
 *
 * Minimal provider setup for web landing page:
 * - QueryClientProvider for any data fetching
 * - SafeAreaProvider for layout
 * - ThemeProvider for dark/light theming
 */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <WebLandingContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1F0F',
  },
  content: {
    flex: 1,
  },
});
