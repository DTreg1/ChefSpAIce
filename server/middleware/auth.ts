import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { userSessions } from "@shared/schema";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Authentication middleware - requires valid Bearer token
 * All users must authenticate to access protected routes
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.substring(7);
    
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, token))
      .limit(1);

    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    if (new Date(session.expiresAt) < new Date()) {
      await db.delete(userSessions).where(eq(userSessions.token, token));
      return res.status(401).json({ error: "Session expired" });
    }

    req.userId = session.userId;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}
