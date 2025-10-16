import { ApiError } from "./queryClient";

/**
 * Extract a user-friendly error message from an error
 * Prioritizes the userMessage field if available
 */
export function getUserErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // Use the user-friendly message if available
    if (error.userMessage) {
      return error.userMessage;
    }
    
    // Fall back to the error message
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === "string") {
    return error;
  }
  
  return "An unexpected error occurred. Please try again.";
}

/**
 * Get a title for the error toast/alert
 */
export function getErrorTitle(error: unknown): string {
  if (error instanceof ApiError) {
    // Map status codes to titles
    switch (error.status) {
      case 0:
        return "Connection Error";
      case 400:
        return "Invalid Request";
      case 401:
        return "Authentication Error";
      case 403:
        return "Access Denied";
      case 404:
        return "Not Found";
      case 422:
        return "Validation Error";
      case 429:
        return "Too Many Requests";
      case 500:
      case 502:
      case 503:
        return "Server Error";
      case 504:
        return "Timeout";
      default:
        return "Error";
    }
  }
  
  return "Error";
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.retryable;
  }
  return false;
}

/**
 * Format error for display with optional retry suggestion
 */
export function formatErrorForDisplay(error: unknown): {
  title: string;
  message: string;
  showRetry: boolean;
} {
  const title = getErrorTitle(error);
  const message = getUserErrorMessage(error);
  const showRetry = isRetryableError(error);
  
  return {
    title,
    message,
    showRetry
  };
}