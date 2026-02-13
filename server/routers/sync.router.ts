import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { eq, and, count, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  userSyncData, userInventoryItems, userSavedRecipes, userMealPlans, userShoppingItems, userCookwareItems, userWasteLogs, userConsumedLogs, userCustomLocations, userSyncKV,
  syncInventoryItemSchema, syncRecipeSchema, syncMealPlanSchema,
  syncShoppingItemSchema, syncCookwareItemSchema,
  syncWasteLogEntrySchema, syncConsumedLogEntrySchema,
  syncPreferencesSchema, syncAnalyticsSchema, syncOnboardingSchema,
  syncCustomLocationsSchema, syncUserProfileSchema,
} from "../../shared/schema";
import { checkPantryItemLimit, checkCookwareLimit } from "../services/subscriptionService";
import { AppError } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validateBody";
import { successResponse } from "../lib/apiResponse";
import {
  getAuthToken, getSessionFromToken,
  extractExtraData, recipeKnownKeys, mealPlanKnownKeys, shoppingListKnownKeys, cookwareKnownKeys,
  syncFailures,
} from "./sync/sync-helpers";
import inventoryRouter from "./sync/inventory-sync";
import recipesRouter from "./sync/recipes-sync";
import mealPlansRouter from "./sync/meal-plans-sync";
import shoppingRouter from "./sync/shopping-sync";
import cookwareRouter from "./sync/cookware-sync";

const router = Router();

router.use("/inventory", inventoryRouter);
router.use("/recipes", recipesRouter);
router.use("/mealPlans", mealPlansRouter);
router.use("/shoppingList", shoppingRouter);
router.use("/cookware", cookwareRouter);

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

    const [inventoryRows, recipeRows, mealPlanRows, shoppingRows, cookwareRows, wasteLogRows, consumedLogRows, customLocationRows, kvRows] = await Promise.all([
      db.select().from(userInventoryItems).where(and(eq(userInventoryItems.userId, session.userId), isNull(userInventoryItems.deletedAt))),
      db.select().from(userSavedRecipes).where(eq(userSavedRecipes.userId, session.userId)),
      db.select().from(userMealPlans).where(eq(userMealPlans.userId, session.userId)),
      db.select().from(userShoppingItems).where(eq(userShoppingItems.userId, session.userId)),
      db.select().from(userCookwareItems).where(eq(userCookwareItems.userId, session.userId)),
      db.select().from(userWasteLogs).where(eq(userWasteLogs.userId, session.userId)),
      db.select().from(userConsumedLogs).where(eq(userConsumedLogs.userId, session.userId)),
      db.select().from(userCustomLocations).where(eq(userCustomLocations.userId, session.userId)),
      db.select().from(userSyncKV).where(eq(userSyncKV.userId, session.userId)),
    ]);

    const kvMap: Record<string, unknown> = {};
    for (const kv of kvRows) {
      kvMap[kv.section] = kv.data;
    }

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
        preferences: kvMap["preferences"] || null,
        wasteLog: wasteLogRows.map(w => ({
          id: w.entryId,
          itemName: w.itemName,
          quantity: w.quantity,
          unit: w.unit,
          reason: w.reason,
          date: w.date,
          ...(w.extraData as Record<string, unknown> || {}),
        })),
        consumedLog: consumedLogRows.map(c => ({
          id: c.entryId,
          itemName: c.itemName,
          quantity: c.quantity,
          unit: c.unit,
          date: c.date,
          ...(c.extraData as Record<string, unknown> || {}),
        })),
        analytics: kvMap["analytics"] || null,
        onboarding: kvMap["onboarding"] || null,
        customLocations: customLocationRows.map(l => ({
          id: l.locationId,
          name: l.name,
          type: l.type,
          ...(l.extraData as Record<string, unknown> || {}),
        })),
        userProfile: kvMap["userProfile"] || null,
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

router.post("/import", validateBody(importRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }

    const { backup, mode } = req.body;
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

    const validationErrors: string[] = [];

    for (let i = 0; i < importedInventory.length; i++) {
      const result = syncInventoryItemSchema.safeParse(importedInventory[i]);
      if (!result.success) {
        validationErrors.push(`inventory[${i}]: ${result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      }
    }
    for (let i = 0; i < importedRecipes.length; i++) {
      const result = syncRecipeSchema.safeParse(importedRecipes[i]);
      if (!result.success) {
        validationErrors.push(`recipes[${i}]: ${result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      }
    }
    for (let i = 0; i < importedMealPlans.length; i++) {
      const result = syncMealPlanSchema.safeParse(importedMealPlans[i]);
      if (!result.success) {
        validationErrors.push(`mealPlans[${i}]: ${result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      }
    }
    for (let i = 0; i < importedShoppingList.length; i++) {
      const result = syncShoppingItemSchema.safeParse(importedShoppingList[i]);
      if (!result.success) {
        validationErrors.push(`shoppingList[${i}]: ${result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      }
    }
    for (let i = 0; i < importedCookware.length; i++) {
      const result = syncCookwareItemSchema.safeParse(importedCookware[i]);
      if (!result.success) {
        validationErrors.push(`cookware[${i}]: ${result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      }
    }

    if (Array.isArray(importData.wasteLog)) {
      for (let i = 0; i < importData.wasteLog.length; i++) {
        const result = syncWasteLogEntrySchema.safeParse(importData.wasteLog[i]);
        if (!result.success) {
          validationErrors.push(`wasteLog[${i}]: ${result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
        }
      }
    }
    if (Array.isArray(importData.consumedLog)) {
      for (let i = 0; i < importData.consumedLog.length; i++) {
        const result = syncConsumedLogEntrySchema.safeParse(importData.consumedLog[i]);
        if (!result.success) {
          validationErrors.push(`consumedLog[${i}]: ${result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
        }
      }
    }
    if (importData.preferences !== undefined && importData.preferences !== null) {
      const result = syncPreferencesSchema.safeParse(importData.preferences);
      if (!result.success) {
        validationErrors.push(`preferences: ${result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      }
    }
    if (importData.analytics !== undefined && importData.analytics !== null) {
      const result = syncAnalyticsSchema.safeParse(importData.analytics);
      if (!result.success) {
        validationErrors.push(`analytics: ${result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      }
    }
    if (importData.onboarding !== undefined && importData.onboarding !== null) {
      const result = syncOnboardingSchema.safeParse(importData.onboarding);
      if (!result.success) {
        validationErrors.push(`onboarding: ${result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      }
    }
    if (importData.customLocations !== undefined && importData.customLocations !== null) {
      const result = syncCustomLocationsSchema.safeParse(importData.customLocations);
      if (!result.success) {
        validationErrors.push(`customLocations: ${result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      }
    }
    if (importData.userProfile !== undefined && importData.userProfile !== null) {
      const result = syncUserProfileSchema.safeParse(importData.userProfile);
      if (!result.success) {
        validationErrors.push(`userProfile: ${result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      }
    }

    if (validationErrors.length > 0) {
      throw AppError.badRequest("Import data contains invalid items", "IMPORT_VALIDATION_FAILED").withDetails({ errors: validationErrors.slice(0, 20) });
    }

    const truncationWarnings: string[] = [];

    const pantryMax = typeof pantryLimit.limit === "number" ? pantryLimit.limit : Infinity;
    const cookwareMax = typeof cookwareLimit.limit === "number" ? cookwareLimit.limit : Infinity;

    let finalInventory = importedInventory;
    let finalCookware = importedCookware;

    if (mode === "replace") {
      if (finalInventory.length > pantryMax) {
        truncationWarnings.push(`Inventory truncated from ${finalInventory.length} to ${pantryMax} items (plan limit)`);
        finalInventory = finalInventory.slice(0, pantryMax);
      }
      if (finalCookware.length > cookwareMax) {
        truncationWarnings.push(`Cookware truncated from ${finalCookware.length} to ${cookwareMax} items (plan limit)`);
        finalCookware = finalCookware.slice(0, cookwareMax);
      }

      await db.transaction(async (tx) => {
        await Promise.all([
          tx.delete(userInventoryItems).where(eq(userInventoryItems.userId, userId)),
          tx.delete(userSavedRecipes).where(eq(userSavedRecipes.userId, userId)),
          tx.delete(userMealPlans).where(eq(userMealPlans.userId, userId)),
          tx.delete(userShoppingItems).where(eq(userShoppingItems.userId, userId)),
          tx.delete(userCookwareItems).where(eq(userCookwareItems.userId, userId)),
        ]);

        const insertPromises: Promise<unknown>[] = [];

        if (finalInventory.length > 0) {
          insertPromises.push(tx.insert(userInventoryItems).values(
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
          insertPromises.push(tx.insert(userSavedRecipes).values(
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
          insertPromises.push(tx.insert(userMealPlans).values(
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
          insertPromises.push(tx.insert(userShoppingItems).values(
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
          insertPromises.push(tx.insert(userCookwareItems).values(
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
      });
    } else {
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

    const existingSyncData = await db.select().from(userSyncData).where(eq(userSyncData.userId, userId));
    const existing = existingSyncData.length > 0 ? existingSyncData[0] : null;

    if (mode === "replace") {
      await db.delete(userWasteLogs).where(eq(userWasteLogs.userId, userId));
      await db.delete(userConsumedLogs).where(eq(userConsumedLogs.userId, userId));
      await db.delete(userCustomLocations).where(eq(userCustomLocations.userId, userId));
    }

    const importedWasteLog = Array.isArray(importData.wasteLog) ? importData.wasteLog : [];
    for (const entry of importedWasteLog) {
      const rec = entry as Record<string, unknown>;
      const wasteLogKnownKeys = new Set(["id", "itemName", "quantity", "unit", "reason", "date"]);
      await db.insert(userWasteLogs).values({
        userId,
        entryId: typeof rec.id === "string" && rec.id ? rec.id : require("crypto").randomBytes(12).toString("hex"),
        itemName: String(rec.itemName || ""),
        quantity: typeof rec.quantity === "number" ? rec.quantity : null,
        unit: typeof rec.unit === "string" ? rec.unit : null,
        reason: typeof rec.reason === "string" ? rec.reason : null,
        date: typeof rec.date === "string" ? rec.date : null,
        extraData: extractExtraData(rec, wasteLogKnownKeys),
      }).onConflictDoUpdate({
        target: [userWasteLogs.userId, userWasteLogs.entryId],
        set: {
          itemName: String(rec.itemName || ""),
          quantity: typeof rec.quantity === "number" ? rec.quantity : null,
          unit: typeof rec.unit === "string" ? rec.unit : null,
          reason: typeof rec.reason === "string" ? rec.reason : null,
          date: typeof rec.date === "string" ? rec.date : null,
          extraData: extractExtraData(rec, wasteLogKnownKeys),
        },
      });
    }

    const importedConsumedLog = Array.isArray(importData.consumedLog) ? importData.consumedLog : [];
    for (const entry of importedConsumedLog) {
      const rec = entry as Record<string, unknown>;
      const consumedLogKnownKeys = new Set(["id", "itemName", "quantity", "unit", "date"]);
      await db.insert(userConsumedLogs).values({
        userId,
        entryId: typeof rec.id === "string" && rec.id ? rec.id : require("crypto").randomBytes(12).toString("hex"),
        itemName: String(rec.itemName || ""),
        quantity: typeof rec.quantity === "number" ? rec.quantity : null,
        unit: typeof rec.unit === "string" ? rec.unit : null,
        date: typeof rec.date === "string" ? rec.date : null,
        extraData: extractExtraData(rec, consumedLogKnownKeys),
      }).onConflictDoUpdate({
        target: [userConsumedLogs.userId, userConsumedLogs.entryId],
        set: {
          itemName: String(rec.itemName || ""),
          quantity: typeof rec.quantity === "number" ? rec.quantity : null,
          unit: typeof rec.unit === "string" ? rec.unit : null,
          date: typeof rec.date === "string" ? rec.date : null,
          extraData: extractExtraData(rec, consumedLogKnownKeys),
        },
      });
    }

    const importedCustomLocations = Array.isArray(importData.customLocations) ? importData.customLocations : [];
    for (const loc of importedCustomLocations) {
      const rec = loc as Record<string, unknown>;
      const locationKnownKeys = new Set(["id", "name", "type"]);
      await db.insert(userCustomLocations).values({
        userId,
        locationId: String(rec.id || require("crypto").randomBytes(12).toString("hex")),
        name: String(rec.name || ""),
        type: typeof rec.type === "string" ? rec.type : null,
        extraData: extractExtraData(rec, locationKnownKeys),
      }).onConflictDoUpdate({
        target: [userCustomLocations.userId, userCustomLocations.locationId],
        set: {
          name: String(rec.name || ""),
          type: typeof rec.type === "string" ? rec.type : null,
          extraData: extractExtraData(rec, locationKnownKeys),
          updatedAt: new Date(),
        },
      });
    }

    const kvSections = ["preferences", "analytics", "onboarding", "userProfile"] as const;
    for (const section of kvSections) {
      const importValue = importData[section];
      if (importValue !== undefined && importValue !== null) {
        if (mode === "merge") {
          const [existingKV] = await db.select().from(userSyncKV).where(and(eq(userSyncKV.userId, userId), eq(userSyncKV.section, section)));
          const mergedData = existingKV && typeof existingKV.data === "object" && typeof importValue === "object"
            ? deepMerge(existingKV.data as Record<string, unknown>, importValue as Record<string, unknown>)
            : importValue;
          await db.insert(userSyncKV).values({ userId, section, data: mergedData }).onConflictDoUpdate({ target: [userSyncKV.userId, userSyncKV.section], set: { data: mergedData, updatedAt: new Date() } });
        } else {
          await db.insert(userSyncKV).values({ userId, section, data: importValue }).onConflictDoUpdate({ target: [userSyncKV.userId, userSyncKV.section], set: { data: importValue, updatedAt: new Date() } });
        }
      }
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

    const [
      [{ value: finalInventoryCount }],
      [{ value: finalRecipesCount }],
      [{ value: finalMealPlansCount }],
      [{ value: finalShoppingListCount }],
      [{ value: finalCookwareCount }],
      [{ value: finalWasteLogCount }],
      [{ value: finalConsumedLogCount }],
      [{ value: finalCustomLocationsCount }],
    ] = await Promise.all([
      db.select({ value: count() }).from(userInventoryItems).where(eq(userInventoryItems.userId, userId)),
      db.select({ value: count() }).from(userSavedRecipes).where(eq(userSavedRecipes.userId, userId)),
      db.select({ value: count() }).from(userMealPlans).where(eq(userMealPlans.userId, userId)),
      db.select({ value: count() }).from(userShoppingItems).where(eq(userShoppingItems.userId, userId)),
      db.select({ value: count() }).from(userCookwareItems).where(eq(userCookwareItems.userId, userId)),
      db.select({ value: count() }).from(userWasteLogs).where(eq(userWasteLogs.userId, userId)),
      db.select({ value: count() }).from(userConsumedLogs).where(eq(userConsumedLogs.userId, userId)),
      db.select({ value: count() }).from(userCustomLocations).where(eq(userCustomLocations.userId, userId)),
    ]);

    const finalKVRows = await db.select().from(userSyncKV).where(eq(userSyncKV.userId, userId));
    const finalKVMap: Record<string, boolean> = {};
    for (const kv of finalKVRows) {
      finalKVMap[kv.section] = kv.data !== null;
    }

    const responseData: Record<string, unknown> = {
      mode,
      importedAt: nowIso,
      summary: {
        inventory: finalInventoryCount,
        recipes: finalRecipesCount,
        mealPlans: finalMealPlansCount,
        shoppingList: finalShoppingListCount,
        cookware: finalCookwareCount,
        wasteLog: finalWasteLogCount,
        consumedLog: finalConsumedLogCount,
        preferences: finalKVMap["preferences"] || false,
        analytics: finalKVMap["analytics"] || false,
        onboarding: finalKVMap["onboarding"] || false,
        customLocations: finalCustomLocationsCount > 0,
        userProfile: finalKVMap["userProfile"] || false,
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
