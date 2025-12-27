import React, { useMemo } from "react";
import { StyleSheet, View, useColorScheme, Platform } from "react-native";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  Theme,
} from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

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
import { FloatingChatButton } from "@/components/FloatingChatButton";
import { ChatModal } from "@/components/ChatModal";
import { useExpirationNotifications } from "@/hooks/useExpirationNotifications";
import LandingScreen from "@/screens/LandingScreen";

const BASE_COLORS = {
  light: "#f0f2f5",
  dark: "#0a0a0a",
};

function AppContent() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isOnboardingComplete, isCheckingOnboarding } = useOnboardingStatus();

  useExpirationNotifications();

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

  const showChat = !isCheckingOnboarding && isOnboardingComplete;

  if (Platform.OS === "web") {
    return <LandingScreen />;
  }

  return (
    <FloatingChatProvider>
      <NavigationContainer theme={navigationTheme}>
        <AnimatedBackground bubbleCount={20} />
        <OfflineIndicator />
        <RootStackNavigator />
        {showChat ? (
          <>
            <FloatingChatButton />
            <ChatModal />
          </>
        ) : null}
      </NavigationContainer>
      <StatusBar />
    </FloatingChatProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <AuthProvider>
                <OnboardingProvider>
                  <AppContent />
                </OnboardingProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  layoutRoot: {
    flex: 1,
    position: "relative",
  },
});
