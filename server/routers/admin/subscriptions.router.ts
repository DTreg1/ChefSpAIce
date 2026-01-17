import { Router, Request, Response } from "express";
import { db } from "../../db";
import { subscriptions, users } from "../../../shared/schema";
import { eq, sql, and, count } from "drizzle-orm";
import { requireAdmin } from "../../middleware/requireAdmin";

const router = Router();

router.use(requireAdmin);

interface SubscriptionWithUser {
  id: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  status: string;
  planType: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialStart: Date | null;
  trialEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    createdAt: Date | null;
  };
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    let query = db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        stripeCustomerId: subscriptions.stripeCustomerId,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        stripePriceId: subscriptions.stripePriceId,
        status: subscriptions.status,
        planType: subscriptions.planType,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        trialStart: subscriptions.trialStart,
        trialEnd: subscriptions.trialEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        canceledAt: subscriptions.canceledAt,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
        userEmail: users.email,
        userDisplayName: users.displayName,
        userCreatedAt: users.createdAt,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id));

    if (status && typeof status === "string" && status !== "all") {
      query = query.where(eq(subscriptions.status, status)) as typeof query;
    }

    const results = await query.orderBy(sql`${subscriptions.createdAt} DESC`);

    const subscriptionsWithUsers: SubscriptionWithUser[] = results.map((row) => ({
      id: row.id,
      userId: row.userId,
      stripeCustomerId: row.stripeCustomerId,
      stripeSubscriptionId: row.stripeSubscriptionId,
      stripePriceId: row.stripePriceId,
      status: row.status,
      planType: row.planType,
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd,
      trialStart: row.trialStart,
      trialEnd: row.trialEnd,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      canceledAt: row.canceledAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: {
        id: row.userId,
        email: row.userEmail || "",
        displayName: row.userDisplayName,
        createdAt: row.userCreatedAt,
      },
    }));

    res.json(subscriptionsWithUsers);
  } catch (error) {
    console.error("Error fetching admin subscriptions:", error);
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const [totalActiveResult] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    const [totalTrialingResult] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "trialing"));

    const [totalPastDueResult] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "past_due"));

    const [totalCanceledResult] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "canceled"));

    const [totalSubscriptionsResult] = await db
      .select({ count: count() })
      .from(subscriptions);

    const monthlyActiveResults = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "active"),
          eq(subscriptions.planType, "monthly")
        )
      );

    const annualActiveResults = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "active"),
          eq(subscriptions.planType, "annual")
        )
      );

    const [convertedFromTrialResult] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, "active"),
          sql`${subscriptions.trialStart} IS NOT NULL`
        )
      );

    const [totalTrialsStartedResult] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(sql`${subscriptions.trialStart} IS NOT NULL`);

    const totalActive = totalActiveResult?.count || 0;
    const totalTrialing = totalTrialingResult?.count || 0;
    const totalPastDue = totalPastDueResult?.count || 0;
    const totalCanceled = totalCanceledResult?.count || 0;
    const totalSubscriptions = totalSubscriptionsResult?.count || 0;
    const monthlyActive = monthlyActiveResults[0]?.count || 0;
    const annualActive = annualActiveResults[0]?.count || 0;
    const convertedFromTrial = convertedFromTrialResult?.count || 0;
    const totalTrialsStarted = totalTrialsStartedResult?.count || 0;

    const MONTHLY_PRICE = 499;
    const ANNUAL_PRICE = 4990;

    const monthlyMRR = Number(monthlyActive) * MONTHLY_PRICE;
    const annualMRR = Math.round((Number(annualActive) * ANNUAL_PRICE) / 12);
    const totalMRR = monthlyMRR + annualMRR;

    const trialConversionRate = totalTrialsStarted > 0
      ? Math.round((Number(convertedFromTrial) / Number(totalTrialsStarted)) * 100)
      : 0;

    res.json({
      totalActive: Number(totalActive),
      totalTrialing: Number(totalTrialing),
      totalPastDue: Number(totalPastDue),
      totalCanceled: Number(totalCanceled),
      totalSubscriptions: Number(totalSubscriptions),
      monthlyActive: Number(monthlyActive),
      annualActive: Number(annualActive),
      mrr: totalMRR,
      trialConversionRate,
    });
  } catch (error) {
    console.error("Error fetching subscription stats:", error);
    res.status(500).json({ error: "Failed to fetch subscription stats" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [result] = await db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        stripeCustomerId: subscriptions.stripeCustomerId,
        stripeSubscriptionId: subscriptions.stripeSubscriptionId,
        stripePriceId: subscriptions.stripePriceId,
        status: subscriptions.status,
        planType: subscriptions.planType,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        trialStart: subscriptions.trialStart,
        trialEnd: subscriptions.trialEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        canceledAt: subscriptions.canceledAt,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
        userEmail: users.email,
        userDisplayName: users.displayName,
        userCreatedAt: users.createdAt,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .where(eq(subscriptions.id, id))
      .limit(1);

    if (!result) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const subscription: SubscriptionWithUser = {
      id: result.id,
      userId: result.userId,
      stripeCustomerId: result.stripeCustomerId,
      stripeSubscriptionId: result.stripeSubscriptionId,
      stripePriceId: result.stripePriceId,
      status: result.status,
      planType: result.planType,
      currentPeriodStart: result.currentPeriodStart,
      currentPeriodEnd: result.currentPeriodEnd,
      trialStart: result.trialStart,
      trialEnd: result.trialEnd,
      cancelAtPeriodEnd: result.cancelAtPeriodEnd,
      canceledAt: result.canceledAt,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      user: {
        id: result.userId,
        email: result.userEmail || "",
        displayName: result.userDisplayName,
        createdAt: result.userCreatedAt,
      },
    };

    res.json(subscription);
  } catch (error) {
    console.error("Error fetching subscription details:", error);
    res.status(500).json({ error: "Failed to fetch subscription details" });
  }
});

export default router;
