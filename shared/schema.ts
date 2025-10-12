import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - REQUIRED for Replit Auth (from blueprint:javascript_log_in_with_replit)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - REQUIRED for Replit Auth (from blueprint:javascript_log_in_with_replit)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// User Preferences
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  dietaryRestrictions: text("dietary_restrictions").array(),
  allergens: text("allergens").array(),
  favoriteCategories: text("favorite_categories").array(),
  expirationAlertDays: integer("expiration_alert_days").notNull().default(3),
  storageAreasEnabled: text("storage_areas_enabled").array(),
  householdSize: integer("household_size").notNull().default(2),
  cookingSkillLevel: text("cooking_skill_level").notNull().default('beginner'),
  preferredUnits: text("preferred_units").notNull().default('imperial'),
  foodsToAvoid: text("foods_to_avoid").array(),
  hasCompletedOnboarding: boolean("has_completed_onboarding").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;

// Storage Locations (fridge, freezer, pantry, etc.) - now user-scoped
export const storageLocations = pgTable("storage_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
  itemCount: integer("item_count").notNull().default(0),
});

export const insertStorageLocationSchema = createInsertSchema(storageLocations).omit({
  id: true,
  userId: true,
});

export type InsertStorageLocation = z.infer<typeof insertStorageLocationSchema>;
export type StorageLocation = typeof storageLocations.$inferSelect;

// Kitchen Appliances - now user-scoped
export const appliances = pgTable("appliances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
});

export const insertApplianceSchema = createInsertSchema(appliances).omit({
  id: true,
  userId: true,
});

export type InsertAppliance = z.infer<typeof insertApplianceSchema>;
export type Appliance = typeof appliances.$inferSelect;

// Food Items - now user-scoped
export const foodItems = pgTable("food_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fcdId: text("fcd_id"),
  name: text("name").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit").notNull(),
  storageLocationId: varchar("storage_location_id").notNull(),
  expirationDate: text("expiration_date").notNull(),
  imageUrl: text("image_url"),
  nutrition: text("nutrition"),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const insertFoodItemSchema = createInsertSchema(foodItems).omit({
  id: true,
  userId: true,
  addedAt: true,
});

export type InsertFoodItem = z.infer<typeof insertFoodItemSchema>;
export type FoodItem = typeof foodItems.$inferSelect;

// Chat Messages - now user-scoped
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  metadata: text("metadata"),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  userId: true,
  timestamp: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Recipe (generated by AI) - now user-scoped
export const recipes = pgTable("recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  prepTime: text("prep_time"),
  cookTime: text("cook_time"),
  servings: integer("servings"),
  ingredients: text("ingredients").array().notNull(),
  instructions: text("instructions").array().notNull(),
  usedIngredients: text("used_ingredients").array().notNull(),
  missingIngredients: text("missing_ingredients").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isFavorite: boolean("is_favorite").notNull().default(false),
  rating: integer("rating"),
});

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;

// Expiration Notifications - now user-scoped
export const expirationNotifications = pgTable("expiration_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  foodItemId: varchar("food_item_id").notNull(),
  foodItemName: text("food_item_name").notNull(),
  expirationDate: text("expiration_date").notNull(),
  daysUntilExpiry: integer("days_until_expiry").notNull(),
  notifiedAt: timestamp("notified_at").notNull().defaultNow(),
  dismissed: boolean("dismissed").notNull().default(false),
});

export const insertExpirationNotificationSchema = createInsertSchema(expirationNotifications).omit({
  id: true,
  userId: true,
  notifiedAt: true,
});

export type InsertExpirationNotification = z.infer<typeof insertExpirationNotificationSchema>;
export type ExpirationNotification = typeof expirationNotifications.$inferSelect;

// Nutritional Information (embedded in food items)
export type NutritionInfo = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize?: string;
  servingUnit?: string;
};

// USDA Food Search Response Type (not stored in DB)
export type USDAFoodItem = {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  ingredients?: string;
  foodCategory?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  nutrition?: NutritionInfo;
};

export type USDASearchResponse = {
  foods: USDAFoodItem[];
  totalHits: number;
  currentPage: number;
  totalPages: number;
};

// Meal Plans - now user-scoped
export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipeId: varchar("recipe_id").notNull(),
  date: text("date").notNull(), // ISO date string (YYYY-MM-DD)
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner, snack
  servings: integer("servings").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  userId: true,
  createdAt: true,
}).extend({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  servings: z.number().int().positive().default(1),
});

export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
