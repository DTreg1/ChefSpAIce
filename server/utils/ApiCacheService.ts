/**
 * Simple in-memory cache service for API responses
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl?: number;
  namespace?: string;
}

class ApiCacheServiceClass {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  /**
   * Generate a cache key from namespace and params
   */
  generateKey(namespace: string, params: any): string {
    const sortedParams = JSON.stringify(params, Object.keys(params).sort());
    return `${namespace}:${sortedParams}`;
  }

  /**
   * Get item from cache
   */
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set item in cache
   */
  set<T = any>(key: string, data: T, ttl?: number, namespace?: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      namespace,
    });
  }

  /**
   * Clear cache by namespace or entirely
   */
  clear(namespace?: string): void {
    if (namespace) {
      const entries = Array.from(this.cache.entries());
      for (const [key, entry] of entries) {
        if (entry.namespace === namespace) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getStatistics() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        namespace: entry.namespace,
        age: Date.now() - entry.timestamp,
      })),
    };
  }

  /**
   * Start periodic cleanup of expired entries
   */
  startPeriodicCleanup(intervalMs: number = 60 * 1000): void {
    setInterval(() => {
      const now = Date.now();
      const entries = Array.from(this.cache.entries());
      for (const [key, entry] of entries) {
        if (entry.ttl && now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
        }
      }
    }, intervalMs);
  }

  /**
   * Get cache statistics - alias for getStatistics
   */
  getStats() {
    return this.getStatistics();
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param pattern - Pattern to match against cache keys
   * @returns Number of entries invalidated
   */
  invalidate(pattern: string): number {
    let count = 0;
    const entries = Array.from(this.cache.entries());
    for (const [key, _entry] of entries) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }
}

// Export singleton instances
export const ApiCacheService = new ApiCacheServiceClass();
export const apiCache = ApiCacheService;

// Start cleanup every minute
ApiCacheService.startPeriodicCleanup();
