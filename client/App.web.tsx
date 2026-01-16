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
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import LandingScreen from "@/screens/LandingScreen";
import { WebScreenshotGallery } from "@/screens/WebScreenshotGallery";
import AboutScreen from "@/screens/web/AboutScreen";
import PrivacyScreen from "@/screens/web/PrivacyScreen";
import TermsScreen from "@/screens/web/TermsScreen";
import SupportScreen from "@/screens/web/SupportScreen";
import Constants from "expo-constants";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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



/**
 * Web Landing Content
 * 
 * Renders the LandingScreen or ScreenshotGallery based on URL path.
 * Simple client-side routing for the web landing experience.
 */
function WebLandingContent() {
  const [currentPath, setCurrentPath] = useState('/');

  useEffect(() => {
    if (Platform.OS === 'web') {
      setCurrentPath(window.location.pathname);
      
      const handlePopState = () => {
        setCurrentPath(window.location.pathname);
      };
      
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  const navigateTo = (path: string) => {
    if (Platform.OS === 'web') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
    }
  };

  const renderScreen = () => {
    switch (currentPath) {
      case '/gallery':
        return <WebScreenshotGallery onBack={() => navigateTo('/')} />;
      case '/about':
        return <AboutScreen />;
      case '/privacy':
        return <PrivacyScreen />;
      case '/terms':
        return <TermsScreen />;
      case '/support':
        return <SupportScreen />;
      default:
        return (
          <LandingScreen
            onAbout={() => navigateTo('/about')}
            onPrivacy={() => navigateTo('/privacy')}
            onTerms={() => navigateTo('/terms')}
            onSupport={() => navigateTo('/support')}
            onScreenshotGallery={() => navigateTo('/gallery')}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <AnimatedBackground bubbleCount={20} />
      <View style={styles.content}>
        {renderScreen()}
      </View>
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
          <ErrorBoundary>
            <WebLandingContent />
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a2e05',
  },
  content: {
    flex: 1,
  },
});
