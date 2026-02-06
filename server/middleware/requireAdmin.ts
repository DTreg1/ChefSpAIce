import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { db } from "../db";
import { users, userSessions } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const rawToken = authHeader.slice(7);
    const hashedToken = hashToken(rawToken);
    
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, hashedToken))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.userId = user.id;
    req.user = user;

    next();
  } catch (error) {
    logger.error("Admin middleware error", { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ error: "Failed to verify admin access" });
  }
}
