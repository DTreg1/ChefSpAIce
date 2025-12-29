import { useEffect, useState, useSyncExternalStore } from "react";

const THEME_STORAGE_KEY = "chefspaice-theme";

function getStoredTheme(): "light" | "dark" | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return null;
}

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getTheme(): "light" | "dark" {
  return getStoredTheme() ?? getSystemPreference();
}

function subscribe(callback: () => void): () => void {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  
  const handleChange = () => callback();
  
  mediaQuery.addEventListener("change", handleChange);
  window.addEventListener("storage", handleChange);
  
  return () => {
    mediaQuery.removeEventListener("change", handleChange);
    window.removeEventListener("storage", handleChange);
  };
}

function getServerSnapshot(): "light" | "dark" {
  return "dark";
}

export function useColorScheme(): "light" | "dark" {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerSnapshot);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);
  
  return theme;
}
