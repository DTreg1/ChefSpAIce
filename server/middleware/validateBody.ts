import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { errorResponse } from "../lib/apiResponse";

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json(
        errorResponse("Validation failed", "VALIDATION_ERROR", result.error.flatten()),
      );
    }
    req.body = result.data;
    next();
  };
}

export const validate = validateBody;
