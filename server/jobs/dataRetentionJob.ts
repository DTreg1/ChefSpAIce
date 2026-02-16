import { db } from "../db";
import { userWasteLogs, userConsumedLogs } from "@shared/schema";
import { sql, lt } from "drizzle-orm";
import { logger } from "../lib/logger";
import { registerJob } from "./jobScheduler";

const RETENTION_MONTHS = 12;

function getCutoffDate(): Date {
  const now = new Date();
  now.setMonth(now.getMonth() - RETENTION_MONTHS);
  now.setDate(1);
  now.setHours(0, 0, 0, 0);
  return now;
}

async function aggregateAndPurgeWasteLogs(): Promise<{ archived: number; deleted: number }> {
  const cutoff = getCutoffDate();

  const countResult = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(userWasteLogs)
    .where(lt(userWasteLogs.createdAt, cutoff));

  const archived = countResult[0]?.value ?? 0;
  if (archived === 0) {
    return { archived: 0, deleted: 0 };
  }

  await db.execute(sql`
    INSERT INTO monthly_log_summaries (user_id, month, log_type, category, total_items, total_quantity)
    SELECT
      user_id,
      COALESCE(LEFT(date, 7), 'unknown') AS month,
      'waste' AS log_type,
      COALESCE(reason, 'unspecified') AS category,
      COUNT(*)::int AS total_items,
      COALESCE(SUM(quantity), 0) AS total_quantity
    FROM user_waste_logs
    WHERE created_at < ${cutoff}
    GROUP BY user_id, COALESCE(LEFT(date, 7), 'unknown'), COALESCE(reason, 'unspecified')
    ON CONFLICT (user_id, month, log_type, category)
    DO UPDATE SET
      total_items = monthly_log_summaries.total_items + EXCLUDED.total_items,
      total_quantity = monthly_log_summaries.total_quantity + EXCLUDED.total_quantity
  `);

  const deleteResult = await db
    .delete(userWasteLogs)
    .where(lt(userWasteLogs.createdAt, cutoff));

  return { archived, deleted: deleteResult.rowCount ?? 0 };
}

async function aggregateAndPurgeConsumedLogs(): Promise<{ archived: number; deleted: number }> {
  const cutoff = getCutoffDate();

  const countResult = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(userConsumedLogs)
    .where(lt(userConsumedLogs.createdAt, cutoff));

  const archived = countResult[0]?.value ?? 0;
  if (archived === 0) {
    return { archived: 0, deleted: 0 };
  }

  await db.execute(sql`
    INSERT INTO monthly_log_summaries (user_id, month, log_type, category, total_items, total_quantity)
    SELECT
      user_id,
      COALESCE(LEFT(date, 7), 'unknown') AS month,
      'consumed' AS log_type,
      'consumed' AS category,
      COUNT(*)::int AS total_items,
      COALESCE(SUM(quantity), 0) AS total_quantity
    FROM user_consumed_logs
    WHERE created_at < ${cutoff}
    GROUP BY user_id, COALESCE(LEFT(date, 7), 'unknown')
    ON CONFLICT (user_id, month, log_type, category)
    DO UPDATE SET
      total_items = monthly_log_summaries.total_items + EXCLUDED.total_items,
      total_quantity = monthly_log_summaries.total_quantity + EXCLUDED.total_quantity
  `);

  const deleteResult = await db
    .delete(userConsumedLogs)
    .where(lt(userConsumedLogs.createdAt, cutoff));

  return { archived, deleted: deleteResult.rowCount ?? 0 };
}

async function runDataRetention(): Promise<void> {
  logger.info("Data retention job started", { retentionMonths: RETENTION_MONTHS });

  const wasteResult = await aggregateAndPurgeWasteLogs();
  logger.info("Waste log retention complete", {
    archived: wasteResult.archived,
    deleted: wasteResult.deleted,
  });

  const consumedResult = await aggregateAndPurgeConsumedLogs();
  logger.info("Consumed log retention complete", {
    archived: consumedResult.archived,
    deleted: consumedResult.deleted,
  });

  const totalArchived = wasteResult.archived + consumedResult.archived;
  const totalDeleted = wasteResult.deleted + consumedResult.deleted;
  logger.info("Data retention job completed", { totalArchived, totalDeleted });
}

export function registerDataRetentionJob(intervalMs: number = 30 * 24 * 60 * 60 * 1000): void {
  registerJob("data-retention", intervalMs, async () => {
    await runDataRetention();
  });
}
