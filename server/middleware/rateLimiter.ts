import { Request, Response, NextFunction } from "express";
import { RateLimitError } from "./errorHandler";

/**
 * Rate limit configuration for different endpoint groups
 */
interface RateLimitConfig {
  maxRequests: number;  // Maximum number of requests
  windowMs: number;     // Time window in milliseconds
  skipSuccessfulRequests?: boolean;  // Don't count successful requests
  skipFailedRequests?: boolean;      // Don't count failed requests
}

/**
 * Request record for sliding window tracking
 */
interface RequestRecord {
  timestamp: number;
  endpoint?: string;
}

/**
 * Default rate limit configurations for different endpoint groups
 */
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Strict limits for barcode API (expensive external API calls)
  barcode: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 requests per minute
  },
  
  // Moderate limit for chat API (OpenAI API calls)
  chat: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 30 requests per minute
  },
  
  // Generous limit for general API endpoints
  general: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 requests per minute
  },
  
  // Very generous limit for read operations
  read: {
    maxRequests: 200,
    windowMs: 60 * 1000, // 200 requests per minute
  },
  
  // Strict limit for write operations
  write: {
    maxRequests: 50,
    windowMs: 60 * 1000, // 50 requests per minute
  },
  
  // Very strict limit for authentication attempts
  auth: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 5 attempts per minute
  }
};

/**
 * In-memory storage for rate limiting with sliding window
 * Key is identifier (userId or IP), value is array of request timestamps
 */
class RateLimitStore {
  private store: Map<string, RequestRecord[]> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    // Run cleanup every minute to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }
  
  /**
   * Get request records for a specific identifier
   */
  getRecords(identifier: string): RequestRecord[] {
    return this.store.get(identifier) || [];
  }
  
  /**
   * Add a new request record
   */
  addRecord(identifier: string, record: RequestRecord): void {
    const records = this.getRecords(identifier);
    records.push(record);
    this.store.set(identifier, records);
  }
  
  /**
   * Clean expired records within a time window
   */
  cleanRecords(identifier: string, windowMs: number): RequestRecord[] {
    const now = Date.now();
    const records = this.getRecords(identifier);
    const validRecords = records.filter(record => 
      now - record.timestamp < windowMs
    );
    
    if (validRecords.length === 0) {
      this.store.delete(identifier);
      return [];
    }
    
    this.store.set(identifier, validRecords);
    return validRecords;
  }
  
  /**
   * Cleanup all expired entries to prevent memory leaks
   */
  private cleanupCount = 0;
  
  cleanup(): void {
    const now = Date.now();
    const maxWindowMs = Math.max(...Object.values(RATE_LIMIT_CONFIGS).map(c => c.windowMs));
    
    for (const [identifier, records] of Array.from(this.store.entries())) {
      const validRecords = records.filter((record: RequestRecord) => 
        now - record.timestamp < maxWindowMs
      );
      
      if (validRecords.length === 0) {
        this.store.delete(identifier);
      } else {
        this.store.set(identifier, validRecords);
      }
    }
    
    // Log cleanup stats in development but only every 10 cleanups (every 10 minutes)
    // to reduce log noise
    this.cleanupCount++;
    if (process.env.NODE_ENV === "development" && this.cleanupCount % 10 === 0) {
      console.log(`[RateLimiter] Periodic cleanup: ${this.store.size} active identifiers`);
      this.cleanupCount = 0; // Reset counter to prevent overflow
    }
  }
  
  /**
   * Get statistics for monitoring
   */
  getStats(): { identifiers: number; totalRecords: number } {
    let totalRecords = 0;
    for (const records of Array.from(this.store.values())) {
      totalRecords += records.length;
    }
    return {
      identifiers: this.store.size,
      totalRecords
    };
  }
  
  /**
   * Destroy the store and cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Global rate limit store instance
const rateLimitStore = new RateLimitStore();

/**
 * Get identifier for rate limiting (userId if authenticated, otherwise IP)
 */
function getIdentifier(req: Request): string {
  // Use userId if authenticated
  const userId = (req as any).user?.claims?.sub;
  if (userId) {
    return `user:${userId}`;
  }
  
  // Fallback to IP address
  // Handle various proxy headers
  const forwardedFor = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  
  let ip: string;
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    ip = (forwardedFor as string).split(',')[0].trim();
  } else if (realIp) {
    ip = realIp as string;
  } else {
    ip = req.ip || req.socket.remoteAddress || 'unknown';
  }
  
  return `ip:${ip}`;
}

/**
 * Determine which rate limit config to use based on the endpoint
 */
function getRateLimitConfig(req: Request): RateLimitConfig {
  const path = req.path.toLowerCase();
  const method = req.method.toUpperCase();
  
  // Check for barcode endpoints (most restrictive)
  if (path.includes('/api/barcodelookup/')) {
    return RATE_LIMIT_CONFIGS.barcode;
  }
  
  // Check for chat endpoints
  if (path.includes('/api/chat')) {
    return RATE_LIMIT_CONFIGS.chat;
  }
  
  // Check for auth endpoints (login/signup/password reset)
  if (path.includes('/auth/login') || path.includes('/auth/signup') || path.includes('/auth/password') || path.includes('/auth/reset')) {
    return RATE_LIMIT_CONFIGS.auth;
  }
  
  // Check for write operations (POST, PUT, PATCH, DELETE)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return RATE_LIMIT_CONFIGS.write;
  }
  
  // Check for read operations (GET)
  if (method === 'GET') {
    return RATE_LIMIT_CONFIGS.read;
  }
  
  // Default to general limits
  return RATE_LIMIT_CONFIGS.general;
}

/**
 * Calculate retry-after value in seconds
 */
function calculateRetryAfter(records: RequestRecord[], windowMs: number): number {
  if (records.length === 0) {
    return Math.ceil(windowMs / 1000);
  }
  
  // Find the oldest record within the window
  const oldestRecord = records[0];
  const now = Date.now();
  const timeUntilOldestExpires = windowMs - (now - oldestRecord.timestamp);
  
  // Return seconds until the oldest request expires
  return Math.max(1, Math.ceil(timeUntilOldestExpires / 1000));
}

/**
 * Create rate limiter middleware with custom configuration
 */
export function createRateLimiter(customConfig?: Partial<RateLimitConfig>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = getIdentifier(req);
    const config = customConfig ? { ...RATE_LIMIT_CONFIGS.general, ...customConfig } : getRateLimitConfig(req);
    
    // Clean and get valid records within the window
    const records = rateLimitStore.cleanRecords(identifier, config.windowMs);
    
    // Check if limit is exceeded
    if (records.length >= config.maxRequests) {
      const retryAfter = calculateRetryAfter(records, config.windowMs);
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + retryAfter * 1000).toISOString());
      res.setHeader('Retry-After', retryAfter.toString());
      
      // Log rate limit hit
      console.warn(`[RateLimiter] Rate limit exceeded for ${identifier} on ${req.path}`);
      
      // Pass error to error handler middleware
      const error = RateLimitError(
        `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
        {
          limit: config.maxRequests,
          windowMs: config.windowMs,
          retryAfter,
          endpoint: req.path
        }
      );
      return next(error);
    }
    
    // Add current request to records
    rateLimitStore.addRecord(identifier, {
      timestamp: Date.now(),
      endpoint: req.path
    });
    
    // Set rate limit headers
    const remaining = config.maxRequests - records.length - 1;
    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining).toString());
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + config.windowMs).toISOString());
    
    next();
  };
}

/**
 * Default rate limiter middleware using automatic configuration
 */
export const rateLimiter = createRateLimiter();

/**
 * Strict rate limiter for expensive operations
 */
export const strictRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 1000
});

/**
 * Custom rate limiters for specific use cases
 */
export const barcodeRateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.barcode);
export const chatRateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.chat);
export const authRateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.auth);

/**
 * Get rate limit statistics (useful for monitoring)
 */
export function getRateLimitStats() {
  return rateLimitStore.getStats();
}

/**
 * Cleanup function for graceful shutdown
 */
export function cleanupRateLimiter() {
  rateLimitStore.destroy();
}