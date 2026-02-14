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
import { Alert } from "react-native";
import { logger } from "@/lib/logger";
import { offlineMutationQueue } from "@/lib/offline-queue";

const AUTH_TOKEN_KEY = "@chefspaice/auth_token";

export async function getStoredAuthToken(): Promise<string | null> {
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

  // Fallback to production domain if env var is not set (for production builds)
  if (!host) {
    logger.warn("[API] EXPO_PUBLIC_DOMAIN not set, using production fallback: chefspaice.com");
    host = "chefspaice.com";
  }

  // Determine if this is a development environment (localhost or local IP)
  const isLocalDev = host.includes("localhost") || host.includes("127.0.0.1");
  
  // For production domains, strip the port (API runs on standard HTTPS port 443)
  // For development, preserve the port for local testing
  let finalHost = host;
  if (!isLocalDev && host.includes(":")) {
    // Strip port from production domains (e.g., "chefspaice.com:5000" -> "chefspaice.com")
    finalHost = host.split(":")[0];
  }

  // Use http for localhost development, https for all other environments
  const protocol = isLocalDev ? "http" : "https";
  let url = new URL(`${protocol}://${finalHost}`);

  // Remove trailing slash to prevent double-slashes when concatenating paths
  return url.href.replace(/\/$/, "");
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
export function handleAuthError() {
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

function unwrapApiBody(body: unknown): unknown {
  if (body && typeof body === "object" && "success" in body) {
    const typed = body as { success: boolean; data?: unknown; error?: string; errorCode?: string };
    if (!typed.success) {
      throw new Error(`${typed.errorCode || "ERROR"}: ${typed.error || "Request failed"}`);
    }
    return typed.data;
  }
  return body;
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
  } catch (error) {
    const isNetworkError =
      error instanceof TypeError &&
      (error.message.includes("Network request failed") ||
        error.message.includes("Failed to fetch") ||
        error.message.includes("network") ||
        error.message.includes("fetch"));

    if (isNetworkError && MUTATING_METHODS.has(method.toUpperCase())) {
      await offlineMutationQueue.enqueue({
        endpoint: route,
        method: method.toUpperCase(),
        body: data,
      });
      logger.log("[API] Mutation queued for offline retry", { method, route });
      try {
        Alert.alert(
          "Saved offline",
          "Will sync when connected.",
          [{ text: "OK" }],
        );
      } catch {
        // Alert may fail in some contexts
      }
    }
    throw error;
  }

  if (res.status === 401) {
    handleAuthError();
  }

  if (
    (res.status >= 500 || res.status === 408 || res.status === 429) &&
    MUTATING_METHODS.has(method.toUpperCase())
  ) {
    await offlineMutationQueue.enqueue({
      endpoint: route,
      method: method.toUpperCase(),
      body: data,
    });
    logger.log("[API] Server error - mutation queued for retry", { method, route, status: res.status });
  }

  await throwIfResNotOk(res);
  return res;
}

export async function apiRequestJson<T = unknown>(
  method: string,
  route: string,
  data?: unknown,
): Promise<T> {
  const res = await apiRequest(method, route, data);
  const body = await res.json();
  return unwrapApiBody(body) as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
function getQueryFn<T>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> {
  return async ({ queryKey }) => {
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
      handleAuthError();
      if (options.on401 === "returnNull") {
        return null as T;
      }
    }

    await throwIfResNotOk(res);
    const body = await res.json();
    return unwrapApiBody(body) as T;
  };
}

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
