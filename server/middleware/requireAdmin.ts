import type { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { db } from "../db";
import { users, userSessions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { AppError } from "./errorHandler";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

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
    const hashedToken = hashToken(rawToken);
    
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, hashedToken))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      next(AppError.unauthorized("Invalid or expired session", "INVALID_SESSION"));
      return;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      next(AppError.unauthorized("User not found", "USER_NOT_FOUND"));
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
