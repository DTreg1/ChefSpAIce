/**
 * Haptic Feedback Utility
 *
 * Provides haptic feedback for mobile interactions using the Vibration API.
 * Gracefully degrades on devices/browsers that don't support vibration.
 */

import { logger } from "@/lib/logger";

// Check if vibration API is supported
const isVibrationSupported = () => {
  return "vibrate" in navigator;
};

export enum HapticPattern {
  // Light tap for subtle feedback
  LIGHT = "light",
  // Medium tap for standard interactions
  MEDIUM = "medium",
  // Strong tap for important actions
  STRONG = "strong",
  // Success pattern (two quick taps)
  SUCCESS = "success",
  // Error pattern (three quick bursts)
  ERROR = "error",
  // Selection pattern (single quick tap)
  SELECTION = "selection",
  // Swipe pattern (smooth vibration)
  SWIPE = "swipe",
}

// Vibration patterns in milliseconds
const PATTERNS: Record<HapticPattern, number | number[]> = {
  [HapticPattern.LIGHT]: 10,
  [HapticPattern.MEDIUM]: 20,
  [HapticPattern.STRONG]: 40,
  [HapticPattern.SUCCESS]: [10, 50, 10],
  [HapticPattern.ERROR]: [15, 30, 15, 30, 15],
  [HapticPattern.SELECTION]: 5,
  [HapticPattern.SWIPE]: 15,
};

/**
 * Trigger haptic feedback with specified pattern
 * @param pattern - The haptic pattern to trigger
 * @returns Promise that resolves when vibration completes (or immediately if unsupported)
 */
export function triggerHaptic(pattern: HapticPattern): Promise<void> {
  return new Promise((resolve) => {
    if (!isVibrationSupported()) {
      resolve();
      return;
    }

    try {
      const vibrationPattern = PATTERNS[pattern];
      navigator.vibrate(vibrationPattern);

      // Calculate duration for promise resolution
      const duration = Array.isArray(vibrationPattern)
        ? vibrationPattern.reduce((sum, val) => sum + val, 0)
        : vibrationPattern;

      setTimeout(resolve, duration);
    } catch (error) {
      // Silently fail if vibration fails
      logger.debug("Haptic feedback failed:", error);
      resolve();
    }
  });
}

/**
 * Cancel any ongoing vibration
 */
export function cancelHaptic(): void {
  if (isVibrationSupported()) {
    navigator.vibrate(0);
  }
}

/**
 * Check if device supports haptic feedback
 */
export function hasHapticSupport(): boolean {
  return isVibrationSupported();
}

/**
 * Haptic feedback for button press
 */
export function hapticButton(): void {
  void triggerHaptic(HapticPattern.LIGHT);
}

/**
 * Haptic feedback for selection/toggle
 */
export function hapticSelection(): void {
  void triggerHaptic(HapticPattern.SELECTION);
}

/**
 * Haptic feedback for successful action
 */
export function hapticSuccess(): void {
  void triggerHaptic(HapticPattern.SUCCESS);
}

/**
 * Haptic feedback for error/failure
 */
export function hapticError(): void {
  void triggerHaptic(HapticPattern.ERROR);
}

/**
 * Haptic feedback for swipe gesture
 */
export function hapticSwipe(): void {
  void triggerHaptic(HapticPattern.SWIPE);
}
