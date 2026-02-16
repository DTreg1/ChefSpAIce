import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { userMealPlans } from "@shared/schema";
import { AppError } from "../../middleware/errorHandler";
import { validateBody } from "../../middleware/validateBody";
import { successResponse } from "../../lib/apiResponse";
import {
  updateSectionTimestamp,
  extractExtraData, mealPlanKnownKeys,
  mealPlanSchema, mealPlanSyncRequestSchema,
} from "./sync-helpers";

const router = Router();

const updateSchema = z.object({
  data: mealPlanSchema,
  clientTimestamp: z.string().optional(),
});

const deleteSchema = z.object({
  data: z.object({ id: z.union([z.string(), z.number()]) }),
});

router.post("/", validateBody(mealPlanSyncRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const { operation, data } = req.body;
    const dataIdStr = String(data.id);
    const extraData = extractExtraData(data as Record<string, unknown>, mealPlanKnownKeys);

    if (operation === "create") {
      await db.insert(userMealPlans).values({
        userId,
        itemId: dataIdStr,
        date: data.date,
        meals: data.meals,
        extraData,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [userMealPlans.userId, userMealPlans.itemId],
        set: {
          date: data.date,
          meals: data.meals,
          extraData,
          updatedAt: new Date(),
        },
      });
    } else if (operation === "update") {
      const existingRows = await db.select().from(userMealPlans).where(
        and(eq(userMealPlans.userId, userId), eq(userMealPlans.itemId, dataIdStr))
      );

      if (existingRows.length > 0) {
        const existing = existingRows[0];
        if (data.updatedAt && existing.updatedAt) {
          const incomingTime = new Date(data.updatedAt).getTime();
          const existingTime = new Date(existing.updatedAt).getTime();
          if (incomingTime <= existingTime) {
            await updateSectionTimestamp(userId, "mealPlans");
            res.json(successResponse({
              syncedAt: new Date().toISOString(),
              operation: "skipped",
              reason: "stale_update",
              itemId: dataIdStr,
              serverVersion: {
                id: existing.itemId,
                date: existing.date,
                meals: existing.meals,
                updatedAt: existing.updatedAt?.toISOString(),
                ...(existing.extraData as Record<string, unknown> || {}),
              },
            }));
            return;
          }
        }
        await db.update(userMealPlans).set({
          date: data.date,
          meals: data.meals,
          extraData,
          updatedAt: new Date(),
        }).where(and(eq(userMealPlans.userId, userId), eq(userMealPlans.itemId, dataIdStr)));
      } else {
        await db.insert(userMealPlans).values({
          userId,
          itemId: dataIdStr,
          date: data.date,
          meals: data.meals,
          extraData,
          updatedAt: new Date(),
        });
      }
    } else if (operation === "delete") {
      await db.delete(userMealPlans).where(
        and(eq(userMealPlans.userId, userId), eq(userMealPlans.itemId, dataIdStr))
      );
    }

    await updateSectionTimestamp(userId, "mealPlans");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation,
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

router.put("/", validateBody(updateSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const { data, clientTimestamp } = req.body;
    const dataIdStr = String(data.id);
    const extraData = extractExtraData(data as Record<string, unknown>, mealPlanKnownKeys);

    const existingRows = await db.select().from(userMealPlans).where(
      and(eq(userMealPlans.userId, userId), eq(userMealPlans.itemId, dataIdStr))
    );

    if (existingRows.length > 0) {
      const existingItem = existingRows[0];
      const existingTimestamp = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
      const dataUpdatedAt = data.updatedAt;
      const newTimestamp = dataUpdatedAt ? new Date(dataUpdatedAt).getTime() : 
                           clientTimestamp ? new Date(clientTimestamp).getTime() : Date.now();

      if (newTimestamp < existingTimestamp) {
        return res.json(successResponse({
          syncedAt: new Date().toISOString(),
          operation: "skipped",
          reason: "stale_update",
          itemId: dataIdStr,
          serverVersion: {
            id: existingItem.itemId,
            date: existingItem.date,
            meals: existingItem.meals,
            updatedAt: existingItem.updatedAt?.toISOString(),
            ...(existingItem.extraData as Record<string, unknown> || {}),
          },
        }));
      }

      await db.update(userMealPlans).set({
        date: data.date,
        meals: data.meals,
        extraData,
        updatedAt: new Date(),
      }).where(
        and(eq(userMealPlans.userId, userId), eq(userMealPlans.itemId, dataIdStr))
      );
    } else {
      await db.insert(userMealPlans).values({
        userId,
        itemId: dataIdStr,
        date: data.date,
        meals: data.meals,
        extraData,
        updatedAt: new Date(),
      });
    }

    await updateSectionTimestamp(userId, "mealPlans");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation: "update",
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

router.delete("/", validateBody(deleteSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const { data } = req.body;
    const dataIdStr = String(data.id);

    await db.delete(userMealPlans).where(
      and(eq(userMealPlans.userId, userId), eq(userMealPlans.itemId, dataIdStr))
    );

    await updateSectionTimestamp(userId, "mealPlans");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation: "delete",
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
