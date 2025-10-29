/**
 * Batch Manager for optimizing multiple related API requests
 * Combines multiple requests into a single batch request when possible
 */

import { queryClient } from './queryClient';

interface BatchRequest {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Record<string, any>;
  body?: any;
}

interface BatchQueueItem {
  request: BatchRequest;
  resolve: (value: any) => void;
  reject: (error: Error | unknown) => void;
}

class BatchManager {
  private queue: Map<string, BatchQueueItem[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly batchDelay = 50; // ms to wait before sending batch
  private readonly maxBatchSize = 10;

  /**
   * Add a request to the batch queue
   */
  async addToBatch<T>(request: BatchRequest): Promise<T> {
    return new Promise((resolve, reject) => {
      const batchKey = this.getBatchKey(request);
      
      if (!this.queue.has(batchKey)) {
        this.queue.set(batchKey, []);
      }
      
      const queue = this.queue.get(batchKey)!;
      queue.push({ request, resolve, reject });
      
      // If batch is full, send immediately
      if (queue.length >= this.maxBatchSize) {
        this.sendBatch(batchKey);
      } else {
        // Otherwise, schedule batch send
        this.scheduleBatch(batchKey);
      }
    });
  }

  /**
   * Generate a batch key based on endpoint and method
   */
  private getBatchKey(request: BatchRequest): string {
    return `${request.method || 'GET'}:${request.endpoint.split('?')[0]}`;
  }

  /**
   * Schedule a batch to be sent after delay
   */
  private scheduleBatch(batchKey: string): void {
    // Clear existing timer if any
    const existingTimer = this.timers.get(batchKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.sendBatch(batchKey);
    }, this.batchDelay);
    
    this.timers.set(batchKey, timer);
  }

  /**
   * Send a batch of requests
   */
  private async sendBatch(batchKey: string): Promise<void> {
    const queue = this.queue.get(batchKey);
    if (!queue || queue.length === 0) return;
    
    // Clear queue and timer
    this.queue.delete(batchKey);
    const timer = this.timers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(batchKey);
    }
    
    // Determine if we should batch or send individually
    if (queue.length === 1) {
      // Single request, send normally
      const { request, resolve, reject } = queue[0];
      try {
        const result = await this.sendSingleRequest(request);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    } else {
      // Multiple requests, send as batch
      await this.sendBatchRequest(queue);
    }
  }

  /**
   * Send a single request
   */
  private async sendSingleRequest(request: BatchRequest): Promise<any> {
    const url = request.endpoint + 
      (request.params ? '?' + new URLSearchParams(request.params).toString() : '');
    
    const options: RequestInit = {
      method: request.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };
    
    if (request.body) {
      options.body = JSON.stringify(request.body);
    }
    
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Send multiple requests as a batch
   */
  private async sendBatchRequest(queue: BatchQueueItem[]): Promise<void> {
    // Check if backend supports batch endpoint
    const batchEndpoint = '/api/batch';
    
    try {
      // Prepare batch payload
      const batchPayload = queue.map(item => ({
        endpoint: item.request.endpoint,
        method: item.request.method || 'GET',
        params: item.request.params,
        body: item.request.body,
      }));
      
      const response = await fetch(batchEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ requests: batchPayload }),
      });
      
      if (response.ok) {
        const results = await response.json();
        
        // Resolve each promise with its result
        queue.forEach((item, index) => {
          if (results.responses && results.responses[index]) {
            if (results.responses[index].error) {
              item.reject(new Error(results.responses[index].error));
            } else {
              item.resolve(results.responses[index].data);
            }
          } else {
            item.reject(new Error('No response for request'));
          }
        });
      } else {
        // Batch endpoint not available, fall back to individual requests
        await this.fallbackToIndividualRequests(queue);
      }
    } catch (error) {
      // Fall back to individual requests if batch fails
      await this.fallbackToIndividualRequests(queue);
    }
  }

  /**
   * Fall back to sending requests individually
   */
  private async fallbackToIndividualRequests(queue: BatchQueueItem[]): Promise<void> {
    await Promise.all(
      queue.map(async ({ request, resolve, reject }) => {
        try {
          const result = await this.sendSingleRequest(request);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      })
    );
  }
}

// Export singleton instance
export const batchManager = new BatchManager();

/**
 * React hook for batched queries
 */
export function useBatchedQuery<T>(
  queryKey: any[],
  endpoint: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    method?: 'GET' | 'POST';
    body?: any;
    params?: Record<string, any>;
  }
) {
  return {
    queryKey,
    queryFn: async () => {
      if (options?.enabled === false) {
        throw new Error('Query is disabled');
      }
      
      return batchManager.addToBatch<T>({
        endpoint,
        method: options?.method || 'GET',
        params: options?.params,
        body: options?.body,
      });
    },
    enabled: options?.enabled !== false,
    staleTime: options?.staleTime || 0,
  };
}