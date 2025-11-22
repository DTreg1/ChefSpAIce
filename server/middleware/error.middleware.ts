/**
 * Error Handling Middleware
 * 
 * Central error handling for Express application.
 * Catches errors from async routes and formats error responses consistently.
 * 
 * Features:
 * - Async error handling wrapper (asyncHandler)
 * - Central error handler for all errors
 * - Custom error type support (ApiError, ZodError)
 * - Development vs production error responses
 * - Consistent error response format
 * 
 * Error Types Handled:
 * - ApiError: Custom application errors with status codes
 * - ZodError: Validation errors from Zod schemas
 * - Standard Errors: Generic errors with fallback handling
 * 
 * Error Response Format:
 * {
 *   "error": "Error message",
 *   "details": { ... } // Optional, for validation errors
 *   "stack": "..." // Only in development mode
 * }
 * 
 * Usage Pattern:
 * 1. Wrap async route handlers with asyncHandler()
 * 2. Add errorHandler as last middleware in app
 * 3. Throw ApiError or standard errors in route handlers
 * 
 * @module server/middleware/error.middleware
 */

import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { z } from "zod";

/**
 * Async route handler wrapper
 * 
 * Wraps async route handlers to automatically catch promise rejections.
 * Eliminates need for try-catch blocks in every async route.
 * 
 * @param fn - Async route handler function
 * @returns Wrapped middleware that catches errors
 * 
 * Without asyncHandler:
 * ```typescript
 * router.get('/users', async (req, res, next) => {
 *   try {
 *     const users = await storage.getUsers();
 *     res.json(users);
 *   } catch (error) {
 *     next(error);
 *   }
 * });
 * ```
 * 
 * With asyncHandler:
 * ```typescript
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await storage.getUsers();
 *   res.json(users);
 * }));
 * ```
 * 
 * Error Handling:
 * - Catches all promise rejections
 * - Passes errors to next() for central error handler
 * - Works with async/await syntax
 * 
 * @example
 * import { asyncHandler } from './error.middleware';
 * 
 * router.post('/users', asyncHandler(async (req, res) => {
 *   const user = await storage.createUser(req.body);
 *   res.status(201).json(user);
 * }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Central error handler middleware
 * 
 * Processes all errors and sends appropriate HTTP responses.
 * Must be registered as last middleware in Express app.
 * 
 * @param err - Error object (any type)
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 * 
 * Error Processing:
 * 1. Check if response already sent (avoid double response)
 * 2. Handle known error types (ApiError, ZodError)
 * 3. Log unexpected errors to console
 * 4. Send formatted error response
 * 
 * Response Status Codes:
 * - ApiError: Uses error.statusCode
 * - ZodError: 400 Bad Request
 * - Other: 500 Internal Server Error (or error.status if present)
 * 
 * Development Mode:
 * - Includes stack trace in response
 * - Enabled when NODE_ENV === "development"
 * 
 * Production Mode:
 * - No stack traces (security)
 * - Generic error messages for unexpected errors
 * 
 * @example
 * // Register as last middleware
 * import { errorHandler } from './middleware/error.middleware';
 * 
 * app.use('/api', routes);
 * app.use(errorHandler); // Must be last!
 * 
 * @example
 * // Throw errors in routes
 * router.get('/users/:id', asyncHandler(async (req, res) => {
 *   const user = await storage.getUser(req.params.id);
 *   if (!user) {
 *     throw new ApiError('User not found', 404);
 *   }
 *   res.json(user);
 * }));
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Don't log if response was already sent
  if (res.headersSent) {
    return next(err);
  }

  // Handle known error types
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: "Validation error",
      details: err.errors,
    });
  }

  // Log unexpected errors
  console.error("Unexpected error:", err);

  // Generic error response
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  res.status(status).json({
    error: message,
    // Include stack trace in development
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
}