export * from "./oauth.middleware";
export * from "./error.middleware";
export * from "./validation.middleware";

// Import and re-export from the newer rate limit implementation
export { default as rateLimiters, createRateLimiter } from "./rateLimit";

// Export specific rate limiters as middleware for backwards compatibility
// Import default rateLimiters directly for the middleware exports
import rateLimitersInternal from "./rateLimit";
export const apiRateLimit = rateLimitersInternal.general.middleware();
export const analyticsRateLimit = rateLimitersInternal.general.middleware(); 
export const authRateLimit = rateLimitersInternal.expensive.middleware();
export const strictRateLimit = rateLimitersInternal.expensive.middleware();