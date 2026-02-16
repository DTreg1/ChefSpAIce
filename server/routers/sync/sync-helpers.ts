import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db";
import {
  userSessions, userSyncData,
  insertUserInventoryItemSchema, insertUserSavedRecipeSchema,
  insertUserMealPlanSchema, insertUserShoppingItemSchema,
  insertUserCookwareItemSchema,
  syncNutritionSchema, syncIngredientSchema, syncMealSchema,
} from "@shared/schema";
import { Request } from "express";
import { hashToken } from "../../lib/auth-utils";

export interface SyncFailureRecord {
  dataType: string;
  operation: string;
  errorMessage: string;
  timestamp: Date;
}

export const syncFailures = new Map<string, SyncFailureRecord[]>();

export function recordSyncFailure(userId: string, dataType: string, operation: string, errorMessage: string) {
  if (!syncFailures.has(userId)) {
    syncFailures.set(userId, []);
  }
  const records = syncFailures.get(userId)!;
  records.push({ dataType, operation, errorMessage, timestamp: new Date() });
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const filtered = records.filter(r => r.timestamp > oneDayAgo);
  syncFailures.set(userId, filtered);
}

export const syncOperationSchema = z.enum(["create", "update", "delete"]);

export const inventoryItemSchema = insertUserInventoryItemSchema
  .omit({ userId: true, itemId: true })
  .extend({
    id: z.union([z.string(), z.number()]),
    nutrition: syncNutritionSchema,
    updatedAt: z.string().optional(),
    deletedAt: z.string().optional().nullable(),
  });

export const recipeSchema = insertUserSavedRecipeSchema
  .omit({ userId: true, itemId: true, extraData: true })
  .extend({
    id: z.union([z.string(), z.number()]),
    ingredients: z.array(syncIngredientSchema),
    instructions: z.array(z.string()),
    nutrition: z.object({
      calories: z.number(),
      protein: z.number(),
      carbs: z.number(),
      fat: z.number(),
    }).optional().nullable(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const mealPlanSchema = insertUserMealPlanSchema
  .omit({ userId: true, itemId: true, extraData: true })
  .extend({
    id: z.union([z.string(), z.number()]),
    meals: z.array(syncMealSchema).optional().nullable(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const cookwareSchema = insertUserCookwareItemSchema
  .omit({ userId: true, itemId: true, extraData: true })
  .extend({
    id: z.union([z.number(), z.string()]),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const shoppingListItemSchema = insertUserShoppingItemSchema
  .omit({ userId: true, itemId: true, extraData: true })
  .extend({
    id: z.union([z.string(), z.number()]),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const inventorySyncRequestSchema = z.object({
  operation: syncOperationSchema,
  data: inventoryItemSchema,
  clientTimestamp: z.string().optional(),
});

export const recipeSyncRequestSchema = z.object({
  operation: syncOperationSchema,
  data: recipeSchema,
  clientTimestamp: z.string().optional(),
});

export const mealPlanSyncRequestSchema = z.object({
  operation: syncOperationSchema,
  data: mealPlanSchema,
  clientTimestamp: z.string().optional(),
});

export const cookwareSyncRequestSchema = z.object({
  operation: syncOperationSchema,
  data: cookwareSchema,
  clientTimestamp: z.string().optional(),
});

export const shoppingListSyncRequestSchema = z.object({
  operation: syncOperationSchema,
  data: shoppingListItemSchema,
  clientTimestamp: z.string().optional(),
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type Recipe = z.infer<typeof recipeSchema>;
export type MealPlan = z.infer<typeof mealPlanSchema>;
export type Cookware = z.infer<typeof cookwareSchema>;
export type ShoppingListItem = z.infer<typeof shoppingListItemSchema>;

export async function getSessionFromToken(token: string) {
  if (!token) return null;
  
  const hashedToken = hashToken(token);
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

export function getAuthToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

export async function updateSectionTimestamp(userId: string, section: string) {
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

export const recipeKnownKeys = new Set(["id", "title", "description", "ingredients", "instructions", "prepTime", "cookTime", "servings", "imageUri", "cloudImageUri", "imageData", "thumbnailData", "nutrition", "isFavorite", "updatedAt"]);
export const mealPlanKnownKeys = new Set(["id", "date", "meals", "updatedAt"]);
export const shoppingListKnownKeys = new Set(["id", "name", "quantity", "unit", "isChecked", "category", "recipeId", "updatedAt"]);
export const cookwareKnownKeys = new Set(["id", "name", "category", "alternatives", "updatedAt"]);

export function extractExtraData(data: Record<string, unknown>, knownKeys: Set<string>): Record<string, unknown> | null {
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

export function encodeCursor(updatedAt: Date, id: number): string {
  return Buffer.from(JSON.stringify({ updatedAt: updatedAt.toISOString(), id })).toString("base64url");
}

export function decodeCursor(cursor: string): { updatedAt: Date; id: number } | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
    if (!parsed.updatedAt || typeof parsed.id !== "number") return null;
    const date = new Date(parsed.updatedAt);
    if (isNaN(date.getTime())) return null;
    return { updatedAt: date, id: parsed.id };
  } catch {
    return null;
  }
}

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
