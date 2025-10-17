import { ApiError } from "../apiError";

/**
 * Standardized error handling for external API responses
 */
export function handleApiError(
  error: any,
  serviceName: string,
  defaultMessage: string = "API request failed"
): never {
  const status = error.response?.status || error.status;
  const statusText = error.response?.statusText || error.statusText;
  const errorCode = error.code;
  
  // Log error details for debugging
  console.error(`${serviceName} API error:`, {
    message: error.message,
    status,
    statusText,
    code: errorCode,
  });

  // Handle specific HTTP status codes
  if (status === 401 || status === 403) {
    throw new ApiError(
      `${serviceName} API authentication failed. Please check your API key.`,
      401,
      JSON.stringify({ service: serviceName, originalStatus: status })
    );
  }
  
  if (status === 404) {
    throw new ApiError(
      `Resource not found in ${serviceName} API.`,
      404,
      JSON.stringify({ service: serviceName })
    );
  }
  
  if (status === 429) {
    throw new ApiError(
      `${serviceName} API rate limit exceeded. Please try again later.`,
      429,
      JSON.stringify({ service: serviceName })
    );
  }
  
  if (status === 400) {
    throw new ApiError(
      `Invalid request to ${serviceName} API.`,
      400,
      JSON.stringify({ service: serviceName, message: error.message })
    );
  }
  
  if (status >= 500) {
    throw new ApiError(
      `${serviceName} API service is temporarily unavailable.`,
      503,
      JSON.stringify({ service: serviceName, originalStatus: status })
    );
  }

  // Handle network errors
  if (errorCode === 'ECONNABORTED' || errorCode === 'ETIMEDOUT') {
    throw new ApiError(
      `${serviceName} API request timed out.`,
      504,
      JSON.stringify({ service: serviceName, code: errorCode })
    );
  }
  
  if (errorCode === 'ENOTFOUND' || errorCode === 'ECONNREFUSED') {
    throw new ApiError(
      `Cannot connect to ${serviceName} API.`,
      503,
      JSON.stringify({ service: serviceName, code: errorCode })
    );
  }
  
  if (errorCode === 'ECONNRESET') {
    throw new ApiError(
      `Connection to ${serviceName} API was reset.`,
      503,
      JSON.stringify({ service: serviceName, code: errorCode })
    );
  }

  // Handle axios-specific errors
  if (error.isAxiosError && error.message) {
    throw new ApiError(
      `${serviceName} API error: ${error.message}`,
      status || 500,
      JSON.stringify({ service: serviceName })
    );
  }

  // Default error
  throw new ApiError(
    `${defaultMessage}: ${error.message || 'Unknown error'}`,
    status || 500,
    JSON.stringify({ service: serviceName })
  );
}

/**
 * Helper to determine if an error is retryable
 */
export function isRetryableApiError(error: any): boolean {
  const status = error.statusCode || error.status || error.response?.status;
  const code = error.code;
  
  // Retryable HTTP status codes
  const retryableStatuses = [408, 429, 500, 502, 503, 504];
  if (retryableStatuses.includes(status)) {
    return true;
  }
  
  // Retryable network errors
  const retryableErrorCodes = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNABORTED',
    'ENOTFOUND',
    'ECONNREFUSED',
    'EHOSTUNREACH',
    'ENETUNREACH'
  ];
  if (code && retryableErrorCodes.includes(code)) {
    return true;
  }
  
  return false;
}

/**
 * Exponential backoff delay calculator
 */
export function calculateRetryDelay(attemptNumber: number, baseDelay: number = 1000): number {
  // Exponential backoff with jitter
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attemptNumber), 30000);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
  return Math.floor(exponentialDelay + jitter);
}