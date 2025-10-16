import { Request, Response, NextFunction } from "express";
import { ApiError } from "../apiError";
import { z } from "zod";

// Standardized error response format
interface ErrorResponse {
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: any;
    timestamp: string;
    path?: string;
    method?: string;
    retryable?: boolean;
  };
}

// Error code mapping for consistent error codes across the application
const ERROR_CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION_ERROR",
  429: "RATE_LIMIT_EXCEEDED",
  500: "INTERNAL_SERVER_ERROR",
  502: "BAD_GATEWAY",
  503: "SERVICE_UNAVAILABLE",
  504: "GATEWAY_TIMEOUT",
};

// Determine if an error is retryable
function isRetryableError(statusCode: number): boolean {
  return [408, 429, 500, 502, 503, 504].includes(statusCode);
}

// Get user-friendly error message based on status code
function getUserFriendlyMessage(statusCode: number, defaultMessage: string): string {
  const friendlyMessages: Record<number, string> = {
    400: "The request contains invalid data. Please check your input and try again.",
    401: "You need to be logged in to perform this action.",
    403: "You don't have permission to access this resource.",
    404: "The requested resource was not found.",
    409: "This action conflicts with existing data. Please refresh and try again.",
    422: "The provided data failed validation. Please check the requirements.",
    429: "Too many requests. Please wait a moment before trying again.",
    500: "An unexpected error occurred. Our team has been notified.",
    502: "There was a problem connecting to our services. Please try again.",
    503: "This service is temporarily unavailable. Please try again later.",
    504: "The request took too long to process. Please try again.",
  };

  return friendlyMessages[statusCode] || defaultMessage;
}

// Main error handler middleware
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Don't send response if headers already sent
  if (res.headersSent) {
    console.error("Error occurred after headers sent:", err);
    return;
  }

  let statusCode = 500;
  let message = "An unexpected error occurred";
  let details: any = undefined;
  let code = "INTERNAL_SERVER_ERROR";

  // Handle different error types
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    // Safely handle details - it might be a string or already parsed JSON
    if (err.details) {
      try {
        details = typeof err.details === 'string' 
          ? JSON.parse(err.details) 
          : err.details;
      } catch (parseError) {
        // If JSON parsing fails, treat it as a plain string
        details = { message: err.details };
      }
    }
    code = ERROR_CODES[statusCode] || code;
  } else if (err instanceof z.ZodError) {
    statusCode = 422;
    message = "Validation failed";
    code = "VALIDATION_ERROR";
    details = {
      errors: err.errors.map(e => ({
        path: e.path.join("."),
        message: e.message,
        code: e.code,
      })),
    };
  } else if (err.name === "UnauthorizedError") {
    // JWT errors
    statusCode = 401;
    message = "Authentication required";
    code = "UNAUTHORIZED";
  } else if (err.type === "StripeInvalidRequestError") {
    statusCode = 400;
    message = "Invalid payment request";
    code = "PAYMENT_ERROR";
    details = { stripeError: err.message };
  } else if (err.type === "StripeCardError") {
    statusCode = 402;
    message = "Payment failed";
    code = "PAYMENT_FAILED";
    details = { stripeError: err.message };
  } else if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
    statusCode = 503;
    message = "External service unavailable";
    code = "SERVICE_UNAVAILABLE";
  } else if (err.code === "ETIMEDOUT" || err.code === "ESOCKETTIMEDOUT") {
    statusCode = 504;
    message = "Request timed out";
    code = "GATEWAY_TIMEOUT";
  } else if (err.statusCode || err.status) {
    statusCode = err.statusCode || err.status;
    message = err.message || getUserFriendlyMessage(statusCode, message);
    code = ERROR_CODES[statusCode] || code;
  }

  // Log error for debugging
  const logContext = {
    statusCode,
    code,
    message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.claims?.sub,
    timestamp: new Date().toISOString(),
  };

  if (statusCode >= 500) {
    console.error("Server error:", { ...logContext, stack: err.stack });
  } else if (statusCode >= 400) {
    console.warn("Client error:", logContext);
  }

  // Build standardized error response
  const errorResponse: ErrorResponse = {
    error: {
      message: getUserFriendlyMessage(statusCode, message),
      code,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path,
      method: req.method,
      retryable: isRetryableError(statusCode),
    },
  };

  // Add details in development or for specific error types
  if (process.env.NODE_ENV === "development" || statusCode === 422) {
    errorResponse.error.details = details;
  }

  // Send response
  res.status(statusCode).json(errorResponse);
}

// Async error wrapper for route handlers
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Helper function to create standardized API errors
export function createApiError(
  message: string,
  statusCode: number,
  details?: any
): ApiError {
  return new ApiError(
    message,
    statusCode,
    details ? JSON.stringify(details) : undefined
  );
}

// Export convenience error creators
export const BadRequestError = (message = "Bad request", details?: any) =>
  createApiError(message, 400, details);

export const UnauthorizedError = (message = "Unauthorized", details?: any) =>
  createApiError(message, 401, details);

export const ForbiddenError = (message = "Forbidden", details?: any) =>
  createApiError(message, 403, details);

export const NotFoundError = (message = "Not found", details?: any) =>
  createApiError(message, 404, details);

export const ConflictError = (message = "Conflict", details?: any) =>
  createApiError(message, 409, details);

export const ValidationError = (message = "Validation failed", details?: any) =>
  createApiError(message, 422, details);

export const RateLimitError = (message = "Rate limit exceeded", details?: any) =>
  createApiError(message, 429, details);

export const InternalError = (message = "Internal server error", details?: any) =>
  createApiError(message, 500, details);

export const ServiceUnavailableError = (message = "Service unavailable", details?: any) =>
  createApiError(message, 503, details);