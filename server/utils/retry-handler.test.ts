/**
 * Unit tests for retry-handler.ts
 * 
 * Tests the consolidated retry logic with exponential backoff and jitter.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { 
  calculateRetryDelay, 
  isRetryableError, 
  retryWithBackoff, 
  RetryTracker,
  DEFAULT_RETRY_CONFIG 
} from './retry-handler';

// Mock timers for testing
jest.useFakeTimers();

describe('Retry Handler Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      const config = { jitter: false };
      
      expect(calculateRetryDelay(0, config)).toBe(1000); // 1s
      expect(calculateRetryDelay(1, config)).toBe(2000); // 2s
      expect(calculateRetryDelay(2, config)).toBe(4000); // 4s
      expect(calculateRetryDelay(3, config)).toBe(8000); // 8s
    });

    it('should respect maxDelay cap', () => {
      const config = { 
        jitter: false, 
        maxDelay: 5000,
        initialDelay: 1000,
        backoffMultiplier: 2 
      };
      
      expect(calculateRetryDelay(0, config)).toBe(1000); // 1s
      expect(calculateRetryDelay(1, config)).toBe(2000); // 2s
      expect(calculateRetryDelay(2, config)).toBe(4000); // 4s
      expect(calculateRetryDelay(3, config)).toBe(5000); // Capped at 5s
      expect(calculateRetryDelay(10, config)).toBe(5000); // Still capped at 5s
    });

    it('should add jitter when enabled', () => {
      const config = { 
        jitter: true, 
        jitterRange: 1000,
        initialDelay: 1000 
      };
      
      // With jitter, the delay should be between initialDelay and initialDelay + jitterRange
      const delay = calculateRetryDelay(0, config);
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(2000);
    });

    it('should use custom backoff multiplier', () => {
      const config = { 
        jitter: false,
        backoffMultiplier: 3,
        initialDelay: 100 
      };
      
      expect(calculateRetryDelay(0, config)).toBe(100);  // 100ms
      expect(calculateRetryDelay(1, config)).toBe(300);  // 300ms
      expect(calculateRetryDelay(2, config)).toBe(900);  // 900ms
    });
  });

  describe('isRetryableError', () => {
    it('should identify network errors as retryable', () => {
      const networkError: any = new Error('Connection refused');
      networkError.code = 'ECONNREFUSED';
      expect(isRetryableError(networkError)).toBe(true);
      
      const notFoundError: any = new Error('Not found');
      notFoundError.code = 'ENOTFOUND';
      expect(isRetryableError(notFoundError)).toBe(true);
      
      const resetError: any = new Error('Connection reset');
      resetError.code = 'ECONNRESET';
      expect(isRetryableError(resetError)).toBe(true);
    });

    it('should identify timeout errors as retryable', () => {
      // By error code
      const timeoutError: any = new Error('Request timeout');
      timeoutError.code = 'ETIMEDOUT';
      expect(isRetryableError(timeoutError)).toBe(true);
      
      // By message content
      const messageTimeout = new Error('Request timeout occurred');
      expect(isRetryableError(messageTimeout)).toBe(true);
      
      const connectionError = new Error('Connection failed');
      expect(isRetryableError(connectionError)).toBe(true);
      
      const networkError = new Error('Network error');
      expect(isRetryableError(networkError)).toBe(true);
    });

    it('should identify 5xx status codes as retryable', () => {
      const error500: any = new Error('Internal Server Error');
      error500.status = 500;
      expect(isRetryableError(error500)).toBe(true);

      const error502: any = new Error('Bad Gateway');
      error502.status = 502;
      expect(isRetryableError(error502)).toBe(true);

      const error503: any = new Error('Service Unavailable');
      error503.status = 503;
      expect(isRetryableError(error503)).toBe(true);
      
      // Test response.status variant
      const errorWithResponse: any = new Error('Server Error');
      errorWithResponse.response = { status: 504 };
      expect(isRetryableError(errorWithResponse)).toBe(true);
      
      // Test statusCode variant
      const errorWithStatusCode: any = new Error('Server Error');
      errorWithStatusCode.statusCode = 505;
      expect(isRetryableError(errorWithStatusCode)).toBe(true);
    });

    it('should identify 429 (rate limit) as retryable', () => {
      const rateLimitError: any = new Error('Too Many Requests');
      rateLimitError.status = 429;
      expect(isRetryableError(rateLimitError)).toBe(true);
    });

    it('should not retry 4xx errors (except 429)', () => {
      const error400: any = new Error('Bad Request');
      error400.status = 400;
      expect(isRetryableError(error400)).toBe(false);

      const error401: any = new Error('Unauthorized');
      error401.status = 401;
      expect(isRetryableError(error401)).toBe(false);

      const error404: any = new Error('Not Found');
      error404.status = 404;
      expect(isRetryableError(error404)).toBe(false);
    });
    
    it('should not retry unrecognized errors', () => {
      const regularError = new Error('Some random error');
      expect(isRetryableError(regularError)).toBe(false);
      
      const customError: any = new Error('Custom error');
      customError.customProperty = 'value';
      expect(isRetryableError(customError)).toBe(false);
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt if operation succeeds', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      
      const result = await retryWithBackoff(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      // Create retryable errors with network error codes
      const error1: any = new Error('Connection failed');
      error1.code = 'ECONNRESET';
      const error2: any = new Error('Connection timeout');
      error2.code = 'ETIMEDOUT';
      
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockResolvedValueOnce('success');
      
      const promise = retryWithBackoff(mockOperation, { 
        maxRetries: 3,
        initialDelay: 100,
        jitter: false 
      });

      // Fast-forward through all timers
      await jest.runAllTimersAsync();
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should respect maxRetries and throw after max attempts', async () => {
      // Create a retryable error
      const retryableError: any = new Error('Network timeout');
      retryableError.code = 'ETIMEDOUT';
      
      const mockOperation = jest.fn()
        .mockRejectedValue(retryableError);
      
      const promise = retryWithBackoff(mockOperation, { 
        maxRetries: 2,
        initialDelay: 100,
        jitter: false 
      });

      // Fast-forward through all timers
      await jest.runAllTimersAsync();
      
      await expect(promise).rejects.toThrow('Network timeout');
      expect(mockOperation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should call onRetry callback on each retry', async () => {
      // Create a retryable error
      const retryableError: any = new Error('Connection refused');
      retryableError.code = 'ECONNREFUSED';
      
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValueOnce('success');
      
      const onRetry = jest.fn();
      
      const promise = retryWithBackoff(mockOperation, { 
        maxRetries: 2,
        initialDelay: 100,
        jitter: false,
        onRetry 
      });

      await jest.runAllTimersAsync();
      await promise;
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, retryableError, 100);
    });

    it('should use custom retryCondition', async () => {
      const customError = new Error('Custom error');
      (customError as any).customRetryable = true;
      
      const normalError = new Error('Normal error');
      
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(customError)
        .mockRejectedValueOnce(normalError);
      
      const retryCondition = (error: any) => error.customRetryable === true;
      
      const promise = retryWithBackoff(mockOperation, { 
        maxRetries: 2,
        initialDelay: 100,
        jitter: false,
        retryCondition 
      });

      await jest.runAllTimersAsync();
      
      // Should retry for customError but not for normalError
      await expect(promise).rejects.toThrow('Normal error');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('RetryTracker', () => {
    it('should track attempts correctly', () => {
      const tracker = new RetryTracker();
      const key = 'test-operation';
      
      expect(tracker.getAttempts(key)).toBe(0);
      
      tracker.trackAttempt(key);
      expect(tracker.getAttempts(key)).toBe(1);
      
      tracker.trackAttempt(key);
      expect(tracker.getAttempts(key)).toBe(2);
    });

    it('should track failures correctly', () => {
      const tracker = new RetryTracker();
      const key = 'test-operation';
      const error1 = new Error('First failure');
      const error2 = new Error('Second failure');
      
      expect(tracker.getFailures(key)).toEqual([]);
      
      tracker.trackFailure(key, error1);
      expect(tracker.getFailures(key)).toEqual([error1]);
      
      tracker.trackFailure(key, error2);
      expect(tracker.getFailures(key)).toEqual([error1, error2]);
    });

    it('should reset tracking for a key', () => {
      const tracker = new RetryTracker();
      const key = 'test-operation';
      const error = new Error('Test error');
      
      tracker.trackAttempt(key);
      tracker.trackAttempt(key);
      tracker.trackFailure(key, error);
      
      expect(tracker.getAttempts(key)).toBe(2);
      expect(tracker.getFailures(key)).toEqual([error]);
      
      tracker.reset(key);
      expect(tracker.getAttempts(key)).toBe(0);
      expect(tracker.getFailures(key)).toEqual([]);
    });

    it('should track multiple operations independently', () => {
      const tracker = new RetryTracker();
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');
      
      tracker.trackAttempt('operation1');
      tracker.trackAttempt('operation1');
      tracker.trackFailure('operation1', error1);
      
      tracker.trackAttempt('operation2');
      tracker.trackFailure('operation2', error2);
      
      expect(tracker.getAttempts('operation1')).toBe(2);
      expect(tracker.getAttempts('operation2')).toBe(1);
      expect(tracker.getAttempts('operation3')).toBe(0);
      
      expect(tracker.getFailures('operation1')).toEqual([error1]);
      expect(tracker.getFailures('operation2')).toEqual([error2]);
      expect(tracker.getFailures('operation3')).toEqual([]);
    });

    it('should clear all tracking', () => {
      const tracker = new RetryTracker();
      const error = new Error('Test error');
      
      tracker.trackAttempt('operation1');
      tracker.trackAttempt('operation2');
      tracker.trackFailure('operation1', error);
      
      tracker.clear();
      
      expect(tracker.getAttempts('operation1')).toBe(0);
      expect(tracker.getAttempts('operation2')).toBe(0);
      expect(tracker.getFailures('operation1')).toEqual([]);
    });
  });
});