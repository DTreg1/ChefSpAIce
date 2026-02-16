import { Router, Request, Response, NextFunction } from "express";
import { db } from "../../db";
import { users, userSessions, userSyncData, userInventoryItems, userSavedRecipes, userMealPlans, userShoppingItems, userCookwareItems, userWasteLogs, userConsumedLogs, userStorageLocations, userSyncKV, syncInventoryItemSchema, syncRecipeSchema, syncMealPlanSchema, syncShoppingItemSchema, syncCookwareItemSchema, syncWasteLogEntrySchema, syncConsumedLogEntrySchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { extractExtraData, recipeKnownKeys, mealPlanKnownKeys, shoppingListKnownKeys, cookwareKnownKeys } from "../sync/sync-helpers";
import { randomBytes } from "crypto";
import { AUTH_COOKIE_NAME } from "../../lib/session-utils";
import { checkCookwareLimit, checkFeatureAccess } from "../../services/subscriptionService";
import { csrfProtection } from "../../middleware/csrf";
import { requireAuth } from "../../middleware/auth";
import { logger } from "../../lib/logger";
import { AppError } from "../../middleware/errorHandler";
import { successResponse } from "../../lib/apiResponse";
import { hashToken } from "../../lib/auth-utils";
import { deleteAccount } from "../../domain/services";
import { validateBody } from "../../middleware/validateBody";
import { syncPreferencesSchema, queryNormalizedInventory, queryNormalizedRecipes, queryNormalizedMealPlans, queryNormalizedShoppingList, queryNormalizedWasteLog, queryNormalizedConsumedLog, queryNormalizedCustomLocations, queryNormalizedSyncKV } from "../auth/shared";

const syncCustomLocationSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string(),
  type: z.string().optional().nullable(),
}).passthrough();

function validateSyncArray<T>(data: unknown, schema: z.ZodType<T>, sectionName: string): T[] {
  if (!Array.isArray(data) || data.length === 0) return [];
  const parseResult = z.array(schema).safeParse(data);
  if (!parseResult.success) {
    const errors = parseResult.error.errors.slice(0, 10).map(e => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    throw AppError.badRequest(`Invalid ${sectionName} data`, "SYNC_VALIDATION_FAILED").withDetails({ section: sectionName, errors });
  }
  return parseResult.data;
}

const router = Router();

router.get("/sync", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const [syncData] = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, userId))
      .limit(1);

    const userCookwareRows = await db
      .select()
      .from(userCookwareItems)
      .where(eq(userCookwareItems.userId, userId));
    
    const cookwareList = userCookwareRows.map(row => ({
      id: row.itemId,
      name: row.name,
      category: row.category,
      alternatives: row.alternatives,
      ...((row.extraData as Record<string, unknown>) || {}),
    }));
    const serverTimestamp = new Date().toISOString();
    
    const clientLastSyncedAt = req.query.lastSyncedAt as string | undefined;

    if (!syncData) {
      return res.json(successResponse({ 
        data: { inventory: [], recipes: [], mealPlans: [], shoppingList: [], cookware: cookwareList }, 
        lastSyncedAt: null,
        serverTimestamp,
      }));
    }

    if (clientLastSyncedAt) {
      const clientTime = new Date(clientLastSyncedAt);
      if (isNaN(clientTime.getTime())) {
        logger.warn("Invalid lastSyncedAt value, falling through to full sync", { lastSyncedAt: clientLastSyncedAt, userId });
      } else {
      const rowUpdatedAt = syncData.updatedAt ? new Date(syncData.updatedAt) : null;
      
      if (rowUpdatedAt && rowUpdatedAt <= clientTime) {
        return res.json(successResponse({
          data: null,
          unchanged: true,
          serverTimestamp,
          lastSyncedAt: syncData.lastSyncedAt?.toISOString() || null,
        }));
      }
      
      const sectionTimestamps = (syncData.sectionUpdatedAt as Record<string, string>) || {};
      const deltaData: Record<string, unknown> = {};
      
      const normalizedSections = ["inventory", "recipes", "mealPlans", "shoppingList"] as const;
      const kvSections = ["preferences", "analytics", "onboarding", "userProfile"] as const;
      
      for (const section of normalizedSections) {
        const sectionTime = sectionTimestamps[section];
        if (sectionTime && new Date(sectionTime) > clientTime) {
          if (section === "inventory") deltaData.inventory = await queryNormalizedInventory(userId);
          else if (section === "recipes") deltaData.recipes = await queryNormalizedRecipes(userId);
          else if (section === "mealPlans") deltaData.mealPlans = await queryNormalizedMealPlans(userId);
          else if (section === "shoppingList") deltaData.shoppingList = await queryNormalizedShoppingList(userId);
        }
      }
      
      if (sectionTimestamps.wasteLog && new Date(sectionTimestamps.wasteLog) > clientTime) {
        deltaData.wasteLog = await queryNormalizedWasteLog(userId);
      }
      if (sectionTimestamps.consumedLog && new Date(sectionTimestamps.consumedLog) > clientTime) {
        deltaData.consumedLog = await queryNormalizedConsumedLog(userId);
      }
      if (sectionTimestamps.customLocations && new Date(sectionTimestamps.customLocations) > clientTime) {
        deltaData.customLocations = await queryNormalizedCustomLocations(userId);
      }
      for (const section of kvSections) {
        const sectionTime = sectionTimestamps[section];
        if (sectionTime && new Date(sectionTime) > clientTime) {
          deltaData[section] = await queryNormalizedSyncKV(userId, section);
        }
      }
      
      deltaData.cookware = cookwareList;
      
      return res.json(successResponse({
        data: deltaData,
        delta: true,
        serverTimestamp,
        lastSyncedAt: syncData.lastSyncedAt?.toISOString() || null,
      }));
      }
    }

    const [inventory, recipes, mealPlansData, shoppingList, wasteLog, consumedLog, customLocationsList, preferences, analytics, onboarding, userProfile] = await Promise.all([
      queryNormalizedInventory(userId),
      queryNormalizedRecipes(userId),
      queryNormalizedMealPlans(userId),
      queryNormalizedShoppingList(userId),
      queryNormalizedWasteLog(userId),
      queryNormalizedConsumedLog(userId),
      queryNormalizedCustomLocations(userId),
      queryNormalizedSyncKV(userId, "preferences"),
      queryNormalizedSyncKV(userId, "analytics"),
      queryNormalizedSyncKV(userId, "onboarding"),
      queryNormalizedSyncKV(userId, "userProfile"),
    ]);

    res.json(successResponse({
      data: {
        inventory,
        recipes,
        mealPlans: mealPlansData,
        shoppingList,
        preferences,
        cookware: cookwareList,
        wasteLog,
        consumedLog,
        analytics,
        onboarding,
        customLocations: customLocationsList,
        userProfile,
      },
      lastSyncedAt: syncData.lastSyncedAt?.toISOString() || null,
      serverTimestamp,
    }));
  } catch (error) {
    next(error);
  }
});

const accountSyncSchema = z.object({
  data: z.object({}).passthrough(),
});

router.post("/sync", requireAuth, validateBody(accountSyncSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { data } = req.body;

    if (data.cookware && Array.isArray(data.cookware)) {
      const limitCheck = await checkCookwareLimit(userId);
      const maxLimit = typeof limitCheck.limit === 'number' ? limitCheck.limit : Infinity;
      const incomingCount = data.cookware.length;
      
      if (incomingCount > maxLimit) {
        throw AppError.forbidden("Cookware limit reached. Upgrade your subscription for unlimited cookware.", "COOKWARE_LIMIT_REACHED").withDetails({
          code: "COOKWARE_LIMIT_REACHED",
          limit: limitCheck.limit,
          count: incomingCount,
        });
      }
    }

    if (data.customLocations && Array.isArray(data.customLocations) && data.customLocations.length > 0) {
      const hasAccess = await checkFeatureAccess(userId, "customStorageAreas");
      if (!hasAccess) {
        throw AppError.forbidden("Custom storage areas require an active subscription. Upgrade to create custom storage locations.", "FEATURE_NOT_AVAILABLE").withDetails({
          code: "FEATURE_NOT_AVAILABLE",
          feature: "customStorageAreas",
        });
      }
    }

    let prefsSynced = true;
    let prefsError: string | null = null;
    let validatedPreferences: unknown = undefined;

    if (data.preferences) {
      const parseResult = syncPreferencesSchema.safeParse(data.preferences);
      if (parseResult.success) {
        const prefs = parseResult.data;
        validatedPreferences = prefs;
        const userUpdate: Record<string, unknown> = { updatedAt: new Date() };
        
        if (prefs.servingSize !== undefined) {
          userUpdate.householdSize = prefs.servingSize;
        }
        if (prefs.dailyMeals !== undefined) {
          userUpdate.dailyMeals = prefs.dailyMeals;
        }
        if (prefs.dietaryRestrictions !== undefined) {
          userUpdate.dietaryRestrictions = prefs.dietaryRestrictions;
        }
        if (prefs.cuisinePreferences !== undefined) {
          userUpdate.favoriteCategories = prefs.cuisinePreferences;
        }
        if (prefs.storageAreas !== undefined) {
          userUpdate.storageAreasEnabled = prefs.storageAreas;
        }
        if (prefs.cookingLevel !== undefined) {
          const levelMap: Record<string, string> = {
            basic: "beginner",
            intermediate: "intermediate", 
            professional: "advanced"
          };
          userUpdate.cookingSkillLevel = levelMap[prefs.cookingLevel] || "beginner";
        }
        if (prefs.expirationAlertDays !== undefined) {
          userUpdate.expirationAlertDays = prefs.expirationAlertDays;
        }
        
        if (Object.keys(userUpdate).length > 1) {
          await db
            .update(users)
            .set(userUpdate)
            .where(eq(users.id, userId));
        }
      } else {
        prefsSynced = false;
        prefsError = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        logger.warn("Invalid sync preferences", { userId, prefsError });
      }
    }

    const [existingSyncForTimestamps] = await db
      .select({ sectionUpdatedAt: userSyncData.sectionUpdatedAt })
      .from(userSyncData)
      .where(eq(userSyncData.userId, userId))
      .limit(1);
    
    const currentSectionTimestamps = (existingSyncForTimestamps?.sectionUpdatedAt as Record<string, string>) || {};
    const updatedSectionTimestamps = { ...currentSectionTimestamps };
    const now = new Date().toISOString();

    const syncUpdate: Record<string, unknown> = {
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };

    if (data.inventory !== undefined) {
      const validatedInventory = validateSyncArray(data.inventory, syncInventoryItemSchema, "inventory");
      await db.transaction(async (tx) => {
        await tx.delete(userInventoryItems).where(eq(userInventoryItems.userId, userId));
        if (validatedInventory.length > 0) {
          await tx.insert(userInventoryItems).values(validatedInventory.map((item) => ({
            userId,
            itemId: String(item.id),
            name: item.name,
            barcode: item.barcode,
            quantity: item.quantity,
            unit: item.unit,
            storageLocation: item.storageLocation,
            purchaseDate: item.purchaseDate,
            expirationDate: item.expirationDate,
            category: item.category,
            usdaCategory: item.usdaCategory,
            nutrition: item.nutrition ?? null,
            notes: item.notes,
            imageUri: item.imageUri,
            fdcId: item.fdcId,
            servingSize: item.servingSize,
            deletedAt: item.deletedAt ? new Date(item.deletedAt) : null,
          })));
        }
      });
      updatedSectionTimestamps.inventory = now;
    }
    if (data.recipes !== undefined) {
      const validatedRecipes = validateSyncArray(data.recipes, syncRecipeSchema, "recipes");
      await db.transaction(async (tx) => {
        await tx.delete(userSavedRecipes).where(eq(userSavedRecipes.userId, userId));
        if (validatedRecipes.length > 0) {
          await tx.insert(userSavedRecipes).values(validatedRecipes.map((item) => ({
            userId,
            itemId: String(item.id),
            title: item.title,
            description: item.description,
            ingredients: item.ingredients ?? null,
            instructions: item.instructions ?? null,
            prepTime: item.prepTime,
            cookTime: item.cookTime,
            servings: item.servings,
            imageUri: item.imageUri,
            cloudImageUri: item.cloudImageUri,
            nutrition: item.nutrition ?? null,
            isFavorite: item.isFavorite ?? false,
            extraData: extractExtraData(item as Record<string, unknown>, recipeKnownKeys),
          })));
        }
      });
      updatedSectionTimestamps.recipes = now;
    }
    if (data.mealPlans !== undefined) {
      const validatedMealPlans = validateSyncArray(data.mealPlans, syncMealPlanSchema, "mealPlans");
      await db.transaction(async (tx) => {
        await tx.delete(userMealPlans).where(eq(userMealPlans.userId, userId));
        if (validatedMealPlans.length > 0) {
          await tx.insert(userMealPlans).values(validatedMealPlans.map((item) => ({
            userId,
            itemId: String(item.id),
            date: item.date,
            meals: item.meals ?? null,
            extraData: extractExtraData(item as Record<string, unknown>, mealPlanKnownKeys),
          })));
        }
      });
      updatedSectionTimestamps.mealPlans = now;
    }
    if (data.shoppingList !== undefined) {
      const validatedShoppingList = validateSyncArray(data.shoppingList, syncShoppingItemSchema, "shoppingList");
      await db.transaction(async (tx) => {
        await tx.delete(userShoppingItems).where(eq(userShoppingItems.userId, userId));
        if (validatedShoppingList.length > 0) {
          await tx.insert(userShoppingItems).values(validatedShoppingList.map((item) => ({
            userId,
            itemId: String(item.id),
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            isChecked: item.isChecked,
            category: item.category,
            recipeId: item.recipeId,
            extraData: extractExtraData(item as Record<string, unknown>, shoppingListKnownKeys),
          })));
        }
      });
      updatedSectionTimestamps.shoppingList = now;
    }
    if (data.cookware !== undefined) {
      const validatedCookware = Array.isArray(data.cookware) ? validateSyncArray(data.cookware, syncCookwareItemSchema, "cookware") : [];
      await db.transaction(async (tx) => {
        await tx.delete(userCookwareItems).where(eq(userCookwareItems.userId, userId));
        if (validatedCookware.length > 0) {
          await tx.insert(userCookwareItems).values(validatedCookware.map((item) => ({
            userId,
            itemId: String(item.id),
            name: item.name ?? null,
            category: item.category ?? null,
            alternatives: item.alternatives ?? null,
            extraData: extractExtraData(item as Record<string, unknown>, cookwareKnownKeys),
          })));
        }
      });
      updatedSectionTimestamps.cookware = now;
    }
    if (data.wasteLog !== undefined) {
      const wasteLogKnownKeys = new Set(["id", "itemName", "quantity", "unit", "reason", "date"]);
      const validatedWasteLog = validateSyncArray(data.wasteLog, syncWasteLogEntrySchema, "wasteLog");
      await db.transaction(async (tx) => {
        await tx.delete(userWasteLogs).where(eq(userWasteLogs.userId, userId));
        if (validatedWasteLog.length > 0) {
          await tx.insert(userWasteLogs).values(validatedWasteLog.map((entry) => {
            const rawEntry = entry as Record<string, unknown>;
            return {
              userId,
              entryId: typeof rawEntry.id === "string" && rawEntry.id ? rawEntry.id as string : randomBytes(12).toString("hex"),
              itemName: entry.itemName,
              quantity: entry.quantity ?? null,
              unit: entry.unit ?? null,
              reason: entry.reason ?? null,
              date: entry.date ?? null,
              extraData: extractExtraData(rawEntry, wasteLogKnownKeys),
            };
          }));
        }
      });
      updatedSectionTimestamps.wasteLog = now;
    }
    if (data.consumedLog !== undefined) {
      const consumedLogKnownKeys = new Set(["id", "itemName", "quantity", "unit", "date"]);
      const validatedConsumedLog = validateSyncArray(data.consumedLog, syncConsumedLogEntrySchema, "consumedLog");
      await db.transaction(async (tx) => {
        await tx.delete(userConsumedLogs).where(eq(userConsumedLogs.userId, userId));
        if (validatedConsumedLog.length > 0) {
          await tx.insert(userConsumedLogs).values(validatedConsumedLog.map((entry) => {
            const rawEntry = entry as Record<string, unknown>;
            return {
              userId,
              entryId: typeof rawEntry.id === "string" && rawEntry.id ? rawEntry.id as string : randomBytes(12).toString("hex"),
              itemName: entry.itemName,
              quantity: entry.quantity ?? null,
              unit: entry.unit ?? null,
              date: entry.date ?? null,
              extraData: extractExtraData(rawEntry, consumedLogKnownKeys),
            };
          }));
        }
      });
      updatedSectionTimestamps.consumedLog = now;
    }
    if (data.analytics !== undefined) {
      await db.insert(userSyncKV).values({ userId, section: "analytics", data: data.analytics ?? null }).onConflictDoUpdate({ target: [userSyncKV.userId, userSyncKV.section], set: { data: data.analytics ?? null, updatedAt: new Date() } });
      updatedSectionTimestamps.analytics = now;
    }
    if (data.onboarding !== undefined) {
      await db.insert(userSyncKV).values({ userId, section: "onboarding", data: data.onboarding ?? null }).onConflictDoUpdate({ target: [userSyncKV.userId, userSyncKV.section], set: { data: data.onboarding ?? null, updatedAt: new Date() } });
      updatedSectionTimestamps.onboarding = now;
    }
    if (data.customLocations !== undefined) {
      const locationKnownKeys = new Set(["id", "name", "type"]);
      const validatedLocations = validateSyncArray(data.customLocations, syncCustomLocationSchema, "customLocations");
      await db.transaction(async (tx) => {
        await tx.delete(userStorageLocations).where(eq(userStorageLocations.userId, userId));
        if (validatedLocations.length > 0) {
          await tx.insert(userStorageLocations).values(validatedLocations.map((loc) => {
            const rawLoc = loc as Record<string, unknown>;
            return {
              userId,
              locationId: String(loc.id || randomBytes(12).toString("hex")),
              name: loc.name,
              type: loc.type ?? null,
              extraData: extractExtraData(rawLoc, locationKnownKeys),
            };
          }));
        }
      });
      updatedSectionTimestamps.customLocations = now;
    }
    if (data.userProfile !== undefined) {
      await db.insert(userSyncKV).values({ userId, section: "userProfile", data: data.userProfile ?? null }).onConflictDoUpdate({ target: [userSyncKV.userId, userSyncKV.section], set: { data: data.userProfile ?? null, updatedAt: new Date() } });
      updatedSectionTimestamps.userProfile = now;
    }
    if (validatedPreferences !== undefined) {
      await db.insert(userSyncKV).values({ userId, section: "preferences", data: validatedPreferences }).onConflictDoUpdate({ target: [userSyncKV.userId, userSyncKV.section], set: { data: validatedPreferences, updatedAt: new Date() } });
      updatedSectionTimestamps.preferences = now;
    }

    syncUpdate.sectionUpdatedAt = updatedSectionTimestamps;

    await db
      .insert(userSyncData)
      .values({ userId, ...syncUpdate })
      .onConflictDoUpdate({
        target: userSyncData.userId,
        set: syncUpdate,
      });

    if (data.onboarding && data.onboarding.completedAt) {
      await db
        .update(users)
        .set({ hasCompletedOnboarding: true, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    res.json(successResponse({ 
      syncedAt: new Date().toISOString(),
      prefsSynced,
      ...(prefsError && { prefsError })
    }));
  } catch (error) {
    next(error);
  }
});

router.delete("/delete-account", csrfProtection, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
    const rawToken = authHeader?.replace("Bearer ", "") || cookieToken;

    if (!rawToken) {
      throw AppError.unauthorized("Authentication required", "AUTH_REQUIRED");
    }

    const hashedToken = hashToken(rawToken);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, hashedToken))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }

    const userId = session.userId;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }

    if (user.email === "demo@chefspaice.com") {
      throw AppError.forbidden("Demo account cannot be deleted. This account is used for App Store review purposes.", "DEMO_PROTECTED");
    }

    await deleteAccount(userId, res);

    res.json(successResponse(null, "Account and all associated data have been permanently deleted"));

  } catch (error) {
    next(error);
  }
});

const deleteAccountSchema = z.object({
  email: z.string().min(1, "Email confirmation is required"),
});

router.delete("/account", requireAuth, validateBody(deleteAccountSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { email } = req.body;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }

    if (user.email.toLowerCase() !== email.toLowerCase()) {
      throw AppError.badRequest("Email does not match your account email. Please confirm with the correct email address.", "EMAIL_MISMATCH");
    }

    if (user.email === "demo@chefspaice.com") {
      throw AppError.forbidden("Demo account cannot be deleted. This account is used for App Store review purposes.", "DEMO_PROTECTED");
    }

    await deleteAccount(userId, res);

    res.json(successResponse(null, "Your account and all associated data have been permanently deleted."));

  } catch (error) {
    next(error);
  }
});

export default router;
