import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { eq, and, count, isNull } from "drizzle-orm";
import { db } from "../db";
import {
  userSyncData, userInventoryItems, userSavedRecipes, userMealPlans, userShoppingItems, userCookwareItems,
} from "../../shared/schema";
import { checkPantryItemLimit, checkCookwareLimit } from "../services/subscriptionService";
import { AppError } from "../middleware/errorHandler";
import { successResponse } from "../lib/apiResponse";
import {
  getAuthToken, getSessionFromToken, updateSectionTimestamp,
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
