/**
 * Rate Limiting Middleware
 *
 * Centralizes rate limiting configuration and middleware for the application.
 * Provides different rate limiting strategies for various API endpoints.
 */

import type { Request, Response, NextFunction } from "express";
import rateLimiters from "./rateLimit";

// Re-export the main rateLimiters object
export { default as rateLimiters } from "./rateLimit";

/**
 * Standard API rate limiter
 * For general API endpoints with moderate usage
 */
export const apiRateLimiter = rateLimiters.general.middleware();

/**
 * Strict rate limiter
 * For expensive operations or sensitive endpoints
 */
export const strictRateLimiter = rateLimiters.expensive.middleware();

/**
 * Authentication rate limiter
 * For login, registration, and password reset endpoints
 */
export const authRateLimiter = rateLimiters.expensive.middleware();

/**
 * AI/OpenAI rate limiter
 * For AI-powered endpoints that consume external API credits
 */
export const aiRateLimiter = rateLimiters.openai.middleware();

/**
 * Chat rate limiter
 * Specific rate limiter for chat/messaging endpoints
 */
export const chatRateLimiter = rateLimiters.openai.middleware();

/**
 * Analytics rate limiter
 * For analytics and reporting endpoints
 */
export const analyticsRateLimiter = rateLimiters.general.middleware();

/**
 * Barcode rate limiter
 * For barcode scanning/generation endpoints
 */
export const barcodeRateLimiter = rateLimiters.expensive.middleware();

/**
 * Custom rate limiter factory
 *
 * Creates a custom rate limiter with specified configuration.
 * Useful for endpoints with unique rate limiting requirements.
 *
 * @param options - Rate limiting configuration
 * @returns Express middleware function
 *
 * @example
 * const uploadLimiter = createCustomRateLimiter({
 *   windowMs: 15 * 60 * 1000, // 15 minutes
 *   max: 5, // 5 uploads per window
 *   message: 'Too many uploads, please try again later'
 * });
 */
export function createCustomRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) {
  // Import the createRateLimiter function from the base rateLimit module
  const { createRateLimiter } = require("./rateLimit");

  // Create a new rate limiter with the provided options
  const customLimiter = createRateLimiter({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || "Too many requests, please try again later",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
  });

  return customLimiter.middleware();
}

/**
 * Dynamic rate limiter
 *
 * Applies different rate limits based on user type or request properties.
 * Premium users might get higher limits, for example.
 *
 * @param getLimit - Function to determine rate limit based on request
 * @returns Express middleware function
 *
 * @example
 * const dynamicLimiter = createDynamicRateLimiter(async (req) => {
 *   const user = await getUserFromRequest(req);
 *   return user?.isPremium ? 1000 : 100; // Premium users get 10x limit
 * });
 */
export function createDynamicRateLimiter(
  getLimit: (req: Request) => Promise<number> | number,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = await getLimit(req);

      // Apply the appropriate limiter based on the limit
      if (limit > 500) {
        return rateLimiters.general.middleware()(req, res, next);
      } else if (limit > 100) {
        return rateLimiters.expensive.middleware()(req, res, next);
      } else {
        return rateLimiters.openai.middleware()(req, res, next);
      }
    } catch (error) {
      console.error("Error in dynamic rate limiter:", error);
      // Fall back to strict limiter on error
      return rateLimiters.expensive.middleware()(req, res, next);
    }
  };
}

/**
 * Bypass rate limiter for specific conditions
 *
 * Allows bypassing rate limits for certain requests (e.g., admin users).
 *
 * @param shouldBypass - Function to determine if rate limit should be bypassed
 * @param limiter - The rate limiter to apply if not bypassed
 * @returns Express middleware function
 *
 * @example
 * const conditionalLimiter = bypassRateLimiter(
 *   async (req) => {
 *     const user = await getUserFromRequest(req);
 *     return user?.isAdmin === true;
 *   },
 *   aiRateLimiter
 * );
 */
export function bypassRateLimiter(
  shouldBypass: (req: Request) => Promise<boolean> | boolean,
  limiter: (req: Request, res: Response, next: NextFunction) => void,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bypass = await shouldBypass(req);
      if (bypass) {
        return next();
      }
      return limiter(req, res, next);
    } catch (error) {
      console.error("Error checking rate limit bypass:", error);
      // Apply rate limit on error
      return limiter(req, res, next);
    }
  };
}

/**
 * Compose multiple rate limiters
 *
 * Applies multiple rate limiters in sequence.
 * Useful for endpoints that need both general and specific limits.
 *
 * @param limiters - Array of rate limiter middleware functions
 * @returns Express middleware function
 *
 * @example
 * const combinedLimiter = composeRateLimiters([
 *   apiRateLimiter,    // General API limit
 *   aiRateLimiter      // Additional AI-specific limit
 * ]);
 */
export function composeRateLimiters(
  limiters: Array<(req: Request, res: Response, next: NextFunction) => void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    let index = 0;

    function runNext(): void {
      if (index >= limiters.length) {
        return next();
      }

      const currentLimiter = limiters[index++];
      currentLimiter(req, res, runNext);
    }

    runNext();
  };
}
