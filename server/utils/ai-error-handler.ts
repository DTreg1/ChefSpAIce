/**
 * AI Error Handler
 * 
 * Comprehensive error handling for OpenAI API interactions.
 * Provides structured errors, retry logic, and user-friendly messages.
 */

/**
 * Custom AI error class with structured error information
 */
export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public retryable: boolean,
    public userMessage: string,
    public retryAfter?: number // For rate limiting
  ) {
    super(message);
    this.name = 'AIError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error codes for categorizing AI errors
 */
export enum AIErrorCode {
  RATE_LIMIT = 'RATE_LIMIT',
  AUTH_ERROR = 'AUTH_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  CONTENT_POLICY = 'CONTENT_POLICY',
  TIMEOUT = 'TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  CONTEXT_LENGTH_EXCEEDED = 'CONTEXT_LENGTH_EXCEEDED',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Handle OpenAI specific errors and convert to AIError
 */
export function handleOpenAIError(error: Error | unknown): AIError {
  // Log the full error for debugging
  // console.log('[AI Error Handler] Raw error:', error);

  // First check for axios-style error responses
  const status = error?.response?.status || error?.status;
  const data = error?.response?.data || error?.data;
  const headers = error?.response?.headers || error?.headers;
  const errorInfo = data?.error || data;
  const message = errorInfo?.message || error?.message || 'Unknown error';

  // Handle OpenAI API errors
  if (status) {
    // Rate limiting (429)
    if (status === 429) {
      const retryAfter = headers?.['retry-after'] 
        ? parseInt(headers['retry-after']) * 1000 
        : 60000; // Default to 60 seconds
      
      return new AIError(
        'Rate limit exceeded',
        AIErrorCode.RATE_LIMIT,
        429,
        true,
        'Too many requests. Please wait a moment and try again.',
        retryAfter
      );
    }

    // Invalid API key (401)
    if (status === 401) {
      return new AIError(
        'Invalid API key',
        AIErrorCode.AUTH_ERROR,
        401,
        false,
        'Authentication error. Please check your API configuration.'
      );
    }

    // Server errors (500-599) - retryable
    if (status >= 500) {
      return new AIError(
        `OpenAI server error: ${status}`,
        AIErrorCode.SERVER_ERROR,
        status,
        true,
        'AI service temporarily unavailable. Please try again in a few moments.'
      );
    }

    // Content policy violation (400)
    if (status === 400) {
      const lowerMessage = message?.toLowerCase() || '';
      
      if (lowerMessage.includes('content_policy') || lowerMessage.includes('content policy')) {
        return new AIError(
          'Content policy violation',
          AIErrorCode.CONTENT_POLICY,
          400,
          false,
          'Your request violates content policy. Please rephrase your message.'
        );
      }

      // Context length exceeded
      if (lowerMessage.includes('context_length_exceeded') || lowerMessage.includes('context') || lowerMessage.includes('token') || lowerMessage.includes('length')) {
        return new AIError(
          'Context length exceeded',
          AIErrorCode.CONTEXT_LENGTH_EXCEEDED,
          400,
          false,
          'The conversation is too long. Please start a new chat or clear some messages.'
        );
      }
    }

    // Model not found or other 404 errors
    if (status === 404) {
      return new AIError(
        'Model or endpoint not found',
        AIErrorCode.UNKNOWN,
        404,
        false,
        'The requested AI model or service is not available.'
      );
    }
  }

  // Network errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ECONNRESET') {
    return new AIError(
      `Network error: ${error.code}`,
      AIErrorCode.NETWORK_ERROR,
      503,
      true,
      'Network connection failed. Please check your internet connection.'
    );
  }

  // Timeout errors
  if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED' || 
      (error.message && error.message.toLowerCase().includes('timeout'))) {
    return new AIError(
      'Request timeout',
      AIErrorCode.TIMEOUT,
      504,
      true,
      'Request took too long. Please try again.'
    );
  }

  // Invalid response format
  if (error.message && error.message.includes('JSON')) {
    return new AIError(
      'Invalid response format',
      AIErrorCode.INVALID_RESPONSE,
      502,
      true,
      'Received invalid response from AI service. Please try again.'
    );
  }

  // Default unknown error
  return new AIError(
    error.message || 'Unknown error occurred',
    AIErrorCode.UNKNOWN,
    500,
    false,
    'An unexpected error occurred. Please try again later.'
  );
}

import { 
  retryWithBackoff as genericRetryWithBackoff,
  type RetryConfig as BaseRetryConfig 
} from './retry-handler';

/**
 * AI-specific retry configuration
 */
export interface RetryConfig extends BaseRetryConfig {}

/**
 * Retry a function with exponential backoff (AI-specific)
 * 
 * Wraps the generic retry function with AI-specific error handling.
 * Converts errors to AIError and checks retryability.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  // Use AI-specific retry condition
  const aiRetryConfig: RetryConfig = {
    ...config,
    retryCondition: (error) => {
      const aiError = error instanceof AIError ? error : handleOpenAIError(error);
      return aiError.retryable;
    },
    onRetry: (attempt, error, delay) => {
      const aiError = error instanceof AIError ? error : handleOpenAIError(error);
      console.log(
        `[AI Retry] Attempt ${attempt}/${config.maxRetries || 3} failed. ` +
        `Retrying in ${delay}ms. Error: ${aiError.code}`
      );
    }
  };

  try {
    return await genericRetryWithBackoff(fn, aiRetryConfig);
  } catch (error) {
    // Ensure we always throw an AIError
    if (error instanceof AIError) {
      throw error;
    }
    throw handleOpenAIError(error);
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error | unknown): boolean {
  if (error instanceof AIError) {
    return error.retryable;
  }

  const aiError = handleOpenAIError(error);
  return aiError.retryable;
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: Error | unknown): object {
  if (error instanceof AIError) {
    return {
      type: 'AIError',
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
      userMessage: error.userMessage,
      retryable: error.retryable,
      retryAfter: error.retryAfter,
      stack: error.stack
    };
  }

  return {
    type: error.constructor?.name || 'Unknown',
    message: error.message || 'Unknown error',
    code: error.code,
    status: error.status,
    stack: error.stack
  };
}

/**
 * Create a user-friendly error response
 */
export function createErrorResponse(error: Error | unknown): {
  error: string;
  code: string;
  retryable: boolean;
  retryAfter?: number;
} {
  const aiError = error instanceof AIError ? error : handleOpenAIError(error);
  
  return {
    error: aiError.userMessage,
    code: aiError.code,
    retryable: aiError.retryable,
    retryAfter: aiError.retryAfter
  };
}

/**
 * Sanitize error messages to remove sensitive information
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove API keys
  message = message.replace(/sk-[a-zA-Z0-9]{48}/g, 'sk-***');
  
  // Remove URLs that might contain secrets
  message = message.replace(/https?:\/\/[^\s]*api[^\s]*/gi, '[API_URL]');
  
  // Remove potential tokens
  message = message.replace(/Bearer\s+[^\s]+/gi, 'Bearer [TOKEN]');
  
  return message;
}