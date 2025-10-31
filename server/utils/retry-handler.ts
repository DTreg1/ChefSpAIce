/**
 * Retry Handler Utility
 * 
 * Consolidated retry logic with exponential backoff and jitter.
 * Provides a generic retry mechanism for any async operation.
 */

/**
 * Retry configuration options
 */
export interface RetryConfig {
  maxRetries?: number;      // Maximum number of retry attempts
  initialDelay?: number;     // Initial delay in ms
  maxDelay?: number;         // Maximum delay cap in ms
  backoffMultiplier?: number;// Exponential growth factor
  jitter?: boolean;          // Add random jitter to prevent thundering herd
  jitterRange?: number;      // Maximum jitter in ms
  retryCondition?: (error: Error | unknown) => boolean; // Custom retry condition
  onRetry?: (attempt: number, error: Error | unknown, delay: number) => void; // Retry callback
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: Required<Omit<RetryConfig, 'retryCondition' | 'onRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  jitterRange: 1000
};

/**
 * Calculate delay for exponential backoff with optional jitter
 * 
 * @param attempt - Current retry attempt (0-based)
 * @param config - Retry configuration
 * @returns Calculated delay in milliseconds
 * 
 * Formula: delay = min(initialDelay * (backoffMultiplier ^ attempt), maxDelay) + jitter
 * 
 * @example
 * calculateRetryDelay(0) // ~1000ms (first retry)
 * calculateRetryDelay(1) // ~2000ms (second retry)
 * calculateRetryDelay(2) // ~4000ms (third retry)
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = {}
): number {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const {
    initialDelay,
    maxDelay,
    backoffMultiplier,
    jitter,
    jitterRange
  } = mergedConfig;

  // Calculate base delay with exponential backoff
  let delay = Math.min(
    initialDelay * Math.pow(backoffMultiplier, attempt),
    maxDelay
  );

  // Add jitter to prevent thundering herd
  if (jitter) {
    const jitterAmount = Math.random() * jitterRange;
    delay += jitterAmount;
  }

  return Math.floor(delay);
}

/**
 * Default retry condition - checks for common retryable errors
 * 
 * @param error - Error to check
 * @returns true if error is retryable
 * 
 * Retryable conditions:
 * - Network errors (ECONNREFUSED, ENOTFOUND, ECONNRESET, ETIMEDOUT)
 * - HTTP 5xx server errors
 * - HTTP 429 rate limit errors
 * - Connection/timeout errors
 */
export function isRetryableError(error: Error | unknown): boolean {
  // Check for network errors
  if (error?.code) {
    const networkErrorCodes = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNABORTED'
    ];
    if (networkErrorCodes.includes(error.code)) {
      return true;
    }
  }

  // Check for timeout in message
  if (error?.message) {
    const message = error.message.toLowerCase();
    if (message.includes('timeout') || 
        message.includes('connection') ||
        message.includes('network')) {
      return true;
    }
  }

  // Check for HTTP status codes
  const status = error?.response?.status || error?.status || error?.statusCode;
  if (status) {
    // 5xx server errors are retryable
    if (status >= 500 && status < 600) {
      return true;
    }
    // 429 rate limit is retryable
    if (status === 429) {
      return true;
    }
  }

  // Default to non-retryable
  return false;
}

/**
 * Retry an async function with exponential backoff
 * 
 * @param fn - Async function to retry
 * @param config - Retry configuration
 * @returns Promise resolving to function result
 * @throws Last error if all retries fail
 * 
 * @example Basic usage:
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => fetchDataFromAPI(),
 *   { maxRetries: 3 }
 * );
 * ```
 * 
 * @example Custom retry condition:
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => database.query(sql),
 *   {
 *     maxRetries: 5,
 *     retryCondition: (error) => error.code === 'DEADLOCK'
 *   }
 * );
 * ```
 * 
 * @example With retry callback:
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => riskyOperation(),
 *   {
 *     onRetry: (attempt, error, delay) => {
 *       console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms`);
 *     }
 *   }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const { maxRetries, retryCondition, onRetry } = mergedConfig;
  
  // Use custom retry condition or default
  const shouldRetry = retryCondition || isRetryableError;
  
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // First attempt is not a retry
      if (attempt > 0) {
        const delay = calculateRetryDelay(attempt - 1, mergedConfig);
        
        // Call retry callback if provided
        if (onRetry) {
          onRetry(attempt, lastError, delay);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Execute the function
      return await fn();
      
    } catch (error) {
      lastError = error;

      // Check if this was the last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Check if error is retryable
      if (!shouldRetry(error)) {
        throw error;
      }
      
      // Continue to next attempt
    }
  }

  // Should never reach here, but throw last error if it does
  throw lastError || new Error('Retry failed');
}

/**
 * Create a retry wrapper with preset configuration
 * 
 * Useful for creating domain-specific retry functions with custom defaults.
 * 
 * @param defaultConfig - Default configuration for this wrapper
 * @returns Retry function with preset configuration
 * 
 * @example
 * ```typescript
 * // Create a database retry wrapper with custom defaults
 * const retryDatabase = createRetryWrapper({
 *   maxRetries: 5,
 *   initialDelay: 100,
 *   retryCondition: (error) => error.code === 'DEADLOCK'
 * });
 * 
 * // Use the wrapper
 * const result = await retryDatabase(() => db.query(sql));
 * ```
 */
export function createRetryWrapper(defaultConfig: RetryConfig) {
  return <T>(
    fn: () => Promise<T>,
    overrideConfig?: RetryConfig
  ): Promise<T> => {
    const config = { ...defaultConfig, ...overrideConfig };
    return retryWithBackoff(fn, config);
  };
}

/**
 * Batch retry tracker for managing multiple retry operations
 * 
 * Useful for tracking retry statistics and managing concurrent retries.
 */
export class RetryTracker {
  private attempts = new Map<string, number>();
  private failures = new Map<string, Error[]>();

  /**
   * Track a retry attempt
   */
  trackAttempt(key: string): number {
    const current = this.attempts.get(key) || 0;
    this.attempts.set(key, current + 1);
    return current + 1;
  }

  /**
   * Track a failure
   */
  trackFailure(key: string, error: Error): void {
    const failures = this.failures.get(key) || [];
    failures.push(error);
    this.failures.set(key, failures);
  }

  /**
   * Get attempt count for a key
   */
  getAttempts(key: string): number {
    return this.attempts.get(key) || 0;
  }

  /**
   * Get failures for a key
   */
  getFailures(key: string): Error[] {
    return this.failures.get(key) || [];
  }

  /**
   * Reset tracking for a key
   */
  reset(key: string): void {
    this.attempts.delete(key);
    this.failures.delete(key);
  }

  /**
   * Clear all tracking
   */
  clear(): void {
    this.attempts.clear();
    this.failures.clear();
  }
}