// Authentication and OAuth
export * from "./oauth.middleware";
export * from "./auth.middleware";

// Role-Based Access Control
export * from "./rbac.middleware";

// Error handling
export * from "./error.middleware";

// Validation
export * from "./validation.middleware";

// Rate limiting
export * from "./rate-limit.middleware";

// Circuit breakers
export * from "./circuit-breaker.middleware";

// Legacy exports for backwards compatibility
export { default as rateLimiters, createRateLimiter } from "./rateLimit";
import rateLimitersInternal from "./rateLimit";
export const apiRateLimit = rateLimitersInternal.general.middleware();
export const analyticsRateLimit = rateLimitersInternal.general.middleware(); 
export const authRateLimit = rateLimitersInternal.expensive.middleware();
export const strictRateLimit = rateLimitersInternal.expensive.middleware();