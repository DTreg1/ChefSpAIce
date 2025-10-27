/**
 * Request Validation Middleware
 * 
 * Type-safe request validation using Zod schemas.
 * Validates request body, query parameters, and route params before reaching handlers.
 * 
 * Features:
 * - Runtime type checking with Zod
 * - Detailed error messages for invalid data
 * - Type safety in TypeScript
 * - Common schemas for pagination, date ranges
 * - Factory functions for body, query, and params validation
 * 
 * Validation Flow:
 * 1. Extract data from request (body/query/params)
 * 2. Parse with Zod schema
 * 3. On success: Replace request data with validated/transformed data
 * 4. On failure: Return 400 with detailed error information
 * 
 * Common Schemas:
 * - daysQuerySchema: Validates ?days=N query parameter (1-365)
 * - paginationQuerySchema: Standard pagination with page, limit, sortBy, sortOrder
 * 
 * Error Response Format:
 * {
 *   "error": "Validation error",
 *   "details": [
 *     { "path": ["field"], "message": "error message" }
 *   ]
 * }
 * 
 * @module server/middleware/validation.middleware
 */

import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

/**
 * Days query parameter schema
 * 
 * Validates ?days=N query parameter for time-range queries.
 * 
 * Validation Rules:
 * - Must be a number
 * - Range: 1-365 days
 * - Optional (undefined if not provided)
 * - Transforms string to number
 * 
 * @example
 * // Apply to route
 * router.get('/api/analytics', validateQuery(daysQuerySchema), handler);
 * 
 * // Access validated value
 * const days = req.query.days; // number | undefined
 */
export const daysQuerySchema = z.object({
  days: z.string().transform((val) => {
    const parsed = parseInt(val);
    if (isNaN(parsed) || parsed < 1 || parsed > 365) {
      throw new Error("Days must be between 1 and 365");
    }
    return parsed;
  }).optional(),
});

/**
 * Pagination query parameters schema
 * 
 * Standard pagination with sorting support.
 * 
 * Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 10)
 * - sortBy: Field to sort by (optional)
 * - sortOrder: "asc" or "desc" (default: "desc")
 * 
 * @example
 * // Apply to route
 * router.get('/api/items', validateQuery(paginationQuerySchema), handler);
 * 
 * // Access validated values
 * const { page, limit, sortBy, sortOrder } = req.query;
 * const offset = (page - 1) * limit;
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * Validate request body with Zod schema
 * 
 * Factory function that creates middleware to validate req.body.
 * Useful for POST/PUT/PATCH requests.
 * 
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 * 
 * Behavior:
 * - Parses req.body with schema
 * - Replaces req.body with validated data (includes transformations)
 * - Returns 400 on validation errors
 * - Passes other errors to error handler
 * 
 * Type Safety:
 * - Schema type inferred by TypeScript
 * - Downstream handlers get typed req.body
 * 
 * @example
 * // Define schema
 * const createUserSchema = z.object({
 *   email: z.string().email(),
 *   name: z.string().min(1),
 *   age: z.number().int().min(18)
 * });
 * 
 * // Apply to route
 * router.post('/api/users', 
 *   validateBody(createUserSchema), 
 *   async (req, res) => {
 *     // req.body is typed and validated
 *     const user = await storage.createUser(req.body);
 *     res.json(user);
 *   }
 * );
 */
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

/**
 * Validate query parameters with Zod schema
 * 
 * Factory function that creates middleware to validate req.query.
 * Useful for GET requests with query parameters.
 * 
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 * 
 * Behavior:
 * - Parses req.query with schema
 * - Replaces req.query with validated data
 * - Returns 400 on validation errors
 * - Coerces string values to appropriate types (via z.coerce)
 * 
 * Query String Parsing:
 * - All values initially strings (from URL)
 * - Use z.coerce.number() for numbers
 * - Use z.string() for strings
 * - Use .transform() for custom parsing
 * 
 * @example
 * // Define schema
 * const searchSchema = z.object({
 *   q: z.string().min(1),
 *   page: z.coerce.number().default(1),
 *   limit: z.coerce.number().default(20)
 * });
 * 
 * // Apply to route
 * router.get('/api/search', 
 *   validateQuery(searchSchema),
 *   async (req, res) => {
 *     const { q, page, limit } = req.query; // Typed!
 *     const results = await search(q, { page, limit });
 *     res.json(results);
 *   }
 * );
 */
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

/**
 * Validate route parameters with Zod schema
 * 
 * Factory function that creates middleware to validate req.params.
 * Useful for routes with dynamic segments like /users/:id.
 * 
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 * 
 * Behavior:
 * - Parses req.params with schema
 * - Replaces req.params with validated data
 * - Returns 400 on validation errors
 * - Transforms string params to appropriate types
 * 
 * Common Use Cases:
 * - Validating numeric IDs
 * - Validating UUID format
 * - Ensuring param values are in allowed set
 * 
 * @example
 * // Define schema
 * const userIdSchema = z.object({
 *   id: z.string().uuid()
 * });
 * 
 * // Apply to route
 * router.get('/api/users/:id', 
 *   validateParams(userIdSchema),
 *   async (req, res) => {
 *     const { id } = req.params; // Validated UUID string
 *     const user = await storage.getUser(id);
 *     res.json(user);
 *   }
 * );
 * 
 * @example
 * // Numeric ID with transformation
 * const numericIdSchema = z.object({
 *   id: z.string().regex(/^\d+$/).transform(Number)
 * });
 * 
 * router.delete('/api/items/:id',
 *   validateParams(numericIdSchema),
 *   async (req, res) => {
 *     const { id } = req.params; // number, not string
 *     await storage.deleteItem(id);
 *     res.json({ success: true });
 *   }
 * );
 */
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