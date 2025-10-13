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
    // Add to queue
    this.queue.push({ userId, log });

    // Check if we should flush immediately
    if (this.queue.length >= this.batchSize) {
      await this.flush();
    }
  }

  async flush() {
    if (this.queue.length === 0) return;

    // Take current queue and reset
    const logsToWrite = [...this.queue];
    this.queue = [];

    // Write all logs in parallel
    const writePromises = logsToWrite.map(({ userId, log }) =>
      storage.logApiUsage(userId, log).catch(error => {
        console.error('Failed to write API log:', error);
        // On failure, re-queue the log for retry
        this.queue.push({ userId, log });
      })
    );

    await Promise.allSettled(writePromises);
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