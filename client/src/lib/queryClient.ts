import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { deduplicatedFetch } from "./requestDeduplication";

// Enhanced error class for API errors
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
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
    
    try {
      // Try to parse error response as JSON
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorJson = await safeJsonParse(res);
        if (errorJson) {
          errorMessage = errorJson.message || errorJson.error || errorMessage;
          errorDetails = errorJson.details || errorJson;
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
    
    throw new ApiError(res.status, errorMessage, errorDetails);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
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
    
    const res = await deduplicatedFetch(url, {
      method,
      headers: data !== undefined ? { "Content-Type": "application/json" } : {},
      body: bodyString,
      credentials: "include",
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new ApiError(0, "Network error: Unable to connect to server. Please check your connection.");
    }
    
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(0, "Request timeout: The server took too long to respond.");
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
      const res = await deduplicatedFetch(url, {
        credentials: "include",
        signal, // Use React Query's abort signal
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      
      // Handle different response types
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await safeJsonParse(res);
      }
      
      // For non-JSON responses, return text
      const text = await res.text();
      return text || null;
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        throw new ApiError(0, "Network error: Unable to connect to server. Please check your connection.");
      }
      
      if (error instanceof Error && error.name === "AbortError") {
        // This is a normal cancellation, don't treat as error
        throw error;
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
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
