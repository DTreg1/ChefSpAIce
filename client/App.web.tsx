import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { injectWebFocusCSS } from "@/lib/web-accessibility";
import { WebRouterProvider, Route, useRoute, useNavigate } from "@/lib/web-router";
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

const PAGE_META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "ChefSpAIce - AI Kitchen Assistant",
    description:
      "Manage your kitchen inventory, generate AI-powered recipes, plan meals, and create smart shopping lists with ChefSpAIce.",
  },
  "/about": {
    title: "About - ChefSpAIce",
    description:
      "Learn about ChefSpAIce, the AI-powered kitchen assistant that helps you manage inventory, generate recipes, and plan meals.",
  },
  "/privacy": {
    title: "Privacy Policy - ChefSpAIce",
    description:
      "Read ChefSpAIce's privacy policy to understand how we protect your data and respect your privacy.",
  },
  "/terms": {
    title: "Terms of Service - ChefSpAIce",
    description:
      "Review ChefSpAIce's terms of service for using our AI-powered kitchen management platform.",
  },
  "/support": {
    title: "Support - ChefSpAIce",
    description:
      "Get help with ChefSpAIce. Contact our support team, report issues, or make a donation.",
  },
};

function LandingPage() {
  const navigate = useNavigate();
  return (
    <LazyLandingScreen
      onAbout={() => navigate("/about")}
      onPrivacy={() => navigate("/privacy")}
      onTerms={() => navigate("/terms")}
      onSupport={() => navigate("/support")}
    />
  );
}

function PageMetaUpdater() {
  const currentPath = useRoute();
  const meta = PAGE_META[currentPath] || PAGE_META["/"];
  usePageMeta(meta);
  return null;
}

function WebRoutes() {
  return (
    <View style={styles.container}>
      <AnimatedBackground bubbleCount={20} />
      <PageMetaUpdater />
      <View style={styles.content}>
        <Route path="/" component={LandingPage} />
        <Route path="/about" component={LazyAboutScreen} />
        <Route path="/privacy" component={LazyPrivacyScreen} />
        <Route path="/terms" component={LazyTermsScreen} />
        <Route path="/support" component={LazySupportScreen} />
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
  },
  content: {
    flex: 1,
  },
});
