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
}, (table) => [
  index("storage_locations_user_id_idx").on(table.userId),
]);

export const insertStorageLocationSchema = createInsertSchema(storageLocations).omit({
  id: true,
  userId: true,
});

export type InsertStorageLocation = z.infer<typeof insertStorageLocationSchema>;
export type StorageLocation = typeof storageLocations.$inferSelect;

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

// Barcode Products - Store product data from barcode lookups
export const barcodeProducts = pgTable("barcode_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barcodeNumber: text("barcode_number").notNull().unique(),
  barcodeFormats: text("barcode_formats"),
  mpn: text("mpn"), // Manufacturer Part Number
  model: text("model"),
  asin: text("asin"), // Amazon Standard Identification Number
  title: text("title").notNull(),
  category: text("category"), // From barcode API
  manufacturer: text("manufacturer"),
  brand: text("brand"),
  
  // Physical attributes
  color: text("color"),
  material: text("material"),
  size: text("size"),
  weight: text("weight"),
  dimensions: jsonb("dimensions").$type<{
    length?: string;
    width?: string;
    height?: string;
  }>(),
  
  // Product details
  description: text("description"),
  features: text("features").array(),
  images: text("images").array(),
  
  // Capabilities for appliances (e.g., Ninja Foodi capabilities)
  capabilities: text("capabilities").array(), // ["grill", "bake", "air_fry", "dehydrate", "broil"]
  capacity: text("capacity"), // e.g., "4-qt", "6-qt"
  servingSize: text("serving_size"), // e.g., "up to 4 servings"
  
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
  
  // Metadata
  rawData: jsonb("raw_data"), // Complete API response
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
  storageLocationId: varchar("storage_location_id").notNull(),
  expirationDate: text("expiration_date").notNull(),
  imageUrl: text("image_url"),
  nutrition: text("nutrition"),
  usdaData: jsonb("usda_data"), // Complete USDA API response data
  foodCategory: text("food_category"), // USDA food category (e.g., "Vegetables and Vegetable Products")
  addedAt: timestamp("added_at").notNull().defaultNow(),
}, (table) => [
  index("food_items_user_id_idx").on(table.userId),
  index("food_items_storage_location_id_idx").on(table.storageLocationId),
  index("food_items_expiration_date_idx").on(table.expirationDate),
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
}, (table) => [
  index("expiration_notifications_user_id_idx").on(table.userId),
  index("expiration_notifications_dismissed_idx").on(table.dismissed),
]);

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

// FDC Search Cache - Cache search results to avoid repeated API calls
export const fdcSearchCache = pgTable("fdc_search_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  query: text("query").notNull(),
  dataType: text("data_type"),
  pageNumber: integer("page_number").notNull().default(1),
  pageSize: integer("page_size").notNull().default(50),
  
  // Store search results
  totalHits: integer("total_hits"),
  results: jsonb("results").$type<Array<{
    fdcId: string;
    description: string;
    dataType: string;
    brandOwner?: string;
    brandName?: string;
    score?: number;
  }>>(),
  
  cachedAt: timestamp("cached_at").notNull().defaultNow(),
}, (table) => [
  index("fdc_search_cache_query_idx").on(table.query, table.dataType, table.pageNumber),
]);

export const insertFdcSearchCacheSchema = createInsertSchema(fdcSearchCache).omit({
  id: true,
  cachedAt: true,
});

export type InsertFdcSearchCache = z.infer<typeof insertFdcSearchCacheSchema>;
export type FdcSearchCache = typeof fdcSearchCache.$inferSelect;

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

// Feedback System
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
  upvoteCount: integer("upvote_count").notNull().default(0), // Cached count for performance
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

// Feedback Upvotes - Track who upvoted what
export const feedbackUpvotes = pgTable("feedback_upvotes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  feedbackId: varchar("feedback_id").notNull().references(() => feedback.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("feedback_upvotes_feedback_id_idx").on(table.feedbackId),
  index("feedback_upvotes_user_id_idx").on(table.userId),
  uniqueIndex("feedback_upvotes_unique_idx").on(table.feedbackId, table.userId),
]);

export const insertFeedbackUpvoteSchema = createInsertSchema(feedbackUpvotes).omit({
  id: true,
  createdAt: true,
});

export type InsertFeedbackUpvote = z.infer<typeof insertFeedbackUpvoteSchema>;
export type FeedbackUpvote = typeof feedbackUpvotes.$inferSelect;

// Feedback Responses from admin/team
export const feedbackResponses = pgTable("feedback_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  feedbackId: varchar("feedback_id").notNull().references(() => feedback.id, { onDelete: "cascade" }),
  responderId: varchar("responder_id"), // Admin/team member ID
  response: text("response").notNull(),
  action: text("action"), // What action was taken
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("feedback_responses_feedback_id_idx").on(table.feedbackId),
]);

export const insertFeedbackResponseSchema = createInsertSchema(feedbackResponses).omit({
  id: true,
  createdAt: true,
});

export type InsertFeedbackResponse = z.infer<typeof insertFeedbackResponseSchema>;
export type FeedbackResponse = typeof feedbackResponses.$inferSelect;

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
