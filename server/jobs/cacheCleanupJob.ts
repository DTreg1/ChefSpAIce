import { logger } from "../lib/logger";
import { registerJob } from "./jobScheduler";
import { DatabaseCacheStore } from "../lib/cache";

const ONE_DAY = 24 * 60 * 60 * 1000;

async function cleanupExpiredCache(): Promise<void> {
  const count = await DatabaseCacheStore.deleteExpired();
  logger.info("Cleaned up expired cache entries", { count });
}

export function registerCacheCleanupJob(intervalMs: number = ONE_DAY): void {
  registerJob("cache-cleanup", intervalMs, async () => {
    await cleanupExpiredCache();
  });
}
