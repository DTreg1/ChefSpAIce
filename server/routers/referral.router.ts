import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "../db";
import { users, referrals } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { successResponse } from "../lib/apiResponse";
import { checkAndRedeemReferralCredits } from "../services/subscriptionService";
import { validateBody } from "../middleware/validateBody";

const router = Router();

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

router.get("/code", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const [user] = await db
      .select({ referralCode: users.referralCode })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }

    let referralCode = user.referralCode;

    if (!referralCode) {
      let attempts = 0;
      while (attempts < 10) {
        const code = generateReferralCode();
        try {
          await db
            .update(users)
            .set({ referralCode: code, updatedAt: new Date() })
            .where(eq(users.id, userId));
          referralCode = code;
          break;
        } catch (err: any) {
          if (err.message?.includes("unique") || err.message?.includes("duplicate")) {
            attempts++;
            continue;
          }
          throw err;
        }
      }
      if (!referralCode) {
        throw AppError.internal("Failed to generate referral code", "REFERRAL_CODE_GENERATION_FAILED");
      }
    }

    const baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : "https://chefspaice.com";
    const shareLink = `${baseUrl}/register?ref=${referralCode}`;

    const [stats] = await db
      .select({
        successfulReferrals: sql<number>`count(case when ${referrals.status} = 'completed' then 1 end)::int`,
        creditsRemaining: sql<number>`count(case when ${referrals.status} = 'completed' and ${referrals.bonusGranted} = false then 1 end)::int`,
        rewardsEarned: sql<number>`(count(case when ${referrals.status} = 'completed' and ${referrals.bonusGranted} = true then 1 end) / 3)::int`,
      })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));

    const successfulReferrals = stats?.successfulReferrals || 0;
    const creditsRemaining = stats?.creditsRemaining || 0;
    const rewardsEarned = stats?.rewardsEarned || 0;
    const creditsNeededForReward = creditsRemaining === 0 ? 3 : 3 - creditsRemaining;

    res.json(successResponse({
      referralCode,
      shareLink,
      stats: {
        successfulReferrals,
        creditsRemaining,
        rewardsEarned,
        creditsNeededForReward,
      },
    }));
  } catch (error) {
    next(error);
  }
});

router.get("/validate/:code", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.json(successResponse({ valid: false }));
    }

    const [referrer] = await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.referralCode, code.toUpperCase()))
      .limit(1);

    if (!referrer) {
      return res.json(successResponse({ valid: false }));
    }

    const name = referrer.displayName || "";
    const maskedName = name.length > 0 ? name.charAt(0) + "****" : "****";

    res.json(successResponse({ valid: true, referrerName: maskedName }));
  } catch (error) {
    next(error);
  }
});

const applyReferralSchema = z.object({
  referralCode: z.string().min(1, "Referral code is required"),
});

router.post("/apply", requireAuth, validateBody(applyReferralSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const referredUserId = req.userId!;
    const { referralCode } = req.body;

    const [referrer] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.referralCode, referralCode.toUpperCase()))
      .limit(1);

    if (!referrer) {
      throw AppError.notFound("Invalid referral code", "INVALID_REFERRAL_CODE");
    }

    if (referrer.id === referredUserId) {
      throw AppError.badRequest("Cannot use your own referral code", "SELF_REFERRAL");
    }

    const [existingReferral] = await db
      .select()
      .from(referrals)
      .where(eq(referrals.referredUserId, referredUserId))
      .limit(1);

    if (existingReferral) {
      throw AppError.conflict("You have already used a referral code", "REFERRAL_ALREADY_USED");
    }

    await db.transaction(async (tx) => {
      await tx.insert(referrals).values({
        referrerId: referrer.id,
        referredUserId,
        codeUsed: referralCode.toUpperCase(),
        status: "completed",
        bonusGranted: false,
      });

      await tx
        .update(users)
        .set({
          referredBy: referrer.id,
          updatedAt: new Date(),
        })
        .where(eq(users.id, referredUserId));
    });

    await checkAndRedeemReferralCredits(referrer.id);

    res.json(successResponse(null, "Referral applied successfully"));
  } catch (error: any) {
    if (error instanceof AppError) {
      return next(error);
    }
    if (error.message?.includes("unique") || error.message?.includes("duplicate")) {
      return next(AppError.conflict("You have already used a referral code", "REFERRAL_ALREADY_USED"));
    }
    next(error);
  }
});

export default router;
