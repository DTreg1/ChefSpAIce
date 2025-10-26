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
  
  // Notification preferences
  notificationsEnabled: boolean("notifications_enabled").notNull().default(false),
  notifyExpiringFood: boolean("notify_expiring_food").notNull().default(true),
  notifyRecipeSuggestions: boolean("notify_recipe_suggestions").notNull().default(false),
  notifyMealReminders: boolean("notify_meal_reminders").notNull().default(true),
  notificationTime: text("notification_time").default("09:00"), // Time of day for daily notifications
  
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
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("push_tokens_user_token_idx").on(table.userId, table.token),
  index("push_tokens_user_id_idx").on(table.userId),
]);

export const insertPushTokenSchema = createInsertSchema(pushTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;
export type PushToken = typeof pushTokens.$inferSelect;



// User Appliances - User's kitchen appliances linked to the library
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

export const insertUserApplianceSchema = createInsertSchema(userAppliances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserAppliance = z.infer<typeof insertUserApplianceSchema>;
export type UserAppliance = typeof userAppliances.$inferSelect;

// User Inventory - User's food inventory
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
  usdaData: jsonb("usda_data").$type<any>(), // Full USDA FoodData Central data
  barcodeData: jsonb("barcode_data").$type<any>(), // Full barcode lookup data
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

export const insertUserInventorySchema = createInsertSchema(userInventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserInventory = z.infer<typeof insertUserInventorySchema>;
export type UserInventory = typeof userInventory.$inferSelect;

// Storage Locations Type
export type StorageLocation = {
  id: string;
  name: string;
  icon: string;
};

// Chat Messages - Store conversation history
export const userChats = pgTable("user_chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("user_chats_user_id_idx").on(table.userId),
  index("user_chats_created_at_idx").on(table.createdAt),
]);

export const insertChatMessageSchema = createInsertSchema(userChats).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof userChats.$inferSelect;

// Recipes - User's saved recipes
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
  dietaryInfo: jsonb("dietary_info").$type<string[]>(),
  imageUrl: text("image_url"),
  source: text("source"), // 'manual', 'ai_generated', 'imported'
  aiPrompt: text("ai_prompt"), // If AI generated, store the prompt
  rating: integer("rating"), // 1-5 rating
  notes: text("notes"),
  nutrition: jsonb("nutrition").$type<any>(),
  tags: jsonb("tags").$type<string[]>(),
  neededEquipment: jsonb("needed_equipment").$type<string[]>(), // Required appliances, cookware, bakeware
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_recipes_user_id_idx").on(table.userId),
  index("user_recipes_is_favorite_idx").on(table.isFavorite),
  index("user_recipes_created_at_idx").on(table.createdAt),
]);

export const insertRecipeSchema = createInsertSchema(userRecipes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof userRecipes.$inferSelect;

// Meal Plans - User's planned meals
export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipeId: varchar("recipe_id").notNull().references(() => userRecipes.id, { onDelete: "cascade" }),
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
  queryParams: text("query_params"),
  statusCode: integer("status_code").notNull(),
  success: boolean("success").notNull(),
  timestamp: timestamp("timestamp").notNull(),
}, (table) => [
  index("api_usage_logs_user_id_idx").on(table.userId),
  index("api_usage_logs_api_name_idx").on(table.apiName),
  index("api_usage_logs_timestamp_idx").on(table.timestamp),
  index("api_usage_logs_success_idx").on(table.success),
]);

export const insertApiUsageLogSchema = createInsertSchema(apiUsageLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertApiUsageLog = z.infer<typeof insertApiUsageLogSchema>;
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;

// FDC Cache - Cache USDA FoodData Central responses
export const fdcCache = pgTable("fdc_cache", {
  id: varchar("id").primaryKey(),  // Changed to match database
  fdcId: text("fdc_id").notNull(),
  dataType: text("data_type"), // Nullable to match database
  description: text("description").notNull(),
  brandOwner: text("brand_owner"),
  brandName: text("brand_name"),
  ingredients: text("ingredients"),
  servingSize: real("serving_size"),
  servingSizeUnit: text("serving_size_unit"),
  nutrients: jsonb("nutrients").$type<any>(),  // Changed from foodNutrients to match database
  fullData: jsonb("full_data").$type<any>(),  // Nullable to match database
  cachedAt: timestamp("cached_at").notNull(),
  lastAccessed: timestamp("last_accessed").notNull(),  // Added to match database
}, (table) => [
  index("fdc_cache_description_idx").on(table.description),
  index("fdc_cache_brand_owner_idx").on(table.brandOwner),
]);

export const insertFdcCacheSchema = createInsertSchema(fdcCache).omit({
  id: true,
  cachedAt: true,
  lastAccessed: true,
});

export type InsertFdcCache = z.infer<typeof insertFdcCacheSchema>;
export type FdcCache = typeof fdcCache.$inferSelect;


// Shopping List Items - User's shopping list
export const userShopping = pgTable("user_shopping", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ingredient: text("ingredient").notNull(),  // Changed from 'name' to match database
  quantity: text("quantity"),
  unit: text("unit"),
  recipeId: varchar("recipe_id").references(() => userRecipes.id, { onDelete: "set null" }), // If from a recipe
  isChecked: boolean("is_checked").notNull().default(false),
  createdAt: timestamp("created_at").notNull(),
  fdcId: text("fdc_id"), // Added to match database
}, (table) => [
  index("user_shopping_list_items_user_id_idx").on(table.userId),
  index("user_shopping_list_items_is_checked_idx").on(table.isChecked),
  index("user_shopping_list_items_recipe_id_idx").on(table.recipeId),
]);

export const insertShoppingListItemSchema = createInsertSchema(userShopping).omit({
  id: true,
  createdAt: true,
});

export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
export type ShoppingListItem = typeof userShopping.$inferSelect;

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
export const userFeedback = pgTable("user_feedback", {
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
  index("user_feedback_user_id_idx").on(table.userId),
  index("user_feedback_type_idx").on(table.type),
  index("user_feedback_status_idx").on(table.status),
  index("user_feedback_priority_idx").on(table.priority),
  index("user_feedback_created_at_idx").on(table.createdAt),
]);

export const insertFeedbackSchema = createInsertSchema(userFeedback).omit({
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
export type Feedback = typeof userFeedback.$inferSelect;

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

// Onboarding Inventory - Pre-populated onboarding items with USDA data
export const onboardingInventory = pgTable("onboarding_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Identifier fields
  displayName: text("display_name").notNull().unique(), // Unique name for the item
  upc: text("upc"), // UPC barcode if available
  fdcId: varchar("fdc_id"), // FDC ID from USDA
  
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
  index("onboarding_inventory_display_name_idx").on(table.displayName),
  index("onboarding_inventory_upc_idx").on(table.upc),
  index("onboarding_inventory_fdc_id_idx").on(table.fdcId),
  index("onboarding_inventory_category_idx").on(table.category),
  index("onboarding_inventory_food_category_idx").on(table.foodCategory),
]);

export const insertOnboardingInventorySchema = createInsertSchema(onboardingInventory).omit({
  id: true,
  lastUpdated: true,
});

export type InsertOnboardingInventory = z.infer<typeof insertOnboardingInventorySchema>;
export type OnboardingInventory = typeof onboardingInventory.$inferSelect;

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

// Appliance Library - Master catalog of all available appliances, cookware, and bakeware
export const applianceLibrary = pgTable("appliance_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'appliance', 'cookware', 'bakeware', 'utensil'
  subcategory: text("subcategory"), // 'oven', 'stovetop', 'pans', 'knives', etc.
  brand: text("brand"), // Optional brand for specific items
  model: text("model"), // Optional model
  description: text("description"),
  capabilities: text("capabilities").array(), // ['bake', 'broil', 'toast', 'air fry'] for appliances
  sizeOrCapacity: text("size_or_capacity"), // '9x13"' for pans, '5qt' for pots
  material: text("material"), // 'stainless steel', 'cast iron', 'ceramic'
  isCommon: boolean("is_common").notNull().default(false), // Common items most people have
  imageUrl: text("image_url"),
  searchTerms: text("search_terms").array(), // Alternative names for searching
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("appliance_library_category_idx").on(table.category),
  index("appliance_library_subcategory_idx").on(table.subcategory),
  index("appliance_library_is_common_idx").on(table.isCommon),
]);

export const insertApplianceLibrarySchema = createInsertSchema(applianceLibrary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertApplianceLibrary = z.infer<typeof insertApplianceLibrarySchema>;
export type ApplianceLibrary = typeof applianceLibrary.$inferSelect;

