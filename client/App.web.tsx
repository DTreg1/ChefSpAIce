import React from "react";
import LandingScreen from "@/screens/LandingScreen";
import AboutPage from "@/screens/About";
import PrivacyPolicyPage from "@/screens/Privacy";
import TermsOfServicePage from "@/screens/Terms";
import AttributionsPage from "@/screens/Attributions";
import { WebThemeProvider } from "@/contexts/WebThemeContext";

function WebApp() {
  const path = typeof window !== "undefined" ? window.location.pathname : "/";

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
      default:
        return <LandingScreen />;
    }
  };

  return <WebThemeProvider>{getPage()}</WebThemeProvider>;
}

export default WebApp;
