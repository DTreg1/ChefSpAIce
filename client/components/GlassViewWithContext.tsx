import React from "react";
import { GlassView as SafeGlassView, isLiquidGlassAvailable } from "@/lib/glass-effect-safe";
import { GlassProvider } from "@/contexts/GlassContext";
import { ViewProps } from "react-native";

type GlassViewProps = ViewProps & {
  glassEffectStyle?: "clear" | "regular";
  tintColor?: string;
  isInteractive?: boolean;
};

export function GlassView({ children, ...props }: GlassViewProps) {
  return (
    <SafeGlassView {...props}>
      <GlassProvider>
        {children}
      </GlassProvider>
    </SafeGlassView>
  );
}

export { isLiquidGlassAvailable };
