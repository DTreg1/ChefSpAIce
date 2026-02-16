import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db";
import { users, userSessions, passwordResetTokens } from "@shared/schema";
import { eq, lt } from "drizzle-orm";
import { z } from "zod";
import { randomBytes } from "crypto";
import { passwordResetLimiter } from "../../middleware/rateLimiter";
import { logger } from "../../lib/logger";
import { AppError } from "../../middleware/errorHandler";
import { successResponse } from "../../lib/apiResponse";
import { hashToken } from "../../lib/auth-utils";
import { validatePassword, hashPassword } from "../../domain/services";
import { validateBody } from "../../middleware/validateBody";

const router = Router();

const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

async function cleanupExpiredResetTokens() {
  await db
    .delete(passwordResetTokens)
    .where(lt(passwordResetTokens.expiresAt, new Date()));
}

const PASSWORD_RESET_SUCCESS_MESSAGE = "If an account with that email exists, a password reset link has been sent.";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(1, "New password is required"),
});

router.post("/forgot-password", passwordResetLimiter, validateBody(forgotPasswordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    await cleanupExpiredResetTokens();

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      return res.json(successResponse({ message: PASSWORD_RESET_SUCCESS_MESSAGE }));
    }

    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id));

    const resetToken = randomBytes(32).toString("hex");
    const hashedResetToken = hashToken(resetToken);

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: hashedResetToken,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_EXPIRY_MS),
    });

    logger.info("Password reset token generated", { userId: user.id });

    res.json(successResponse({ message: PASSWORD_RESET_SUCCESS_MESSAGE }));
  } catch (error) {
    next(error);
  }
});

router.post("/reset-password", passwordResetLimiter, validateBody(resetPasswordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token: resetToken, password } = req.body;

    const passwordError = validatePassword(password);
    if (passwordError) {
      throw AppError.badRequest(passwordError, "WEAK_PASSWORD");
    }

    await cleanupExpiredResetTokens();

    const hashedResetToken = hashToken(resetToken);

    const [entry] = await db
      .select({ userId: passwordResetTokens.userId, expiresAt: passwordResetTokens.expiresAt })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, hashedResetToken))
      .limit(1);

    if (!entry || entry.expiresAt < new Date()) {
      if (entry) {
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, hashedResetToken));
      }
      throw AppError.badRequest("Invalid or expired reset token", "INVALID_RESET_TOKEN");
    }

    const hashedPassword = await hashPassword(password);

    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, entry.userId));

    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, entry.userId));

    await db
      .delete(userSessions)
      .where(eq(userSessions.userId, entry.userId));

    res.json(successResponse({ message: "Password has been reset successfully." }));
  } catch (error) {
    next(error);
  }
});

export default router;
