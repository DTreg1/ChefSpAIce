import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

interface WebRouterContextType {
  currentPath: string;
  navigate: (path: string) => void;
  goBack: () => void;
}

const WebRouterContext = createContext<WebRouterContextType | undefined>(
  undefined
);

function normalizePath(path: string): string {
  return path === "" ? "/" : path;
}

export function WebRouterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return normalizePath(window.location.pathname);
    }
    return "/";
  });

  const isNavigatingRef = useRef(false);

  useEffect(() => {
    const handlePopState = (_event: PopStateEvent) => {
      const newPath = normalizePath(window.location.pathname);
      isNavigatingRef.current = true;
      setCurrentPath(newPath);
      window.scrollTo(0, 0);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const syncedPath = normalizePath(window.location.pathname);
    if (syncedPath !== currentPath && !isNavigatingRef.current) {
      setCurrentPath(syncedPath);
    }
    isNavigatingRef.current = false;
  }, [currentPath]);

  const navigate = useCallback((path: string) => {
    const normalizedPath = normalizePath(path);
    if (normalizedPath === currentPath) return;
    window.history.pushState({ path: normalizedPath }, "", normalizedPath);
    isNavigatingRef.current = true;
    setCurrentPath(normalizedPath);
    window.scrollTo(0, 0);
  }, [currentPath]);

  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  return (
    <WebRouterContext.Provider value={{ currentPath, navigate, goBack }}>
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

export function useGoBack(): () => void {
  const context = useContext(WebRouterContext);
  if (!context) {
    throw new Error("useGoBack must be used within WebRouterProvider");
  }
  return context.goBack;
}

interface RouteProps {
  path: string;
  component: React.ComponentType;
}

export function Route({ path, component: Component }: RouteProps) {
  const currentPath = useRoute();
  if (currentPath !== path) return null;
  return <Component />;
}

interface LinkProps {
  to: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  'data-testid'?: string;
}

export function Link({ to, children, style, className, 'data-testid': testId }: LinkProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate(to);
  };

  return (
    <a
      href={to}
      onClick={handleClick}
      style={style}
      className={className}
      data-testid={testId}
    >
      {children}
    </a>
  );
}
