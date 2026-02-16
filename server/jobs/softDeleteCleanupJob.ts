import { db } from "../db";
import { userInventoryItems } from "@shared/schema";
import { lt, isNotNull, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { registerJob } from "./jobScheduler";

const SOFT_DELETE_RETENTION_DAYS = 30;

async function cleanupSoftDeletedItems(): Promise<void> {
  const cutoff = new Date(Date.now() - SOFT_DELETE_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const deleteResult = await db
    .delete(userInventoryItems)
    .where(
      and(
        isNotNull(userInventoryItems.deletedAt),
        lt(userInventoryItems.deletedAt, cutoff),
      ),
    );

  const count = deleteResult.rowCount ?? 0;
  logger.info("Soft-delete cleanup completed", {
    permanentlyDeleted: count,
    cutoffDate: cutoff.toISOString(),
  });
}

export function registerSoftDeleteCleanupJob(intervalMs: number = 7 * 24 * 60 * 60 * 1000): void {
  registerJob("soft-delete-cleanup", intervalMs, async () => {
    await cleanupSoftDeletedItems();
  });
}
