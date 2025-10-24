import { storage } from './storage';
import type { InsertApiUsageLog } from '@shared/schema';

interface QueuedLog {
  userId: string;
  log: Omit<InsertApiUsageLog, 'userId'>;
  timestamp: number;
  retryCount: number;
}

interface LoggerConfig {
  batchSize: number;
  flushInterval: number;
  maxQueueSize: number;
  maxRetries: number;
  maxLogAge: number;
}

class BatchedApiLogger {
  private queue: QueuedLog[] = [];
  private config: LoggerConfig = {
    batchSize: 10,          // Write after 10 logs
    flushInterval: 5000,    // Or after 5 seconds
    maxQueueSize: 1000,     // Max queue size to prevent memory leak
    maxRetries: 3,          // Max retry attempts
    maxLogAge: 60000,       // Drop logs older than 60 seconds
  };
  
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushInProgress = false;
  private droppedLogCount = 0;
  private lastDropWarningTime = 0;
  private queuedLogKeys = new Set<string>(); // Track unique logs

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
    this.startPeriodicFlush();
  }

  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  async logApiUsage(userId: string, log: Omit<InsertApiUsageLog, 'userId'>) {
    // Create deterministic key to prevent duplicates
    const logKey = `${userId}-${log.apiName}-${log.endpoint}`;
    
    // Skip if already queued
    if (this.queuedLogKeys.has(logKey)) {
      return;
    }

    // Apply back-pressure: reject if queue is full
    if (this.queue.length >= this.config.maxQueueSize) {
      this.droppedLogCount++;
      
      // Log warning periodically (not on every drop to avoid spam)
      const now = Date.now();
      if (now - this.lastDropWarningTime > 10000) { // Every 10 seconds
        console.warn(
          `[BatchedApiLogger] Queue full - dropped ${this.droppedLogCount} logs. ` +
          `Consider increasing maxQueueSize or improving flush performance.`
        );
        this.lastDropWarningTime = now;
        this.droppedLogCount = 0;
      }
      
      // Return early - don't add to queue
      return;
    }
    
    // Add to queue with metadata
    this.queue.push({
      userId,
      log,
      timestamp: Date.now(),
      retryCount: 0,
    });
    this.queuedLogKeys.add(logKey);

    // Check if we should flush immediately
    if (this.queue.length >= this.config.batchSize) {
      // Don't await - let it flush in the background
      this.flush().catch(err => 
        console.error('[BatchedApiLogger] Background flush failed:', err)
      );
    }
  }

  async flush() {
    if (this.queue.length === 0 || this.isFlushInProgress) return;

    // Prevent concurrent flushes
    this.isFlushInProgress = true;

    try {
      const now = Date.now();
      
      // Remove logs that are too old
      this.queue = this.queue.filter(item => {
        const age = now - item.timestamp;
        if (age > this.config.maxLogAge) {
          const logKey = `${item.userId}-${item.log.apiName}-${item.log.endpoint}`;
          this.queuedLogKeys.delete(logKey);
          console.warn(`[BatchedApiLogger] Dropping expired log: ${logKey}`);
          return false;
        }
        return true;
      });

      if (this.queue.length === 0) return;

      // Take a batch to process (don't process entire queue at once)
      const batchSize = Math.min(this.queue.length, this.config.batchSize * 2);
      const batch = this.queue.slice(0, batchSize);
      
      // Process batch with exponential backoff for retries
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const backoffDelay = Math.min(1000 * Math.pow(2, item.retryCount), 10000);
          
          // Add jitter to avoid thundering herd
          if (item.retryCount > 0) {
            await new Promise(resolve => 
              setTimeout(resolve, backoffDelay + Math.random() * 1000)
            );
          }
          
          try {
            await storage.logApiUsage(item.userId, item.log);
            return { success: true, item };
          } catch (error) {
            // Check if error is retryable
            const isRetryable = this.isRetryableError(error);
            
            if (isRetryable && item.retryCount < this.config.maxRetries) {
              return { success: false, item, retry: true };
            } else {
              const logKey = `${item.userId}-${item.log.apiName}-${item.log.endpoint}`;
              console.error(
                `[BatchedApiLogger] Dropping log after ${item.retryCount} retries: ${logKey}`,
                error
              );
              return { success: false, item, retry: false };
            }
          }
        })
      );

      // Separate successful and failed logs
      const toRetry: QueuedLog[] = [];
      const successKeys: string[] = [];
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { success, item, retry } = result.value as any;
          const logKey = `${item.userId}-${item.log.apiName}-${item.log.endpoint}`;
          
          if (success) {
            successKeys.push(logKey);
          } else if (retry) {
            // Increment retry count and add back to queue
            toRetry.push({ ...item, retryCount: item.retryCount + 1 });
          } else {
            // Drop the log
            successKeys.push(logKey); // Remove from tracking
          }
        }
      });

      // Update queue: remove processed items, add retry items, keep remaining
      const remaining = this.queue.slice(batchSize);
      this.queue = [...toRetry, ...remaining];
      
      // Clean up tracking for processed logs
      successKeys.forEach(key => this.queuedLogKeys.delete(key));
      
      // Log stats if there were issues
      if (toRetry.length > 0) {
        console.log(
          `[BatchedApiLogger] Flush completed: ${successKeys.length} succeeded, ` +
          `${toRetry.length} will retry, ${remaining.length} remaining`
        );
      }
    } catch (error) {
      console.error('[BatchedApiLogger] Flush error:', error);
    } finally {
      this.isFlushInProgress = false;
    }
  }

  private isRetryableError(error: any): boolean {
    // Network errors and temporary failures are retryable
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }
    
    // Database connection errors are retryable
    if (error.message?.includes('connection') || 
        error.message?.includes('timeout')) {
      return true;
    }
    
    // 5xx errors are retryable
    if (error.statusCode >= 500 && error.statusCode < 600) {
      return true;
    }
    
    // 429 (rate limit) is retryable
    if (error.statusCode === 429) {
      return true;
    }
    
    return false;
  }

  // Get current queue stats
  getStats() {
    return {
      queueSize: this.queue.length,
      maxQueueSize: this.config.maxQueueSize,
      isFlushInProgress: this.isFlushInProgress,
      droppedLogs: this.droppedLogCount,
      oldestLogAge: this.queue.length > 0 
        ? Date.now() - Math.min(...this.queue.map(item => item.timestamp))
        : 0,
    };
  }

  // Graceful shutdown
  async shutdown() {
    console.log('[BatchedApiLogger] Shutting down...');
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Try to flush remaining logs with a timeout
    const flushTimeout = new Promise((resolve) => 
      setTimeout(() => resolve('timeout'), 10000)
    );
    
    const flushResult = await Promise.race([
      this.flush(),
      flushTimeout
    ]);
    
    if (flushResult === 'timeout') {
      console.warn(
        `[BatchedApiLogger] Shutdown flush timeout - ${this.queue.length} logs may be lost`
      );
    } else {
      console.log('[BatchedApiLogger] Shutdown complete');
    }
  }
}

// Singleton instance with production-ready config
export const batchedApiLogger = new BatchedApiLogger({
  batchSize: 20,        // Larger batches in production
  flushInterval: 3000,  // Flush more frequently
  maxQueueSize: 5000,   // Allow larger queue
  maxRetries: 3,
  maxLogAge: 120000,    // Keep logs for 2 minutes max
});

// Ensure logs are flushed on process exit
process.on('SIGINT', async () => {
  await batchedApiLogger.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await batchedApiLogger.shutdown();
  process.exit(0);
});

// Also handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('[BatchedApiLogger] Uncaught exception:', error);
  await batchedApiLogger.shutdown();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('[BatchedApiLogger] Unhandled rejection at:', promise, 'reason:', reason);
  await batchedApiLogger.shutdown();
  process.exit(1);
});