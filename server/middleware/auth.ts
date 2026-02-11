import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, userSessions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { AppError } from "./errorHandler";
import { logger } from "../lib/logger";
import { hashToken, getSessionByToken } from "../lib/auth-utils";
import { queueNotification } from "../services/notificationService";
import { sessionCache } from "../lib/session-cache";

const recentUaMismatchAlerts = new Set<string>();
const UA_MISMATCH_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 1 notification per session per day

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: typeof users.$inferSelect;
      subscriptionTier?: string;
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
      return next(AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED"));
    }

    const rawToken = authHeader.substring(7);
    const tokenHash = hashToken(rawToken);

    let session = await sessionCache.get(tokenHash);
    if (!session) {
      const dbSession = await getSessionByToken(rawToken);
      if (dbSession) {
        await sessionCache.set(tokenHash, dbSession);
        session = dbSession;
      }
    }

    if (!session) {
      return next(AppError.unauthorized("Invalid or expired session", "INVALID_SESSION"));
    }

    if (new Date(session.expiresAt) < new Date()) {
      await sessionCache.delete(tokenHash);
      await db.delete(userSessions).where(eq(userSessions.token, tokenHash));
      return next(AppError.unauthorized("Session expired", "SESSION_EXPIRED"));
    }

    const currentUserAgent = req.headers["user-agent"] || "unknown";
    if (session.userAgent && session.userAgent !== "unknown" && session.userAgent !== currentUserAgent) {
      logger.warn("Session user-agent mismatch detected", {
        sessionId: session.id,
        userId: session.userId,
        storedAgent: session.userAgent?.substring(0, 80),
        currentAgent: currentUserAgent.substring(0, 80),
        ip: req.ip,
      });

      const cacheKey = `ua_mismatch:${session.id}`;
      if (!recentUaMismatchAlerts.has(cacheKey)) {
        recentUaMismatchAlerts.add(cacheKey);
        setTimeout(() => recentUaMismatchAlerts.delete(cacheKey), UA_MISMATCH_COOLDOWN_MS);
        queueNotification({
          userId: session.userId,
          type: "security",
          title: "Unusual session activity detected",
          body: "One of your sessions was accessed from a different device or browser. If this wasn't you, please review your active sessions in Settings and revoke any you don't recognize.",
          data: { sessionId: session.id },
          deepLink: "/settings/security",
        }).catch(() => {});
      }
    }

    req.userId = session.userId;
    next();
  } catch (error) {
    next(error);
  }
}
