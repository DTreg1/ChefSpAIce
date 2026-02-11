import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { logger } from "./lib/logger";

const POOL_MAX = 20;
const POOL_WARNING_THRESHOLD = 16;
const HEALTH_CHECK_INTERVAL_MS = 30_000;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: POOL_MAX,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const db = drizzle(pool, { schema });

export interface PoolStats {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  maxConnections: number;
  activeCount: number;
}

export function getPoolStats(): PoolStats {
  const total = pool.totalCount;
  const idle = pool.idleCount;
  const waiting = pool.waitingCount;
  return {
    totalCount: total,
    idleCount: idle,
    waitingCount: waiting,
    maxConnections: POOL_MAX,
    activeCount: total - idle,
  };
}

export async function checkPoolHealth(): Promise<{ healthy: boolean; responseTimeMs: number; stats: PoolStats }> {
  const start = Date.now();
  let healthy = true;
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
  } catch {
    healthy = false;
  }
  const responseTimeMs = Date.now() - start;
  const stats = getPoolStats();

  if (stats.activeCount > POOL_WARNING_THRESHOLD) {
    logger.warn("Database pool approaching capacity", {
      activeConnections: stats.activeCount,
      maxConnections: stats.maxConnections,
      waitingRequests: stats.waitingCount,
      threshold: POOL_WARNING_THRESHOLD,
    });
  }

  return { healthy, responseTimeMs, stats };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let healthCheckTimer: any = null;

export function startPoolHealthCheck(): void {
  if (healthCheckTimer) return;
  healthCheckTimer = setInterval(async () => {
    try {
      await checkPoolHealth();
    } catch (err) {
      logger.error("Pool health check failed", { error: String(err) });
    }
  }, HEALTH_CHECK_INTERVAL_MS);
  if (healthCheckTimer && typeof healthCheckTimer.unref === "function") {
    healthCheckTimer.unref();
  }
  logger.info("Database pool health check started", { intervalMs: HEALTH_CHECK_INTERVAL_MS });
}

export function stopPoolHealthCheck(): void {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
}

startPoolHealthCheck();
