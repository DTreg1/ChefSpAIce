/**
 * Shared type-safe request helpers for authenticated routes
 *
 * These helpers eliminate the need for `as any` type assertions
 * throughout the router files.
 */

import { Request, Response, NextFunction } from "express";
import { z } from "zod";

/**
 * Type-safe authenticated request with guaranteed user
 */
export interface AuthedRequest extends Request {
  user: Express.User;
}

/**
 * Safely get the authenticated user ID
 * Returns null if not authenticated
 */
export function getAuthenticatedUserId(req: Request): string | null {
  return req.user?.id || null;
}

/**
 * Type guard to check if request is authenticated
 */
export function isAuthenticatedRequest(req: Request): req is AuthedRequest {
  return !!req.user?.id;
}

/**
 * Create a validated request body middleware
 * Eliminates need for manual schema.safeParse(req.body as any)
 */
export function validateBody<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const validation = schema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        details: validation.error.errors,
      });
    }
    req.body = validation.data;
    next();
  };
}

/**
 * Type-safe query parameter getter
 */
export function getQueryParam(req: Request, param: string): string | undefined {
  const value = req.query[param];
  return typeof value === "string" ? value : undefined;
}

/**
 * Type-safe pagination parameters
 */
export interface PaginationParams {
  limit: number;
  offset: number;
}

export function getPaginationParams(req: Request): PaginationParams {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
  const offset = parseInt(req.query.offset as string) || 0;
  return { limit, offset };
}

/**
 * Standard error response helper
 */
export function sendError(
  res: Response,
  status: number,
  message: string,
  details?: any,
) {
  return res.status(status).json({
    error: message,
    ...(details && { details }),
  });
}

/**
 * Standard success response helper
 */
export function sendSuccess<T>(res: Response, data: T, status = 200) {
  return res.status(status).json(data);
}
