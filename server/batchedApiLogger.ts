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
    
    // Create unique key with timestamp to allow multiple logs for same endpoint
    // This prevents the memory leak while still allowing deduplication within the same millisecond
    const timestamp = Date.now();
    const logKey = `${userId}-${log.apiName}-${log.endpoint}-${timestamp}`;
    
    // Skip if already queued (unlikely with timestamp, but still check)
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
            
            // Use same key format as in logApiUsage for retry tracking
            // For retry tracking, we need to use a stable key without timestamp
            const retryKey = `${userId}-${log.apiName}-${log.endpoint}`;
            const retryCount = (this.failureRetryCount.get(retryKey) || 0) + 1;
            
            // Increase retry attempts to 5 for better resilience
            const maxRetries = 5;
            
            // Determine if error is definitely non-retryable
            // Only skip retries for explicit non-retryable errors
            let shouldRetry = true;
            
            if (error instanceof Error) {
              // Check error codes first (more reliable than messages)
              const errorCode = (error as any).code;
              const nonRetryableCodes = ['EACCES', 'EPERM', 'ENOENT'];
              
              if (nonRetryableCodes.includes(errorCode)) {
                shouldRetry = false;
              } else if (error.message) {
                // Only skip retry for clearly permanent errors
                const nonRetryablePatterns = [
                  'permission denied',
                  'access denied',
                  'invalid credentials',
                  'authentication failed',
                  'not authorized'
                ];
                
                const errorLower = error.message.toLowerCase();
                shouldRetry = !nonRetryablePatterns.some(pattern => errorLower.includes(pattern));
              }
            }
            
            // Default to retrying for unknown errors (they could be transient)
            if (retryCount < maxRetries && shouldRetry) {
              this.failureRetryCount.set(retryKey, retryCount);
              failedLogs.push(queuedLog);
              console.warn(`Retrying API log (attempt ${retryCount}/${maxRetries}): ${retryKey}`);
            } else {
              const reason = shouldRetry ? 'max retries reached' : 'non-retryable error';
              console.error(`Dropping API log (${reason}) after ${retryCount} attempts: ${retryKey}`, error);
              this.failureRetryCount.delete(retryKey);
              // IMPORTANT: Remove from queuedLogKeys to allow future logs with same key
              // We need to find and remove the actual key with timestamp
              const keysToRemove = Array.from(this.queuedLogKeys).filter(key => 
                key.startsWith(`${userId}-${log.apiName}-${log.endpoint}-`)
              );
              keysToRemove.forEach(key => this.queuedLogKeys.delete(key));
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
          // Remove from queued keys set (need to find the key with timestamp)
          const keysToRemove = Array.from(this.queuedLogKeys).filter(key => 
            key.startsWith(`${userId}-${log.apiName}-${log.endpoint}-`)
          );
          keysToRemove.forEach(key => this.queuedLogKeys.delete(key));
          
          // Remove from retry count map (uses key without timestamp)
          const retryKey = `${userId}-${log.apiName}-${log.endpoint}`;
          this.failureRetryCount.delete(retryKey);
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