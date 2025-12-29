import { useState, useEffect } from "react";
import { WebThemeProvider } from "@/contexts/WebThemeContext";
import LandingScreen from "@/screens/LandingScreen";
import AboutScreen from "@/screens/web/AboutScreen";
import PrivacyScreen from "@/screens/web/PrivacyScreen";
import TermsScreen from "@/screens/web/TermsScreen";
import AttributionsScreen from "@/screens/web/AttributionsScreen";
import SupportScreen from "@/screens/web/SupportScreen";
import Constants from "expo-constants";
import MobileApp from "./NativeApp";

const SKIP_LANDING = Constants.expoConfig?.extra?.skipLanding === true || 
                     process.env.EXPO_PUBLIC_SKIP_LANDING === "true" || 
                     process.env.EXPO_PUBLIC_SKIP_LANDING === "1";

type WebRoute = "/" | "/about" | "/privacy" | "/terms" | "/attributions" | "/support";

function getRouteFromPath(pathname: string): WebRoute {
  const normalized = pathname.toLowerCase();
  if (normalized === "/about") return "/about";
  if (normalized === "/privacy") return "/privacy";
  if (normalized === "/terms") return "/terms";
  if (normalized === "/attributions") return "/attributions";
  if (normalized === "/support") return "/support";
  return "/";
}

function WebRouter() {
  const [route, setRoute] = useState<WebRoute>(() => 
    getRouteFromPath(typeof window !== "undefined" ? window.location.pathname : "/")
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
      if (anchor.href.startsWith("mailto:") || anchor.href.startsWith("tel:")) return;

      try {
        const url = new URL(anchor.href);
        if (url.origin !== window.location.origin) return;
        
        const newRoute = getRouteFromPath(url.pathname);
        if (["/", "/about", "/privacy", "/terms", "/attributions", "/support"].includes(newRoute)) {
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
    default:
      return <LandingScreen />;
  }
}

export default function App() {
  if (SKIP_LANDING) {
    return <MobileApp />;
  }
  
  return (
    <WebThemeProvider>
      <WebRouter />
    </WebThemeProvider>
  );
}
