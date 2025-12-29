import { useState, useEffect } from "react";
import { WebThemeProvider } from "@/contexts/WebThemeContext";
import LandingScreen from "@/screens/LandingScreen";
import AboutScreen from "@/screens/web/AboutScreen";
import PrivacyScreen from "@/screens/web/PrivacyScreen";
import TermsScreen from "@/screens/web/TermsScreen";
import AttributionsScreen from "@/screens/web/AttributionsScreen";
import SupportScreen from "@/screens/web/SupportScreen";
import Constants from "expo-constants";

const SKIP_LANDING = Constants.expoConfig?.extra?.skipLanding === true || 
                     process.env.EXPO_PUBLIC_SKIP_LANDING === "true" || 
                     process.env.EXPO_PUBLIC_SKIP_LANDING === "1";

type WebRoute = "/" | "/about" | "/privacy" | "/terms" | "/attributions" | "/support";

function ExpoGoScreen() {
  const domain = typeof window !== "undefined" ? window.location.host : "";
  const expoUrl = `exp://${domain}`;
  
  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      maxWidth: 500,
      margin: "50px auto",
      padding: 20,
      textAlign: "center",
    }}>
      <h1 style={{ fontSize: 24, marginBottom: 10 }}>ChefSpAIce</h1>
      <p style={{ color: "#666", marginBottom: 30 }}>
        Open in Expo Go to view the mobile app
      </p>
      
      <div style={{
        background: "#f5f5f5",
        padding: 20,
        borderRadius: 8,
        marginBottom: 20,
      }}>
        <p style={{ fontSize: 14, wordBreak: "break-all", margin: 0 }}>
          <strong>Expo URL:</strong><br />
          <a href={expoUrl} style={{ color: "#007AFF" }}>{expoUrl}</a>
        </p>
      </div>
      
      <div style={{ marginTop: 30 }}>
        <a 
          href="https://expo.dev/go"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-block",
            padding: "12px 24px",
            background: "#000",
            color: "#fff",
            borderRadius: 8,
            textDecoration: "none",
          }}
        >
          Get Expo Go
        </a>
      </div>
      
      <p style={{ marginTop: 40, fontSize: 12, color: "#999" }}>
        SKIP_LANDING is enabled. Set EXPO_PUBLIC_SKIP_LANDING to "false" to see the landing page.
      </p>
    </div>
  );
}

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
    return <ExpoGoScreen />;
  }
  
  return (
    <WebThemeProvider>
      <WebRouter />
    </WebThemeProvider>
  );
}
