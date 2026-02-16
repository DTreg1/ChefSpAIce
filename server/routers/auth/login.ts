import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db";
import { users, userSessions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { AUTH_COOKIE_NAME, setAuthCookie, clearAuthCookie } from "../../lib/session-utils";
import { csrfProtection, generateCsrfToken } from "../../middleware/csrf";
import { logger } from "../../lib/logger";
import { AppError } from "../../middleware/errorHandler";
import { successResponse } from "../../lib/apiResponse";
import { hashToken } from "../../lib/auth-utils";
import { loginWithEmail, logoutSession } from "../../domain/services";
import { getSubscriptionInfo } from "../auth/shared";
import { validateBody } from "../../middleware/validateBody";

const router = Router();

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

router.post("/login", validateBody(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const result = await loginWithEmail(
      email,
      password,
      { userAgent: req.headers["user-agent"], ipAddress: req.ip }
    );

    const subscriptionInfo = await getSubscriptionInfo(result.user.id);

    setAuthCookie(res, result.rawToken, req);
    const csrfToken = generateCsrfToken(req, res);

    res.json(successResponse({
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        avatarUrl: result.user.profileImageUrl,
        createdAt: result.user.createdAt?.toISOString() || new Date().toISOString(),
        hasCompletedOnboarding: result.user.hasCompletedOnboarding ?? false,
        ...subscriptionInfo,
      },
      token: result.rawToken,
      csrfToken,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/logout", csrfProtection, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];

    let rawToken: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      rawToken = authHeader.substring(7);
    } else if (cookieToken) {
      rawToken = cookieToken;
    }

    if (rawToken) {
      await logoutSession(rawToken);
    }

    clearAuthCookie(res);

    res.json(successResponse(null));
  } catch (error) {
    logger.error("Logout error", { error: error instanceof Error ? error.message : String(error) });
    clearAuthCookie(res);
    res.status(200).json(successResponse(null));
  }
});

router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw AppError.unauthorized("Not authenticated", "AUTH_REQUIRED");
    }

    const rawToken = authHeader.substring(7);
    const hashedToken = hashToken(rawToken);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, hashedToken))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      throw AppError.unauthorized("Session expired", "SESSION_EXPIRED");
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      throw AppError.unauthorized("User not found", "USER_NOT_FOUND");
    }

    const subscriptionInfo = await getSubscriptionInfo(user.id);

    res.json(successResponse({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        hasCompletedOnboarding: user.hasCompletedOnboarding ?? false,
        ...subscriptionInfo,
      },
    }));
  } catch (error) {
    next(error);
  }
});

router.get("/restore-session", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
    
    if (!cookieToken) {
      throw AppError.unauthorized("No session cookie", "AUTH_REQUIRED");
    }

    const hashedCookieToken = hashToken(cookieToken);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, hashedCookieToken))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      throw AppError.unauthorized("Session expired", "SESSION_EXPIRED");
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      throw AppError.unauthorized("User not found", "USER_NOT_FOUND");
    }

    const subscriptionInfo = await getSubscriptionInfo(user.id);

    const csrfToken = generateCsrfToken(req, res);

    res.json(successResponse({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        hasCompletedOnboarding: user.hasCompletedOnboarding ?? false,
        ...subscriptionInfo,
      },
      csrfToken,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
