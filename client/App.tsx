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
import { GuestLimitsProvider } from "@/contexts/GuestLimitsContext";
import { FloatingChatButton } from "@/components/FloatingChatButton";
import { ChatModal } from "@/components/ChatModal";
import { useExpirationNotifications } from "@/hooks/useExpirationNotifications";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const SCREENS_WITHOUT_CHAT = ["AddItem"];

function getActiveRouteName(state: NavigationState | undefined): string | undefined {
  if (!state) return undefined;
  const route = state.routes[state.index];
  if (route.state) {
    return getActiveRouteName(route.state as NavigationState);
  }
  return route.name;
}

function MobileAppContent() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isOnboardingComplete, isCheckingOnboarding } = useOnboardingStatus();
  const [currentRoute, setCurrentRoute] = useState<string | undefined>(undefined);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

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

  const onStateChange = useCallback((state: NavigationState | undefined) => {
    const routeName = getActiveRouteName(state);
    setCurrentRoute(routeName);
  }, []);

  const navigateToSignUp = useCallback(() => {
    navigationRef.current?.reset({ index: 0, routes: [{ name: "Onboarding", params: { upgradeFromGuest: true } }] });
  }, []);

  const showChat = !isCheckingOnboarding && isOnboardingComplete && !SCREENS_WITHOUT_CHAT.includes(currentRoute || "");

  return (
    <GuestLimitsProvider onNavigateToSignUp={navigateToSignUp}>
      <FloatingChatProvider>
        <NavigationContainer ref={navigationRef} theme={navigationTheme} onStateChange={onStateChange}>
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
    </GuestLimitsProvider>
  );
}

function RootWrapper() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const backgroundColor = isDark ? "#0a1205" : "#1a2e05";

  const [fontsLoaded] = useFonts({
    ...Feather.font,
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
    ...FontAwesome.font,
    ...Ionicons.font,
  });

  if (!fontsLoaded) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor }]}>
      <KeyboardProvider>
        <AuthProvider>
          <OnboardingProvider>
            <MobileAppContent />
          </OnboardingProvider>
        </AuthProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

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
