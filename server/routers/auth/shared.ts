import { z } from "zod";
import { db } from "../../db";
import { subscriptions, users, userInventoryItems, userSavedRecipes, userMealPlans, userShoppingItems, userWasteLogs, userConsumedLogs, userStorageLocations, userSyncKV } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";

export const syncPreferencesSchema = z.object({
  servingSize: z.coerce.number().int().min(1).max(10).optional(),
  dailyMeals: z.coerce.number().int().min(1).max(10).optional(),
  dietaryRestrictions: z.array(z.string().max(100)).max(50).optional(),
  cuisinePreferences: z.array(z.string().max(100)).max(50).optional(),
  storageAreas: z.array(z.string().max(50)).max(20).optional(),
  cookingLevel: z.enum(["basic", "intermediate", "professional"]).optional(),
  expirationAlertDays: z.coerce.number().int().min(1).max(30).optional(),
});

export function maskIpAddress(ip: string | null | undefined): string {
  if (!ip) return "Unknown";
  if (ip.includes(":")) {
    const parts = ip.split(":");
    if (parts.length >= 4) {
      return parts.slice(0, 4).join(":") + ":****:****:****:****";
    }
    return ip;
  }
  const parts = ip.split(".");
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return ip;
}

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | 'none';
export type PlanType = 'monthly' | 'annual' | null;

export interface SubscriptionInfo {
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlanType: PlanType;
  subscriptionEndsAt: string | null;
}

export async function evaluateAndUpdateSubscriptionStatus(subscription: typeof subscriptions.$inferSelect): Promise<SubscriptionStatus> {
  const now = new Date();
  
  if (subscription.status === 'active' && subscription.currentPeriodEnd && !subscription.stripeSubscriptionId) {
    if (new Date(subscription.currentPeriodEnd) < now) {
      await db.transaction(async (tx) => {
        await tx.update(subscriptions)
          .set({ status: 'expired', updatedAt: now })
          .where(eq(subscriptions.userId, subscription.userId));
        await tx.update(users)
          .set({ subscriptionStatus: 'expired' })
          .where(eq(users.id, subscription.userId));
      });
      return 'expired';
    }
  }
  
  if (subscription.status === 'trialing') {
    const trialExpiry = subscription.trialEnd || subscription.currentPeriodEnd;
    if (trialExpiry && new Date(trialExpiry) < now) {
      await db.transaction(async (tx) => {
        await tx.update(subscriptions)
          .set({ status: 'expired', updatedAt: now })
          .where(eq(subscriptions.userId, subscription.userId));
        await tx.update(users)
          .set({ subscriptionStatus: 'expired' })
          .where(eq(users.id, subscription.userId));
      });
      return 'expired';
    }
  }
  
  return subscription.status as SubscriptionStatus;
}

export async function getSubscriptionInfo(userId: string): Promise<SubscriptionInfo> {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (!subscription) {
    return {
      subscriptionStatus: 'none',
      subscriptionPlanType: null,
      subscriptionEndsAt: null,
    };
  }

  const currentStatus = await evaluateAndUpdateSubscriptionStatus(subscription);

  return {
    subscriptionStatus: currentStatus,
    subscriptionPlanType: subscription.planType as PlanType,
    subscriptionEndsAt: subscription.currentPeriodEnd?.toISOString() || null,
  };
}

export async function queryNormalizedInventory(userId: string) {
  const rows = await db.select().from(userInventoryItems).where(and(eq(userInventoryItems.userId, userId), isNull(userInventoryItems.deletedAt)));
  return rows.map(row => ({ id: row.itemId, name: row.name, barcode: row.barcode, quantity: row.quantity, unit: row.unit, storageLocation: row.storageLocation, purchaseDate: row.purchaseDate, expirationDate: row.expirationDate, category: row.category, usdaCategory: row.usdaCategory, nutrition: row.nutrition, notes: row.notes, imageUri: row.imageUri, fdcId: row.fdcId, servingSize: row.servingSize }));
}

export async function queryNormalizedRecipes(userId: string) {
  const rows = await db.select().from(userSavedRecipes).where(eq(userSavedRecipes.userId, userId));
  return rows.map(row => ({ id: row.itemId, title: row.title, description: row.description, ingredients: row.ingredients, instructions: row.instructions, prepTime: row.prepTime, cookTime: row.cookTime, servings: row.servings, imageUri: row.imageUri, cloudImageUri: row.cloudImageUri, nutrition: row.nutrition, isFavorite: row.isFavorite, ...((row.extraData as Record<string, unknown>) || {}) }));
}

export async function queryNormalizedMealPlans(userId: string) {
  const rows = await db.select().from(userMealPlans).where(eq(userMealPlans.userId, userId));
  return rows.map(row => ({ id: row.itemId, date: row.date, meals: row.meals, ...((row.extraData as Record<string, unknown>) || {}) }));
}

export async function queryNormalizedShoppingList(userId: string) {
  const rows = await db.select().from(userShoppingItems).where(eq(userShoppingItems.userId, userId));
  return rows.map(row => ({ id: row.itemId, name: row.name, quantity: row.quantity, unit: row.unit, isChecked: row.isChecked, category: row.category, recipeId: row.recipeId, ...((row.extraData as Record<string, unknown>) || {}) }));
}

export async function queryNormalizedWasteLog(userId: string) {
  const rows = await db.select().from(userWasteLogs).where(eq(userWasteLogs.userId, userId));
  return rows.map(row => ({ id: row.entryId, itemName: row.itemName, quantity: row.quantity, unit: row.unit, reason: row.reason, date: row.date, ...((row.extraData as Record<string, unknown>) || {}) }));
}

export async function queryNormalizedConsumedLog(userId: string) {
  const rows = await db.select().from(userConsumedLogs).where(eq(userConsumedLogs.userId, userId));
  return rows.map(row => ({ id: row.entryId, itemName: row.itemName, quantity: row.quantity, unit: row.unit, date: row.date, ...((row.extraData as Record<string, unknown>) || {}) }));
}

export async function queryNormalizedCustomLocations(userId: string) {
  const rows = await db.select().from(userStorageLocations).where(eq(userStorageLocations.userId, userId));
  return rows.map(row => ({ id: row.locationId, name: row.name, type: row.type, ...((row.extraData as Record<string, unknown>) || {}) }));
}

export async function queryNormalizedSyncKV(userId: string, section: string) {
  const [row] = await db.select().from(userSyncKV).where(and(eq(userSyncKV.userId, userId), eq(userSyncKV.section, section))).limit(1);
  return row?.data ?? null;
}
