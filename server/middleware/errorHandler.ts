import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { logger } from "../lib/logger";
import { errorResponse } from "../lib/apiResponse";
import { captureException } from "../lib/sentry";

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    errorCode: string,
    isOperational = true,
    details?: unknown,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  withDetails(details: unknown): AppError {
    return new AppError(this.message, this.statusCode, this.errorCode, this.isOperational, details);
  }

  static badRequest(message: string, errorCode = "BAD_REQUEST") {
    return new AppError(message, 400, errorCode);
  }

  static unauthorized(message = "Authentication required", errorCode = "UNAUTHORIZED") {
    return new AppError(message, 401, errorCode);
  }

  static forbidden(message = "Access denied", errorCode = "FORBIDDEN") {
    return new AppError(message, 403, errorCode);
  }

  static notFound(message = "Resource not found", errorCode = "NOT_FOUND") {
    return new AppError(message, 404, errorCode);
  }

  static conflict(message: string, errorCode = "CONFLICT") {
    return new AppError(message, 409, errorCode);
  }

  static serviceUnavailable(message = "Service temporarily unavailable", errorCode = "SERVICE_UNAVAILABLE") {
    return new AppError(message, 503, errorCode);
  }

  static internal(message = "Internal server error", errorCode = "INTERNAL_ERROR") {
    return new AppError(message, 500, errorCode, false);
  }
}

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.id = crypto.randomUUID();
  next();
}

export function globalErrorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      ...errorResponse(err.message, err.errorCode, err.details),
      requestId: req.id,
    });
  }

  const isDev = process.env.NODE_ENV !== "production";

  logger.error("Unhandled error", { requestId: req.id, stack: err.stack, error: err.message });

  captureException(err, {
    trigger: "expressErrorHandler",
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
  });

  return res.status(500).json({
    ...errorResponse(
      isDev ? err.message : "Internal server error",
      "INTERNAL_ERROR",
    ),
    requestId: req.id,
  });
}
