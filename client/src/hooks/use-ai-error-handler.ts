/**
 * AI Error Handler Hook
 *
 * React hook for handling AI-related errors with retry capability
 * and user-friendly error messages.
 */

import { useState, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export interface AIErrorInfo {
  message: string;
  code: string;
  retryable: boolean;
  retryAfter?: number;
}

export interface UseAIErrorHandlerOptions {
  onRetry?: () => void;
  maxRetries?: number;
  showToast?: boolean;
}

/**
 * Hook for handling AI errors with retry logic
 */
export function useAIErrorHandler(options: UseAIErrorHandlerOptions = {}) {
  const { showToast = true, maxRetries = 3 } = options;
  const { toast } = useToast();

  const [error, setError] = useState<AIErrorInfo | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle an error from AI API
   */
  const handleError = useCallback(
    (errorResponse: any) => {
      // Extract error information
      const errorInfo: AIErrorInfo = {
        message:
          errorResponse?.error ||
          errorResponse?.message ||
          "An unexpected error occurred",
        code: errorResponse?.code || "UNKNOWN",
        retryable: errorResponse?.retryable ?? false,
        retryAfter: errorResponse?.retryAfter,
      };

      setError(errorInfo);

      // Show toast notification if enabled
      if (showToast) {
        toast({
          title: "Error",
          description: errorInfo.message,
          variant: "destructive",
          duration: errorInfo.retryable ? 10000 : 5000, // Longer duration for retryable errors
        });
      }

      return errorInfo;
    },
    [showToast, toast],
  );

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  /**
   * Retry the failed operation
   */
  const retry = useCallback(async () => {
    if (!error?.retryable || retryCount >= maxRetries) {
      return;
    }

    setIsRetrying(true);

    // If there's a retryAfter value, wait for that duration
    if (error.retryAfter) {
      await new Promise((resolve) => {
        retryTimeoutRef.current = setTimeout(resolve, error.retryAfter);
      });
    }

    setRetryCount((prev) => prev + 1);

    // Call the retry callback
    if (options.onRetry) {
      try {
        await options.onRetry();
        clearError(); // Clear error on successful retry
      } catch (retryError) {
        handleError(retryError);
      }
    }

    setIsRetrying(false);
  }, [error, retryCount, maxRetries, options, clearError, handleError]);

  /**
   * Check if we can retry
   */
  const canRetry = error?.retryable && retryCount < maxRetries;

  return {
    error,
    isRetrying,
    retryCount,
    canRetry,
    handleError,
    clearError,
    retry,
  };
}

/**
 * Parse error from fetch response
 */
export async function parseAPIError(response: Response): Promise<AIErrorInfo> {
  try {
    const data = await response.json();
    return {
      message: data.error || data.message || "Request failed",
      code: data.code || "UNKNOWN",
      retryable: data.retryable ?? false,
      retryAfter: data.retryAfter,
    };
  } catch {
    // If we can't parse JSON, return a generic error
    return {
      message: `Request failed with status ${response.status}`,
      code: "PARSE_ERROR",
      retryable: response.status >= 500,
      retryAfter: undefined,
    };
  }
}

/**
 * Error code to icon mapping
 */
export const errorCodeToIcon: Record<string, string> = {
  RATE_LIMIT: "⏱️",
  AUTH_ERROR: "🔑",
  SERVER_ERROR: "🔧",
  CONTENT_POLICY: "⚠️",
  TIMEOUT: "⏰",
  NETWORK_ERROR: "📡",
  INVALID_RESPONSE: "❌",
  CONTEXT_LENGTH_EXCEEDED: "📏",
  CIRCUIT_OPEN: "🔌",
  UNKNOWN: "❓",
};

/**
 * Get user-friendly error title
 */
export function getErrorTitle(code: string): string {
  const titles: Record<string, string> = {
    RATE_LIMIT: "Too Many Requests",
    AUTH_ERROR: "Authentication Failed",
    SERVER_ERROR: "Server Error",
    CONTENT_POLICY: "Content Policy Violation",
    TIMEOUT: "Request Timeout",
    NETWORK_ERROR: "Network Error",
    INVALID_RESPONSE: "Invalid Response",
    CONTEXT_LENGTH_EXCEEDED: "Message Too Long",
    CIRCUIT_OPEN: "Service Unavailable",
    UNKNOWN: "Error",
  };

  return titles[code] || "Error";
}

/**
 * Format retry time for display
 */
export function formatRetryTime(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);

  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? "" : "s"}`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
