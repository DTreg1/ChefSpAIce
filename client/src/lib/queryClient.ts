import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Handle session expiry specifically
    if (res.status === 401) {
      try {
        const errorData = JSON.parse(text);
        if (errorData.requiresReauth || errorData.error === 'session_expired') {
          // Force page refresh to trigger re-authentication
          window.location.href = '/';
          return;
        }
      } catch (_e) {
        // If parsing fails, continue with normal error handling
      }
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Ensure queryKey is an array and all elements are converted to strings before joining
    if (!Array.isArray(queryKey) || queryKey.length === 0) {
      throw new Error("Invalid queryKey: must be a non-empty array");
    }
    const url = queryKey.map(key => String(key)).join("/");
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
    // Match query keys to cache configs
    if (key.includes('/food-items') || key.includes('/inventory')) {
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
    if (key.includes('/auth/user') || key.includes('/preferences')) {
      return cacheConfig.user;
    }
    if (key.includes('/usda') || key.includes('/fdc') || key.includes('/nutrition')) {
      return cacheConfig.usda;
    }
    if (key.includes('/analytics') || key.includes('/feedback')) {
      return cacheConfig.analytics;
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