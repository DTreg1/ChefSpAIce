import { logger } from "./logger";
import { db } from "../db";
import { apiCache } from "@shared/schema";
import { eq, lt } from "drizzle-orm";

export interface CacheStore<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface MemoryCacheStoreOptions {
  maxSize?: number;
  sweepIntervalMs?: number;
}

export class MemoryCacheStore<T> implements CacheStore<T> {
  private map = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private sweepTimer: NodeJS.Timeout | null = null;

  constructor(options: MemoryCacheStoreOptions = {}) {
    this.maxSize = options.maxSize ?? 10_000;
    const sweepMs = options.sweepIntervalMs ?? 5 * 60 * 1000;
    if (sweepMs > 0) {
      const timer = setInterval(() => this.sweep(), sweepMs) as unknown as NodeJS.Timeout;
      this.sweepTimer = timer;
      if (timer.unref) {
        timer.unref();
      }
    }
  }

  async get(key: string): Promise<T | undefined> {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key: string, value: T, ttlMs: number): Promise<void> {
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs });
    if (this.map.size > this.maxSize) {
      this.evictOldest();
    }
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  async clear(): Promise<void> {
    this.map.clear();
  }

  destroy(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }

  private evictOldest(): void {
    const evictCount = Math.ceil(this.maxSize * 0.2);
    const sorted = [...this.map.entries()].sort(
      (a, b) => a[1].expiresAt - b[1].expiresAt,
    );
    for (let i = 0; i < evictCount && i < sorted.length; i++) {
      this.map.delete(sorted[i][0]);
    }
  }

  private sweep(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.map) {
      if (now >= entry.expiresAt) {
        this.map.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      logger.debug("MemoryCacheStore sweep completed", {
        removed,
        remaining: this.map.size,
      });
    }
  }
}

export class DatabaseCacheStore<T> implements CacheStore<T> {
  async get(key: string): Promise<T | undefined> {
    try {
      const rows = await db
        .select()
        .from(apiCache)
        .where(eq(apiCache.key, key))
        .limit(1);

      if (rows.length === 0) return undefined;

      const row = rows[0];
      if (row.expiresAt <= new Date()) {
        await db.delete(apiCache).where(eq(apiCache.key, key));
        return undefined;
      }

      return row.value as T;
    } catch (err) {
      logger.error("DatabaseCacheStore.get failed", {
        key,
        error: err instanceof Error ? err.message : String(err),
      });
      return undefined;
    }
  }

  async set(key: string, value: T, ttlMs: number): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlMs);
      await db
        .insert(apiCache)
        .values({ key, value: value as any, expiresAt })
        .onConflictDoUpdate({
          target: apiCache.key,
          set: { value: value as any, expiresAt },
        });
    } catch (err) {
      logger.error("DatabaseCacheStore.set failed", {
        key,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await db.delete(apiCache).where(eq(apiCache.key, key));
    } catch (err) {
      logger.error("DatabaseCacheStore.delete failed", {
        key,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  async clear(): Promise<void> {
    try {
      await db.delete(apiCache);
    } catch (err) {
      logger.error("DatabaseCacheStore.clear failed", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  static async deleteExpired(): Promise<number> {
    try {
      const result = await db
        .delete(apiCache)
        .where(lt(apiCache.expiresAt, new Date()));
      return result.rowCount ?? 0;
    } catch (err) {
      logger.error("DatabaseCacheStore.deleteExpired failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return 0;
    }
  }
}

let _redisClient: import("ioredis").default | null = null;
let _redisInitAttempted = false;

export function getRedisClient(): import("ioredis").default | null {
  if (_redisInitAttempted) return _redisClient;
  _redisInitAttempted = true;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  try {
    const Redis = require("ioredis") as typeof import("ioredis").default;
    _redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
      enableReadyCheck: true,
    });

    _redisClient.on("error", (err: Error) => {
      logger.error("Redis cache connection error", { error: err.message });
    });

    _redisClient.on("connect", () => {
      logger.info("Redis cache connected");
    });

    return _redisClient;
  } catch (err) {
    logger.warn("Failed to initialize Redis cache, falling back to in-memory", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export class RedisCacheStore<T> implements CacheStore<T> {
  private client: import("ioredis").default;
  private prefix: string;

  constructor(client: import("ioredis").default, prefix = "cache:") {
    this.client = client;
    this.prefix = prefix;
  }

  async get(key: string): Promise<T | undefined> {
    try {
      const raw = await this.client.get(this.prefix + key);
      if (raw === null) return undefined;
      return JSON.parse(raw) as T;
    } catch (err) {
      logger.debug("Redis cache operation failed", { key, error: err instanceof Error ? err.message : String(err) });
      return undefined;
    }
  }

  async set(key: string, value: T, ttlMs: number): Promise<void> {
    try {
      await this.client.set(this.prefix + key, JSON.stringify(value), "PX", ttlMs);
    } catch (err) {
      logger.debug("Redis cache operation failed", { key, error: err instanceof Error ? err.message : String(err) });
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(this.prefix + key);
    } catch (err) {
      logger.debug("Redis cache operation failed", { key, error: err instanceof Error ? err.message : String(err) });
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await this.client.keys(this.prefix + "*");
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (err) {
      logger.debug("Redis cache operation failed", { error: err instanceof Error ? err.message : String(err) });
    }
  }
}

function createDefaultStore<T>(): CacheStore<T> {
  return new DatabaseCacheStore<T>();
}

interface CacheServiceOptions<T> {
  defaultTtlMs?: number;
  store?: CacheStore<T>;
}

export class CacheService<T> {
  private store: CacheStore<T>;
  private defaultTtlMs: number;

  constructor(options: CacheServiceOptions<T> = {}) {
    this.store = options.store ?? createDefaultStore<T>();
    this.defaultTtlMs = options.defaultTtlMs ?? 60_000;
  }

  async get(key: string): Promise<T | undefined> {
    return this.store.get(key);
  }

  async set(key: string, value: T, ttlMs?: number): Promise<void> {
    return this.store.set(key, value, ttlMs ?? this.defaultTtlMs);
  }

  async delete(key: string): Promise<void> {
    return this.store.delete(key);
  }

  async clear(): Promise<void> {
    return this.store.clear();
  }
}
