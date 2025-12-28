import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { userSessions } from "@shared/schema";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      isGuest?: boolean;
    }
  }
}

/**
 * Strict authentication middleware - requires valid Bearer token
 * Use for sensitive operations that should only work for authenticated users
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
    req.isGuest = false;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

/**
 * Flexible authentication - accepts Bearer token OR guest user ID
 * Use for operations that should work for both authenticated and guest users
 * Authenticated users are validated via session token
 * Guest users provide a client-generated ID (data stored locally on client)
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    // Try Bearer token first (authenticated user)
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      
      const [session] = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.token, token))
        .limit(1);

      if (session && new Date(session.expiresAt) >= new Date()) {
        req.userId = session.userId;
        req.isGuest = false;
        return next();
      }
    }
    
    // Fall back to x-user-id header for guest users
    // Guest data is primarily stored client-side; server just needs an identifier
    const guestUserId = req.headers["x-user-id"] as string;
    if (guestUserId) {
      req.userId = guestUserId;
      req.isGuest = true;
      return next();
    }
    
    return res.status(401).json({ error: "Authentication required" });
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}
