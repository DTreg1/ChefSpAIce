/**
 * Rate Limiting Middleware
 * 
 * In-memory rate limiter for protecting API endpoints from abuse.
 * Tracks request counts per client (by IP or custom key) within fixed time windows.
 * 
 * Features:
 * - Configurable rate limits (requests per time window)
 * - Custom key generation (IP, user ID, or custom logic)
 * - Pre-configured limiters for common use cases
 * - Automatic cleanup of expired entries
 * - Detailed error responses with retry-after information
 * 
 * Implementation:
 * - In-memory Map storage (not distributed)
 * - Fixed window algorithm (resets at window expiry)
 * - Periodic cleanup to prevent memory leaks
 * - 429 Too Many Requests response on limit exceeded
 * 
 * Pre-configured Limiters:
 * - apiRateLimit: 60 requests/minute (general API)
 * - analyticsRateLimit: 60 requests/minute (analytics)
 * - authRateLimit: 5 requests/15 minutes (authentication)
 * - strictRateLimit: 10 requests/minute (sensitive endpoints)
 * 
 * Scaling Considerations:
 * - In-memory: Does not work across multiple instances
 * - Consider Redis-based rate limiter for production
 * - Current implementation suitable for single-instance deployments
 * 
 * @module server/middleware/rateLimit.middleware
 */

import type { Request, Response, NextFunction } from "express";

/**
 * Rate limiter configuration options
 */
interface RateLimitOptions {
  windowMs: number;                              // Time window in milliseconds
  maxRequests: number;                           // Max requests per window
  keyGenerator?: (req: Request) => string;       // Custom key function (default: IP)
  message?: string;                              // Custom error message
}

/**
 * Rate Limiter Implementation
 * 
 * Tracks request counts in memory with automatic cleanup.
 * Uses fixed window algorithm (counter resets when window expires).
 * 
 * Algorithm Trade-offs:
 * - Fixed window: Simple, memory-efficient, but allows bursts at window boundaries
 * - Sliding window: More accurate but more complex (not implemented here)
 * 
 * @private
 */
class RateLimiter {
  private limitMap = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;

  /**
   * Initialize rate limiter with options
   * 
   * @param options - Rate limit configuration
   * 
   * Cleanup Strategy:
   * - Runs every windowMs milliseconds
   * - Removes entries with expired resetTime
   * - Prevents memory leaks from inactive clients
   */
  constructor(private options: RateLimitOptions) {
    // Cleanup old entries periodically
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];
      this.limitMap.forEach((value, key) => {
        if (value.resetTime < now) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.limitMap.delete(key));
    }, this.options.windowMs);
  }

  /**
   * Rate limiting middleware
   * 
   * Tracks requests and enforces limits per client.
   * 
   * @param req - Express request
   * @param res - Express response
   * @param next - Next middleware function
   * 
   * Rate Limiting Logic:
   * 1. Generate key (IP or custom)
   * 2. Check if key exists in limitMap
   * 3. If within window and at limit → 429 error
   * 4. If within window and under limit → increment count
   * 5. If window expired → reset count and window
   * 6. If new key → initialize tracking
   * 
   * Response Headers (on 429):
   * - Status: 429 Too Many Requests
   * - Body: { error: message, retryAfter: seconds }
   * 
   * Algorithm:
   * - Fixed window (simple but allows bursts at boundaries)
   * - Each key tracks: count, resetTime
   * - Window resets when resetTime < now (hard reset, not sliding)
   */
  middleware = (req: Request, res: Response, next: NextFunction) => {
    const key = this.options.keyGenerator
      ? this.options.keyGenerator(req)
      : (req.ip || req.connection.remoteAddress || 'unknown');
    
    const now = Date.now();
    const rateInfo = this.limitMap.get(key);
    
    if (rateInfo) {
      if (rateInfo.resetTime > now) {
        if (rateInfo.count >= this.options.maxRequests) {
          return res.status(429).json({ 
            error: this.options.message || 'Too many requests. Please slow down.',
            retryAfter: Math.ceil((rateInfo.resetTime - now) / 1000)
          });
        }
        rateInfo.count++;
      } else {
        // Reset window
        rateInfo.count = 1;
        rateInfo.resetTime = now + this.options.windowMs;
      }
    } else {
      // First request from this key
      this.limitMap.set(key, { 
        count: 1, 
        resetTime: now + this.options.windowMs 
      });
    }
    
    next();
  };

  /**
   * Cleanup and destroy rate limiter
   * 
   * Stops periodic cleanup interval.
   * Call when shutting down server to prevent memory leaks.
   */
  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

/**
 * Create custom rate limiter middleware
 * 
 * Factory function for creating rate limiters with custom configuration.
 * 
 * @param options - Rate limit configuration
 * @returns Express middleware function
 * 
 * @example
 * // Custom rate limiter
 * const uploadLimiter = createRateLimiter({
 *   windowMs: 60000,  // 1 minute
 *   maxRequests: 5,   // 5 uploads per minute
 *   keyGenerator: (req) => req.user?.claims?.sub || req.ip,
 *   message: 'Too many uploads. Please wait.'
 * });
 * 
 * app.post('/api/upload', uploadLimiter, uploadHandler);
 * 
 * @example
 * // Per-user rate limiting
 * const userLimiter = createRateLimiter({
 *   windowMs: 3600000,    // 1 hour
 *   maxRequests: 1000,    // 1000 requests per hour
 *   keyGenerator: (req) => {
 *     return req.user?.claims?.sub || req.ip;
 *   }
 * });
 */
export function createRateLimiter(options: RateLimitOptions) {
  const limiter = new RateLimiter(options);
  return limiter.middleware;
}

/**
 * Pre-configured rate limiters for common use cases
 * 
 * Ready-to-use middleware for standard rate limiting patterns.
 * Apply directly to routes without configuration.
 * 
 * @example
 * import { apiRateLimit, authRateLimit } from './rateLimit.middleware';
 * 
 * // Protect general API endpoints
 * app.use('/api/', apiRateLimit);
 * 
 * // Strict limit on auth endpoints
 * app.post('/api/login', authRateLimit, loginHandler);
 */

/**
 * General API rate limiter
 * 
 * Configuration: 60 requests per minute
 * Use for: Most API endpoints
 */
export const apiRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 60,
  message: 'Too many API requests. Please slow down.',
});

/**
 * Analytics rate limiter
 * 
 * Configuration: 60 requests per minute
 * Use for: Analytics and metrics endpoints
 */
export const analyticsRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 60,
  message: 'Too many analytics requests. Please slow down.',
});

/**
 * Authentication rate limiter
 * 
 * Configuration: 5 requests per 15 minutes
 * Use for: Login, signup, password reset endpoints
 * Key: IP + ':auth' (separate from general API limits)
 * 
 * Security:
 * - Prevents brute force attacks
 * - Separate key space from API limits
 * - Stricter limits for auth endpoints
 */
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many authentication attempts. Please try again later.',
  keyGenerator: (req) => req.ip + ':auth',
});

/**
 * Strict rate limiter
 * 
 * Configuration: 10 requests per minute
 * Use for: Sensitive or expensive operations
 * Examples: Exports, bulk operations, AI generation
 */
export const strictRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 10,
  message: 'Rate limit exceeded.',
});