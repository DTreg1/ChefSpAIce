import React from "react";
import LandingScreen from "@/screens/LandingScreen";
import AboutPage from "@/screens/About";
import PrivacyPolicyPage from "@/screens/Privacy";
import TermsOfServicePage from "@/screens/Terms";
import AttributionsPage from "@/screens/Attributions";
import SupportPage from "@/screens/Support";
import { WebThemeProvider } from "@/contexts/WebThemeContext";
import App from "./App";

declare const process: { env: Record<string, string | undefined> };
const SKIP_LANDING = process.env.SKIP_LANDING === "true";

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
