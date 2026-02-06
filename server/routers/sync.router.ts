import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { userSessions, userSyncData } from "../../shared/schema";
import { checkPantryItemLimit, checkCookwareLimit } from "../services/subscriptionService";
import { ERROR_CODES, ERROR_MESSAGES } from "@shared/subscription";
import { logger } from "../lib/logger";

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
  
  const sessions = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.token, token));
  
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

router.post("/inventory", async (req: Request, res: Response) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    userId = session.userId;

    const parseResult = inventorySyncRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: parseResult.error.errors.map(e => e.message).join(", ") 
      });
    }

    const { operation, data } = parseResult.data;

    if (operation === "create") {
      const limitCheck = await checkPantryItemLimit(session.userId);
      const remaining = typeof limitCheck.remaining === 'number' ? limitCheck.remaining : Infinity;
      if (remaining < 1) {
        return res.status(403).json({
          error: ERROR_MESSAGES[ERROR_CODES.PANTRY_LIMIT_REACHED],
          code: ERROR_CODES.PANTRY_LIMIT_REACHED,
          limit: limitCheck.limit,
          remaining: 0,
        });
      }
    }

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentInventory: InventoryItem[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].inventory) {
      currentInventory = (existingSyncData[0].inventory as InventoryItem[]) || [];
    }

    const dataIdStr = String(data.id);
    
    if (operation === "create") {
      currentInventory.push(data);
    } else if (operation === "update") {
      const index = currentInventory.findIndex(
        (item: unknown) => String((item as { id: string | number }).id) === dataIdStr
      );
      if (index !== -1) {
        currentInventory[index] = data;
      } else {
        const limitCheck = await checkPantryItemLimit(session.userId);
        const remaining = typeof limitCheck.remaining === 'number' ? limitCheck.remaining : Infinity;
        if (remaining < 1) {
          return res.status(403).json({
            error: ERROR_MESSAGES[ERROR_CODES.PANTRY_LIMIT_REACHED],
            code: ERROR_CODES.PANTRY_LIMIT_REACHED,
            limit: limitCheck.limit,
            remaining: 0,
          });
        }
        currentInventory.push(data);
      }
    } else if (operation === "delete") {
      currentInventory = currentInventory.filter(
        (item: unknown) => String((item as { id: string | number }).id) !== dataIdStr
      );
    }

    const finalLimitCheck = await checkPantryItemLimit(session.userId);
    const maxLimit = typeof finalLimitCheck.limit === 'number' ? finalLimitCheck.limit : Infinity;
    if (currentInventory.length > maxLimit) {
      return res.status(403).json({
        error: ERROR_MESSAGES[ERROR_CODES.PANTRY_LIMIT_REACHED],
        code: ERROR_CODES.PANTRY_LIMIT_REACHED,
        limit: finalLimitCheck.limit,
        count: currentInventory.length,
      });
    }

    if (existingSyncData.length === 0) {
      await db.insert(userSyncData).values({
        userId: session.userId,
        inventory: currentInventory,
      });
    } else {
      await db
        .update(userSyncData)
        .set({
          inventory: currentInventory,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSyncData.userId, session.userId));
    }

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation,
      itemId: dataIdStr,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Sync failed", { dataType: "inventory", operation: "create", userId, error: errorMessage });
    recordSyncFailure(userId || "unknown", "inventory", "create", errorMessage);
    res.status(500).json({ error: "Failed to sync inventory" });
  }
});

router.put("/inventory", async (req: Request, res: Response) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    userId = session.userId;

    const updateSchema = z.object({
      data: inventoryItemSchema,
      clientTimestamp: z.string().optional(),
    });
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: parseResult.error.errors.map(e => e.message).join(", ") 
      });
    }

    const { data, clientTimestamp } = parseResult.data;
    const dataIdStr = String(data.id);

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentInventory: InventoryItem[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].inventory) {
      currentInventory = (existingSyncData[0].inventory as InventoryItem[]) || [];
    }

    const index = currentInventory.findIndex(
      (item: unknown) => String((item as { id: string | number }).id) === dataIdStr
    );
    
    if (index !== -1) {
      const existingItem = currentInventory[index] as { updatedAt?: string };
      const existingTimestamp = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
      // Prefer data.updatedAt (actual modification time), fallback to clientTimestamp (queue time), then Date.now()
      const dataUpdatedAt = (data as { updatedAt?: string }).updatedAt;
      const newTimestamp = dataUpdatedAt ? new Date(dataUpdatedAt).getTime() : 
                           clientTimestamp ? new Date(clientTimestamp).getTime() : Date.now();
      const finalTimestamp = dataUpdatedAt || clientTimestamp || new Date().toISOString();
      
      if (newTimestamp >= existingTimestamp) {
        currentInventory[index] = { ...data, updatedAt: finalTimestamp };
      } else {
        return res.json({
          success: true,
          syncedAt: new Date().toISOString(),
          operation: "skipped",
          reason: "stale_update",
          itemId: dataIdStr,
        });
      }
    } else {
      const limitCheck = await checkPantryItemLimit(session.userId);
      const remaining = typeof limitCheck.remaining === 'number' ? limitCheck.remaining : Infinity;
      if (remaining < 1) {
        return res.status(403).json({
          error: ERROR_MESSAGES[ERROR_CODES.PANTRY_LIMIT_REACHED],
          code: ERROR_CODES.PANTRY_LIMIT_REACHED,
          limit: limitCheck.limit,
          remaining: 0,
        });
      }
      const dataUpdatedAt = (data as { updatedAt?: string }).updatedAt;
      currentInventory.push({ ...data, updatedAt: dataUpdatedAt || clientTimestamp || new Date().toISOString() });
    }

    const finalLimitCheck = await checkPantryItemLimit(session.userId);
    const maxLimit = typeof finalLimitCheck.limit === 'number' ? finalLimitCheck.limit : Infinity;
    if (currentInventory.length > maxLimit) {
      return res.status(403).json({
        error: ERROR_MESSAGES[ERROR_CODES.PANTRY_LIMIT_REACHED],
        code: ERROR_CODES.PANTRY_LIMIT_REACHED,
        limit: finalLimitCheck.limit,
        count: currentInventory.length,
      });
    }

    await db
      .update(userSyncData)
      .set({
        inventory: currentInventory,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSyncData.userId, session.userId));

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation: "update",
      itemId: dataIdStr,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Sync failed", { dataType: "inventory", operation: "update", userId, error: errorMessage });
    recordSyncFailure(userId || "unknown", "inventory", "update", errorMessage);
    res.status(500).json({ error: "Failed to sync inventory update" });
  }
});

router.delete("/inventory", async (req: Request, res: Response) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    userId = session.userId;

    const deleteSchema = z.object({
      data: z.object({ id: z.union([z.string(), z.number()]) }),
    });
    const parseResult = deleteSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: parseResult.error.errors.map(e => e.message).join(", ") 
      });
    }

    const { data } = parseResult.data;
    const dataIdStr = String(data.id);

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentInventory: InventoryItem[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].inventory) {
      currentInventory = (existingSyncData[0].inventory as InventoryItem[]) || [];
    }

    currentInventory = currentInventory.filter(
      (item: unknown) => String((item as { id: string | number }).id) !== dataIdStr
    );

    await db
      .update(userSyncData)
      .set({
        inventory: currentInventory,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSyncData.userId, session.userId));

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation: "delete",
      itemId: dataIdStr,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Sync failed", { dataType: "inventory", operation: "delete", userId, error: errorMessage });
    recordSyncFailure(userId || "unknown", "inventory", "delete", errorMessage);
    res.status(500).json({ error: "Failed to sync inventory deletion" });
  }
});

router.post("/recipes", async (req: Request, res: Response) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    userId = session.userId;

    const parseResult = recipeSyncRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: parseResult.error.errors.map(e => e.message).join(", ") 
      });
    }

    const { operation, data } = parseResult.data;
    const dataIdStr = String(data.id);

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentRecipes: Recipe[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].recipes) {
      currentRecipes = (existingSyncData[0].recipes as Recipe[]) || [];
    }

    if (operation === "create") {
      currentRecipes.push(data);
    } else if (operation === "update") {
      const index = currentRecipes.findIndex(
        (item: unknown) => String((item as { id: string | number }).id) === dataIdStr
      );
      if (index !== -1) {
        currentRecipes[index] = data;
      } else {
        currentRecipes.push(data);
      }
    } else if (operation === "delete") {
      currentRecipes = currentRecipes.filter(
        (item: unknown) => String((item as { id: string | number }).id) !== dataIdStr
      );
    }

    if (existingSyncData.length === 0) {
      await db.insert(userSyncData).values({
        userId: session.userId,
        recipes: currentRecipes,
      });
    } else {
      await db
        .update(userSyncData)
        .set({
          recipes: currentRecipes,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSyncData.userId, session.userId));
    }

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation,
      itemId: dataIdStr,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Sync failed", { dataType: "recipes", operation: "create", userId, error: errorMessage });
    recordSyncFailure(userId || "unknown", "recipes", "create", errorMessage);
    res.status(500).json({ error: "Failed to sync recipes" });
  }
});

router.put("/recipes", async (req: Request, res: Response) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    userId = session.userId;

    const updateSchema = z.object({
      data: recipeSchema,
      clientTimestamp: z.string().optional(),
    });
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: parseResult.error.errors.map(e => e.message).join(", ") 
      });
    }

    const { data, clientTimestamp } = parseResult.data;
    const dataIdStr = String(data.id);

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentRecipes: Recipe[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].recipes) {
      currentRecipes = (existingSyncData[0].recipes as Recipe[]) || [];
    }

    const index = currentRecipes.findIndex(
      (item: unknown) => String((item as { id: string | number }).id) === dataIdStr
    );
    
    if (index !== -1) {
      const existingItem = currentRecipes[index] as { updatedAt?: string };
      const existingTimestamp = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
      const dataUpdatedAt = (data as { updatedAt?: string }).updatedAt;
      const newTimestamp = dataUpdatedAt ? new Date(dataUpdatedAt).getTime() : 
                           clientTimestamp ? new Date(clientTimestamp).getTime() : Date.now();
      const finalTimestamp = dataUpdatedAt || clientTimestamp || new Date().toISOString();
      
      if (newTimestamp >= existingTimestamp) {
        currentRecipes[index] = { ...data, updatedAt: finalTimestamp };
      } else {
        return res.json({
          success: true,
          syncedAt: new Date().toISOString(),
          operation: "skipped",
          reason: "stale_update",
          itemId: dataIdStr,
        });
      }
    } else {
      const dataUpdatedAt = (data as { updatedAt?: string }).updatedAt;
      currentRecipes.push({ ...data, updatedAt: dataUpdatedAt || clientTimestamp || new Date().toISOString() });
    }

    await db
      .update(userSyncData)
      .set({
        recipes: currentRecipes,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSyncData.userId, session.userId));

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation: "update",
      itemId: dataIdStr,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Sync failed", { dataType: "recipes", operation: "update", userId, error: errorMessage });
    recordSyncFailure(userId || "unknown", "recipes", "update", errorMessage);
    res.status(500).json({ error: "Failed to sync recipe update" });
  }
});

router.delete("/recipes", async (req: Request, res: Response) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    userId = session.userId;

    const deleteSchema = z.object({
      data: z.object({ id: z.union([z.string(), z.number()]) }),
    });
    const parseResult = deleteSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: parseResult.error.errors.map(e => e.message).join(", ") 
      });
    }

    const { data } = parseResult.data;
    const dataIdStr = String(data.id);

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentRecipes: Recipe[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].recipes) {
      currentRecipes = (existingSyncData[0].recipes as Recipe[]) || [];
    }

    currentRecipes = currentRecipes.filter(
      (item: unknown) => String((item as { id: string | number }).id) !== dataIdStr
    );

    await db
      .update(userSyncData)
      .set({
        recipes: currentRecipes,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSyncData.userId, session.userId));

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation: "delete",
      itemId: dataIdStr,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Sync failed", { dataType: "recipes", operation: "delete", userId, error: errorMessage });
    recordSyncFailure(userId || "unknown", "recipes", "delete", errorMessage);
    res.status(500).json({ error: "Failed to sync recipe deletion" });
  }
});

router.post("/mealPlans", async (req: Request, res: Response) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    userId = session.userId;

    const parseResult = mealPlanSyncRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: parseResult.error.errors.map(e => e.message).join(", ") 
  });
    }

    const { operation, data } = parseResult.data;
    const dataIdStr = String(data.id);

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentMealPlans: MealPlan[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].mealPlans) {
      currentMealPlans = (existingSyncData[0].mealPlans as MealPlan[]) || [];
    }

    if (operation === "create") {
      currentMealPlans.push(data);
    } else if (operation === "update") {
      const index = currentMealPlans.findIndex(
        (item: unknown) => String((item as { id: string | number }).id) === dataIdStr
      );
      if (index !== -1) {
        currentMealPlans[index] = data;
      } else {
        currentMealPlans.push(data);
      }
    } else if (operation === "delete") {
      currentMealPlans = currentMealPlans.filter(
        (item: unknown) => String((item as { id: string | number }).id) !== dataIdStr
      );
    }

    if (existingSyncData.length === 0) {
      await db.insert(userSyncData).values({
        userId: session.userId,
        mealPlans: currentMealPlans,
      });
    } else {
      await db
        .update(userSyncData)
        .set({
          mealPlans: currentMealPlans,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSyncData.userId, session.userId));
    }

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation,
      itemId: dataIdStr,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Sync failed", { dataType: "mealPlans", operation: "create", userId, error: errorMessage });
    recordSyncFailure(userId || "unknown", "mealPlans", "create", errorMessage);
    res.status(500).json({ error: "Failed to sync meal plans" });
  }
});

router.put("/mealPlans", async (req: Request, res: Response) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    userId = session.userId;

    const updateSchema = z.object({
      data: mealPlanSchema,
      clientTimestamp: z.string().optional(),
    });
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: parseResult.error.errors.map(e => e.message).join(", ") 
      });
    }

    const { data, clientTimestamp } = parseResult.data;
    const dataIdStr = String(data.id);

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentMealPlans: MealPlan[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].mealPlans) {
      currentMealPlans = (existingSyncData[0].mealPlans as MealPlan[]) || [];
    }

    const index = currentMealPlans.findIndex(
      (item: unknown) => String((item as { id: string | number }).id) === dataIdStr
    );
    
    if (index !== -1) {
      const existingItem = currentMealPlans[index] as { updatedAt?: string };
      const existingTimestamp = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
      const dataUpdatedAt = (data as { updatedAt?: string }).updatedAt;
      const newTimestamp = dataUpdatedAt ? new Date(dataUpdatedAt).getTime() : 
                           clientTimestamp ? new Date(clientTimestamp).getTime() : Date.now();
      const finalTimestamp = dataUpdatedAt || clientTimestamp || new Date().toISOString();
      
      if (newTimestamp >= existingTimestamp) {
        currentMealPlans[index] = { ...data, updatedAt: finalTimestamp };
      } else {
        return res.json({
          success: true,
          syncedAt: new Date().toISOString(),
          operation: "skipped",
          reason: "stale_update",
          itemId: dataIdStr,
        });
      }
    } else {
      const dataUpdatedAt = (data as { updatedAt?: string }).updatedAt;
      currentMealPlans.push({ ...data, updatedAt: dataUpdatedAt || clientTimestamp || new Date().toISOString() });
    }

    await db
      .update(userSyncData)
      .set({
        mealPlans: currentMealPlans,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSyncData.userId, session.userId));

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation: "update",
      itemId: dataIdStr,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Sync failed", { dataType: "mealPlans", operation: "update", userId, error: errorMessage });
    recordSyncFailure(userId || "unknown", "mealPlans", "update", errorMessage);
    res.status(500).json({ error: "Failed to sync meal plan update" });
  }
});

router.delete("/mealPlans", async (req: Request, res: Response) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    userId = session.userId;

    const deleteSchema = z.object({
      data: z.object({ id: z.union([z.string(), z.number()]) }),
    });
    const parseResult = deleteSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: parseResult.error.errors.map(e => e.message).join(", ") 
      });
    }

    const { data } = parseResult.data;
    const dataIdStr = String(data.id);

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentMealPlans: MealPlan[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].mealPlans) {
      currentMealPlans = (existingSyncData[0].mealPlans as MealPlan[]) || [];
    }

    currentMealPlans = currentMealPlans.filter(
      (item: unknown) => String((item as { id: string | number }).id) !== dataIdStr
    );

    await db
      .update(userSyncData)
      .set({
        mealPlans: currentMealPlans,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSyncData.userId, session.userId));

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation: "delete",
      itemId: dataIdStr,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Sync failed", { dataType: "mealPlans", operation: "delete", userId, error: errorMessage });
    recordSyncFailure(userId || "unknown", "mealPlans", "delete", errorMessage);
    res.status(500).json({ error: "Failed to sync meal plan deletion" });
  }
});

// =========================================================================
// COOKWARE SYNC ROUTES - with limit enforcement
// =========================================================================

router.post("/cookware", async (req: Request, res: Response) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    userId = session.userId;

    const parseResult = cookwareSyncRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: parseResult.error.errors.map(e => e.message).join(", ") 
      });
    }

    const { operation, data } = parseResult.data;
    const dataIdStr = String(data.id);

    // Fetch existing cookware FIRST before any mutation decisions
    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentCookware: Cookware[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].cookware) {
      currentCookware = (existingSyncData[0].cookware as Cookware[]) || [];
    }

    // Determine if this operation would add a new item
    const isAddingNewItem = operation === "create" || 
      (operation === "update" && currentCookware.findIndex(
        (item: unknown) => String((item as { id: string | number }).id) === dataIdStr
      ) === -1);

    // Check limit BEFORE any mutation if adding a new item
    if (isAddingNewItem) {
      const limitCheck = await checkCookwareLimit(session.userId);
      const maxLimit = typeof limitCheck.limit === 'number' ? limitCheck.limit : Infinity;
      
      // Check if current count would exceed limit after adding
      if (currentCookware.length >= maxLimit) {
        return res.status(403).json({
          error: ERROR_MESSAGES[ERROR_CODES.COOKWARE_LIMIT_REACHED],
          code: ERROR_CODES.COOKWARE_LIMIT_REACHED,
          limit: limitCheck.limit,
          remaining: 0,
          count: currentCookware.length,
        });
      }
    }

    // Now safe to mutate the array
    if (operation === "create") {
      currentCookware.push(data);
    } else if (operation === "update") {
      const index = currentCookware.findIndex(
        (item: unknown) => String((item as { id: string | number }).id) === dataIdStr
      );
      if (index !== -1) {
        currentCookware[index] = data;
      } else {
        // Already checked limit above, safe to push
        currentCookware.push(data);
      }
    } else if (operation === "delete") {
      currentCookware = currentCookware.filter(
        (item: unknown) => String((item as { id: string | number }).id) !== dataIdStr
      );
    }

    // Persist to database
    if (existingSyncData.length === 0) {
      await db.insert(userSyncData).values({
        userId: session.userId,
        cookware: currentCookware,
      });
    } else {
      await db
        .update(userSyncData)
        .set({
          cookware: currentCookware,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSyncData.userId, session.userId));
    }

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation,
      itemId: dataIdStr,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Sync failed", { dataType: "cookware", operation: "create", userId, error: errorMessage });
    recordSyncFailure(userId || "unknown", "cookware", "create", errorMessage);
    res.status(500).json({ error: "Failed to sync cookware" });
  }
});

router.put("/cookware", async (req: Request, res: Response) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    userId = session.userId;

    const updateSchema = z.object({
      data: cookwareSchema,
      clientTimestamp: z.string().optional(),
    });
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: parseResult.error.errors.map(e => e.message).join(", ") 
      });
    }

    const { data, clientTimestamp } = parseResult.data;
    const dataIdStr = String(data.id);

    // Fetch existing cookware FIRST before any mutation decisions
    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentCookware: Cookware[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].cookware) {
      currentCookware = (existingSyncData[0].cookware as Cookware[]) || [];
    }

    const index = currentCookware.findIndex(
      (item: unknown) => String((item as { id: string | number }).id) === dataIdStr
    );
    
    // If item not found, this would add a new one - check limit FIRST
    if (index === -1) {
      const limitCheck = await checkCookwareLimit(session.userId);
      const maxLimit = typeof limitCheck.limit === 'number' ? limitCheck.limit : Infinity;
      
      if (currentCookware.length >= maxLimit) {
        return res.status(403).json({
          error: ERROR_MESSAGES[ERROR_CODES.COOKWARE_LIMIT_REACHED],
          code: ERROR_CODES.COOKWARE_LIMIT_REACHED,
          limit: limitCheck.limit,
          remaining: 0,
          count: currentCookware.length,
        });
      }
      // Safe to add new item
      const dataUpdatedAt = (data as { updatedAt?: string }).updatedAt;
      currentCookware.push({ ...data, updatedAt: dataUpdatedAt || clientTimestamp || new Date().toISOString() });
    } else {
      // Update existing item - check timestamps for conflict resolution
      const existingItem = currentCookware[index] as { updatedAt?: string };
      const existingTimestamp = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
      const dataUpdatedAt = (data as { updatedAt?: string }).updatedAt;
      const newTimestamp = dataUpdatedAt ? new Date(dataUpdatedAt).getTime() : 
                           clientTimestamp ? new Date(clientTimestamp).getTime() : Date.now();
      const finalTimestamp = dataUpdatedAt || clientTimestamp || new Date().toISOString();
      
      if (newTimestamp >= existingTimestamp) {
        currentCookware[index] = { ...data, updatedAt: finalTimestamp };
      } else {
        return res.json({
          success: true,
          syncedAt: new Date().toISOString(),
          operation: "skipped",
          reason: "stale_update",
          itemId: dataIdStr,
        });
      }
    }

    // Persist to database
    if (existingSyncData.length === 0) {
      await db.insert(userSyncData).values({
        userId: session.userId,
        cookware: currentCookware,
      });
    } else {
      await db
        .update(userSyncData)
        .set({
          cookware: currentCookware,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSyncData.userId, session.userId));
    }

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation: "update",
      itemId: dataIdStr,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Sync failed", { dataType: "cookware", operation: "update", userId, error: errorMessage });
    recordSyncFailure(userId || "unknown", "cookware", "update", errorMessage);
    res.status(500).json({ error: "Failed to sync cookware update" });
  }
});

router.delete("/cookware", async (req: Request, res: Response) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    userId = session.userId;

    const deleteSchema = z.object({
      data: z.object({ id: z.union([z.string(), z.number()]) }),
    });
    const parseResult = deleteSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: parseResult.error.errors.map(e => e.message).join(", ") 
      });
    }

    const { data } = parseResult.data;
    const dataIdStr = String(data.id);

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentCookware: Cookware[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].cookware) {
      currentCookware = (existingSyncData[0].cookware as Cookware[]) || [];
    }

    currentCookware = currentCookware.filter(
      (item: unknown) => String((item as { id: string | number }).id) !== dataIdStr
    );

    await db
      .update(userSyncData)
      .set({
        cookware: currentCookware,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSyncData.userId, session.userId));

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation: "delete",
      itemId: dataIdStr,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Sync failed", { dataType: "cookware", operation: "delete", userId, error: errorMessage });
    recordSyncFailure(userId || "unknown", "cookware", "delete", errorMessage);
    res.status(500).json({ error: "Failed to sync cookware deletion" });
  }
});

// =========================================================================
// SHOPPING LIST SYNC ROUTES
// =========================================================================

router.post("/shoppingList", async (req: Request, res: Response) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    userId = session.userId;

    const parseResult = shoppingListSyncRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: parseResult.error.errors.map(e => e.message).join(", ") 
      });
    }

    const { operation, data } = parseResult.data;
    const dataIdStr = String(data.id);

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentShoppingList: ShoppingListItem[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].shoppingList) {
      currentShoppingList = (existingSyncData[0].shoppingList as ShoppingListItem[]) || [];
    }

    if (operation === "create") {
      currentShoppingList.push(data);
    } else if (operation === "update") {
      const index = currentShoppingList.findIndex(
        (item: unknown) => String((item as { id: string | number }).id) === dataIdStr
      );
      if (index !== -1) {
        currentShoppingList[index] = data;
      } else {
        currentShoppingList.push(data);
      }
    } else if (operation === "delete") {
      currentShoppingList = currentShoppingList.filter(
        (item: unknown) => String((item as { id: string | number }).id) !== dataIdStr
      );
    }

    if (existingSyncData.length === 0) {
      await db.insert(userSyncData).values({
        userId: session.userId,
        shoppingList: currentShoppingList,
      });
    } else {
      await db
        .update(userSyncData)
        .set({
          shoppingList: currentShoppingList,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSyncData.userId, session.userId));
    }

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation,
      itemId: dataIdStr,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Sync failed", { dataType: "shoppingList", operation: "create", userId, error: errorMessage });
    recordSyncFailure(userId || "unknown", "shoppingList", "create", errorMessage);
    res.status(500).json({ error: "Failed to sync shopping list" });
  }
});

router.put("/shoppingList", async (req: Request, res: Response) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    userId = session.userId;

    const updateSchema = z.object({
      data: shoppingListItemSchema,
      clientTimestamp: z.string().optional(),
    });
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: parseResult.error.errors.map(e => e.message).join(", ") 
      });
    }

    const { data, clientTimestamp } = parseResult.data;
    const dataIdStr = String(data.id);

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentShoppingList: ShoppingListItem[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].shoppingList) {
      currentShoppingList = (existingSyncData[0].shoppingList as ShoppingListItem[]) || [];
    }

    const index = currentShoppingList.findIndex(
      (item: unknown) => String((item as { id: string | number }).id) === dataIdStr
    );
    
    if (index !== -1) {
      const existingItem = currentShoppingList[index] as { updatedAt?: string };
      const existingTimestamp = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
      const dataUpdatedAt = (data as { updatedAt?: string }).updatedAt;
      const newTimestamp = dataUpdatedAt ? new Date(dataUpdatedAt).getTime() : 
                           clientTimestamp ? new Date(clientTimestamp).getTime() : Date.now();
      const finalTimestamp = dataUpdatedAt || clientTimestamp || new Date().toISOString();
      
      if (newTimestamp >= existingTimestamp) {
        currentShoppingList[index] = { ...data, updatedAt: finalTimestamp };
      } else {
        return res.json({
          success: true,
          syncedAt: new Date().toISOString(),
          operation: "skipped",
          reason: "stale_update",
          itemId: dataIdStr,
        });
      }
    } else {
      const dataUpdatedAt = (data as { updatedAt?: string }).updatedAt;
      currentShoppingList.push({ ...data, updatedAt: dataUpdatedAt || clientTimestamp || new Date().toISOString() });
    }

    if (existingSyncData.length === 0) {
      await db.insert(userSyncData).values({
        userId: session.userId,
        shoppingList: currentShoppingList,
      });
    } else {
      await db
        .update(userSyncData)
        .set({
          shoppingList: currentShoppingList,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSyncData.userId, session.userId));
    }

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation: "update",
      itemId: dataIdStr,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Sync failed", { dataType: "shoppingList", operation: "update", userId, error: errorMessage });
    recordSyncFailure(userId || "unknown", "shoppingList", "update", errorMessage);
    res.status(500).json({ error: "Failed to sync shopping list update" });
  }
});

router.delete("/shoppingList", async (req: Request, res: Response) => {
  let userId: string | undefined;
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    userId = session.userId;

    const deleteSchema = z.object({
      data: z.object({ id: z.union([z.string(), z.number()]) }),
    });
    const parseResult = deleteSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid request data", 
        details: parseResult.error.errors.map(e => e.message).join(", ") 
      });
    }

    const { data } = parseResult.data;
    const dataIdStr = String(data.id);

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentShoppingList: ShoppingListItem[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].shoppingList) {
      currentShoppingList = (existingSyncData[0].shoppingList as ShoppingListItem[]) || [];
    }

    currentShoppingList = currentShoppingList.filter(
      (item: unknown) => String((item as { id: string | number }).id) !== dataIdStr
    );

    await db
      .update(userSyncData)
      .set({
        shoppingList: currentShoppingList,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSyncData.userId, session.userId));

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation: "delete",
      itemId: dataIdStr,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Sync failed", { dataType: "shoppingList", operation: "delete", userId, error: errorMessage });
    recordSyncFailure(userId || "unknown", "shoppingList", "delete", errorMessage);
    res.status(500).json({ error: "Failed to sync shopping list deletion" });
  }
});

router.get("/status", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    const lastSyncedAt = existingSyncData.length > 0 && existingSyncData[0].lastSyncedAt
      ? existingSyncData[0].lastSyncedAt.toISOString()
      : null;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const userFailures = (syncFailures.get(session.userId) || [])
      .filter(r => r.timestamp > oneDayAgo);
    
    const syncData = existingSyncData.length > 0 ? existingSyncData[0] : null;
    const isConsistent = syncData !== null && syncData.lastSyncedAt !== null;

    res.json({
      lastSyncedAt,
      failedOperations24h: userFailures.length,
      recentFailures: userFailures.slice(-10).map(f => ({
        dataType: f.dataType,
        operation: f.operation,
        errorMessage: f.errorMessage,
        timestamp: f.timestamp.toISOString(),
      })),
      isConsistent,
      dataTypes: syncData ? {
        inventory: Array.isArray(syncData.inventory) ? (syncData.inventory as unknown[]).length : 0,
        recipes: Array.isArray(syncData.recipes) ? (syncData.recipes as unknown[]).length : 0,
        mealPlans: Array.isArray(syncData.mealPlans) ? (syncData.mealPlans as unknown[]).length : 0,
        shoppingList: Array.isArray(syncData.shoppingList) ? (syncData.shoppingList as unknown[]).length : 0,
        cookware: Array.isArray(syncData.cookware) ? (syncData.cookware as unknown[]).length : 0,
      } : null,
    });
  } catch (error) {
    logger.error("Failed to get sync status", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Failed to get sync status" });
  }
});

export default router;
