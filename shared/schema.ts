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
    model?: string;
    osVersion?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("push_tokens_user_id_idx").on(table.userId),
  uniqueIndex("push_tokens_token_idx").on(table.token),
]);

export const insertPushTokenSchema = createInsertSchema(pushTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;
export type PushToken = typeof pushTokens.$inferSelect;

// User Preferences - MERGED INTO users TABLE FOR BETTER PERFORMANCE
// Types preserved for backward compatibility during migration

// Storage Locations - MERGED INTO users TABLE AS JSONB ARRAY
// Types preserved for backward compatibility during migration
export type InsertStorageLocation = {
  name: string;
  icon: string;
};
export type StorageLocation = {
  id: string;
  userId: string;
  name: string;
  icon: string;
};

// Appliance Categories - Define the types of appliances
export const applianceCategories = pgTable("appliance_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // e.g., "Kitchen Tools", "Bakeware", "Countertop Appliances"
  description: text("description"),
  parentCategoryId: varchar("parent_category_id"), // For subcategories
  icon: text("icon"), // Icon identifier for UI
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [
  index("appliance_categories_parent_idx").on(table.parentCategoryId),
]);

export const insertApplianceCategorySchema = createInsertSchema(applianceCategories).omit({
  id: true,
});

export type InsertApplianceCategory = z.infer<typeof insertApplianceCategorySchema>;
export type ApplianceCategory = typeof applianceCategories.$inferSelect;

// Barcode Products - Optimized with JSONB for sparse product attributes
export const barcodeProducts = pgTable("barcode_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Core fields (always present)
  barcodeNumber: text("barcode_number").notNull().unique(),
  title: text("title").notNull(),
  brand: text("brand"),
  category: text("category"), // From barcode API
  
  // All variable/sparse product attributes in JSONB
  productAttributes: jsonb("product_attributes").$type<{
    // Identifiers
    barcodeFormats?: string;
    mpn?: string; // Manufacturer Part Number
    model?: string;
    asin?: string; // Amazon Standard Identification Number
    manufacturer?: string;
    
    // Physical attributes
    color?: string;
    material?: string;
    size?: string;
    weight?: string;
    dimensions?: {
      length?: string;
      width?: string;
      height?: string;
    };
    
    // Product details
    description?: string;
    features?: string[];
    images?: string[];
    
    // Capabilities for appliances
    capabilities?: string[]; // ["grill", "bake", "air_fry", "dehydrate", "broil"]
    capacity?: string; // e.g., "4-qt", "6-qt"
    servingSize?: string; // e.g., "up to 4 servings"
  }>().default({}),
  
  // Store information
  stores: jsonb("stores").$type<Array<{
    name: string;
    country: string;
    currency: string;
    price: string;
    salePrice?: string;
    link?: string;
    availability?: string;
    lastUpdate: string;
  }>>(),
  
  // Cache metadata
  cachedAt: timestamp("cached_at"),
  expiresAt: timestamp("expires_at"),
  lookupFailed: boolean("lookup_failed").notNull().default(false),
  source: text("source"), // 'barcode_lookup' or 'openfoodfacts'
  
  // Complete API response for reference
  rawData: jsonb("raw_data"),
  lastUpdate: timestamp("last_update").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("barcode_products_barcode_idx").on(table.barcodeNumber),
  index("barcode_products_brand_idx").on(table.brand),
  index("barcode_products_category_idx").on(table.category),
]);

export const insertBarcodeProductSchema = createInsertSchema(barcodeProducts).omit({
  id: true,
  createdAt: true,
  lastUpdate: true,
});

export type InsertBarcodeProduct = z.infer<typeof insertBarcodeProductSchema>;
export type BarcodeProduct = typeof barcodeProducts.$inferSelect;

// Kitchen Appliances - Enhanced with barcode product reference
export const appliances = pgTable("appliances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // Legacy field kept for compatibility
  
  // New fields
  categoryId: varchar("category_id").references(() => applianceCategories.id),
  barcodeProductId: varchar("barcode_product_id").references(() => barcodeProducts.id),
  
  // Custom properties (can override barcode data)
  customBrand: text("custom_brand"),
  customModel: text("custom_model"),
  customCapabilities: text("custom_capabilities").array(),
  customCapacity: text("custom_capacity"),
  customServingSize: text("custom_serving_size"),
  
  // User-specific data
  nickname: text("nickname"), // User's custom name for the appliance
  purchaseDate: text("purchase_date"),
  warrantyEndDate: text("warranty_end_date"),
  notes: text("notes"),
  imageUrl: text("image_url"), // Can be from barcode or custom
  isActive: boolean("is_active").notNull().default(true), // If appliance is currently in use
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("appliances_user_id_idx").on(table.userId),
  index("appliances_category_id_idx").on(table.categoryId),
  index("appliances_barcode_product_id_idx").on(table.barcodeProductId),
]);

export const insertApplianceSchema = createInsertSchema(appliances).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
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
  weightInGrams: real("weight_in_grams"), // Actual weight for nutrition calculations (quantity × serving size)
  storageLocationId: varchar("storage_location_id").notNull(), // References id within user's storageLocations JSONB
  expirationDate: text("expiration_date").notNull(),
  
  // Notification state (merged from expirationNotifications table)
  lastNotifiedAt: timestamp("last_notified_at"),
  notificationDismissed: boolean("notification_dismissed").notNull().default(false),
  daysUntilExpiryWhenNotified: integer("days_until_expiry_when_notified"),
  
  imageUrl: text("image_url"),
  nutrition: text("nutrition"),
  usdaData: jsonb("usda_data"), // Complete USDA API response data
  foodCategory: text("food_category"), // USDA food category (e.g., "Vegetables and Vegetable Products")
  addedAt: timestamp("added_at").notNull().defaultNow(),
}, (table) => [
  index("food_items_user_id_idx").on(table.userId),
  index("food_items_expiration_date_idx").on(table.expirationDate),
  index("food_items_notification_dismissed_idx").on(table.notificationDismissed),
]);

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
}, (table) => [
  index("chat_messages_user_id_idx").on(table.userId),
  index("chat_messages_timestamp_idx").on(table.timestamp),
]);

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
}, (table) => [
  index("recipes_user_id_idx").on(table.userId),
  index("recipes_created_at_idx").on(table.createdAt),
]);

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof recipes.$inferSelect;

// Expiration Notifications - MERGED INTO foodItems TABLE
// Notification state is now tracked directly on each food item

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
  gtinUpc?: string;
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
}, (table) => [
  index("meal_plans_user_id_idx").on(table.userId),
  index("meal_plans_date_idx").on(table.date),
]);

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

// API Usage Logs - Track Barcode Lookup API calls
export const apiUsageLogs = pgTable("api_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  apiName: text("api_name").notNull(), // e.g., "barcode_lookup"
  endpoint: text("endpoint").notNull(), // e.g., "search" or "product"
  queryParams: text("query_params"), // e.g., "query=Coca Cola"
  statusCode: integer("status_code").notNull(), // HTTP status
  success: boolean("success").notNull(), // true if data returned
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => [
  index("api_usage_logs_user_id_idx").on(table.userId),
  index("api_usage_logs_timestamp_idx").on(table.timestamp),
]);

export const insertApiUsageLogSchema = createInsertSchema(apiUsageLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertApiUsageLog = z.infer<typeof insertApiUsageLogSchema>;
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;

// FDC API Cache - Store complete food data from USDA FDC API
export const fdcCache = pgTable("fdc_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fdcId: text("fdc_id").notNull().unique(),
  description: text("description").notNull(),
  dataType: text("data_type"),
  brandOwner: text("brand_owner"),
  brandName: text("brand_name"),
  ingredients: text("ingredients"),
  servingSize: real("serving_size"),
  servingSizeUnit: text("serving_size_unit"),
  
  // Store complete nutrient data as JSONB
  nutrients: jsonb("nutrients").$type<Array<{
    nutrientId: number;
    nutrientName: string;
    nutrientNumber: string;
    unitName: string;
    value: number;
  }>>(),
  
  // Store the complete API response for any additional data
  fullData: jsonb("full_data"),
  
  // Cache management
  cachedAt: timestamp("cached_at").notNull().defaultNow(),
  lastAccessed: timestamp("last_accessed").notNull().defaultNow(),
}, (table) => [
  index("fdc_cache_fdc_id_idx").on(table.fdcId),
  index("fdc_cache_description_idx").on(table.description),
]);

export const insertFdcCacheSchema = createInsertSchema(fdcCache).omit({
  id: true,
  cachedAt: true,
  lastAccessed: true,
});

export type InsertFdcCache = z.infer<typeof insertFdcCacheSchema>;
export type FdcCache = typeof fdcCache.$inferSelect;

// FDC Search Queries - Lightweight table that references fdcCache items
export const fdcSearchQueries = pgTable("fdc_search_queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  query: text("query").notNull(),
  dataType: text("data_type"),
  pageNumber: integer("page_number").notNull().default(1),
  pageSize: integer("page_size").notNull().default(50),
  
  // Store only references to FDC items, not duplicate data
  totalHits: integer("total_hits"),
  fdcIds: text("fdc_ids").array(), // Array of fdcId references to fdcCache table
  scores: real("scores").array(), // Relevance scores for each result
  
  cachedAt: timestamp("cached_at").notNull().defaultNow(),
}, (table) => [
  index("fdc_search_queries_idx").on(table.query, table.dataType, table.pageNumber),
]);

export const insertFdcSearchQuerySchema = createInsertSchema(fdcSearchQueries).omit({
  id: true,
  cachedAt: true,
});

export type InsertFdcSearchQuery = z.infer<typeof insertFdcSearchQuerySchema>;
export type FdcSearchQuery = typeof fdcSearchQueries.$inferSelect;

// Shopping List Items - for individual items not tied to meal plans
export const shoppingListItems = pgTable("shopping_list_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ingredient: text("ingredient").notNull(),
  quantity: text("quantity"),
  unit: text("unit"),
  recipeId: varchar("recipe_id"), // Optional reference to the recipe it came from
  isChecked: boolean("is_checked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("shopping_list_items_user_id_idx").on(table.userId),
]);

export const insertShoppingListItemSchema = createInsertSchema(shoppingListItems).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
export type ShoppingListItem = typeof shoppingListItems.$inferSelect;

// Feedback System - Consolidated with upvotes and responses as JSONB
export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'chat_response', 'recipe', 'food_item', 'bug', 'feature', 'general'
  sentiment: text("sentiment"), // 'positive', 'negative', 'neutral'
  rating: integer("rating"), // 1-5 stars for recipes, null for others
  content: text("content"), // User's text feedback
  metadata: jsonb("metadata"), // Additional context data
  contextId: varchar("context_id"), // ID of related entity (recipe_id, chat_message_id, food_item_id)
  contextType: text("context_type"), // Type of related entity
  category: text("category"), // Auto-categorized: 'ui', 'functionality', 'content', 'performance'
  priority: text("priority"), // 'low', 'medium', 'high', 'critical'
  status: text("status").notNull().default('open'), // 'open', 'in_progress', 'completed', 'wont_fix'
  estimatedTurnaround: text("estimated_turnaround"), // e.g., "1-2 weeks", "Next release", "Q2 2025"
  tags: text("tags").array(), // AI-generated tags
  
  // Consolidated upvotes as JSONB array
  upvotes: jsonb("upvotes").$type<Array<{
    userId: string;
    createdAt: string;
  }>>().default([]),
  upvoteCount: integer("upvote_count").notNull().default(0), // Cached count for performance
  
  // Consolidated responses as JSONB array
  responses: jsonb("responses").$type<Array<{
    responderId: string;
    response: string;
    action?: string;
    createdAt: string;
  }>>().default([]),
  
  isFlagged: boolean("is_flagged").notNull().default(false), // Flagged by AI moderator
  flagReason: text("flag_reason"), // Why it was flagged
  similarTo: varchar("similar_to"), // ID of similar/duplicate feedback
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => [
  index("feedback_user_id_idx").on(table.userId),
  index("feedback_type_idx").on(table.type),
  index("feedback_created_at_idx").on(table.createdAt),
  index("feedback_status_idx").on(table.status),
  index("feedback_context_idx").on(table.contextId, table.contextType),
  index("feedback_upvote_count_idx").on(table.upvoteCount),
]);

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
  userId: true,
  createdAt: true,
  resolvedAt: true,
  upvoteCount: true,
  isFlagged: true,
  flagReason: true,
  similarTo: true,
}).extend({
  type: z.enum(['chat_response', 'recipe', 'food_item', 'bug', 'feature', 'general']),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'wont_fix']).optional(),
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
