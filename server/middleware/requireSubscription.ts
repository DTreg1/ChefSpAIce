import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { subscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";

const INACTIVE_STATUSES = ["canceled", "expired", "past_due"];
const ACTIVE_STATUSES = ["active", "trialing"];

export async function requireSubscription(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.isGuest) {
      return res.status(403).json({
        error: "subscription_required",
        message: "Active subscription required",
      });
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (!subscription) {
      return res.status(403).json({
        error: "subscription_required",
        message: "Active subscription required",
      });
    }

    if (INACTIVE_STATUSES.includes(subscription.status)) {
      return res.status(403).json({
        error: "subscription_required",
        message: "Active subscription required",
      });
    }

    if (!ACTIVE_STATUSES.includes(subscription.status)) {
      return res.status(403).json({
        error: "subscription_required",
        message: "Active subscription required",
      });
    }

    next();
  } catch (error) {
    console.error("Subscription middleware error:", error);
    return res.status(500).json({ error: "Failed to verify subscription" });
  }
}
