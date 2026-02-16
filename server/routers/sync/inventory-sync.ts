import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { eq, and, count, or, gt, isNull, asc } from "drizzle-orm";
import { db } from "../../db";
import { userInventoryItems } from "@shared/schema";
import { checkPantryItemLimit } from "../../services/subscriptionService";
import { ERROR_CODES, ERROR_MESSAGES } from "@shared/subscription";
import { AppError } from "../../middleware/errorHandler";
import { validateBody } from "../../middleware/validateBody";
import { successResponse } from "../../lib/apiResponse";
import {
  updateSectionTimestamp,
  inventoryItemSchema, inventorySyncRequestSchema,
  encodeCursor, decodeCursor, paginationQuerySchema,
} from "./sync-helpers";

const router = Router();

const updateSchema = z.object({
  data: inventoryItemSchema,
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
        gt(userInventoryItems.updatedAt, decoded.updatedAt),
        and(
          eq(userInventoryItems.updatedAt, decoded.updatedAt),
          gt(userInventoryItems.id, decoded.id)
        )
      );
    }

    const conditions = [
      eq(userInventoryItems.userId, userId),
      isNull(userInventoryItems.deletedAt),
    ];
    if (cursorCondition) {
      conditions.push(cursorCondition);
    }

    const rows = await db
      .select()
      .from(userInventoryItems)
      .where(and(...conditions))
      .orderBy(asc(userInventoryItems.updatedAt), asc(userInventoryItems.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const mappedItems = items.map(item => ({
      id: item.itemId,
      name: item.name,
      barcode: item.barcode,
      quantity: item.quantity,
      unit: item.unit,
      storageLocation: item.storageLocation,
      purchaseDate: item.purchaseDate,
      expirationDate: item.expirationDate,
      category: item.category,
      usdaCategory: item.usdaCategory,
      nutrition: item.nutrition,
      notes: item.notes,
      imageUri: item.imageUri,
      fdcId: item.fdcId,
      servingSize: item.servingSize,
      updatedAt: item.updatedAt?.toISOString(),
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

router.post("/", validateBody(inventorySyncRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const { operation, data } = req.body;
    const dataIdStr = String(data.id);

    if (operation === "create") {
      const [{ value: currentCount }] = await db.select({ value: count() }).from(userInventoryItems).where(eq(userInventoryItems.userId, userId));
      const limitCheck = await checkPantryItemLimit(userId);
      const maxLimit = typeof limitCheck.limit === 'number' ? limitCheck.limit : Infinity;
      if (currentCount >= maxLimit) {
        throw AppError.forbidden(ERROR_MESSAGES[ERROR_CODES.PANTRY_LIMIT_REACHED], ERROR_CODES.PANTRY_LIMIT_REACHED).withDetails({
          limit: limitCheck.limit,
          remaining: 0,
        });
      }

      await db.insert(userInventoryItems).values({
        userId,
        itemId: dataIdStr,
        name: data.name,
        barcode: data.barcode,
        quantity: data.quantity,
        unit: data.unit,
        storageLocation: data.storageLocation,
        purchaseDate: data.purchaseDate,
        expirationDate: data.expirationDate,
        category: data.category,
        usdaCategory: data.usdaCategory,
        nutrition: data.nutrition,
        notes: data.notes,
        imageUri: data.imageUri,
        fdcId: data.fdcId,
        servingSize: data.servingSize,
        updatedAt: new Date(),
        deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
      }).onConflictDoUpdate({
        target: [userInventoryItems.userId, userInventoryItems.itemId],
        set: {
          name: data.name,
          barcode: data.barcode,
          quantity: data.quantity,
          unit: data.unit,
          storageLocation: data.storageLocation,
          purchaseDate: data.purchaseDate,
          expirationDate: data.expirationDate,
          category: data.category,
          usdaCategory: data.usdaCategory,
          nutrition: data.nutrition,
          notes: data.notes,
          imageUri: data.imageUri,
          fdcId: data.fdcId,
          servingSize: data.servingSize,
          updatedAt: new Date(),
          deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
        },
      });
    } else if (operation === "update") {
      const existingRows = await db.select().from(userInventoryItems).where(
        and(eq(userInventoryItems.userId, userId), eq(userInventoryItems.itemId, dataIdStr))
      );

      if (existingRows.length > 0) {
        const existing = existingRows[0];
        if (data.updatedAt && existing.updatedAt) {
          const incomingTime = new Date(data.updatedAt).getTime();
          const existingTime = new Date(existing.updatedAt).getTime();
          if (incomingTime <= existingTime) {
            await updateSectionTimestamp(userId, "inventory");
            res.json(successResponse({
              syncedAt: new Date().toISOString(),
              operation: "skipped",
              reason: "stale_update",
              itemId: dataIdStr,
              serverVersion: {
                id: existing.itemId,
                name: existing.name,
                barcode: existing.barcode,
                quantity: existing.quantity,
                unit: existing.unit,
                storageLocation: existing.storageLocation,
                purchaseDate: existing.purchaseDate,
                expirationDate: existing.expirationDate,
                category: existing.category,
                usdaCategory: existing.usdaCategory,
                nutrition: existing.nutrition,
                notes: existing.notes,
                imageUri: existing.imageUri,
                fdcId: existing.fdcId,
                servingSize: existing.servingSize,
                updatedAt: existing.updatedAt?.toISOString(),
                deletedAt: existing.deletedAt?.toISOString() ?? null,
              },
            }));
            return;
          }
        }
        await db.update(userInventoryItems).set({
          name: data.name,
          barcode: data.barcode,
          quantity: data.quantity,
          unit: data.unit,
          storageLocation: data.storageLocation,
          purchaseDate: data.purchaseDate,
          expirationDate: data.expirationDate,
          category: data.category,
          usdaCategory: data.usdaCategory,
          nutrition: data.nutrition,
          notes: data.notes,
          imageUri: data.imageUri,
          fdcId: data.fdcId,
          servingSize: data.servingSize,
          updatedAt: new Date(),
          deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
        }).where(and(eq(userInventoryItems.userId, userId), eq(userInventoryItems.itemId, dataIdStr)));
      } else {
        const limitCheck = await checkPantryItemLimit(userId);
        const remaining = typeof limitCheck.remaining === 'number' ? limitCheck.remaining : Infinity;
        if (remaining < 1) {
          throw AppError.forbidden(ERROR_MESSAGES[ERROR_CODES.PANTRY_LIMIT_REACHED], ERROR_CODES.PANTRY_LIMIT_REACHED).withDetails({
            limit: limitCheck.limit,
            remaining: 0,
          });
        }
        await db.insert(userInventoryItems).values({
          userId,
          itemId: dataIdStr,
          name: data.name,
          barcode: data.barcode,
          quantity: data.quantity,
          unit: data.unit,
          storageLocation: data.storageLocation,
          purchaseDate: data.purchaseDate,
          expirationDate: data.expirationDate,
          category: data.category,
          usdaCategory: data.usdaCategory,
          nutrition: data.nutrition,
          notes: data.notes,
          imageUri: data.imageUri,
          fdcId: data.fdcId,
          servingSize: data.servingSize,
          updatedAt: new Date(),
          deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
        });
      }
    } else if (operation === "delete") {
      await db.delete(userInventoryItems).where(
        and(eq(userInventoryItems.userId, userId), eq(userInventoryItems.itemId, dataIdStr))
      );
    }

    await updateSectionTimestamp(userId, "inventory");

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

    const existingRows = await db.select().from(userInventoryItems).where(
      and(eq(userInventoryItems.userId, userId), eq(userInventoryItems.itemId, dataIdStr))
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
            barcode: existingItem.barcode,
            quantity: existingItem.quantity,
            unit: existingItem.unit,
            storageLocation: existingItem.storageLocation,
            purchaseDate: existingItem.purchaseDate,
            expirationDate: existingItem.expirationDate,
            category: existingItem.category,
            usdaCategory: existingItem.usdaCategory,
            nutrition: existingItem.nutrition,
            notes: existingItem.notes,
            imageUri: existingItem.imageUri,
            fdcId: existingItem.fdcId,
            servingSize: existingItem.servingSize,
            updatedAt: existingItem.updatedAt?.toISOString(),
            deletedAt: existingItem.deletedAt?.toISOString() ?? null,
          },
        }));
      }

      await db.update(userInventoryItems).set({
        name: data.name,
        barcode: data.barcode,
        quantity: data.quantity,
        unit: data.unit,
        storageLocation: data.storageLocation,
        purchaseDate: data.purchaseDate,
        expirationDate: data.expirationDate,
        category: data.category,
        usdaCategory: data.usdaCategory,
        nutrition: data.nutrition,
        notes: data.notes,
        imageUri: data.imageUri,
        fdcId: data.fdcId,
        servingSize: data.servingSize,
        updatedAt: new Date(),
        deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
      }).where(
        and(eq(userInventoryItems.userId, userId), eq(userInventoryItems.itemId, dataIdStr))
      );
    } else {
      const limitCheck = await checkPantryItemLimit(userId);
      const remaining = typeof limitCheck.remaining === 'number' ? limitCheck.remaining : Infinity;
      if (remaining < 1) {
        throw AppError.forbidden(ERROR_MESSAGES[ERROR_CODES.PANTRY_LIMIT_REACHED], ERROR_CODES.PANTRY_LIMIT_REACHED).withDetails({
          limit: limitCheck.limit,
          remaining: 0,
        });
      }

      await db.insert(userInventoryItems).values({
        userId,
        itemId: dataIdStr,
        name: data.name,
        barcode: data.barcode,
        quantity: data.quantity,
        unit: data.unit,
        storageLocation: data.storageLocation,
        purchaseDate: data.purchaseDate,
        expirationDate: data.expirationDate,
        category: data.category,
        usdaCategory: data.usdaCategory,
        nutrition: data.nutrition,
        notes: data.notes,
        imageUri: data.imageUri,
        fdcId: data.fdcId,
        servingSize: data.servingSize,
        updatedAt: new Date(),
        deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
      });
    }

    await updateSectionTimestamp(userId, "inventory");

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

    await db.delete(userInventoryItems).where(
      and(eq(userInventoryItems.userId, userId), eq(userInventoryItems.itemId, dataIdStr))
    );

    await updateSectionTimestamp(userId, "inventory");

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
