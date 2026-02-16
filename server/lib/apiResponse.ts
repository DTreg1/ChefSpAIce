import type { Request, Response, NextFunction } from "express";

export function successResponse(data: unknown, message?: string) {
  return { success: true as const, data, ...(message ? { message } : {}) };
}

export function errorResponse(message: string, errorCode: string, details?: unknown) {
  return { success: false as const, error: message, errorCode, ...(details ? { details } : {}) };
}

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);
