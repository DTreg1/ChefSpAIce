import { Router, Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { eq, and, count, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { userSessions, userSyncData, userInventoryItems, userSavedRecipes, userMealPlans, userShoppingItems, userCookwareItems } from "../../shared/schema";
import { checkPantryItemLimit, checkCookwareLimit } from "../services/subscriptionService";
import { ERROR_CODES, ERROR_MESSAGES } from "@shared/subscription";
import { AppError } from "../middleware/errorHandler";
import { successResponse, errorResponse } from "../lib/apiResponse";

interface SyncFailureRecord {
  dataType: string;
  operation: string;
  errorMessage: string;
  timestamp: Date;
}

const syncFailures = new Map<string, SyncFailureRecord[]>();

function recordSyncFailure(userId: string, dataType: string, operation: string, errorMessage: string) {
  if (!syncFailures.has(userId)) {
    syncFailures.set(userId, []);
  }
  const records = syncFailures.get(userId)!;
  records.push({ dataType, operation, errorMessage, timestamp: new Date() });
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const filtered = records.filter(r => r.timestamp > oneDayAgo);
  syncFailures.set(userId, filtered);
}

const router = Router();

const syncOperationSchema = z.enum(["create", "update", "delete"]);

const inventoryItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  barcode: z.string().optional(),
  quantity: z.number(),
  unit: z.string(),
  storageLocation: z.string(),
  purchaseDate: z.string(),
  expirationDate: z.string(),
  category: z.string(),
  usdaCategory: z.string().optional(),
  nutrition: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
    fiber: z.number().optional(),
    sugar: z.number().optional(),
  }).optional(),
  notes: z.string().optional(),
  imageUri: z.string().optional(),
  fdcId: z.number().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().optional().nullable(),
});

const recipeSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  description: z.string().optional(),
  ingredients: z.array(z.object({
    name: z.string(),
    quantity: z.union([z.number(), z.string()]),
    unit: z.string(),
    fromInventory: z.boolean().optional(),
  })),
  instructions: z.array(z.string()),
  prepTime: z.number().optional(),
  cookTime: z.number().optional(),
  servings: z.number().optional(),
  imageUri: z.string().optional(),
  cloudImageUri: z.string().optional(),
  nutrition: z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  }).optional(),
  isFavorite: z.boolean().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

const mealPlanSchema = z.object({
  id: z.union([z.string(), z.number()]),
  date: z.string(),
  meals: z.array(z.object({
    type: z.string(),
    recipeId: z.string().optional(),
    customMeal: z.string().optional(),
  })).optional(),
  updatedAt: z.string().optional(),
}).passthrough();

const cookwareSchema = z.object({
  id: z.union([z.number(), z.string()]),
  name: z.string().optional(),
  category: z.string().optional(),
  alternatives: z.array(z.string()).optional(),
  updatedAt: z.string().optional(),
}).passthrough();

const shoppingListItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  isChecked: z.boolean(),
  category: z.string().optional(),
  recipeId: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

const inventorySyncRequestSchema = z.object({
  operation: syncOperationSchema,
  data: inventoryItemSchema,
  clientTimestamp: z.string().optional(),
});

const recipeSyncRequestSchema = z.object({
  operation: syncOperationSchema,
  data: recipeSchema,
  clientTimestamp: z.string().optional(),
});

const mealPlanSyncRequestSchema = z.object({
  operation: syncOperationSchema,
  data: mealPlanSchema,
  clientTimestamp: z.string().optional(),
});

const cookwareSyncRequestSchema = z.object({
  operation: syncOperationSchema,
  data: cookwareSchema,
  clientTimestamp: z.string().optional(),
});

const shoppingListSyncRequestSchema = z.object({
  operation: syncOperationSchema,
  data: shoppingListItemSchema,
  clientTimestamp: z.string().optional(),
});

type InventoryItem = z.infer<typeof inventoryItemSchema>;
type Recipe = z.infer<typeof recipeSchema>;
type MealPlan = z.infer<typeof mealPlanSchema>;
type Cookware = z.infer<typeof cookwareSchema>;
type ShoppingListItem = z.infer<typeof shoppingListItemSchema>;

async function getSessionFromToken(token: string) {
  if (!token) return null;
  
  const hashedToken = createHash("sha256").update(token).digest("hex");
  const sessions = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.token, hashedToken));
  
  if (sessions.length === 0) return null;
  
  const session = sessions[0];
  if (new Date(session.expiresAt) < new Date()) {
    return null;
  }
  
  return session;
}

function getAuthToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

async function updateSectionTimestamp(userId: string, section: string) {
  const existing = await db.select().from(userSyncData).where(eq(userSyncData.userId, userId));
  const now = new Date();
  if (existing.length === 0) {
    await db.insert(userSyncData).values({
      userId,
      sectionUpdatedAt: { [section]: now.toISOString() },
      lastSyncedAt: now,
      updatedAt: now,
    });
  } else {
    await db.update(userSyncData).set({
      sectionUpdatedAt: {
        ...(existing[0].sectionUpdatedAt as Record<string, string> || {}),
        [section]: now.toISOString(),
      },
      lastSyncedAt: now,
      updatedAt: now,
    }).where(eq(userSyncData.userId, userId));
  }
}

const recipeKnownKeys = new Set(["id", "title", "description", "ingredients", "instructions", "prepTime", "cookTime", "servings", "imageUri", "cloudImageUri", "nutrition", "isFavorite", "updatedAt"]);
const mealPlanKnownKeys = new Set(["id", "date", "meals", "updatedAt"]);
const shoppingListKnownKeys = new Set(["id", "name", "quantity", "unit", "isChecked", "category", "recipeId", "updatedAt"]);
const cookwareKnownKeys = new Set(["id", "name", "category", "alternatives", "updatedAt"]);

function extractExtraData(data: Record<string, unknown>, knownKeys: Set<string>): Record<string, unknown> | null {
  const extra: Record<string, unknown> = {};
  let hasExtra = false;
  for (const key of Object.keys(data)) {
    if (!knownKeys.has(key)) {
      extra[key] = data[key];
      hasExtra = true;
    }
  }
  return hasExtra ? extra : null;
}

router.post("/inventory", async (req: Request, res: Response, next: NextFunction) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }
    userId = session.userId;

    const parseResult = inventorySyncRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest("Invalid request data", "INVALID_REQUEST_DATA").withDetails({ details: parseResult.error.errors.map(e => e.message).join(", ") });
    }

    const { operation, data } = parseResult.data;
    const dataIdStr = String(data.id);

    if (operation === "create") {
      // Create: upsert the item. If the (userId, itemId) pair already exists
      // (e.g. a retry after a network timeout), overwrite with the client's data.
      // No timestamp comparison on create — client data always wins for new items.
      const [{ value: currentCount }] = await db.select({ value: count() }).from(userInventoryItems).where(eq(userInventoryItems.userId, session.userId));
      const limitCheck = await checkPantryItemLimit(session.userId);
      const maxLimit = typeof limitCheck.limit === 'number' ? limitCheck.limit : Infinity;
      if (currentCount >= maxLimit) {
        throw AppError.forbidden(ERROR_MESSAGES[ERROR_CODES.PANTRY_LIMIT_REACHED], ERROR_CODES.PANTRY_LIMIT_REACHED).withDetails({
          limit: limitCheck.limit,
          remaining: 0,
        });
      }

      await db.insert(userInventoryItems).values({
        userId: session.userId,
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
          updatedAt: new Date(),
          deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
        },
      });
    } else if (operation === "update") {
      // Update with last-write-wins conflict resolution:
      // Compare the client's updatedAt against the server row's updatedAt.
      // If the client timestamp is older or equal, skip the update (the server
      // already has a newer version, likely from another device). The client
      // receives { operation: "skipped", reason: "stale_update" } which it
      // interprets as a 409 conflict.
      const existingRows = await db.select().from(userInventoryItems).where(
        and(eq(userInventoryItems.userId, session.userId), eq(userInventoryItems.itemId, dataIdStr))
      );

      if (existingRows.length > 0) {
        const existing = existingRows[0];
        if (data.updatedAt && existing.updatedAt) {
          const incomingTime = new Date(data.updatedAt).getTime();
          const existingTime = new Date(existing.updatedAt).getTime();
          // Last-write-wins: reject if incoming timestamp <= server timestamp.
          // Include reason: "stale_update" so the client can detect this as a
          // conflict and mark the queue item fatal (see syncItem() in sync-manager).
          if (incomingTime <= existingTime) {
            await updateSectionTimestamp(session.userId, "inventory");
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
                updatedAt: existing.updatedAt?.toISOString(),
                deletedAt: existing.deletedAt?.toISOString() ?? null,
              },
            }));
            return;
          }
        }
        // Client has a newer timestamp — apply the update.
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
          updatedAt: new Date(),
          deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
        }).where(and(eq(userInventoryItems.userId, session.userId), eq(userInventoryItems.itemId, dataIdStr)));
      } else {
        const limitCheck = await checkPantryItemLimit(session.userId);
        const remaining = typeof limitCheck.remaining === 'number' ? limitCheck.remaining : Infinity;
        if (remaining < 1) {
          throw AppError.forbidden(ERROR_MESSAGES[ERROR_CODES.PANTRY_LIMIT_REACHED], ERROR_CODES.PANTRY_LIMIT_REACHED).withDetails({
            limit: limitCheck.limit,
            remaining: 0,
          });
        }
        await db.insert(userInventoryItems).values({
          userId: session.userId,
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
          updatedAt: new Date(),
          deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
        });
      }
    } else if (operation === "delete") {
      // Hard delete: permanently remove the row. Used when an item's soft-delete
      // period (30 days) has expired and the client triggers a permanent purge.
      await db.delete(userInventoryItems).where(
        and(eq(userInventoryItems.userId, session.userId), eq(userInventoryItems.itemId, dataIdStr))
      );
    }

    await updateSectionTimestamp(session.userId, "inventory");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation,
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

router.put("/inventory", async (req: Request, res: Response, next: NextFunction) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }
    userId = session.userId;

    const updateSchema = z.object({
      data: inventoryItemSchema,
      clientTimestamp: z.string().optional(),
    });
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest("Invalid request data", "INVALID_REQUEST_DATA").withDetails({ details: parseResult.error.errors.map(e => e.message).join(", ") });
    }

    const { data, clientTimestamp } = parseResult.data;
    const dataIdStr = String(data.id);

    // PUT handler: last-write-wins using updatedAt (or clientTimestamp as fallback).
    // If the incoming timestamp is older than the server row, respond with
    // "stale_update" so the client knows its version was rejected.
    const existingRows = await db.select().from(userInventoryItems).where(
      and(eq(userInventoryItems.userId, session.userId), eq(userInventoryItems.itemId, dataIdStr))
    );

    if (existingRows.length > 0) {
      const existingItem = existingRows[0];
      const existingTimestamp = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
      const dataUpdatedAt = data.updatedAt;
      const newTimestamp = dataUpdatedAt ? new Date(dataUpdatedAt).getTime() : 
                           clientTimestamp ? new Date(clientTimestamp).getTime() : Date.now();

      // Last-write-wins gate: reject stale updates.
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
            updatedAt: existingItem.updatedAt?.toISOString(),
            deletedAt: existingItem.deletedAt?.toISOString() ?? null,
          },
        }));
      }

      // Client timestamp is newer — apply the update.
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
        updatedAt: new Date(),
        deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
      }).where(
        and(eq(userInventoryItems.userId, session.userId), eq(userInventoryItems.itemId, dataIdStr))
      );
    } else {
      const limitCheck = await checkPantryItemLimit(session.userId);
      const remaining = typeof limitCheck.remaining === 'number' ? limitCheck.remaining : Infinity;
      if (remaining < 1) {
        throw AppError.forbidden(ERROR_MESSAGES[ERROR_CODES.PANTRY_LIMIT_REACHED], ERROR_CODES.PANTRY_LIMIT_REACHED).withDetails({
          limit: limitCheck.limit,
          remaining: 0,
        });
      }

      await db.insert(userInventoryItems).values({
        userId: session.userId,
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
        updatedAt: new Date(),
        deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
      });
    }

    await updateSectionTimestamp(session.userId, "inventory");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation: "update",
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

router.delete("/inventory", async (req: Request, res: Response, next: NextFunction) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }
    userId = session.userId;

    const deleteSchema = z.object({
      data: z.object({ id: z.union([z.string(), z.number()]) }),
    });
    const parseResult = deleteSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest("Invalid request data", "INVALID_REQUEST_DATA").withDetails({ details: parseResult.error.errors.map(e => e.message).join(", ") });
    }

    const { data } = parseResult.data;
    const dataIdStr = String(data.id);

    await db.delete(userInventoryItems).where(
      and(eq(userInventoryItems.userId, session.userId), eq(userInventoryItems.itemId, dataIdStr))
    );

    await updateSectionTimestamp(session.userId, "inventory");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation: "delete",
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/recipes", async (req: Request, res: Response, next: NextFunction) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }
    userId = session.userId;

    const parseResult = recipeSyncRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest("Invalid request data", "INVALID_REQUEST_DATA").withDetails({ details: parseResult.error.errors.map(e => e.message).join(", ") });
    }

    const { operation, data } = parseResult.data;
    const dataIdStr = String(data.id);
    const extraData = extractExtraData(data as Record<string, unknown>, recipeKnownKeys);

    if (operation === "create") {
      await db.insert(userSavedRecipes).values({
        userId: session.userId,
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
          nutrition: data.nutrition,
          isFavorite: data.isFavorite,
          extraData,
          updatedAt: new Date(),
        },
      });
    } else if (operation === "update") {
      const existingRows = await db.select().from(userSavedRecipes).where(
        and(eq(userSavedRecipes.userId, session.userId), eq(userSavedRecipes.itemId, dataIdStr))
      );

      if (existingRows.length > 0) {
        const existing = existingRows[0];
        if (data.updatedAt && existing.updatedAt) {
          const incomingTime = new Date(data.updatedAt).getTime();
          const existingTime = new Date(existing.updatedAt).getTime();
          // Last-write-wins: reject if incoming timestamp <= server timestamp.
          // Include reason: "stale_update" so the client can detect this as a
          // conflict and mark the queue item fatal (see syncItem() in sync-manager).
          if (incomingTime <= existingTime) {
            await updateSectionTimestamp(session.userId, "recipes");
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
          nutrition: data.nutrition,
          isFavorite: data.isFavorite,
          extraData,
          updatedAt: new Date(),
        }).where(and(eq(userSavedRecipes.userId, session.userId), eq(userSavedRecipes.itemId, dataIdStr)));
      } else {
        await db.insert(userSavedRecipes).values({
          userId: session.userId,
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
          nutrition: data.nutrition,
          isFavorite: data.isFavorite,
          extraData,
          updatedAt: new Date(),
        });
      }
    } else if (operation === "delete") {
      await db.delete(userSavedRecipes).where(
        and(eq(userSavedRecipes.userId, session.userId), eq(userSavedRecipes.itemId, dataIdStr))
      );
    }

    await updateSectionTimestamp(session.userId, "recipes");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation,
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

router.put("/recipes", async (req: Request, res: Response, next: NextFunction) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }
    userId = session.userId;

    const updateSchema = z.object({
      data: recipeSchema,
      clientTimestamp: z.string().optional(),
    });
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest("Invalid request data", "INVALID_REQUEST_DATA").withDetails({ details: parseResult.error.errors.map(e => e.message).join(", ") });
    }

    const { data, clientTimestamp } = parseResult.data;
    const dataIdStr = String(data.id);
    const extraData = extractExtraData(data as Record<string, unknown>, recipeKnownKeys);

    const existingRows = await db.select().from(userSavedRecipes).where(
      and(eq(userSavedRecipes.userId, session.userId), eq(userSavedRecipes.itemId, dataIdStr))
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
        nutrition: data.nutrition,
        isFavorite: data.isFavorite,
        extraData,
        updatedAt: new Date(),
      }).where(
        and(eq(userSavedRecipes.userId, session.userId), eq(userSavedRecipes.itemId, dataIdStr))
      );
    } else {
      await db.insert(userSavedRecipes).values({
        userId: session.userId,
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
        nutrition: data.nutrition,
        isFavorite: data.isFavorite,
        extraData,
        updatedAt: new Date(),
      });
    }

    await updateSectionTimestamp(session.userId, "recipes");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation: "update",
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

router.delete("/recipes", async (req: Request, res: Response, next: NextFunction) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }
    userId = session.userId;

    const deleteSchema = z.object({
      data: z.object({ id: z.union([z.string(), z.number()]) }),
    });
    const parseResult = deleteSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest("Invalid request data", "INVALID_REQUEST_DATA").withDetails({ details: parseResult.error.errors.map(e => e.message).join(", ") });
    }

    const { data } = parseResult.data;
    const dataIdStr = String(data.id);

    await db.delete(userSavedRecipes).where(
      and(eq(userSavedRecipes.userId, session.userId), eq(userSavedRecipes.itemId, dataIdStr))
    );

    await updateSectionTimestamp(session.userId, "recipes");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation: "delete",
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/mealPlans", async (req: Request, res: Response, next: NextFunction) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }
    userId = session.userId;

    const parseResult = mealPlanSyncRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest("Invalid request data", "INVALID_REQUEST_DATA").withDetails({ details: parseResult.error.errors.map(e => e.message).join(", ") });
    }

    const { operation, data } = parseResult.data;
    const dataIdStr = String(data.id);
    const extraData = extractExtraData(data as Record<string, unknown>, mealPlanKnownKeys);

    if (operation === "create") {
      await db.insert(userMealPlans).values({
        userId: session.userId,
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
        and(eq(userMealPlans.userId, session.userId), eq(userMealPlans.itemId, dataIdStr))
      );

      if (existingRows.length > 0) {
        const existing = existingRows[0];
        if (data.updatedAt && existing.updatedAt) {
          const incomingTime = new Date(data.updatedAt).getTime();
          const existingTime = new Date(existing.updatedAt).getTime();
          // Last-write-wins: reject if incoming timestamp <= server timestamp.
          // Include reason: "stale_update" so the client can detect this as a
          // conflict and mark the queue item fatal (see syncItem() in sync-manager).
          if (incomingTime <= existingTime) {
            await updateSectionTimestamp(session.userId, "mealPlans");
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
        }).where(and(eq(userMealPlans.userId, session.userId), eq(userMealPlans.itemId, dataIdStr)));
      } else {
        await db.insert(userMealPlans).values({
          userId: session.userId,
          itemId: dataIdStr,
          date: data.date,
          meals: data.meals,
          extraData,
          updatedAt: new Date(),
        });
      }
    } else if (operation === "delete") {
      await db.delete(userMealPlans).where(
        and(eq(userMealPlans.userId, session.userId), eq(userMealPlans.itemId, dataIdStr))
      );
    }

    await updateSectionTimestamp(session.userId, "mealPlans");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation,
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

router.put("/mealPlans", async (req: Request, res: Response, next: NextFunction) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }
    userId = session.userId;

    const updateSchema = z.object({
      data: mealPlanSchema,
      clientTimestamp: z.string().optional(),
    });
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest("Invalid request data", "INVALID_REQUEST_DATA").withDetails({ details: parseResult.error.errors.map(e => e.message).join(", ") });
    }

    const { data, clientTimestamp } = parseResult.data;
    const dataIdStr = String(data.id);
    const extraData = extractExtraData(data as Record<string, unknown>, mealPlanKnownKeys);

    const existingRows = await db.select().from(userMealPlans).where(
      and(eq(userMealPlans.userId, session.userId), eq(userMealPlans.itemId, dataIdStr))
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
        and(eq(userMealPlans.userId, session.userId), eq(userMealPlans.itemId, dataIdStr))
      );
    } else {
      await db.insert(userMealPlans).values({
        userId: session.userId,
        itemId: dataIdStr,
        date: data.date,
        meals: data.meals,
        extraData,
        updatedAt: new Date(),
      });
    }

    await updateSectionTimestamp(session.userId, "mealPlans");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation: "update",
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

router.delete("/mealPlans", async (req: Request, res: Response, next: NextFunction) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }
    userId = session.userId;

    const deleteSchema = z.object({
      data: z.object({ id: z.union([z.string(), z.number()]) }),
    });
    const parseResult = deleteSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest("Invalid request data", "INVALID_REQUEST_DATA").withDetails({ details: parseResult.error.errors.map(e => e.message).join(", ") });
    }

    const { data } = parseResult.data;
    const dataIdStr = String(data.id);

    await db.delete(userMealPlans).where(
      and(eq(userMealPlans.userId, session.userId), eq(userMealPlans.itemId, dataIdStr))
    );

    await updateSectionTimestamp(session.userId, "mealPlans");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation: "delete",
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// COOKWARE SYNC ROUTES - with limit enforcement
// =========================================================================

router.post("/cookware", async (req: Request, res: Response, next: NextFunction) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }
    userId = session.userId;

    const parseResult = cookwareSyncRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest("Invalid request data", "INVALID_REQUEST_DATA").withDetails({ details: parseResult.error.errors.map(e => e.message).join(", ") });
    }

    const { operation, data } = parseResult.data;
    const dataIdStr = String(data.id);
    const extraData = extractExtraData(data as Record<string, unknown>, cookwareKnownKeys);

    if (operation === "create") {
      const existingRows = await db.select().from(userCookwareItems).where(
        and(eq(userCookwareItems.userId, session.userId), eq(userCookwareItems.itemId, dataIdStr))
      );
      const isAddingNewItem = existingRows.length === 0;

      if (isAddingNewItem) {
        const [{ value: currentCount }] = await db.select({ value: count() }).from(userCookwareItems).where(eq(userCookwareItems.userId, session.userId));
        const limitCheck = await checkCookwareLimit(session.userId);
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
        userId: session.userId,
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
        and(eq(userCookwareItems.userId, session.userId), eq(userCookwareItems.itemId, dataIdStr))
      );

      if (existingRows.length > 0) {
        const existing = existingRows[0];
        if (data.updatedAt && existing.updatedAt) {
          const incomingTime = new Date(data.updatedAt).getTime();
          const existingTime = new Date(existing.updatedAt).getTime();
          // Last-write-wins: reject if incoming timestamp <= server timestamp.
          // Include reason: "stale_update" so the client can detect this as a
          // conflict and mark the queue item fatal (see syncItem() in sync-manager).
          if (incomingTime <= existingTime) {
            await updateSectionTimestamp(session.userId, "cookware");
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
        }).where(and(eq(userCookwareItems.userId, session.userId), eq(userCookwareItems.itemId, dataIdStr)));
      } else {
        const [{ value: currentCount }] = await db.select({ value: count() }).from(userCookwareItems).where(eq(userCookwareItems.userId, session.userId));
        const limitCheck = await checkCookwareLimit(session.userId);
        const maxLimit = typeof limitCheck.limit === 'number' ? limitCheck.limit : Infinity;

        if (currentCount >= maxLimit) {
          throw AppError.forbidden(ERROR_MESSAGES[ERROR_CODES.COOKWARE_LIMIT_REACHED], ERROR_CODES.COOKWARE_LIMIT_REACHED).withDetails({
            limit: limitCheck.limit,
            remaining: 0,
            count: currentCount,
          });
        }

        await db.insert(userCookwareItems).values({
          userId: session.userId,
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
        and(eq(userCookwareItems.userId, session.userId), eq(userCookwareItems.itemId, dataIdStr))
      );
    }

    await updateSectionTimestamp(session.userId, "cookware");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation,
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

router.put("/cookware", async (req: Request, res: Response, next: NextFunction) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }
    userId = session.userId;

    const updateSchema = z.object({
      data: cookwareSchema,
      clientTimestamp: z.string().optional(),
    });
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest("Invalid request data", "INVALID_REQUEST_DATA").withDetails({ details: parseResult.error.errors.map(e => e.message).join(", ") });
    }

    const { data, clientTimestamp } = parseResult.data;
    const dataIdStr = String(data.id);
    const extraData = extractExtraData(data as Record<string, unknown>, cookwareKnownKeys);

    const existingRows = await db.select().from(userCookwareItems).where(
      and(eq(userCookwareItems.userId, session.userId), eq(userCookwareItems.itemId, dataIdStr))
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
        and(eq(userCookwareItems.userId, session.userId), eq(userCookwareItems.itemId, dataIdStr))
      );
    } else {
      const [{ value: currentCount }] = await db.select({ value: count() }).from(userCookwareItems).where(eq(userCookwareItems.userId, session.userId));
      const limitCheck = await checkCookwareLimit(session.userId);
      const maxLimit = typeof limitCheck.limit === 'number' ? limitCheck.limit : Infinity;

      if (currentCount >= maxLimit) {
        throw AppError.forbidden(ERROR_MESSAGES[ERROR_CODES.COOKWARE_LIMIT_REACHED], ERROR_CODES.COOKWARE_LIMIT_REACHED).withDetails({
          limit: limitCheck.limit,
          remaining: 0,
          count: currentCount,
        });
      }

      await db.insert(userCookwareItems).values({
        userId: session.userId,
        itemId: dataIdStr,
        name: data.name,
        category: data.category,
        alternatives: data.alternatives,
        extraData,
        updatedAt: new Date(),
      });
    }

    await updateSectionTimestamp(session.userId, "cookware");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation: "update",
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

router.delete("/cookware", async (req: Request, res: Response, next: NextFunction) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }
    userId = session.userId;

    const deleteSchema = z.object({
      data: z.object({ id: z.union([z.string(), z.number()]) }),
    });
    const parseResult = deleteSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest("Invalid request data", "INVALID_REQUEST_DATA").withDetails({ details: parseResult.error.errors.map(e => e.message).join(", ") });
    }

    const { data } = parseResult.data;
    const dataIdStr = String(data.id);

    await db.delete(userCookwareItems).where(
      and(eq(userCookwareItems.userId, session.userId), eq(userCookwareItems.itemId, dataIdStr))
    );

    await updateSectionTimestamp(session.userId, "cookware");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation: "delete",
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

// =========================================================================
// SHOPPING LIST SYNC ROUTES
// =========================================================================

router.post("/shoppingList", async (req: Request, res: Response, next: NextFunction) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }
    userId = session.userId;

    const parseResult = shoppingListSyncRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest("Invalid request data", "INVALID_REQUEST_DATA").withDetails({ details: parseResult.error.errors.map(e => e.message).join(", ") });
    }

    const { operation, data } = parseResult.data;
    const dataIdStr = String(data.id);
    const extraData = extractExtraData(data as Record<string, unknown>, shoppingListKnownKeys);

    if (operation === "create") {
      await db.insert(userShoppingItems).values({
        userId: session.userId,
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
        and(eq(userShoppingItems.userId, session.userId), eq(userShoppingItems.itemId, dataIdStr))
      );

      if (existingRows.length > 0) {
        const existing = existingRows[0];
        if (data.updatedAt && existing.updatedAt) {
          const incomingTime = new Date(data.updatedAt).getTime();
          const existingTime = new Date(existing.updatedAt).getTime();
          // Last-write-wins: reject if incoming timestamp <= server timestamp.
          // Include reason: "stale_update" so the client can detect this as a
          // conflict and mark the queue item fatal (see syncItem() in sync-manager).
          if (incomingTime <= existingTime) {
            await updateSectionTimestamp(session.userId, "shoppingList");
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
        }).where(and(eq(userShoppingItems.userId, session.userId), eq(userShoppingItems.itemId, dataIdStr)));
      } else {
        await db.insert(userShoppingItems).values({
          userId: session.userId,
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
        and(eq(userShoppingItems.userId, session.userId), eq(userShoppingItems.itemId, dataIdStr))
      );
    }

    await updateSectionTimestamp(session.userId, "shoppingList");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation,
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

router.put("/shoppingList", async (req: Request, res: Response, next: NextFunction) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }
    userId = session.userId;

    const updateSchema = z.object({
      data: shoppingListItemSchema,
      clientTimestamp: z.string().optional(),
    });
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest("Invalid request data", "INVALID_REQUEST_DATA").withDetails({ details: parseResult.error.errors.map(e => e.message).join(", ") });
    }

    const { data, clientTimestamp } = parseResult.data;
    const dataIdStr = String(data.id);
    const extraData = extractExtraData(data as Record<string, unknown>, shoppingListKnownKeys);

    const existingRows = await db.select().from(userShoppingItems).where(
      and(eq(userShoppingItems.userId, session.userId), eq(userShoppingItems.itemId, dataIdStr))
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
        and(eq(userShoppingItems.userId, session.userId), eq(userShoppingItems.itemId, dataIdStr))
      );
    } else {
      await db.insert(userShoppingItems).values({
        userId: session.userId,
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

    await updateSectionTimestamp(session.userId, "shoppingList");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation: "update",
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

router.delete("/shoppingList", async (req: Request, res: Response, next: NextFunction) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }
    userId = session.userId;

    const deleteSchema = z.object({
      data: z.object({ id: z.union([z.string(), z.number()]) }),
    });
    const parseResult = deleteSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest("Invalid request data", "INVALID_REQUEST_DATA").withDetails({ details: parseResult.error.errors.map(e => e.message).join(", ") });
    }

    const { data } = parseResult.data;
    const dataIdStr = String(data.id);

    await db.delete(userShoppingItems).where(
      and(eq(userShoppingItems.userId, session.userId), eq(userShoppingItems.itemId, dataIdStr))
    );

    await updateSectionTimestamp(session.userId, "shoppingList");

    res.json(successResponse({
      syncedAt: new Date().toISOString(),
      operation: "delete",
      itemId: dataIdStr,
    }));
  } catch (error) {
    next(error);
  }
});

router.get("/status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }

    const [
      existingSyncData,
      [{ value: inventoryCount }],
      [{ value: recipesCount }],
      [{ value: mealPlansCount }],
      [{ value: shoppingListCount }],
      [{ value: cookwareCount }],
    ] = await Promise.all([
      db.select().from(userSyncData).where(eq(userSyncData.userId, session.userId)),
      db.select({ value: count() }).from(userInventoryItems).where(eq(userInventoryItems.userId, session.userId)),
      db.select({ value: count() }).from(userSavedRecipes).where(eq(userSavedRecipes.userId, session.userId)),
      db.select({ value: count() }).from(userMealPlans).where(eq(userMealPlans.userId, session.userId)),
      db.select({ value: count() }).from(userShoppingItems).where(eq(userShoppingItems.userId, session.userId)),
      db.select({ value: count() }).from(userCookwareItems).where(eq(userCookwareItems.userId, session.userId)),
    ]);

    const lastSyncedAt = existingSyncData.length > 0 && existingSyncData[0].lastSyncedAt
      ? existingSyncData[0].lastSyncedAt.toISOString()
      : null;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const userFailures = (syncFailures.get(session.userId) || [])
      .filter(r => r.timestamp > oneDayAgo);
    
    const syncData = existingSyncData.length > 0 ? existingSyncData[0] : null;
    const isConsistent = syncData !== null && syncData.lastSyncedAt !== null;

    res.json(successResponse({
      lastSyncedAt,
      failedOperations24h: userFailures.length,
      recentFailures: userFailures.slice(-10).map(f => ({
        dataType: f.dataType,
        operation: f.operation,
        errorMessage: f.errorMessage,
        timestamp: f.timestamp.toISOString(),
      })),
      isConsistent,
      dataTypes: {
        inventory: inventoryCount,
        recipes: recipesCount,
        mealPlans: mealPlansCount,
        shoppingList: shoppingListCount,
        cookware: cookwareCount,
      },
    }));
  } catch (error) {
    next(error);
  }
});

router.post("/export", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }

    const [inventoryRows, recipeRows, mealPlanRows, shoppingRows, cookwareRows, syncDataRows] = await Promise.all([
      db.select().from(userInventoryItems).where(and(eq(userInventoryItems.userId, session.userId), isNull(userInventoryItems.deletedAt))),
      db.select().from(userSavedRecipes).where(eq(userSavedRecipes.userId, session.userId)),
      db.select().from(userMealPlans).where(eq(userMealPlans.userId, session.userId)),
      db.select().from(userShoppingItems).where(eq(userShoppingItems.userId, session.userId)),
      db.select().from(userCookwareItems).where(eq(userCookwareItems.userId, session.userId)),
      db.select().from(userSyncData).where(eq(userSyncData.userId, session.userId)),
    ]);

    const syncData = syncDataRows.length > 0 ? syncDataRows[0] : null;

    const exportInventory = inventoryRows.map(item => ({
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
      updatedAt: item.updatedAt?.toISOString(),
    }));

    const exportRecipes = recipeRows.map(r => ({
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
      nutrition: r.nutrition,
      isFavorite: r.isFavorite,
      updatedAt: r.updatedAt?.toISOString(),
      ...(r.extraData as Record<string, unknown> || {}),
    }));

    const exportMealPlans = mealPlanRows.map(m => ({
      id: m.itemId,
      date: m.date,
      meals: m.meals,
      updatedAt: m.updatedAt?.toISOString(),
      ...(m.extraData as Record<string, unknown> || {}),
    }));

    const exportShoppingList = shoppingRows.map(s => ({
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

    const exportCookware = cookwareRows.map(c => ({
      id: c.itemId,
      name: c.name,
      category: c.category,
      alternatives: c.alternatives,
      updatedAt: c.updatedAt?.toISOString(),
      ...(c.extraData as Record<string, unknown> || {}),
    }));

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        inventory: exportInventory,
        recipes: exportRecipes,
        mealPlans: exportMealPlans,
        shoppingList: exportShoppingList,
        cookware: exportCookware,
        preferences: syncData?.preferences || null,
        wasteLog: syncData?.wasteLog || [],
        consumedLog: syncData?.consumedLog || [],
        analytics: syncData?.analytics || null,
        onboarding: syncData?.onboarding || null,
        customLocations: syncData?.customLocations || null,
        userProfile: syncData?.userProfile || null,
      },
    };

    const date = new Date().toISOString().split("T")[0];
    res.setHeader("Content-Disposition", `attachment; filename="chefspaice-backup-${date}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.json(successResponse(backup));
  } catch (error) {
    next(error);
  }
});

const importRequestSchema = z.object({
  backup: z.object({
    version: z.literal(1),
    exportedAt: z.string(),
    data: z.record(z.unknown()),
  }),
  mode: z.enum(["merge", "replace"]),
});

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

router.post("/import", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }

    const parseResult = importRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest("Invalid request data", "INVALID_REQUEST_DATA").withDetails({ details: parseResult.error.errors.map(e => e.message).join(", ") });
    }

    const { backup, mode } = parseResult.data;
    const importData = backup.data as Record<string, unknown>;
    const userId = session.userId;

    const [pantryLimit, cookwareLimit] = await Promise.all([
      checkPantryItemLimit(userId),
      checkCookwareLimit(userId),
    ]);

    const importedInventory = Array.isArray(importData.inventory) ? importData.inventory as Record<string, unknown>[] : [];
    const importedRecipes = Array.isArray(importData.recipes) ? importData.recipes as Record<string, unknown>[] : [];
    const importedMealPlans = Array.isArray(importData.mealPlans) ? importData.mealPlans as Record<string, unknown>[] : [];
    const importedShoppingList = Array.isArray(importData.shoppingList) ? importData.shoppingList as Record<string, unknown>[] : [];
    const importedCookware = Array.isArray(importData.cookware) ? importData.cookware as Record<string, unknown>[] : [];

    const truncationWarnings: string[] = [];

    const pantryMax = typeof pantryLimit.limit === "number" ? pantryLimit.limit : Infinity;
    const cookwareMax = typeof cookwareLimit.limit === "number" ? cookwareLimit.limit : Infinity;

    let finalInventory = importedInventory;
    let finalCookware = importedCookware;

    if (mode === "replace") {
      await Promise.all([
        db.delete(userInventoryItems).where(eq(userInventoryItems.userId, userId)),
        db.delete(userSavedRecipes).where(eq(userSavedRecipes.userId, userId)),
        db.delete(userMealPlans).where(eq(userMealPlans.userId, userId)),
        db.delete(userShoppingItems).where(eq(userShoppingItems.userId, userId)),
        db.delete(userCookwareItems).where(eq(userCookwareItems.userId, userId)),
      ]);

      if (finalInventory.length > pantryMax) {
        truncationWarnings.push(`Inventory truncated from ${finalInventory.length} to ${pantryMax} items (plan limit)`);
        finalInventory = finalInventory.slice(0, pantryMax);
      }
      if (finalCookware.length > cookwareMax) {
        truncationWarnings.push(`Cookware truncated from ${finalCookware.length} to ${cookwareMax} items (plan limit)`);
        finalCookware = finalCookware.slice(0, cookwareMax);
      }

      const insertPromises: Promise<unknown>[] = [];

      if (finalInventory.length > 0) {
        insertPromises.push(db.insert(userInventoryItems).values(
          finalInventory.map(item => ({
            userId,
            itemId: String(item.id),
            name: String(item.name || ""),
            barcode: item.barcode as string | undefined,
            quantity: Number(item.quantity) || 1,
            unit: String(item.unit || "unit"),
            storageLocation: String(item.storageLocation || "pantry"),
            purchaseDate: item.purchaseDate as string | undefined,
            expirationDate: item.expirationDate as string | undefined,
            category: String(item.category || "other"),
            usdaCategory: item.usdaCategory as string | undefined,
            nutrition: item.nutrition as Record<string, unknown> | undefined,
            notes: item.notes as string | undefined,
            imageUri: item.imageUri as string | undefined,
            fdcId: item.fdcId as number | undefined,
            updatedAt: new Date(),
          }))
        ));
      }

      if (importedRecipes.length > 0) {
        insertPromises.push(db.insert(userSavedRecipes).values(
          importedRecipes.map(r => {
            const extra = extractExtraData(r, recipeKnownKeys);
            return {
              userId,
              itemId: String(r.id),
              title: String(r.title || ""),
              description: r.description as string | undefined,
              ingredients: r.ingredients as unknown,
              instructions: r.instructions as unknown,
              prepTime: r.prepTime as number | undefined,
              cookTime: r.cookTime as number | undefined,
              servings: r.servings as number | undefined,
              imageUri: r.imageUri as string | undefined,
              cloudImageUri: r.cloudImageUri as string | undefined,
              nutrition: r.nutrition as Record<string, unknown> | undefined,
              isFavorite: r.isFavorite as boolean | undefined,
              extraData: extra,
              updatedAt: new Date(),
            };
          })
        ));
      }

      if (importedMealPlans.length > 0) {
        insertPromises.push(db.insert(userMealPlans).values(
          importedMealPlans.map(m => {
            const extra = extractExtraData(m, mealPlanKnownKeys);
            return {
              userId,
              itemId: String(m.id),
              date: String(m.date || ""),
              meals: m.meals as unknown,
              extraData: extra,
              updatedAt: new Date(),
            };
          })
        ));
      }

      if (importedShoppingList.length > 0) {
        insertPromises.push(db.insert(userShoppingItems).values(
          importedShoppingList.map(s => {
            const extra = extractExtraData(s, shoppingListKnownKeys);
            return {
              userId,
              itemId: String(s.id),
              name: String(s.name || ""),
              quantity: Number(s.quantity) || 1,
              unit: String(s.unit || "unit"),
              isChecked: Boolean(s.isChecked),
              category: s.category as string | undefined,
              recipeId: s.recipeId as string | undefined,
              extraData: extra,
              updatedAt: new Date(),
            };
          })
        ));
      }

      if (finalCookware.length > 0) {
        insertPromises.push(db.insert(userCookwareItems).values(
          finalCookware.map(c => {
            const extra = extractExtraData(c, cookwareKnownKeys);
            return {
              userId,
              itemId: String(c.id),
              name: c.name as string | undefined,
              category: c.category as string | undefined,
              alternatives: c.alternatives as string[] | undefined,
              extraData: extra,
              updatedAt: new Date(),
            };
          })
        ));
      }

      await Promise.all(insertPromises);
    } else {
      // merge mode: upsert each item
      if (finalInventory.length > pantryMax) {
        truncationWarnings.push(`Inventory truncated from ${finalInventory.length} to ${pantryMax} items (plan limit)`);
        finalInventory = finalInventory.slice(0, pantryMax);
      }
      if (finalCookware.length > cookwareMax) {
        truncationWarnings.push(`Cookware truncated from ${finalCookware.length} to ${cookwareMax} items (plan limit)`);
        finalCookware = finalCookware.slice(0, cookwareMax);
      }

      const upsertPromises: Promise<unknown>[] = [];

      for (const item of finalInventory) {
        upsertPromises.push(db.insert(userInventoryItems).values({
          userId,
          itemId: String(item.id),
          name: String(item.name || ""),
          barcode: item.barcode as string | undefined,
          quantity: Number(item.quantity) || 1,
          unit: String(item.unit || "unit"),
          storageLocation: String(item.storageLocation || "pantry"),
          purchaseDate: item.purchaseDate as string | undefined,
          expirationDate: item.expirationDate as string | undefined,
          category: String(item.category || "other"),
          usdaCategory: item.usdaCategory as string | undefined,
          nutrition: item.nutrition as Record<string, unknown> | undefined,
          notes: item.notes as string | undefined,
          imageUri: item.imageUri as string | undefined,
          fdcId: item.fdcId as number | undefined,
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: [userInventoryItems.userId, userInventoryItems.itemId],
          set: {
            name: String(item.name || ""),
            barcode: item.barcode as string | undefined,
            quantity: Number(item.quantity) || 1,
            unit: String(item.unit || "unit"),
            storageLocation: String(item.storageLocation || "pantry"),
            purchaseDate: item.purchaseDate as string | undefined,
            expirationDate: item.expirationDate as string | undefined,
            category: String(item.category || "other"),
            usdaCategory: item.usdaCategory as string | undefined,
            nutrition: item.nutrition as Record<string, unknown> | undefined,
            notes: item.notes as string | undefined,
            imageUri: item.imageUri as string | undefined,
            fdcId: item.fdcId as number | undefined,
            updatedAt: new Date(),
          },
        }));
      }

      for (const r of importedRecipes) {
        const extra = extractExtraData(r, recipeKnownKeys);
        upsertPromises.push(db.insert(userSavedRecipes).values({
          userId,
          itemId: String(r.id),
          title: String(r.title || ""),
          description: r.description as string | undefined,
          ingredients: r.ingredients as unknown,
          instructions: r.instructions as unknown,
          prepTime: r.prepTime as number | undefined,
          cookTime: r.cookTime as number | undefined,
          servings: r.servings as number | undefined,
          imageUri: r.imageUri as string | undefined,
          cloudImageUri: r.cloudImageUri as string | undefined,
          nutrition: r.nutrition as Record<string, unknown> | undefined,
          isFavorite: r.isFavorite as boolean | undefined,
          extraData: extra,
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: [userSavedRecipes.userId, userSavedRecipes.itemId],
          set: {
            title: String(r.title || ""),
            description: r.description as string | undefined,
            ingredients: r.ingredients as unknown,
            instructions: r.instructions as unknown,
            prepTime: r.prepTime as number | undefined,
            cookTime: r.cookTime as number | undefined,
            servings: r.servings as number | undefined,
            imageUri: r.imageUri as string | undefined,
            cloudImageUri: r.cloudImageUri as string | undefined,
            nutrition: r.nutrition as Record<string, unknown> | undefined,
            isFavorite: r.isFavorite as boolean | undefined,
            extraData: extra,
            updatedAt: new Date(),
          },
        }));
      }

      for (const m of importedMealPlans) {
        const extra = extractExtraData(m, mealPlanKnownKeys);
        upsertPromises.push(db.insert(userMealPlans).values({
          userId,
          itemId: String(m.id),
          date: String(m.date || ""),
          meals: m.meals as unknown,
          extraData: extra,
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: [userMealPlans.userId, userMealPlans.itemId],
          set: {
            date: String(m.date || ""),
            meals: m.meals as unknown,
            extraData: extra,
            updatedAt: new Date(),
          },
        }));
      }

      for (const s of importedShoppingList) {
        const extra = extractExtraData(s, shoppingListKnownKeys);
        upsertPromises.push(db.insert(userShoppingItems).values({
          userId,
          itemId: String(s.id),
          name: String(s.name || ""),
          quantity: Number(s.quantity) || 1,
          unit: String(s.unit || "unit"),
          isChecked: Boolean(s.isChecked),
          category: s.category as string | undefined,
          recipeId: s.recipeId as string | undefined,
          extraData: extra,
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: [userShoppingItems.userId, userShoppingItems.itemId],
          set: {
            name: String(s.name || ""),
            quantity: Number(s.quantity) || 1,
            unit: String(s.unit || "unit"),
            isChecked: Boolean(s.isChecked),
            category: s.category as string | undefined,
            recipeId: s.recipeId as string | undefined,
            extraData: extra,
            updatedAt: new Date(),
          },
        }));
      }

      for (const c of finalCookware) {
        const extra = extractExtraData(c, cookwareKnownKeys);
        upsertPromises.push(db.insert(userCookwareItems).values({
          userId,
          itemId: String(c.id),
          name: c.name as string | undefined,
          category: c.category as string | undefined,
          alternatives: c.alternatives as string[] | undefined,
          extraData: extra,
          updatedAt: new Date(),
        }).onConflictDoUpdate({
          target: [userCookwareItems.userId, userCookwareItems.itemId],
          set: {
            name: c.name as string | undefined,
            category: c.category as string | undefined,
            alternatives: c.alternatives as string[] | undefined,
            extraData: extra,
            updatedAt: new Date(),
          },
        }));
      }

      await Promise.all(upsertPromises);
    }

    // Handle JSONB-only fields in user_sync_data
    const existingSyncData = await db.select().from(userSyncData).where(eq(userSyncData.userId, userId));
    const existing = existingSyncData.length > 0 ? existingSyncData[0] : null;

    let finalWasteLog: unknown;
    let finalConsumedLog: unknown;
    let finalPreferences: unknown;
    let finalAnalytics: unknown;
    let finalOnboarding: unknown;
    let finalCustomLocations: unknown;
    let finalUserProfile: unknown;

    if (mode === "replace") {
      finalWasteLog = Array.isArray(importData.wasteLog) ? importData.wasteLog : [];
      finalConsumedLog = Array.isArray(importData.consumedLog) ? importData.consumedLog : [];
      finalPreferences = importData.preferences || null;
      finalAnalytics = importData.analytics || null;
      finalOnboarding = importData.onboarding || null;
      finalCustomLocations = importData.customLocations || null;
      finalUserProfile = importData.userProfile || null;
    } else {
      const existingWasteLog = Array.isArray(existing?.wasteLog) ? (existing.wasteLog as unknown[]) : [];
      const existingConsumedLog = Array.isArray(existing?.consumedLog) ? (existing.consumedLog as unknown[]) : [];

      finalWasteLog = [...existingWasteLog, ...(Array.isArray(importData.wasteLog) ? importData.wasteLog : [])];
      finalConsumedLog = [...existingConsumedLog, ...(Array.isArray(importData.consumedLog) ? importData.consumedLog : [])];

      finalPreferences = importData.preferences && typeof importData.preferences === "object"
        ? deepMerge((existing?.preferences as Record<string, unknown>) || {}, importData.preferences as Record<string, unknown>)
        : existing?.preferences || null;
      finalAnalytics = importData.analytics && typeof importData.analytics === "object"
        ? deepMerge((existing?.analytics as Record<string, unknown>) || {}, importData.analytics as Record<string, unknown>)
        : existing?.analytics || null;
      finalOnboarding = importData.onboarding && typeof importData.onboarding === "object"
        ? deepMerge((existing?.onboarding as Record<string, unknown>) || {}, importData.onboarding as Record<string, unknown>)
        : existing?.onboarding || null;
      finalCustomLocations = importData.customLocations && typeof importData.customLocations === "object"
        ? deepMerge((existing?.customLocations as Record<string, unknown>) || {}, importData.customLocations as Record<string, unknown>)
        : existing?.customLocations || null;
      finalUserProfile = importData.userProfile && typeof importData.userProfile === "object"
        ? deepMerge((existing?.userProfile as Record<string, unknown>) || {}, importData.userProfile as Record<string, unknown>)
        : existing?.userProfile || null;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const importSectionTimestamps: Record<string, string> = {
      ...(existing?.sectionUpdatedAt as Record<string, string> || {}),
      inventory: nowIso,
      recipes: nowIso,
      mealPlans: nowIso,
      shoppingList: nowIso,
      cookware: nowIso,
      preferences: nowIso,
      wasteLog: nowIso,
      consumedLog: nowIso,
      analytics: nowIso,
      onboarding: nowIso,
      customLocations: nowIso,
      userProfile: nowIso,
    };

    const syncUpdatePayload = {
      preferences: finalPreferences,
      wasteLog: finalWasteLog,
      consumedLog: finalConsumedLog,
      analytics: finalAnalytics,
      onboarding: finalOnboarding,
      customLocations: finalCustomLocations,
      userProfile: finalUserProfile,
      sectionUpdatedAt: importSectionTimestamps,
      lastSyncedAt: now,
      updatedAt: now,
    };

    if (!existing) {
      await db.insert(userSyncData).values({
        userId,
        ...syncUpdatePayload,
      });
    } else {
      await db.update(userSyncData).set(syncUpdatePayload).where(eq(userSyncData.userId, userId));
    }

    // Count final rows for the summary
    const [
      [{ value: finalInventoryCount }],
      [{ value: finalRecipesCount }],
      [{ value: finalMealPlansCount }],
      [{ value: finalShoppingListCount }],
      [{ value: finalCookwareCount }],
    ] = await Promise.all([
      db.select({ value: count() }).from(userInventoryItems).where(eq(userInventoryItems.userId, userId)),
      db.select({ value: count() }).from(userSavedRecipes).where(eq(userSavedRecipes.userId, userId)),
      db.select({ value: count() }).from(userMealPlans).where(eq(userMealPlans.userId, userId)),
      db.select({ value: count() }).from(userShoppingItems).where(eq(userShoppingItems.userId, userId)),
      db.select({ value: count() }).from(userCookwareItems).where(eq(userCookwareItems.userId, userId)),
    ]);

    const responseData: Record<string, unknown> = {
      mode,
      importedAt: nowIso,
      summary: {
        inventory: finalInventoryCount,
        recipes: finalRecipesCount,
        mealPlans: finalMealPlansCount,
        shoppingList: finalShoppingListCount,
        cookware: finalCookwareCount,
        wasteLog: Array.isArray(finalWasteLog) ? (finalWasteLog as unknown[]).length : 0,
        consumedLog: Array.isArray(finalConsumedLog) ? (finalConsumedLog as unknown[]).length : 0,
        preferences: finalPreferences ? true : false,
        analytics: finalAnalytics ? true : false,
        onboarding: finalOnboarding ? true : false,
        customLocations: finalCustomLocations ? true : false,
        userProfile: finalUserProfile ? true : false,
      },
    };

    if (truncationWarnings.length > 0) {
      responseData.warnings = truncationWarnings;
    }

    res.json(successResponse(responseData));
  } catch (error) {
    next(error);
  }
});

export default router;
