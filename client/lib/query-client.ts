/**
 * =============================================================================
 * REACT QUERY CLIENT CONFIGURATION
 * =============================================================================
 * 
 * Sets up TanStack React Query for data fetching throughout ChefSpAIce.
 * Provides the API request utilities and default query configuration.
 * 
 * KEY EXPORTS:
 * - queryClient: Pre-configured QueryClient instance
 * - getApiUrl(): Returns the Express API base URL
 * - apiRequest(): Makes authenticated API calls with error handling
 * - getQueryFn(): Factory for creating query functions
 * 
 * ERROR HANDLING:
 * - 401 errors trigger auth error callback (auto-logout)
 * - Non-OK responses throw errors with status and message
 * 
 * QUERY DEFAULTS:
 * - No automatic refetching (staleTime: Infinity)
 * - No retry on failure
 * - Credentials included for auth cookies
 * 
 * USAGE:
 * - Queries: useQuery({ queryKey: ['/api/recipes'] })
 * - Mutations: useMutation + apiRequest()
 * 
 * @module lib/query-client
 */

import { QueryClient, QueryFunction } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_TOKEN_KEY = "@chefspaice/auth_token";

async function getStoredAuthToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    return token ? JSON.parse(token) : null;
  } catch {
    return null;
  }
}

/**
 * Gets the base URL for the Express API server (e.g., "http://localhost:3000")
 * Uses EXPO_PUBLIC_DOMAIN environment variable
 * @returns {string} The API base URL
 */
export function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  let url = new URL(`https://${host}`);

  // Remove trailing slash to prevent double-slashes when concatenating paths
  return url.href.replace(/\/$/, '');
}

// Auth error callback - set by AuthContext to handle 401 errors
let authErrorCallback: (() => void) | null = null;

export function setAuthErrorCallback(callback: () => void) {
  authErrorCallback = callback;
}

export function clearAuthErrorCallback() {
  authErrorCallback = null;
}

// Handle auth errors by calling the registered callback
function handleAuthError() {
  if (authErrorCallback) {
    authErrorCallback();
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const token = await getStoredAuthToken();
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Handle 401 errors by triggering auth error callback
  if (res.status === 401) {
    handleAuthError();
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const token = await getStoredAuthToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (res.status === 401) {
      // Always trigger auth error callback on 401
      handleAuthError();
      
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
