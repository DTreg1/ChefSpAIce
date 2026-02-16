import type { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";
import { getUserByToken } from "../lib/auth-utils";

export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith("Bearer ")) {
      next(AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED"));
      return;
    }

    const rawToken = authHeader.slice(7);
    const user = await getUserByToken(rawToken);

    if (!user) {
      next(AppError.unauthorized("Invalid or expired session", "INVALID_SESSION"));
      return;
    }

    if (!user.isAdmin) {
      next(AppError.forbidden("Admin access required", "ADMIN_REQUIRED"));
      return;
    }

    req.userId = user.id;
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
}
