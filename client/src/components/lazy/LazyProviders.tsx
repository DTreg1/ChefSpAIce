/**
 * Lazy-loaded components for performance optimization
 * Only non-critical visual components are lazy loaded to avoid breaking functionality
 */

import { lazy, Suspense } from "react";
import { useLocation } from "wouter";

// Lazy load heavy visual component (handling named export)
const AnimatedBackground = lazy(() =>
  import("@/components/animated-background").then((module) => ({
    default: module.AnimatedBackground,
  })),
);

export function LazyAnimatedBackground() {
  const [location] = useLocation();

  // Only load on chat/home page
  if (location !== "/" && location !== "/chat") {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <AnimatedBackground
        variant="both"
        gradientType="primary"
        particleCount={1000}
      />
    </Suspense>
  );
}
