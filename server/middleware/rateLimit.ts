import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
  keyGenerator?: (req: Request) => string;
}

class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(private options: RateLimitOptions) {
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }
  
  private cleanup() {
    const now = Date.now();
    for (const [key, data] of Array.from(this.requests.entries())) {
      if (data.resetTime < now) {
        this.requests.delete(key);
      }
    }
  }
  
  private getKey(req: Request): string {
    if (this.options.keyGenerator) {
      return this.options.keyGenerator(req);
    }
    // Default: rate limit per user
    return req.user?.claims?.sub || req.ip || 'anonymous';
  }
  
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = this.getKey(req);
      const now = Date.now();
      
      let requestData = this.requests.get(key);
      
      if (!requestData || requestData.resetTime < now) {
        // Create new window
        requestData = {
          count: 1,
          resetTime: now + this.options.windowMs
        };
        this.requests.set(key, requestData);
        return next();
      }
      
      if (requestData.count >= this.options.maxRequests) {
        const retryAfter = Math.ceil((requestData.resetTime - now) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        res.setHeader('X-RateLimit-Limit', String(this.options.maxRequests));
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', new Date(requestData.resetTime).toISOString());
        
        return res.status(429).json({
          error: this.options.message || 'Too many requests, please try again later.',
          retryAfter
        });
      }
      
      requestData.count++;
      res.setHeader('X-RateLimit-Limit', String(this.options.maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(this.options.maxRequests - requestData.count));
      res.setHeader('X-RateLimit-Reset', new Date(requestData.resetTime).toISOString());
      
      next();
    };
  }
}

// Rate limit presets for different API types
export const rateLimiters = {
  // USDA API: 1000 requests per hour per user
  usda: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1000,
    message: 'USDA API rate limit exceeded. Please wait before making more nutrition queries.'
  }),
  
  // Barcode Lookup: 500 requests per hour per user
  barcode: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour  
    maxRequests: 500,
    message: 'Barcode lookup rate limit exceeded. Please wait before scanning more items.'
  }),
  
  // OpenAI: 100 requests per hour per user
  openai: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100,
    message: 'AI assistant rate limit exceeded. Please wait before making more requests.'
  }),
  
  // General API: 1000 requests per 15 minutes per user
  general: new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    message: 'API rate limit exceeded. Please slow down your requests.'
  }),
  
  // Strict rate limit for expensive operations
  expensive: new RateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    message: 'This operation is resource-intensive. Please wait before trying again.'
  })
};

// Helper function to create custom rate limiters
export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  return new RateLimiter(options);
}

export default rateLimiters;