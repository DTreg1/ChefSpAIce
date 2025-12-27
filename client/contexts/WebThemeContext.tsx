import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "light" | "dark";

interface WebThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const WebThemeContext = createContext<WebThemeContextType | undefined>(undefined);

export function WebThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("chefspaice-theme");
      if (stored === "light" || stored === "dark") return stored;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("chefspaice-theme", theme);
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <WebThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </WebThemeContext.Provider>
  );
}

export function useWebTheme() {
  const context = useContext(WebThemeContext);
  if (!context) {
    throw new Error("useWebTheme must be used within a WebThemeProvider");
  }
  return context;
}
