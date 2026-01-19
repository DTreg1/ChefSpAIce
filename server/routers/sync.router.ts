import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { userSessions, userSyncData } from "../../shared/schema";
import { checkPantryItemLimit, checkCookwareLimit } from "../services/subscriptionService";
import { ERROR_CODES, ERROR_MESSAGES } from "@shared/subscription";

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
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

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

    let currentInventory: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].inventory) {
      currentInventory = JSON.parse(existingSyncData[0].inventory);
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
        inventory: JSON.stringify(currentInventory),
      });
    } else {
      await db
        .update(userSyncData)
        .set({
          inventory: JSON.stringify(currentInventory),
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
    console.error("Inventory sync error:", error);
    res.status(500).json({ error: "Failed to sync inventory" });
  }
});

router.put("/inventory", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

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

    let currentInventory: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].inventory) {
      currentInventory = JSON.parse(existingSyncData[0].inventory);
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
        inventory: JSON.stringify(currentInventory),
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
    console.error("Inventory update sync error:", error);
    res.status(500).json({ error: "Failed to sync inventory update" });
  }
});

router.delete("/inventory", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

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

    let currentInventory: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].inventory) {
      currentInventory = JSON.parse(existingSyncData[0].inventory);
    }

    currentInventory = currentInventory.filter(
      (item: unknown) => String((item as { id: string | number }).id) !== dataIdStr
    );

    await db
      .update(userSyncData)
      .set({
        inventory: JSON.stringify(currentInventory),
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
    console.error("Inventory delete sync error:", error);
    res.status(500).json({ error: "Failed to sync inventory deletion" });
  }
});

router.post("/recipes", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

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

    let currentRecipes: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].recipes) {
      currentRecipes = JSON.parse(existingSyncData[0].recipes);
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
        recipes: JSON.stringify(currentRecipes),
      });
    } else {
      await db
        .update(userSyncData)
        .set({
          recipes: JSON.stringify(currentRecipes),
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
    console.error("Recipes sync error:", error);
    res.status(500).json({ error: "Failed to sync recipes" });
  }
});

router.put("/recipes", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

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

    let currentRecipes: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].recipes) {
      currentRecipes = JSON.parse(existingSyncData[0].recipes);
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
        recipes: JSON.stringify(currentRecipes),
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
    console.error("Recipes update sync error:", error);
    res.status(500).json({ error: "Failed to sync recipe update" });
  }
});

router.delete("/recipes", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

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

    let currentRecipes: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].recipes) {
      currentRecipes = JSON.parse(existingSyncData[0].recipes);
    }

    currentRecipes = currentRecipes.filter(
      (item: unknown) => String((item as { id: string | number }).id) !== dataIdStr
    );

    await db
      .update(userSyncData)
      .set({
        recipes: JSON.stringify(currentRecipes),
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
    console.error("Recipes delete sync error:", error);
    res.status(500).json({ error: "Failed to sync recipe deletion" });
  }
});

router.post("/mealPlans", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

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

    let currentMealPlans: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].mealPlans) {
      currentMealPlans = JSON.parse(existingSyncData[0].mealPlans);
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
        mealPlans: JSON.stringify(currentMealPlans),
      });
    } else {
      await db
        .update(userSyncData)
        .set({
          mealPlans: JSON.stringify(currentMealPlans),
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
    console.error("Meal plans sync error:", error);
    res.status(500).json({ error: "Failed to sync meal plans" });
  }
});

router.put("/mealPlans", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

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

    let currentMealPlans: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].mealPlans) {
      currentMealPlans = JSON.parse(existingSyncData[0].mealPlans);
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
        mealPlans: JSON.stringify(currentMealPlans),
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
    console.error("Meal plans update sync error:", error);
    res.status(500).json({ error: "Failed to sync meal plan update" });
  }
});

router.delete("/mealPlans", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

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

    let currentMealPlans: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].mealPlans) {
      currentMealPlans = JSON.parse(existingSyncData[0].mealPlans);
    }

    currentMealPlans = currentMealPlans.filter(
      (item: unknown) => String((item as { id: string | number }).id) !== dataIdStr
    );

    await db
      .update(userSyncData)
      .set({
        mealPlans: JSON.stringify(currentMealPlans),
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
    console.error("Meal plans delete sync error:", error);
    res.status(500).json({ error: "Failed to sync meal plan deletion" });
  }
});

// =========================================================================
// COOKWARE SYNC ROUTES - with limit enforcement
// =========================================================================

router.post("/cookware", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

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

    let currentCookware: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].cookware) {
      currentCookware = JSON.parse(existingSyncData[0].cookware);
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
        cookware: JSON.stringify(currentCookware),
      });
    } else {
      await db
        .update(userSyncData)
        .set({
          cookware: JSON.stringify(currentCookware),
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
    console.error("Cookware sync error:", error);
    res.status(500).json({ error: "Failed to sync cookware" });
  }
});

router.put("/cookware", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

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

    let currentCookware: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].cookware) {
      currentCookware = JSON.parse(existingSyncData[0].cookware);
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
        cookware: JSON.stringify(currentCookware),
      });
    } else {
      await db
        .update(userSyncData)
        .set({
          cookware: JSON.stringify(currentCookware),
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
    console.error("Cookware update sync error:", error);
    res.status(500).json({ error: "Failed to sync cookware update" });
  }
});

router.delete("/cookware", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

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

    let currentCookware: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].cookware) {
      currentCookware = JSON.parse(existingSyncData[0].cookware);
    }

    currentCookware = currentCookware.filter(
      (item: unknown) => String((item as { id: string | number }).id) !== dataIdStr
    );

    await db
      .update(userSyncData)
      .set({
        cookware: JSON.stringify(currentCookware),
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
    console.error("Cookware delete sync error:", error);
    res.status(500).json({ error: "Failed to sync cookware deletion" });
  }
});

// =========================================================================
// SHOPPING LIST SYNC ROUTES
// =========================================================================

router.post("/shoppingList", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

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

    let currentShoppingList: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].shoppingList) {
      currentShoppingList = JSON.parse(existingSyncData[0].shoppingList);
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
        shoppingList: JSON.stringify(currentShoppingList),
      });
    } else {
      await db
        .update(userSyncData)
        .set({
          shoppingList: JSON.stringify(currentShoppingList),
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
    console.error("Shopping list sync error:", error);
    res.status(500).json({ error: "Failed to sync shopping list" });
  }
});

router.put("/shoppingList", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

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

    let currentShoppingList: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].shoppingList) {
      currentShoppingList = JSON.parse(existingSyncData[0].shoppingList);
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
        shoppingList: JSON.stringify(currentShoppingList),
      });
    } else {
      await db
        .update(userSyncData)
        .set({
          shoppingList: JSON.stringify(currentShoppingList),
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
    console.error("Shopping list update sync error:", error);
    res.status(500).json({ error: "Failed to sync shopping list update" });
  }
});

router.delete("/shoppingList", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

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

    let currentShoppingList: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].shoppingList) {
      currentShoppingList = JSON.parse(existingSyncData[0].shoppingList);
    }

    currentShoppingList = currentShoppingList.filter(
      (item: unknown) => String((item as { id: string | number }).id) !== dataIdStr
    );

    await db
      .update(userSyncData)
      .set({
        shoppingList: JSON.stringify(currentShoppingList),
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
    console.error("Shopping list delete sync error:", error);
    res.status(500).json({ error: "Failed to sync shopping list deletion" });
  }
});

export default router;
