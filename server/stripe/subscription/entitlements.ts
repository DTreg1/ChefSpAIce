import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db";
import { subscriptions } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  getUserEntitlements,
  checkPantryItemLimit,
  checkAiRecipeLimit,
  checkCookwareLimit,
  checkFeatureAccess,
} from "../../services/subscriptionService";
import { AppError } from "../../middleware/errorHandler";
import { successResponse } from "../../lib/apiResponse";
import { getAuthenticatedUser } from "./shared";

const router = Router();

router.get("/status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    if (!subscription) {
      return res.json(successResponse({
        status: "none",
        planType: null,
        currentPeriodEnd: null,
        trialEnd: null,
        cancelAtPeriodEnd: false,
      }));
    }

    res.json(successResponse({
      status: subscription.status,
      planType: subscription.planType,
      currentPeriodStart: subscription.currentPeriodStart?.toISOString() || null,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
      trialStart: subscription.trialStart?.toISOString() || null,
      trialEnd: subscription.trialEnd?.toISOString() || null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt?.toISOString() || null,
    }));
  } catch (error) {
    next(error);
  }
});

router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const entitlements = await getUserEntitlements(user.id);

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .limit(1);

    let gracePeriodInfo: {
      paymentFailedAt: string | null;
      gracePeriodEnd: string | null;
      graceDaysRemaining: number | null;
    } = { paymentFailedAt: null, gracePeriodEnd: null, graceDaysRemaining: null };

    if (subscription?.status === "past_due") {
      const paymentFailedAt = subscription.paymentFailedAt || subscription.updatedAt || new Date();
      const gracePeriodEnd = new Date(paymentFailedAt);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);
      const now = new Date();
      const msRemaining = gracePeriodEnd.getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

      gracePeriodInfo = {
        paymentFailedAt: paymentFailedAt.toISOString(),
        gracePeriodEnd: gracePeriodEnd.toISOString(),
        graceDaysRemaining: daysRemaining,
      };
    }

    let trialInfo: {
      trialEnd: string | null;
      trialDaysRemaining: number | null;
    } = { trialEnd: null, trialDaysRemaining: null };

    if (subscription?.status === "trialing" && subscription.trialEnd) {
      const now = new Date();
      const msRemaining = new Date(subscription.trialEnd).getTime() - now.getTime();
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
      trialInfo = {
        trialEnd: subscription.trialEnd.toISOString(),
        trialDaysRemaining: daysRemaining,
      };
    }

    res.json(successResponse({
      tier: entitlements.tier,
      status: entitlements.status,
      planType: subscription?.planType || null,
      entitlements: entitlements.limits,
      usage: entitlements.usage,
      remaining: entitlements.remaining,
      currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false,
      ...gracePeriodInfo,
      ...trialInfo,
    }));
  } catch (error) {
    next(error);
  }
});

router.get("/check-limit/:limitType", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const { limitType } = req.params;

    let result;
    switch (limitType) {
      case "pantryItems":
        result = await checkPantryItemLimit(user.id);
        break;
      case "aiRecipes":
        result = await checkAiRecipeLimit(user.id);
        break;
      case "cookware":
        result = await checkCookwareLimit(user.id);
        break;
      default:
        throw AppError.badRequest("Invalid limit type. Use: pantryItems, aiRecipes, or cookware", "INVALID_LIMIT_TYPE");
    }

    res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

router.get("/check-feature/:feature", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      throw AppError.unauthorized("Authentication required", "AUTHENTICATION_REQUIRED");
    }

    const { feature } = req.params;
    const validFeatures = [
      "recipeScanning",
      "bulkScanning",
      "aiKitchenAssistant",
      "weeklyMealPrepping",
      "customStorageAreas",
    ];

    if (!validFeatures.includes(feature)) {
      throw AppError.badRequest(
        `Invalid feature. Use: ${validFeatures.join(", ")}`,
        "INVALID_FEATURE",
      );
    }

    const allowed = await checkFeatureAccess(
      user.id,
      feature as "recipeScanning" | "bulkScanning" | "aiKitchenAssistant" | "weeklyMealPrepping" | "customStorageAreas"
    );

    res.json(successResponse({
      allowed,
      upgradeRequired: !allowed,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
