import type { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { db } from "../db";
import { users, userSessions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: typeof users.$inferSelect;
    }
  }
}

/**
 * Authentication middleware - requires valid Bearer token.
 * All users must authenticate to access protected routes.
 *
 * CSRF NOTE: This middleware only accepts Bearer tokens from the Authorization
 * header. It does NOT read cookies. Because Bearer tokens must be explicitly
 * attached by client-side code (they are not sent automatically by the browser),
 * all routes protected by this middleware are inherently immune to CSRF attacks.
 *
 * Cookie-based auth is handled separately in auth.router.ts for web session
 * restore (GET /restore-session) and logout/delete-account. Those state-changing
 * routes use the csrfProtection middleware from server/middleware/csrf.ts, which
 * validates a double-submit CSRF token (sent via the X-CSRF-Token header).
 * Bearer-token requests bypass CSRF validation since they are not vulnerable.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const rawToken = authHeader.substring(7);
    const hashedToken = hashToken(rawToken);
    
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, hashedToken))
      .limit(1);

    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    if (new Date(session.expiresAt) < new Date()) {
      await db.delete(userSessions).where(eq(userSessions.token, hashedToken));
      return res.status(401).json({ error: "Session expired" });
    }

    req.userId = session.userId;
    next();
  } catch (error) {
    logger.error("Auth middleware error", { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ error: "Authentication failed" });
  }
}
