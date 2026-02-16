import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { eq, and, or, gt, asc } from "drizzle-orm";
import { db } from "../../db";
import { userSavedRecipes } from "@shared/schema";
import { AppError } from "../../middleware/errorHandler";
import { validateBody } from "../../middleware/validateBody";
import { successResponse } from "../../lib/apiResponse";
import {
  updateSectionTimestamp,
  extractExtraData, recipeKnownKeys,
  recipeSchema, recipeSyncRequestSchema,
  encodeCursor, decodeCursor, paginationQuerySchema,
} from "./sync-helpers";

const router = Router();

function base64ToBuffer(data: string | null | undefined): Buffer | null {
  if (!data) return null;
  return Buffer.from(data, "base64");
}

const updateSchema = z.object({
  data: recipeSchema,
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
        gt(userSavedRecipes.updatedAt, decoded.updatedAt),
        and(
          eq(userSavedRecipes.updatedAt, decoded.updatedAt),
          gt(userSavedRecipes.id, decoded.id)
        )
      );
    }

    const conditions = [eq(userSavedRecipes.userId, userId)];
    if (cursorCondition) {
      conditions.push(cursorCondition);
    }

    const rows = await db
      .select()
      .from(userSavedRecipes)
      .where(and(...conditions))
      .orderBy(asc(userSavedRecipes.updatedAt), asc(userSavedRecipes.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const mappedItems = items.map(r => ({
      id: r.itemId,
      title: r.title,
      description: r.description,
      ingredients: r.ingredients,
      instructions: r.instructions,
      prepTime: r.prepTime,
      cookTime: r.cookTime,
      servings: r.servings,
      imageUri: r.imageUri,
      cloudImageUri: r.cloudImageUri,
      imageData: r.imageData ? (r.imageData as Buffer).toString("base64") : null,
      thumbnailData: r.thumbnailData ? (r.thumbnailData as Buffer).toString("base64") : null,
      nutrition: r.nutrition,
      isFavorite: r.isFavorite,
      updatedAt: r.updatedAt?.toISOString(),
      ...(r.extraData as Record<string, unknown> || {}),
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

router.post("/", validateBody(recipeSyncRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw AppError.unauthorized("Authentication required", "UNAUTHORIZED");
    }

    const { operation, data } = req.body;
    const dataIdStr = String(data.id);
    const extraData = extractExtraData(data as Record<string, unknown>, recipeKnownKeys);

    if (operation === "create") {
      await db.insert(userSavedRecipes).values({
        userId,
        itemId: dataIdStr,
        title: data.title,
        description: data.description,
        ingredients: data.ingredients,
        instructions: data.instructions,
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        servings: data.servings,
        imageUri: data.imageUri,
        cloudImageUri: data.cloudImageUri,
        imageData: base64ToBuffer(data.imageData),
        thumbnailData: base64ToBuffer(data.thumbnailData),
        nutrition: data.nutrition,
        isFavorite: data.isFavorite,
        extraData,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: [userSavedRecipes.userId, userSavedRecipes.itemId],
        set: {
          title: data.title,
          description: data.description,
          ingredients: data.ingredients,
          instructions: data.instructions,
          prepTime: data.prepTime,
          cookTime: data.cookTime,
          servings: data.servings,
          imageUri: data.imageUri,
          cloudImageUri: data.cloudImageUri,
          imageData: base64ToBuffer(data.imageData),
          thumbnailData: base64ToBuffer(data.thumbnailData),
          nutrition: data.nutrition,
          isFavorite: data.isFavorite,
          extraData,
          updatedAt: new Date(),
        },
      });
    } else if (operation === "update") {
      const existingRows = await db.select().from(userSavedRecipes).where(
        and(eq(userSavedRecipes.userId, userId), eq(userSavedRecipes.itemId, dataIdStr))
      );

      if (existingRows.length > 0) {
        const existing = existingRows[0];
        if (data.updatedAt && existing.updatedAt) {
          const incomingTime = new Date(data.updatedAt).getTime();
          const existingTime = new Date(existing.updatedAt).getTime();
          if (incomingTime <= existingTime) {
            await updateSectionTimestamp(userId, "recipes");
            res.json(successResponse({
              syncedAt: new Date().toISOString(),
              operation: "skipped",
              reason: "stale_update",
              itemId: dataIdStr,
              serverVersion: {
                id: existing.itemId,
                title: existing.title,
                description: existing.description,
                ingredients: existing.ingredients,
                instructions: existing.instructions,
                prepTime: existing.prepTime,
                cookTime: existing.cookTime,
                servings: existing.servings,
                imageUri: existing.imageUri,
                cloudImageUri: existing.cloudImageUri,
                imageData: existing.imageData ? (existing.imageData as Buffer).toString("base64") : null,
                thumbnailData: existing.thumbnailData ? (existing.thumbnailData as Buffer).toString("base64") : null,
                nutrition: existing.nutrition,
                isFavorite: existing.isFavorite,
                updatedAt: existing.updatedAt?.toISOString(),
                ...(existing.extraData as Record<string, unknown> || {}),
              },
            }));
            return;
          }
        }
        await db.update(userSavedRecipes).set({
          title: data.title,
          description: data.description,
          ingredients: data.ingredients,
          instructions: data.instructions,
          prepTime: data.prepTime,
          cookTime: data.cookTime,
          servings: data.servings,
          imageUri: data.imageUri,
          cloudImageUri: data.cloudImageUri,
          imageData: base64ToBuffer(data.imageData),
          thumbnailData: base64ToBuffer(data.thumbnailData),
          nutrition: data.nutrition,
          isFavorite: data.isFavorite,
          extraData,
          updatedAt: new Date(),
        }).where(and(eq(userSavedRecipes.userId, userId), eq(userSavedRecipes.itemId, dataIdStr)));
      } else {
        await db.insert(userSavedRecipes).values({
          userId,
          itemId: dataIdStr,
          title: data.title,
          description: data.description,
          ingredients: data.ingredients,
          instructions: data.instructions,
          prepTime: data.prepTime,
          cookTime: data.cookTime,
          servings: data.servings,
          imageUri: data.imageUri,
          cloudImageUri: data.cloudImageUri,
          imageData: base64ToBuffer(data.imageData),
          thumbnailData: base64ToBuffer(data.thumbnailData),
          nutrition: data.nutrition,
          isFavorite: data.isFavorite,
          extraData,
          updatedAt: new Date(),
        });
      }
    } else if (operation === "delete") {
      await db.delete(userSavedRecipes).where(
        and(eq(userSavedRecipes.userId, userId), eq(userSavedRecipes.itemId, dataIdStr))
      );
    }

    await updateSectionTimestamp(userId, "recipes");

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
    const extraData = extractExtraData(data as Record<string, unknown>, recipeKnownKeys);

    const existingRows = await db.select().from(userSavedRecipes).where(
      and(eq(userSavedRecipes.userId, userId), eq(userSavedRecipes.itemId, dataIdStr))
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
            title: existingItem.title,
            description: existingItem.description,
            ingredients: existingItem.ingredients,
            instructions: existingItem.instructions,
            prepTime: existingItem.prepTime,
            cookTime: existingItem.cookTime,
            servings: existingItem.servings,
            imageUri: existingItem.imageUri,
            cloudImageUri: existingItem.cloudImageUri,
            imageData: existingItem.imageData ? (existingItem.imageData as Buffer).toString("base64") : null,
            thumbnailData: existingItem.thumbnailData ? (existingItem.thumbnailData as Buffer).toString("base64") : null,
            nutrition: existingItem.nutrition,
            isFavorite: existingItem.isFavorite,
            updatedAt: existingItem.updatedAt?.toISOString(),
            ...(existingItem.extraData as Record<string, unknown> || {}),
          },
        }));
      }

      await db.update(userSavedRecipes).set({
        title: data.title,
        description: data.description,
        ingredients: data.ingredients,
        instructions: data.instructions,
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        servings: data.servings,
        imageUri: data.imageUri,
        cloudImageUri: data.cloudImageUri,
        imageData: base64ToBuffer(data.imageData),
        thumbnailData: base64ToBuffer(data.thumbnailData),
        nutrition: data.nutrition,
        isFavorite: data.isFavorite,
        extraData,
        updatedAt: new Date(),
      }).where(
        and(eq(userSavedRecipes.userId, userId), eq(userSavedRecipes.itemId, dataIdStr))
      );
    } else {
      await db.insert(userSavedRecipes).values({
        userId,
        itemId: dataIdStr,
        title: data.title,
        description: data.description,
        ingredients: data.ingredients,
        instructions: data.instructions,
        prepTime: data.prepTime,
        cookTime: data.cookTime,
        servings: data.servings,
        imageUri: data.imageUri,
        cloudImageUri: data.cloudImageUri,
        imageData: base64ToBuffer(data.imageData),
        thumbnailData: base64ToBuffer(data.thumbnailData),
        nutrition: data.nutrition,
        isFavorite: data.isFavorite,
        extraData,
        updatedAt: new Date(),
      });
    }

    await updateSectionTimestamp(userId, "recipes");

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

    await db.delete(userSavedRecipes).where(
      and(eq(userSavedRecipes.userId, userId), eq(userSavedRecipes.itemId, dataIdStr))
    );

    await updateSectionTimestamp(userId, "recipes");

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
