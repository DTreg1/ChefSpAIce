/**
 * Cache Control Middleware
 * 
 * Optimizes API response caching with HTTP Cache-Control headers and ETag support.
 * Provides pre-configured caching strategies for common use cases.
 * 
 * Features:
 * - Flexible cache control header configuration
 * - Pre-configured strategies (noCache, privateShort, publicLong, etc.)
 * - ETag generation for conditional requests
 * - 304 Not Modified responses for unchanged data
 * - Stale-while-revalidate support for better UX
 * 
 * Cache Control Directives:
 * - public: Cacheable by browsers and CDNs
 * - private: Cacheable by browser only (user-specific data)
 * - max-age: Cache lifetime in seconds
 * - no-cache: Force revalidation with server
 * - immutable: Content never changes (safe to cache forever)
 * - stale-while-revalidate: Serve stale content while fetching fresh
 * 
 * Pre-configured Strategies:
 * - noCache: No caching for sensitive/dynamic data
 * - privateShort: Browser cache for 1 minute (user data)
 * - privateMedium: Browser cache for 5 minutes (user data)
 * - publicLong: Public cache for 1 hour (shared data)
 * - immutable: Forever cache for static assets
 * - realtime: No cache for real-time data
 * - metrics: 5-minute cache for analytics
 * 
 * ETag Support:
 * - MD5 hash of response data
 * - Enables 304 Not Modified responses
 * - Reduces bandwidth and improves performance
 * 
 * @module server/middleware/cache.middleware
 */

import { Request, Response, NextFunction } from "express";
import * as crypto from "crypto";

/**
 * Cache control configuration options
 */
interface CacheOptions {
  maxAge?: number;                  // Max age in seconds (how long to cache)
  private?: boolean;                // true = browser only, false = browser + CDN
  noCache?: boolean;                // Force revalidation on every request
  immutable?: boolean;              // Content will never change (safe to cache forever)
  staleWhileRevalidate?: number;    // Serve stale while fetching fresh (seconds)
}

/**
 * Set Cache-Control headers on responses
 * 
 * Factory function that returns middleware to set cache control headers.
 * Configures caching behavior based on provided options.
 * 
 * @param options - Cache configuration options
 * @returns Express middleware that sets Cache-Control header
 * 
 * Cache Directive Selection:
 * - noCache: Overrides all other options, forces revalidation
 * - private/public: Determines cache visibility (browser vs CDN)
 * - max-age: Cache lifetime in seconds
 * - immutable: Indicates content never changes
 * - stale-while-revalidate: Serve stale during background refresh
 * 
 * Directive Priority:
 * 1. If noCache=true: Only "no-cache" directive
 * 2. Otherwise: Combine public/private, max-age, immutable, SWR
 * 
 * @example
 * // Custom cache control
 * app.get('/api/data', setCacheControl({ 
 *   private: true, 
 *   maxAge: 300 
 * }), handler);
 * 
 * @example
 * // Force revalidation
 * app.get('/api/live', setCacheControl({ noCache: true }), handler);
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
 * Pre-configured cache strategies for common use cases
 * 
 * Ready-to-use middleware for standard caching patterns.
 * Apply directly to routes without configuration.
 * 
 * Strategy Recommendations:
 * - User-specific data: privateShort or privateMedium
 * - Public shared data: publicLong
 * - Real-time feeds: realtime
 * - Static assets: immutable
 * - Analytics: metrics
 * - Sensitive data: noCache
 * 
 * @example
 * import { cacheStrategies } from './cache.middleware';
 * 
 * // Cache user profile for 5 minutes
 * app.get('/api/user/profile', cacheStrategies.privateMedium, handler);
 * 
 * // Cache static assets forever
 * app.get('/assets/*', cacheStrategies.immutable, handler);
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
 * Generate ETag for response data
 * 
 * Creates MD5 hash of JSON-stringified data for cache validation.
 * Used by handleConditionalRequests middleware.
 * 
 * @param data - Response data to hash
 * @returns ETag string in format: "hash"
 * 
 * ETag Format:
 * - Wrapped in quotes per HTTP spec
 * - MD5 hash of JSON.stringify(data)
 * - Deterministic (same data = same hash)
 * 
 * Security Note:
 * - MD5 used for speed, not security
 * - Cache validation only, not cryptographic use
 * 
 * @private
 */
export function addETag(data: unknown): string {
  const hash = crypto.createHash('md5');
  hash.update(JSON.stringify(data));
  return `"${hash.digest('hex')}"`;
}

/**
 * Handle conditional requests with ETags
 * 
 * Implements HTTP conditional requests using ETags.
 * Returns 304 Not Modified when client has current data.
 * 
 * @returns Express middleware that adds ETag support
 * 
 * How It Works:
 * 1. Intercepts res.json() calls
 * 2. Generates ETag from response data
 * 3. Compares with client's If-None-Match header
 * 4. Returns 304 if match (no body sent)
 * 5. Returns 200 with data if no match
 * 
 * Benefits:
 * - Reduces bandwidth (no body for 304)
 * - Faster response (no serialization for 304)
 * - Better UX (instant validation)
 * 
 * HTTP Headers:
 * - Response: ETag header with hash
 * - Request: If-None-Match header from client
 * - 304: Empty body with ETag header
 * 
 * Limitations:
 * - Only works with JSON responses
 * - Adds small overhead for hash generation
 * - Client must support conditional requests
 * 
 * @example
 * // Enable ETag support globally
 * app.use(handleConditionalRequests());
 * 
 * @example
 * // Enable for specific routes
 * app.get('/api/data', handleConditionalRequests(), async (req, res) => {
 *   const data = await fetchData();
 *   res.json(data); // Automatically adds ETag and handles 304
 * });
 */
export function handleConditionalRequests() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to add ETag
    res.json = function(data: unknown) {
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