/**
 * Batched API Usage Logger
 * 
 * Efficient logging service for API usage tracking with batching, retry logic, and graceful shutdown.
 * Queues API usage logs in memory and periodically flushes them to the database in batches.
 * 
 * Purpose:
 * - Track API usage (OpenAI, USDA, etc.) for analytics and cost monitoring
 * - Prevent database connection exhaustion from individual log writes
 * - Improve performance by batching multiple log entries into fewer database transactions
 * - Handle transient database failures with automatic retry
 * 
 * Architecture:
 * - Queue: In-memory FIFO queue of pending log entries
 * - Batch Processing: Periodic flushes (time-based) or threshold-based (size-based)
 * - Retry Logic: Exponential backoff with jitter for failed writes
 * - Back-pressure: Drops logs when queue is full (prevents memory exhaustion)
 * - Graceful Shutdown: Flushes remaining logs on process termination
 * 
 * Default Class Configuration:
 * - batchSize: 10 logs per batch
 * - flushInterval: 5000ms (5 seconds)
 * - maxQueueSize: 1000 logs
 * - maxRetries: 3 attempts per log
 * - maxLogAge: 60000ms (60 seconds)
 * 
 * Production Singleton Configuration (batchedApiLogger export):
 * - batchSize: 20 logs per batch (larger batches)
 * - flushInterval: 3000ms (3 seconds, faster flushing)
 * - maxQueueSize: 5000 logs (handle traffic spikes)
 * - maxRetries: 3 attempts per log (same)
 * - maxLogAge: 120000ms (2 minutes, more retry time)
 * 
 * Batching Strategy:
 * - Flush Triggers:
 *   1. Queue size reaches batchSize → immediate flush
 *   2. flushInterval elapsed → periodic flush
 * - Batch Size: Processes up to batchSize * 2 logs per flush (allows catching up)
 * - Deduplication: No longer used (was too aggressive and dropped legitimate logs)
 * 
 * Retry Logic:
 * - Exponential Backoff: delay = min(1000 * 2^retryCount, 10000)ms
 * - Jitter: Random 0-1000ms added to prevent thundering herd
 * - Retryable Errors:
 *   - Network errors (ECONNREFUSED, ETIMEDOUT)
 *   - Database connection errors
 *   - 5xx server errors
 *   - 429 rate limit errors
 * - Non-Retryable: 4xx client errors (except 429)
 * 
 * Back-pressure Handling:
 * - When queue is full (maxQueueSize), new logs are dropped
 * - Warning logged every 10 seconds (not per drop to avoid spam)
 * - Tracks dropped log count for monitoring
 * - Prevents memory leaks and OOM errors
 * 
 * Graceful Shutdown:
 * - Process signals (SIGINT, SIGTERM) trigger shutdown
 * - Attempts to flush remaining logs (10-second timeout)
 * - Logs dropped count if timeout occurs
 * - Also handles uncaught exceptions and unhandled promise rejections
 * 
 * Error Handling:
 * - All errors logged with context (userId, apiName, endpoint)
 * - Failed logs retried with exponential backoff
 * - Logs exceeding maxRetries are dropped (prevents infinite retry)
 * - Logs older than maxLogAge are pruned before flush
 * 
 * Performance Characteristics:
 * - Memory: O(maxQueueSize) worst case
 * - CPU: Minimal (periodic timer + async processing)
 * - Database: Reduced by batchSize factor (1 query per 20 logs instead of 20 queries)
 * - Latency: Up to flushInterval delay (acceptable for analytics)
 * 
 * @module server/batchedApiLogger
 */

import { storage } from '../storage';
import type { InsertApiUsageLog } from '@shared/schema';
import { calculateRetryDelay, isRetryableError } from './retry-handler';

/**
 * Queued log entry with metadata
 * @private
 */
interface QueuedLog {
  userId: string;                          // User who made the API call
  log: Omit<InsertApiUsageLog, 'userId'>; // Log data (apiName, endpoint, etc.)
  timestamp: number;                       // When log was queued (for age tracking)
  retryCount: number;                      // Number of retry attempts so far
}

/**
 * Logger configuration options
 */
interface LoggerConfig {
  batchSize: number;      // Flush after this many logs queued
  flushInterval: number;  // Flush every N milliseconds
  maxQueueSize: number;   // Max logs to keep in memory (back-pressure)
  maxRetries: number;     // Max retry attempts per log
  maxLogAge: number;      // Drop logs older than this (ms)
}

/**
 * Batched API Logger Implementation
 * 
 * Efficiently logs API usage events to database using batching and retry logic.
 * Singleton instance exported as `batchedApiLogger` for application-wide use.
 * 
 * Key Features:
 * - Batching: Reduces database load by grouping log writes
 * - Retry: Handles transient failures with exponential backoff
 * - Back-pressure: Drops logs when queue is full (prevents OOM)
 * - Graceful Shutdown: Flushes remaining logs on process exit
 * - Monitoring: Provides stats (queue size, dropped logs, oldest log age)
 * 
 * Default Configuration:
 * - batchSize: 10 logs per flush
 * - flushInterval: 5 seconds
 * - maxQueueSize: 1000 logs
 * - maxRetries: 3 attempts per log
 * - maxLogAge: 60 seconds before pruning
 * 
 * Note: Production singleton instance uses larger values (see batchedApiLogger export)
 * 
 * @class
 */
class BatchedApiLogger {
  private queue: QueuedLog[] = [];
  private config: LoggerConfig = {
    batchSize: 10,          // Write after 10 logs (default)
    flushInterval: 5000,    // Or after 5 seconds (default)
    maxQueueSize: 1000,     // Max queue size to prevent memory leak (default)
    maxRetries: 3,          // Max retry attempts (default)
    maxLogAge: 60000,       // Drop logs older than 60 seconds (default)
  };
  
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushInProgress = false;
  private droppedLogCount = 0;
  private lastDropWarningTime = 0;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
    this.startPeriodicFlush();
  }

  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Queue an API usage log entry
   * 
   * Adds log to in-memory queue for eventual database write.
   * Returns immediately (non-blocking) - actual write happens asynchronously.
   * 
   * @param userId - User who made the API call
   * @param log - Log entry data (apiName, endpoint, statusCode, responseTime, etc.)
   * 
   * Behavior:
   * - Queues log with timestamp and retry count
   * - Triggers immediate flush if batch size reached
   * - Drops log if queue is full (back-pressure)
   * - Does not throw errors (fire-and-forget logging)
   * 
   * Back-pressure:
   * - When queue reaches maxQueueSize, new logs are dropped
   * - Warning logged periodically (every 10 seconds)
   * - Prevents memory exhaustion from excessive logging
   * 
   * @example
   * await batchedApiLogger.logApiUsage(userId, {
   *   apiName: 'OpenAI',
   *   endpoint: '/v1/chat/completions',
   *   statusCode: 200,
   *   responseTime: 1234,
   *   errorMessage: null
   * });
   */
  async logApiUsage(userId: string, log: Omit<InsertApiUsageLog, 'userId'>) {
    // Note: We're not checking queuedLogKeys here anymore since each call should be unique
    // The deduplication was too aggressive and was dropping legitimate logs

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

    // Check if we should flush immediately
    if (this.queue.length >= this.config.batchSize) {
      // Don't await - let it flush in the background
      this.flush().catch(err => 
        console.error('[BatchedApiLogger] Background flush failed:', err)
      );
    }
  }

  /**
   * Flush queued logs to database
   * 
   * Processes pending logs in batches, retries failures, and prunes old logs.
   * Called automatically by periodic timer or when batch size reached.
   * 
   * Process:
   * 1. Check if flush already in progress (prevent concurrent flushes)
   * 2. Prune logs older than maxLogAge
   * 3. Take batch of logs (up to batchSize * 2)
   * 4. Attempt to write each log with retry logic
   * 5. Re-queue failed logs (if retries remaining)
   * 6. Update queue with remaining logs
   * 
   * Retry Logic:
   * - Failed logs re-added to queue with incremented retryCount
   * - Exponential backoff: delay = min(1000 * 2^retryCount, 10000)ms
   * - Jitter added to prevent thundering herd
   * - Logs exceeding maxRetries are dropped
   * 
   * Performance:
   * - Processes at most batchSize * 2 logs per flush
   * - Allows catching up if queue is large
   * - Prevents infinite flush loops
   * 
   * @private
   */
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
          console.warn(
            `[BatchedApiLogger] Dropping expired log: ${item.userId}-${item.log.apiName}-${item.log.endpoint}`
          );
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
          // Calculate delay using the consolidated retry handler
          if (item.retryCount > 0) {
            const delay = calculateRetryDelay(item.retryCount - 1, {
              initialDelay: 1000,
              maxDelay: 10000,
              jitter: true,
              jitterRange: 1000
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
          try {
            await storage.logApiUsage(item.userId, item.log);
            return { success: true, item };
          } catch (error) {
            // Check if error is retryable using consolidated function
            const retryable = isRetryableError(error);
            
            if (retryable && item.retryCount < this.config.maxRetries) {
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
      
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { success, item, retry } = result.value;
          
          if (!success && retry) {
            // Increment retry count and add back to queue
            toRetry.push({ ...item, retryCount: item.retryCount + 1 });
          }
          // If successful or no retry, the log is done - no tracking cleanup needed
          // since we're no longer using queuedLogKeys for deduplication
        }
      });

      // Update queue: remove processed items, add retry items, keep remaining
      const remaining = this.queue.slice(batchSize);
      this.queue = [...toRetry, ...remaining];
      
      // Log stats if there were issues
      if (toRetry.length > 0) {
        const successCount = batch.length - toRetry.length;
        console.log(
          `[BatchedApiLogger] Flush completed: ${successCount} succeeded, ` +
          `${toRetry.length} will retry, ${remaining.length} remaining`
        );
      }
    } catch (error) {
      console.error('[BatchedApiLogger] Flush error:', error);
    } finally {
      this.isFlushInProgress = false;
    }
  }

  /**
   * Get logger statistics
   * 
   * Returns current state of the logger for monitoring and debugging.
   * Useful for health checks and observability.
   * 
   * @returns Stats object with queue metrics
   * 
   * Stats Returned:
   * - queueSize: Current number of logs in queue
   * - maxQueueSize: Configured maximum queue size
   * - isFlushInProgress: Whether flush is currently running
   * - droppedLogs: Number of logs dropped (since last warning)
   * - oldestLogAge: Age of oldest log in queue (ms)
   * 
   * @example
   * const stats = batchedApiLogger.getStats();
   * // console.log(`Queue: ${stats.queueSize}/${stats.maxQueueSize}`);
   * // console.log(`Oldest log: ${stats.oldestLogAge}ms ago`);
   */
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

  /**
   * Gracefully shutdown the logger
   * 
   * Stops periodic flush timer and attempts to flush remaining logs.
   * Called automatically on process termination signals (SIGINT, SIGTERM).
   * 
   * @returns Promise that resolves when shutdown complete (or times out)
   * 
   * Shutdown Process:
   * 1. Stop periodic flush timer
   * 2. Attempt to flush remaining logs (10-second timeout)
   * 3. Log warning if timeout occurs (logs may be lost)
   * 
   * Timeout:
   * - 10 seconds max for flush completion
   * - Prevents hanging on exit
   * - Logs count of potentially lost logs
   * 
   * @example
   * // Manual shutdown (normally handled automatically)
   * await batchedApiLogger.shutdown();
   */
  async shutdown() {
    // console.log('[BatchedApiLogger] Shutting down...');
    
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
      // console.log('[BatchedApiLogger] Shutdown complete');
    }
  }
}

/**
 * Singleton logger instance
 * 
 * Exported for application-wide use. 
 * 
 * Production Configuration (overrides class defaults):
 * - batchSize: 20 logs per flush (vs default 10)
 * - flushInterval: 3000ms / 3 seconds (vs default 5000ms)
 * - maxQueueSize: 5000 logs (vs default 1000)
 * - maxRetries: 3 attempts per log (same as default)
 * - maxLogAge: 120000ms / 2 minutes (vs default 60000ms)
 * 
 * Rationale for Production Values:
 * - Larger batches (20): Reduce database load further
 * - Faster flush (3s): Reduce data loss window on crash
 * - Bigger queue (5000): Handle traffic spikes better
 * - Longer age (2m): More time for retries during outages
 * 
 * @example
 * import { batchedApiLogger } from './batchedApiLogger';
 * 
 * await batchedApiLogger.logApiUsage(userId, {
 *   apiName: 'OpenAI',
 *   endpoint: '/v1/chat/completions',
 *   statusCode: 200,
 *   responseTime: 1234
 * });
 */
export const batchedApiLogger = new BatchedApiLogger({
  batchSize: 20,        // Larger batches in production (default: 10)
  flushInterval: 3000,  // Flush more frequently (default: 5000ms)
  maxQueueSize: 5000,   // Allow larger queue (default: 1000)
  maxRetries: 3,        // Same as default
  maxLogAge: 120000,    // Keep logs for 2 minutes max (default: 60000ms)
});

/**
 * Process signal handlers for graceful shutdown
 * 
 * Ensures pending logs are flushed before process termination.
 * Handles SIGINT (Ctrl+C), SIGTERM (kill), uncaught exceptions, and unhandled rejections.
 */

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