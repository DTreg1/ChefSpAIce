/**
 * =============================================================================
 * DEVELOPMENT LOGGER UTILITY
 * =============================================================================
 *
 * Provides logging functions that only output in development mode.
 * In production builds, all logs are silently suppressed to:
 * - Reduce bundle size impact
 * - Improve performance
 * - Prevent sensitive data leakage
 *
 * USAGE:
 * import { logger } from "@/lib/logger";
 * logger.log("[Storage] Saving item...");
 * logger.warn("Something might be wrong");
 * logger.error("Something failed", error);
 *
 * @module lib/logger
 */

const isDev = __DEV__;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  error: (...args: unknown[]) => {
    // Always log errors, even in production, for crash reporting
    console.error(...args);
  },

  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log("[DEBUG]", ...args);
    }
  },

  info: (...args: unknown[]) => {
    if (isDev) {
      console.log("[INFO]", ...args);
    }
  },
};

export default logger;
