type CacheEntry<T> = {
  data: T;
  timestamp: number;
  version: number;
};

const CACHE_VERSION = 1;
const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export class CacheStorage {
  static set<T>(
    key: string,
    data: T,
    expiryMs: number = DEFAULT_EXPIRY_MS,
  ): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      };
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error(`Failed to cache data for key ${key}:`, error);
    }
  }

  static get<T>(key: string, expiryMs: number = DEFAULT_EXPIRY_MS): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const entry: CacheEntry<T> = JSON.parse(item);

      if (entry.version !== CACHE_VERSION) {
        this.remove(key);
        return null;
      }

      const age = Date.now() - entry.timestamp;
      if (age > expiryMs) {
        this.remove(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error(`Failed to retrieve cached data for key ${key}:`, error);
      this.remove(key);
      return null;
    }
  }

  static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove cached data for key ${key}:`, error);
    }
  }

  static clear(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("cache:")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  }
}
