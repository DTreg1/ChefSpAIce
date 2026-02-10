import React, { createContext, useContext, useEffect, useState } from "react";

interface WebRouterContextType {
  currentPath: string;
  navigate: (path: string) => void;
}

const WebRouterContext = createContext<WebRouterContextType | undefined>(
  undefined
);

export function WebRouterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      return pathname === "" ? "/" : pathname;
    }
    return "/";
  });

  useEffect(() => {
    const handlePopState = () => {
      const newPath =
        window.location.pathname === "" ? "/" : window.location.pathname;
      setCurrentPath(newPath);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (path: string) => {
    const normalizedPath = path === "" ? "/" : path;
    window.history.pushState({}, "", normalizedPath);
    setCurrentPath(normalizedPath);
  };

  return (
    <WebRouterContext.Provider value={{ currentPath, navigate }}>
      {children}
    </WebRouterContext.Provider>
  );
}

export function useRoute(): string {
  const context = useContext(WebRouterContext);
  if (!context) {
    throw new Error("useRoute must be used within WebRouterProvider");
  }
  return context.currentPath;
}

export function useNavigate(): (path: string) => void {
  const context = useContext(WebRouterContext);
  if (!context) {
    throw new Error("useNavigate must be used within WebRouterProvider");
  }
  return context.navigate;
}
