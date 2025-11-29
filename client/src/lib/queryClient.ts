import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // For 401, check if we need to redirect before consuming the body
    if (res.status === 401) {
      // Clone the response so we can read it without affecting the original
      const clonedRes = res.clone();
      try {
        const text = await clonedRes.text();
        const errorData = JSON.parse(text);
        if (errorData.requiresReauth || errorData.error === 'session_expired') {
          // Force page refresh to trigger re-authentication
          window.location.href = '/';
          // Throw to stop further processing after redirect
          throw new Error('Session expired - redirecting to login');
        }
      } catch (e) {
        // If it's our redirect error, re-throw it
        if (e instanceof Error && e.message.includes('redirecting to login')) {
          throw e;
        }
        // If parsing fails, continue with normal error handling below
      }
    }
    
    // Now read the original response body for the error message
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

/**
 * Determine if a string is an HTTP method.
 * Uses exact match (case-insensitive) to avoid misclassifying URLs like "/api/get-data".
 */
function isHttpMethod(value: string): boolean {
  return typeof value === 'string' && HTTP_METHODS.has(value.toUpperCase());
}

/**
 * Make an API request with automatic JSON handling.
 * Supports both argument orders for backwards compatibility:
 * - apiRequest(url, method, data) - URL first
 * - apiRequest(method, url, data) - Method first (legacy pattern)
 * 
 * Detection logic: If the first argument is a valid HTTP method AND the second 
 * argument is NOT a valid HTTP method, assume method-first order.
 */
export async function apiRequest<T = any>(
  urlOrMethod: string,
  methodOrUrl: string,
  data?: unknown | undefined,
): Promise<T> {
  // Validate inputs
  if (!urlOrMethod || typeof urlOrMethod !== 'string') {
    throw new Error('apiRequest: first argument must be a non-empty string');
  }
  if (!methodOrUrl || typeof methodOrUrl !== 'string') {
    throw new Error('apiRequest: second argument must be a non-empty string');
  }
  
  // Detect argument order: if first is HTTP method AND second is NOT, assume method-first
  let url: string;
  let method: string;
  
  const firstIsMethod = isHttpMethod(urlOrMethod);
  const secondIsMethod = isHttpMethod(methodOrUrl);
  
  if (firstIsMethod && !secondIsMethod) {
    // Called with (method, url, data) - most common pattern in codebase
    method = urlOrMethod.toUpperCase();
    url = methodOrUrl;
  } else if (!firstIsMethod && secondIsMethod) {
    // Called with (url, method, data)
    url = urlOrMethod;
    method = methodOrUrl.toUpperCase();
  } else if (firstIsMethod && secondIsMethod) {
    // Both look like methods - ambiguous but rare. Assume url-first since that's the function signature.
    console.warn(`apiRequest: Ambiguous arguments (${urlOrMethod}, ${methodOrUrl}). Assuming url-first order.`);
    url = urlOrMethod;
    method = methodOrUrl.toUpperCase();
  } else {
    // Neither is a recognized HTTP method - this is likely a bug
    // Check if first arg looks like a URL (common case: typo in method)
    if (urlOrMethod.startsWith('/') || urlOrMethod.startsWith('http')) {
      console.warn(`apiRequest: Unrecognized HTTP method "${methodOrUrl}". Defaulting to GET.`);
      url = urlOrMethod;
      method = 'GET';
    } else {
      throw new Error(`apiRequest: Unable to determine URL and method from arguments. ` +
        `Neither "${urlOrMethod}" nor "${methodOrUrl}" is a recognized HTTP method ` +
        `(GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS).`);
    }
  }
  
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Handle empty responses (e.g., 204 No Content)
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  
  // Parse JSON for any response that has content
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Flatten an object into key-value pairs suitable for URLSearchParams.
 * Handles nested objects by using dot notation (e.g., {filters: {status: 'open'}} -> 'filters.status=open')
 * Arrays use repeated keys (e.g., {tags: ['a', 'b']} -> 'tags=a&tags=b')
 */
function flattenObjectToParams(obj: Record<string, unknown>, prefix = ''): [string, string][] {
  const params: [string, string][] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (value === null || value === undefined) {
      continue;
    } else if (Array.isArray(value)) {
      // Arrays use repeated keys (standard form format)
      for (const item of value) {
        if (item !== null && item !== undefined) {
          if (typeof item === 'object') {
            // For object items in array, use JSON
            params.push([fullKey, JSON.stringify(item)]);
          } else {
            params.push([fullKey, String(item)]);
          }
        }
      }
    } else if (typeof value === 'object') {
      // Recursively flatten nested objects
      params.push(...flattenObjectToParams(value as Record<string, unknown>, fullKey));
    } else {
      params.push([fullKey, String(value)]);
    }
  }
  
  return params;
}

/**
 * Build a URL from query key segments.
 * - String segments are joined with "/"
 * - Object segments are converted to URL search params (supports nested objects)
 * - Other primitive types (numbers, booleans) are converted to strings
 */
function buildUrlFromQueryKey(queryKey: readonly unknown[]): string {
  const pathSegments: string[] = [];
  const searchParams = new URLSearchParams();
  
  for (const segment of queryKey) {
    if (typeof segment === 'string') {
      pathSegments.push(segment);
    } else if (typeof segment === 'number' || typeof segment === 'boolean') {
      pathSegments.push(String(segment));
    } else if (segment !== null && typeof segment === 'object' && !Array.isArray(segment)) {
      // Convert object to query params with nested object support
      const flatParams = flattenObjectToParams(segment as Record<string, unknown>);
      for (const [key, value] of flatParams) {
        searchParams.append(key, value);
      }
    }
    // Skip null, undefined, and arrays (arrays at top level of queryKey are unusual)
  }
  
  const path = pathSegments.join('/').replace(/\/+/g, '/');
  const queryString = searchParams.toString();
  
  return queryString ? `${path}?${queryString}` : path;
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Ensure queryKey is an array and has at least one element
    if (!Array.isArray(queryKey) || queryKey.length === 0) {
      throw new Error("Invalid queryKey: must be a non-empty array");
    }
    
    const url = buildUrlFromQueryKey(queryKey);
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Cache configuration based on data type
export const cacheConfig = {
  // Frequently changing data - refresh often
  inventory: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
    refetchInterval: false,
  },
  
  // Shopping list & meal plans - sync across tabs
  shoppingList: {
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
    refetchInterval: false,
  },
  
  // Chat messages - check for updates
  chat: {
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
    refetchInterval: false,
  },
  
  // Recipes - relatively stable
  recipes: {
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false,
  },
  
  // User data & preferences - stable
  user: {
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: true, // Still refetch to check auth
    refetchInterval: false,
  },
  
  // USDA/nutritional data - very stable
  usda: {
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    refetchInterval: false,
  },
  
  // Analytics & feedback - moderate freshness
  analytics: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchInterval: false,
  },
};

// Helper to get cache config by query key
export function getCacheConfigForQuery(queryKey: unknown[]): Partial<typeof cacheConfig.inventory> {
  const key = queryKey[0];
  
  if (typeof key === 'string') {
    // Match query keys to cache configs - support both legacy and v1 paths
    if (key.includes('/food-items') || key.includes('/inventories') || key.includes('/inventory')) {
      return cacheConfig.inventory;
    }
    if (key.includes('/shopping-list')) {
      return cacheConfig.shoppingList;
    }
    if (key.includes('/chat') || key.includes('/messages')) {
      return cacheConfig.chat;
    }
    if (key.includes('/recipes')) {
      return cacheConfig.recipes;
    }
    if (key.includes('/meal-plans')) {
      return cacheConfig.recipes;
    }
    if (key.includes('/auth/user') || key.includes('/preferences')) {
      return cacheConfig.user;
    }
    if (key.includes('/usda') || key.includes('/fdc') || key.includes('/nutrition')) {
      return cacheConfig.usda;
    }
    if (key.includes('/analytics') || key.includes('/feedback') || key.includes('/activity-logs')) {
      return cacheConfig.analytics;
    }
    if (key.includes('/api/v1/ai/')) {
      return cacheConfig.chat; // AI endpoints use similar caching to chat
    }
  }
  
  // Default: moderate caching
  return {
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false,
  };
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // Default: 5 minutes
      retry: (failureCount, error) => {
        // Retry network errors, but not auth or client errors
        if (error instanceof Error) {
          const message = error.message;
          if (message.includes('401') || message.includes('403') || message.includes('404')) {
            return false;
          }
        }
        return failureCount < 2; // Max 2 retries
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1, // Single retry for mutations
      retryDelay: 1000,
    },
  },
});