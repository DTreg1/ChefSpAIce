import { db } from "../db";
import { userSessions } from "@shared/schema";
import { lt, isNotNull, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { registerJob } from "./jobScheduler";

async function cleanupSessions(): Promise<void> {
  const deleteResult = await db
    .delete(userSessions)
    .where(lt(userSessions.expiresAt, new Date()));
  logger.info("Cleaned up expired sessions", { count: deleteResult.rowCount });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const anonymizeResult = await db
    .update(userSessions)
    .set({ ipAddress: null })
    .where(
      and(lt(userSessions.createdAt, thirtyDaysAgo), isNotNull(userSessions.ipAddress))
    );
  logger.info("Anonymized IP addresses on old sessions", { count: anonymizeResult.rowCount });
}

export function registerSessionCleanupJob(intervalMs: number = 24 * 60 * 60 * 1000): void {
  registerJob("session-cleanup", intervalMs, async () => {
    await cleanupSessions();
  });
}
