import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { deduplicatedFetch } from "./requestDeduplication";

// Enhanced error class for API errors
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: any,
    public retryable: boolean = false,
    public userMessage?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Network error messages with helpful guidance
const NETWORK_ERROR_MESSAGES: Record<string, { title: string; message: string; retryable: boolean }> = {
  NETWORK_ERROR: {
    title: "Connection Problem",
    message: "Unable to connect to the server. Please check your internet connection and try again.",
    retryable: true
  },
  TIMEOUT: {
    title: "Request Timeout",
    message: "The server is taking too long to respond. This might be due to slow internet or high server load. Please try again.",
    retryable: true
  },
  SERVER_ERROR: {
    title: "Server Error",
    message: "The server encountered an error. Our team has been notified. Please try again in a few moments.",
    retryable: true
  },
  UNAUTHORIZED: {
    title: "Session Expired",
    message: "Your session has expired. Please refresh the page to log in again.",
    retryable: false
  },
  FORBIDDEN: {
    title: "Access Denied",
    message: "You don't have permission to access this resource.",
    retryable: false
  },
  NOT_FOUND: {
    title: "Not Found",
    message: "The requested resource was not found. It may have been deleted or moved.",
    retryable: false
  },
  RATE_LIMIT: {
    title: "Too Many Requests",
    message: "You're making requests too quickly. Please wait a moment before trying again.",
    retryable: true
  },
  SERVICE_UNAVAILABLE: {
    title: "Service Temporarily Unavailable",
    message: "This service is temporarily unavailable for maintenance. Please try again in a few minutes.",
    retryable: true
  },
  BAD_REQUEST: {
    title: "Invalid Request",
    message: "The request contains invalid data. Please check your input and try again.",
    retryable: false
  },
  VALIDATION_ERROR: {
    title: "Validation Error",
    message: "The provided data doesn't meet the requirements. Please check and correct your input.",
    retryable: false
  }
};

// Get user-friendly error info based on status code or error type
function getUserFriendlyError(status: number, error?: any): { title: string; message: string; retryable: boolean } {
  // Network errors
  if (status === 0) {
    if (error?.name === "AbortError") {
      return NETWORK_ERROR_MESSAGES.TIMEOUT;
    }
    return NETWORK_ERROR_MESSAGES.NETWORK_ERROR;
  }

  // HTTP status codes
  if (status === 401) return NETWORK_ERROR_MESSAGES.UNAUTHORIZED;
  if (status === 403) return NETWORK_ERROR_MESSAGES.FORBIDDEN;
  if (status === 404) return NETWORK_ERROR_MESSAGES.NOT_FOUND;
  if (status === 400) return NETWORK_ERROR_MESSAGES.BAD_REQUEST;
  if (status === 422) return NETWORK_ERROR_MESSAGES.VALIDATION_ERROR;
  if (status === 429) return NETWORK_ERROR_MESSAGES.RATE_LIMIT;
  if (status === 503) return NETWORK_ERROR_MESSAGES.SERVICE_UNAVAILABLE;
  if (status === 504) return NETWORK_ERROR_MESSAGES.TIMEOUT;
  if (status >= 500) return NETWORK_ERROR_MESSAGES.SERVER_ERROR;

  // Default
  return {
    title: "Error",
    message: "An unexpected error occurred. Please try again.",
    retryable: false
  };
}

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  jitterRange: 300, // ± 300ms random jitter
};

// Track if we're in the initial load period (first 5 seconds after page load)
const pageLoadTime = Date.now();
function isInitialLoadPeriod(): boolean {
  return Date.now() - pageLoadTime < 5000;
}

// Determine if an error is retryable
function isRetryableError(status: number, error?: any): boolean {
  // Network errors are retryable
  if (status === 0) return true;
  
  // 401 errors during initial load are retryable (session might not be restored yet)
  if (status === 401 && isInitialLoadPeriod()) return true;
  
  // 5xx errors are retryable (server errors)
  if (status >= 500 && status < 600) return true;
  
  // Rate limiting is retryable after delay
  if (status === 429) return true;
  
  // Gateway timeout
  if (status === 408 || status === 504) return true;
  
  // Service unavailable
  if (status === 503) return true;
  
  return false;
}

// Calculate retry delay with exponential backoff and jitter
function calculateRetryDelay(attemptNumber: number): number {
  const baseDelay = Math.min(
    RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attemptNumber - 1),
    RETRY_CONFIG.maxDelay
  );
  
  // Add random jitter to prevent thundering herd
  const jitter = Math.random() * RETRY_CONFIG.jitterRange * 2 - RETRY_CONFIG.jitterRange;
  
  return Math.max(0, baseDelay + jitter);
}

// Safe JSON parsing with error handling
async function safeJsonParse(response: Response): Promise<any> {
  const text = await response.text();
  
  if (!text || text.trim() === "") {
    return null;
  }
  
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse JSON response:", text.substring(0, 500));
    throw new ApiError(
      response.status,
      `Invalid JSON response from server: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { responseText: text.substring(0, 500) }
    );
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText || `HTTP Error ${res.status}`;
    let errorDetails: any = undefined;
    let userFriendlyError = getUserFriendlyError(res.status);
    
    try {
      // Try to parse error response as JSON
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorJson = await safeJsonParse(res);
        if (errorJson) {
          errorMessage = errorJson.message || errorJson.error?.message || errorJson.error || errorMessage;
          errorDetails = errorJson.details || errorJson.error?.details || errorJson;
          
          // Use server-provided user message if available
          if (errorJson.userMessage) {
            userFriendlyError.message = errorJson.userMessage;
          }
        }
      } else {
        // For non-JSON responses, try to get text
        const text = await res.text();
        if (text && text.trim()) {
          errorMessage = text.substring(0, 500); // Limit error message length
        }
      }
    } catch (parseError) {
      // If we can't parse the error, use the default message
      console.error("Failed to parse error response:", parseError);
    }
    
    throw new ApiError(
      res.status, 
      errorMessage, 
      errorDetails,
      userFriendlyError.retryable,
      userFriendlyError.message
    );
  }
}

// Perform request with retry logic
async function performRequestWithRetry(
  url: string,
  options: RequestInit,
  retryCount = 0
): Promise<Response> {
  try {
    const res = await deduplicatedFetch(url, options);
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    const apiError = error instanceof ApiError ? error : null;
    const status = apiError?.status || 0;
    
    // Determine if we should retry
    const shouldRetry = retryCount < RETRY_CONFIG.maxRetries && 
                       (apiError?.retryable || isRetryableError(status, error));
    
    if (!shouldRetry) {
      // No more retries, throw the error
      if (!apiError) {
        // Convert to ApiError if it isn't already
        const userFriendlyError = getUserFriendlyError(0, error);
        throw new ApiError(
          0, 
          error instanceof Error ? error.message : "Unknown error",
          undefined,
          userFriendlyError.retryable,
          userFriendlyError.message
        );
      }
      throw error;
    }
    
    // Calculate retry delay
    const delay = calculateRetryDelay(retryCount + 1);
    
    // Log retry attempt
    console.log(`Retrying request to ${url} after ${delay}ms (attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries})`);
    
    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Retry the request
    return performRequestWithRetry(url, options, retryCount + 1);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: {
    timeout?: number; // Optional custom timeout in milliseconds
    skipRetry?: boolean; // Skip retry logic for this request
  }
): Promise<Response> {
  try {
    let bodyString: string | undefined;
    
    // Safely stringify the body data
    if (data !== undefined) {
      try {
        bodyString = JSON.stringify(data);
      } catch (error) {
        throw new Error(`Failed to serialize request data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Determine timeout based on operation type
    const defaultTimeout = url.includes('/upload') || url.includes('/image') || url.includes('/file') 
      ? 120000 // 2 minutes for file uploads
      : 30000;  // 30 seconds for regular operations
    
    const timeout = options?.timeout || defaultTimeout;
    
    const fetchOptions: RequestInit = {
      method,
      credentials: "include",
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(timeout),
    };
    
    // Only add body and Content-Type header for non-GET/HEAD methods
    if (method !== "GET" && method !== "HEAD") {
      if (data !== undefined) {
        fetchOptions.headers = { "Content-Type": "application/json" };
      }
      fetchOptions.body = bodyString;
    }
    
    if (options?.skipRetry) {
      // Skip retry logic for this request
      const res = await deduplicatedFetch(url, fetchOptions);
      await throwIfResNotOk(res);
      return res;
    } else {
      // Use retry logic
      return await performRequestWithRetry(url, fetchOptions);
    }
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      const userFriendlyError = getUserFriendlyError(0, error);
      throw new ApiError(0, error.message, undefined, true, userFriendlyError.message);
    }
    
    if (error instanceof Error && error.name === "AbortError") {
      const userFriendlyError = NETWORK_ERROR_MESSAGES.TIMEOUT;
      throw new ApiError(0, "Request timeout", undefined, true, userFriendlyError.message);
    }
    
    // Re-throw other errors
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey, signal }) => {
    // Ensure queryKey is an array and all elements are converted to strings before joining
    if (!Array.isArray(queryKey) || queryKey.length === 0) {
      throw new Error("Invalid queryKey: must be a non-empty array");
    }
    const url = queryKey.map(key => String(key)).join("/");
    
    try {
      // Determine timeout based on URL
      const timeout = url.includes('/upload') || url.includes('/image') || url.includes('/file')
        ? 120000 // 2 minutes for file operations
        : 30000;  // 30 seconds for regular operations
      
      // Create a combined signal for both abort and timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeout);
      
      // If React Query provides a signal, link it
      if (signal) {
        signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          abortController.abort();
        });
      }
      
      const fetchOptions: RequestInit = {
        credentials: "include",
        signal: abortController.signal,
      };
      
      const res = await performRequestWithRetry(url, fetchOptions);
      clearTimeout(timeoutId);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }
      
      // Handle different response types
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await safeJsonParse(res);
      }
      
      // For non-JSON responses, return text
      const text = await res.text();
      return text || null;
    } catch (error) {
      // Convert network errors to ApiError with user-friendly messages
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        const userFriendlyError = getUserFriendlyError(0, error);
        throw new ApiError(0, error.message, undefined, true, userFriendlyError.message);
      }
      
      if (error instanceof Error && error.name === "AbortError") {
        // This could be a normal cancellation or a timeout
        if (signal?.aborted) {
          // Normal cancellation by React Query, don't treat as error
          throw error;
        }
        // Timeout
        const userFriendlyError = NETWORK_ERROR_MESSAGES.TIMEOUT;
        throw new ApiError(0, "Request timeout", undefined, true, userFriendlyError.message);
      }
      
      // Re-throw other errors
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // Let our custom retry logic handle retries
        // React Query should not retry on its own
        return false;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
