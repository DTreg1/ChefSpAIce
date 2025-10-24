import { lazy, Suspense } from "react";

const AnimatedBackground = lazy(() => import("../animated-background").then(module => ({
  default: module.AnimatedBackground
})));

interface LazyAnimatedBackgroundProps {
  variant?: "gradient" | "particles" | "both";
  gradientType?: "primary" | "secondary" | "vibrant" | "soft";
  particleCount?: number;
  className?: string;
  children?: React.ReactNode;
}

export function LazyAnimatedBackground(props: LazyAnimatedBackgroundProps) {
  return (
    <Suspense fallback={null}>
      <AnimatedBackground {...props} />
    </Suspense>
  );
}