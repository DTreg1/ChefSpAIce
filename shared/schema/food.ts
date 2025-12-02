/**
 * Food & Kitchen Management Schema
 *
 * Tables for managing food inventory, recipes, meal planning, and kitchen equipment.
 * Core functionality for the food management application.
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  index,
  jsonb,
  real,
  uniqueIndex,
  date,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
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
export const userStorage = pgTable(
  "user_storage",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g., "Refrigerator", "Pantry", "Wine Cellar"
    icon: text("icon").notNull().default("package"), // Icon name for display
    isDefault: boolean("is_default").notNull().default(false), // If it's a default area like Fridge/Pantry
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("user_storage_user_id_idx").on(table.userId),
    uniqueIndex("user_storage_user_name_idx").on(table.userId, table.name),
  ],
);

/**
 * User Inventory Table
 *
 * Food items currently in user's possession across storage locations.
 * Enhanced with USDA nutrition data and barcode integration.
 */
export const userInventory = pgTable(
  "user_inventory",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
    barcodeData:
      jsonb("barcode_data").$type<z.infer<typeof barcodeDataSchema>>(), // Full barcode lookup data
    servingSize: text("serving_size"),
    servingSizeUnit: text("serving_size_unit"),
    weightInGrams: real("weight_in_grams"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("user_inventory_user_id_idx").on(table.userId),
    index("user_inventory_expiration_date_idx").on(table.expirationDate),
    index("user_inventory_storage_location_idx").on(table.storageLocationId),
    index("user_inventory_food_category_idx").on(table.foodCategory),
  ],
);

/**
 * User Recipes Table
 *
 * User-saved recipes from manual entry, AI generation, or imports.
 * Core feature for meal planning and inventory management.
 */
export const userRecipes = pgTable(
  "user_recipes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
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
  },
  (table) => [
    index("user_recipes_user_id_idx").on(table.userId),
    index("user_recipes_is_favorite_idx").on(table.isFavorite),
    index("user_recipes_created_at_idx").on(table.createdAt),
  ],
);

/**
 * Meal Plans Table
 *
 * Scheduled meals by date with recipe linking and nutrition tracking.
 */
export const mealPlans = pgTable(
  "meal_plans",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    mealType: text("meal_type").notNull(), // 'breakfast', 'lunch', 'dinner', 'snack'
    recipeId: varchar("recipe_id").references(() => userRecipes.id, {
      onDelete: "cascade",
    }),
    recipeName: text("recipe_name"), // Denormalized for quick access
    servings: integer("servings").notNull().default(1),
    notes: text("notes"),
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at"),
    ingredientsUsed: text("ingredients_used").array(), // Track what was actually used
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("meal_plans_user_id_idx").on(table.userId),
    index("meal_plans_date_idx").on(table.date),
    index("meal_plans_recipe_id_idx").on(table.recipeId),
    uniqueIndex("meal_plans_unique_meal").on(
      table.userId,
      table.date,
      table.mealType,
    ),
  ],
);

/**
 * User Shopping List Table
 *
 * Shopping list items with recipe linking and completion tracking.
 */
export const userShopping = pgTable(
  "user_shopping",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: text("quantity").notNull(),
    unit: text("unit"),
    category: text("category"), // Food category for store aisle grouping
    isPurchased: boolean("is_purchased").notNull().default(false),
    recipeId: varchar("recipe_id").references(() => userRecipes.id, {
      onDelete: "set null",
    }),
    recipeTitle: text("recipe_title"), // Denormalized for display
    notes: text("notes"),
    addedFrom: text("added_from"), // 'manual', 'recipe', 'inventory'
    createdAt: timestamp("created_at").defaultNow(),
    purchasedAt: timestamp("purchased_at"),
    purchasedQuantity: text("purchased_quantity"),
    purchasedUnit: text("purchased_unit"),
    storeName: text("store_name"),
    price: real("price"),
  },
  (table) => [
    index("user_shopping_user_id_idx").on(table.userId),
    index("user_shopping_is_purchased_idx").on(table.isPurchased),
    index("user_shopping_created_at_idx").on(table.createdAt),
  ],
);

// ==================== JSON Schema Definitions ====================
// These are used across the application for consistent data validation

// ==================== Nutrition Schema ====================
export const nutritionInfoSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbohydrates: z.number(),
  fat: z.number(),
  fiber: z.number().optional(),
  sugar: z.number().optional(),
  sodium: z.number().optional(),
  calcium: z.number().optional(),
  iron: z.number().optional(),
  vitaminA: z.number().optional(),
  vitaminC: z.number().optional(),
  vitaminD: z.number().optional(),
  vitaminE: z.number().optional(),
  vitaminK: z.number().optional(),
  cholesterol: z.number().optional(),
  saturatedFat: z.number().optional(),
  transFat: z.number().optional(),
  monounsaturatedFat: z.number().optional(),
  polyunsaturatedFat: z.number().optional(),
  servingSize: z.string(),
  servingUnit: z.string(),
});

export type NutritionInfo = z.infer<typeof nutritionInfoSchema>;

// ==================== USDA Food Data Schema ====================
// Schema for USDA FoodData Central API response - lenient to handle raw API data
export const usdaFoodDataSchema = z.object({
  fdcId: z.union([z.string(), z.number()]).transform((val) => String(val)),
  gtinUpc: z.string().optional(),
  description: z.string(),
  dataType: z.string().optional(),
  brandOwner: z.string().optional(),
  brandName: z.string().optional(),
  ingredients: z.string().optional(),
  marketCountry: z.string().optional(),
  foodCategory: z.string().optional(),
  modifiedDate: z.string().optional(),
  availableDate: z.string().optional(),
  servingSize: z.number().optional(),
  servingSizeUnit: z.string().optional(),
  packageWeight: z.string().optional(),
  notaSignificantSourceOf: z.string().optional(),
  nutrition: nutritionInfoSchema.optional(),
  foodNutrients: z.array(z.any()).optional(),
});

export type USDAFoodItem = z.infer<typeof usdaFoodDataSchema>;

// ==================== USDA Search Response Schema ====================
export const usdaSearchResponseSchema = z.object({
  foods: z.array(usdaFoodDataSchema),
  totalHits: z.number(),
  currentPage: z.number(),
  totalPages: z.number(),
});

export type USDASearchResponse = z.infer<typeof usdaSearchResponseSchema>;

// ==================== Barcode Data Schema ====================
export const barcodeDataSchema = z.object({
  barcode: z.string(),
  name: z.string(),
  brand: z.string().optional(),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  manufacturer: z.string().optional(),
  nutrition: nutritionInfoSchema.optional(),
  source: z.enum(["barcode_lookup", "openfoodfacts", "manual"]).optional(),
  cachedAt: z.date().optional(),
});

export type BarcodeData = z.infer<typeof barcodeDataSchema>;

/**
 * Cooking Terms Table
 *
 * Culinary terminology definitions for user education.
 */
export const cookingTerms = pgTable(
  "cooking_terms",
  {
    id: serial("id").primaryKey(),
    term: text("term").notNull().unique(),
    category: text("category").notNull(),
    shortDefinition: text("short_definition").notNull(),
    longDefinition: text("long_definition").notNull(),
    example: text("example"),
    difficulty: text("difficulty").default("beginner"),
    relatedTerms: text("related_terms").array(),
    imageUrl: text("image_url"),
    videoUrl: text("video_url"),
    tips: text("tips").array(),
    timeEstimate: text("time_estimate"),
    tools: text("tools").array(),
  },
  (table) => [
    index("cooking_terms_term_idx").on(table.term),
    index("cooking_terms_category_idx").on(table.category),
    index("cooking_terms_difficulty_idx").on(table.difficulty),
  ],
);

/**
 * Appliance Library Table
 *
 * Master catalog of known kitchen appliances.
 * Categories: 'cooking', 'refrigeration', 'prep', 'small'
 */
export const applianceLibrary = pgTable(
  "appliance_library",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    category: text("category").notNull(), // 'cooking', 'refrigeration', 'prep', 'small'
    description: text("description"),
    imageUrl: text("image_url"),
    defaultSettings: jsonb("default_settings").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("appliance_library_category_idx").on(table.category),
    index("appliance_library_name_idx").on(table.name),
  ],
);

/**
 * User Appliances Table
 *
 * Kitchen appliances owned by each user.
 * Can link to appliance_library or be custom (customName).
 */
export const userAppliances = pgTable(
  "user_appliances",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    applianceId: text("appliance_id").references(() => applianceLibrary.id, {
      onDelete: "set null",
    }), // nullable for custom appliances
    customName: text("custom_name"), // for custom appliances not in library
    category: text("category").notNull(), // 'cooking', 'refrigeration', 'prep', 'small'
    brand: text("brand"),
    model: text("model"),
    settings: jsonb("settings").$type<Record<string, unknown>>(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("user_appliances_user_id_idx").on(table.userId),
    index("user_appliances_appliance_id_idx").on(table.applianceId),
    index("user_appliances_category_idx").on(table.category),
  ],
);

/**
 * USDA Cache Table
 *
 * Caches USDA FoodData Central API responses to reduce API calls
 * and improve performance. Entries expire based on expiresAt timestamp.
 */
export const usdaCache = pgTable(
  "usda_cache",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fdcId: text("fdc_id").notNull().unique(),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => [
    index("usda_cache_fdc_id_idx").on(table.fdcId),
    index("usda_cache_expires_at_idx").on(table.expiresAt),
  ],
);

// ==================== Zod Schemas & Type Exports ====================

export const insertUsdaCacheSchema = createInsertSchema(usdaCache).omit({
  id: true,
  createdAt: true,
});

export type InsertUsdaCache = z.infer<typeof insertUsdaCacheSchema>;
export type UsdaCache = typeof usdaCache.$inferSelect;

export const insertUserStorageSchema = createInsertSchema(userStorage);

export type InsertUserStorage = z.infer<typeof insertUserStorageSchema>;
export type UserStorage = typeof userStorage.$inferSelect;
export type StorageLocation = UserStorage; // Backward compatibility

export const insertUserInventorySchema = createInsertSchema(userInventory)
  .omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    usdaData: usdaFoodDataSchema.optional(),
    barcodeData: barcodeDataSchema.optional(),
    expirationDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    weightInGrams: z.number().positive().optional(),
  });

export type InsertUserInventory = z.infer<typeof insertUserInventorySchema>;
export type UserInventory = typeof userInventory.$inferSelect;

export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export const mealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export const recipeSourceSchema = z.enum([
  "manual",
  "ai_generated",
  "imported",
]);

export const insertRecipeSchema = createInsertSchema(userRecipes).extend({
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

export const insertMealPlanSchema = createInsertSchema(mealPlans).extend({
  mealType: mealTypeSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  servings: z.number().positive().default(1),
});

export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;

export const insertShoppingItemSchema = createInsertSchema(userShopping).extend(
  {
    price: z.number().positive().optional(),
    addedFrom: z.enum(["manual", "recipe", "inventory"]).optional(),
  },
);

export type InsertShoppingItem = z.infer<typeof insertShoppingItemSchema>;
export type ShoppingItem = typeof userShopping.$inferSelect;

export const applianceCategorySchema = z.enum([
  "cooking",
  "refrigeration",
  "prep",
  "small",
]);

export const insertUserApplianceSchema = createInsertSchema(userAppliances, {
  category: applianceCategorySchema,
  settings: z.record(z.unknown()).nullable().optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertUserAppliance = z.infer<typeof insertUserApplianceSchema>;
export type UserAppliance = typeof userAppliances.$inferSelect;

export const insertCookingTermSchema = createInsertSchema(cookingTerms);
export type InsertCookingTerm = z.infer<typeof insertCookingTermSchema>;
export type CookingTerm = typeof cookingTerms.$inferSelect;

export const insertApplianceLibrarySchema = createInsertSchema(
  applianceLibrary,
  {
    category: applianceCategorySchema,
    defaultSettings: z.record(z.unknown()).nullable().optional(),
  },
).omit({ id: true, createdAt: true });

export type InsertApplianceLibrary = z.infer<
  typeof insertApplianceLibrarySchema
>;
export type ApplianceLibrary = typeof applianceLibrary.$inferSelect;

// Backward compatibility aliases
export const insertShoppingListItemSchema = insertShoppingItemSchema;
export type ShoppingListItem = ShoppingItem;
export type InsertApplianceLibraryItem = InsertApplianceLibrary;
export type ApplianceLibraryItem = ApplianceLibrary;
