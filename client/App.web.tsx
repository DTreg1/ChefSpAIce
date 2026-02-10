import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { injectWebFocusCSS } from "@/lib/web-accessibility";
import { WebRouterProvider, useRoute, useNavigate } from "@/lib/web-router";
import { usePageMeta } from "@/lib/web-meta";
import { withSuspense } from "@/lib/lazy-screen";

injectWebFocusCSS();

const LazyLandingScreen = withSuspense(
  React.lazy(() => import("@/screens/LandingScreen"))
);
const LazyAboutScreen = withSuspense(
  React.lazy(() => import("@/screens/web/AboutScreen"))
);
const LazyPrivacyScreen = withSuspense(
  React.lazy(() => import("@/screens/web/PrivacyScreen"))
);
const LazyTermsScreen = withSuspense(
  React.lazy(() => import("@/screens/web/TermsScreen"))
);
const LazySupportScreen = withSuspense(
  React.lazy(() => import("@/screens/web/SupportScreen"))
);

function WebRoutes() {
  const currentPath = useRoute();
  const navigate = useNavigate();

  const getPageMeta = () => {
    switch (currentPath) {
      case "/about":
        return {
          title: "About - ChefSpAIce",
          description:
            "Learn about ChefSpAIce, the AI-powered kitchen assistant that helps you manage inventory, generate recipes, and plan meals.",
        };
      case "/privacy":
        return {
          title: "Privacy Policy - ChefSpAIce",
          description:
            "Read ChefSpAIce's privacy policy to understand how we protect your data and respect your privacy.",
        };
      case "/terms":
        return {
          title: "Terms of Service - ChefSpAIce",
          description:
            "Review ChefSpAIce's terms of service for using our AI-powered kitchen management platform.",
        };
      case "/support":
        return {
          title: "Support - ChefSpAIce",
          description:
            "Get help with ChefSpAIce. Contact our support team, report issues, or make a donation.",
        };
      default:
        return {
          title: "ChefSpAIce - AI Kitchen Assistant",
          description:
            "Manage your kitchen inventory, generate AI-powered recipes, plan meals, and create smart shopping lists with ChefSpAIce.",
        };
    }
  };

  const pageMeta = getPageMeta();
  usePageMeta(pageMeta);

  return (
    <View style={styles.container}>
      <AnimatedBackground bubbleCount={20} />
      <View style={styles.content}>
        {currentPath === "/" && (
          <LazyLandingScreen
            onAbout={() => navigate("/about")}
            onPrivacy={() => navigate("/privacy")}
            onTerms={() => navigate("/terms")}
            onSupport={() => navigate("/support")}
          />
        )}
        {currentPath === "/about" && <LazyAboutScreen />}
        {currentPath === "/privacy" && <LazyPrivacyScreen />}
        {currentPath === "/terms" && <LazyTermsScreen />}
        {currentPath === "/support" && <LazySupportScreen />}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <WebRouterProvider>
              <WebRoutes />
            </WebRouterProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a2e05",
  },
  content: {
    flex: 1,
  },
});
