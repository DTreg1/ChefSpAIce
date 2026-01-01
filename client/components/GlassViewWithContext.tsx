import React from "react";
import { GlassView as ExpoGlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { GlassProvider } from "@/contexts/GlassContext";

type GlassViewProps = React.ComponentProps<typeof ExpoGlassView>;

export function GlassView({ children, ...props }: GlassViewProps) {
  return (
    <ExpoGlassView {...props}>
      <GlassProvider>
        {children}
      </GlassProvider>
    </ExpoGlassView>
  );
}

export { isLiquidGlassAvailable };
