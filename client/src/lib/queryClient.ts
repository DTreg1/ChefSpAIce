import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Handle session expiry specifically
    if (res.status === 401) {
      try {
        const errorData = JSON.parse(text);
        if (errorData.requiresReauth || errorData.error === 'session_expired') {
          // Show user-friendly message
          toast({
            title: "Session Expired",
            description: "Your session has expired. Please log in again.",
            variant: "default",
          });
          
          // Small delay so user can see the message
          setTimeout(() => {
            // Redirect to login page
            window.location.href = '/api/login';
          }, 1500);
          
          // Still throw the error so callers handle it properly
          throw new Error("Session expired - redirecting to login");
        }
      } catch (e) {
        // Check if this is our thrown error
        if (e instanceof Error && e.message === "Session expired - redirecting to login") {
          throw e;
        }
        
        // If parsing fails, it might be a general 401 - still redirect to login
        toast({
          title: "Authentication Required",
          description: "Please log in to continue.",
          variant: "default",
        });
        
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 1500);
        
        // Still throw the error so callers handle it properly
        throw new Error("Authentication required - redirecting to login");
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
