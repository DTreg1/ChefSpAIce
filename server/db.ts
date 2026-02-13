import { drizzle } from "drizzle-orm/node-postgres";
import type { Logger } from "drizzle-orm/logger";
import pg from "pg";
import * as schema from "@shared/schema";
import { logger } from "./lib/logger";

const POOL_MAX = 20;
const POOL_WARNING_THRESHOLD = 16;
const HEALTH_CHECK_INTERVAL_MS = 30_000;

const SLOW_QUERY_WARN_MS = 500;
const SLOW_QUERY_ERROR_MS = 2000;

class QueryLogger implements Logger {
  private pending = new Map<number, { sql: string; start: number }>();
  private nextId = 0;

  logQuery(query: string, _params: unknown[]): void {
    const id = this.nextId++;
    this.pending.set(id, { sql: query, start: performance.now() });

    queueMicrotask(() => {
      const entry = this.pending.get(id);
      if (!entry) return;
      this.pending.delete(id);
      this.finalize(entry.sql, entry.start);
    });
  }

  settle(sql: string, start: number): void {
    this.finalize(sql, start);
  }

  private finalize(sql: string, start: number): void {
    const durationMs = Math.round(performance.now() - start);
    if (durationMs >= SLOW_QUERY_ERROR_MS) {
      logger.error("Slow query (critical)", { sql, durationMs });
    } else if (durationMs >= SLOW_QUERY_WARN_MS) {
      logger.warn("Slow query", { sql, durationMs });
    } else {
      logger.debug("Query executed", { sql, durationMs });
    }
  }
}

const queryLogger = new QueryLogger();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: POOL_MAX,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const originalQuery = pool.query.bind(pool) as typeof pool.query;
(pool as { query: typeof pool.query }).query = function wrappedQuery(
  this: pg.Pool,
  ...args: Parameters<typeof pool.query>
) {
  const start = performance.now();
  const first = args[0];
  const sql =
    typeof first === "string"
      ? first
      : typeof first === "object" && first !== null && "text" in first
        ? (first as { text: string }).text
        : "unknown";

  const result = (originalQuery as Function).apply(this, args);

  if (result && typeof result.then === "function") {
    (result as Promise<unknown>).then(
      () => queryLogger.settle(sql, start),
      () => queryLogger.settle(sql, start),
    );
  }

  return result;
} as typeof pool.query;

export const db = drizzle(pool, {
  schema,
  logger: queryLogger,
});

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
