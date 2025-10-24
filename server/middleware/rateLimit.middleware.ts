import type { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string; // Function to generate rate limit key
  message?: string; // Custom error message
}

class RateLimiter {
  private limitMap = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;

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

  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

// Factory function for creating rate limiters
export function createRateLimiter(options: RateLimitOptions) {
  const limiter = new RateLimiter(options);
  return limiter.middleware;
}

// Pre-configured rate limiters
export const apiRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 60,
  message: 'Too many API requests. Please slow down.',
});

export const analyticsRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 60,
  message: 'Too many analytics requests. Please slow down.',
});

export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many authentication attempts. Please try again later.',
  keyGenerator: (req) => req.ip + ':auth',
});

export const strictRateLimit = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 10,
  message: 'Rate limit exceeded.',
});