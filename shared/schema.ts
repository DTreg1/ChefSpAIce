import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, index, jsonb, real, uniqueIndex } from "drizzle-orm/pg-core";
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
// Merged with user preferences and storage locations for better performance
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // Preferences (previously in userPreferences table)
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
  
  // Storage locations as JSONB array (previously in storageLocations table)
  storageLocations: jsonb("storage_locations").$type<Array<{
    id: string;
    name: string;
    icon: string;
  }>>().default([]),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Push Notification Tokens - Store device tokens for push notifications
export const pushTokens = pgTable("push_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  platform: text("platform").notNull(), // 'ios', 'android', 'web'
  deviceInfo: jsonb("device_info").$type<{
    deviceId?: string;
    deviceModel?: string;
    osVersion?: string;
    appVersion?: string;
  }>(),
  lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("push_tokens_user_token_idx").on(table.userId, table.token),
  index("push_tokens_user_id_idx").on(table.userId),
]);

export const insertPushTokenSchema = createInsertSchema(pushTokens).omit({
  id: true,
  createdAt: true,
  lastUsedAt: true,
});

export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;
export type PushToken = typeof pushTokens.$inferSelect;

// Appliance Categories - Reference table for appliance types
export const applianceCategories = pgTable("appliance_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [
  index("appliance_categories_sort_order_idx").on(table.sortOrder),
]);

export const insertApplianceCategorySchema = createInsertSchema(applianceCategories).omit({
  id: true,
});

export type InsertApplianceCategory = z.infer<typeof insertApplianceCategorySchema>;
export type ApplianceCategory = typeof applianceCategories.$inferSelect;

// Barcode Products - Product cache from Barcode Lookup API
export const barcodeProducts = pgTable("barcode_products", {
  barcodeNumber: text("barcode_number").primaryKey(),
  productName: text("product_name"),
  title: text("title"),
  alias: text("alias"),
  description: text("description"),
  brand: text("brand"),
  manufacturer: text("manufacturer"),
  mpn: text("mpn"),
  msrp: text("msrp"),
  asin: text("asin"),
  category: text("category"),
  imageUrl: text("image_url"),
  reviews: jsonb("reviews").$type<Array<{
    name: string;
    rating: string;
    title: string;
    review: string;
    datetime: string;
  }>>(),
  stores: jsonb("stores").$type<Array<{
    store_name: string;
    store_price: string;
    product_url: string;
    currency_code: string;
    currency_symbol: string;
  }>>(),
  cachedAt: timestamp("cached_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const insertBarcodeProductSchema = createInsertSchema(barcodeProducts).omit({
  cachedAt: true,
});

export type InsertBarcodeProduct = z.infer<typeof insertBarcodeProductSchema>;
export type BarcodeProduct = typeof barcodeProducts.$inferSelect;

// Appliances - User's kitchen appliances
export const appliances = pgTable("appliances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: varchar("category_id").references(() => applianceCategories.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  brand: text("brand"),
  model: text("model"),
  serialNumber: text("serial_number"),
  purchaseDate: text("purchase_date"),
  warrantyExpiryDate: text("warranty_expiry_date"),
  notes: text("notes"),
  manualUrl: text("manual_url"),
  imageUrl: text("image_url"),
  barcode: text("barcode").references(() => barcodeProducts.barcodeNumber, { onDelete: "set null" }),
  customFields: jsonb("custom_fields").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("appliances_user_id_idx").on(table.userId),
  index("appliances_category_id_idx").on(table.categoryId),
  index("appliances_barcode_idx").on(table.barcode),
]);

export const insertApplianceSchema = createInsertSchema(appliances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAppliance = z.infer<typeof insertApplianceSchema>;
export type Appliance = typeof appliances.$inferSelect;

// Food Items - User's inventory
export const foodItems = pgTable("food_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit").notNull(),
  expirationDate: text("expiration_date"),
  storageLocationId: varchar("storage_location_id").notNull(),
  category: text("category"),
  foodCategory: text("food_category"), // Mapped USDA category
  imageUrl: text("image_url"),
  barcode: text("barcode"),
  notes: text("notes"),
  nutrition: text("nutrition"), // JSON string for nutrition data
  usdaData: jsonb("usda_data").$type<any>(), // Full USDA FoodData Central data
  barcodeData: jsonb("barcode_data").$type<any>(), // Full barcode lookup data
  servingSize: text("serving_size"),
  servingSizeUnit: text("serving_size_unit"),
  weightInGrams: real("weight_in_grams"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("food_items_user_id_idx").on(table.userId),
  index("food_items_expiration_date_idx").on(table.expirationDate),
  index("food_items_storage_location_idx").on(table.storageLocationId),
  index("food_items_food_category_idx").on(table.foodCategory),
]);

export const insertFoodItemSchema = createInsertSchema(foodItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFoodItem = z.infer<typeof insertFoodItemSchema>;
export type FoodItem = typeof foodItems.$inferSelect;

// Storage Locations Type
export type StorageLocation = {
  id: string;
  name: string;
  icon: string;
};

// Chat Messages - Store conversation history
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("chat_messages_user_id_idx").on(table.userId),
  index("chat_messages_created_at_idx").on(table.createdAt),
]);

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Recipes - User's saved recipes
export const recipes = pgTable("recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  ingredients: jsonb("ingredients").$type<string[]>().notNull(),
  instructions: jsonb("instructions").$type<string[]>().notNull(),
  prepTime: text("prep_time"),
  cookTime: text("cook_time"),
  totalTime: text("total_time"),
  servings: integer("servings").notNull().default(4),
  difficulty: text("difficulty").default("medium"),
  cuisine: text("cuisine"),
  dietaryInfo: jsonb("dietary_info").$type<string[]>(),
  imageUrl: text("image_url"),
  source: text("source"), // 'manual', 'ai_generated', 'imported'
  aiPrompt: text("ai_prompt"), // If AI generated, store the prompt
  rating: integer("rating"), // 1-5 rating
  notes: text("notes"),
  nutrition: jsonb("nutrition").$type<any>(),
  tags: jsonb("tags").$type<string[]>(),
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("recipes_user_id_idx").on(table.userId),
  index("recipes_is_favorite_idx").on(table.isFavorite),
  index("recipes_created_at_idx").on(table.createdAt),
]);

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;

// Meal Plans - User's planned meals
export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipeId: varchar("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD format
  mealType: text("meal_type").notNull(), // 'breakfast', 'lunch', 'dinner', 'snack'
  servings: integer("servings").notNull().default(1),
  notes: text("notes"),
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("meal_plans_user_id_idx").on(table.userId),
  index("meal_plans_recipe_id_idx").on(table.recipeId),
  index("meal_plans_date_idx").on(table.date),
  index("meal_plans_meal_type_idx").on(table.mealType),
]);

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
});

export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;

// API Usage Logs - Track external API calls for analytics
export const apiUsageLogs = pgTable("api_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  apiName: text("api_name").notNull(), // 'openai', 'barcode_lookup', 'usda', 'stripe', etc.
  endpoint: text("endpoint").notNull(),
  method: text("method"), // 'GET', 'POST', etc.
  requestPayload: jsonb("request_payload").$type<any>(),
  responsePayload: jsonb("response_payload").$type<any>(),
  statusCode: integer("status_code"),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  responseTimeMs: integer("response_time_ms"),
  costInCents: real("cost_in_cents"), // If applicable
  queryParams: text("query_params"),
  headers: jsonb("headers").$type<any>(),
  metadata: jsonb("metadata").$type<any>(), // Extra data specific to the API
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("api_usage_logs_user_id_idx").on(table.userId),
  index("api_usage_logs_api_name_idx").on(table.apiName),
  index("api_usage_logs_created_at_idx").on(table.createdAt),
  index("api_usage_logs_success_idx").on(table.success),
]);

export const insertApiUsageLogSchema = createInsertSchema(apiUsageLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertApiUsageLog = z.infer<typeof insertApiUsageLogSchema>;
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;

// FDC Cache - Cache USDA FoodData Central responses
export const fdcCache = pgTable("fdc_cache", {
  fdcId: varchar("fdc_id").primaryKey(),
  dataType: text("data_type").notNull(), // 'Branded', 'Survey', 'Foundation', etc.
  description: text("description").notNull(),
  brandOwner: text("brand_owner"),
  brandName: text("brand_name"),
  gtinUpc: text("gtin_upc"),
  ingredients: text("ingredients"),
  servingSize: real("serving_size"),
  servingSizeUnit: text("serving_size_unit"),
  foodCategory: text("food_category"),
  foodNutrients: jsonb("food_nutrients").$type<any>().notNull(),
  fullData: jsonb("full_data").$type<any>().notNull(), // Complete FDC response
  cachedAt: timestamp("cached_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
}, (table) => [
  index("fdc_cache_gtin_upc_idx").on(table.gtinUpc),
  index("fdc_cache_description_idx").on(table.description),
  index("fdc_cache_brand_owner_idx").on(table.brandOwner),
  index("fdc_cache_expires_at_idx").on(table.expiresAt),
]);

export const insertFdcCacheSchema = createInsertSchema(fdcCache).omit({
  cachedAt: true,
});

export type InsertFdcCache = z.infer<typeof insertFdcCacheSchema>;
export type FdcCache = typeof fdcCache.$inferSelect;

// FDC Search Queries - Cache search results
export const fdcSearchQueries = pgTable("fdc_search_queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  queryHash: text("query_hash").notNull().unique(), // Hash of search params for dedup
  query: text("query").notNull(),
  dataTypes: jsonb("data_types").$type<string[]>(),
  pageNumber: integer("page_number").notNull(),
  sortBy: text("sort_by"),
  sortOrder: text("sort_order"),
  brandOwner: text("brand_owner"),
  results: jsonb("results").$type<any>().notNull(), // Cached search results
  totalHits: integer("total_hits"),
  totalPages: integer("total_pages"),
  cachedAt: timestamp("cached_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
}, (table) => [
  index("fdc_search_queries_query_hash_idx").on(table.queryHash),
  index("fdc_search_queries_expires_at_idx").on(table.expiresAt),
]);

export const insertFdcSearchQuerySchema = createInsertSchema(fdcSearchQueries).omit({
  id: true,
  cachedAt: true,
});

export type InsertFdcSearchQuery = z.infer<typeof insertFdcSearchQuerySchema>;
export type FdcSearchQuery = typeof fdcSearchQueries.$inferSelect;

// Shopping List Items - User's shopping list
export const shoppingListItems = pgTable("shopping_list_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity"),
  unit: text("unit"),
  category: text("category"),
  isChecked: boolean("is_checked").notNull().default(false),
  notes: text("notes"),
  recipeId: varchar("recipe_id").references(() => recipes.id, { onDelete: "set null" }), // If from a recipe
  mealPlanId: varchar("meal_plan_id").references(() => mealPlans.id, { onDelete: "set null" }), // If from meal plan
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("shopping_list_items_user_id_idx").on(table.userId),
  index("shopping_list_items_is_checked_idx").on(table.isChecked),
  index("shopping_list_items_recipe_id_idx").on(table.recipeId),
  index("shopping_list_items_meal_plan_id_idx").on(table.mealPlanId),
]);

export const insertShoppingListItemSchema = createInsertSchema(shoppingListItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;

// Nutrition Info Interface
export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize?: string;
  servingUnit?: string;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminE?: number;
  vitaminK?: number;
  thiamin?: number;
  riboflavin?: number;
  niacin?: number;
  vitaminB6?: number;
  folate?: number;
  vitaminB12?: number;
  pantothenicAcid?: number;
  phosphorus?: number;
  magnesium?: number;
  zinc?: number;
  selenium?: number;
  copper?: number;
  manganese?: number;
}

// USDA FoodData Central Types
export interface USDAFoodItem {
  fdcId: number;
  description: string;
  dataType?: string;
  gtinUpc?: string;
  brandOwner?: string;
  brandName?: string;
  ingredients?: string;
  marketCountry?: string;
  foodCategory?: string;
  allHighlightFields?: string;
  score?: number;
  packageWeight?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: Array<{
    nutrientId: number;
    nutrientName: string;
    nutrientNumber?: string;
    unitName: string;
    value: number;
  }>;
  finalFoodInputFoods?: Array<any>;
  foodMeasures?: Array<any>;
  foodAttributes?: Array<any>;
  foodAttributeTypes?: Array<any>;
  foodVersionIds?: Array<any>;
}

export interface USDASearchResponse {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  pageList: number[];
  foodSearchCriteria: {
    query: string;
    generalSearchInput?: string;
    pageNumber: number;
    numberOfResults?: number;
    pageSize?: number;
    requireAllWords?: boolean;
    dataType?: string[];
  };
  foods: USDAFoodItem[];
  aggregations?: {
    dataType?: Record<string, number>;
    nutrients?: Record<string, number>;
  };
}

// Feedback - User feedback and issue tracking
export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Allow anonymous feedback
  userEmail: text("user_email"), // For anonymous feedback
  
  // Feedback content
  type: text("type").notNull(), // 'bug', 'feature_request', 'improvement', 'praise', 'other'
  category: text("category"), // 'ui', 'performance', 'functionality', 'content', 'api', etc.
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  
  // Metadata
  url: text("url"), // Page where feedback was submitted
  userAgent: text("user_agent"),
  appVersion: text("app_version"),
  
  // Sentiment and priority
  sentiment: text("sentiment"), // 'positive', 'negative', 'neutral'
  priority: text("priority"), // 'low', 'medium', 'high', 'critical'
  
  // Status tracking
  status: text("status").notNull().default('pending'), // 'pending', 'in_review', 'in_progress', 'resolved', 'closed', 'wont_fix'
  resolution: text("resolution"),
  
  // Engagement tracking - Now as JSONB arrays to avoid separate tables
  upvotes: jsonb("upvotes").$type<Array<{userId: string; createdAt: string}>>().default([]),
  responses: jsonb("responses").$type<Array<{
    responderId: string;
    response: string;
    action?: string;
    createdAt: string;
  }>>().default([]),
  
  // Additional data
  attachments: jsonb("attachments").$type<string[]>(), // URLs to uploaded files
  tags: jsonb("tags").$type<string[]>(),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => [
  index("feedback_user_id_idx").on(table.userId),
  index("feedback_type_idx").on(table.type),
  index("feedback_status_idx").on(table.status),
  index("feedback_priority_idx").on(table.priority),
  index("feedback_created_at_idx").on(table.createdAt),
]);

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  upvotes: true,
  responses: true,
}).extend({
  type: z.enum(['bug', 'feature_request', 'improvement', 'praise', 'other']),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['pending', 'in_review', 'in_progress', 'resolved', 'closed', 'wont_fix']).default('pending'),
});

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

// Feedback Upvotes and Responses - MERGED INTO feedback TABLE AS JSONB ARRAYS
// Types preserved for backward compatibility during migration
export type FeedbackUpvote = {
  userId: string;
  createdAt: string;
};

export type FeedbackResponse = {
  responderId: string;
  response: string;
  action?: string;
  createdAt: string;
};

// Feedback Analytics Aggregations (for dashboard)
export type FeedbackAnalytics = {
  totalFeedback: number;
  averageRating: number | null;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  typeDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  recentTrends: {
    date: string;
    count: number;
    averageSentiment: number;
  }[];
  topIssues: {
    category: string;
    count: number;
    priority: string;
  }[];
};

// Donations - Track Stripe donations (from blueprint:javascript_stripe)
export const donations = pgTable("donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Optional - allow anonymous donations
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull().unique(),
  amount: integer("amount").notNull(), // Amount in cents
  currency: text("currency").notNull().default('usd'),
  status: text("status").notNull(), // 'pending', 'succeeded', 'failed', 'canceled'
  donorEmail: text("donor_email"),
  donorName: text("donor_name"),
  message: text("message"), // Optional message from donor
  anonymous: boolean("anonymous").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("donations_user_id_idx").on(table.userId),
  index("donations_created_at_idx").on(table.createdAt),
  index("donations_status_idx").on(table.status),
]);

export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  createdAt: true,
  completedAt: true,
}).extend({
  amount: z.number().int().positive(),
  status: z.enum(['pending', 'succeeded', 'failed', 'canceled']).default('pending'),
  currency: z.string().default('usd'),
  anonymous: z.boolean().default(false),
});

export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donations.$inferSelect;

// Web Vitals Analytics - Track Core Web Vitals metrics
export const webVitals = pgTable("web_vitals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Optional - can be anonymous
  name: text("name").notNull(), // LCP, FID, CLS, FCP, TTFB, INP
  value: real("value").notNull(),
  rating: text("rating").notNull(), // 'good', 'needs-improvement', 'poor'
  delta: real("delta").notNull(),
  metricId: text("metric_id").notNull(), // Unique ID for the metric
  navigationType: text("navigation_type"), // 'navigate', 'reload', 'back-forward', etc.
  userAgent: text("user_agent"),
  url: text("url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("web_vitals_user_id_idx").on(table.userId),
  index("web_vitals_name_idx").on(table.name),
  index("web_vitals_created_at_idx").on(table.createdAt),
  index("web_vitals_rating_idx").on(table.rating),
]);

export const insertWebVitalSchema = createInsertSchema(webVitals).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.enum(['LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP']),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  value: z.number(),
  delta: z.number(),
  metricId: z.string(),
});

export type InsertWebVital = z.infer<typeof insertWebVitalSchema>;
export type WebVital = typeof webVitals.$inferSelect;

// Analytics Events - Track user interactions and behaviors
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionId: text("session_id").notNull(),
  
  // Event details
  eventType: text("event_type").notNull(), // 'page_view', 'feature_use', 'button_click', 'form_submit', 'error', etc.
  eventCategory: text("event_category").notNull(), // 'navigation', 'inventory', 'recipe', 'chat', 'meal_plan', etc.
  eventAction: text("event_action").notNull(), // Specific action taken
  eventLabel: text("event_label"), // Additional context
  eventValue: real("event_value"), // Numeric value if applicable
  
  // Context
  pageUrl: text("page_url"),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  deviceType: text("device_type"), // 'mobile', 'tablet', 'desktop'
  browser: text("browser"),
  os: text("os"),
  screenResolution: text("screen_resolution"),
  viewport: text("viewport"),
  
  // Feature-specific data
  properties: jsonb("properties").$type<Record<string, any>>(), // Flexible properties for specific events
  
  // Timing
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  timeOnPage: integer("time_on_page"), // Seconds spent on page before event
  
}, (table) => [
  index("analytics_events_user_id_idx").on(table.userId),
  index("analytics_events_session_id_idx").on(table.sessionId),
  index("analytics_events_event_type_idx").on(table.eventType),
  index("analytics_events_event_category_idx").on(table.eventCategory),
  index("analytics_events_timestamp_idx").on(table.timestamp),
]);

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents).omit({
  id: true,
  timestamp: true,
}).extend({
  eventType: z.string(),
  eventCategory: z.string(),
  eventAction: z.string(),
  sessionId: z.string(),
});

export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

// User Sessions - Track user sessions for analytics
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull().unique(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Session details
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // Total session duration in seconds
  pageViews: integer("page_views").notNull().default(0),
  events: integer("events").notNull().default(0),
  
  // Entry/Exit
  entryPage: text("entry_page"),
  exitPage: text("exit_page"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  
  // Device info
  userAgent: text("user_agent"),
  deviceType: text("device_type"),
  browser: text("browser"),
  os: text("os"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  
  // Engagement metrics
  bounced: boolean("bounced").notNull().default(false),
  goalCompletions: jsonb("goal_completions").$type<string[]>(), // List of completed goals
  
}, (table) => [
  index("user_sessions_session_id_idx").on(table.sessionId),
  index("user_sessions_user_id_idx").on(table.userId),
  index("user_sessions_start_time_idx").on(table.startTime),
]);

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  startTime: true,
});

export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;

// Common Food Items - Pre-populated onboarding items with USDA data
export const commonFoodItems = pgTable("common_food_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Identifier fields
  displayName: text("display_name").notNull().unique(), // Unique name for the item
  upc: text("upc"), // UPC barcode if available
  fcdId: varchar("fcd_id"), // FDC ID from USDA
  
  // Basic item data
  description: text("description"), // Detailed description from USDA or predefined
  quantity: text("quantity").notNull(), // Default quantity for onboarding
  unit: text("unit").notNull(), // Default unit
  storage: text("storage").notNull(), // Default storage location (Pantry, Fridge, Freezer, etc.)
  expirationDays: integer("expiration_days").notNull(), // Default shelf life in days
  category: text("category"), // Original category from our mapping
  foodCategory: text("food_category"), // Normalized to 5 major groups
  
  // USDA enriched data
  nutrition: jsonb("nutrition"), // Nutrition data from USDA
  usdaData: jsonb("usda_data"), // Full USDA data object
  brandOwner: text("brand_owner"),
  ingredients: text("ingredients"),
  servingSize: text("serving_size"),
  servingSizeUnit: text("serving_size_unit"),
  
  // Image data
  imageUrl: text("image_url"),
  barcodeLookupData: jsonb("barcode_lookup_data"),
  
  // Metadata
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  dataSource: text("data_source"), // 'usda_upc', 'usda_fdc', 'usda_search', 'manual'
}, (table) => [
  index("common_food_items_display_name_idx").on(table.displayName),
  index("common_food_items_upc_idx").on(table.upc),
  index("common_food_items_fcd_id_idx").on(table.fcdId),
  index("common_food_items_category_idx").on(table.category),
  index("common_food_items_food_category_idx").on(table.foodCategory),
]);

export const insertCommonFoodItemSchema = createInsertSchema(commonFoodItems).omit({
  id: true,
  lastUpdated: true,
});

export type InsertCommonFoodItem = z.infer<typeof insertCommonFoodItemSchema>;
export type CommonFoodItem = typeof commonFoodItems.$inferSelect;

// Cooking Terms - Interactive cooking knowledge bank
export const cookingTerms = pgTable("cooking_terms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Term details
  term: text("term").notNull().unique(), // e.g., "julienne", "sauté", "blanch"
  category: text("category").notNull(), // "knife_skills", "cooking_methods", "prep_techniques"
  
  // Definitions
  shortDefinition: text("short_definition").notNull(), // Brief tooltip definition (1-2 sentences)
  longDefinition: text("long_definition").notNull(), // Detailed explanation with steps
  
  // Additional information
  difficulty: text("difficulty"), // "beginner", "intermediate", "advanced"
  timeEstimate: text("time_estimate"), // e.g., "2-3 minutes"
  tools: text("tools").array(), // Tools needed for this technique
  tips: text("tips").array(), // Pro tips and common mistakes
  relatedTerms: text("related_terms").array(), // Related techniques to learn
  
  // Media
  imageUrl: text("image_url"), // Optional illustration
  videoUrl: text("video_url"), // Optional video tutorial link
  
  // Metadata
  searchTerms: text("search_terms").array(), // Alternative names/spellings for matching
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("cooking_terms_term_idx").on(table.term),
  index("cooking_terms_category_idx").on(table.category),
]);

export const insertCookingTermSchema = createInsertSchema(cookingTerms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCookingTerm = z.infer<typeof insertCookingTermSchema>;
export type CookingTerm = typeof cookingTerms.$inferSelect;