import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db";
import { userSessions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";
import { successResponse } from "../../lib/apiResponse";
import { hashToken } from "../../lib/auth-utils";
import { revokeSession, revokeAllOtherSessions } from "../../domain/services";
import { maskIpAddress } from "../auth/shared";

const router = Router();

router.get("/sessions", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const now = new Date();

    const sessions = await db
      .select({
        id: userSessions.id,
        userAgent: userSessions.userAgent,
        ipAddress: userSessions.ipAddress,
        createdAt: userSessions.createdAt,
        expiresAt: userSessions.expiresAt,
        token: userSessions.token,
      })
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(userSessions.createdAt);

    const currentToken = req.headers.authorization?.substring(7);
    const currentHashedToken = currentToken ? hashToken(currentToken) : null;

    const activeSessions = sessions
      .filter((s) => new Date(s.expiresAt) > now)
      .map((s) => ({
        id: s.id,
        userAgent: s.userAgent || "Unknown device",
        ipAddress: maskIpAddress(s.ipAddress),
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        isCurrent: s.token === currentHashedToken,
      }));

    res.json(successResponse({ sessions: activeSessions }));
  } catch (error) {
    next(error);
  }
});

router.delete("/sessions/:sessionId", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { sessionId } = req.params;
    const currentToken = req.headers.authorization?.substring(7);

    await revokeSession(sessionId, userId, currentToken);

    res.json(successResponse({ message: "Session revoked successfully" }));
  } catch (error) {
    next(error);
  }
});

router.delete("/sessions", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const currentToken = req.headers.authorization?.substring(7);
    const currentHashedToken = currentToken ? hashToken(currentToken) : null;

    if (!currentHashedToken) {
      throw AppError.badRequest("Unable to identify current session", "NO_CURRENT_SESSION");
    }

    const revokedCount = await revokeAllOtherSessions(userId, currentHashedToken);

    res.json(successResponse({ message: `Revoked ${revokedCount} other session(s)` }));
  } catch (error) {
    next(error);
  }
});

export default router;
