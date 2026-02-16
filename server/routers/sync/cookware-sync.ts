import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { eq, and, count } from "drizzle-orm";
import { db } from "../../db";
import { userCookwareItems } from "@shared/schema";
import { checkCookwareLimit } from "../../services/subscriptionService";
import { ERROR_CODES, ERROR_MESSAGES } from "@shared/subscription";
import { AppError } from "../../middleware/errorHandler";
import { validateBody } from "../../middleware/validateBody";
import { successResponse } from "../../lib/apiResponse";
import {
  updateSectionTimestamp,
  extractExtraData, cookwareKnownKeys,
  cookwareSchema, cookwareSyncRequestSchema,
} from "./sync-helpers";

const router = Router();

const updateSchema = z.object({
  data: cookwareSchema,
  clientTimestamp: z.string().optional(),
});

const deleteSchema = z.object({
  data: z.object({ id: z.union([z.string(), z.number()]) }),
});

router.post("/", validateBody(cookwareSyncRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const { operation, data } = req.body;
    const dataIdStr = String(data.id);
    const extraData = extractExtraData(data as Record<string, unknown>, cookwareKnownKeys);

    if (operation === "create") {
      const existingRows = await db.select().from(userCookwareItems).where(
        and(eq(userCookwareItems.userId, userId), eq(userCookwareItems.itemId, dataIdStr))
      );
      const isAddingNewItem = existingRows.length === 0;

      if (isAddingNewItem) {
        const [{ value: currentCount }] = await db.select({ value: count() }).from(userCookwareItems).where(eq(userCookwareItems.userId, userId));
        const limitCheck = await checkCookwareLimit(userId);
        const maxLimit = typeof limitCheck.limit === 'number' ? limitCheck.limit : Infinity;

        if (currentCount >= maxLimit) {
          throw AppError.forbidden(ERROR_MESSAGES[ERROR_CODES.COOKWARE_LIMIT_REACHED], ERROR_CODES.COOKWARE_LIMIT_REACHED).withDetails({
            limit: limitCheck.limit,
            remaining: 0,
            count: currentCount,
          });
        }
      }

      await db.insert(userCookwareItems).values({
        userId,
        itemId: dataIdStr,
        name: data.name,
        category: data.category,
        alternatives: data.alternatives,
        extraData,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [userCookwareItems.userId, userCookwareItems.itemId],
        set: {
          name: data.name,
          category: data.category,
          alternatives: data.alternatives,
          extraData,
          updatedAt: new Date(),
        },
      });
    } else if (operation === "update") {
      const existingRows = await db.select().from(userCookwareItems).where(
        and(eq(userCookwareItems.userId, userId), eq(userCookwareItems.itemId, dataIdStr))
      );

      if (existingRows.length > 0) {
        const existing = existingRows[0];
        if (data.updatedAt && existing.updatedAt) {
          const incomingTime = new Date(data.updatedAt).getTime();
          const existingTime = new Date(existing.updatedAt).getTime();
          if (incomingTime <= existingTime) {
            await updateSectionTimestamp(userId, "cookware");
            res.json(successResponse({
              syncedAt: new Date().toISOString(),
              operation: "skipped",
              reason: "stale_update",
              itemId: dataIdStr,
              serverVersion: {
                id: existing.itemId,
                name: existing.name,
                category: existing.category,
                alternatives: existing.alternatives,
                updatedAt: existing.updatedAt?.toISOString(),
                ...(existing.extraData as Record<string, unknown> || {}),
              },
            }));
            return;
          }
        }
        await db.update(userCookwareItems).set({
          name: data.name,
          category: data.category,
          alternatives: data.alternatives,
          extraData,
          updatedAt: new Date(),
        }).where(and(eq(userCookwareItems.userId, userId), eq(userCookwareItems.itemId, dataIdStr)));
      } else {
        const [{ value: currentCount }] = await db.select({ value: count() }).from(userCookwareItems).where(eq(userCookwareItems.userId, userId));
        const limitCheck = await checkCookwareLimit(userId);
        const maxLimit = typeof limitCheck.limit === 'number' ? limitCheck.limit : Infinity;

        if (currentCount >= maxLimit) {
          throw AppError.forbidden(ERROR_MESSAGES[ERROR_CODES.COOKWARE_LIMIT_REACHED], ERROR_CODES.COOKWARE_LIMIT_REACHED).withDetails({
            limit: limitCheck.limit,
            remaining: 0,
            count: currentCount,
          });
        }

        await db.insert(userCookwareItems).values({
          userId,
          itemId: dataIdStr,
          name: data.name,
          category: data.category,
          alternatives: data.alternatives,
          extraData,
          updatedAt: new Date(),
        });
      }
    } else if (operation === "delete") {
      await db.delete(userCookwareItems).where(
        and(eq(userCookwareItems.userId, userId), eq(userCookwareItems.itemId, dataIdStr))
      );
    }

    await updateSectionTimestamp(userId, "cookware");

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
    const extraData = extractExtraData(data as Record<string, unknown>, cookwareKnownKeys);

    const existingRows = await db.select().from(userCookwareItems).where(
      and(eq(userCookwareItems.userId, userId), eq(userCookwareItems.itemId, dataIdStr))
    );

    if (existingRows.length > 0) {
      const existingItem = existingRows[0];
      const existingTimestamp = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
      const dataUpdatedAt = (data as { updatedAt?: string }).updatedAt;
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
            name: existingItem.name,
            category: existingItem.category,
            alternatives: existingItem.alternatives,
            updatedAt: existingItem.updatedAt?.toISOString(),
            ...(existingItem.extraData as Record<string, unknown> || {}),
          },
        }));
      }

      await db.update(userCookwareItems).set({
        name: data.name,
        category: data.category,
        alternatives: data.alternatives,
        extraData,
        updatedAt: new Date(),
      }).where(
        and(eq(userCookwareItems.userId, userId), eq(userCookwareItems.itemId, dataIdStr))
      );
    } else {
      const [{ value: currentCount }] = await db.select({ value: count() }).from(userCookwareItems).where(eq(userCookwareItems.userId, userId));
      const limitCheck = await checkCookwareLimit(userId);
      const maxLimit = typeof limitCheck.limit === 'number' ? limitCheck.limit : Infinity;

      if (currentCount >= maxLimit) {
        throw AppError.forbidden(ERROR_MESSAGES[ERROR_CODES.COOKWARE_LIMIT_REACHED], ERROR_CODES.COOKWARE_LIMIT_REACHED).withDetails({
          limit: limitCheck.limit,
          remaining: 0,
          count: currentCount,
        });
      }

      await db.insert(userCookwareItems).values({
        userId,
        itemId: dataIdStr,
        name: data.name,
        category: data.category,
        alternatives: data.alternatives,
        extraData,
        updatedAt: new Date(),
      });
    }

    await updateSectionTimestamp(userId, "cookware");

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

    await db.delete(userCookwareItems).where(
      and(eq(userCookwareItems.userId, userId), eq(userCookwareItems.itemId, dataIdStr))
    );

    await updateSectionTimestamp(userId, "cookware");

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
