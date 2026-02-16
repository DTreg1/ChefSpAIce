import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { eq, and, or, gt, asc } from "drizzle-orm";
import { db } from "../../db";
import { userShoppingItems } from "@shared/schema";
import { AppError } from "../../middleware/errorHandler";
import { validateBody } from "../../middleware/validateBody";
import { successResponse } from "../../lib/apiResponse";
import {
  updateSectionTimestamp,
  extractExtraData, shoppingListKnownKeys,
  shoppingListItemSchema, shoppingListSyncRequestSchema,
  encodeCursor, decodeCursor, paginationQuerySchema,
} from "./sync-helpers";

const router = Router();

const updateSchema = z.object({
  data: shoppingListItemSchema,
  clientTimestamp: z.string().optional(),
});

const deleteSchema = z.object({
  data: z.object({ id: z.union([z.string(), z.number()]) }),
});

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const { limit, cursor } = paginationQuerySchema.parse(req.query);

    let cursorCondition = undefined;
    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (!decoded) {
        throw AppError.badRequest("Invalid cursor", "INVALID_CURSOR");
      }
      cursorCondition = or(
        gt(userShoppingItems.updatedAt, decoded.updatedAt),
        and(
          eq(userShoppingItems.updatedAt, decoded.updatedAt),
          gt(userShoppingItems.id, decoded.id)
        )
      );
    }

    const conditions = [eq(userShoppingItems.userId, userId)];
    if (cursorCondition) {
      conditions.push(cursorCondition);
    }

    const rows = await db
      .select()
      .from(userShoppingItems)
      .where(and(...conditions))
      .orderBy(asc(userShoppingItems.updatedAt), asc(userShoppingItems.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const mappedItems = items.map(s => ({
      id: s.itemId,
      name: s.name,
      quantity: s.quantity,
      unit: s.unit,
      isChecked: s.isChecked,
      category: s.category,
      recipeId: s.recipeId,
      updatedAt: s.updatedAt?.toISOString(),
      ...(s.extraData as Record<string, unknown> || {}),
    }));

    const nextCursor = hasMore && items.length > 0
      ? encodeCursor(items[items.length - 1].updatedAt!, items[items.length - 1].id)
      : undefined;

    res.json(successResponse({
      items: mappedItems,
      nextCursor,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/", validateBody(shoppingListSyncRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const { operation, data } = req.body;
    const dataIdStr = String(data.id);
    const extraData = extractExtraData(data as Record<string, unknown>, shoppingListKnownKeys);

    if (operation === "create") {
      await db.insert(userShoppingItems).values({
        userId,
        itemId: dataIdStr,
        name: data.name,
        quantity: data.quantity,
        unit: data.unit,
        isChecked: data.isChecked,
        category: data.category,
        recipeId: data.recipeId,
        extraData,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [userShoppingItems.userId, userShoppingItems.itemId],
        set: {
          name: data.name,
          quantity: data.quantity,
          unit: data.unit,
          isChecked: data.isChecked,
          category: data.category,
          recipeId: data.recipeId,
          extraData,
          updatedAt: new Date(),
        },
      });
    } else if (operation === "update") {
      const existingRows = await db.select().from(userShoppingItems).where(
        and(eq(userShoppingItems.userId, userId), eq(userShoppingItems.itemId, dataIdStr))
      );

      if (existingRows.length > 0) {
        const existing = existingRows[0];
        if (data.updatedAt && existing.updatedAt) {
          const incomingTime = new Date(data.updatedAt).getTime();
          const existingTime = new Date(existing.updatedAt).getTime();
          if (incomingTime <= existingTime) {
            await updateSectionTimestamp(userId, "shoppingList");
            res.json(successResponse({
              syncedAt: new Date().toISOString(),
              operation: "skipped",
              reason: "stale_update",
              itemId: dataIdStr,
              serverVersion: {
                id: existing.itemId,
                name: existing.name,
                quantity: existing.quantity,
                unit: existing.unit,
                isChecked: existing.isChecked,
                category: existing.category,
                recipeId: existing.recipeId,
                updatedAt: existing.updatedAt?.toISOString(),
                ...(existing.extraData as Record<string, unknown> || {}),
              },
            }));
            return;
          }
        }
        await db.update(userShoppingItems).set({
          name: data.name,
          quantity: data.quantity,
          unit: data.unit,
          isChecked: data.isChecked,
          category: data.category,
          recipeId: data.recipeId,
          extraData,
          updatedAt: new Date(),
        }).where(and(eq(userShoppingItems.userId, userId), eq(userShoppingItems.itemId, dataIdStr)));
      } else {
        await db.insert(userShoppingItems).values({
          userId,
          itemId: dataIdStr,
          name: data.name,
          quantity: data.quantity,
          unit: data.unit,
          isChecked: data.isChecked,
          category: data.category,
          recipeId: data.recipeId,
          extraData,
          updatedAt: new Date(),
        });
      }
    } else if (operation === "delete") {
      await db.delete(userShoppingItems).where(
        and(eq(userShoppingItems.userId, userId), eq(userShoppingItems.itemId, dataIdStr))
      );
    }

    await updateSectionTimestamp(userId, "shoppingList");

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
    const extraData = extractExtraData(data as Record<string, unknown>, shoppingListKnownKeys);

    const existingRows = await db.select().from(userShoppingItems).where(
      and(eq(userShoppingItems.userId, userId), eq(userShoppingItems.itemId, dataIdStr))
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
            name: existingItem.name,
            quantity: existingItem.quantity,
            unit: existingItem.unit,
            isChecked: existingItem.isChecked,
            category: existingItem.category,
            recipeId: existingItem.recipeId,
            updatedAt: existingItem.updatedAt?.toISOString(),
            ...(existingItem.extraData as Record<string, unknown> || {}),
          },
        }));
      }

      await db.update(userShoppingItems).set({
        name: data.name,
        quantity: data.quantity,
        unit: data.unit,
        isChecked: data.isChecked,
        category: data.category,
        recipeId: data.recipeId,
        extraData,
        updatedAt: new Date(),
      }).where(
        and(eq(userShoppingItems.userId, userId), eq(userShoppingItems.itemId, dataIdStr))
      );
    } else {
      await db.insert(userShoppingItems).values({
        userId,
        itemId: dataIdStr,
        name: data.name,
        quantity: data.quantity,
        unit: data.unit,
        isChecked: data.isChecked,
        category: data.category,
        recipeId: data.recipeId,
        extraData,
        updatedAt: new Date(),
      });
    }

    await updateSectionTimestamp(userId, "shoppingList");

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

    await db.delete(userShoppingItems).where(
      and(eq(userShoppingItems.userId, userId), eq(userShoppingItems.itemId, dataIdStr))
    );

    await updateSectionTimestamp(userId, "shoppingList");

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
