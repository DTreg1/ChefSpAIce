import { storage } from './storage';
import type { InsertApiUsageLog } from '@shared/schema';

interface QueuedLog {
  userId: string;
  log: Omit<InsertApiUsageLog, 'userId'>;
}

class BatchedApiLogger {
  private queue: QueuedLog[] = [];
  private batchSize = 10; // Write after 10 logs
  private flushInterval = 5000; // Or after 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushInProgress = false; // Prevent concurrent flushes
  private failureRetryCount = new Map<string, number>(); // Track retry counts
  private queuedLogKeys = new Set<string>(); // Track which logs are already in queue

  constructor() {
    // Setup periodic flush
    this.startPeriodicFlush();
  }

  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  async logApiUsage(userId: string, log: Omit<InsertApiUsageLog, 'userId'>) {
    // Validate required fields
    if (!log.apiName || !log.endpoint) {
      console.warn('Skipping API log with missing apiName or endpoint');
      return;
    }
    
    // Create deterministic key to prevent duplicates
    const logKey = `${userId}-${log.apiName}-${log.endpoint}`;
    
    // Skip if already queued
    if (this.queuedLogKeys.has(logKey)) {
      return;
    }
    
    // Add to queue and track it
    this.queue.push({ userId, log });
    this.queuedLogKeys.add(logKey);

    // Check if we should flush immediately
    if (this.queue.length >= this.batchSize) {
      await this.flush();
    }
  }

  async flush() {
    if (this.queue.length === 0 || this.isFlushInProgress) return;

    // Prevent concurrent flushes
    this.isFlushInProgress = true;

    try {
      // Take current queue but don't reset it yet
      const logsToWrite = [...this.queue];
      const failedLogs: QueuedLog[] = [];

      // Write all logs in parallel and track results
      const results = await Promise.allSettled(
        logsToWrite.map(async (queuedLog) => {
          const { userId, log } = queuedLog;
          try {
            await storage.logApiUsage(userId, log);
            return { success: true, queuedLog };
          } catch (error) {
            console.error('Failed to write API log:', error);
            
            // Create a deterministic key for this log (no timestamp for proper retry tracking)
            const logKey = `${userId}-${log.apiName}-${log.endpoint}`;
            const retryCount = (this.failureRetryCount.get(logKey) || 0) + 1;
            
            // Only retry up to 3 times
            if (retryCount < 3) {
              this.failureRetryCount.set(logKey, retryCount);
              failedLogs.push(queuedLog);
            } else {
              console.error(`Dropping API log after 3 failed attempts: ${logKey}`);
              this.failureRetryCount.delete(logKey);
              // IMPORTANT: Remove from queuedLogKeys to allow future logs with same key
              this.queuedLogKeys.delete(logKey);
            }
            
            return { success: false, queuedLog };
          }
        })
      );

      // Clear successfully written logs from the queue
      const successfulLogs = results
        .filter((r): r is PromiseFulfilledResult<{ success: boolean; queuedLog: QueuedLog }> => 
          r.status === 'fulfilled' && r.value.success)
        .map(r => r.value.queuedLog);

      // Update queue to only contain failed logs and any new logs added during flush
      const newLogsAddedDuringFlush = this.queue.slice(logsToWrite.length);
      this.queue = [...failedLogs, ...newLogsAddedDuringFlush];

      // Clean up tracking for successful logs
      successfulLogs.forEach(({ userId, log }) => {
        if (log.apiName && log.endpoint) {
          const logKey = `${userId}-${log.apiName}-${log.endpoint}`;
          // Remove from queued keys set
          this.queuedLogKeys.delete(logKey);
          // Remove from retry count map
          this.failureRetryCount.delete(logKey);
        }
      });
    } finally {
      this.isFlushInProgress = false;
    }
  }

  // Graceful shutdown
  async shutdown() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}

// Singleton instance
export const batchedApiLogger = new BatchedApiLogger();

// Ensure logs are flushed on process exit
process.on('SIGINT', async () => {
  await batchedApiLogger.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await batchedApiLogger.shutdown();
  process.exit(0);
});