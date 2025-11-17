/**
 * Food & Kitchen Management Schema
 * 
 * Tables for managing food inventory, recipes, meal planning, and kitchen equipment.
 * Core functionality for the food management application.
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, index, jsonb, real, uniqueIndex, date, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  nutritionInfoSchema,
  usdaFoodDataSchema,
  barcodeDataSchema,
} from "../json-schemas";
import { users } from "./auth";

/**
 * User Storage Locations Table
 * 
 * User-defined storage areas for organizing food inventory.
 * Supports custom locations beyond default Fridge/Pantry/Freezer.
 * 
 * Default Locations:
 * - Refrigerator (isDefault: true, icon: "refrigerator")
 * - Freezer (isDefault: true, icon: "snowflake")
 * - Pantry (isDefault: true, icon: "warehouse")
 * - Counter (isDefault: true, icon: "layout-grid")
 */
export const userStorage = pgTable("user_storage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Refrigerator", "Pantry", "Wine Cellar"
  icon: text("icon").notNull().default("package"), // Icon name for display
  isDefault: boolean("is_default").notNull().default(false), // If it's a default area like Fridge/Pantry
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_storage_user_id_idx").on(table.userId),
  uniqueIndex("user_storage_user_name_idx").on(table.userId, table.name),
]);

/**
 * User Inventory Table
 * 
 * Food items currently in user's possession across storage locations.
 * Enhanced with USDA nutrition data and barcode integration.
 */
export const userInventory = pgTable("user_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit").notNull(),
  expirationDate: text("expiration_date"),
  storageLocationId: varchar("storage_location_id").notNull(),
  foodCategory: text("food_category"), // Mapped USDA category
  imageUrl: text("image_url"),
  barcode: text("barcode"),
  notes: text("notes"),
  nutrition: text("nutrition"), // JSON string for nutrition data
  usdaData: jsonb("usda_data").$type<z.infer<typeof usdaFoodDataSchema>>(), // Full USDA FoodData Central data
  barcodeData: jsonb("barcode_data").$type<z.infer<typeof barcodeDataSchema>>(), // Full barcode lookup data
  servingSize: text("serving_size"),
  servingSizeUnit: text("serving_size_unit"),
  weightInGrams: real("weight_in_grams"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_inventory_user_id_idx").on(table.userId),
  index("user_inventory_expiration_date_idx").on(table.expirationDate),
  index("user_inventory_storage_location_idx").on(table.storageLocationId),
  index("user_inventory_food_category_idx").on(table.foodCategory),
]);

/**
 * User Recipes Table
 * 
 * User-saved recipes from manual entry, AI generation, or imports.
 * Core feature for meal planning and inventory management.
 */
export const userRecipes = pgTable("user_recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  ingredients: text("ingredients").array().notNull(),
  instructions: text("instructions").array().notNull(),
  usedIngredients: text("used_ingredients").array().notNull().default([]),
  missingIngredients: text("missing_ingredients").array(),
  prepTime: text("prep_time"),
  cookTime: text("cook_time"),
  totalTime: text("total_time"),
  servings: integer("servings").notNull().default(4),
  difficulty: text("difficulty").default("medium"),
  cuisine: text("cuisine"),
  category: text("category"), // Recipe category for ML categorization
  dietaryInfo: jsonb("dietary_info").$type<string[]>(),
  imageUrl: text("image_url"),
  source: text("source"), // 'manual', 'ai_generated', 'imported'
  aiPrompt: text("ai_prompt"), // If AI generated, store the prompt
  rating: integer("rating"), // 1-5 rating
  notes: text("notes"),
  nutrition: jsonb("nutrition").$type<z.infer<typeof nutritionInfoSchema>>(),
  tags: jsonb("tags").$type<string[]>(),
  neededEquipment: jsonb("needed_equipment").$type<string[]>(), // Required appliances, cookware, bakeware
  isFavorite: boolean("is_favorite").notNull().default(false),
  similarityHash: text("similarity_hash"), // Hash for duplicate detection using embeddings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_recipes_user_id_idx").on(table.userId),
  index("user_recipes_is_favorite_idx").on(table.isFavorite),
  index("user_recipes_created_at_idx").on(table.createdAt),
]);

/**
 * Meal Plans Table
 * 
 * Scheduled meals by date with recipe linking and nutrition tracking.
 */
export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  mealType: text("meal_type").notNull(), // 'breakfast', 'lunch', 'dinner', 'snack'
  recipeId: varchar("recipe_id").references(() => userRecipes.id, { onDelete: "cascade" }),
  recipeName: text("recipe_name"), // Denormalized for quick access
  servings: integer("servings").notNull().default(1),
  notes: text("notes"),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  ingredientsUsed: text("ingredients_used").array(), // Track what was actually used
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("meal_plans_user_id_idx").on(table.userId),
  index("meal_plans_date_idx").on(table.date),
  index("meal_plans_recipe_id_idx").on(table.recipeId),
  uniqueIndex("meal_plans_unique_meal").on(table.userId, table.date, table.mealType),
]);

/**
 * User Shopping List Table
 * 
 * Shopping list items with recipe linking and completion tracking.
 */
export const userShopping = pgTable("user_shopping", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit"),
  category: text("category"), // Food category for store aisle grouping
  isPurchased: boolean("is_purchased").notNull().default(false),
  recipeId: varchar("recipe_id").references(() => userRecipes.id, { onDelete: "set null" }),
  recipeTitle: text("recipe_title"), // Denormalized for display
  notes: text("notes"),
  addedFrom: text("added_from"), // 'manual', 'recipe', 'inventory'
  createdAt: timestamp("created_at").defaultNow(),
  purchasedAt: timestamp("purchased_at"),
  purchasedQuantity: text("purchased_quantity"),
  purchasedUnit: text("purchased_unit"),
  storeName: text("store_name"),
  price: real("price"),
}, (table) => [
  index("user_shopping_user_id_idx").on(table.userId),
  index("user_shopping_is_purchased_idx").on(table.isPurchased),
  index("user_shopping_created_at_idx").on(table.createdAt),
]);

/**
 * FDC Cache Table
 * 
 * Cache for USDA FoodData Central API responses to reduce API calls.
 */
export const fdcCache = pgTable("fdc_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  searchQuery: text("search_query").notNull().unique(),
  searchResults: jsonb("search_results").$type<any[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
}, (table) => [
  index("fdc_cache_search_query_idx").on(table.searchQuery),
  index("fdc_cache_expires_at_idx").on(table.expiresAt),
]);

/**
 * Onboarding Inventory Table
 * 
 * Pre-populated food items for quick onboarding experience.
 */
export const onboardingInventory = pgTable("onboarding_inventory", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  storageLocation: text("storage_location").notNull().default('pantry'),
  commonBrand: text("common_brand"),
  defaultQuantity: text("default_quantity").default('1'),
  defaultUnit: text("default_unit").default('item'),
  imageUrl: text("image_url"),
  isPopular: boolean("is_popular").notNull().default(false),
  usdaData: jsonb("usda_data").$type<z.infer<typeof usdaFoodDataSchema>>(),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [
  index("onboarding_inventory_category_idx").on(table.category),
  index("onboarding_inventory_is_popular_idx").on(table.isPopular),
]);

/**
 * Cooking Terms Table
 * 
 * Culinary terminology definitions for user education.
 */
export const cookingTerms = pgTable("cooking_terms", {
  id: serial("id").primaryKey(),
  term: text("term").notNull().unique(),
  category: text("category").notNull(),
  definition: text("definition").notNull(),
  example: text("example"),
  difficulty: text("difficulty").default('beginner'),
  relatedTerms: text("related_terms").array(),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  tips: text("tips").array(),
}, (table) => [
  index("cooking_terms_term_idx").on(table.term),
  index("cooking_terms_category_idx").on(table.category),
  index("cooking_terms_difficulty_idx").on(table.difficulty),
]);

/**
 * Appliance Library Table
 * 
 * Master catalog of kitchen appliances and cookware.
 */
export const applianceLibrary = pgTable("appliance_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(),
  brand: text("brand"),
  model: text("model"),
  capabilities: text("capabilities").array(),
  capacity: text("capacity"),
  servingSize: text("serving_size"),
  imageUrl: text("image_url"),
  isCommon: boolean("is_common").notNull().default(false),
  alternatives: text("alternatives").array(),
}, (table) => [
  index("appliance_library_type_idx").on(table.type),
  index("appliance_library_is_common_idx").on(table.isCommon),
  uniqueIndex("appliance_library_brand_model_idx").on(table.brand, table.model),
]);

/**
 * User Appliances Table
 * 
 * Kitchen appliances and cookware owned by each user.
 */
export const userAppliances = pgTable("user_appliances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  applianceLibraryId: varchar("appliance_library_id").references(() => applianceLibrary.id, { onDelete: "set null" }),
  customBrand: text("custom_brand"),
  customModel: text("custom_model"),
  customCapabilities: text("custom_capabilities").array(),
  customCapacity: text("custom_capacity"),
  customServingSize: text("custom_serving_size"),
  nickname: text("nickname"),
  purchaseDate: text("purchase_date"),
  warrantyEndDate: text("warranty_end_date"),
  notes: text("notes"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("user_appliances_user_id_idx").on(table.userId),
  index("user_appliances_appliance_library_id_idx").on(table.applianceLibraryId),
]);

// ==================== Zod Schemas & Type Exports ====================

export const insertUserStorageSchema = createInsertSchema(userStorage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserStorage = z.infer<typeof insertUserStorageSchema>;
export type UserStorage = typeof userStorage.$inferSelect;
export type StorageLocation = UserStorage; // Backward compatibility

export const insertUserInventorySchema = createInsertSchema(userInventory)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    usdaData: usdaFoodDataSchema.optional(),
    barcodeData: barcodeDataSchema.optional(),
    // Add stricter validation for expiration dates
    expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    weightInGrams: z.number().positive().optional(),
  });

export type InsertUserInventory = z.infer<typeof insertUserInventorySchema>;
export type UserInventory = typeof userInventory.$inferSelect;

export const difficultySchema = z.enum(['easy', 'medium', 'hard']);
export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);
export const recipeSourceSchema = z.enum(['manual', 'ai_generated', 'imported']);

export const insertRecipeSchema = createInsertSchema(userRecipes)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    nutrition: nutritionInfoSchema.optional(),
    tags: z.array(z.string()).optional(),
    dietaryInfo: z.array(z.string()).optional(),
    neededEquipment: z.array(z.string()).optional(),
    difficulty: difficultySchema.optional(),
    source: recipeSourceSchema.optional(),
    rating: z.number().min(1).max(5).optional(),
    servings: z.number().positive().default(4),
  });

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof userRecipes.$inferSelect;

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  mealType: mealTypeSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  servings: z.number().positive().default(1),
});

export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;

export const insertShoppingItemSchema = createInsertSchema(userShopping).omit({
  id: true,
  createdAt: true,
  purchasedAt: true,
}).extend({
  price: z.number().positive().optional(),
  addedFrom: z.enum(['manual', 'recipe', 'inventory']).optional(),
});

export type InsertShoppingItem = z.infer<typeof insertShoppingItemSchema>;
export type ShoppingItem = typeof userShopping.$inferSelect;

export const insertUserApplianceSchema = createInsertSchema(userAppliances)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export type InsertUserAppliance = z.infer<typeof insertUserApplianceSchema>;
export type UserAppliance = typeof userAppliances.$inferSelect;

// Export other type aliases
export type InsertFdcCache = typeof fdcCache.$inferInsert;
export type FdcCache = typeof fdcCache.$inferSelect;

export type OnboardingInventoryItem = typeof onboardingInventory.$inferSelect;
export type CookingTerm = typeof cookingTerms.$inferSelect;
export type ApplianceLibraryItem = typeof applianceLibrary.$inferSelect;