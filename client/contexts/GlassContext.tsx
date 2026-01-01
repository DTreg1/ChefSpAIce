import React, { createContext, useContext } from "react";

interface GlassContextValue {
  isOnGlass: boolean;
}

export const GlassContext = createContext<GlassContextValue>({
  isOnGlass: false,
});

export function useGlassContext() {
  return useContext(GlassContext);
}

export function GlassProvider({ children }: { children: React.ReactNode }) {
  return (
    <GlassContext.Provider value={{ isOnGlass: true }}>
      {children}
    </GlassContext.Provider>
  );
}
