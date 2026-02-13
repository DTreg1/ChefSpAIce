/**
 * =============================================================================
 * SAFE GLASS EFFECT WRAPPER
 * =============================================================================
 *
 * This module provides a safe wrapper around expo-glass-effect that handles
 * iPad compatibility issues. The expo-glass-effect native module can crash
 * on iPad devices due to pointer authentication failures during TurboModule
 * initialization.
 *
 * IMPORTANT: All usage of expo-glass-effect in this app MUST go through this
 * wrapper. Direct imports from expo-glass-effect will cause iPad crashes.
 * Do NOT import from "expo-glass-effect" directly anywhere else in the codebase.
 *
 * This wrapper:
 * 1. Uses Platform.constants.interfaceIdiom for reliable iPhone detection
 * 2. NEVER loads expo-glass-effect on iPad or any non-iPhone device
 * 3. Provides fallback components when glass effects are unavailable
 * 4. Caches detection results for performance
 */

import React from "react";
import { Platform, View, ViewProps } from "react-native";
import { logger } from "@/lib/logger";

let GlassViewNative: React.ComponentType<ViewProps & { glassEffectStyle?: string; tintColor?: string; isInteractive?: boolean }> | null = null;
let isLiquidGlassAvailableNative: (() => boolean) | null = null;
let moduleLoadAttempted = false;
let cachedIsIPhone: boolean | null = null;

/**
 * Strictly detect if device is an iPhone (NOT iPad, NOT Mac Catalyst, NOT tvOS)
 * Uses Platform.constants.interfaceIdiom which is the definitive iOS device type
 *
 * interfaceIdiom values:
 * - "phone" = iPhone
 * - "pad" = iPad
 * - "tv" = Apple TV
 * - "carplay" = CarPlay
 * - "mac" = Mac Catalyst
 *
 * Only returns true for "phone" to ensure we never load glass effects on iPad
 */
function isDefinitelyIPhone(): boolean {
  // Return cached result if available
  if (cachedIsIPhone !== null) {
    return cachedIsIPhone;
  }

  // Must be iOS platform
  if (Platform.OS !== "ios") {
    cachedIsIPhone = false;
    return false;
  }

  // Use interfaceIdiom from Platform.constants - this is the definitive check
  // This value comes from UIDevice.current.userInterfaceIdiom on iOS
  const platformConstants = Platform.constants as {
    interfaceIdiom?: string;
    [key: string]: unknown;
  };

  if (platformConstants.interfaceIdiom) {
    // Only allow "phone" - anything else (pad, tv, carplay, mac) is not an iPhone
    cachedIsIPhone = platformConstants.interfaceIdiom === "phone";
    return cachedIsIPhone;
  }

  // Fallback: Check Platform.isPad if interfaceIdiom is unavailable
  // If isPad is true, this is definitely NOT an iPhone
  if ((Platform as unknown as { isPad?: boolean }).isPad === true) {
    cachedIsIPhone = false;
    return false;
  }

  // If we can't determine device type definitively, be safe and assume NOT iPhone
  // This prevents the glass effect from loading on unknown iOS device types
  cachedIsIPhone = false;
  return false;
}

/**
 * Safely attempt to load the expo-glass-effect module
 * Only called on confirmed iPhone devices
 * Returns false if loading fails for any reason
 */
function tryLoadGlassModule(): boolean {
  // Only attempt once
  if (moduleLoadAttempted) {
    return GlassViewNative !== null;
  }

  moduleLoadAttempted = true;

  // Final safety check - NEVER load on non-iPhone
  if (!isDefinitelyIPhone()) {
    return false;
  }

  try {
    const module = require("expo-glass-effect");
    isLiquidGlassAvailableNative = module.isLiquidGlassAvailable;
    GlassViewNative = module.GlassView;
    return true;
  } catch (error) {
    logger.warn("Failed to load expo-glass-effect:", error);
    return false;
  }
}

/**
 * Safe version of isLiquidGlassAvailable
 * Returns false on anything except confirmed iPhones (interfaceIdiom === "phone")
 */
export function isLiquidGlassAvailable(): boolean {
  // Strict iPhone-only check using interfaceIdiom
  if (!isDefinitelyIPhone()) {
    return false;
  }

  // Ensure module is loaded
  if (!tryLoadGlassModule()) {
    return false;
  }

  // Try to use the native function
  if (isLiquidGlassAvailableNative) {
    try {
      return isLiquidGlassAvailableNative();
    } catch (error) {
      logger.warn("Glass effect check failed:", error);
      return false;
    }
  }

  return false;
}

/**
 * Safe GlassView component
 * Falls back to a regular View on iPad and unsupported platforms
 */
export function GlassView({
  children,
  style,
  glassEffectStyle,
  tintColor,
  isInteractive,
  ...props
}: ViewProps & {
  glassEffectStyle?: "clear" | "regular";
  tintColor?: string;
  isInteractive?: boolean;
}) {
  // Check availability (handles iPhone detection via interfaceIdiom)
  if (!isLiquidGlassAvailable()) {
    return (
      <View style={style} {...props}>
        {children}
      </View>
    );
  }

  // Use the native GlassView if available
  if (GlassViewNative) {
    return (
      <GlassViewNative
        style={style}
        glassEffectStyle={glassEffectStyle}
        tintColor={tintColor}
        isInteractive={isInteractive}
        {...props}
      >
        {children}
      </GlassViewNative>
    );
  }

  // Fallback to View
  return (
    <View style={style} {...props}>
      {children}
    </View>
  );
}

/**
 * Check if we should use glass effects
 * Combines platform check and availability check
 */
export function shouldUseLiquidGlass(): boolean {
  return isLiquidGlassAvailable();
}
