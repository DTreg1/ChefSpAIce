// Request deduplication utility to prevent duplicate concurrent API calls

type PendingRequest = {
  promise: Promise<any>;
  timestamp: number;
  refCount: number;
};

// Cache for pending requests
const pendingRequests = new Map<string, PendingRequest>();

// Cleanup old cached requests after 5 seconds
const CACHE_TTL = 5000;
const CLEANUP_INTERVAL = 10000;

// Generate a unique key for the request
function generateRequestKey(method: string, url: string, body?: any): string {
  const bodyHash = body ? JSON.stringify(body) : '';
  return `${method}:${url}:${bodyHash}`;
}

// Clean up stale cached requests periodically
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  pendingRequests.forEach((request, key) => {
    // Remove if TTL expired and no active references
    if (request.refCount === 0 && now - request.timestamp > CACHE_TTL) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => pendingRequests.delete(key));
}, CLEANUP_INTERVAL);

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    clearInterval(cleanupInterval);
  });
}

// Deduplicated fetch wrapper
export async function deduplicatedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const method = options?.method || 'GET';
  const body = options?.body ? 
    (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : 
    undefined;
  
  // Only deduplicate GET requests and idempotent POST requests (like queries)
  const shouldDeduplicate = 
    method === 'GET' || 
    (method === 'POST' && url.includes('/api/chat/messages')) ||
    (method === 'POST' && url.includes('/api/search'));
  
  if (!shouldDeduplicate) {
    // Don't deduplicate mutations or non-idempotent requests
    return fetch(url, options);
  }
  
  const requestKey = generateRequestKey(method, url, body);
  const existingRequest = pendingRequests.get(requestKey);
  
  if (existingRequest) {
    // Request is already in flight, increment ref count and reuse
    existingRequest.refCount++;
    
    try {
      // Clone the response so each caller gets their own copy
      const response = await existingRequest.promise;
      return response.clone();
    } catch (error) {
      // Re-throw the error after cleanup
      throw error;
    } finally {
      // Always decrement ref count when done (success or error)
      existingRequest.refCount--;
      
      // Clean up if this was the last reference and there was an error
      if (existingRequest.refCount === 0) {
        // Schedule removal to allow for immediate subsequent requests
        setTimeout(() => {
          const cachedRequest = pendingRequests.get(requestKey);
          if (cachedRequest && cachedRequest.refCount === 0) {
            pendingRequests.delete(requestKey);
          }
        }, 100);
      }
    }
  }
  
  // No existing request, create a new one
  const requestPromise = fetch(url, options);
  
  pendingRequests.set(requestKey, {
    promise: requestPromise,
    timestamp: Date.now(),
    refCount: 1
  });
  
  try {
    const response = await requestPromise;
    return response;
  } catch (error) {
    // Re-throw the error after cleanup
    throw error;
  } finally {
    // Always decrement ref count (success or error)
    const request = pendingRequests.get(requestKey);
    if (request) {
      request.refCount--;
      
      // Remove immediately if no more references
      if (request.refCount === 0) {
        // Keep in cache briefly for immediate subsequent requests
        setTimeout(() => {
          const cachedRequest = pendingRequests.get(requestKey);
          if (cachedRequest && cachedRequest.refCount === 0) {
            pendingRequests.delete(requestKey);
          }
        }, 100);
      }
    }
  }
}

// Hook for React Query integration
export function createDeduplicatedQueryFn<T>(
  originalQueryFn: (context: any) => Promise<T>
): (context: any) => Promise<T> {
  return async (context) => {
    // For query functions, we can wrap the fetch call
    // But React Query already has its own deduplication
    // So this is mainly for direct fetch calls outside of React Query
    return originalQueryFn(context);
  };
}

// Export statistics for monitoring
export function getDeduplicationStats() {
  const stats = {
    pendingRequestsCount: pendingRequests.size,
    requests: Array.from(pendingRequests.entries()).map(([key, request]) => ({
      key: key.substring(0, 100), // Truncate for display
      refCount: request.refCount,
      age: Date.now() - request.timestamp
    }))
  };
  
  return stats;
}