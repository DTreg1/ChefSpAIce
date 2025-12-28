import React from "react";
import LandingScreen from "@/screens/LandingScreen";
import AboutPage from "@/screens/About";
import PrivacyPolicyPage from "@/screens/Privacy";
import TermsOfServicePage from "@/screens/Terms";
import AttributionsPage from "@/screens/Attributions";
import SupportPage from "@/screens/Support";
import { WebThemeProvider } from "@/contexts/WebThemeContext";
import App from "./App";

const getSkipLanding = (): boolean => {
  try {
    const meta = import.meta as { env?: Record<string, string> };
    if (meta.env?.VITE_SKIP_LANDING === "true") return true;
  } catch {}
  try {
    if ((globalThis as any).process?.env?.SKIP_LANDING === "true") return true;
  } catch {}
  return false;
};
const SKIP_LANDING = getSkipLanding();

function WebApp() {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";

  if (SKIP_LANDING) {
    return <App />;
  }

  const getPage = () => {
    switch (path) {
      case "/about":
        return <AboutPage />;
      case "/privacy":
        return <PrivacyPolicyPage />;
      case "/terms":
        return <TermsOfServicePage />;
      case "/attributions":
        return <AttributionsPage />;
      case "/support":
        return <SupportPage />;
      default:
        return <LandingScreen />;
    }
  };

  return <WebThemeProvider>{getPage()}</WebThemeProvider>;
}

export default WebApp;
