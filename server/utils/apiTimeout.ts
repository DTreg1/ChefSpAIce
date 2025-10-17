import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from '../apiError';

// Extend Axios config to include metadata
declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
    __retryCount?: number;
  }
}

// Centralized timeout configuration
export const API_TIMEOUTS = {
  USDA: {
    search: 15000,      // 15 seconds for search
    details: 10000,     // 10 seconds for details
    retries: 3,
  },
  BARCODE: {
    lookup: 15000,      // 15 seconds for barcode lookup
    rateLimit: 10000,   // 10 seconds for rate limit check
    retries: 2,
  },
  OPENAI: {
    chat: 30000,        // 30 seconds for chat
    stream: 60000,      // 60 seconds for streaming
    retries: 3,
  },
  OBJECT_STORAGE: {
    metadata: 10000,    // 10 seconds for metadata
    stream: 30000,      // 30 seconds for streaming
    retries: 3,
  }
};

// Enhanced axios instance factory with timeout and retry logic
export function createApiClient(
  baseURL: string,
  defaultTimeout: number = 15000,
  maxRetries: number = 3
) {
  const client = axios.create({
    baseURL,
    timeout: defaultTimeout,
    validateStatus: (status) => status < 500, // Don't throw for 4xx errors
  });

  // Add request interceptor for logging
  client.interceptors.request.use(
    (config) => {
      const startTime = Date.now();
      config.metadata = { startTime };
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add response interceptor for retry logic
  client.interceptors.response.use(
    (response) => {
      const endTime = Date.now();
      const duration = endTime - (response.config.metadata?.startTime || endTime);
      
      if (duration > defaultTimeout * 0.8) {
        console.warn(`API call approaching timeout: ${response.config.url} took ${duration}ms`);
      }
      
      return response;
    },
    async (error) => {
      const config = error.config;
      
      // Initialize retry count if not present
      if (!config.__retryCount) {
        config.__retryCount = 0;
      }
      
      // Check if we should retry
      if (config.__retryCount < maxRetries && isRetryableError(error)) {
        config.__retryCount++;
        
        // Calculate delay with exponential backoff
        const delay = calculateBackoffDelay(config.__retryCount);
        
        console.log(`Retrying API call (${config.__retryCount}/${maxRetries}): ${config.url} after ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return client(config);
      }
      
      return Promise.reject(error);
    }
  );

  return client;
}

// Check if error is retryable
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.code === 'ECONNABORTED' || 
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'EHOSTUNREACH') {
    return true;
  }
  
  // HTTP status codes that are retryable
  const status = error.response?.status;
  if (status === 429 || // Rate limited
      status === 502 || // Bad gateway
      status === 503 || // Service unavailable
      status === 504) { // Gateway timeout
    return true;
  }
  
  return false;
}

// Calculate exponential backoff delay with jitter
export function calculateBackoffDelay(retryCount: number, baseDelay: number = 1000): number {
  const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
  const maxDelay = 10000; // Max 10 seconds
  const delay = Math.min(exponentialDelay, maxDelay);
  
  // Add jitter (10% randomization)
  const jitter = delay * 0.1 * Math.random();
  
  return Math.floor(delay + jitter);
}

// Wrapper for making API calls with timeout and proper error handling
export async function makeApiCallWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new ApiError(
        `${operationName} timed out after ${timeoutMs}ms`,
        504,
        JSON.stringify({ timeout: timeoutMs, operation: operationName })
      ));
    }, timeoutMs);
  });
  
  try {
    return await Promise.race([operation(), timeoutPromise]);
  } catch (error: any) {
    // Enhance error with context
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(
      `${operationName} failed: ${error.message || 'Unknown error'}`,
      error.response?.status || 500,
      JSON.stringify({
        operation: operationName,
        originalError: error.message,
        code: error.code
      })
    );
  }
}

// Circuit breaker pattern for external APIs
export class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly name: string = 'API'
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      const now = Date.now();
      if (now - this.lastFailTime < this.timeout) {
        throw new ApiError(
          `${this.name} circuit breaker is open. Service temporarily unavailable.`,
          503
        );
      }
      // Try half-open state
      this.state = 'half-open';
    }
    
    try {
      const result = await operation();
      
      // Reset on success
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }
  
  private recordFailure() {
    this.failures++;
    this.lastFailTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.error(`${this.name} circuit breaker opened after ${this.failures} failures`);
    }
  }
  
  reset() {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailTime = 0;
  }
  
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailTime: this.lastFailTime
    };
  }
}