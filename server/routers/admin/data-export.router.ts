import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db";
import {
  users,
  subscriptions,
  userSyncData,
  userInventoryItems,
  userSavedRecipes,
  userMealPlans,
  userShoppingItems,
  userCookwareItems,
  feedback,
  feedbackBuckets,
  referrals,
} from "@shared/schema";
import { logger } from "../../lib/logger";

const router = Router();

router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    logger.info("Admin data export initiated", { adminId: _req.userId });

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=chefspaice-export-${new Date().toISOString().slice(0, 10)}.json`,
    );

    res.write("{\n");

    const allUsers = await db.select().from(users);
    const redactedUsers = allUsers.map((u) => {
      const { password, ...safe } = u;
      return safe;
    });
    res.write(`"users": ${JSON.stringify(redactedUsers)},\n`);

    const allSubscriptions = await db.select().from(subscriptions);
    res.write(`"subscriptions": ${JSON.stringify(allSubscriptions)},\n`);

    const allSyncData = await db.select().from(userSyncData);
    res.write(`"userSyncData": ${JSON.stringify(allSyncData)},\n`);

    const allInventory = await db.select().from(userInventoryItems);
    res.write(`"userInventoryItems": ${JSON.stringify(allInventory)},\n`);

    const allRecipes = await db.select().from(userSavedRecipes);
    res.write(`"userSavedRecipes": ${JSON.stringify(allRecipes)},\n`);

    const allMealPlans = await db.select().from(userMealPlans);
    res.write(`"userMealPlans": ${JSON.stringify(allMealPlans)},\n`);

    const allShoppingItems = await db.select().from(userShoppingItems);
    res.write(`"userShoppingItems": ${JSON.stringify(allShoppingItems)},\n`);

    const allCookware = await db.select().from(userCookwareItems);
    res.write(`"userCookwareItems": ${JSON.stringify(allCookware)},\n`);

    const allFeedbackBuckets = await db.select().from(feedbackBuckets);
    res.write(`"feedbackBuckets": ${JSON.stringify(allFeedbackBuckets)},\n`);

    const allFeedback = await db.select().from(feedback);
    res.write(`"feedback": ${JSON.stringify(allFeedback)},\n`);

    const allReferrals = await db.select().from(referrals);
    res.write(`"referrals": ${JSON.stringify(allReferrals)},\n`);

    res.write(
      `"exportedAt": "${new Date().toISOString()}"\n`,
    );
    res.write("}\n");
    res.end();

    logger.info("Admin data export completed", { adminId: _req.userId });
  } catch (error) {
    next(error);
  }
});

export default router;
