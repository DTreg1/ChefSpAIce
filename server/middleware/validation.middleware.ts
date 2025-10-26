import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

// Common validation schemas
export const daysQuerySchema = z.object({
  days: z.string().transform((val) => {
    const parsed = parseInt(val);
    if (isNaN(parsed) || parsed < 1 || parsed > 365) {
      throw new Error("Days must be between 1 and 365");
    }
    return parsed;
  }).optional(),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// Validation middleware factory
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.query);
      req.query = validated as any; // Type assertion needed for Express query types
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

export function validateParams<T>(schema: z.ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = await schema.parseAsync(req.params);
      req.params = validated as any; // Type assertion needed for Express params types
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation error",
          details: error.errors,
        });
      }
      next(error);
    }
  };
}