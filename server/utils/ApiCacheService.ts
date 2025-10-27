import crypto from 'crypto';

// Cache entry interface with metadata
interface CacheEntry<T> {
  data: T;
  cachedAt: Date;
  expiresAt: Date;
  hitCount: number;
  lastAccessed: Date;
  size?: number; // Approximate size in bytes
}

// Cache statistics interface
export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  missRate: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
  totalHits: number;
  totalMisses: number;
  avgAccessTime: string;
  evictions: number;
  topAccessedKeys: Array<{ key: string; hits: number }>;
}

// Configuration interface
export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  ttlConfig: {
    [key: string]: number;
  };
  enabled: boolean;
}

// Default TTL configuration (in milliseconds)
const DEFAULT_TTL_CONFIG = {
  'usda.food': 30 * 24 * 60 * 60 * 1000,      // 30 days for food data
  'usda.search': 7 * 24 * 60 * 60 * 1000,     // 7 days for search results
  'usda.nutrients': 90 * 24 * 60 * 60 * 1000,  // 90 days for nutrient data
  'usda.branded': 14 * 24 * 60 * 60 * 1000,    // 14 days for branded foods
  'barcode': 14 * 24 * 60 * 60 * 1000,         // 14 days for barcode data
};

export class ApiCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private stats = {
    totalHits: 0,
    totalMisses: 0,
    evictions: 0,
    accessTimes: [] as number[],
  };

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: config?.maxSize || parseInt(process.env.CACHE_MAX_SIZE || '10000'),
      defaultTTL: config?.defaultTTL || 30 * 24 * 60 * 60 * 1000, // 30 days default
      ttlConfig: config?.ttlConfig || this.getTTLConfigFromEnv(),
      enabled: config?.enabled ?? (process.env.CACHE_ENABLED !== 'false'),
    };

    // Start periodic cleanup
    if (this.config.enabled) {
      this.startPeriodicCleanup();
    }
  }

  private getTTLConfigFromEnv(): { [key: string]: number } {
    // Parse TTL from environment - supports both days and milliseconds
    const parseEnvTTL = (envValue: string | undefined, defaultMs: number): number => {
      if (!envValue) return defaultMs;
      
      // If value is less than 365, assume it's in days and convert to milliseconds
      const parsed = parseInt(envValue);
      if (isNaN(parsed)) return defaultMs;
      
      // Values < 365 are treated as days, >= 365 as milliseconds
      return parsed < 365 ? parsed * 24 * 60 * 60 * 1000 : parsed;
    };
    
    return {
      // Use environment overrides or defaults (in milliseconds)
      'usda.food': parseEnvTTL(process.env.CACHE_TTL_FOOD_DAYS, DEFAULT_TTL_CONFIG['usda.food']),
      'usda.search': parseEnvTTL(process.env.CACHE_TTL_SEARCH_DAYS, DEFAULT_TTL_CONFIG['usda.search']),
      'usda.nutrients': parseEnvTTL(process.env.CACHE_TTL_NUTRIENTS_DAYS, DEFAULT_TTL_CONFIG['usda.nutrients']),
      'usda.branded': parseEnvTTL(process.env.CACHE_TTL_BRANDED_DAYS, DEFAULT_TTL_CONFIG['usda.branded']),
      'barcode': parseEnvTTL(process.env.CACHE_TTL_BARCODE_DAYS, DEFAULT_TTL_CONFIG['barcode']),
    };
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    if (!this.config.enabled) return null;

    const startTime = Date.now();
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.totalMisses++;
      this.recordAccessTime(Date.now() - startTime);
      if (process.env.CACHE_DEBUG === 'true') {
        console.log(`[ApiCache] MISS: ${key} - Not found in cache`);
      }
      return null;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt.getTime()) {
      this.cache.delete(key);
      this.stats.totalMisses++;
      this.recordAccessTime(Date.now() - startTime);
      console.log(`[ApiCache] EXPIRED: ${key} - TTL expired at ${entry.expiresAt.toISOString()}`);
      return null;
    }

    // Update hit count and last accessed
    entry.hitCount++;
    entry.lastAccessed = new Date();
    this.stats.totalHits++;
    this.recordAccessTime(Date.now() - startTime);

    if (process.env.CACHE_DEBUG === 'true') {
      console.log(`[ApiCache] HIT: ${key} - Hit count: ${entry.hitCount}, Size: ${entry.size || 0} bytes`);
    }

    return entry.data;
  }

  /**
   * Set item in cache with optional TTL
   */
  set<T>(key: string, data: T, ttl?: number, cacheType?: string): void {
    if (!this.config.enabled) {
      if (process.env.CACHE_DEBUG === 'true') {
        console.log(`[ApiCache] SET SKIPPED: ${key} - Cache disabled`);
      }
      return;
    }

    // Determine TTL based on cache type or use provided/default
    const effectiveTTL = ttl || (cacheType ? this.config.ttlConfig[cacheType] : null) || this.config.defaultTTL;

    // Implement LRU eviction if at max size
    if (this.cache.size >= this.config.maxSize) {
      console.log(`[ApiCache] EVICTION REQUIRED: Cache at max size (${this.config.maxSize})`);
      this.evictLRU();
    }

    const now = new Date();
    const entry: CacheEntry<T> = {
      data,
      cachedAt: now,
      expiresAt: new Date(now.getTime() + effectiveTTL),
      hitCount: 0,
      lastAccessed: now,
      size: this.estimateSize(data),
    };

    const isUpdate = this.cache.has(key);
    this.cache.set(key, entry);
    
    console.log(`[ApiCache] ${isUpdate ? 'UPDATED' : 'SET'}: ${key} | TTL: ${effectiveTTL / 1000}s | Type: ${cacheType || 'default'} | Size: ${entry.size || 0} bytes | Cache size: ${this.cache.size}/${this.config.maxSize}`);
  }

  /**
   * Remove least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();
    let oldestHitCount = 0;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (entry.lastAccessed.getTime() < oldestTime) {
        oldestTime = entry.lastAccessed.getTime();
        oldestKey = key;
        oldestHitCount = entry.hitCount;
      }
    }

    if (oldestKey) {
      const age = Math.floor((Date.now() - oldestTime) / 1000 / 60); // Age in minutes
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      console.log(`[ApiCache] LRU EVICTION: ${oldestKey} | Age: ${age} min | Hit count: ${oldestHitCount} | Cache size now: ${this.cache.size}/${this.config.maxSize}`);
    }
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern: string): number {
    if (!this.config.enabled) {
      if (process.env.CACHE_DEBUG === 'true') {
        console.log(`[ApiCache] INVALIDATE SKIPPED: Cache disabled`);
      }
      return 0;
    }

    let count = 0;
    const invalidatedKeys: string[] = [];
    const regex = new RegExp(pattern);

    for (const key of Array.from(this.cache.keys())) {
      if (regex.test(key) || key.includes(pattern)) {
        this.cache.delete(key);
        invalidatedKeys.push(key);
        count++;
      }
    }

    console.log(`[ApiCache] INVALIDATED: ${count} entries matching pattern '${pattern}' | Cache size now: ${this.cache.size}/${this.config.maxSize}`);
    if (process.env.CACHE_DEBUG === 'true' && invalidatedKeys.length > 0) {
      console.log(`[ApiCache] Invalidated keys:`, invalidatedKeys);
    }
    return count;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.cache.size;
    const totalHits = this.stats.totalHits;
    const totalMisses = this.stats.totalMisses;
    const hitRate = totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses) * 100).toFixed(2) : 0;
    
    this.cache.clear();
    this.stats = {
      totalHits: 0,
      totalMisses: 0,
      evictions: 0,
      accessTimes: [],
    };
    
    console.log(`[ApiCache] CLEARED: ${size} entries | Previous hit rate: ${hitRate}% | Hits: ${totalHits} | Misses: ${totalMisses}`);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.entries());
    
    // Calculate hit rate
    const total = this.stats.totalHits + this.stats.totalMisses;
    const hitRate = total > 0 ? this.stats.totalHits / total : 0;
    const missRate = total > 0 ? this.stats.totalMisses / total : 0;

    // Find oldest and newest entries
    let oldestDate: Date | null = null;
    let newestDate: Date | null = null;
    
    for (const [, entry] of entries) {
      if (!oldestDate || entry.cachedAt < oldestDate) {
        oldestDate = entry.cachedAt;
      }
      if (!newestDate || entry.cachedAt > newestDate) {
        newestDate = entry.cachedAt;
      }
    }

    // Get top accessed keys
    const topKeys = entries
      .sort((a, b) => b[1].hitCount - a[1].hitCount)
      .slice(0, 10)
      .map(([key, entry]) => ({ key, hits: entry.hitCount }));

    // Calculate average access time
    const avgTime = this.stats.accessTimes.length > 0
      ? this.stats.accessTimes.reduce((a, b) => a + b, 0) / this.stats.accessTimes.length
      : 0;

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate,
      missRate,
      oldestEntry: oldestDate,
      newestEntry: newestDate,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses,
      avgAccessTime: `${avgTime.toFixed(2)}ms`,
      evictions: this.stats.evictions,
      topAccessedKeys: topKeys,
    };
  }

  /**
   * Check if cache has key and is not expired
   */
  has(key: string): boolean {
    if (!this.config.enabled) return false;

    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check expiration
    if (Date.now() > entry.expiresAt.getTime()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Update TTL for existing entry
   */
  updateTTL(key: string, ttl: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.expiresAt = new Date(Date.now() + ttl);
    return true;
  }

  /**
   * Generate cache key with prefix
   */
  static generateKey(prefix: string, params: any): string {
    const normalized = JSON.stringify(params, Object.keys(params).sort());
    return `${prefix}:${crypto
      .createHash('sha256')
      .update(normalized)
      .digest('hex')
      .substring(0, 16)}`;
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate (2 bytes per char)
    } catch {
      return 0;
    }
  }

  /**
   * Record access time for metrics
   */
  private recordAccessTime(ms: number): void {
    this.stats.accessTimes.push(ms);
    // Keep only last 1000 access times
    if (this.stats.accessTimes.length > 1000) {
      this.stats.accessTimes.shift();
    }
  }

  /**
   * Start periodic cleanup task
   */
  private startPeriodicCleanup(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.cleanupExpired();
    }, 60 * 60 * 1000);
  }

  /**
   * Remove all expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expiresAt.getTime()) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[ApiCache] Cleanup removed ${removed} expired entries`);
    }
  }

  /**
   * Get detailed information about a specific cache entry
   */
  getEntryInfo(key: string): CacheEntry<any> | null {
    return this.cache.get(key) || null;
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Warm cache with predefined data
   */
  async warmCache(warmupFn: () => Promise<Array<{ key: string; data: any; ttl?: number; type?: string }>>): Promise<void> {
    if (!this.config.enabled) return;

    console.log('[ApiCache] Starting cache warming...');
    
    try {
      const items = await warmupFn();
      
      for (const item of items) {
        this.set(item.key, item.data, item.ttl, item.type);
      }
      
      console.log(`[ApiCache] Cache warming complete: ${items.length} items`);
    } catch (error) {
      console.error('[ApiCache] Cache warming failed:', error);
    }
  }

  /**
   * Export cache for persistence
   */
  export(): Array<{ key: string; entry: CacheEntry<any> }> {
    return Array.from(this.cache.entries()).map(([key, entry]) => ({ key, entry }));
  }

  /**
   * Import cache from persistence
   */
  import(data: Array<{ key: string; entry: CacheEntry<any> }>): void {
    const now = Date.now();
    let imported = 0;
    let expired = 0;

    for (const { key, entry } of data) {
      // Convert string dates to Date objects
      entry.cachedAt = new Date(entry.cachedAt);
      entry.expiresAt = new Date(entry.expiresAt);
      entry.lastAccessed = new Date(entry.lastAccessed);

      // Skip expired entries
      if (now > entry.expiresAt.getTime()) {
        expired++;
        continue;
      }

      this.cache.set(key, entry);
      imported++;
    }

    console.log(`[ApiCache] Imported ${imported} entries (${expired} expired and skipped)`);
  }
}

// Singleton instance
export const apiCache = new ApiCacheService();