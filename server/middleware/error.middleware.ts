import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../apiError";
import { z } from "zod";

// Async route wrapper to catch errors
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Central error handler
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