import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  date,
  index,
  boolean,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  password: varchar("password"),
  displayName: varchar("display_name"),
  email: varchar("email").notNull().unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  dietaryRestrictions: text("dietary_restrictions").array(),
  allergens: text("allergens").array(),
  favoriteCategories: text("favorite_categories").array(),
  expirationAlertDays: integer("expiration_alert_days").notNull().default(3),
  storageAreasEnabled: text("storage_areas_enabled").array(),
  householdSize: integer("household_size").notNull().default(2),
  cookingSkillLevel: text("cooking_skill_level").notNull().default("beginner"),
  preferredUnits: text("preferred_units").notNull().default("imperial"),
  foodsToAvoid: text("foods_to_avoid").array(),
  hasCompletedOnboarding: boolean("has_completed_onboarding").notNull().default(false),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(false),
  notifyExpiringFood: boolean("notify_expiring_food").notNull().default(true),
  notifyRecipeSuggestions: boolean("notify_recipe_suggestions").notNull().default(false),
  notifyMealReminders: boolean("notify_meal_reminders").notNull().default(true),
  notificationTime: text("notification_time").default("09:00"),
  isAdmin: boolean("is_admin").notNull().default(false),
  primaryProvider: varchar("primary_provider"),
  primaryProviderId: varchar("primary_provider_id"),
});

export const authProviders = pgTable(
  "auth_providers",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    provider: varchar("provider").notNull(),
    providerId: varchar("provider_id").notNull(),
    providerEmail: varchar("provider_email"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiry: timestamp("token_expiry"),
    isPrimary: boolean("is_primary").default(false),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_auth_providers_provider_user").on(
      table.provider,
      table.providerId,
    ),
    index("idx_auth_providers_user").on(table.userId),
  ],
);

export const userSessions = pgTable("user_sessions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSyncData = pgTable("user_sync_data", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  inventory: text("inventory"),
  recipes: text("recipes"),
  mealPlans: text("meal_plans"),
  shoppingList: text("shopping_list"),
  preferences: text("preferences"),
  cookware: text("cookware"),
  wasteLog: text("waste_log"),
  consumedLog: text("consumed_log"),
  analytics: text("analytics"),
  onboarding: text("onboarding"),
  customLocations: text("custom_locations"),
  userProfile: text("user_profile"),
  lastSyncedAt: timestamp("last_synced_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inventory = pgTable("inventory", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unit: text("unit"),
  category: text("category"),
  expiryDate: date("expiry_date"),
  storageLocation: text("storage_location").default("refrigerator"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cookingTerms = pgTable(
  "cooking_terms",
  {
    id: varchar("id").primaryKey(),
    term: text("term").notNull(),
    category: text("category").notNull(),
    shortDefinition: text("short_definition"),
    longDefinition: text("long_definition"),
    difficulty: text("difficulty").default("beginner"),
    timeEstimate: text("time_estimate"),
    tools: text("tools").array(),
    tips: text("tips").array(),
    relatedTerms: text("related_terms").array(),
    imageUrl: text("image_url"),
    videoUrl: text("video_url"),
    searchTerms: text("search_terms").array(),
    example: text("example"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_cooking_terms_term").on(table.term),
    index("idx_cooking_terms_category").on(table.category),
  ],
);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCookingTermSchema = createInsertSchema(cookingTerms).omit({
  createdAt: true,
  updatedAt: true,
});

export const appliances = pgTable(
  "appliances",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    category: varchar("category", { length: 50 }).notNull(),
    description: text("description"),
    icon: varchar("icon", { length: 50 }),
    imageUrl: varchar("image_url", { length: 255 }),
    isCommon: boolean("is_common").default(false),
    alternatives: text("alternatives").array(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_appliances_category").on(table.category),
    index("idx_appliances_is_common").on(table.isCommon),
  ],
);

export const userAppliances = pgTable(
  "user_appliances",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id),
    applianceId: integer("appliance_id")
      .notNull()
      .references(() => appliances.id),
    notes: text("notes"),
    brand: varchar("brand", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_user_appliances_unique").on(
      table.userId,
      table.applianceId,
    ),
  ],
);

export const insertApplianceSchema = createInsertSchema(appliances).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertUserApplianceSchema = createInsertSchema(
  userAppliances,
).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertSessionSchema = createInsertSchema(userSessions).omit({
  createdAt: true,
});

export const insertSyncDataSchema = createInsertSchema(userSyncData).omit({
  lastSyncedAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertSyncData = z.infer<typeof insertSyncDataSchema>;
export type UserSyncData = typeof userSyncData.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventory.$inferSelect;
export type InsertCookingTerm = z.infer<typeof insertCookingTermSchema>;
export type CookingTerm = typeof cookingTerms.$inferSelect;
export type InsertAppliance = z.infer<typeof insertApplianceSchema>;
export type Appliance = typeof appliances.$inferSelect;
export type InsertUserAppliance = z.infer<typeof insertUserApplianceSchema>;
export type UserAppliance = typeof userAppliances.$inferSelect;

export interface NutritionFacts {
  servingSize: string;
  servingsPerContainer?: number;
  calories: number;
  totalFat: number;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  sodium: number;
  totalCarbohydrates: number;
  dietaryFiber?: number;
  totalSugars?: number;
  addedSugars?: number;
  protein: number;
  vitaminD?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
}

export const DAILY_VALUES = {
  totalFat: 78,
  saturatedFat: 20,
  transFat: 0,
  cholesterol: 300,
  sodium: 2300,
  totalCarbohydrates: 275,
  dietaryFiber: 28,
  totalSugars: 0,
  addedSugars: 50,
  protein: 50,
  vitaminD: 20,
  calcium: 1300,
  iron: 18,
  potassium: 4700,
} as const;

export type DailyValueNutrient = keyof typeof DAILY_VALUES;

export function calculateDailyValuePercent(
  value: number | undefined,
  nutrient: DailyValueNutrient,
): number {
  if (value === undefined || value === 0) return 0;
  const dailyValue = DAILY_VALUES[nutrient];
  if (dailyValue === 0) return 0;
  return Math.round((value / dailyValue) * 100);
}

export function scaleNutrition(
  nutrition: NutritionFacts,
  multiplier: number,
): NutritionFacts {
  return {
    servingSize: nutrition.servingSize,
    servingsPerContainer: nutrition.servingsPerContainer,
    calories: Math.round(nutrition.calories * multiplier),
    totalFat: Math.round(nutrition.totalFat * multiplier * 10) / 10,
    saturatedFat:
      nutrition.saturatedFat !== undefined
        ? Math.round(nutrition.saturatedFat * multiplier * 10) / 10
        : undefined,
    transFat:
      nutrition.transFat !== undefined
        ? Math.round(nutrition.transFat * multiplier * 10) / 10
        : undefined,
    cholesterol:
      nutrition.cholesterol !== undefined
        ? Math.round(nutrition.cholesterol * multiplier)
        : undefined,
    sodium: Math.round(nutrition.sodium * multiplier),
    totalCarbohydrates:
      Math.round(nutrition.totalCarbohydrates * multiplier * 10) / 10,
    dietaryFiber:
      nutrition.dietaryFiber !== undefined
        ? Math.round(nutrition.dietaryFiber * multiplier * 10) / 10
        : undefined,
    totalSugars:
      nutrition.totalSugars !== undefined
        ? Math.round(nutrition.totalSugars * multiplier * 10) / 10
        : undefined,
    addedSugars:
      nutrition.addedSugars !== undefined
        ? Math.round(nutrition.addedSugars * multiplier * 10) / 10
        : undefined,
    protein: Math.round(nutrition.protein * multiplier * 10) / 10,
    vitaminD:
      nutrition.vitaminD !== undefined
        ? Math.round(nutrition.vitaminD * multiplier * 10) / 10
        : undefined,
    calcium:
      nutrition.calcium !== undefined
        ? Math.round(nutrition.calcium * multiplier)
        : undefined,
    iron:
      nutrition.iron !== undefined
        ? Math.round(nutrition.iron * multiplier * 10) / 10
        : undefined,
    potassium:
      nutrition.potassium !== undefined
        ? Math.round(nutrition.potassium * multiplier)
        : undefined,
  };
}

export const nutritionCorrections = pgTable(
  "nutrition_corrections",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id").references(() => users.id),
    productName: text("product_name").notNull(),
    barcode: varchar("barcode", { length: 50 }),
    brand: varchar("brand", { length: 200 }),
    originalSource: varchar("original_source", { length: 50 }),
    originalSourceId: varchar("original_source_id", { length: 100 }),
    originalNutrition: text("original_nutrition"),
    correctedNutrition: text("corrected_nutrition"),
    imageUrl: text("image_url"),
    notes: text("notes"),
    status: varchar("status", { length: 20 }).default("pending").notNull(),
    reviewNotes: text("review_notes"),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_nutrition_corrections_status").on(table.status),
    index("idx_nutrition_corrections_barcode").on(table.barcode),
    index("idx_nutrition_corrections_created").on(table.createdAt),
  ],
);

export const insertNutritionCorrectionSchema = createInsertSchema(
  nutritionCorrections,
).omit({
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
});

export type InsertNutritionCorrection = z.infer<
  typeof insertNutritionCorrectionSchema
>;
export type NutritionCorrection = typeof nutritionCorrections.$inferSelect;

export function mergeNutrition(items: NutritionFacts[]): NutritionFacts {
  if (items.length === 0) {
    return {
      servingSize: "Combined",
      calories: 0,
      totalFat: 0,
      sodium: 0,
      totalCarbohydrates: 0,
      protein: 0,
    };
  }

  const sum = (values: (number | undefined)[]): number => {
    return values.reduce((acc: number, val) => acc + (val ?? 0), 0);
  };

  const optionalSum = (values: (number | undefined)[]): number | undefined => {
    const defined = values.filter((v) => v !== undefined);
    if (defined.length === 0) return undefined;
    return sum(defined);
  };

  return {
    servingSize: `${items.length} items combined`,
    servingsPerContainer: undefined,
    calories: sum(items.map((i) => i.calories)),
    totalFat: Math.round(sum(items.map((i) => i.totalFat)) * 10) / 10,
    saturatedFat: optionalSum(items.map((i) => i.saturatedFat)),
    transFat: optionalSum(items.map((i) => i.transFat)),
    cholesterol: optionalSum(items.map((i) => i.cholesterol)),
    sodium: sum(items.map((i) => i.sodium)),
    totalCarbohydrates:
      Math.round(sum(items.map((i) => i.totalCarbohydrates)) * 10) / 10,
    dietaryFiber: optionalSum(items.map((i) => i.dietaryFiber)),
    totalSugars: optionalSum(items.map((i) => i.totalSugars)),
    addedSugars: optionalSum(items.map((i) => i.addedSugars)),
    protein: Math.round(sum(items.map((i) => i.protein)) * 10) / 10,
    vitaminD: optionalSum(items.map((i) => i.vitaminD)),
    calcium: optionalSum(items.map((i) => i.calcium)),
    iron: optionalSum(items.map((i) => i.iron)),
    potassium: optionalSum(items.map((i) => i.potassium)),
  };
}
