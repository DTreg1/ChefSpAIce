import { db } from "../db";
import { cronJobs } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import crypto from "crypto";

const instanceId = crypto.randomBytes(8).toString("hex");

type JobHandler = () => Promise<void>;

interface RegisteredJob {
  name: string;
  intervalMs: number;
  handler: JobHandler;
}

const registeredJobs: RegisteredJob[] = [];
let pollTimer: ReturnType<typeof setInterval> | null = null;

const POLL_INTERVAL_MS = 30_000;

export function registerJob(name: string, intervalMs: number, handler: JobHandler): void {
  registeredJobs.push({ name, intervalMs, handler });
  logger.info("Registered cron job", { name, intervalMs });
}

async function ensureJobRow(job: RegisteredJob): Promise<void> {
  await db
    .insert(cronJobs)
    .values({
      name: job.name,
      intervalMs: job.intervalMs,
      enabled: true,
    })
    .onConflictDoUpdate({
      target: cronJobs.name,
      set: { intervalMs: job.intervalMs, updatedAt: new Date() },
    });
}

async function tryRunJob(job: RegisteredJob): Promise<void> {
  const claimResult = await db.execute(
    sql`UPDATE cron_jobs
        SET last_run_at = NOW(), updated_at = NOW()
        WHERE name = ${job.name}
          AND enabled = true
          AND (last_run_at IS NULL OR last_run_at < NOW() - make_interval(secs => ${job.intervalMs / 1000}))
        RETURNING name`
  );

  if (!claimResult.rows || claimResult.rows.length === 0) {
    return;
  }

  const startTime = Date.now();
  logger.info("Running cron job", { job: job.name, instanceId });

  try {
    await job.handler();
    const durationMs = Date.now() - startTime;

    await db
      .update(cronJobs)
      .set({
        lastRunDurationMs: durationMs,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(cronJobs.name, job.name));

    logger.info("Cron job completed", { job: job.name, durationMs, instanceId });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    await db
      .update(cronJobs)
      .set({
        lastRunDurationMs: durationMs,
        lastError: errorMsg,
        updatedAt: new Date(),
      })
      .where(eq(cronJobs.name, job.name));

    logger.error("Cron job failed", { job: job.name, durationMs, error: errorMsg, instanceId });
  }
}

async function pollJobs(): Promise<void> {
  for (const job of registeredJobs) {
    try {
      await tryRunJob(job);
    } catch (error) {
      logger.error("Error polling cron job", {
        job: job.name,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export async function startJobScheduler(): Promise<void> {
  if (pollTimer) {
    logger.info("Job scheduler already running");
    return;
  }

  for (const job of registeredJobs) {
    await ensureJobRow(job);
  }

  logger.info("Job scheduler started", {
    instanceId,
    pollIntervalMs: POLL_INTERVAL_MS,
    jobs: registeredJobs.map((j) => ({ name: j.name, intervalMs: j.intervalMs })),
  });

  await pollJobs();

  pollTimer = setInterval(pollJobs, POLL_INTERVAL_MS);
}

export function stopJobScheduler(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    logger.info("Job scheduler stopped", { instanceId });
  }
}
