export * from "./auth.middleware";
export * from "./error.middleware";
export * from "./validation.middleware";

// Import and re-export from the newer rate limit implementation
import rateLimiters, { createRateLimiter } from "./rateLimit";
export { rateLimiters, createRateLimiter };

// Export specific rate limiters as middleware for backwards compatibility
export const apiRateLimit = rateLimiters.general.middleware();
export const analyticsRateLimit = rateLimiters.general.middleware();
export const authRateLimit = rateLimiters.expensive.middleware();
export const strictRateLimit = rateLimiters.expensive.middleware();