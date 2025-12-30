import { useState, useEffect, lazy, Suspense } from "react";
import { WebThemeProvider } from "@/contexts/WebThemeContext";
import LandingScreen from "@/screens/LandingScreen";
import AboutScreen from "@/screens/web/AboutScreen";
import PrivacyScreen from "@/screens/web/PrivacyScreen";
import TermsScreen from "@/screens/web/TermsScreen";
import AttributionsScreen from "@/screens/web/AttributionsScreen";
import SupportScreen from "@/screens/web/SupportScreen";
import PricingScreen from "@/screens/web/PricingScreen";
import AdminSubscriptionsScreen from "@/screens/web/AdminSubscriptionsScreen";
import AdminFeedbackScreen from "@/screens/web/AdminFeedbackScreen";
import SubscriptionSuccessScreen from "@/src/pages/subscription-success";
import SubscriptionCanceledScreen from "@/src/pages/subscription-canceled";
import Constants from "expo-constants";
import { View, Text, ActivityIndicator } from "react-native";
import { ScreenIdentifierOverlay } from "@/components/ScreenIdentifierOverlay";

const MobileApp = lazy(() => import("./NativeApp"));

const SKIP_LANDING =
  Constants.expoConfig?.extra?.skipLanding === true ||
  process.env.EXPO_PUBLIC_SKIP_LANDING === "true" ||
  process.env.EXPO_PUBLIC_SKIP_LANDING === "1";

type WebRoute =
  | "/"
  | "/about"
  | "/privacy"
  | "/terms"
  | "/attributions"
  | "/support"
  | "/pricing"
  | "/admin/subscriptions"
  | "/admin/feedback"
  | "/subscription-success"
  | "/subscription-canceled";

function getRouteFromPath(pathname: string): WebRoute {
  const normalized = pathname.toLowerCase();
  if (normalized === "/about") return "/about";
  if (normalized === "/privacy") return "/privacy";
  if (normalized === "/terms") return "/terms";
  if (normalized === "/attributions") return "/attributions";
  if (normalized === "/support") return "/support";
  if (normalized === "/pricing") return "/pricing";
  if (normalized === "/admin/subscriptions") return "/admin/subscriptions";
  if (normalized === "/admin/feedback") return "/admin/feedback";
  if (normalized === "/subscription-success") return "/subscription-success";
  if (normalized === "/subscription-canceled") return "/subscription-canceled";
  return "/";
}

function WebRouter() {
  const [route, setRoute] = useState<WebRoute>(() =>
    getRouteFromPath(
      typeof window !== "undefined" ? window.location.pathname : "/",
    ),
  );

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getRouteFromPath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
        return;
      }

      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (!anchor || !anchor.href) return;

      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.href.startsWith("mailto:") || anchor.href.startsWith("tel:"))
        return;

      try {
        const url = new URL(anchor.href);
        if (url.origin !== window.location.origin) return;

        const newRoute = getRouteFromPath(url.pathname);
        if (
          [
            "/",
            "/about",
            "/privacy",
            "/terms",
            "/attributions",
            "/support",
            "/pricing",
            "/admin/subscriptions",
            "/admin/feedback",
            "/subscription-success",
            "/subscription-canceled",
          ].includes(newRoute)
        ) {
          e.preventDefault();
          const fullPath = url.pathname + url.search + url.hash;
          window.history.pushState({}, "", fullPath);
          setRoute(newRoute);
          window.scrollTo(0, 0);
        }
      } catch {
        return;
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  const screenNames: Record<WebRoute, string> = {
    "/": "LandingScreen",
    "/about": "AboutScreen",
    "/privacy": "PrivacyScreen",
    "/terms": "TermsScreen",
    "/attributions": "AttributionsScreen",
    "/support": "SupportScreen",
    "/pricing": "PricingScreen",
    "/admin/subscriptions": "AdminSubscriptionsScreen",
    "/admin/feedback": "AdminFeedbackScreen",
    "/subscription-success": "SubscriptionSuccessScreen",
    "/subscription-canceled": "SubscriptionCanceledScreen",
  };

  const renderScreen = () => {
    switch (route) {
      case "/about":
        return <AboutScreen />;
      case "/privacy":
        return <PrivacyScreen />;
      case "/terms":
        return <TermsScreen />;
      case "/attributions":
        return <AttributionsScreen />;
      case "/support":
        return <SupportScreen />;
      case "/pricing":
        return <PricingScreen />;
      case "/admin/subscriptions":
        return <AdminSubscriptionsScreen />;
      case "/admin/feedback":
        return <AdminFeedbackScreen />;
      case "/subscription-success":
        return <SubscriptionSuccessScreen />;
      case "/subscription-canceled":
        return <SubscriptionCanceledScreen />;
      default:
        return <LandingScreen />;
    }
  };

  return (
    <>
      {renderScreen()}
      <ScreenIdentifierOverlay screenName={screenNames[route]} />
    </>
  );
}

export default function App() {
  if (SKIP_LANDING) {
    return (
      <Suspense fallback={
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F1419' }}>
          <ActivityIndicator size="large" color="#27AE60" />
          <Text style={{ color: '#FFFFFF', marginTop: 16 }}>Loading...</Text>
        </View>
      }>
        <MobileApp />
      </Suspense>
    );
  }

  return (
    <WebThemeProvider>
      <WebRouter />
    </WebThemeProvider>
  );
}
