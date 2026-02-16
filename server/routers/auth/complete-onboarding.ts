import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../../middleware/auth";
import { successResponse } from "../../lib/apiResponse";

const router = Router();

router.post("/complete-onboarding", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db
      .update(users)
      .set({ hasCompletedOnboarding: true, updatedAt: new Date() })
      .where(eq(users.id, req.userId!));

    res.status(200).json(successResponse({ hasCompletedOnboarding: true }));
  } catch (error) {
    next(error);
  }
});

export default router;
