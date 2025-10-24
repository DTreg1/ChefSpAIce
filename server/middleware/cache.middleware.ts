import { Request, Response, NextFunction } from "express";

/**
 * Cache control middleware for optimizing API responses
 */

interface CacheOptions {
  maxAge?: number; // Max age in seconds
  private?: boolean; // Whether response is user-specific
  noCache?: boolean; // Force revalidation
  immutable?: boolean; // Content will never change
  staleWhileRevalidate?: number; // Serve stale while fetching fresh
}

/**
 * Set cache control headers based on options
 */
export function setCacheControl(options: CacheOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const directives: string[] = [];
    
    if (options.noCache) {
      directives.push('no-cache');
    } else {
      if (options.private) {
        directives.push('private');
      } else {
        directives.push('public');
      }
      
      if (options.maxAge !== undefined) {
        directives.push(`max-age=${options.maxAge}`);
      }
      
      if (options.immutable) {
        directives.push('immutable');
      }
      
      if (options.staleWhileRevalidate !== undefined) {
        directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
      }
    }
    
    res.setHeader('Cache-Control', directives.join(', '));
    next();
  };
}

/**
 * Pre-configured cache strategies
 */
export const cacheStrategies = {
  // No caching for sensitive/dynamic data
  noCache: setCacheControl({ noCache: true }),
  
  // Private user data - cache on browser only, short duration
  privateShort: setCacheControl({ 
    private: true, 
    maxAge: 60 // 1 minute
  }),
  
  // Private user data - cache on browser only, medium duration
  privateMedium: setCacheControl({ 
    private: true, 
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 60
  }),
  
  // Public data that changes rarely
  publicLong: setCacheControl({ 
    private: false, 
    maxAge: 3600, // 1 hour
    staleWhileRevalidate: 300
  }),
  
  // Static assets that never change
  immutable: setCacheControl({ 
    private: false, 
    maxAge: 31536000, // 1 year
    immutable: true
  }),
  
  // Real-time data that should always be fresh
  realtime: setCacheControl({ 
    noCache: true,
    private: true
  }),
  
  // Analytics and metrics - cache briefly
  metrics: setCacheControl({
    private: false,
    maxAge: 300, // 5 minutes
    staleWhileRevalidate: 60
  })
};

/**
 * Add ETag support for conditional requests
 */
export function addETag(data: any): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5');
  hash.update(JSON.stringify(data));
  return `"${hash.digest('hex')}"`;
}

/**
 * Middleware to handle conditional requests with ETags
 */
export function handleConditionalRequests() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to add ETag
    res.json = function(data: any) {
      const etag = addETag(data);
      res.setHeader('ETag', etag);
      
      // Check if client has matching ETag
      const clientETag = req.headers['if-none-match'];
      if (clientETag === etag) {
        // Data hasn't changed, return 304
        return res.status(304).end();
      }
      
      // Data changed, send new data
      return originalJson(data);
    };
    
    next();
  };
}