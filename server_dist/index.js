var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  DAILY_VALUES: () => DAILY_VALUES,
  appliances: () => appliances,
  authProviders: () => authProviders,
  calculateDailyValuePercent: () => calculateDailyValuePercent,
  cookingTerms: () => cookingTerms,
  feedback: () => feedback,
  feedbackBuckets: () => feedbackBuckets,
  insertApplianceSchema: () => insertApplianceSchema,
  insertCookingTermSchema: () => insertCookingTermSchema,
  insertFeedbackBucketSchema: () => insertFeedbackBucketSchema,
  insertFeedbackSchema: () => insertFeedbackSchema,
  insertNutritionCorrectionSchema: () => insertNutritionCorrectionSchema,
  insertSessionSchema: () => insertSessionSchema,
  insertSubscriptionSchema: () => insertSubscriptionSchema,
  insertSyncDataSchema: () => insertSyncDataSchema,
  insertUserApplianceSchema: () => insertUserApplianceSchema,
  insertUserSchema: () => insertUserSchema,
  mergeNutrition: () => mergeNutrition,
  nutritionCorrections: () => nutritionCorrections,
  scaleNutrition: () => scaleNutrition,
  subscriptions: () => subscriptions,
  userAppliances: () => userAppliances,
  userSessions: () => userSessions,
  userSyncData: () => userSyncData,
  users: () => users
});
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  index,
  boolean,
  uniqueIndex,
  jsonb
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
function calculateDailyValuePercent(value, nutrient) {
  if (value === void 0 || value === 0) return 0;
  const dailyValue = DAILY_VALUES[nutrient];
  if (dailyValue === 0) return 0;
  return Math.round(value / dailyValue * 100);
}
function scaleNutrition(nutrition, multiplier) {
  return {
    servingSize: nutrition.servingSize,
    servingsPerContainer: nutrition.servingsPerContainer,
    calories: Math.round(nutrition.calories * multiplier),
    totalFat: Math.round(nutrition.totalFat * multiplier * 10) / 10,
    saturatedFat: nutrition.saturatedFat !== void 0 ? Math.round(nutrition.saturatedFat * multiplier * 10) / 10 : void 0,
    transFat: nutrition.transFat !== void 0 ? Math.round(nutrition.transFat * multiplier * 10) / 10 : void 0,
    cholesterol: nutrition.cholesterol !== void 0 ? Math.round(nutrition.cholesterol * multiplier) : void 0,
    sodium: Math.round(nutrition.sodium * multiplier),
    totalCarbohydrates: Math.round(nutrition.totalCarbohydrates * multiplier * 10) / 10,
    dietaryFiber: nutrition.dietaryFiber !== void 0 ? Math.round(nutrition.dietaryFiber * multiplier * 10) / 10 : void 0,
    totalSugars: nutrition.totalSugars !== void 0 ? Math.round(nutrition.totalSugars * multiplier * 10) / 10 : void 0,
    addedSugars: nutrition.addedSugars !== void 0 ? Math.round(nutrition.addedSugars * multiplier * 10) / 10 : void 0,
    protein: Math.round(nutrition.protein * multiplier * 10) / 10,
    vitaminD: nutrition.vitaminD !== void 0 ? Math.round(nutrition.vitaminD * multiplier * 10) / 10 : void 0,
    calcium: nutrition.calcium !== void 0 ? Math.round(nutrition.calcium * multiplier) : void 0,
    iron: nutrition.iron !== void 0 ? Math.round(nutrition.iron * multiplier * 10) / 10 : void 0,
    potassium: nutrition.potassium !== void 0 ? Math.round(nutrition.potassium * multiplier) : void 0
  };
}
function mergeNutrition(items) {
  if (items.length === 0) {
    return {
      servingSize: "Combined",
      calories: 0,
      totalFat: 0,
      sodium: 0,
      totalCarbohydrates: 0,
      protein: 0
    };
  }
  const sum = (values) => {
    return values.reduce((acc, val) => acc + (val ?? 0), 0);
  };
  const optionalSum = (values) => {
    const defined = values.filter((v) => v !== void 0);
    if (defined.length === 0) return void 0;
    return sum(defined);
  };
  return {
    servingSize: `${items.length} items combined`,
    servingsPerContainer: void 0,
    calories: sum(items.map((i) => i.calories)),
    totalFat: Math.round(sum(items.map((i) => i.totalFat)) * 10) / 10,
    saturatedFat: optionalSum(items.map((i) => i.saturatedFat)),
    transFat: optionalSum(items.map((i) => i.transFat)),
    cholesterol: optionalSum(items.map((i) => i.cholesterol)),
    sodium: sum(items.map((i) => i.sodium)),
    totalCarbohydrates: Math.round(sum(items.map((i) => i.totalCarbohydrates)) * 10) / 10,
    dietaryFiber: optionalSum(items.map((i) => i.dietaryFiber)),
    totalSugars: optionalSum(items.map((i) => i.totalSugars)),
    addedSugars: optionalSum(items.map((i) => i.addedSugars)),
    protein: Math.round(sum(items.map((i) => i.protein)) * 10) / 10,
    vitaminD: optionalSum(items.map((i) => i.vitaminD)),
    calcium: optionalSum(items.map((i) => i.calcium)),
    iron: optionalSum(items.map((i) => i.iron)),
    potassium: optionalSum(items.map((i) => i.potassium))
  };
}
var users, authProviders, userSessions, userSyncData, cookingTerms, insertUserSchema, insertCookingTermSchema, appliances, userAppliances, insertApplianceSchema, insertUserApplianceSchema, insertSessionSchema, insertSyncDataSchema, DAILY_VALUES, nutritionCorrections, insertNutritionCorrectionSchema, feedbackBuckets, insertFeedbackBucketSchema, feedback, insertFeedbackSchema, subscriptions, insertSubscriptionSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
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
      subscriptionTier: text("subscription_tier").notNull().default("BASIC"),
      subscriptionStatus: text("subscription_status").notNull().default("trialing"),
      stripeCustomerId: text("stripe_customer_id"),
      stripeSubscriptionId: text("stripe_subscription_id"),
      aiRecipesGeneratedThisMonth: integer("ai_recipes_generated_this_month").notNull().default(0),
      aiRecipesResetDate: timestamp("ai_recipes_reset_date"),
      trialEndsAt: timestamp("trial_ends_at")
    });
    authProviders = pgTable(
      "auth_providers",
      {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        userId: varchar("user_id").notNull().references(() => users.id),
        provider: varchar("provider").notNull(),
        providerId: varchar("provider_id").notNull(),
        providerEmail: varchar("provider_email"),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        tokenExpiry: timestamp("token_expiry"),
        isPrimary: boolean("is_primary").default(false),
        metadata: jsonb("metadata"),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow()
      },
      (table) => [
        uniqueIndex("idx_auth_providers_provider_user").on(
          table.provider,
          table.providerId
        ),
        index("idx_auth_providers_user").on(table.userId)
      ]
    );
    userSessions = pgTable(
      "user_sessions",
      {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        userId: varchar("user_id").notNull().references(() => users.id),
        token: text("token").notNull().unique(),
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").defaultNow()
      },
      (table) => [
        index("idx_user_sessions_user").on(table.userId),
        index("idx_user_sessions_expires").on(table.expiresAt)
      ]
    );
    userSyncData = pgTable("user_sync_data", {
      id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
      userId: varchar("user_id").notNull().references(() => users.id).unique(),
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
      updatedAt: timestamp("updated_at").defaultNow()
    });
    cookingTerms = pgTable(
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
        updatedAt: timestamp("updated_at").defaultNow()
      },
      (table) => [
        index("idx_cooking_terms_term").on(table.term),
        index("idx_cooking_terms_category").on(table.category)
      ]
    );
    insertUserSchema = createInsertSchema(users).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    insertCookingTermSchema = createInsertSchema(cookingTerms).omit({
      createdAt: true,
      updatedAt: true
    });
    appliances = pgTable(
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
        updatedAt: timestamp("updated_at").defaultNow()
      },
      (table) => [
        index("idx_appliances_category").on(table.category),
        index("idx_appliances_is_common").on(table.isCommon)
      ]
    );
    userAppliances = pgTable(
      "user_appliances",
      {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        userId: varchar("user_id").notNull().references(() => users.id),
        applianceId: integer("appliance_id").notNull().references(() => appliances.id),
        notes: text("notes"),
        brand: varchar("brand", { length: 100 }),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow()
      },
      (table) => [
        uniqueIndex("idx_user_appliances_unique").on(
          table.userId,
          table.applianceId
        )
      ]
    );
    insertApplianceSchema = createInsertSchema(appliances).omit({
      createdAt: true,
      updatedAt: true
    });
    insertUserApplianceSchema = createInsertSchema(
      userAppliances
    ).omit({
      createdAt: true,
      updatedAt: true
    });
    insertSessionSchema = createInsertSchema(userSessions).omit({
      createdAt: true
    });
    insertSyncDataSchema = createInsertSchema(userSyncData).omit({
      lastSyncedAt: true,
      updatedAt: true
    });
    DAILY_VALUES = {
      totalFat: 78,
      // grams
      saturatedFat: 20,
      // grams
      transFat: 0,
      // grams (no recommended limit, 0 means can't calculate %)
      cholesterol: 300,
      // mg
      sodium: 2300,
      // mg
      totalCarbohydrates: 275,
      // grams
      dietaryFiber: 28,
      // grams
      totalSugars: 0,
      // grams (no daily value)
      addedSugars: 50,
      // grams
      protein: 50,
      // grams
      vitaminD: 20,
      // mcg
      calcium: 1300,
      // mg
      iron: 18,
      // mg
      potassium: 4700
      // mg
    };
    nutritionCorrections = pgTable(
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
        updatedAt: timestamp("updated_at").defaultNow()
      },
      (table) => [
        index("idx_nutrition_corrections_status").on(table.status),
        index("idx_nutrition_corrections_barcode").on(table.barcode),
        index("idx_nutrition_corrections_created").on(table.createdAt)
      ]
    );
    insertNutritionCorrectionSchema = createInsertSchema(
      nutritionCorrections
    ).omit({
      createdAt: true,
      updatedAt: true,
      reviewedAt: true
    });
    feedbackBuckets = pgTable(
      "feedback_buckets",
      {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        title: varchar("title", { length: 200 }).notNull(),
        description: text("description"),
        bucketType: varchar("bucket_type", { length: 20 }).notNull(),
        status: varchar("status", { length: 20 }).default("open").notNull(),
        priority: varchar("priority", { length: 20 }).default("medium"),
        generatedPrompt: text("generated_prompt"),
        completedAt: timestamp("completed_at"),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow()
      },
      (table) => [
        index("idx_feedback_buckets_status").on(table.status),
        index("idx_feedback_buckets_type").on(table.bucketType)
      ]
    );
    insertFeedbackBucketSchema = createInsertSchema(feedbackBuckets).omit({
      createdAt: true,
      updatedAt: true
    });
    feedback = pgTable(
      "feedback",
      {
        id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
        userId: varchar("user_id").references(() => users.id),
        bucketId: integer("bucket_id").references(() => feedbackBuckets.id),
        type: varchar("type", { length: 20 }).notNull(),
        category: varchar("category", { length: 50 }),
        message: text("message").notNull(),
        userEmail: varchar("user_email", { length: 255 }),
        deviceInfo: text("device_info"),
        screenContext: varchar("screen_context", { length: 100 }),
        stepsToReproduce: text("steps_to_reproduce"),
        severity: varchar("severity", { length: 20 }),
        status: varchar("status", { length: 20 }).default("new").notNull(),
        adminNotes: text("admin_notes"),
        priority: varchar("priority", { length: 20 }).default("medium"),
        resolutionPrompt: text("resolution_prompt"),
        assignedTo: varchar("assigned_to", { length: 100 }),
        resolvedAt: timestamp("resolved_at"),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow()
      },
      (table) => [
        index("idx_feedback_type").on(table.type),
        index("idx_feedback_status").on(table.status),
        index("idx_feedback_created").on(table.createdAt),
        index("idx_feedback_priority").on(table.priority),
        index("idx_feedback_bucket").on(table.bucketId)
      ]
    );
    insertFeedbackSchema = createInsertSchema(feedback).omit({
      createdAt: true,
      updatedAt: true
    });
    subscriptions = pgTable(
      "subscriptions",
      {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        userId: varchar("user_id").notNull().references(() => users.id).unique(),
        stripeCustomerId: varchar("stripe_customer_id"),
        stripeSubscriptionId: varchar("stripe_subscription_id"),
        stripePriceId: varchar("stripe_price_id"),
        status: varchar("status", { length: 20 }).notNull(),
        planType: varchar("plan_type", { length: 20 }).notNull(),
        currentPeriodStart: timestamp("current_period_start").notNull(),
        currentPeriodEnd: timestamp("current_period_end").notNull(),
        trialStart: timestamp("trial_start"),
        trialEnd: timestamp("trial_end"),
        cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
        canceledAt: timestamp("canceled_at"),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow()
      },
      (table) => [
        index("idx_subscriptions_stripe_customer").on(table.stripeCustomerId),
        index("idx_subscriptions_stripe_subscription").on(table.stripeSubscriptionId),
        index("idx_subscriptions_status").on(table.status)
      ]
    );
    insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
  }
});

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 5e3
    });
    db = drizzle(pool, { schema: schema_exports });
  }
});

// server/lib/chat-actions.ts
var chat_actions_exports = {};
__export(chat_actions_exports, {
  chatFunctionDefinitions: () => chatFunctionDefinitions,
  executeAddInventoryItem: () => executeAddInventoryItem,
  executeAddToShoppingList: () => executeAddToShoppingList,
  executeChatAction: () => executeChatAction,
  executeConsumeItem: () => executeConsumeItem,
  executeCreateMealPlan: () => executeCreateMealPlan,
  executeGenerateRecipe: () => executeGenerateRecipe,
  executeGetInventorySummary: () => executeGetInventorySummary,
  executeSaveFeedback: () => executeSaveFeedback,
  executeWasteItem: () => executeWasteItem,
  getUserSyncData: () => getUserSyncData2
});
import { eq as eq12 } from "drizzle-orm";
import OpenAI8 from "openai";
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function getDefaultExpirationDate(daysFromNow = 7) {
  const date2 = /* @__PURE__ */ new Date();
  date2.setDate(date2.getDate() + daysFromNow);
  return date2.toISOString().split("T")[0];
}
function getTodayDate() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
async function getUserSyncData2(userId) {
  const existingSyncData = await db.select().from(userSyncData).where(eq12(userSyncData.userId, userId));
  if (existingSyncData.length === 0) {
    return {
      inventory: [],
      recipes: [],
      mealPlans: [],
      shoppingList: [],
      wasteLog: [],
      consumedLog: [],
      preferences: null,
      cookware: []
    };
  }
  const data = existingSyncData[0];
  return {
    inventory: data.inventory ? JSON.parse(data.inventory) : [],
    recipes: data.recipes ? JSON.parse(data.recipes) : [],
    mealPlans: data.mealPlans ? JSON.parse(data.mealPlans) : [],
    shoppingList: data.shoppingList ? JSON.parse(data.shoppingList) : [],
    wasteLog: data.wasteLog ? JSON.parse(data.wasteLog) : [],
    consumedLog: data.consumedLog ? JSON.parse(data.consumedLog) : [],
    preferences: data.preferences ? JSON.parse(data.preferences) : null,
    cookware: data.cookware ? JSON.parse(data.cookware) : []
  };
}
async function updateUserSyncData(userId, updates) {
  const existingSyncData = await db.select().from(userSyncData).where(eq12(userSyncData.userId, userId));
  const updatePayload = {
    lastSyncedAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  };
  for (const [key, value] of Object.entries(updates)) {
    updatePayload[key] = JSON.stringify(value);
  }
  if (existingSyncData.length === 0) {
    await db.insert(userSyncData).values({
      userId,
      ...updatePayload
    });
  } else {
    await db.update(userSyncData).set(updatePayload).where(eq12(userSyncData.userId, userId));
  }
}
async function executeAddInventoryItem(userId, args) {
  try {
    const userData = await getUserSyncData2(userId);
    const newItem = {
      id: generateId(),
      name: args.name,
      quantity: args.quantity,
      unit: args.unit,
      storageLocation: args.storageLocation,
      category: args.category,
      purchaseDate: getTodayDate(),
      expirationDate: getDefaultExpirationDate(args.expirationDays || 7),
      notes: args.notes
    };
    userData.inventory.push(newItem);
    await updateUserSyncData(userId, { inventory: userData.inventory });
    return {
      success: true,
      message: `Added ${args.quantity} ${args.unit} of ${args.name} to your ${args.storageLocation}.`,
      data: newItem,
      actionType: "add_inventory_item"
    };
  } catch (error) {
    console.error("Error adding inventory item:", error);
    return {
      success: false,
      message: `Failed to add ${args.name} to inventory.`,
      actionType: "add_inventory_item"
    };
  }
}
async function executeConsumeItem(userId, args) {
  try {
    const userData = await getUserSyncData2(userId);
    const itemNameLower = args.itemName.toLowerCase();
    const itemIndex = userData.inventory.findIndex(
      (item2) => item2.name.toLowerCase().includes(itemNameLower) || itemNameLower.includes(item2.name.toLowerCase())
    );
    if (itemIndex === -1) {
      return {
        success: false,
        message: `Could not find "${args.itemName}" in your inventory.`,
        actionType: "consume_inventory_item"
      };
    }
    const item = userData.inventory[itemIndex];
    const consumedEntry = {
      id: generateId(),
      itemName: item.name,
      quantity: args.quantity || item.quantity,
      unit: args.unit || item.unit,
      consumedAt: (/* @__PURE__ */ new Date()).toISOString(),
      originalItemId: item.id
    };
    userData.consumedLog.push(consumedEntry);
    if (args.removeCompletely || !args.quantity || args.quantity >= item.quantity) {
      userData.inventory.splice(itemIndex, 1);
    } else {
      userData.inventory[itemIndex].quantity -= args.quantity;
    }
    await updateUserSyncData(userId, {
      inventory: userData.inventory,
      consumedLog: userData.consumedLog
    });
    return {
      success: true,
      message: `Marked ${args.quantity || item.quantity} ${args.unit || item.unit} of ${item.name} as consumed.`,
      data: consumedEntry,
      actionType: "consume_inventory_item"
    };
  } catch (error) {
    console.error("Error consuming item:", error);
    return {
      success: false,
      message: `Failed to mark ${args.itemName} as consumed.`,
      actionType: "consume_inventory_item"
    };
  }
}
async function executeWasteItem(userId, args) {
  try {
    const userData = await getUserSyncData2(userId);
    const itemNameLower = args.itemName.toLowerCase();
    const itemIndex = userData.inventory.findIndex(
      (item2) => item2.name.toLowerCase().includes(itemNameLower) || itemNameLower.includes(item2.name.toLowerCase())
    );
    if (itemIndex === -1) {
      return {
        success: false,
        message: `Could not find "${args.itemName}" in your inventory.`,
        actionType: "waste_inventory_item"
      };
    }
    const item = userData.inventory[itemIndex];
    const wasteEntry = {
      id: generateId(),
      itemName: item.name,
      quantity: args.quantity || item.quantity,
      unit: args.unit || item.unit,
      reason: args.reason,
      wastedAt: (/* @__PURE__ */ new Date()).toISOString(),
      originalItemId: item.id
    };
    userData.wasteLog.push(wasteEntry);
    if (args.removeCompletely || !args.quantity || args.quantity >= item.quantity) {
      userData.inventory.splice(itemIndex, 1);
    } else {
      userData.inventory[itemIndex].quantity -= args.quantity;
    }
    await updateUserSyncData(userId, {
      inventory: userData.inventory,
      wasteLog: userData.wasteLog
    });
    return {
      success: true,
      message: `Logged ${args.quantity || item.quantity} ${args.unit || item.unit} of ${item.name} as wasted (${args.reason}).`,
      data: wasteEntry,
      actionType: "waste_inventory_item"
    };
  } catch (error) {
    console.error("Error logging waste:", error);
    return {
      success: false,
      message: `Failed to log ${args.itemName} as wasted.`,
      actionType: "waste_inventory_item"
    };
  }
}
async function executeGenerateRecipe(userId, args) {
  try {
    const userData = await getUserSyncData2(userId);
    if (userData.inventory.length === 0) {
      return {
        success: false,
        message: "You don't have any items in your inventory yet. Add some ingredients first, and I can suggest recipes based on what you have!",
        actionType: "generate_recipe"
      };
    }
    const inventoryList = userData.inventory.map((item) => item.name).join(", ");
    const recipePrompt = `Based on these available ingredients: ${inventoryList}

Generate a simple, practical recipe with these preferences:
${args.mealType ? `- Meal type: ${args.mealType}` : ""}
${args.cuisine ? `- Cuisine style: ${args.cuisine}` : ""}
${args.maxTime ? `- Max cooking time: ${args.maxTime} minutes` : ""}
${args.servings ? `- Servings: ${args.servings}` : "- Servings: 4"}
${args.quickRecipe ? "- This should be a quick recipe (under 20 minutes)" : ""}
${args.prioritizeExpiring ? "- Prioritize using ingredients that might expire soon" : ""}

Return the recipe in this JSON format:
{
  "title": "Recipe Name",
  "description": "Brief appetizing description",
  "ingredients": [{"name": "ingredient", "quantity": 1, "unit": "cup"}],
  "instructions": ["Step 1...", "Step 2..."],
  "prepTime": 10,
  "cookTime": 20,
  "servings": 4
}`;
    const completion = await openai7.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful chef assistant. Generate practical, easy-to-follow recipes based on available ingredients. Always respond with valid JSON."
        },
        { role: "user", content: recipePrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024
    });
    const recipeContent = completion.choices[0]?.message?.content;
    if (!recipeContent) {
      throw new Error("No recipe generated");
    }
    const recipe = JSON.parse(recipeContent);
    const savedRecipe = {
      id: generateId(),
      ...recipe,
      isFavorite: false,
      isAIGenerated: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    userData.recipes.push(savedRecipe);
    await updateUserSyncData(userId, { recipes: userData.recipes });
    return {
      success: true,
      message: `Generated recipe: ${recipe.title}. ${recipe.description}`,
      data: savedRecipe,
      actionType: "generate_recipe"
    };
  } catch (error) {
    console.error("Error generating recipe:", error);
    return {
      success: false,
      message: "Failed to generate a recipe. Please try again.",
      actionType: "generate_recipe"
    };
  }
}
async function executeCreateMealPlan(userId, args) {
  try {
    const userData = await getUserSyncData2(userId);
    if (userData.inventory.length === 0) {
      return {
        success: false,
        message: "You need some ingredients in your inventory first to create a meal plan.",
        actionType: "create_meal_plan"
      };
    }
    const inventoryList = userData.inventory.map((item) => item.name).join(", ");
    const daysCount = args.daysCount || 7;
    const mealsPerDay = args.mealsPerDay || ["breakfast", "lunch", "dinner"];
    const mealPlanPrompt = `Create a ${daysCount}-day meal plan using these available ingredients: ${inventoryList}

Requirements:
- Include these meals each day: ${mealsPerDay.join(", ")}
${args.dietaryRestrictions ? `- Dietary restrictions: ${args.dietaryRestrictions}` : ""}
- Focus on variety and balanced nutrition
- Use the available ingredients efficiently

Return as JSON:
{
  "days": [
    {
      "dayNumber": 1,
      "meals": {
        "breakfast": "Meal name and brief description",
        "lunch": "Meal name and brief description",
        "dinner": "Meal name and brief description"
      }
    }
  ],
  "shoppingNeeded": ["any additional items needed"]
}`;
    const completion = await openai7.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a meal planning expert. Create practical, balanced meal plans using available ingredients. Always respond with valid JSON."
        },
        { role: "user", content: mealPlanPrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048
    });
    const planContent = completion.choices[0]?.message?.content;
    if (!planContent) {
      throw new Error("No meal plan generated");
    }
    const planData = JSON.parse(planContent);
    const startDate = args.startDate || getTodayDate();
    const mealPlans = planData.days.map((day, index2) => {
      const date2 = new Date(startDate);
      date2.setDate(date2.getDate() + index2);
      return {
        id: generateId(),
        date: date2.toISOString().split("T")[0],
        meals: day.meals
      };
    });
    userData.mealPlans = [...userData.mealPlans, ...mealPlans];
    if (planData.shoppingNeeded && planData.shoppingNeeded.length > 0) {
      const newShoppingItems = planData.shoppingNeeded.map((item) => ({
        id: generateId(),
        name: item,
        quantity: 1,
        unit: "item",
        isChecked: false
      }));
      userData.shoppingList = [...userData.shoppingList, ...newShoppingItems];
    }
    await updateUserSyncData(userId, {
      mealPlans: userData.mealPlans,
      shoppingList: userData.shoppingList
    });
    let message = `Created a ${daysCount}-day meal plan for you!`;
    if (planData.shoppingNeeded && planData.shoppingNeeded.length > 0) {
      message += ` Also added ${planData.shoppingNeeded.length} items to your shopping list.`;
    }
    return {
      success: true,
      message,
      data: { mealPlans, shoppingNeeded: planData.shoppingNeeded },
      actionType: "create_meal_plan"
    };
  } catch (error) {
    console.error("Error creating meal plan:", error);
    return {
      success: false,
      message: "Failed to create meal plan. Please try again.",
      actionType: "create_meal_plan"
    };
  }
}
async function executeAddToShoppingList(userId, args) {
  try {
    const userData = await getUserSyncData2(userId);
    const newItems = args.items.map((item) => ({
      id: generateId(),
      name: item.name,
      quantity: item.quantity || 1,
      unit: item.unit || "item",
      isChecked: false,
      category: item.category
    }));
    userData.shoppingList = [...userData.shoppingList, ...newItems];
    await updateUserSyncData(userId, { shoppingList: userData.shoppingList });
    const itemNames = args.items.map((i) => i.name).join(", ");
    return {
      success: true,
      message: `Added ${args.items.length} item(s) to your shopping list: ${itemNames}`,
      data: newItems,
      actionType: "add_to_shopping_list"
    };
  } catch (error) {
    console.error("Error adding to shopping list:", error);
    return {
      success: false,
      message: "Failed to add items to shopping list.",
      actionType: "add_to_shopping_list"
    };
  }
}
async function executeGetInventorySummary(userId, args) {
  try {
    const userData = await getUserSyncData2(userId);
    let inventory = userData.inventory;
    if (args.category) {
      inventory = inventory.filter(
        (item) => item.category.toLowerCase() === args.category.toLowerCase()
      );
    }
    if (args.storageLocation) {
      inventory = inventory.filter(
        (item) => item.storageLocation === args.storageLocation
      );
    }
    if (args.expiringOnly) {
      const fiveDaysFromNow = /* @__PURE__ */ new Date();
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
      inventory = inventory.filter((item) => {
        const expDate = new Date(item.expirationDate);
        return expDate <= fiveDaysFromNow;
      });
    }
    if (inventory.length === 0) {
      return {
        success: true,
        message: args.expiringOnly ? "You don't have any items expiring soon. Great job managing your pantry!" : "Your inventory is empty. Would you like to add some items?",
        data: [],
        actionType: "get_inventory_summary"
      };
    }
    const summary = inventory.map(
      (item) => `${item.quantity} ${item.unit} ${item.name} (${item.storageLocation})`
    ).join("\n");
    return {
      success: true,
      message: `Here's what you have:
${summary}`,
      data: inventory,
      actionType: "get_inventory_summary"
    };
  } catch (error) {
    console.error("Error getting inventory summary:", error);
    return {
      success: false,
      message: "Failed to retrieve inventory.",
      actionType: "get_inventory_summary"
    };
  }
}
async function executeSaveFeedback(userId, args) {
  try {
    const feedbackEntry = await db.insert(feedback).values({
      userId,
      type: args.type,
      category: args.category || null,
      message: args.message,
      userEmail: args.userEmail || null,
      stepsToReproduce: args.stepsToReproduce || null,
      severity: args.severity || null,
      status: "new"
    }).returning();
    console.log(`[Chat] Feedback saved:`, feedbackEntry[0].id);
    const thankYouMessage = args.type === "bug" ? "Thank you for reporting this issue! Our team will look into it and work on a fix." : "Thank you for your feedback! We really appreciate you taking the time to share your thoughts.";
    return {
      success: true,
      message: thankYouMessage,
      data: { feedbackId: feedbackEntry[0].id },
      actionType: "save_feedback"
    };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return {
      success: false,
      message: "I'm sorry, there was an issue saving your feedback. Please try again later.",
      actionType: "save_feedback"
    };
  }
}
async function executeChatAction(userId, functionName, args) {
  switch (functionName) {
    case "add_inventory_item":
      return executeAddInventoryItem(userId, args);
    case "consume_inventory_item":
      return executeConsumeItem(userId, args);
    case "waste_inventory_item":
      return executeWasteItem(userId, args);
    case "generate_recipe":
      return executeGenerateRecipe(userId, args);
    case "create_meal_plan":
      return executeCreateMealPlan(userId, args);
    case "add_to_shopping_list":
      return executeAddToShoppingList(userId, args);
    case "get_inventory_summary":
      return executeGetInventorySummary(userId, args);
    case "save_feedback":
      return executeSaveFeedback(userId, args);
    default:
      return {
        success: false,
        message: `Unknown action: ${functionName}`,
        actionType: functionName
      };
  }
}
var openai7, chatFunctionDefinitions;
var init_chat_actions = __esm({
  "server/lib/chat-actions.ts"() {
    "use strict";
    init_db();
    init_schema();
    openai7 = new OpenAI8({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
    });
    chatFunctionDefinitions = [
      {
        type: "function",
        function: {
          name: "add_inventory_item",
          description: "Add a new food item to the user's pantry inventory. Use this when the user says they bought something, added something to their pantry, or wants to track a new item.",
          parameters: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "The name of the food item (e.g., 'Chicken Breast', 'Milk', 'Apples')"
              },
              quantity: {
                type: "number",
                description: "The quantity of the item (e.g., 2, 1.5, 12)"
              },
              unit: {
                type: "string",
                description: "The unit of measurement (e.g., 'lbs', 'oz', 'count', 'cups', 'gallons')"
              },
              storageLocation: {
                type: "string",
                enum: ["fridge", "freezer", "pantry", "counter"],
                description: "Where the item is stored"
              },
              category: {
                type: "string",
                enum: ["Produce", "Dairy", "Meat", "Seafood", "Bakery", "Frozen", "Canned", "Beverages", "Snacks", "Condiments", "Grains", "Legumes", "Pantry Staples", "Other"],
                description: "The category of the food item"
              },
              expirationDays: {
                type: "number",
                description: "Number of days until expiration. If not specified, defaults based on food type."
              },
              notes: {
                type: "string",
                description: "Optional notes about the item"
              }
            },
            required: ["name", "quantity", "unit", "storageLocation", "category"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "consume_inventory_item",
          description: "Mark a food item as consumed/used. Use this when the user says they ate something, used an ingredient, or cooked with something from their inventory.",
          parameters: {
            type: "object",
            properties: {
              itemName: {
                type: "string",
                description: "The name of the item that was consumed"
              },
              quantity: {
                type: "number",
                description: "How much was consumed"
              },
              unit: {
                type: "string",
                description: "The unit of measurement"
              },
              removeCompletely: {
                type: "boolean",
                description: "If true, removes the entire item from inventory. If false, just reduces the quantity."
              }
            },
            required: ["itemName"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "waste_inventory_item",
          description: "Log a food item as wasted/thrown away. Use this when the user says something went bad, expired, or they had to throw something out.",
          parameters: {
            type: "object",
            properties: {
              itemName: {
                type: "string",
                description: "The name of the item that was wasted"
              },
              quantity: {
                type: "number",
                description: "How much was wasted"
              },
              unit: {
                type: "string",
                description: "The unit of measurement"
              },
              reason: {
                type: "string",
                enum: ["expired", "spoiled", "forgot", "didn't like", "too much", "other"],
                description: "Why the item was wasted"
              },
              removeCompletely: {
                type: "boolean",
                description: "If true, removes the entire item from inventory. If false, just reduces the quantity."
              }
            },
            required: ["itemName", "reason"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "generate_recipe",
          description: "Generate a recipe based on the user's available ingredients. Use this when the user asks for recipe ideas, wants to know what to cook, or asks for meal suggestions.",
          parameters: {
            type: "object",
            properties: {
              mealType: {
                type: "string",
                enum: ["breakfast", "lunch", "dinner", "snack"],
                description: "The type of meal"
              },
              cuisine: {
                type: "string",
                description: "Preferred cuisine style (e.g., 'Italian', 'Mexican', 'Asian')"
              },
              maxTime: {
                type: "number",
                description: "Maximum cooking time in minutes"
              },
              servings: {
                type: "number",
                description: "Number of servings"
              },
              prioritizeExpiring: {
                type: "boolean",
                description: "Whether to prioritize ingredients that are expiring soon"
              },
              quickRecipe: {
                type: "boolean",
                description: "If true, generate a recipe that can be made in under 20 minutes"
              }
            },
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_meal_plan",
          description: "Create a weekly meal plan for the user. Use this when the user asks for meal planning, wants to plan their week, or asks for a weekly menu.",
          parameters: {
            type: "object",
            properties: {
              startDate: {
                type: "string",
                description: "The start date for the meal plan (YYYY-MM-DD format). Defaults to today."
              },
              daysCount: {
                type: "number",
                description: "Number of days to plan for (1-7). Defaults to 7."
              },
              mealsPerDay: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["breakfast", "lunch", "dinner", "snack"]
                },
                description: "Which meals to include in the plan"
              },
              dietaryRestrictions: {
                type: "string",
                description: "Any dietary restrictions to consider"
              }
            },
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_to_shopping_list",
          description: "Add items to the user's shopping list. Use this when the user says they need to buy something, are running low on something, or want to add items to their grocery list.",
          parameters: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Name of the item to buy" },
                    quantity: { type: "number", description: "Quantity needed" },
                    unit: { type: "string", description: "Unit of measurement" },
                    category: { type: "string", description: "Category for grouping in store" }
                  },
                  required: ["name"]
                },
                description: "List of items to add to the shopping list"
              }
            },
            required: ["items"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_inventory_summary",
          description: "Get a summary of the user's current inventory. Use this when the user asks what they have, wants to know their stock, or asks about specific items.",
          parameters: {
            type: "object",
            properties: {
              category: {
                type: "string",
                description: "Filter by specific category"
              },
              expiringOnly: {
                type: "boolean",
                description: "Only show items expiring within 5 days"
              },
              storageLocation: {
                type: "string",
                enum: ["fridge", "freezer", "pantry", "counter"],
                description: "Filter by storage location"
              }
            },
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "save_feedback",
          description: "Save user feedback or bug report. Use this when the user wants to send feedback, report a bug, make a suggestion, or report an issue with the app.",
          parameters: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["feedback", "bug"],
                description: "Whether this is general feedback or a bug report"
              },
              category: {
                type: "string",
                enum: ["suggestion", "general", "compliment", "question", "crash", "ui", "data", "performance"],
                description: "The category of feedback. For feedback: suggestion, general, compliment, question. For bugs: crash, ui, data, performance."
              },
              message: {
                type: "string",
                description: "The main content of the feedback or bug description"
              },
              stepsToReproduce: {
                type: "string",
                description: "For bug reports: steps to reproduce the issue"
              },
              severity: {
                type: "string",
                enum: ["minor", "major", "critical"],
                description: "For bug reports: how severe is the issue"
              },
              userEmail: {
                type: "string",
                description: "User's email for follow-up (optional)"
              }
            },
            required: ["type", "message"]
          }
        }
      }
    ];
  }
});

// server/index.ts
import express from "express";
import fileUpload from "express-fileupload";
import cookieParser from "cookie-parser";
import { createProxyMiddleware } from "http-proxy-middleware";

// server/routes.ts
import { createServer } from "node:http";
import OpenAI9 from "openai";
import { z as z7 } from "zod";
import { eq as eq13 } from "drizzle-orm";

// server/lib/shelf-life-data.ts
var SHELF_LIFE_DATA = [
  {
    category: "milk",
    refrigerator: 7,
    freezer: 90,
    pantry: 0,
    counter: 0,
    notes: "Use within 7 days of opening. Freeze in airtight container leaving room for expansion."
  },
  {
    category: "cheese",
    refrigerator: 14,
    freezer: 60,
    pantry: 0,
    counter: 0,
    notes: "Hard cheeses last longer than soft cheeses. Wrap tightly to prevent drying."
  },
  {
    category: "yogurt",
    refrigerator: 14,
    freezer: 60,
    pantry: 0,
    counter: 0,
    notes: "Check expiration date. Freezing may change texture but is safe."
  },
  {
    category: "beef",
    refrigerator: 5,
    freezer: 365,
    pantry: 0,
    counter: 0,
    notes: "Ground beef lasts 1-2 days in fridge, steaks 3-5 days. Freeze for longer storage."
  },
  {
    category: "chicken",
    refrigerator: 3,
    freezer: 270,
    pantry: 0,
    counter: 0,
    notes: "Raw chicken should be used within 1-2 days. Cooked chicken lasts 3-4 days."
  },
  {
    category: "pork",
    refrigerator: 5,
    freezer: 180,
    pantry: 0,
    counter: 0,
    notes: "Fresh pork lasts 3-5 days refrigerated. Cured pork products last longer."
  },
  {
    category: "seafood",
    refrigerator: 2,
    freezer: 180,
    pantry: 0,
    counter: 0,
    notes: "Fresh fish is highly perishable. Use within 1-2 days or freeze immediately."
  },
  {
    category: "fruits",
    refrigerator: 7,
    freezer: 300,
    pantry: 3,
    counter: 5,
    notes: "Ripeness varies. Some fruits ripen on counter, then refrigerate. Freeze for smoothies."
  },
  {
    category: "vegetables",
    refrigerator: 7,
    freezer: 300,
    pantry: 0,
    counter: 3,
    notes: "Leafy greens last 3-5 days. Root vegetables can last weeks. Blanch before freezing."
  },
  {
    category: "bread",
    refrigerator: 7,
    freezer: 90,
    pantry: 5,
    counter: 7,
    notes: "Store at room temperature for best texture. Freeze to extend shelf life."
  },
  {
    category: "bakery",
    refrigerator: 5,
    freezer: 90,
    pantry: 3,
    counter: 5,
    notes: "Pastries and baked goods vary. Most freeze well for later use."
  },
  {
    category: "eggs",
    refrigerator: 35,
    freezer: 365,
    pantry: 0,
    counter: 0,
    notes: "Keep in original carton. Can freeze beaten eggs. Do not freeze in shell."
  },
  {
    category: "condiments",
    refrigerator: 180,
    freezer: 0,
    pantry: 365,
    counter: 0,
    notes: "Refrigerate after opening. Check individual product labels for specific guidance."
  },
  {
    category: "canned goods",
    refrigerator: 7,
    freezer: 60,
    pantry: 1825,
    counter: 0,
    notes: "Unopened cans last 1-5 years. Once opened, transfer to container and refrigerate."
  },
  {
    category: "frozen foods",
    refrigerator: 3,
    freezer: 365,
    pantry: 0,
    counter: 0,
    notes: "Keep frozen until ready to use. Once thawed, use within 3-4 days."
  },
  {
    category: "leftovers",
    refrigerator: 4,
    freezer: 90,
    pantry: 0,
    counter: 0,
    notes: "Refrigerate within 2 hours of cooking. Label with date when freezing."
  },
  {
    category: "beverages",
    refrigerator: 14,
    freezer: 180,
    pantry: 365,
    counter: 7,
    notes: "Varies widely by type. Check individual product for best guidance."
  },
  {
    category: "grains",
    refrigerator: 180,
    freezer: 365,
    pantry: 730,
    counter: 0,
    notes: "Store in airtight containers. Whole grains last longer when refrigerated."
  },
  {
    category: "pasta",
    refrigerator: 5,
    freezer: 180,
    pantry: 730,
    counter: 0,
    notes: "Dry pasta lasts 1-2 years. Cooked pasta lasts 3-5 days refrigerated."
  },
  {
    category: "snacks",
    refrigerator: 30,
    freezer: 180,
    pantry: 60,
    counter: 30,
    notes: "Keep in airtight containers to maintain freshness. Check for staleness."
  },
  {
    category: "spices",
    refrigerator: 730,
    freezer: 1460,
    pantry: 1460,
    counter: 365,
    notes: "Ground spices lose potency faster than whole. Store away from heat and light."
  },
  {
    category: "butter",
    refrigerator: 30,
    freezer: 270,
    pantry: 0,
    counter: 7,
    notes: "Salted butter lasts longer. Keep wrapped to prevent absorption of odors."
  },
  {
    category: "deli meat",
    refrigerator: 5,
    freezer: 60,
    pantry: 0,
    counter: 0,
    notes: "Use within 3-5 days of opening. Freeze in portions for convenience."
  },
  {
    category: "juice",
    refrigerator: 10,
    freezer: 365,
    pantry: 365,
    counter: 0,
    notes: "Fresh juice lasts 3-5 days. Concentrated juice lasts longer when frozen."
  },
  {
    category: "nuts",
    refrigerator: 180,
    freezer: 365,
    pantry: 90,
    counter: 30,
    notes: "Refrigerate or freeze for extended storage. Oils can go rancid at room temperature."
  },
  {
    category: "sauces",
    refrigerator: 30,
    freezer: 90,
    pantry: 365,
    counter: 0,
    notes: "Refrigerate after opening. Tomato-based sauces last shorter than vinegar-based."
  },
  {
    category: "herbs",
    refrigerator: 7,
    freezer: 180,
    pantry: 365,
    counter: 3,
    notes: "Fresh herbs are delicate. Dried herbs last longer in pantry."
  },
  {
    category: "cream",
    refrigerator: 7,
    freezer: 60,
    pantry: 0,
    counter: 0,
    notes: "Heavy cream lasts longer than light cream. Whipped cream should be used quickly."
  },
  {
    category: "tofu",
    refrigerator: 7,
    freezer: 150,
    pantry: 0,
    counter: 0,
    notes: "Opened tofu should be covered in water and used within a week."
  },
  {
    category: "pickles",
    refrigerator: 365,
    freezer: 0,
    pantry: 730,
    counter: 0,
    notes: "Unopened pickles last 1-2 years. Refrigerate after opening."
  }
];
var categoryKeywords = {
  milk: ["dairy", "cream", "lactose", "half and half", "creamer"],
  cheese: [
    "cheddar",
    "mozzarella",
    "parmesan",
    "brie",
    "gouda",
    "swiss",
    "feta",
    "ricotta"
  ],
  yogurt: ["greek", "probiotic", "kefir"],
  beef: ["steak", "ground beef", "roast", "brisket", "ribeye", "sirloin"],
  chicken: [
    "poultry",
    "turkey",
    "duck",
    "wings",
    "breast",
    "thigh",
    "drumstick"
  ],
  pork: ["bacon", "ham", "sausage", "chop", "tenderloin", "ribs"],
  seafood: [
    "fish",
    "salmon",
    "tuna",
    "shrimp",
    "lobster",
    "crab",
    "shellfish",
    "cod",
    "tilapia"
  ],
  fruits: [
    "apple",
    "banana",
    "orange",
    "berry",
    "grape",
    "melon",
    "citrus",
    "mango",
    "pear"
  ],
  vegetables: [
    "carrot",
    "broccoli",
    "spinach",
    "lettuce",
    "tomato",
    "onion",
    "pepper",
    "celery",
    "cucumber"
  ],
  bread: ["loaf", "baguette", "roll", "toast", "sourdough", "pita", "naan"],
  bakery: ["cake", "pastry", "cookie", "muffin", "croissant", "donut", "pie"],
  eggs: ["egg", "omelette"],
  condiments: [
    "ketchup",
    "mustard",
    "mayo",
    "mayonnaise",
    "salsa",
    "dressing",
    "relish"
  ],
  leftovers: ["leftover", "cooked", "prepared"],
  grains: ["rice", "quinoa", "oat", "barley", "wheat", "couscous", "bulgur"],
  pasta: [
    "spaghetti",
    "noodle",
    "macaroni",
    "penne",
    "linguine",
    "fettuccine",
    "ravioli"
  ],
  snacks: ["chip", "cracker", "pretzel", "popcorn", "trail mix"],
  spices: [
    "spice",
    "seasoning",
    "cumin",
    "paprika",
    "oregano",
    "basil dried",
    "thyme dried"
  ],
  herbs: ["basil", "cilantro", "parsley", "mint", "rosemary", "thyme", "dill"],
  nuts: [
    "almond",
    "walnut",
    "peanut",
    "cashew",
    "pistachio",
    "pecan",
    "hazelnut"
  ],
  juice: ["orange juice", "apple juice", "smoothie", "lemonade"],
  sauces: ["sauce", "marinara", "pesto", "gravy", "teriyaki", "bbq"]
};
function getShelfLife(category, location) {
  const normalizedCategory = category.toLowerCase().trim();
  const normalizedLocation = location.toLowerCase().trim();
  const entry = SHELF_LIFE_DATA.find(
    (item) => item.category.toLowerCase() === normalizedCategory
  );
  if (!entry) {
    return null;
  }
  switch (normalizedLocation) {
    case "refrigerator":
    case "fridge":
      return entry.refrigerator > 0 ? entry.refrigerator : null;
    case "freezer":
      return entry.freezer > 0 ? entry.freezer : null;
    case "pantry":
      return entry.pantry > 0 ? entry.pantry : null;
    case "counter":
      return entry.counter > 0 ? entry.counter : null;
    default:
      return null;
  }
}
function getShelfLifeEntry(category) {
  const normalizedCategory = category.toLowerCase().trim();
  return SHELF_LIFE_DATA.find(
    (item) => item.category.toLowerCase() === normalizedCategory
  ) || null;
}
function findPartialMatch(foodName) {
  const normalizedName = foodName.toLowerCase().trim();
  for (const entry of SHELF_LIFE_DATA) {
    const entryCategory = entry.category.toLowerCase();
    if (normalizedName.includes(entryCategory) || entryCategory.includes(normalizedName)) {
      return {
        days: entry.refrigerator || entry.pantry || entry.freezer || 7,
        notes: entry.notes,
        matchedCategory: entry.category,
        location: entry.refrigerator > 0 ? "refrigerator" : entry.pantry > 0 ? "pantry" : "freezer"
      };
    }
  }
  for (const [mainCategory, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => normalizedName.includes(keyword))) {
      const entry = SHELF_LIFE_DATA.find(
        (e) => e.category.toLowerCase() === mainCategory
      );
      if (entry) {
        return {
          days: entry.refrigerator || entry.pantry || entry.freezer || 7,
          notes: entry.notes,
          matchedCategory: entry.category,
          location: entry.refrigerator > 0 ? "refrigerator" : entry.pantry > 0 ? "pantry" : "freezer"
        };
      }
    }
  }
  return null;
}
function getShelfLifeForLocation(category, storageLocation) {
  const normalizedLocation = storageLocation.toLowerCase().trim();
  const locationMap = {
    fridge: "refrigerator",
    freezer: "freezer",
    pantry: "pantry",
    counter: "counter",
    refrigerator: "refrigerator"
  };
  const mappedLocation = locationMap[normalizedLocation];
  if (!mappedLocation) {
    return null;
  }
  const days = getShelfLife(category, mappedLocation);
  const entry = getShelfLifeEntry(category);
  if (days !== null && days > 0 && entry) {
    return {
      days,
      notes: entry.notes
    };
  }
  return null;
}

// server/routers/user/suggestions.router.ts
import { Router } from "express";
import OpenAI from "openai";

// server/lib/waste-reduction-utils.ts
var CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
function generateItemsHash(items) {
  const signature = items.map((item) => `${item.id}:${item.daysUntilExpiry}:${item.quantity}`).sort().join("|");
  let hash = 0;
  for (let i = 0; i < signature.length; i++) {
    const char = signature.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
function parseTips(rawSuggestions) {
  return rawSuggestions.map((tip) => {
    const baseTip = {
      text: typeof tip === "string" ? tip : tip.text || "",
      category: typeof tip === "object" && tip.category || "general"
    };
    if (baseTip.category === "recipe" && tip.searchQuery) {
      baseTip.action = {
        type: "search",
        target: "recipes",
        params: { query: tip.searchQuery }
      };
    } else if (baseTip.category === "freeze") {
      baseTip.action = {
        type: "navigate",
        target: "editItem",
        params: { changeLocation: "freezer" }
      };
    } else if (baseTip.category === "storage") {
      baseTip.action = {
        type: "navigate",
        target: "storageGuide"
      };
    }
    return baseTip;
  });
}
function isCacheValid(timestamp2) {
  return Date.now() - timestamp2 <= CACHE_TTL_MS;
}

// server/routers/user/suggestions.router.ts
var router = Router();
var openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});
var wasteReductionCache = /* @__PURE__ */ new Map();
function getFromCache(key) {
  const entry = wasteReductionCache.get(key);
  if (!entry) return null;
  if (!isCacheValid(entry.timestamp)) {
    wasteReductionCache.delete(key);
    return null;
  }
  return entry;
}
function setInCache(key, data) {
  wasteReductionCache.set(key, {
    ...data,
    timestamp: Date.now()
  });
}
var shelfLifeCache = /* @__PURE__ */ new Map();
router.post("/shelf-life", async (req, res) => {
  try {
    const { foodName, category, storageLocation } = req.body;
    if (!foodName || !storageLocation) {
      return res.status(400).json({
        error: "foodName and storageLocation are required"
      });
    }
    const cacheKey = `${foodName.toLowerCase()}:${category?.toLowerCase() || ""}:${storageLocation.toLowerCase()}`;
    const cached = shelfLifeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1e3) {
      return res.json({
        suggestedDays: cached.suggestedDays,
        confidence: cached.confidence,
        source: cached.source,
        notes: cached.notes,
        signsOfSpoilage: cached.signsOfSpoilage
      });
    }
    const prompt = `You are a food safety expert. Determine the shelf life for the following food item.

Food item: ${foodName}
Category: ${category || "Unknown"}
Storage location: ${storageLocation}

Provide the estimated shelf life in days. Consider:
- Food safety guidelines (USDA, FDA)
- The specific storage location (${storageLocation})
- Whether the item is opened or unopened (assume fresh/unopened)

Return JSON:
{
  "suggestedDays": <number>,
  "confidence": "high" | "medium" | "low",
  "notes": "<brief storage tip>",
  "signsOfSpoilage": "<what to look for when it goes bad>"
}`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a food safety expert. Always respond with valid JSON. Be conservative with shelf life estimates for safety."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 256
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }
    const parsed = JSON.parse(content);
    const result = {
      suggestedDays: parsed.suggestedDays || 7,
      confidence: parsed.confidence || "medium",
      source: "ai",
      notes: parsed.notes,
      signsOfSpoilage: parsed.signsOfSpoilage
    };
    shelfLifeCache.set(cacheKey, { ...result, timestamp: Date.now() });
    return res.json(result);
  } catch (error) {
    console.error("Shelf life suggestion error:", error);
    return res.status(500).json({
      suggestedDays: 7,
      confidence: "low",
      source: "default",
      notes: "Unable to get AI suggestion. Using default 7-day estimate."
    });
  }
});
router.post("/waste-reduction", async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === "true";
    const clientItems = req.body.expiringItems || [];
    if (!Array.isArray(clientItems) || clientItems.length === 0) {
      return res.json({
        suggestions: [],
        expiringItems: []
      });
    }
    const expiringItems = clientItems.map((item) => ({
      id: item.id || 0,
      name: item.name || "Unknown",
      daysUntilExpiry: Math.max(0, item.daysUntilExpiry || 0),
      quantity: item.quantity || 1
    }));
    const deviceId = req.headers["x-device-id"] || "anonymous";
    const itemsHash = generateItemsHash(expiringItems);
    const cacheKey = `${deviceId}:${itemsHash}`;
    if (forceRefresh) {
      wasteReductionCache.delete(cacheKey);
    }
    const cached = getFromCache(cacheKey);
    if (cached && !forceRefresh) {
      console.log(
        `Waste reduction cache hit for device: ${deviceId}, hash: ${itemsHash}`
      );
      return res.json({
        suggestions: cached.suggestions,
        expiringItems: cached.expiringItems
      });
    }
    const itemsList = expiringItems.map(
      (item) => `- ${item.name} (${item.quantity}x) - expires in ${item.daysUntilExpiry} day${item.daysUntilExpiry !== 1 ? "s" : ""}`
    ).join("\n");
    const prompt = `You are a food waste reduction expert helping a home cook.

These food items are expiring soon:
${itemsList}

Provide 3-5 actionable tips to help use these items before they expire.

Categories (MUST use exactly one per tip):
- "recipe": For cooking/meal suggestions - include a searchQuery for finding recipes
- "storage": For storage tips to extend freshness
- "freeze": For freezing recommendations
- "preserve": For canning, pickling, or preservation methods
- "general": For other general tips

Rules:
- Each tip text under 100 characters
- Be specific to the items listed
- Prioritize items expiring soonest
- Practical for home cooks
- Include at least one recipe tip with searchQuery
- For recipe tips, searchQuery should be a simple recipe search term

Return JSON:
{
  "suggestions": [
    {
      "text": "Make a stir-fry with the expiring vegetables",
      "category": "recipe",
      "searchQuery": "vegetable stir fry"
    },
    {
      "text": "Store tomatoes at room temperature to preserve flavor",
      "category": "storage"
    },
    {
      "text": "Freeze the chicken within 24 hours",
      "category": "freeze"
    }
  ]
}`;
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful food waste reduction assistant. Always respond with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 512
      });
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI");
      }
      const parsed = JSON.parse(content);
      const rawSuggestions = parsed.suggestions || [];
      const suggestions = parseTips(rawSuggestions);
      setInCache(cacheKey, { suggestions, expiringItems });
      console.log(`Waste reduction tips generated for device: ${deviceId}`);
      return res.json({
        suggestions,
        expiringItems
      });
    } catch (aiError) {
      console.error("AI waste reduction tips error:", aiError);
      return res.json({
        suggestions: [],
        expiringItems
      });
    }
  } catch (error) {
    console.error("Waste reduction endpoint error:", error);
    return res.status(500).json({
      error: "Failed to get waste reduction tips",
      suggestions: [],
      expiringItems: []
    });
  }
});
var funFactCache = /* @__PURE__ */ new Map();
var FUN_FACT_CACHE_TTL = 24 * 60 * 60 * 1e3;
router.post("/fun-fact", async (req, res) => {
  try {
    const { items, nutritionTotals } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.json({
        fact: "Add some items to your inventory to discover fun facts about your food!"
      });
    }
    const itemNames = items.map((i) => i.name).slice(0, 20);
    const cacheKey = `funfact:${itemNames.sort().join(",")}:${nutritionTotals?.calories || 0}`;
    const cached = funFactCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < FUN_FACT_CACHE_TTL) {
      return res.json({ fact: cached.fact });
    }
    const itemList = itemNames.join(", ");
    const nutritionContext = nutritionTotals ? `Total nutrition: ${nutritionTotals.calories} calories, ${nutritionTotals.protein}g protein, ${nutritionTotals.carbs}g carbs, ${nutritionTotals.fat}g fat from ${nutritionTotals.itemsWithNutrition} items.` : "";
    const prompt = `Based on this kitchen inventory, generate ONE short, fun, interesting fact (1-2 sentences max).

Inventory items: ${itemList}
${nutritionContext}

The fact should be:
- Surprising, educational, or amusing
- Related to the specific foods in the inventory
- About food history, nutrition trivia, cultural facts, or cooking tips
- Encouraging and positive in tone

Examples of good facts:
- "Your eggs could make 3 perfect French omelets - the dish that chefs use to test their skills!"
- "With your tomatoes and basil, you have the classic combo that inspired Caprese salad in 1950s Italy."
- "Your pantry has enough protein for a small army of gym enthusiasts!"

Return JSON: { "fact": "<your fun fact>" }`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a fun, witty food expert who shares interesting facts. Always respond with valid JSON. Keep facts brief and engaging."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 150
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }
    const parsed = JSON.parse(content);
    const fact = parsed.fact || "Your kitchen is full of delicious possibilities!";
    funFactCache.set(cacheKey, { fact, timestamp: Date.now() });
    return res.json({ fact });
  } catch (error) {
    console.error("Fun fact generation error:", error);
    return res.json({
      fact: "Your kitchen is stocked with tasty ingredients!"
    });
  }
});
var suggestions_router_default = router;

// server/routers/user/recipes.router.ts
import { Router as Router2 } from "express";
import OpenAI2 from "openai";
import { z } from "zod";

// server/lib/unit-conversion.ts
var VOLUME_UNITS = {
  ml: { type: "volume", baseUnit: "ml", toBase: 1 },
  milliliter: { type: "volume", baseUnit: "ml", toBase: 1 },
  milliliters: { type: "volume", baseUnit: "ml", toBase: 1 },
  l: { type: "volume", baseUnit: "ml", toBase: 1e3 },
  liter: { type: "volume", baseUnit: "ml", toBase: 1e3 },
  liters: { type: "volume", baseUnit: "ml", toBase: 1e3 },
  litre: { type: "volume", baseUnit: "ml", toBase: 1e3 },
  litres: { type: "volume", baseUnit: "ml", toBase: 1e3 },
  tsp: { type: "volume", baseUnit: "ml", toBase: 4.929 },
  teaspoon: { type: "volume", baseUnit: "ml", toBase: 4.929 },
  teaspoons: { type: "volume", baseUnit: "ml", toBase: 4.929 },
  tbsp: { type: "volume", baseUnit: "ml", toBase: 14.787 },
  tablespoon: { type: "volume", baseUnit: "ml", toBase: 14.787 },
  tablespoons: { type: "volume", baseUnit: "ml", toBase: 14.787 },
  cup: { type: "volume", baseUnit: "ml", toBase: 236.588 },
  cups: { type: "volume", baseUnit: "ml", toBase: 236.588 },
  "fl oz": { type: "volume", baseUnit: "ml", toBase: 29.574 },
  "fluid ounce": { type: "volume", baseUnit: "ml", toBase: 29.574 },
  "fluid ounces": { type: "volume", baseUnit: "ml", toBase: 29.574 },
  pint: { type: "volume", baseUnit: "ml", toBase: 473.176 },
  pints: { type: "volume", baseUnit: "ml", toBase: 473.176 },
  pt: { type: "volume", baseUnit: "ml", toBase: 473.176 },
  quart: { type: "volume", baseUnit: "ml", toBase: 946.353 },
  quarts: { type: "volume", baseUnit: "ml", toBase: 946.353 },
  qt: { type: "volume", baseUnit: "ml", toBase: 946.353 },
  gallon: { type: "volume", baseUnit: "ml", toBase: 3785.41 },
  gallons: { type: "volume", baseUnit: "ml", toBase: 3785.41 },
  gal: { type: "volume", baseUnit: "ml", toBase: 3785.41 }
};
var WEIGHT_UNITS = {
  g: { type: "weight", baseUnit: "g", toBase: 1 },
  gram: { type: "weight", baseUnit: "g", toBase: 1 },
  grams: { type: "weight", baseUnit: "g", toBase: 1 },
  kg: { type: "weight", baseUnit: "g", toBase: 1e3 },
  kilogram: { type: "weight", baseUnit: "g", toBase: 1e3 },
  kilograms: { type: "weight", baseUnit: "g", toBase: 1e3 },
  mg: { type: "weight", baseUnit: "g", toBase: 1e-3 },
  milligram: { type: "weight", baseUnit: "g", toBase: 1e-3 },
  milligrams: { type: "weight", baseUnit: "g", toBase: 1e-3 },
  oz: { type: "weight", baseUnit: "g", toBase: 28.3495 },
  ounce: { type: "weight", baseUnit: "g", toBase: 28.3495 },
  ounces: { type: "weight", baseUnit: "g", toBase: 28.3495 },
  lb: { type: "weight", baseUnit: "g", toBase: 453.592 },
  lbs: { type: "weight", baseUnit: "g", toBase: 453.592 },
  pound: { type: "weight", baseUnit: "g", toBase: 453.592 },
  pounds: { type: "weight", baseUnit: "g", toBase: 453.592 }
};
var COUNT_UNITS = {
  piece: { type: "count", baseUnit: "piece", toBase: 1 },
  pieces: { type: "count", baseUnit: "piece", toBase: 1 },
  pcs: { type: "count", baseUnit: "piece", toBase: 1 },
  item: { type: "count", baseUnit: "piece", toBase: 1 },
  items: { type: "count", baseUnit: "piece", toBase: 1 },
  unit: { type: "count", baseUnit: "piece", toBase: 1 },
  units: { type: "count", baseUnit: "piece", toBase: 1 },
  each: { type: "count", baseUnit: "piece", toBase: 1 },
  whole: { type: "count", baseUnit: "piece", toBase: 1 },
  slice: { type: "count", baseUnit: "piece", toBase: 1 },
  slices: { type: "count", baseUnit: "piece", toBase: 1 },
  clove: { type: "count", baseUnit: "piece", toBase: 1 },
  cloves: { type: "count", baseUnit: "piece", toBase: 1 },
  head: { type: "count", baseUnit: "piece", toBase: 1 },
  heads: { type: "count", baseUnit: "piece", toBase: 1 },
  bunch: { type: "count", baseUnit: "piece", toBase: 1 },
  bunches: { type: "count", baseUnit: "piece", toBase: 1 },
  stalk: { type: "count", baseUnit: "piece", toBase: 1 },
  stalks: { type: "count", baseUnit: "piece", toBase: 1 },
  sprig: { type: "count", baseUnit: "piece", toBase: 1 },
  sprigs: { type: "count", baseUnit: "piece", toBase: 1 },
  can: { type: "count", baseUnit: "piece", toBase: 1 },
  cans: { type: "count", baseUnit: "piece", toBase: 1 },
  bottle: { type: "count", baseUnit: "piece", toBase: 1 },
  bottles: { type: "count", baseUnit: "piece", toBase: 1 },
  jar: { type: "count", baseUnit: "piece", toBase: 1 },
  jars: { type: "count", baseUnit: "piece", toBase: 1 },
  package: { type: "count", baseUnit: "piece", toBase: 1 },
  packages: { type: "count", baseUnit: "piece", toBase: 1 },
  bag: { type: "count", baseUnit: "piece", toBase: 1 },
  bags: { type: "count", baseUnit: "piece", toBase: 1 },
  box: { type: "count", baseUnit: "piece", toBase: 1 },
  boxes: { type: "count", baseUnit: "piece", toBase: 1 },
  dozen: { type: "count", baseUnit: "piece", toBase: 12 }
};
var ALL_UNITS = {
  ...VOLUME_UNITS,
  ...WEIGHT_UNITS,
  ...COUNT_UNITS
};
function parseUnit(unit) {
  if (!unit) return null;
  const normalized = unit.toLowerCase().trim();
  return ALL_UNITS[normalized] || null;
}
function getUnitType(unit) {
  const info = parseUnit(unit);
  return info?.type || "unknown";
}
function convertToBase(quantity, unit) {
  const info = parseUnit(unit);
  if (!info) return null;
  return {
    value: quantity * info.toBase,
    baseUnit: info.baseUnit,
    type: info.type
  };
}
function convert(quantity, fromUnit, toUnit) {
  const fromInfo = parseUnit(fromUnit);
  const toInfo = parseUnit(toUnit);
  if (!fromInfo || !toInfo) return null;
  if (fromInfo.type !== toInfo.type) return null;
  const baseValue = quantity * fromInfo.toBase;
  return baseValue / toInfo.toBase;
}
function normalizeUnit(unit) {
  if (!unit) return "";
  const info = parseUnit(unit);
  if (!info) return unit;
  const unitLower = unit.toLowerCase().trim();
  const canonicalForms = {
    milliliter: "ml",
    milliliters: "ml",
    liter: "L",
    liters: "L",
    litre: "L",
    litres: "L",
    l: "L",
    teaspoon: "tsp",
    teaspoons: "tsp",
    tablespoon: "tbsp",
    tablespoons: "tbsp",
    "fluid ounce": "fl oz",
    "fluid ounces": "fl oz",
    gram: "g",
    grams: "g",
    kilogram: "kg",
    kilograms: "kg",
    milligram: "mg",
    milligrams: "mg",
    ounce: "oz",
    ounces: "oz",
    pound: "lb",
    pounds: "lb",
    lbs: "lb",
    piece: "pc",
    pieces: "pc",
    pcs: "pc"
  };
  return canonicalForms[unitLower] || unit;
}
function formatInventoryForPrompt(items) {
  return items.map((item) => {
    if (!item.quantity) {
      return item.name;
    }
    if (!item.unit) {
      return `${item.name}: ${item.quantity}`;
    }
    const normalizedUnit = normalizeUnit(item.unit);
    const unitType = getUnitType(item.unit);
    let equivalents = "";
    if (unitType === "weight") {
      const inGrams = convertToBase(item.quantity, item.unit);
      if (inGrams && item.unit?.toLowerCase() !== "g") {
        equivalents = ` (~${Math.round(inGrams.value)}g)`;
      } else if (item.unit?.toLowerCase() === "g" && item.quantity >= 100) {
        const inOz = convert(item.quantity, "g", "oz");
        if (inOz) equivalents = ` (~${Math.round(inOz * 10) / 10} oz)`;
      }
    } else if (unitType === "volume") {
      const inMl = convertToBase(item.quantity, item.unit);
      if (inMl && !["ml", "milliliter", "milliliters"].includes(
        item.unit?.toLowerCase() || ""
      )) {
        equivalents = ` (~${Math.round(inMl.value)}ml)`;
      }
    }
    return `${item.name}: ${item.quantity} ${normalizedUnit}${equivalents}`;
  });
}
function normalizeUnitForInstacart(unit) {
  if (!unit) return void 0;
  const normalized = unit.toLowerCase().trim();
  const instacartUnitMap = {
    // Volume - Instacart format
    ml: "ml",
    milliliter: "ml",
    milliliters: "ml",
    l: "l",
    liter: "l",
    liters: "l",
    litre: "l",
    litres: "l",
    tsp: "tsp",
    teaspoon: "tsp",
    teaspoons: "tsp",
    tbsp: "tbsp",
    tablespoon: "tbsp",
    tablespoons: "tbsp",
    cup: "cup",
    cups: "cup",
    "fl oz": "fl oz",
    "fluid ounce": "fl oz",
    "fluid ounces": "fl oz",
    pint: "pt",
    pints: "pt",
    pt: "pt",
    quart: "qt",
    quarts: "qt",
    qt: "qt",
    gallon: "gal",
    gallons: "gal",
    gal: "gal",
    // Weight - Instacart format
    g: "g",
    gram: "g",
    grams: "g",
    kg: "kg",
    kilogram: "kg",
    kilograms: "kg",
    oz: "oz",
    ounce: "oz",
    ounces: "oz",
    lb: "lb",
    lbs: "lb",
    pound: "lb",
    pounds: "lb",
    // Count - Instacart format
    piece: "piece",
    pieces: "piece",
    pcs: "piece",
    pc: "piece",
    item: "each",
    items: "each",
    unit: "each",
    units: "each",
    each: "each",
    whole: "each",
    count: "count",
    dozen: "dozen",
    slice: "slice",
    slices: "slice",
    clove: "clove",
    cloves: "clove",
    head: "head",
    heads: "head",
    bunch: "bunch",
    bunches: "bunch",
    stalk: "stalk",
    stalks: "stalk",
    sprig: "sprig",
    sprigs: "sprig",
    can: "can",
    cans: "can",
    bottle: "bottle",
    bottles: "bottle",
    jar: "jar",
    jars: "jar",
    package: "package",
    packages: "package",
    pack: "pack",
    packs: "pack",
    bag: "bag",
    bags: "bag",
    box: "box",
    boxes: "box",
    carton: "carton",
    cartons: "carton",
    container: "container",
    containers: "container",
    loaf: "loaf",
    loaves: "loaf"
  };
  return instacartUnitMap[normalized] || void 0;
}
var UNIT_CONVERSION_PROMPT_ADDITION = `
UNIT HANDLING INSTRUCTIONS:
- The user's inventory may use different units than your recipe (e.g., grams vs cups, ml vs fl oz)
- When matching inventory items to recipe ingredients, recognize that units can be converted:
  - VOLUME: 1 cup = 236.6ml, 1 tbsp = 14.8ml, 1 tsp = 4.9ml, 1 fl oz = 29.6ml
  - WEIGHT: 1 oz = 28.3g, 1 lb = 453.6g, 1 kg = 1000g
- If the inventory shows "500g flour" and your recipe needs "2 cups flour", these are compatible
- Use practical, common units in your recipe output (cups, tbsp, g, oz - whatever fits the ingredient best)
- When the user has enough quantity in a compatible unit, mark the ingredient as "fromInventory": true
`;

// server/integrations/usda.ts
var USDA_API_KEY = process.env.USDA_API_KEY;
var USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1";
var searchCache = /* @__PURE__ */ new Map();
var foodCache = /* @__PURE__ */ new Map();
var SEARCH_CACHE_TTL = 60 * 60 * 1e3;
var FOOD_CACHE_TTL = 24 * 60 * 60 * 1e3;
function isSearchCacheValid(timestamp2) {
  return Date.now() - timestamp2 < SEARCH_CACHE_TTL;
}
function isFoodCacheValid(timestamp2) {
  return Date.now() - timestamp2 < FOOD_CACHE_TTL;
}
async function searchUSDA(query, pageSize = 25) {
  if (!USDA_API_KEY) {
    console.error("USDA_API_KEY is not configured");
    return [];
  }
  const cacheKey = `${query}-${pageSize}`;
  const cached = searchCache.get(cacheKey);
  if (cached && isSearchCacheValid(cached.timestamp)) {
    return cached.data;
  }
  try {
    const params = new URLSearchParams({
      api_key: USDA_API_KEY,
      query,
      pageSize: pageSize.toString()
    });
    const response = await fetch(`${USDA_BASE_URL}/foods/search?${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (response.status === 429) {
      console.error("USDA API rate limit exceeded (1000 requests/hour)");
      return [];
    }
    if (!response.ok) {
      console.error(
        `USDA API error: ${response.status} ${response.statusText}`
      );
      return [];
    }
    const data = await response.json();
    const results = data.foods || [];
    searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
    return results;
  } catch (error) {
    console.error("Error searching USDA API:", error);
    return [];
  }
}
async function getUSDAFood(fdcId) {
  if (!USDA_API_KEY) {
    console.error("USDA_API_KEY is not configured");
    return null;
  }
  const cached = foodCache.get(fdcId);
  if (cached && isFoodCacheValid(cached.timestamp)) {
    return cached.data;
  }
  try {
    const params = new URLSearchParams({
      api_key: USDA_API_KEY
    });
    const response = await fetch(`${USDA_BASE_URL}/food/${fdcId}?${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });
    if (response.status === 404) {
      foodCache.set(fdcId, { data: null, timestamp: Date.now() });
      return null;
    }
    if (response.status === 429) {
      console.error("USDA API rate limit exceeded (1000 requests/hour)");
      return null;
    }
    if (!response.ok) {
      console.error(
        `USDA API error: ${response.status} ${response.statusText}`
      );
      return null;
    }
    const data = await response.json();
    foodCache.set(fdcId, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error("Error fetching USDA food:", error);
    return null;
  }
}
var NUTRIENT_IDS = {
  ENERGY: 1008,
  PROTEIN: 1003,
  CARBOHYDRATES: 1005,
  FAT: 1004,
  FIBER: 1079,
  SUGARS: 2e3,
  SODIUM: 1093
};
function findNutrientValue(nutrients, nutrientId) {
  const nutrient = nutrients.find((n) => n.nutrientId === nutrientId);
  return nutrient?.value;
}
function mapUSDAToFoodItem(usdaFood) {
  const nutrients = usdaFood.foodNutrients || [];
  const calories = findNutrientValue(nutrients, NUTRIENT_IDS.ENERGY) ?? 0;
  const protein = findNutrientValue(nutrients, NUTRIENT_IDS.PROTEIN) ?? 0;
  const carbs = findNutrientValue(nutrients, NUTRIENT_IDS.CARBOHYDRATES) ?? 0;
  const fat = findNutrientValue(nutrients, NUTRIENT_IDS.FAT) ?? 0;
  const fiber = findNutrientValue(nutrients, NUTRIENT_IDS.FIBER);
  const sugar = findNutrientValue(nutrients, NUTRIENT_IDS.SUGARS);
  const sodium = findNutrientValue(nutrients, NUTRIENT_IDS.SODIUM);
  let category = "Other";
  if ("foodCategory" in usdaFood && usdaFood.foodCategory?.description) {
    category = usdaFood.foodCategory.description;
  }
  let servingSize;
  if (usdaFood.servingSize && usdaFood.servingSizeUnit) {
    servingSize = `${usdaFood.servingSize} ${usdaFood.servingSizeUnit}`;
  }
  return {
    name: usdaFood.description,
    category,
    nutrition: {
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: fiber !== void 0 ? Math.round(fiber * 10) / 10 : void 0,
      sugar: sugar !== void 0 ? Math.round(sugar * 10) / 10 : void 0,
      sodium: sodium !== void 0 ? Math.round(sodium) : void 0,
      servingSize
    },
    source: "usda",
    sourceId: usdaFood.fdcId,
    brandOwner: "brandOwner" in usdaFood ? usdaFood.brandOwner : void 0,
    ingredients: usdaFood.ingredients
  };
}
var barcodeCache = /* @__PURE__ */ new Map();
async function lookupUSDABarcode(barcode) {
  if (!USDA_API_KEY) {
    console.error("USDA_API_KEY is not configured");
    return null;
  }
  const cleanBarcode = barcode.replace(/\D/g, "");
  const cached = barcodeCache.get(cleanBarcode);
  if (cached && isSearchCacheValid(cached.timestamp)) {
    return cached.data;
  }
  try {
    const response = await fetch(
      `${USDA_BASE_URL}/foods/search?api_key=${USDA_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          query: cleanBarcode,
          dataType: ["Branded"],
          pageSize: 25
        })
      }
    );
    if (response.status === 429) {
      console.error("USDA API rate limit exceeded (1000 requests/hour)");
      return null;
    }
    if (!response.ok) {
      console.error(
        `USDA API error: ${response.status} ${response.statusText}`
      );
      return null;
    }
    const data = await response.json();
    const foods = data.foods || [];
    const exactMatch = foods.find((food) => {
      if (food.gtinUpc) {
        const foodUpc = food.gtinUpc.replace(/\D/g, "");
        return foodUpc === cleanBarcode || foodUpc.endsWith(cleanBarcode) || cleanBarcode.endsWith(foodUpc);
      }
      return false;
    });
    if (exactMatch) {
      barcodeCache.set(cleanBarcode, {
        data: exactMatch,
        timestamp: Date.now()
      });
      return exactMatch;
    }
    if (foods.length > 0) {
      barcodeCache.set(cleanBarcode, { data: foods[0], timestamp: Date.now() });
      return foods[0];
    }
    barcodeCache.set(cleanBarcode, { data: null, timestamp: Date.now() });
    return null;
  } catch (error) {
    console.error("Error looking up USDA barcode:", error);
    return null;
  }
}
var PORTION_CACHE_TTL = 24 * 60 * 60 * 1e3;
var UNIT_ALIASES = {
  slice: ["slice", "slices", "sl"],
  loaf: ["loaf", "loaves"],
  cup: ["cup", "cups", "c"],
  tablespoon: ["tablespoon", "tablespoons", "tbsp", "tbs", "tb"],
  teaspoon: ["teaspoon", "teaspoons", "tsp", "ts"],
  ounce: ["ounce", "ounces", "oz"],
  pound: ["pound", "pounds", "lb", "lbs"],
  gram: ["gram", "grams", "g"],
  kilogram: ["kilogram", "kilograms", "kg"],
  piece: ["piece", "pieces", "pc", "pcs", "each", "ea", "whole"],
  serving: ["serving", "servings", "srv"],
  can: ["can", "cans"],
  bottle: ["bottle", "bottles"],
  package: ["package", "packages", "pkg", "pkgs"],
  head: ["head", "heads"],
  clove: ["clove", "cloves"],
  bunch: ["bunch", "bunches"],
  stalk: ["stalk", "stalks"],
  sprig: ["sprig", "sprigs"],
  large: ["large", "lg"],
  medium: ["medium", "med", "md"],
  small: ["small", "sm"]
};
function normalizeUnitName(unit) {
  const lower = unit.toLowerCase().trim();
  for (const [canonical, aliases] of Object.entries(UNIT_ALIASES)) {
    if (aliases.includes(lower)) {
      return canonical;
    }
  }
  return lower;
}
function unitMatches(portionUnit, searchUnit) {
  const normPortion = normalizeUnitName(portionUnit);
  const normSearch = normalizeUnitName(searchUnit);
  if (normPortion === normSearch) return true;
  if (normPortion.includes(normSearch) || normSearch.includes(normPortion)) {
    return true;
  }
  return false;
}
function findPortionConversion(portions, unit) {
  const searchUnit = normalizeUnitName(unit);
  for (const portion of portions) {
    if (normalizeUnitName(portion.unitName) === searchUnit) {
      return portion;
    }
    if (portion.unitAbbreviation && normalizeUnitName(portion.unitAbbreviation) === searchUnit) {
      return portion;
    }
  }
  for (const portion of portions) {
    if (unitMatches(portion.unitName, unit)) {
      return portion;
    }
  }
  return null;
}
var STANDARD_WEIGHT_TO_GRAMS = {
  g: 1,
  gram: 1,
  grams: 1,
  kg: 1e3,
  kilogram: 1e3,
  kilograms: 1e3,
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
  mg: 1e-3,
  milligram: 1e-3,
  milligrams: 1e-3
};
var STANDARD_VOLUME_TO_GRAMS = {
  ml: 1,
  milliliter: 1,
  milliliters: 1,
  l: 1e3,
  liter: 1e3,
  liters: 1e3,
  litre: 1e3,
  litres: 1e3,
  cup: 240,
  cups: 240,
  tbsp: 15,
  tablespoon: 15,
  tablespoons: 15,
  tsp: 5,
  teaspoon: 5,
  teaspoons: 5,
  "fl oz": 30,
  "fluid ounce": 30,
  "fluid ounces": 30
};
function convertToGrams(quantity, unit, portions) {
  const normalizedUnit = unit.toLowerCase().trim();
  if (portions && portions.length > 0) {
    const portionMatch = findPortionConversion(portions, unit);
    if (portionMatch) {
      return {
        grams: quantity * portionMatch.gramsPerUnit,
        conversionUsed: `${portionMatch.amount} ${portionMatch.unitName} = ${portionMatch.gramWeight}g (USDA)`,
        isApproximate: false
      };
    }
  }
  if (STANDARD_WEIGHT_TO_GRAMS[normalizedUnit]) {
    return {
      grams: quantity * STANDARD_WEIGHT_TO_GRAMS[normalizedUnit],
      conversionUsed: `standard weight conversion`,
      isApproximate: false
    };
  }
  if (STANDARD_VOLUME_TO_GRAMS[normalizedUnit]) {
    return {
      grams: quantity * STANDARD_VOLUME_TO_GRAMS[normalizedUnit],
      conversionUsed: `volume approximation (density varies)`,
      isApproximate: true
    };
  }
  return null;
}
function compareQuantities(inventoryQty, inventoryUnit, requiredQty, requiredUnit, portions) {
  if (!inventoryUnit) {
    if (inventoryQty >= requiredQty) {
      return { status: "available", inventoryGrams: null, requiredGrams: null, percentAvailable: 100 };
    }
    const pct2 = Math.round(inventoryQty / requiredQty * 100);
    return {
      status: pct2 >= 50 ? "partial" : "unavailable",
      inventoryGrams: null,
      requiredGrams: null,
      percentAvailable: pct2
    };
  }
  const inventoryInGrams = convertToGrams(inventoryQty, inventoryUnit, portions);
  const requiredInGrams = convertToGrams(requiredQty, requiredUnit, portions);
  if (!inventoryInGrams || !requiredInGrams) {
    const normInv = normalizeUnitName(inventoryUnit);
    const normReq = normalizeUnitName(requiredUnit);
    if (normInv === normReq || unitMatches(inventoryUnit, requiredUnit)) {
      if (inventoryQty >= requiredQty) {
        return { status: "available", inventoryGrams: null, requiredGrams: null, percentAvailable: 100 };
      }
      const pct2 = Math.round(inventoryQty / requiredQty * 100);
      return {
        status: pct2 >= 50 ? "partial" : "unavailable",
        inventoryGrams: null,
        requiredGrams: null,
        percentAvailable: pct2,
        conversionNote: `Same unit comparison: ${inventoryQty}/${requiredQty} ${inventoryUnit}`
      };
    }
    return {
      status: "available",
      // Assume available if we can't verify
      inventoryGrams: null,
      requiredGrams: null,
      percentAvailable: null,
      conversionNote: `Cannot convert between ${inventoryUnit} and ${requiredUnit}`
    };
  }
  const pct = Math.round(inventoryInGrams.grams / requiredInGrams.grams * 100);
  let status;
  if (pct >= 100) {
    status = "available";
  } else if (pct >= 50) {
    status = "partial";
  } else {
    status = "unavailable";
  }
  return {
    status,
    inventoryGrams: inventoryInGrams.grams,
    requiredGrams: requiredInGrams.grams,
    percentAvailable: Math.min(pct, 100),
    conversionNote: `${inventoryQty} ${inventoryUnit} = ${Math.round(inventoryInGrams.grams)}g, need ${Math.round(requiredInGrams.grams)}g`
  };
}

// server/services/subscriptionService.ts
init_db();
init_schema();
import { eq } from "drizzle-orm";

// shared/subscription.ts
var TIER_CONFIG = {
  ["BASIC" /* BASIC */]: {
    maxPantryItems: 25,
    maxAiRecipesPerMonth: 5,
    maxCookwareItems: 5,
    canCustomizeStorageAreas: false,
    canUseRecipeScanning: false,
    canUseBulkScanning: false,
    canUseAiKitchenAssistant: false,
    canUseWeeklyMealPrepping: false
  },
  ["PRO" /* PRO */]: {
    maxPantryItems: -1,
    maxAiRecipesPerMonth: -1,
    maxCookwareItems: -1,
    canCustomizeStorageAreas: true,
    canUseRecipeScanning: true,
    canUseBulkScanning: true,
    canUseAiKitchenAssistant: true,
    canUseWeeklyMealPrepping: true
  }
};
var MONTHLY_PRICES = {
  BASIC: 4.99,
  PRO: 9.99
};
var ANNUAL_PRICES = {
  BASIC: 49.9,
  PRO: 99.9
};
var TRIAL_CONFIG = {
  TRIAL_DAYS: 7,
  TRIAL_TIER: "PRO" /* PRO */
};
var ERROR_CODES = {
  PANTRY_LIMIT_REACHED: "PANTRY_LIMIT_REACHED",
  COOKWARE_LIMIT_REACHED: "COOKWARE_LIMIT_REACHED",
  AI_RECIPE_LIMIT_REACHED: "AI_RECIPE_LIMIT_REACHED",
  FEATURE_NOT_AVAILABLE: "FEATURE_NOT_AVAILABLE"
};
var ERROR_MESSAGES = {
  [ERROR_CODES.PANTRY_LIMIT_REACHED]: "Pantry item limit reached. Upgrade to Pro for unlimited items.",
  [ERROR_CODES.COOKWARE_LIMIT_REACHED]: "Cookware limit reached. Upgrade to Pro for unlimited cookware.",
  [ERROR_CODES.AI_RECIPE_LIMIT_REACHED]: "AI recipe limit reached. Upgrade to Pro for unlimited recipes.",
  [ERROR_CODES.FEATURE_NOT_AVAILABLE]: "This feature requires a Pro subscription."
};
function getTierLimits(tier) {
  return TIER_CONFIG[tier];
}
function isWithinLimit(tier, limitKey, currentCount) {
  const limits = getTierLimits(tier);
  const limit = limits[limitKey];
  if (limit === -1) {
    return true;
  }
  return currentCount < limit;
}
function getRemainingQuota(tier, limitKey, currentCount) {
  const limits = getTierLimits(tier);
  const limit = limits[limitKey];
  if (limit === -1) {
    return "unlimited";
  }
  return Math.max(0, limit - currentCount);
}

// server/services/subscriptionService.ts
var { TRIAL_DAYS } = TRIAL_CONFIG;
async function getUserById(userId) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user;
}
async function getUserSyncData(userId) {
  const [syncData] = await db.select().from(userSyncData).where(eq(userSyncData.userId, userId)).limit(1);
  return syncData;
}
function parseJsonArray(jsonString) {
  if (!jsonString) return [];
  try {
    return JSON.parse(jsonString);
  } catch {
    return [];
  }
}
async function getUserEntitlements(userId) {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  await resetMonthlyCountsIfNeeded(userId);
  const refreshedUser = await getUserById(userId);
  if (!refreshedUser) {
    throw new Error("User not found after refresh");
  }
  const syncData = await getUserSyncData(userId);
  const tier = refreshedUser.subscriptionTier || "BASIC" /* BASIC */;
  const limits = getTierLimits(tier);
  const inventory = parseJsonArray(syncData?.inventory || null);
  const cookware = parseJsonArray(syncData?.cookware || null);
  const pantryItemCount = inventory.length;
  const cookwareCount = cookware.length;
  const aiRecipesUsedThisMonth = refreshedUser.aiRecipesGeneratedThisMonth || 0;
  return {
    tier,
    status: refreshedUser.subscriptionStatus || "trialing",
    limits,
    usage: {
      pantryItemCount,
      aiRecipesUsedThisMonth,
      cookwareCount
    },
    remaining: {
      pantryItems: getRemainingQuota(tier, "maxPantryItems", pantryItemCount),
      aiRecipes: getRemainingQuota(tier, "maxAiRecipesPerMonth", aiRecipesUsedThisMonth),
      cookware: getRemainingQuota(tier, "maxCookwareItems", cookwareCount)
    },
    trialEndsAt: refreshedUser.trialEndsAt
  };
}
async function checkPantryItemLimit(userId) {
  const entitlements = await getUserEntitlements(userId);
  const { tier, usage } = entitlements;
  const limits = getTierLimits(tier);
  const limit = limits.maxPantryItems === -1 ? "unlimited" : limits.maxPantryItems;
  const remaining = getRemainingQuota(tier, "maxPantryItems", usage.pantryItemCount);
  const allowed = isWithinLimit(tier, "maxPantryItems", usage.pantryItemCount);
  return { allowed, remaining, limit };
}
async function checkAiRecipeLimit(userId) {
  await resetMonthlyCountsIfNeeded(userId);
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  const tier = user.subscriptionTier || "BASIC" /* BASIC */;
  const limits = getTierLimits(tier);
  const currentCount = user.aiRecipesGeneratedThisMonth || 0;
  const limit = limits.maxAiRecipesPerMonth === -1 ? "unlimited" : limits.maxAiRecipesPerMonth;
  const remaining = getRemainingQuota(tier, "maxAiRecipesPerMonth", currentCount);
  const allowed = isWithinLimit(tier, "maxAiRecipesPerMonth", currentCount);
  return { allowed, remaining, limit };
}
async function checkCookwareLimit(userId) {
  const entitlements = await getUserEntitlements(userId);
  const { tier, usage } = entitlements;
  const limits = getTierLimits(tier);
  const limit = limits.maxCookwareItems === -1 ? "unlimited" : limits.maxCookwareItems;
  const remaining = getRemainingQuota(tier, "maxCookwareItems", usage.cookwareCount);
  const allowed = isWithinLimit(tier, "maxCookwareItems", usage.cookwareCount);
  return { allowed, remaining, limit };
}
var featureToLimitKey = {
  recipeScanning: "canUseRecipeScanning",
  bulkScanning: "canUseBulkScanning",
  aiKitchenAssistant: "canUseAiKitchenAssistant",
  weeklyMealPrepping: "canUseWeeklyMealPrepping",
  customStorageAreas: "canCustomizeStorageAreas"
};
async function checkFeatureAccess(userId, feature) {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  const tier = user.subscriptionTier || "BASIC" /* BASIC */;
  const limits = getTierLimits(tier);
  const limitKey = featureToLimitKey[feature];
  if (!limitKey) {
    return false;
  }
  return limits[limitKey];
}
async function incrementAiRecipeCount(userId) {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  const currentCount = user.aiRecipesGeneratedThisMonth || 0;
  let resetDate = user.aiRecipesResetDate;
  if (!resetDate) {
    const oneMonthFromNow = /* @__PURE__ */ new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    resetDate = oneMonthFromNow;
  }
  await db.update(users).set({
    aiRecipesGeneratedThisMonth: currentCount + 1,
    aiRecipesResetDate: resetDate,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(users.id, userId));
}
async function resetMonthlyCountsIfNeeded(userId) {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }
  const resetDate = user.aiRecipesResetDate;
  if (!resetDate) {
    return;
  }
  const now = /* @__PURE__ */ new Date();
  if (now >= new Date(resetDate)) {
    const oneMonthFromNow = /* @__PURE__ */ new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    await db.update(users).set({
      aiRecipesGeneratedThisMonth: 0,
      aiRecipesResetDate: oneMonthFromNow,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId));
  }
}
async function ensureTrialSubscription(userId, selectedPlan = "monthly") {
  const now = /* @__PURE__ */ new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  const [existing] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  if (existing) {
    if (existing.status === "trialing") {
      await db.update(users).set({
        subscriptionTier: "PRO" /* PRO */,
        subscriptionStatus: "trialing",
        trialEndsAt: existing.trialEnd || trialEnd,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(users.id, userId));
      return { created: false, trialEnd: existing.trialEnd || trialEnd };
    }
    return { created: false, trialEnd: existing.trialEnd || trialEnd };
  }
  try {
    await db.insert(subscriptions).values({
      userId,
      status: "trialing",
      planType: selectedPlan,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      trialStart: now,
      trialEnd,
      cancelAtPeriodEnd: false
    });
    await db.update(users).set({
      subscriptionTier: "PRO" /* PRO */,
      subscriptionStatus: "trialing",
      trialEndsAt: trialEnd,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId));
    return { created: true, trialEnd };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("unique") || errorMessage.includes("duplicate")) {
      const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
      if (sub?.status === "trialing") {
        await db.update(users).set({
          subscriptionTier: "PRO" /* PRO */,
          subscriptionStatus: "trialing",
          trialEndsAt: sub.trialEnd || trialEnd,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(users.id, userId));
      }
      return { created: false, trialEnd: sub?.trialEnd || trialEnd };
    }
    throw error;
  }
}
async function expireTrialSubscription(userId) {
  await db.update(subscriptions).set({
    status: "expired"
  }).where(eq(subscriptions.userId, userId));
  await db.update(users).set({
    subscriptionTier: "BASIC" /* BASIC */,
    subscriptionStatus: "expired",
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq(users.id, userId));
}

// server/routers/user/recipes.router.ts
var router2 = Router2();
var openai2 = new OpenAI2({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});
var generateRecipeSchema = z.object({
  prioritizeExpiring: z.boolean().default(false),
  quickRecipe: z.boolean().default(false),
  ingredients: z.array(z.number()).optional(),
  servings: z.number().min(1).max(20).default(4),
  maxTime: z.number().min(5).max(480).default(60),
  dietaryRestrictions: z.string().optional(),
  cuisine: z.string().optional(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack", "late night snack"]).optional(),
  inventory: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      quantity: z.number().optional(),
      unit: z.string().optional(),
      expiryDate: z.string().nullable().optional()
    })
  ).optional(),
  equipment: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      alternatives: z.array(z.string()).optional()
    })
  ).optional(),
  macroTargets: z.object({
    protein: z.number().min(5).max(80).default(50),
    carbs: z.number().min(5).max(80).default(35),
    fat: z.number().min(5).max(80).default(15)
  }).optional(),
  previousRecipeTitles: z.array(z.string()).optional()
});
function calculateDaysUntilExpiry(expiryDate) {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const today = /* @__PURE__ */ new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
}
function organizeInventory(items, selectedIds) {
  const EXPIRING_THRESHOLD_DAYS = 3;
  const filteredItems = selectedIds && selectedIds.length > 0 ? items.filter((item) => selectedIds.includes(item.id)) : items;
  const itemsWithExpiry = filteredItems.map((item) => ({
    ...item,
    daysUntilExpiry: calculateDaysUntilExpiry(item.expiryDate)
  }));
  const expiringItems = itemsWithExpiry.filter(
    (item) => item.daysUntilExpiry !== null && item.daysUntilExpiry <= EXPIRING_THRESHOLD_DAYS
  ).map((item) => ({
    ...item,
    daysUntilExpiry: item.daysUntilExpiry
  })).sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  const otherItems = itemsWithExpiry.filter(
    (item) => item.daysUntilExpiry === null || item.daysUntilExpiry > EXPIRING_THRESHOLD_DAYS
  ).map((item) => ({
    ...item,
    daysUntilExpiry: item.daysUntilExpiry ?? void 0
  }));
  return { expiringItems, otherItems };
}
function buildSmartPrompt(params) {
  const {
    expiringItems,
    otherItems,
    prioritizeExpiring,
    quickRecipe,
    servings,
    maxTime,
    dietaryRestrictions,
    cuisine,
    mealType,
    equipment,
    macroTargets = { protein: 50, carbs: 35, fat: 15 },
    previousRecipeTitles = []
  } = params;
  let prompt = `You are a creative home chef helping reduce food waste.

`;
  prompt += `=== CRITICAL RULE #1 ===

`;
  prompt += `INVENTORY-ONLY RECIPES: Every single ingredient in the recipe MUST come from the user's inventory below. This includes:
`;
  prompt += `- Main ingredients (proteins, vegetables, grains)
`;
  prompt += `- Cooking fats (oil, butter, lard) - if not in inventory, use a dry cooking method or skip
`;
  prompt += `- Seasonings (salt, pepper, spices) - if not in inventory, omit or note "season to taste if available"
`;
  prompt += `- Liquids (broth, wine, vinegar) - if not in inventory, use water or omit

`;
  prompt += `ONLY EXCEPTION: Water and ice are always available and can be used freely.

`;
  prompt += `NO OTHER EXCEPTIONS. Do NOT add ANY ingredient that is not explicitly listed in the inventory.

`;
  prompt += `=== INGREDIENT SELECTION ===

`;
  prompt += `When selecting ingredients from the inventory, understand that similar items are the same:
`;
  prompt += `- "apples" and "green apples" are both apples
`;
  prompt += `- "chicken breast" and "chicken thighs" are both chicken
`;
  prompt += `- "extra virgin olive oil" and "olive oil" are both olive oil
`;
  prompt += `However, in your output, you MUST use the EXACT name as it appears in the inventory list below.

`;
  prompt += `SUBSTITUTIONS: You MAY suggest substitutes, but ONLY if the substitute is also in the user's inventory.

`;
  prompt += `LESS IS MORE: Prefer simpler recipes with fewer ingredients. A focused dish with 4-6 well-chosen ingredients is better than using everything available. Quality over quantity.

`;
  prompt += UNIT_CONVERSION_PROMPT_ADDITION + `
`;
  if (previousRecipeTitles.length > 0) {
    prompt += `=== VARIETY REQUIREMENT ===
`;
    prompt += `The user has recently generated these recipes. Create something SIGNIFICANTLY DIFFERENT:
`;
    previousRecipeTitles.forEach((title) => {
      prompt += `- ${title}
`;
    });
    prompt += `Choose a different cooking style, cuisine influence, or main ingredient focus.

`;
  }
  if (mealType) {
    prompt += `MEAL TYPE: ${mealType.toUpperCase()}
`;
    if (mealType === "breakfast") {
      prompt += `- Create a breakfast-appropriate dish (eggs, pancakes, toast, smoothies, oatmeal, etc.)
`;
      prompt += `- Focus on morning-friendly flavors and quick preparation
`;
    } else if (mealType === "lunch") {
      prompt += `- Create a satisfying lunch dish (salads, sandwiches, wraps, soups, light mains)
`;
      prompt += `- Balance nutrition and convenience
`;
    } else if (mealType === "dinner") {
      prompt += `- Create a hearty dinner dish (mains, pastas, stir-fries, casseroles)
`;
      prompt += `- Focus on satisfying, complete meals
`;
    } else if (mealType === "snack" || mealType === "late night snack") {
      prompt += `- Create a quick, light snack
`;
      prompt += `- Keep portions smaller and preparation simple
`;
    }
    prompt += `
`;
  }
  if (quickRecipe) {
    prompt += `IMPORTANT TIME CONSTRAINT: This recipe MUST be completable in under 20 minutes total (prep + cook time combined).
`;
    prompt += `- Prioritize quick-cooking methods (stir-fry, saut\xE9ing, no-cook, microwave)
`;
    prompt += `- Minimize prep work (use pre-cut, canned, or quick-prep ingredients)
`;
    prompt += `- One-pan or simple techniques preferred
`;
    prompt += `- No marinating, slow cooking, or extended baking required

`;
  }
  prompt += `=== USER'S KITCHEN INVENTORY ===

`;
  if (expiringItems.length > 0) {
    prompt += `ITEMS EXPIRING SOON (${expiringItems.length} items):
`;
    prompt += `NOTE: These items are expiring soon. Consider using them IF they make sense for a delicious, cohesive ${mealType || "meal"}. `;
    prompt += `However, a GOOD MEAL is MORE IMPORTANT than using expiring items. `;
    prompt += `Do NOT force expiring items into a recipe if they don't belong - it's better to skip them than create a bad dish.
`;
    const formattedExpiring = formatInventoryForPrompt(expiringItems);
    expiringItems.forEach((item, index2) => {
      const urgency = item.daysUntilExpiry <= 1 ? "EXPIRES TODAY/TOMORROW" : `expires in ${item.daysUntilExpiry} days`;
      prompt += `- ${formattedExpiring[index2]} - ${urgency}
`;
    });
    prompt += `
`;
  }
  if (otherItems.length > 0) {
    prompt += `ALSO AVAILABLE:
`;
    const formattedOther = formatInventoryForPrompt(otherItems);
    formattedOther.forEach((formatted) => {
      prompt += `- ${formatted}
`;
    });
    prompt += `
`;
  }
  if (equipment && equipment.length > 0) {
    prompt += `=== EQUIPMENT AVAILABLE ===
`;
    equipment.forEach((item) => {
      prompt += `- ${item.name}
`;
    });
    prompt += `Only use equipment from this list.

`;
  } else {
    prompt += `=== EQUIPMENT ===
`;
    prompt += `Assume basic equipment: Pot, Pan, Knife, Cutting board, Mixing bowl, Spoon, Fork
`;
    prompt += `Do NOT require specialty equipment like blenders, food processors, stand mixers.

`;
  }
  prompt += `=== USER PREFERENCES ===
`;
  prompt += `- Servings: ${servings}
`;
  if (quickRecipe) {
    prompt += `- Max TOTAL time: 20 minutes (prep + cook combined)
`;
  } else {
    prompt += `- Max time: ${maxTime} minutes
`;
  }
  if (dietaryRestrictions) {
    prompt += `- Diet: ${dietaryRestrictions}
`;
  }
  if (cuisine) {
    prompt += `- Cuisine style: ${cuisine}
`;
  }
  prompt += `
`;
  prompt += `=== NUTRITION TARGETS ===
`;
  prompt += `Target macro ratio by calories:
`;
  prompt += `- Protein: ~${macroTargets.protein}%
`;
  prompt += `- Carbohydrates: ~${macroTargets.carbs}%
`;
  prompt += `- Fat: ~${macroTargets.fat}%
`;
  prompt += `Prioritize lean proteins and whole food carb sources when possible.

`;
  prompt += `=== MEAL COMPOSITION GUIDELINES ===
`;
  prompt += `- Use only ONE primary protein source per dish (e.g., chicken OR beef, not both)
`;
  prompt += `- Pick the protein that best fits the cuisine/dish style or is expiring soonest
`;
  prompt += `- Focus on complementary ingredients that enhance the main protein
`;
  prompt += `- Create cohesive dishes that make culinary sense, not just ingredient dumps
`;
  prompt += `- Less is more: a well-balanced 4-6 ingredient dish beats a cluttered one

`;
  const examplePrepTime = quickRecipe ? 5 : 15;
  const exampleCookTime = quickRecipe ? 10 : 30;
  const hasEquipment = equipment && equipment.length > 0;
  prompt += `=== NAMING GUIDELINES ===
`;
  prompt += `The inventory items may have verbose database-style names like "chicken, broilers or fryers, breast, meat only, raw".
`;
  prompt += `TITLE & DESCRIPTION: Use simple, natural names that sound appetizing:
`;
  prompt += `- Say "chicken breast" not "chicken, broilers or fryers, breast, meat only, raw"
`;
  prompt += `- Say "eggs" not "egg, whole, raw, fresh"
`;
  prompt += `- Say "tomatoes" not "tomatoes, red, ripe, raw, year round average"
`;
  prompt += `- Say "white bread" not "bread, white, commercially prepared"
`;
  prompt += `INGREDIENTS ARRAY: Keep the original inventory name so the app can match it.
`;
  prompt += `Example: If inventory has "chicken, broilers or fryers, breast, meat only, raw", use that exact name in ingredients array.

`;
  prompt += `=== REQUIRED OUTPUT FORMAT ===
`;
  prompt += `Return ONLY this JSON structure:
`;
  prompt += `{
  "title": "Descriptive recipe name",
  "description": "2-3 sentence appetizing description. Use natural ingredient names (e.g., 'chicken breast' not 'chicken, broilers or fryers, breast, meat only, raw'). Make it sound delicious.",
  "ingredients": [
    {"name": "exact name from inventory list", "quantity": 1, "unit": "cup", "fromInventory": true},
    {"name": "exact name from inventory list", "quantity": 2, "unit": "tbsp", "fromInventory": true}
  ],
  "instructions": ["Step 1: Specific action...", "Step 2: ..."],
  "prepTime": ${examplePrepTime},
  "cookTime": ${exampleCookTime},
  "servings": ${servings},
  "nutrition": {"calories": 400, "protein": ${Math.round(400 * macroTargets.protein / 100 / 4)}, "carbs": ${Math.round(400 * macroTargets.carbs / 100 / 4)}, "fat": ${Math.round(400 * macroTargets.fat / 100 / 9)}},
  "usedExpiringItems": ["item1", "item2"]${hasEquipment ? `,
  "requiredEquipment": ["Pan"],
  "optionalEquipment": []` : ""}
}

`;
  prompt += `=== FINAL CHECKLIST ===
`;
  prompt += `Before responding, verify:
`;
  prompt += `- EVERY ingredient comes from the user's inventory (no exceptions for oil, salt, etc.)
`;
  prompt += `- Ingredient names in the JSON array match the inventory names exactly for proper matching
`;
  prompt += `- All ingredients marked fromInventory: true
`;
  prompt += `- Title and description use natural, appetizing language (simplified ingredient names)
`;
  prompt += `- Recipe is different from previous generations if any were listed
`;
  prompt += `- Total time (prepTime + cookTime) \u2264 ${quickRecipe ? 20 : maxTime} minutes
`;
  prompt += `- Nutrition roughly matches target macros: ${macroTargets.protein}% protein, ${macroTargets.carbs}% carbs, ${macroTargets.fat}% fat
`;
  return prompt;
}
router2.post("/generate", async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const limitCheck = await checkAiRecipeLimit(req.userId);
    const remaining = typeof limitCheck.remaining === "number" ? limitCheck.remaining : Infinity;
    if (remaining < 1) {
      return res.status(403).json({
        error: "Monthly AI recipe limit reached. Upgrade to Pro for unlimited recipes.",
        code: "AI_RECIPE_LIMIT_REACHED",
        limit: limitCheck.limit,
        remaining: 0
      });
    }
    const parseResult = generateRecipeSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessages = parseResult.error.errors.map((e) => e.message).join(", ");
      return res.status(400).json({
        error: "Invalid input",
        details: errorMessages
      });
    }
    const {
      prioritizeExpiring,
      quickRecipe,
      ingredients: selectedIngredientIds,
      servings,
      maxTime,
      dietaryRestrictions,
      cuisine,
      mealType,
      inventory,
      equipment,
      macroTargets,
      previousRecipeTitles
    } = parseResult.data;
    if (!inventory || inventory.length === 0) {
      if (selectedIngredientIds && selectedIngredientIds.length === 0) {
        return res.status(400).json({
          error: "No ingredients available",
          details: "Please add items to your inventory or select ingredients"
        });
      }
    }
    const { expiringItems, otherItems } = organizeInventory(
      inventory || [],
      selectedIngredientIds
    );
    if (expiringItems.length === 0 && otherItems.length === 0) {
      return res.status(400).json({
        error: "No ingredients to use",
        details: "Please add items to your inventory"
      });
    }
    const effectiveMaxTime = quickRecipe ? 20 : maxTime;
    const prompt = buildSmartPrompt({
      expiringItems,
      otherItems,
      prioritizeExpiring,
      quickRecipe,
      servings,
      maxTime: effectiveMaxTime,
      dietaryRestrictions,
      cuisine,
      mealType,
      equipment,
      macroTargets,
      previousRecipeTitles
    });
    console.log(
      "Smart recipe generation prompt:",
      prompt.substring(0, 500) + "..."
    );
    const completion = await openai2.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a precision culinary assistant that creates recipes EXCLUSIVELY from user-provided ingredients.

ABSOLUTE RULES:
1. NEVER add ingredients not in the user's inventory - this includes oils, butter, salt, pepper, and spices
2. If an ingredient isn't listed, assume the user doesn't have it
3. Water and ice are the ONLY exceptions (always available)
4. Use fuzzy matching: "chicken" matches "chicken breast", "apple" matches "green apples"
5. Create simple, focused dishes with 4-6 ingredients rather than using everything available
6. Always respond with valid JSON matching the exact schema provided`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }
    let recipe = JSON.parse(content);
    const ALLOWED_UTILITIES = /* @__PURE__ */ new Set([
      "water",
      "tap water",
      "cold water",
      "hot water",
      "warm water",
      "ice water",
      "ice",
      "ice cubes"
    ]);
    const fuzzyMatch = (recipeIngredient, inventoryItem) => {
      const normalize = (s) => {
        let normalized = s.toLowerCase().trim().replace(/[,()]/g, " ").replace(
          /\b(fresh|organic|raw|cooked|frozen|canned|dried|whole|sliced|diced|chopped|minced|ground|crushed|shredded|grated|peeled|boneless|skinless|lean|extra\s*virgin|light|heavy|low[\s-]?fat|fat[\s-]?free|unsalted|salted|sweetened|unsweetened|plain|greek|regular|large|medium|small|ripe|overripe|unripe|commercially\s*prepared|store[\s-]?bought|homemade|white|wheat|multigrain|enriched)\b/g,
          ""
        ).replace(/\b(loaf|loaves|slice|slices|bag|package|can|jar|bottle|box|bunch|head)\s+of\s+/g, "").replace(/\s+/g, " ").trim();
        const vesWordsToF = {
          knives: "knife",
          loaves: "loaf",
          leaves: "leaf",
          halves: "half",
          calves: "calf",
          shelves: "shelf",
          wolves: "wolf",
          selves: "self"
        };
        for (const [plural, singular] of Object.entries(vesWordsToF)) {
          if (normalized.endsWith(plural)) {
            normalized = normalized.slice(0, -plural.length) + singular;
            break;
          }
        }
        if (!normalized.endsWith("f") && !normalized.endsWith("fe")) {
          const singularWordsEndingInS = /* @__PURE__ */ new Set([
            "couscous",
            "hummus",
            "molasses",
            "asparagus",
            "citrus",
            "hibiscus",
            "cactus",
            "octopus",
            "surplus",
            "bonus",
            "mucus",
            "radius",
            "focus",
            "bass",
            "moss",
            "grass",
            "class",
            "glass",
            "mass",
            "pass",
            "brass",
            "swiss",
            "stress",
            "dress",
            "press",
            "chess",
            "less",
            "mess",
            "brussels",
            "sprouts",
            "oats",
            "grits",
            "nuts",
            "greens",
            "beans"
          ]);
          const skipDepluralization = singularWordsEndingInS.has(normalized);
          if (!skipDepluralization) {
            if (normalized.endsWith("ies")) {
              normalized = normalized.slice(0, -3) + "y";
            } else if (normalized.endsWith("oes")) {
              normalized = normalized.slice(0, -2);
            } else if (normalized.match(/(sh|ch|x|z|ss)es$/)) {
              normalized = normalized.slice(0, -2);
            } else if (normalized.endsWith("s") && normalized.length > 3) {
              normalized = normalized.slice(0, -1);
            }
          }
        }
        normalized = normalized.replace(/[-_]/g, " ");
        return normalized;
      };
      const normRecipe = normalize(recipeIngredient);
      const normInventory = normalize(inventoryItem);
      if (normRecipe === normInventory) return true;
      if (normRecipe.includes(normInventory) || normInventory.includes(normRecipe))
        return true;
      const wordsRecipe = normRecipe.split(/\s+/).filter((w) => w.length > 1);
      const wordsInventory = normInventory.split(/\s+/).filter((w) => w.length > 1);
      const coreRecipe = wordsRecipe[wordsRecipe.length - 1] || normRecipe;
      const coreInventory = wordsInventory[wordsInventory.length - 1] || normInventory;
      if (coreRecipe === coreInventory) return true;
      const matchingWords = wordsRecipe.filter(
        (wr) => wordsInventory.some(
          (wi) => wr === wi || wr.length > 3 && wi.length > 3 && (wr.includes(wi) || wi.includes(wr))
        )
      );
      if (matchingWords.length > 0 && matchingWords.length >= Math.max(1, Math.min(wordsRecipe.length, wordsInventory.length) * 0.4)) {
        return true;
      }
      return false;
    };
    const isAllowedUtility = (ingredientName) => {
      const normalized = ingredientName.toLowerCase().trim();
      return ALLOWED_UTILITIES.has(normalized);
    };
    const inventoryItems = [...expiringItems, ...otherItems];
    const originalIngredientCount = recipe.ingredients?.length || 0;
    recipe.ingredients = (recipe.ingredients || []).map((ing) => {
      const matchedInventoryItem = inventoryItems.find(
        (invItem) => fuzzyMatch(ing.name, invItem.name)
      );
      if (matchedInventoryItem) {
        const recipeQty = typeof ing.quantity === "number" ? ing.quantity : parseFloat(String(ing.quantity)) || 1;
        const recipeUnit = ing.unit || "";
        const inventoryQty = matchedInventoryItem.quantity || 1;
        const inventoryUnit = matchedInventoryItem.unit || null;
        const comparison = compareQuantities(
          inventoryQty,
          inventoryUnit,
          recipeQty,
          recipeUnit
        );
        return {
          ...ing,
          fromInventory: true,
          availabilityStatus: comparison.status,
          percentAvailable: comparison.percentAvailable ?? 100
        };
      }
      if (isAllowedUtility(ing.name)) {
        console.log(`Allowing utility ingredient: ${ing.name}`);
        return {
          ...ing,
          fromInventory: false,
          availabilityStatus: "available",
          percentAvailable: 100
        };
      }
      console.log(`Removing ingredient not in inventory: ${ing.name}`);
      return null;
    }).filter((ing) => ing !== null);
    const inventoryIngredients = recipe.ingredients.filter(
      (ing) => ing.fromInventory === true
    );
    if (inventoryIngredients.length < 2) {
      console.error(
        `Recipe has only ${inventoryIngredients.length} valid inventory ingredients after filtering`
      );
      return res.status(400).json({
        error: "Could not generate a valid recipe",
        details: "Not enough matching ingredients were found. Please try again or add more items to your inventory."
      });
    }
    const validIngredientTerms = recipe.ingredients.flatMap((ing) => {
      const name = ing.name.toLowerCase();
      const words = name.split(/\s+/).filter((w) => w.length > 2);
      return [name, ...words];
    });
    const findUnmatchedIngredients = (text2) => {
      const textLower = text2.toLowerCase();
      const foodTerms = [
        // Proteins
        "chicken",
        "beef",
        "pork",
        "fish",
        "salmon",
        "tuna",
        "shrimp",
        "lamb",
        "bacon",
        "ham",
        "turkey",
        "sausage",
        "steak",
        "ground meat",
        "meatball",
        "tofu",
        "tempeh",
        "seitan",
        "duck",
        "veal",
        "crab",
        "lobster",
        "scallop",
        // Vegetables
        "tomato",
        "tomatoes",
        "onion",
        "onions",
        "garlic",
        "mushroom",
        "mushrooms",
        "carrot",
        "carrots",
        "potato",
        "potatoes",
        "broccoli",
        "spinach",
        "lettuce",
        "cucumber",
        "zucchini",
        "squash",
        "eggplant",
        "bell pepper",
        "jalape\xF1o",
        "celery",
        "cabbage",
        "kale",
        "asparagus",
        "cauliflower",
        "green beans",
        "artichoke",
        "beet",
        "radish",
        "turnip",
        "leek",
        "shallot",
        "scallion",
        // Fruits
        "apple",
        "banana",
        "orange",
        "lemon",
        "lime",
        "avocado",
        "mango",
        "pineapple",
        "strawberry",
        "blueberry",
        "raspberry",
        "grape",
        "peach",
        "pear",
        "melon",
        "watermelon",
        "cherry",
        "kiwi",
        "coconut",
        "pomegranate",
        "fig",
        "date",
        // Dairy
        "cheese",
        "cheddar",
        "mozzarella",
        "parmesan",
        "feta",
        "cream cheese",
        "cream",
        "milk",
        "yogurt",
        "sour cream",
        "butter",
        "ghee",
        "ricotta",
        // Grains & Starches
        "rice",
        "pasta",
        "noodle",
        "bread",
        "tortilla",
        "quinoa",
        "couscous",
        "oat",
        "barley",
        "farro",
        "bulgur",
        "flour",
        "cornmeal",
        "polenta",
        // Eggs
        "egg",
        "eggs",
        // Condiments & Sauces
        "mayo",
        "mayonnaise",
        "ketchup",
        "mustard",
        "soy sauce",
        "vinegar",
        "hot sauce",
        "sriracha",
        "worcestershire",
        "tahini",
        "pesto",
        // Legumes
        "beans",
        "lentil",
        "chickpea",
        "black beans",
        "kidney beans",
        "pinto beans",
        // Herbs & Aromatics
        "cilantro",
        "basil",
        "parsley",
        "thyme",
        "rosemary",
        "oregano",
        "dill",
        "mint",
        "sage",
        "chive",
        "ginger",
        // Others
        "corn",
        "peas",
        "olive",
        "caper",
        "pickle",
        "honey",
        "maple syrup",
        "almond",
        "walnut",
        "cashew",
        "peanut",
        "pecan",
        "pistachio"
      ];
      return foodTerms.filter((term) => {
        if (!textLower.includes(term)) return false;
        if (ALLOWED_UTILITIES.has(term)) return false;
        return !validIngredientTerms.some(
          (valid) => valid.includes(term) || term.includes(valid)
        );
      });
    };
    const descPhantoms = findUnmatchedIngredients(recipe.description || "");
    if (descPhantoms.length > 0) {
      console.log(
        `Description mentions invalid ingredients: ${descPhantoms.join(", ")}. Rewriting.`
      );
      const ingredientList = inventoryIngredients.map((i) => i.name).join(", ");
      recipe.description = `A delicious dish featuring ${ingredientList}.`;
    }
    const instructionsText = (recipe.instructions || []).join(" ");
    const instrPhantoms = findUnmatchedIngredients(instructionsText);
    if (instrPhantoms.length > 0) {
      console.log(
        `Instructions mention invalid ingredients: ${instrPhantoms.join(", ")}. Filtering.`
      );
      recipe.instructions = (recipe.instructions || []).map((step) => {
        let cleanStep = step;
        instrPhantoms.forEach((phantom) => {
          const regex = new RegExp(`\\b${phantom}s?\\b`, "gi");
          cleanStep = cleanStep.replace(regex, "ingredients");
        });
        return cleanStep;
      });
    }
    recipe.ingredients = recipe.ingredients.map((ing) => ({
      ...ing,
      unit: normalizeUnit(ing.unit) || ing.unit
    }));
    const filteredCount = originalIngredientCount - recipe.ingredients.length;
    if (filteredCount > 0) {
      console.log(`Filtered out ${filteredCount} ingredients not in inventory`);
    }
    if (quickRecipe) {
      const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
      if (totalTime > 20) {
        console.log(
          `Quick recipe time exceeded (${totalTime} min), clamping to 20 min total`
        );
        const ratio = 20 / totalTime;
        recipe.prepTime = Math.max(
          5,
          Math.floor((recipe.prepTime || 10) * ratio)
        );
        recipe.cookTime = Math.max(5, 20 - recipe.prepTime);
      }
    }
    const usedExpiringCount = recipe.usedExpiringItems?.length || 0;
    recipe.usedExpiringCount = usedExpiringCount;
    console.log(
      `Smart recipe generated: "${recipe.title}" using ${usedExpiringCount}/${expiringItems.length} expiring items`
    );
    await incrementAiRecipeCount(req.userId);
    const updatedLimit = await checkAiRecipeLimit(req.userId);
    return res.json({
      ...recipe,
      totalExpiringItems: expiringItems.length,
      prioritizedExpiring: prioritizeExpiring,
      subscription: {
        aiRecipesRemaining: updatedLimit.remaining,
        aiRecipesLimit: updatedLimit.limit
      }
    });
  } catch (error) {
    console.error("Smart recipe generation error:", error);
    return res.status(500).json({ error: "Failed to generate recipe" });
  }
});
var generateImageSchema = z.object({
  title: z.string().min(1, "Recipe title is required").max(100),
  description: z.string().max(1e3).optional(),
  cuisine: z.string().max(50).optional()
});
function sanitizeForPrompt(text2, maxLength) {
  return text2.replace(/[^\w\s,.-]/g, "").trim().slice(0, maxLength);
}
var ALLOWED_CUISINES = [
  "italian",
  "mexican",
  "chinese",
  "japanese",
  "indian",
  "thai",
  "french",
  "mediterranean",
  "american",
  "korean",
  "vietnamese",
  "greek",
  "spanish",
  "middle eastern",
  "caribbean",
  "african"
];
router2.post("/generate-image", async (req, res) => {
  try {
    const body = generateImageSchema.parse(req.body);
    const { title, description, cuisine } = body;
    const safeTitle = sanitizeForPrompt(title, 80);
    const safeDescription = description ? sanitizeForPrompt(description, 150) : "";
    const safeCuisine = cuisine && ALLOWED_CUISINES.includes(cuisine.toLowerCase()) ? cuisine.toLowerCase() : "";
    let imagePrompt = `Professional food photography of a dish called ${safeTitle}`;
    if (safeDescription) {
      imagePrompt += `. The dish features ${safeDescription}`;
    }
    if (safeCuisine) {
      imagePrompt += `, ${safeCuisine} cuisine style`;
    }
    imagePrompt += `. Beautifully plated on a ceramic dish, natural lighting, shallow depth of field, appetizing colors, restaurant quality presentation, overhead shot, clean background, high resolution, photorealistic. No text or words in the image.`;
    console.log(`Generating recipe image for: "${safeTitle}"`);
    const response = await openai2.images.generate({
      model: "gpt-image-1",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "low"
    });
    const imageData = response.data?.[0];
    if (!imageData) {
      throw new Error("No image data returned");
    }
    if (imageData.b64_json) {
      return res.json({
        success: true,
        imageBase64: imageData.b64_json
      });
    } else if (imageData.url) {
      return res.json({
        success: true,
        imageUrl: imageData.url
      });
    } else {
      throw new Error("No image URL or data returned");
    }
  } catch (error) {
    console.error("Recipe image generation error:", error);
    return res.status(500).json({
      error: "Failed to generate image",
      success: false
    });
  }
});
var recipeScanRequestSchema = z.object({
  image: z.string().min(1, "Base64 image data is required")
});
var RECIPE_SCAN_PROMPT = `Analyze this image of a recipe from a cookbook, magazine, or printed page.

Extract the following information:
1. Recipe title
2. Description (if visible)
3. All ingredients with their quantities
4. Step-by-step cooking instructions
5. Prep time (if visible)
6. Cook time (if visible)
7. Number of servings (if visible)
8. Any notes or tips

Return valid JSON in this exact format:
{
  "title": "Recipe Title",
  "description": "Brief description of the dish",
  "ingredients": [
    "2 cups flour",
    "1 tsp salt",
    "3 large eggs"
  ],
  "instructions": [
    "Preheat oven to 350\xB0F",
    "Mix dry ingredients in a bowl",
    "Add wet ingredients and stir until combined"
  ],
  "prepTime": "15 minutes",
  "cookTime": "30 minutes",
  "servings": 4,
  "notes": "Any additional tips or variations"
}

If the image doesn't show a readable recipe, return:
{
  "error": "Could not read recipe from this image",
  "suggestion": "Please take a clearer photo of the recipe, making sure all text is visible"
}`;
function detectMimeType(base64) {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBORw")) return "image/png";
  if (base64.startsWith("R0lGOD")) return "image/gif";
  if (base64.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}
router2.post("/scan", async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const hasAccess = await checkFeatureAccess(req.userId, "recipeScanning");
    if (!hasAccess) {
      return res.status(403).json({
        error: "Recipe scanning is a Pro feature. Upgrade to Pro to scan recipes from images.",
        code: "FEATURE_NOT_AVAILABLE",
        feature: "recipeScanning"
      });
    }
    const contentType = req.headers["content-type"] || "";
    let base64Image;
    if (contentType.includes("application/json")) {
      const parseResult = recipeScanRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: "Invalid request body",
          details: parseResult.error.errors
        });
      }
      base64Image = parseResult.data.image.replace(
        /^data:image\/\w+;base64,/,
        ""
      );
    } else {
      return res.status(400).json({
        error: "Expected application/json content type"
      });
    }
    const mimeType = detectMimeType(base64Image);
    const dataUrl = `data:${mimeType};base64,${base64Image}`;
    console.log(
      `Scanning recipe: ${(base64Image.length / 1024).toFixed(1)}KB`
    );
    const completion = await openai2.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at reading and extracting recipes from images of cookbooks, magazines, and printed recipe cards. Extract information accurately and return valid JSON."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: RECIPE_SCAN_PROMPT
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({
        error: "No response from AI service"
      });
    }
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return res.status(500).json({
        error: "Failed to parse recipe scan results"
      });
    }
    if (result.error) {
      return res.status(200).json({
        error: result.error,
        suggestion: result.suggestion
      });
    }
    console.log(`Recipe scan complete: "${result.title}"`);
    return res.json({
      title: result.title || "Untitled Recipe",
      description: result.description || "",
      ingredients: result.ingredients || [],
      instructions: result.instructions || [],
      prepTime: result.prepTime || "",
      cookTime: result.cookTime || "",
      servings: result.servings || 4,
      notes: result.notes || ""
    });
  } catch (error) {
    console.error("Recipe scan error:", error);
    return res.status(500).json({
      error: "Failed to scan recipe",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
var recipes_router_default = router2;

// server/routers/user/nutrition.router.ts
import { Router as Router3 } from "express";
import OpenAI3 from "openai";
import { z as z2 } from "zod";
import { desc, eq as eq2 } from "drizzle-orm";

// server/integrations/openFoodFacts.ts
var OFF_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
var OFF_PRODUCT_URL = "https://world.openfoodfacts.org/api/v0/product";
var USER_AGENT = "ChefSpAIce/1.0 (contact@chefspaice.app)";
var lastRequestTime = 0;
var MIN_REQUEST_INTERVAL = 100;
async function respectRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(
      (resolve2) => setTimeout(resolve2, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();
}
async function searchOpenFoodFacts(searchTerms, pageSize = 24) {
  try {
    await respectRateLimit();
    const params = new URLSearchParams({
      search_terms: searchTerms,
      json: "true",
      page_size: pageSize.toString(),
      search_simple: "1",
      action: "process"
    });
    const response = await fetch(`${OFF_SEARCH_URL}?${params}`, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      console.error(
        `OpenFoodFacts search error: ${response.status} ${response.statusText}`
      );
      return [];
    }
    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error("Error searching OpenFoodFacts:", error);
    return [];
  }
}
async function lookupBarcode(barcode) {
  try {
    await respectRateLimit();
    const cleanBarcode = barcode.replace(/\D/g, "");
    const response = await fetch(`${OFF_PRODUCT_URL}/${cleanBarcode}.json`, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      console.error(
        `OpenFoodFacts lookup error: ${response.status} ${response.statusText}`
      );
      return null;
    }
    const data = await response.json();
    if (data.status !== 1 || !data.product) {
      return null;
    }
    return data.product;
  } catch (error) {
    console.error("Error looking up barcode:", error);
    return null;
  }
}
function getProductName(product) {
  return product.product_name || product.product_name_en || product.generic_name || "Unknown Product";
}
function parseCategories(categoriesString) {
  if (!categoriesString) return "Other";
  const categories = categoriesString.split(",").map((c) => c.trim());
  const firstCategory = categories[0] || "Other";
  const cleanCategory = firstCategory.replace(/^en:/, "").replace(/-/g, " ");
  return cleanCategory.charAt(0).toUpperCase() + cleanCategory.slice(1);
}
function getCalories(nutriments) {
  if (!nutriments) return 0;
  return Math.round(
    nutriments.energy_kcal_100g || nutriments["energy-kcal_100g"] || 0
  );
}
function getSodiumMg(nutriments) {
  if (!nutriments) return void 0;
  if (nutriments.sodium_100g !== void 0) {
    return Math.round(nutriments.sodium_100g * 1e3);
  }
  if (nutriments.salt_100g !== void 0) {
    return Math.round(nutriments.salt_100g * 400);
  }
  return void 0;
}
function mapOFFToFoodItem(product) {
  const nutriments = product.nutriments;
  return {
    name: getProductName(product),
    category: parseCategories(product.categories),
    brand: product.brands?.split(",")[0]?.trim(),
    imageUrl: product.image_url || product.image_front_url || product.image_small_url,
    nutrition: {
      calories: getCalories(nutriments),
      protein: Math.round((nutriments?.proteins_100g || 0) * 10) / 10,
      carbs: Math.round((nutriments?.carbohydrates_100g || 0) * 10) / 10,
      fat: Math.round((nutriments?.fat_100g || 0) * 10) / 10,
      fiber: nutriments?.fiber_100g !== void 0 ? Math.round(nutriments.fiber_100g * 10) / 10 : void 0,
      sugar: nutriments?.sugars_100g !== void 0 ? Math.round(nutriments.sugars_100g * 10) / 10 : void 0,
      sodium: getSodiumMg(nutriments),
      servingSize: product.serving_size
    },
    source: "openfoodfacts",
    sourceId: product.code,
    nutriscoreGrade: product.nutriscore_grade,
    novaGroup: product.nova_group
  };
}
function hasCompleteNutritionData(product) {
  const n = product.nutriments;
  if (!n) return false;
  const hasCalories = n.energy_kcal_100g !== void 0 || n["energy-kcal_100g"] !== void 0;
  const hasProtein = n.proteins_100g !== void 0;
  const hasCarbs = n.carbohydrates_100g !== void 0;
  const hasFat = n.fat_100g !== void 0;
  return hasCalories && hasProtein && hasCarbs && hasFat;
}

// server/routers/user/nutrition.router.ts
init_schema();
init_db();
var router3 = Router3();
var openai3 = new OpenAI3({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});
var nutritionCache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS3 = 30 * 24 * 60 * 60 * 1e3;
var USDA_NUTRIENT_IDS = {
  ENERGY: 1008,
  PROTEIN: 1003,
  TOTAL_FAT: 1004,
  SATURATED_FAT: 1258,
  TRANS_FAT: 1257,
  CHOLESTEROL: 1253,
  SODIUM: 1093,
  CARBOHYDRATES: 1005,
  FIBER: 1079,
  SUGARS_TOTAL: 2e3,
  ADDED_SUGARS: 1235,
  VITAMIN_D: 1114,
  CALCIUM: 1087,
  IRON: 1089,
  POTASSIUM: 1092
};
function getCacheKey(foodId, source) {
  return `${source}:${foodId}`;
}
function getFromCache2(key) {
  const cached = nutritionCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    nutritionCache.delete(key);
    return null;
  }
  return cached;
}
function setInCache2(key, nutrition, source, sourceId, incomplete = false) {
  const now = Date.now();
  nutritionCache.set(key, {
    nutrition,
    source,
    sourceId,
    incomplete,
    timestamp: now,
    expiresAt: now + CACHE_TTL_MS3
  });
}
function findNutrientValue2(nutrients, nutrientId) {
  const nutrient = nutrients.find(
    (n) => n.nutrientId === nutrientId || n.nutrient?.id === nutrientId
  );
  if (!nutrient) return void 0;
  return nutrient.value ?? nutrient.amount;
}
function mapUSDAToNutritionFacts(usdaFood) {
  const nutrients = usdaFood.foodNutrients || [];
  const calories = findNutrientValue2(nutrients, USDA_NUTRIENT_IDS.ENERGY);
  const protein = findNutrientValue2(nutrients, USDA_NUTRIENT_IDS.PROTEIN);
  const totalFat = findNutrientValue2(nutrients, USDA_NUTRIENT_IDS.TOTAL_FAT);
  const saturatedFat = findNutrientValue2(
    nutrients,
    USDA_NUTRIENT_IDS.SATURATED_FAT
  );
  const transFat = findNutrientValue2(nutrients, USDA_NUTRIENT_IDS.TRANS_FAT);
  const cholesterol = findNutrientValue2(
    nutrients,
    USDA_NUTRIENT_IDS.CHOLESTEROL
  );
  const sodium = findNutrientValue2(nutrients, USDA_NUTRIENT_IDS.SODIUM);
  const carbs = findNutrientValue2(nutrients, USDA_NUTRIENT_IDS.CARBOHYDRATES);
  const fiber = findNutrientValue2(nutrients, USDA_NUTRIENT_IDS.FIBER);
  const sugars = findNutrientValue2(nutrients, USDA_NUTRIENT_IDS.SUGARS_TOTAL);
  const addedSugars = findNutrientValue2(
    nutrients,
    USDA_NUTRIENT_IDS.ADDED_SUGARS
  );
  const vitaminD = findNutrientValue2(nutrients, USDA_NUTRIENT_IDS.VITAMIN_D);
  const calcium = findNutrientValue2(nutrients, USDA_NUTRIENT_IDS.CALCIUM);
  const iron = findNutrientValue2(nutrients, USDA_NUTRIENT_IDS.IRON);
  const potassium = findNutrientValue2(nutrients, USDA_NUTRIENT_IDS.POTASSIUM);
  let servingSize = "100g";
  if (usdaFood.servingSize && usdaFood.servingSizeUnit) {
    servingSize = `${usdaFood.servingSize}${usdaFood.servingSizeUnit}`;
  }
  const incomplete = calories === void 0 || protein === void 0 || totalFat === void 0 || carbs === void 0;
  return {
    nutrition: {
      servingSize,
      servingsPerContainer: void 0,
      calories: Math.round(calories ?? 0),
      totalFat: Math.round((totalFat ?? 0) * 10) / 10,
      saturatedFat: saturatedFat !== void 0 ? Math.round(saturatedFat * 10) / 10 : void 0,
      transFat: transFat !== void 0 ? Math.round(transFat * 10) / 10 : void 0,
      cholesterol: cholesterol !== void 0 ? Math.round(cholesterol) : void 0,
      sodium: Math.round(sodium ?? 0),
      totalCarbohydrates: Math.round((carbs ?? 0) * 10) / 10,
      dietaryFiber: fiber !== void 0 ? Math.round(fiber * 10) / 10 : void 0,
      totalSugars: sugars !== void 0 ? Math.round(sugars * 10) / 10 : void 0,
      addedSugars: addedSugars !== void 0 ? Math.round(addedSugars * 10) / 10 : void 0,
      protein: Math.round((protein ?? 0) * 10) / 10,
      vitaminD: vitaminD !== void 0 ? Math.round(vitaminD * 10) / 10 : void 0,
      calcium: calcium !== void 0 ? Math.round(calcium) : void 0,
      iron: iron !== void 0 ? Math.round(iron * 10) / 10 : void 0,
      potassium: potassium !== void 0 ? Math.round(potassium) : void 0
    },
    incomplete
  };
}
function mapOFFToNutritionFacts(product) {
  const n = product.nutriments;
  const calories = n?.energy_kcal_100g ?? n?.["energy-kcal_100g"] ?? 0;
  const protein = n?.proteins_100g ?? 0;
  const fat = n?.fat_100g ?? 0;
  const carbs = n?.carbohydrates_100g ?? 0;
  const fiber = n?.fiber_100g;
  const sugars = n?.sugars_100g;
  let sodium;
  if (n?.sodium_100g !== void 0) {
    sodium = Math.round(n.sodium_100g * 1e3);
  } else if (n?.salt_100g !== void 0) {
    sodium = Math.round(n.salt_100g * 400);
  }
  const incomplete = !hasCompleteNutritionData(product);
  return {
    nutrition: {
      servingSize: product.serving_size || "100g",
      servingsPerContainer: void 0,
      calories: Math.round(calories),
      totalFat: Math.round(fat * 10) / 10,
      saturatedFat: void 0,
      transFat: void 0,
      cholesterol: void 0,
      sodium: sodium ?? 0,
      totalCarbohydrates: Math.round(carbs * 10) / 10,
      dietaryFiber: fiber !== void 0 ? Math.round(fiber * 10) / 10 : void 0,
      totalSugars: sugars !== void 0 ? Math.round(sugars * 10) / 10 : void 0,
      addedSugars: void 0,
      protein: Math.round(protein * 10) / 10,
      vitaminD: void 0,
      calcium: void 0,
      iron: void 0,
      potassium: void 0
    },
    incomplete
  };
}
async function estimateNutritionWithAI(foodName) {
  const prompt = `Estimate the nutrition facts for: "${foodName}"

Return a JSON object with these fields (per 100g serving):
{
  "calories": number,
  "totalFat": number (grams),
  "saturatedFat": number (grams),
  "sodium": number (mg),
  "totalCarbohydrates": number (grams),
  "dietaryFiber": number (grams),
  "totalSugars": number (grams),
  "protein": number (grams)
}

Use typical nutritional values for this food. Be accurate but conservative.`;
  try {
    const completion = await openai3.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a nutrition database. Provide accurate nutritional estimates based on USDA data. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 256
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }
    const parsed = JSON.parse(content);
    return {
      nutrition: {
        servingSize: "100g (estimated)",
        servingsPerContainer: void 0,
        calories: Math.round(parsed.calories || 0),
        totalFat: Math.round((parsed.totalFat || 0) * 10) / 10,
        saturatedFat: parsed.saturatedFat !== void 0 ? Math.round(parsed.saturatedFat * 10) / 10 : void 0,
        transFat: void 0,
        cholesterol: void 0,
        sodium: Math.round(parsed.sodium || 0),
        totalCarbohydrates: Math.round((parsed.totalCarbohydrates || 0) * 10) / 10,
        dietaryFiber: parsed.dietaryFiber !== void 0 ? Math.round(parsed.dietaryFiber * 10) / 10 : void 0,
        totalSugars: parsed.totalSugars !== void 0 ? Math.round(parsed.totalSugars * 10) / 10 : void 0,
        addedSugars: void 0,
        protein: Math.round((parsed.protein || 0) * 10) / 10,
        vitaminD: void 0,
        calcium: void 0,
        iron: void 0,
        potassium: void 0
      },
      incomplete: true
    };
  } catch (error) {
    console.error("AI nutrition estimation error:", error);
    throw error;
  }
}
router3.get("/:foodId", async (req, res) => {
  try {
    const { foodId } = req.params;
    const source = req.query.source || "usda";
    if (!foodId) {
      return res.status(400).json({ error: "Food ID is required" });
    }
    const cacheKey = getCacheKey(foodId, source);
    const cached = getFromCache2(cacheKey);
    if (cached) {
      console.log(`Nutrition cache hit for: ${foodId}`);
      return res.json({
        nutrition: cached.nutrition,
        source: "cache",
        originalSource: cached.source,
        sourceId: cached.sourceId,
        incomplete: cached.incomplete,
        cached: true
      });
    }
    if (source === "usda") {
      const fdcId = parseInt(foodId, 10);
      if (isNaN(fdcId)) {
        return res.status(400).json({ error: "Invalid USDA food ID" });
      }
      const usdaFood = await getUSDAFood(fdcId);
      if (usdaFood) {
        const { nutrition, incomplete } = mapUSDAToNutritionFacts(usdaFood);
        setInCache2(cacheKey, nutrition, "usda", fdcId, incomplete);
        return res.json({
          nutrition,
          source: "usda",
          sourceId: fdcId,
          foodName: usdaFood.description,
          incomplete,
          cached: false
        });
      }
    } else if (source === "openfoodfacts" || source === "barcode") {
      const product = await lookupBarcode(foodId);
      if (product) {
        const { nutrition, incomplete } = mapOFFToNutritionFacts(product);
        setInCache2(cacheKey, nutrition, "openfoodfacts", foodId, incomplete);
        return res.json({
          nutrition,
          source: "openfoodfacts",
          sourceId: foodId,
          foodName: product.product_name || product.product_name_en,
          incomplete,
          cached: false
        });
      }
    }
    return res.status(404).json({
      error: "Nutrition data not found",
      foodId,
      source
    });
  } catch (error) {
    console.error("Nutrition fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch nutrition data" });
  }
});
router3.get("/search", async (req, res) => {
  try {
    const query = req.query.q;
    const limit = parseInt(req.query.limit || "10", 10);
    if (!query || query.length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }
    const results = [];
    const usdaResults = await searchUSDA(query, Math.min(limit, 15));
    for (const item of usdaResults.slice(0, Math.ceil(limit * 0.7))) {
      const mapped = mapUSDAToFoodItem(item);
      results.push({
        id: `usda:${item.fdcId}`,
        name: item.description,
        brand: item.brandOwner,
        source: "usda",
        nutrition: {
          calories: mapped.nutrition.calories,
          protein: mapped.nutrition.protein,
          carbs: mapped.nutrition.carbs,
          fat: mapped.nutrition.fat
        }
      });
    }
    if (results.length < limit) {
      const offResults = await searchOpenFoodFacts(
        query,
        limit - results.length
      );
      for (const product of offResults) {
        if (hasCompleteNutritionData(product)) {
          const mapped = mapOFFToFoodItem(product);
          results.push({
            id: `off:${product.code}`,
            name: mapped.name,
            brand: mapped.brand,
            source: "openfoodfacts",
            nutrition: {
              calories: mapped.nutrition.calories,
              protein: mapped.nutrition.protein,
              carbs: mapped.nutrition.carbs,
              fat: mapped.nutrition.fat
            }
          });
        }
      }
    }
    return res.json({
      results: results.slice(0, limit),
      totalResults: results.length,
      query
    });
  } catch (error) {
    console.error("Nutrition search error:", error);
    return res.status(500).json({ error: "Failed to search nutrition data" });
  }
});
router3.post("/estimate", async (req, res) => {
  try {
    const { foodName } = req.body;
    if (!foodName || typeof foodName !== "string") {
      return res.status(400).json({ error: "Food name is required" });
    }
    const cacheKey = getCacheKey(foodName.toLowerCase(), "ai");
    const cached = getFromCache2(cacheKey);
    if (cached) {
      return res.json({
        nutrition: cached.nutrition,
        source: "cache",
        originalSource: "ai",
        incomplete: true,
        cached: true
      });
    }
    const usdaResults = await searchUSDA(foodName, 1);
    if (usdaResults.length > 0) {
      const { nutrition: nutrition2, incomplete: incomplete2 } = mapUSDAToNutritionFacts(usdaResults[0]);
      setInCache2(cacheKey, nutrition2, "usda", usdaResults[0].fdcId, incomplete2);
      return res.json({
        nutrition: nutrition2,
        source: "usda",
        sourceId: usdaResults[0].fdcId,
        foodName: usdaResults[0].description,
        incomplete: incomplete2,
        cached: false
      });
    }
    const offResults = await searchOpenFoodFacts(foodName, 1);
    if (offResults.length > 0 && hasCompleteNutritionData(offResults[0])) {
      const { nutrition: nutrition2, incomplete: incomplete2 } = mapOFFToNutritionFacts(offResults[0]);
      setInCache2(
        cacheKey,
        nutrition2,
        "openfoodfacts",
        offResults[0].code,
        incomplete2
      );
      return res.json({
        nutrition: nutrition2,
        source: "openfoodfacts",
        sourceId: offResults[0].code,
        foodName: offResults[0].product_name || offResults[0].product_name_en,
        incomplete: incomplete2,
        cached: false
      });
    }
    const { nutrition, incomplete } = await estimateNutritionWithAI(foodName);
    setInCache2(cacheKey, nutrition, "ai", void 0, incomplete);
    return res.json({
      nutrition,
      source: "ai",
      foodName,
      incomplete: true,
      cached: false,
      warning: "Nutrition estimated by AI - may not be accurate"
    });
  } catch (error) {
    console.error("Nutrition estimation error:", error);
    return res.status(500).json({ error: "Failed to estimate nutrition" });
  }
});
router3.delete("/cache", async (req, res) => {
  const sizeBefore = nutritionCache.size;
  nutritionCache.clear();
  console.log(`Nutrition cache cleared: ${sizeBefore} entries removed`);
  return res.json({ message: "Cache cleared", entriesRemoved: sizeBefore });
});
var correctionSubmitSchema = z2.object({
  productName: z2.string().min(1, "Product name is required"),
  barcode: z2.string().optional(),
  brand: z2.string().optional(),
  originalSource: z2.string().optional(),
  originalSourceId: z2.string().optional(),
  originalNutrition: z2.string().optional(),
  correctedNutrition: z2.string().optional(),
  imageUrl: z2.string().optional(),
  notes: z2.string().optional()
});
router3.post("/corrections", async (req, res) => {
  try {
    const parseResult = correctionSubmitSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid submission data",
        details: parseResult.error.errors.map((e) => e.message).join(", ")
      });
    }
    const data = parseResult.data;
    const userId = req.userId || null;
    const [correction] = await db.insert(nutritionCorrections).values({
      userId,
      productName: data.productName,
      barcode: data.barcode || null,
      brand: data.brand || null,
      originalSource: data.originalSource || null,
      originalSourceId: data.originalSourceId || null,
      originalNutrition: data.originalNutrition || null,
      correctedNutrition: data.correctedNutrition || null,
      imageUrl: data.imageUrl || null,
      notes: data.notes || null,
      status: "pending"
    }).returning();
    console.log(`Nutrition correction submitted for: ${data.productName}`);
    return res.status(201).json({
      message: "Correction submitted successfully",
      id: correction.id
    });
  } catch (error) {
    console.error("Error submitting nutrition correction:", error);
    return res.status(500).json({ error: "Failed to submit correction" });
  }
});
router3.get("/corrections", async (req, res) => {
  try {
    const status = req.query.status;
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 100);
    const offset = parseInt(req.query.offset || "0", 10);
    const baseQuery = db.select().from(nutritionCorrections);
    const corrections = status ? await baseQuery.where(eq2(nutritionCorrections.status, status)).orderBy(desc(nutritionCorrections.createdAt)).limit(limit).offset(offset) : await baseQuery.orderBy(desc(nutritionCorrections.createdAt)).limit(limit).offset(offset);
    return res.json({
      corrections,
      count: corrections.length,
      limit,
      offset
    });
  } catch (error) {
    console.error("Error fetching nutrition corrections:", error);
    return res.status(500).json({ error: "Failed to fetch corrections" });
  }
});
router3.patch("/corrections/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid correction ID" });
    }
    const { status, reviewNotes } = req.body;
    if (!status || !["pending", "reviewed", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const [updated] = await db.update(nutritionCorrections).set({
      status,
      reviewNotes: reviewNotes || null,
      reviewedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq2(nutritionCorrections.id, id)).returning();
    if (!updated) {
      return res.status(404).json({ error: "Correction not found" });
    }
    return res.json({ message: "Correction updated", correction: updated });
  } catch (error) {
    console.error("Error updating nutrition correction:", error);
    return res.status(500).json({ error: "Failed to update correction" });
  }
});
var nutrition_router_default = router3;

// server/routers/user/cooking-terms.router.ts
init_db();
init_schema();
import { Router as Router4 } from "express";
var router4 = Router4();
var termsCache = null;
var CACHE_TTL_MS4 = 24 * 60 * 60 * 1e3;
async function getCachedTerms() {
  if (termsCache && Date.now() - termsCache.timestamp < CACHE_TTL_MS4) {
    return termsCache.data;
  }
  const terms = await db.select().from(cookingTerms);
  termsCache = {
    data: terms,
    timestamp: Date.now()
  };
  return terms;
}
function formatTermResponse(term) {
  return {
    id: term.id,
    term: term.term,
    definition: term.shortDefinition || term.longDefinition || "",
    shortDefinition: term.shortDefinition || void 0,
    longDefinition: term.longDefinition || void 0,
    category: term.category,
    difficulty: term.difficulty || "beginner",
    timeEstimate: term.timeEstimate || void 0,
    tools: term.tools || [],
    tips: term.tips || [],
    videoUrl: term.videoUrl || void 0,
    imageUrl: term.imageUrl || void 0,
    relatedTerms: term.relatedTerms || [],
    example: term.example || void 0
  };
}
router4.get("/", async (req, res) => {
  try {
    const { category, search } = req.query;
    let terms = await getCachedTerms();
    if (category && typeof category === "string" && category !== "all") {
      terms = terms.filter(
        (t) => t.category.toLowerCase() === category.toLowerCase()
      );
    }
    if (search && typeof search === "string") {
      const searchLower = search.toLowerCase();
      terms = terms.filter(
        (t) => t.term.toLowerCase().includes(searchLower) || t.shortDefinition && t.shortDefinition.toLowerCase().includes(searchLower) || t.longDefinition && t.longDefinition.toLowerCase().includes(searchLower)
      );
      terms.sort((a, b) => {
        const aTermMatch = a.term.toLowerCase().startsWith(searchLower) ? 0 : 1;
        const bTermMatch = b.term.toLowerCase().startsWith(searchLower) ? 0 : 1;
        if (aTermMatch !== bTermMatch) return aTermMatch - bTermMatch;
        const aExactTerm = a.term.toLowerCase() === searchLower ? 0 : 1;
        const bExactTerm = b.term.toLowerCase() === searchLower ? 0 : 1;
        if (aExactTerm !== bExactTerm) return aExactTerm - bExactTerm;
        return a.term.localeCompare(b.term);
      });
    } else {
      terms.sort((a, b) => a.term.localeCompare(b.term));
    }
    res.json(terms.map(formatTermResponse));
  } catch (error) {
    console.error("Error fetching cooking terms:", error);
    res.status(500).json({ error: "Failed to fetch cooking terms" });
  }
});
router4.get("/detect", async (req, res) => {
  try {
    const { text: text2 } = req.query;
    if (!text2 || typeof text2 !== "string") {
      return res.status(400).json({ error: "Text parameter is required" });
    }
    const allTerms = await getCachedTerms();
    const sortedTerms = [...allTerms].sort(
      (a, b) => b.term.length - a.term.length
    );
    const foundTerms = [];
    const textLower = text2.toLowerCase();
    for (const term of sortedTerms) {
      const termLower = term.term.toLowerCase();
      const escapedTerm = termLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedTerm}\\b`, "i");
      if (regex.test(text2)) {
        const alreadyFound = foundTerms.some(
          (f) => f.term.toLowerCase().includes(termLower) || termLower.includes(f.term.toLowerCase())
        );
        if (!alreadyFound) {
          foundTerms.push(term);
        }
      }
    }
    res.json(foundTerms.map(formatTermResponse));
  } catch (error) {
    console.error("Error detecting cooking terms:", error);
    res.status(500).json({ error: "Failed to detect cooking terms" });
  }
});
router4.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id.trim() === "") {
      return res.status(400).json({ error: "Invalid term ID" });
    }
    const allTerms = await getCachedTerms();
    const term = allTerms.find((t) => t.id === id);
    if (!term) {
      return res.status(404).json({ error: "Cooking term not found" });
    }
    const response = formatTermResponse(term);
    if (term.relatedTerms && term.relatedTerms.length > 0) {
      const relatedDetails = allTerms.filter((t) => term.relatedTerms?.includes(t.term)).map(formatTermResponse);
      return res.json({
        ...response,
        relatedTermDetails: relatedDetails
      });
    }
    res.json(response);
  } catch (error) {
    console.error("Error fetching cooking term:", error);
    res.status(500).json({ error: "Failed to fetch cooking term" });
  }
});
var cooking_terms_router_default = router4;

// server/routers/user/appliances.router.ts
init_db();
init_schema();
import { Router as Router5 } from "express";
import { eq as eq4, and, inArray } from "drizzle-orm";

// server/middleware/auth.ts
init_db();
init_schema();
import { eq as eq3 } from "drizzle-orm";
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const token = authHeader.substring(7);
    const [session] = await db.select().from(userSessions).where(eq3(userSessions.token, token)).limit(1);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    if (new Date(session.expiresAt) < /* @__PURE__ */ new Date()) {
      await db.delete(userSessions).where(eq3(userSessions.token, token));
      return res.status(401).json({ error: "Session expired" });
    }
    req.userId = session.userId;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

// server/routers/user/appliances.router.ts
var appliancesRouter = Router5();
var userAppliancesRouter = Router5();
userAppliancesRouter.use(requireAuth);
var FALLBACK_APPLIANCES = [
  {
    id: 1,
    name: "Stovetop/Range",
    category: "essential",
    description: "A cooking appliance with burners for heating pots and pans",
    icon: "thermometer",
    isCommon: true,
    alternatives: null
  },
  {
    id: 2,
    name: "Oven",
    category: "essential",
    description: "An enclosed compartment for baking and roasting food",
    icon: "square",
    isCommon: true,
    alternatives: null
  },
  {
    id: 3,
    name: "Refrigerator",
    category: "essential",
    description: "An appliance for keeping food cold and fresh",
    icon: "box",
    isCommon: true,
    alternatives: null
  },
  {
    id: 4,
    name: "Freezer",
    category: "essential",
    description: "An appliance for freezing and storing food long-term",
    icon: "box",
    isCommon: true,
    alternatives: null
  },
  {
    id: 5,
    name: "Microwave",
    category: "essential",
    description: "An appliance that heats food using electromagnetic radiation",
    icon: "zap",
    isCommon: true,
    alternatives: null
  },
  {
    id: 6,
    name: "Sink",
    category: "essential",
    description: "A basin with running water for washing food and dishes",
    icon: "droplet",
    isCommon: true,
    alternatives: null
  },
  {
    id: 7,
    name: "Frying Pan/Skillet",
    category: "cooking",
    description: "A flat-bottomed pan used for frying, searing, and browning foods",
    icon: "circle",
    isCommon: true,
    alternatives: null
  },
  {
    id: 8,
    name: "Saucepan (small, medium, large)",
    category: "cooking",
    description: "Deep pans with a handle used for cooking sauces, boiling, and more",
    icon: "circle",
    isCommon: true,
    alternatives: null
  },
  {
    id: 9,
    name: "Stock Pot",
    category: "cooking",
    description: "A large, deep pot for making stocks, soups, and boiling pasta",
    icon: "circle",
    isCommon: true,
    alternatives: null
  },
  {
    id: 10,
    name: "Dutch Oven",
    category: "cooking",
    description: "A heavy pot with a tight lid for braising and slow cooking",
    icon: "circle",
    isCommon: false,
    alternatives: null
  },
  {
    id: 11,
    name: "Wok",
    category: "cooking",
    description: "A round-bottomed pan used for stir-frying and Asian cooking",
    icon: "circle",
    isCommon: false,
    alternatives: null
  },
  {
    id: 12,
    name: "Grill Pan",
    category: "cooking",
    description: "A pan with ridges that creates grill marks on food",
    icon: "grid",
    isCommon: false,
    alternatives: null
  },
  {
    id: 13,
    name: "Roasting Pan",
    category: "cooking",
    description: "A large pan for roasting meats and vegetables in the oven",
    icon: "square",
    isCommon: false,
    alternatives: null
  },
  {
    id: 14,
    name: "Baking Sheet",
    category: "bakeware",
    description: "A flat metal pan for baking cookies and roasting vegetables",
    icon: "square",
    isCommon: true,
    alternatives: null
  },
  {
    id: 15,
    name: "Cake Pan",
    category: "bakeware",
    description: "A round or square pan for baking cakes",
    icon: "circle",
    isCommon: false,
    alternatives: null
  },
  {
    id: 16,
    name: "Muffin Tin",
    category: "bakeware",
    description: "A pan with cups for baking muffins and cupcakes",
    icon: "grid",
    isCommon: false,
    alternatives: null
  },
  {
    id: 17,
    name: "Loaf Pan",
    category: "bakeware",
    description: "A rectangular pan for baking bread and meatloaf",
    icon: "square",
    isCommon: false,
    alternatives: null
  },
  {
    id: 18,
    name: "Pie Dish",
    category: "bakeware",
    description: "A shallow dish with sloped sides for baking pies",
    icon: "circle",
    isCommon: false,
    alternatives: null
  },
  {
    id: 19,
    name: "Casserole Dish",
    category: "bakeware",
    description: "A deep dish for baking casseroles and gratins",
    icon: "square",
    isCommon: false,
    alternatives: null
  },
  {
    id: 20,
    name: "Cooling Rack",
    category: "bakeware",
    description: "A wire rack for cooling baked goods",
    icon: "grid",
    isCommon: false,
    alternatives: null
  },
  {
    id: 21,
    name: "Blender",
    category: "small appliances",
    description: "An electric appliance for blending, pureeing, and making smoothies",
    icon: "zap",
    isCommon: true,
    alternatives: null
  },
  {
    id: 22,
    name: "Food Processor",
    category: "small appliances",
    description: "An electric appliance for chopping, slicing, and mixing ingredients",
    icon: "zap",
    isCommon: false,
    alternatives: null
  },
  {
    id: 23,
    name: "Stand Mixer",
    category: "small appliances",
    description: "A countertop mixer for baking with various attachments",
    icon: "zap",
    isCommon: false,
    alternatives: ["Hand Mixer"]
  },
  {
    id: 24,
    name: "Hand Mixer",
    category: "small appliances",
    description: "A handheld electric mixer for beating and whipping",
    icon: "zap",
    isCommon: false,
    alternatives: null
  },
  {
    id: 25,
    name: "Toaster",
    category: "small appliances",
    description: "An appliance for toasting bread and bagels",
    icon: "square",
    isCommon: true,
    alternatives: null
  },
  {
    id: 26,
    name: "Coffee Maker",
    category: "small appliances",
    description: "An appliance for brewing coffee",
    icon: "coffee",
    isCommon: true,
    alternatives: null
  },
  {
    id: 27,
    name: "Kettle",
    category: "small appliances",
    description: "An appliance for boiling water quickly",
    icon: "droplet",
    isCommon: true,
    alternatives: null
  },
  {
    id: 28,
    name: "Rice Cooker",
    category: "small appliances",
    description: "An appliance designed for cooking rice perfectly",
    icon: "zap",
    isCommon: false,
    alternatives: null
  },
  {
    id: 29,
    name: "Slow Cooker/Crock Pot",
    category: "small appliances",
    description: "An appliance for slow-cooking meals over several hours",
    icon: "clock",
    isCommon: false,
    alternatives: null
  },
  {
    id: 30,
    name: "Instant Pot/Pressure Cooker",
    category: "small appliances",
    description: "A multi-function cooker that uses pressure to cook food quickly",
    icon: "zap",
    isCommon: false,
    alternatives: null
  },
  {
    id: 31,
    name: "Air Fryer",
    category: "small appliances",
    description: "An appliance that uses hot air circulation to cook crispy food",
    icon: "wind",
    isCommon: false,
    alternatives: ["Oven", "Convection Oven"]
  },
  {
    id: 32,
    name: "Immersion Blender",
    category: "small appliances",
    description: "A handheld blender for pureeing soups and sauces directly in the pot",
    icon: "zap",
    isCommon: false,
    alternatives: ["Blender", "Food Processor"]
  },
  {
    id: 33,
    name: "Cutting Board",
    category: "prep tools",
    description: "A board for cutting and preparing ingredients",
    icon: "square",
    isCommon: true,
    alternatives: null
  },
  {
    id: 34,
    name: "Chef's Knife",
    category: "prep tools",
    description: "A versatile knife for chopping, slicing, and dicing",
    icon: "minus",
    isCommon: true,
    alternatives: null
  },
  {
    id: 35,
    name: "Paring Knife",
    category: "prep tools",
    description: "A small knife for peeling and detailed cutting work",
    icon: "minus",
    isCommon: true,
    alternatives: null
  },
  {
    id: 36,
    name: "Bread Knife",
    category: "prep tools",
    description: "A serrated knife for slicing bread and soft foods",
    icon: "minus",
    isCommon: false,
    alternatives: null
  },
  {
    id: 37,
    name: "Kitchen Shears",
    category: "prep tools",
    description: "Scissors designed for cutting food items",
    icon: "scissors",
    isCommon: false,
    alternatives: null
  },
  {
    id: 38,
    name: "Measuring Cups",
    category: "prep tools",
    description: "Cups for measuring dry and liquid ingredients",
    icon: "droplet",
    isCommon: true,
    alternatives: null
  },
  {
    id: 39,
    name: "Measuring Spoons",
    category: "prep tools",
    description: "Spoons for measuring small quantities of ingredients",
    icon: "droplet",
    isCommon: true,
    alternatives: null
  },
  {
    id: 40,
    name: "Mixing Bowls",
    category: "prep tools",
    description: "Bowls of various sizes for mixing ingredients",
    icon: "circle",
    isCommon: true,
    alternatives: null
  },
  {
    id: 41,
    name: "Colander",
    category: "prep tools",
    description: "A bowl with holes for draining pasta and washing vegetables",
    icon: "circle",
    isCommon: true,
    alternatives: null
  },
  {
    id: 42,
    name: "Grater",
    category: "prep tools",
    description: "A tool for shredding cheese, vegetables, and other foods",
    icon: "grid",
    isCommon: true,
    alternatives: null
  },
  {
    id: 43,
    name: "Peeler",
    category: "prep tools",
    description: "A tool for removing the skin from fruits and vegetables",
    icon: "minus",
    isCommon: true,
    alternatives: null
  },
  {
    id: 44,
    name: "Can Opener",
    category: "prep tools",
    description: "A tool for opening canned foods",
    icon: "circle",
    isCommon: true,
    alternatives: null
  },
  {
    id: 45,
    name: "Whisk",
    category: "prep tools",
    description: "A tool for beating eggs and mixing batters",
    icon: "activity",
    isCommon: true,
    alternatives: null
  },
  {
    id: 46,
    name: "Spatula",
    category: "prep tools",
    description: "A flat tool for flipping and lifting foods",
    icon: "minus",
    isCommon: true,
    alternatives: null
  },
  {
    id: 47,
    name: "Wooden Spoon",
    category: "prep tools",
    description: "A heat-resistant spoon for stirring and cooking",
    icon: "minus",
    isCommon: true,
    alternatives: null
  },
  {
    id: 48,
    name: "Tongs",
    category: "prep tools",
    description: "A tool for gripping and turning food",
    icon: "minus",
    isCommon: true,
    alternatives: null
  },
  {
    id: 49,
    name: "Ladle",
    category: "prep tools",
    description: "A deep-bowled spoon for serving soups and stews",
    icon: "droplet",
    isCommon: true,
    alternatives: null
  },
  {
    id: 50,
    name: "Sous Vide",
    category: "specialty",
    description: "A precision cooking device that circulates water at exact temperatures",
    icon: "thermometer",
    isCommon: false,
    alternatives: null
  },
  {
    id: 51,
    name: "Waffle Maker",
    category: "specialty",
    description: "An appliance for making waffles",
    icon: "grid",
    isCommon: false,
    alternatives: null
  },
  {
    id: 52,
    name: "Panini Press",
    category: "specialty",
    description: "A heated press for making grilled sandwiches",
    icon: "square",
    isCommon: false,
    alternatives: null
  },
  {
    id: 53,
    name: "Ice Cream Maker",
    category: "specialty",
    description: "An appliance for making homemade ice cream",
    icon: "circle",
    isCommon: false,
    alternatives: null
  },
  {
    id: 54,
    name: "Dehydrator",
    category: "specialty",
    description: "An appliance for drying fruits, vegetables, and meats",
    icon: "sun",
    isCommon: false,
    alternatives: null
  },
  {
    id: 55,
    name: "Bread Machine",
    category: "specialty",
    description: "An appliance for automatically making bread",
    icon: "square",
    isCommon: false,
    alternatives: null
  },
  {
    id: 56,
    name: "Pasta Machine",
    category: "specialty",
    description: "A manual or electric device for making fresh pasta",
    icon: "minus",
    isCommon: false,
    alternatives: null
  },
  {
    id: 57,
    name: "KitchenAid Attachments",
    category: "specialty",
    description: "Various attachments for KitchenAid stand mixers",
    icon: "tool",
    isCommon: false,
    alternatives: null
  },
  {
    id: 58,
    name: "Thermomix",
    category: "specialty",
    description: "An all-in-one cooking appliance that weighs, chops, and cooks",
    icon: "zap",
    isCommon: false,
    alternatives: null
  }
];
var appliancesCache = null;
var CACHE_TTL_MS5 = 24 * 60 * 60 * 1e3;
async function getCachedAppliances() {
  if (appliancesCache && Date.now() - appliancesCache.timestamp < CACHE_TTL_MS5) {
    return appliancesCache.data;
  }
  try {
    const allAppliances = await db.select().from(appliances);
    if (allAppliances.length > 0) {
      appliancesCache = {
        data: allAppliances,
        timestamp: Date.now()
      };
      return allAppliances;
    }
  } catch (error) {
    console.log("Database not available, using fallback appliances");
  }
  appliancesCache = {
    data: FALLBACK_APPLIANCES,
    timestamp: Date.now()
  };
  return FALLBACK_APPLIANCES;
}
function formatApplianceResponse(appliance) {
  return {
    id: appliance.id,
    name: appliance.name,
    category: appliance.category,
    description: appliance.description || void 0,
    icon: appliance.icon || "tool",
    isCommon: appliance.isCommon || false,
    alternatives: appliance.alternatives || [],
    imageUrl: appliance.imageUrl || void 0
  };
}
function formatUserApplianceResponse(userAppliance) {
  return {
    id: userAppliance.id,
    applianceId: userAppliance.applianceId,
    notes: userAppliance.notes || void 0,
    brand: userAppliance.brand || void 0,
    createdAt: userAppliance.createdAt,
    appliance: formatApplianceResponse(userAppliance.appliance)
  };
}
appliancesRouter.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    let allAppliances = await getCachedAppliances();
    if (category && typeof category === "string" && category !== "all") {
      allAppliances = allAppliances.filter(
        (a) => a.category.toLowerCase() === category.toLowerCase()
      );
    }
    allAppliances.sort((a, b) => a.name.localeCompare(b.name));
    res.set("Cache-Control", "public, max-age=86400");
    res.json(allAppliances.map(formatApplianceResponse));
  } catch (error) {
    console.error("Error fetching appliances:", error);
    res.status(500).json({ error: "Failed to fetch appliances" });
  }
});
appliancesRouter.get("/common", async (req, res) => {
  try {
    let allAppliances = await getCachedAppliances();
    const commonAppliances = allAppliances.filter((a) => a.isCommon === true);
    commonAppliances.sort((a, b) => a.name.localeCompare(b.name));
    res.set("Cache-Control", "public, max-age=86400");
    res.json(commonAppliances.map(formatApplianceResponse));
  } catch (error) {
    console.error("Error fetching common appliances:", error);
    res.status(500).json({ error: "Failed to fetch common appliances" });
  }
});
userAppliancesRouter.get("/", async (req, res) => {
  try {
    const userId = req.userId;
    const userAppliancesList = await db.select().from(userAppliances).where(eq4(userAppliances.userId, userId));
    if (userAppliancesList.length === 0) {
      return res.json([]);
    }
    const allAppliances = await getCachedAppliances();
    const applianceMap = new Map(allAppliances.map((a) => [a.id, a]));
    const result = userAppliancesList.map((ua) => {
      const appliance = applianceMap.get(ua.applianceId);
      if (!appliance) return null;
      return formatUserApplianceResponse({ ...ua, appliance });
    }).filter((item) => item !== null);
    res.json(result);
  } catch (error) {
    console.error("Error fetching user appliances:", error);
    res.status(500).json({ error: "Failed to fetch user appliances" });
  }
});
userAppliancesRouter.post("/", async (req, res) => {
  try {
    const userId = req.userId;
    const { applianceId, notes, brand } = req.body;
    if (!applianceId || typeof applianceId !== "number") {
      return res.status(400).json({ error: "Appliance ID is required" });
    }
    const allAppliances = await getCachedAppliances();
    const appliance = allAppliances.find((a) => a.id === applianceId);
    if (!appliance) {
      return res.status(404).json({ error: "Appliance not found" });
    }
    const existing = await db.select().from(userAppliances).where(
      and(
        eq4(userAppliances.userId, userId),
        eq4(userAppliances.applianceId, applianceId)
      )
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Appliance already added to kitchen" });
    }
    const [created] = await db.insert(userAppliances).values({
      userId,
      applianceId,
      notes: notes || null,
      brand: brand || null
    }).returning();
    res.status(201).json(formatUserApplianceResponse({ ...created, appliance }));
  } catch (error) {
    console.error("Error adding user appliance:", error);
    res.status(500).json({ error: "Failed to add appliance to kitchen" });
  }
});
userAppliancesRouter.delete(
  "/:applianceId",
  async (req, res) => {
    try {
      const userId = req.userId;
      const applianceId = parseInt(req.params.applianceId, 10);
      if (isNaN(applianceId)) {
        return res.status(400).json({ error: "Invalid appliance ID" });
      }
      const result = await db.delete(userAppliances).where(
        and(
          eq4(userAppliances.userId, userId),
          eq4(userAppliances.applianceId, applianceId)
        )
      ).returning();
      if (result.length === 0) {
        return res.status(404).json({ error: "Appliance not found in user's kitchen" });
      }
      res.json({ success: true, message: "Appliance removed from kitchen" });
    } catch (error) {
      console.error("Error removing user appliance:", error);
      res.status(500).json({ error: "Failed to remove appliance from kitchen" });
    }
  }
);
userAppliancesRouter.post("/bulk", async (req, res) => {
  try {
    const userId = req.userId;
    const { applianceIds } = req.body;
    if (!Array.isArray(applianceIds) || applianceIds.length === 0) {
      return res.status(400).json({ error: "Appliance IDs array is required" });
    }
    const validIds = applianceIds.filter(
      (id) => typeof id === "number" && !isNaN(id)
    );
    if (validIds.length === 0) {
      return res.status(400).json({ error: "No valid appliance IDs provided" });
    }
    const allAppliances = await getCachedAppliances();
    const applianceMap = new Map(allAppliances.map((a) => [a.id, a]));
    const existingIds = validIds.filter((id) => applianceMap.has(id));
    if (existingIds.length === 0) {
      return res.status(404).json({ error: "No valid appliances found" });
    }
    const existingUserAppliances = await db.select().from(userAppliances).where(
      and(
        eq4(userAppliances.userId, userId),
        inArray(userAppliances.applianceId, existingIds)
      )
    );
    const existingApplianceIds = new Set(
      existingUserAppliances.map((ua) => ua.applianceId)
    );
    const newApplianceIds = existingIds.filter(
      (id) => !existingApplianceIds.has(id)
    );
    if (newApplianceIds.length === 0) {
      return res.json({
        added: 0,
        skipped: existingIds.length,
        message: "All appliances already in kitchen"
      });
    }
    const valuesToInsert = newApplianceIds.map((applianceId) => ({
      userId,
      applianceId,
      notes: null,
      brand: null
    }));
    await db.insert(userAppliances).values(valuesToInsert);
    res.status(201).json({
      added: newApplianceIds.length,
      skipped: existingIds.length - newApplianceIds.length,
      message: `Added ${newApplianceIds.length} appliances to kitchen`
    });
  } catch (error) {
    console.error("Error bulk adding user appliances:", error);
    res.status(500).json({ error: "Failed to bulk add appliances" });
  }
});

// server/routers/platform/voice.router.ts
import { Router as Router6 } from "express";
import OpenAI4 from "openai";
import { z as z3 } from "zod";
var router5 = Router6();
var openai4 = new OpenAI4({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});
var SUPPORTED_AUDIO_FORMATS = [
  "m4a",
  "mp3",
  "wav",
  "webm",
  "mp4",
  "mpeg",
  "mpga",
  "oga",
  "ogg"
];
var MAX_FILE_SIZE = 25 * 1024 * 1024;
var parseCommandSchema = z3.object({
  text: z3.string().min(1, "Transcript text is required")
});
function getAudioMimeType(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeTypes = {
    m4a: "audio/m4a",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    webm: "audio/webm",
    mp4: "audio/mp4",
    mpeg: "audio/mpeg",
    mpga: "audio/mpeg",
    oga: "audio/ogg",
    ogg: "audio/ogg"
  };
  return ext && mimeTypes[ext] ? mimeTypes[ext] : null;
}
function isValidAudioFormat(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? SUPPORTED_AUDIO_FORMATS.includes(ext) : false;
}
router5.post("/transcribe", async (req, res) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        error: "Invalid request",
        details: "Request body is required"
      });
    }
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      if (req.body.audioBase64 && req.body.filename) {
        const { audioBase64, filename: filename2, language: language2 = "en" } = req.body;
        if (!isValidAudioFormat(filename2)) {
          return res.status(400).json({
            error: "Invalid audio format",
            details: `Supported formats: ${SUPPORTED_AUDIO_FORMATS.join(", ")}`
          });
        }
        const mimeType2 = getAudioMimeType(filename2);
        if (!mimeType2) {
          return res.status(400).json({
            error: "Unknown audio format",
            details: "Could not determine audio MIME type"
          });
        }
        const audioBuffer = Buffer.from(audioBase64, "base64");
        if (audioBuffer.length > MAX_FILE_SIZE) {
          return res.status(400).json({
            error: "File too large",
            details: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
          });
        }
        if (audioBuffer.length === 0) {
          return res.status(400).json({
            error: "Empty audio",
            details: "The audio file appears to be empty"
          });
        }
        const file2 = new File([audioBuffer], filename2, { type: mimeType2 });
        const response2 = await openai4.audio.transcriptions.create({
          file: file2,
          model: "whisper-1",
          language: language2,
          response_format: "json"
        });
        return res.json({
          transcript: response2.text,
          language: language2
        });
      }
      return res.status(400).json({
        error: "Invalid request format",
        details: "Expected multipart/form-data with audio file or JSON with audioBase64 and filename"
      });
    }
    const files = req.files;
    const file = files?.file || files?.audio;
    if (!file) {
      return res.status(400).json({
        error: "No audio file provided",
        details: "Please upload an audio file with field name 'file' or 'audio'"
      });
    }
    const filename = file.name || file.originalname || "audio.m4a";
    if (!isValidAudioFormat(filename)) {
      return res.status(400).json({
        error: "Invalid audio format",
        details: `Supported formats: ${SUPPORTED_AUDIO_FORMATS.join(", ")}`
      });
    }
    const fileData = file.data || file.buffer;
    if (!fileData || fileData.length === 0) {
      return res.status(400).json({
        error: "Empty audio",
        details: "The audio file appears to be empty"
      });
    }
    if (fileData.length > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: "File too large",
        details: `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
      });
    }
    const mimeType = getAudioMimeType(filename) || "audio/m4a";
    const audioFile = new File([fileData], filename, { type: mimeType });
    const language = req.body?.language || "en";
    const response = await openai4.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language,
      response_format: "json"
    });
    console.log(
      `Voice transcription completed: "${response.text.substring(0, 50)}..."`
    );
    return res.json({
      transcript: response.text,
      language
    });
  } catch (error) {
    console.error("Transcription error:", error);
    if (error.status === 429) {
      return res.status(429).json({
        error: "Rate limited",
        details: "Too many requests. Please try again in a moment."
      });
    }
    if (error.code === "audio_too_short") {
      return res.status(400).json({
        error: "Audio too short",
        details: "The audio recording is too short to transcribe. Please record a longer message."
      });
    }
    if (error.message?.includes("Invalid file format")) {
      return res.status(400).json({
        error: "Invalid audio format",
        details: "The audio file format is not supported or the file is corrupted."
      });
    }
    return res.status(500).json({
      error: "Transcription failed",
      details: error.message || "An unexpected error occurred during transcription"
    });
  }
});
router5.post("/parse", async (req, res) => {
  try {
    const parseResult = parseCommandSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessages = parseResult.error.errors.map((e) => e.message).join(", ");
      return res.status(400).json({
        error: "Invalid input",
        details: errorMessages
      });
    }
    const { text: text2 } = parseResult.data;
    const systemPrompt = `You are a voice command parser for a food inventory management app called FreshPantry.

Parse the user's voice command and identify:
1. The intent (what they want to do)
2. Relevant entities (item names, quantities, recipe names, step numbers)
3. Your confidence level (0.0 to 1.0)

Available intents:
- ADD_FOOD: User wants to add food to their inventory
  Examples: "add milk", "put eggs in fridge", "add 2 apples"
  Entities: item, quantity, unit, location
- SEARCH_INVENTORY: User wants to search or check their inventory
  Examples: "do I have milk", "check my pantry", "find eggs"
  Entities: query
- GENERATE_RECIPE: User wants to view/generate/create recipes or get cooking ideas
  Examples: "show me recipes", "what can I cook", "make a recipe", "give me recipes", "suggest a recipe with chicken"
  Entities: ingredients (optional)
- READ_RECIPE: User wants a recipe read aloud
  Entities: recipeName
- NEXT_STEP: User wants the next recipe step
  Examples: "next", "next step"
- PREVIOUS_STEP: User wants to go back to previous step
  Examples: "previous", "go back"
- REPEAT_STEP: User wants current step repeated
  Examples: "repeat", "say that again"
- WHAT_EXPIRES: User wants to know what's expiring soon
  Examples: "what's expiring", "what expires soon"
- HELP: User wants help or to know available commands
- UNKNOWN: Command doesn't clearly match any intent

Return ONLY valid JSON in this format:
{
  "intent": "INTENT_NAME",
  "entities": { "key": "value" },
  "confidence": 0.85
}`;
    const userPrompt = `Parse this voice command for FreshPantry:
"${text2}"

Return JSON only.`;
    const completion = await openai4.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 256,
      temperature: 0.3
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({
        error: "Parse failed",
        details: "No response from AI parser"
      });
    }
    const parsed = JSON.parse(content);
    const validIntents = [
      "ADD_FOOD",
      "SEARCH_INVENTORY",
      "GENERATE_RECIPE",
      "READ_RECIPE",
      "NEXT_STEP",
      "PREVIOUS_STEP",
      "REPEAT_STEP",
      "WHAT_EXPIRES",
      "HELP",
      "UNKNOWN"
    ];
    if (!validIntents.includes(parsed.intent)) {
      parsed.intent = "UNKNOWN";
      parsed.confidence = 0;
    }
    parsed.confidence = Math.max(0, Math.min(1, parsed.confidence));
    console.log(
      `Voice command parsed: "${text2}" -> ${parsed.intent} (confidence: ${parsed.confidence})`
    );
    return res.json({
      ...parsed,
      rawText: text2
    });
  } catch (error) {
    console.error("Parse error:", error);
    if (error.status === 429) {
      return res.status(429).json({
        error: "Rate limited",
        details: "Too many requests. Please try again in a moment."
      });
    }
    return res.status(500).json({
      error: "Parse failed",
      details: error.message || "An unexpected error occurred while parsing the command"
    });
  }
});
router5.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    supportedFormats: SUPPORTED_AUDIO_FORMATS,
    maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`
  });
});
var voice_router_default = router5;

// server/routers/platform/ai/image-analysis.router.ts
import { Router as Router7 } from "express";
import OpenAI5 from "openai";

// server/lib/food-analysis-parser.ts
import { z as z4 } from "zod";
var identifiedFoodSchema = z4.object({
  name: z4.string(),
  category: z4.enum([
    "produce",
    "dairy",
    "meat",
    "seafood",
    "bread",
    "canned",
    "frozen",
    "beverages",
    "condiments",
    "snacks",
    "grains",
    "spices",
    "other"
  ]),
  quantity: z4.number().min(0),
  quantityUnit: z4.enum([
    "items",
    "lbs",
    "oz",
    "bunch",
    "container",
    "bag",
    "box",
    "bottle",
    "can"
  ]),
  storageLocation: z4.enum(["refrigerator", "freezer", "pantry", "counter"]),
  shelfLifeDays: z4.number().min(1).max(365),
  confidence: z4.number().min(0).max(1)
});
var analysisResponseSchema = z4.object({
  items: z4.array(identifiedFoodSchema),
  notes: z4.string().optional(),
  error: z4.string().optional()
});
var VALID_CATEGORIES = [
  "produce",
  "dairy",
  "meat",
  "seafood",
  "bread",
  "canned",
  "frozen",
  "beverages",
  "condiments",
  "snacks",
  "grains",
  "spices",
  "other"
];
var VALID_UNITS = [
  "items",
  "lbs",
  "oz",
  "bunch",
  "container",
  "bag",
  "box",
  "bottle",
  "can"
];
var VALID_LOCATIONS = ["refrigerator", "freezer", "pantry", "counter"];
function parseAnalysisResponse(content) {
  if (!content) {
    return { success: false, normalized: false, error: "No response content" };
  }
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      success: false,
      normalized: false,
      error: "Failed to parse AI response"
    };
  }
  const validationResult = analysisResponseSchema.safeParse(parsed);
  if (validationResult.success) {
    return { success: true, normalized: false, data: validationResult.data };
  }
  const fixedItems = normalizeItems(parsed?.items || []);
  return {
    success: true,
    normalized: true,
    data: {
      items: fixedItems,
      notes: parsed?.notes || void 0,
      error: parsed?.error || void 0
    }
  };
}
function normalizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map((item) => ({
    name: String(item?.name || "Unknown Item"),
    category: normalizeCategory(item?.category),
    quantity: normalizeQuantity(item?.quantity),
    quantityUnit: normalizeUnit2(item?.quantityUnit),
    storageLocation: normalizeStorageLocation(item?.storageLocation),
    shelfLifeDays: normalizeShelfLife(item?.shelfLifeDays),
    confidence: normalizeConfidence(item?.confidence)
  }));
}
function normalizeCategory(category) {
  if (typeof category === "string" && VALID_CATEGORIES.includes(category.toLowerCase())) {
    return category.toLowerCase();
  }
  return "other";
}
function normalizeUnit2(unit) {
  if (typeof unit === "string" && VALID_UNITS.includes(unit.toLowerCase())) {
    return unit.toLowerCase();
  }
  return "items";
}
function normalizeStorageLocation(location) {
  if (typeof location === "string" && VALID_LOCATIONS.includes(location.toLowerCase())) {
    return location.toLowerCase();
  }
  return "refrigerator";
}
function normalizeQuantity(quantity) {
  const num = Number(quantity);
  return isNaN(num) ? 1 : Math.max(0, num);
}
function normalizeShelfLife(shelfLifeDays) {
  const num = Number(shelfLifeDays);
  if (isNaN(num)) return 7;
  return Math.min(365, Math.max(1, num));
}
function normalizeConfidence(confidence) {
  const num = Number(confidence);
  if (isNaN(num)) return 0.5;
  return Math.min(1, Math.max(0, num));
}
var SUPPORTED_IMAGE_FORMATS = ["jpeg", "jpg", "png", "webp", "gif"];
var MAX_FILE_SIZE2 = 10 * 1024 * 1024;
function getImageMimeType(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const mimeTypes = {
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif"
  };
  return ext && mimeTypes[ext] ? mimeTypes[ext] : null;
}
function isValidImageFormat(filename) {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? SUPPORTED_IMAGE_FORMATS.includes(ext) : false;
}
function detectMimeTypeFromBuffer(buffer) {
  if (buffer.length < 4) return null;
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
    return "image/jpeg";
  }
  if (buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71) {
    return "image/png";
  }
  if (buffer[0] === 82 && buffer[1] === 73 && buffer[2] === 70 && buffer[3] === 70) {
    if (buffer.length >= 12 && buffer.toString("utf8", 8, 12) === "WEBP") {
      return "image/webp";
    }
  }
  if (buffer[0] === 71 && buffer[1] === 73 && buffer[2] === 70 && buffer[3] === 56) {
    return "image/gif";
  }
  return null;
}

// server/routers/platform/ai/image-analysis.router.ts
var router6 = Router7();
var openaiClient = null;
function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI5({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
    });
  }
  return openaiClient;
}
var FOOD_ANALYSIS_PROMPT = `Analyze this image and identify all visible food items.

For each food item found, extract:
- name: Common food name (be specific, e.g., "Gala Apple" not just "apple", "Whole Milk" not just "milk")
- category: One of: produce, dairy, meat, seafood, bread, canned, frozen, beverages, condiments, snacks, grains, spices, other
- quantity: Estimated count or amount (as a number)
- quantityUnit: One of: items, lbs, oz, bunch, container, bag, box, bottle, can
- storageLocation: Recommended storage - one of: refrigerator, freezer, pantry, counter
- shelfLifeDays: Estimated days of freshness from today (as a number, 1-365)
- confidence: Your confidence in this identification from 0.0 to 1.0

Guidelines:
- Be specific with names when brand or variety is visible
- If multiple of the same item exist, count them accurately
- For packaged items, read labels if visible
- If you're unsure about identification, use lower confidence (0.3-0.6)
- High confidence (0.8-1.0) only when very certain
- Medium confidence (0.5-0.79) when reasonably sure
- Low confidence (0.1-0.49) when guessing

Return valid JSON in this exact format:
{
  "items": [
    {
      "name": "Food Name",
      "category": "produce",
      "quantity": 3,
      "quantityUnit": "items",
      "storageLocation": "refrigerator",
      "shelfLifeDays": 7,
      "confidence": 0.85
    }
  ],
  "notes": "Any additional observations about the food items"
}

If no food is visible in the image, return:
{
  "items": [],
  "error": "No food items detected in this image"
}`;
router6.post("/analyze-food", async (req, res) => {
  try {
    const contentType = req.headers["content-type"] || "";
    if (!contentType.includes("multipart/form-data")) {
      return res.status(400).json({
        items: [],
        error: "Expected multipart/form-data with image file"
      });
    }
    const files = req.files;
    const file = files?.image || files?.file;
    if (!file) {
      return res.status(400).json({
        items: [],
        error: "No image file provided. Please upload an image with field name 'image' or 'file'"
      });
    }
    const filename = file.name || file.originalname || "image.jpg";
    const fileData = file.data || file.buffer;
    if (!fileData || fileData.length === 0) {
      return res.status(400).json({
        items: [],
        error: "The uploaded image file appears to be empty"
      });
    }
    if (fileData.length > MAX_FILE_SIZE2) {
      return res.status(400).json({
        items: [],
        error: `Image file too large. Maximum size is ${MAX_FILE_SIZE2 / 1024 / 1024}MB`
      });
    }
    let mimeType = detectMimeTypeFromBuffer(fileData);
    if (!mimeType) {
      if (isValidImageFormat(filename)) {
        mimeType = getImageMimeType(filename);
      }
    }
    if (!mimeType) {
      return res.status(400).json({
        items: [],
        error: `Invalid image format. Supported formats: ${SUPPORTED_IMAGE_FORMATS.join(", ")}`
      });
    }
    const base64Image = fileData.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Image}`;
    console.log(
      `Analyzing food image: ${filename} (${(fileData.length / 1024).toFixed(1)}KB, ${mimeType})`
    );
    const openai9 = getOpenAIClient();
    const completion = await openai9.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert food identification system. You analyze images to identify food items with high accuracy. Always respond with valid JSON."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: FOOD_ANALYSIS_PROMPT
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048
    });
    const content = completion.choices[0]?.message?.content;
    const parseResult = parseAnalysisResponse(content || null);
    if (!parseResult.success) {
      console.error("Failed to parse response:", parseResult.error);
      return res.status(500).json({
        items: [],
        error: parseResult.error || "Failed to parse AI response"
      });
    }
    console.log(
      `Food analysis complete: ${parseResult.data.items.length} items identified`
    );
    return res.json(parseResult.data);
  } catch (error) {
    console.error("Image analysis error:", error);
    if (error.status === 429) {
      return res.status(429).json({
        items: [],
        error: "Too many requests. Please try again in a moment."
      });
    }
    if (error.code === "invalid_api_key") {
      return res.status(500).json({
        items: [],
        error: "AI service configuration error"
      });
    }
    if (error.message?.includes("Could not process image")) {
      return res.status(400).json({
        items: [],
        error: "Could not process the image. Please try a different image."
      });
    }
    return res.status(500).json({
      items: [],
      error: "An unexpected error occurred while analyzing the image"
    });
  }
});
router6.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    supportedFormats: SUPPORTED_IMAGE_FORMATS,
    maxFileSize: `${MAX_FILE_SIZE2 / 1024 / 1024}MB`,
    model: "gpt-4o"
  });
});
var image_analysis_router_default = router6;

// server/routers/user/ingredients.router.ts
import { Router as Router8 } from "express";
import OpenAI6 from "openai";
import { z as z5 } from "zod";
var router7 = Router8();
var openai5 = new OpenAI6({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});
var INGREDIENT_SCAN_PROMPT = `Analyze this image of a food product label or ingredient list.

Extract the following information:
1. Product name (if visible)
2. All ingredients listed on the label
3. Nutrition information per serving (if visible):
   - Calories
   - Protein (grams)
   - Carbohydrates (grams)
   - Fat (grams)
   - Fiber (grams)
   - Sugar (grams)
   - Sodium (mg)
4. Serving size (if visible)
5. Number of servings per container (if visible)

For each ingredient identified, suggest:
- A simplified common name for inventory tracking
- The appropriate storage location (refrigerator, freezer, pantry, counter)
- An estimated category (produce, dairy, meat, seafood, bread, canned, frozen, beverages, condiments, snacks, grains, spices, other)

Return valid JSON in this exact format:
{
  "productName": "Product Name or null if not visible",
  "ingredients": [
    {
      "name": "Ingredient name",
      "simplifiedName": "Common name for inventory",
      "category": "category",
      "storageLocation": "pantry"
    }
  ],
  "nutrition": {
    "servingSize": "1 cup (240ml)",
    "servingsPerContainer": 4,
    "calories": 150,
    "protein": 8,
    "carbs": 12,
    "fat": 8,
    "fiber": 0,
    "sugar": 12,
    "sodium": 130
  },
  "rawText": "The complete text visible on the label",
  "confidence": 0.85,
  "notes": "Any relevant observations"
}

If the image doesn't show a readable ingredient label, return:
{
  "error": "Could not read ingredient label from this image",
  "suggestion": "Please take a clearer photo of the ingredient list or nutrition facts panel"
}`;
var scanRequestSchema = z5.object({
  image: z5.string().min(1, "Base64 image data is required")
});
var scannedIngredientSchema = z5.object({
  name: z5.string().default("Unknown"),
  simplifiedName: z5.string().default("Unknown"),
  category: z5.string().default("other"),
  storageLocation: z5.string().default("pantry")
});
var nutritionInfoSchema = z5.object({
  servingSize: z5.string().optional(),
  servingsPerContainer: z5.number().optional(),
  calories: z5.number().optional(),
  protein: z5.number().optional(),
  carbs: z5.number().optional(),
  fat: z5.number().optional(),
  fiber: z5.number().optional(),
  sugar: z5.number().optional(),
  sodium: z5.number().optional()
}).nullable();
var scanResultSchema = z5.object({
  productName: z5.string().nullable().default(null),
  ingredients: z5.array(scannedIngredientSchema).default([]),
  nutrition: nutritionInfoSchema.optional().default(null),
  rawText: z5.string().default(""),
  confidence: z5.number().default(0.5),
  notes: z5.string().optional(),
  error: z5.string().optional(),
  suggestion: z5.string().optional()
});
router7.post("/scan", async (req, res) => {
  try {
    const contentType = req.headers["content-type"] || "";
    let base64Image;
    if (contentType.includes("multipart/form-data")) {
      const files = req.files;
      const file = files?.image || files?.file;
      if (!file) {
        return res.status(400).json({
          error: "No image file provided",
          suggestion: "Please upload an image of the ingredient label"
        });
      }
      const fileData = file.data || file.buffer;
      if (!fileData || fileData.length === 0) {
        return res.status(400).json({
          error: "The uploaded image file appears to be empty"
        });
      }
      const maxSize = 10 * 1024 * 1024;
      if (fileData.length > maxSize) {
        return res.status(400).json({
          error: `Image file too large. Maximum size is ${maxSize / 256 / 256}MB`
        });
      }
      base64Image = fileData.toString("base64");
    } else if (contentType.includes("application/json")) {
      const parseResult2 = scanRequestSchema.safeParse(req.body);
      if (!parseResult2.success) {
        return res.status(400).json({
          error: "Invalid request body",
          details: parseResult2.error.errors
        });
      }
      base64Image = parseResult2.data.image.replace(
        /^data:image\/\w+;base64,/,
        ""
      );
    } else {
      return res.status(400).json({
        error: "Expected multipart/form-data or application/json"
      });
    }
    const mimeType = detectMimeType2(base64Image);
    const dataUrl = `data:${mimeType};base64,${base64Image}`;
    console.log(
      `Scanning ingredient label: ${(base64Image.length / 1024).toFixed(1)}KB`
    );
    const completion = await openai5.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert OCR system specialized in reading food product labels, ingredient lists, and nutrition facts panels. Extract information accurately and return valid JSON."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: INGREDIENT_SCAN_PROMPT
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high"
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({
        error: "No response from AI service"
      });
    }
    let rawResult;
    try {
      rawResult = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return res.status(500).json({
        error: "Failed to parse ingredient scan results"
      });
    }
    const parseResult = scanResultSchema.safeParse(rawResult);
    if (!parseResult.success) {
      console.error("AI response validation failed:", parseResult.error.errors);
      return res.status(500).json({
        error: "Invalid response format from AI service",
        suggestion: "Please try again with a clearer photo"
      });
    }
    const result = parseResult.data;
    if (result.error) {
      return res.status(200).json({
        error: result.error,
        suggestion: result.suggestion
      });
    }
    console.log(
      `Ingredient scan complete: ${result.ingredients.length} ingredients found`
    );
    return res.json({
      productName: result.productName,
      ingredients: result.ingredients,
      nutrition: result.nutrition,
      rawText: result.rawText,
      confidence: result.confidence,
      notes: result.notes
    });
  } catch (error) {
    console.error("Ingredient scan error:", error);
    return res.status(500).json({
      error: "Failed to scan ingredient label",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});
function detectMimeType2(base64) {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBORw")) return "image/png";
  if (base64.startsWith("R0lGOD")) return "image/gif";
  if (base64.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}
var ingredients_router_default = router7;

// server/routers/platform/instacart.router.ts
import { Router as Router9 } from "express";
var router8 = Router9();
function getAlternateMeasurements(quantity, unit) {
  if (!unit || !quantity) return [];
  const instacartUnit = normalizeUnitForInstacart(unit);
  if (!instacartUnit) return [];
  const measurements = [{ quantity, unit: instacartUnit }];
  const unitType = getUnitType(unit);
  if (unitType === "weight") {
    if (["oz", "lb"].includes(instacartUnit)) {
      const grams = convert(quantity, unit, "g");
      if (grams && grams >= 1) {
        measurements.push({ quantity: Math.round(grams), unit: "g" });
      }
    } else if (["g", "kg"].includes(instacartUnit)) {
      const oz = convert(quantity, unit, "oz");
      if (oz && oz >= 0.1) {
        measurements.push({ quantity: Math.round(oz * 10) / 10, unit: "oz" });
      }
    }
  } else if (unitType === "volume") {
    if (["fl oz", "cup", "tbsp", "tsp", "pt", "qt", "gal"].includes(instacartUnit)) {
      const ml = convert(quantity, unit, "ml");
      if (ml && ml >= 1) {
        measurements.push({ quantity: Math.round(ml), unit: "ml" });
      }
    } else if (["ml", "l"].includes(instacartUnit)) {
      const floz = convert(quantity, unit, "fl oz");
      if (floz && floz >= 0.1) {
        measurements.push({ quantity: Math.round(floz * 10) / 10, unit: "fl oz" });
      }
    }
  }
  return measurements;
}
var INSTACART_BASE_URL = process.env.NODE_ENV === "production" ? "https://connect.instacart.com" : "https://connect.instacart.com";
var INSTACART_API_CONFIGURED = !!process.env.INSTACART_API_KEY;
router8.get("/status", (_req, res) => {
  res.json({
    configured: INSTACART_API_CONFIGURED,
    message: INSTACART_API_CONFIGURED ? "Instacart API is configured and ready" : "Instacart API key not configured. Please set INSTACART_API_KEY environment variable."
  });
});
router8.post("/create-shopping-list", async (req, res) => {
  const { title, items, imageUrl, partnerLinkbackUrl } = req.body;
  if (!INSTACART_API_CONFIGURED) {
    return res.status(503).json({
      error: "Instacart API not configured",
      message: "Please configure the Instacart API key to create shopping lists."
    });
  }
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (!items || items.length === 0) {
    return res.status(400).json({ error: "At least one item is required" });
  }
  try {
    const result = await createInstacartShoppingList(title, items, imageUrl, partnerLinkbackUrl);
    res.json(result);
  } catch (error) {
    console.error("Instacart shopping list creation error:", error);
    res.status(500).json({
      error: "Failed to create shopping list",
      message: error.message || "Unknown error occurred"
    });
  }
});
router8.post("/create-recipe", async (req, res) => {
  const { title, ingredients, instructions, imageUrl, partnerLinkbackUrl, author, source_url } = req.body;
  if (!INSTACART_API_CONFIGURED) {
    return res.status(503).json({
      error: "Instacart API not configured",
      message: "Please configure the Instacart API key to create recipe lists."
    });
  }
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  if (!ingredients || ingredients.length === 0) {
    return res.status(400).json({ error: "At least one ingredient is required" });
  }
  try {
    const result = await createInstacartRecipe(
      title,
      ingredients,
      instructions,
      imageUrl,
      partnerLinkbackUrl,
      author,
      source_url
    );
    res.json(result);
  } catch (error) {
    console.error("Instacart recipe creation error:", error);
    res.status(500).json({
      error: "Failed to create recipe list",
      message: error.message || "Unknown error occurred"
    });
  }
});
router8.get("/retailers", async (_req, res) => {
  const retailers = [
    { id: "heb", name: "H-E-B", logo: "heb" },
    { id: "randalls", name: "Randall's", logo: "randalls" },
    { id: "kroger", name: "Kroger", logo: "kroger" },
    { id: "walmart", name: "Walmart", logo: "walmart" },
    { id: "target", name: "Target", logo: "target" },
    { id: "costco", name: "Costco", logo: "costco" },
    { id: "safeway", name: "Safeway", logo: "safeway" },
    { id: "albertsons", name: "Albertsons", logo: "albertsons" },
    { id: "publix", name: "Publix", logo: "publix" },
    { id: "sprouts", name: "Sprouts", logo: "sprouts" },
    { id: "whole-foods", name: "Whole Foods", logo: "whole-foods" },
    { id: "aldi", name: "ALDI", logo: "aldi" }
  ];
  res.json({ retailers });
});
async function createInstacartShoppingList(title, items, imageUrl, partnerLinkbackUrl) {
  const apiKey = process.env.INSTACART_API_KEY;
  if (!apiKey) {
    throw new Error("Instacart API key not configured");
  }
  const lineItems = items.map((item) => {
    const measurements = getAlternateMeasurements(item.quantity || 0, item.unit);
    const baseItem = {
      name: item.name,
      ...item.display_text && { display_text: item.display_text },
      ...item.product_ids && item.product_ids.length > 0 && { product_ids: item.product_ids },
      ...item.upcs && item.upcs.length > 0 && { upcs: item.upcs },
      ...item.filters && { filters: item.filters }
    };
    if (measurements.length > 0) {
      return {
        ...baseItem,
        line_item_measurements: measurements
      };
    }
    const instacartUnit = normalizeUnitForInstacart(item.unit);
    return {
      ...baseItem,
      ...item.quantity && { quantity: item.quantity },
      ...instacartUnit && { unit: instacartUnit }
    };
  });
  const requestBody = {
    title,
    line_items: lineItems,
    landing_page_configuration: {
      enable_pantry_items: true,
      ...partnerLinkbackUrl && { partner_linkback_url: partnerLinkbackUrl }
    }
  };
  if (imageUrl) {
    requestBody.image_url = imageUrl;
  }
  console.log(`[Instacart] Creating shopping list: "${title}" with ${items.length} items`);
  const response = await fetch(`${INSTACART_BASE_URL}/idp/v1/products/products_link`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Instacart] API error (${response.status}):`, errorText);
    if (response.status === 401) {
      throw new Error("Invalid Instacart API key");
    } else if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    } else {
      throw new Error(`Instacart API error: ${response.status}`);
    }
  }
  const data = await response.json();
  if (!data.products_link_url) {
    throw new Error("No shopping list URL returned from Instacart");
  }
  console.log(`[Instacart] Shopping list created: ${data.products_link_url}`);
  return {
    shoppingListUrl: data.products_link_url,
    success: true
  };
}
async function createInstacartRecipe(title, ingredients, instructions, imageUrl, partnerLinkbackUrl, author, sourceUrl) {
  const apiKey = process.env.INSTACART_API_KEY;
  if (!apiKey) {
    throw new Error("Instacart API key not configured");
  }
  const lineItems = ingredients.map((item) => {
    const measurements = getAlternateMeasurements(item.quantity || 0, item.unit);
    const baseItem = {
      name: item.name,
      ...item.display_text && { display_text: item.display_text },
      ...item.product_ids && item.product_ids.length > 0 && { product_ids: item.product_ids },
      ...item.upcs && item.upcs.length > 0 && { upcs: item.upcs },
      ...item.filters && { filters: item.filters }
    };
    if (measurements.length > 0) {
      return {
        ...baseItem,
        line_item_measurements: measurements
      };
    }
    const instacartUnit = normalizeUnitForInstacart(item.unit);
    return {
      ...baseItem,
      ...item.quantity && { quantity: item.quantity },
      ...instacartUnit && { unit: instacartUnit }
    };
  });
  const requestBody = {
    title,
    line_items: lineItems,
    landing_page_configuration: {
      enable_pantry_items: true,
      ...partnerLinkbackUrl && { partner_linkback_url: partnerLinkbackUrl }
    }
  };
  if (imageUrl) {
    requestBody.image_url = imageUrl;
  }
  if (instructions && instructions.length > 0) {
    requestBody.instructions = instructions;
  }
  if (author) {
    requestBody.author = author;
  }
  if (sourceUrl) {
    requestBody.source_url = sourceUrl;
  }
  console.log(`[Instacart] Creating recipe: "${title}" with ${ingredients.length} ingredients`);
  const response = await fetch(`${INSTACART_BASE_URL}/idp/v1/products/recipe`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(requestBody)
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Instacart] API error (${response.status}):`, errorText);
    if (response.status === 401) {
      throw new Error("Invalid Instacart API key");
    } else if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    } else {
      throw new Error(`Instacart API error: ${response.status}`);
    }
  }
  const data = await response.json();
  const recipeUrl = data.recipe_link_url || data.products_link_url;
  if (!recipeUrl) {
    throw new Error("No recipe URL returned from Instacart");
  }
  console.log(`[Instacart] Recipe created: ${recipeUrl}`);
  return {
    recipeUrl,
    success: true
  };
}
var instacart_router_default = router8;

// server/routers/auth.router.ts
init_db();
init_schema();
import { Router as Router10 } from "express";
import { eq as eq5 } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
var router9 = Router10();
async function evaluateAndUpdateSubscriptionStatus(subscription) {
  const now = /* @__PURE__ */ new Date();
  if (subscription.status === "trialing" && subscription.trialEnd && new Date(subscription.trialEnd) < now) {
    await db.update(subscriptions).set({ status: "expired", updatedAt: now }).where(eq5(subscriptions.userId, subscription.userId));
    return "expired";
  }
  if (subscription.status === "active" && subscription.currentPeriodEnd && !subscription.stripeSubscriptionId) {
    if (new Date(subscription.currentPeriodEnd) < now) {
      await db.update(subscriptions).set({ status: "expired", updatedAt: now }).where(eq5(subscriptions.userId, subscription.userId));
      return "expired";
    }
  }
  return subscription.status;
}
async function getSubscriptionInfo(userId) {
  const [subscription] = await db.select().from(subscriptions).where(eq5(subscriptions.userId, userId)).limit(1);
  if (!subscription) {
    return {
      subscriptionStatus: "none",
      subscriptionPlanType: null,
      trialEndsAt: null,
      subscriptionEndsAt: null
    };
  }
  const currentStatus = await evaluateAndUpdateSubscriptionStatus(subscription);
  return {
    subscriptionStatus: currentStatus,
    subscriptionPlanType: subscription.planType,
    trialEndsAt: subscription.trialEnd?.toISOString() || null,
    subscriptionEndsAt: subscription.currentPeriodEnd?.toISOString() || null
  };
}
var BCRYPT_ROUNDS = 12;
async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
function generateToken() {
  return randomBytes(32).toString("hex");
}
function getExpiryDate() {
  const date2 = /* @__PURE__ */ new Date();
  date2.setDate(date2.getDate() + 30);
  return date2;
}
var AUTH_COOKIE_NAME = "chefspaice_auth";
var COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1e3;
function setAuthCookie(res, token, req) {
  const isSecure = req ? req.protocol === "https" || req.get("x-forwarded-proto") === "https" : true;
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/"
  });
}
function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, { path: "/" });
}
router9.post("/register", async (req, res) => {
  try {
    const { email, password, displayName, selectedPlan } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const validPlans = ["monthly", "annual"];
    const plan = validPlans.includes(selectedPlan) ? selectedPlan : "monthly";
    const existingUser = await db.select().from(users).where(eq5(users.email, email.toLowerCase())).limit(1);
    if (existingUser.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    const hashedPassword = await hashPassword(password);
    const [newUser] = await db.insert(users).values({
      email: email.toLowerCase(),
      password: hashedPassword,
      displayName: displayName || email.split("@")[0]
    }).returning();
    const token = generateToken();
    const expiresAt = getExpiryDate();
    await db.insert(userSessions).values({
      userId: newUser.id,
      token,
      expiresAt
    });
    await db.insert(userSyncData).values({
      userId: newUser.id
    });
    await ensureTrialSubscription(newUser.id, plan);
    const subscriptionInfo = await getSubscriptionInfo(newUser.id);
    setAuthCookie(res, token, req);
    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        displayName: newUser.displayName,
        createdAt: newUser.createdAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
        ...subscriptionInfo
      },
      token
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});
router9.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const [user] = await db.select().from(users).where(eq5(users.email, email.toLowerCase())).limit(1);
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const token = generateToken();
    const expiresAt = getExpiryDate();
    await db.insert(userSessions).values({
      userId: user.id,
      token,
      expiresAt
    });
    const subscriptionInfo = await getSubscriptionInfo(user.id);
    setAuthCookie(res, token, req);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
        ...subscriptionInfo
      },
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});
router9.post("/logout", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
    let token = null;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (cookieToken) {
      token = cookieToken;
    }
    if (token) {
      await db.delete(userSessions).where(eq5(userSessions.token, token));
    }
    clearAuthCookie(res);
    res.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    clearAuthCookie(res);
    res.status(200).json({ success: true });
  }
});
router9.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const token = authHeader.substring(7);
    const [session] = await db.select().from(userSessions).where(eq5(userSessions.token, token)).limit(1);
    if (!session || new Date(session.expiresAt) < /* @__PURE__ */ new Date()) {
      return res.status(401).json({ error: "Session expired" });
    }
    const [user] = await db.select().from(users).where(eq5(users.id, session.userId)).limit(1);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    const subscriptionInfo = await getSubscriptionInfo(user.id);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
        ...subscriptionInfo
      }
    });
  } catch (error) {
    console.error("Auth check error:", error);
    res.status(500).json({ error: "Failed to verify authentication" });
  }
});
router9.get("/restore-session", async (req, res) => {
  try {
    const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
    if (!cookieToken) {
      return res.status(401).json({ error: "No session cookie" });
    }
    const [session] = await db.select().from(userSessions).where(eq5(userSessions.token, cookieToken)).limit(1);
    if (!session || new Date(session.expiresAt) < /* @__PURE__ */ new Date()) {
      clearAuthCookie(res);
      return res.status(401).json({ error: "Session expired" });
    }
    const [user] = await db.select().from(users).where(eq5(users.id, session.userId)).limit(1);
    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ error: "User not found" });
    }
    const subscriptionInfo = await getSubscriptionInfo(user.id);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt?.toISOString() || (/* @__PURE__ */ new Date()).toISOString(),
        ...subscriptionInfo
      },
      token: cookieToken
    });
  } catch (error) {
    console.error("Session restore error:", error);
    clearAuthCookie(res);
    res.status(500).json({ error: "Failed to restore session" });
  }
});
router9.get("/sync", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const token = authHeader.substring(7);
    const [session] = await db.select().from(userSessions).where(eq5(userSessions.token, token)).limit(1);
    if (!session || new Date(session.expiresAt) < /* @__PURE__ */ new Date()) {
      return res.status(401).json({ error: "Session expired" });
    }
    const [syncData] = await db.select().from(userSyncData).where(eq5(userSyncData.userId, session.userId)).limit(1);
    if (!syncData) {
      return res.json({ data: null, lastSyncedAt: null });
    }
    res.json({
      data: {
        inventory: syncData.inventory ? JSON.parse(syncData.inventory) : null,
        recipes: syncData.recipes ? JSON.parse(syncData.recipes) : null,
        mealPlans: syncData.mealPlans ? JSON.parse(syncData.mealPlans) : null,
        shoppingList: syncData.shoppingList ? JSON.parse(syncData.shoppingList) : null,
        preferences: syncData.preferences ? JSON.parse(syncData.preferences) : null,
        cookware: syncData.cookware ? JSON.parse(syncData.cookware) : null,
        wasteLog: syncData.wasteLog ? JSON.parse(syncData.wasteLog) : null,
        consumedLog: syncData.consumedLog ? JSON.parse(syncData.consumedLog) : null,
        analytics: syncData.analytics ? JSON.parse(syncData.analytics) : null,
        onboarding: syncData.onboarding ? JSON.parse(syncData.onboarding) : null,
        customLocations: syncData.customLocations ? JSON.parse(syncData.customLocations) : null,
        userProfile: syncData.userProfile ? JSON.parse(syncData.userProfile) : null
      },
      lastSyncedAt: syncData.lastSyncedAt?.toISOString() || null
    });
  } catch (error) {
    console.error("Sync fetch error:", error);
    res.status(500).json({ error: "Failed to fetch sync data" });
  }
});
router9.post("/sync", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const token = authHeader.substring(7);
    const [session] = await db.select().from(userSessions).where(eq5(userSessions.token, token)).limit(1);
    if (!session || new Date(session.expiresAt) < /* @__PURE__ */ new Date()) {
      return res.status(401).json({ error: "Session expired" });
    }
    const { data } = req.body;
    if (data.cookware && Array.isArray(data.cookware)) {
      const limitCheck = await checkCookwareLimit(session.userId);
      const maxLimit = typeof limitCheck.limit === "number" ? limitCheck.limit : Infinity;
      const incomingCount = data.cookware.length;
      if (incomingCount > maxLimit) {
        return res.status(403).json({
          error: "Cookware limit reached. Upgrade to Pro for unlimited cookware.",
          code: "COOKWARE_LIMIT_REACHED",
          limit: limitCheck.limit,
          count: incomingCount
        });
      }
    }
    if (data.customLocations && Array.isArray(data.customLocations) && data.customLocations.length > 0) {
      const hasAccess = await checkFeatureAccess(session.userId, "customStorageAreas");
      if (!hasAccess) {
        return res.status(403).json({
          error: "Custom storage areas are a Pro feature. Upgrade to Pro to create custom storage locations.",
          code: "FEATURE_NOT_AVAILABLE",
          feature: "customStorageAreas"
        });
      }
    }
    await db.update(userSyncData).set({
      inventory: data.inventory ? JSON.stringify(data.inventory) : null,
      recipes: data.recipes ? JSON.stringify(data.recipes) : null,
      mealPlans: data.mealPlans ? JSON.stringify(data.mealPlans) : null,
      shoppingList: data.shoppingList ? JSON.stringify(data.shoppingList) : null,
      preferences: data.preferences ? JSON.stringify(data.preferences) : null,
      cookware: data.cookware ? JSON.stringify(data.cookware) : null,
      wasteLog: data.wasteLog ? JSON.stringify(data.wasteLog) : null,
      consumedLog: data.consumedLog ? JSON.stringify(data.consumedLog) : null,
      analytics: data.analytics ? JSON.stringify(data.analytics) : null,
      onboarding: data.onboarding ? JSON.stringify(data.onboarding) : null,
      customLocations: data.customLocations ? JSON.stringify(data.customLocations) : null,
      userProfile: data.userProfile ? JSON.stringify(data.userProfile) : null,
      lastSyncedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq5(userSyncData.userId, session.userId));
    res.json({ success: true, syncedAt: (/* @__PURE__ */ new Date()).toISOString() });
  } catch (error) {
    console.error("Sync save error:", error);
    res.status(500).json({ error: "Failed to save sync data" });
  }
});
var auth_router_default = router9;

// server/routers/social-auth.router.ts
init_db();
init_schema();
import { Router as Router11 } from "express";
import { OAuth2Client } from "google-auth-library";
import appleSignin from "apple-signin-auth";
import { randomBytes as randomBytes2 } from "crypto";
import pg2 from "pg";
var router10 = Router11();
var pool2 = new pg2.Pool({
  connectionString: process.env.DATABASE_URL
});
function generateToken2() {
  return randomBytes2(32).toString("hex");
}
function getExpiryDate2() {
  const date2 = /* @__PURE__ */ new Date();
  date2.setDate(date2.getDate() + 30);
  return date2;
}
var AUTH_COOKIE_NAME2 = "chefspaice_auth";
var COOKIE_MAX_AGE2 = 30 * 24 * 60 * 60 * 1e3;
function setAuthCookie2(res, token, req) {
  const isSecure = req ? req.protocol === "https" || req.get("x-forwarded-proto") === "https" : true;
  res.cookie(AUTH_COOKIE_NAME2, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE2,
    path: "/"
  });
}
async function createSessionWithDrizzle(userId) {
  const token = generateToken2();
  const expiresAt = getExpiryDate2();
  await db.insert(userSessions).values({
    userId,
    token,
    expiresAt
  });
  return { token, expiresAt };
}
async function createSyncDataIfNeeded(userId) {
  try {
    await db.insert(userSyncData).values({
      userId
    }).onConflictDoNothing();
  } catch (error) {
  }
}
function getGoogleClientIds() {
  const clientIds = [];
  if (process.env.GOOGLE_CLIENT_ID) clientIds.push(process.env.GOOGLE_CLIENT_ID);
  if (process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) clientIds.push(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID);
  if (process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) clientIds.push(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
  if (process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID) clientIds.push(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID);
  return clientIds.filter((id, index2, self) => id && self.indexOf(id) === index2);
}
router10.post("/apple", async (req, res) => {
  const client = await pool2.connect();
  try {
    const { identityToken, authorizationCode, user, selectedPlan, selectedTier, isWebAuth, redirectUri } = req.body;
    let verifiedToken = null;
    if (isWebAuth && authorizationCode && !identityToken) {
      try {
        const tokenResponse = await exchangeAppleAuthCode(authorizationCode, redirectUri);
        if (!tokenResponse) {
          return res.status(401).json({ error: "Failed to exchange Apple authorization code" });
        }
        verifiedToken = tokenResponse;
      } catch (error) {
        console.error("Apple web auth code exchange error:", error);
        return res.status(401).json({ error: "Apple web authentication failed" });
      }
    } else if (identityToken) {
      verifiedToken = await verifyAppleToken(identityToken);
    } else {
      return res.status(400).json({ error: "Identity token or authorization code is required" });
    }
    if (!verifiedToken || !verifiedToken.sub) {
      return res.status(401).json({ error: "Invalid Apple token" });
    }
    const { sub: appleUserId, email: tokenEmail } = verifiedToken;
    const email = tokenEmail || user?.email || null;
    const firstName = user?.name?.firstName || null;
    const lastName = user?.name?.lastName || null;
    const validPlans = ["monthly", "annual"];
    const validTiers = ["basic", "pro"];
    const plan = validPlans.includes(selectedPlan || "") ? selectedPlan : validTiers.includes(selectedTier || "") ? "monthly" : "monthly";
    await client.query("BEGIN");
    const existingProviderResult = await client.query(
      `SELECT user_id FROM auth_providers WHERE provider = 'apple' AND provider_id = $1 LIMIT 1`,
      [appleUserId]
    );
    let userId;
    let isNewUser = false;
    if (existingProviderResult.rows.length > 0) {
      userId = existingProviderResult.rows[0].user_id;
    } else {
      if (email) {
        const existingUserByEmail = await client.query(
          `SELECT id FROM users WHERE email = $1 LIMIT 1`,
          [email]
        );
        if (existingUserByEmail.rows.length > 0) {
          userId = existingUserByEmail.rows[0].id;
          await client.query(
            `INSERT INTO auth_providers (user_id, provider, provider_id, provider_email, is_primary, metadata)
             VALUES ($1, 'apple', $2, $3, false, $4)
             ON CONFLICT (provider, provider_id) DO NOTHING`,
            [userId, appleUserId, email, JSON.stringify({ firstName, lastName })]
          );
        } else {
          isNewUser = true;
          const userResult2 = await client.query(
            `INSERT INTO users (email, first_name, last_name, primary_provider, primary_provider_id)
             VALUES ($1, $2, $3, 'apple', $4)
             RETURNING id`,
            [email, firstName, lastName, appleUserId]
          );
          userId = userResult2.rows[0].id;
          await client.query(
            `INSERT INTO auth_providers (user_id, provider, provider_id, provider_email, is_primary, metadata)
             VALUES ($1, 'apple', $2, $3, true, $4)`,
            [userId, appleUserId, email, JSON.stringify({ firstName, lastName })]
          );
        }
      } else {
        isNewUser = true;
        const userResult2 = await client.query(
          `INSERT INTO users (first_name, last_name, primary_provider, primary_provider_id)
           VALUES ($1, $2, 'apple', $3)
           RETURNING id`,
          [firstName, lastName, appleUserId]
        );
        userId = userResult2.rows[0].id;
        await client.query(
          `INSERT INTO auth_providers (user_id, provider, provider_id, is_primary, metadata)
           VALUES ($1, 'apple', $2, true, $3)`,
          [userId, appleUserId, JSON.stringify({ firstName, lastName })]
        );
      }
    }
    const userResult = await client.query(
      `SELECT id, email, first_name, last_name, profile_image_url, created_at FROM users WHERE id = $1`,
      [userId]
    );
    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(500).json({ error: "Failed to retrieve user data" });
    }
    const dbUser = userResult.rows[0];
    await client.query("COMMIT");
    if (isNewUser) {
      await createSyncDataIfNeeded(userId);
      await ensureTrialSubscription(userId, plan);
    }
    const { token, expiresAt } = await createSessionWithDrizzle(userId);
    setAuthCookie2(res, token, req);
    res.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        displayName: [dbUser.first_name, dbUser.last_name].filter(Boolean).join(" ") || void 0,
        avatarUrl: dbUser.profile_image_url,
        provider: "apple",
        isNewUser,
        createdAt: dbUser.created_at?.toISOString() || (/* @__PURE__ */ new Date()).toISOString()
      },
      token,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {
    });
    console.error("Apple auth error:", error);
    res.status(500).json({ error: "Apple authentication failed" });
  } finally {
    client.release();
  }
});
router10.post("/google", async (req, res) => {
  const dbClient = await pool2.connect();
  try {
    const { idToken, accessToken, selectedPlan } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: "ID token is required" });
    }
    const validPlans = ["monthly", "annual"];
    const plan = validPlans.includes(selectedPlan || "") ? selectedPlan : "monthly";
    const googleClient = new OAuth2Client();
    let payload;
    const clientIds = getGoogleClientIds();
    if (clientIds.length === 0) {
      console.error("No Google client IDs configured");
      return res.status(500).json({ error: "Google authentication not configured" });
    }
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: clientIds
      });
      payload = ticket.getPayload();
    } catch (verifyError) {
      console.error("Google token verification error:", verifyError);
      return res.status(401).json({ error: "Invalid Google token" });
    }
    if (!payload || !payload.sub) {
      return res.status(401).json({ error: "Invalid Google token payload" });
    }
    const googleUserId = payload.sub;
    const email = payload.email || null;
    const firstName = payload.given_name || null;
    const lastName = payload.family_name || null;
    const picture = payload.picture || null;
    await dbClient.query("BEGIN");
    const existingProviderResult = await dbClient.query(
      `SELECT user_id FROM auth_providers WHERE provider = 'google' AND provider_id = $1 LIMIT 1`,
      [googleUserId]
    );
    let userId;
    let isNewUser = false;
    if (existingProviderResult.rows.length > 0) {
      userId = existingProviderResult.rows[0].user_id;
      await dbClient.query(
        `UPDATE auth_providers SET access_token = $1, updated_at = NOW() WHERE provider = 'google' AND provider_id = $2`,
        [accessToken, googleUserId]
      );
    } else {
      if (email) {
        const existingUserByEmail = await dbClient.query(
          `SELECT id FROM users WHERE email = $1 LIMIT 1`,
          [email]
        );
        if (existingUserByEmail.rows.length > 0) {
          userId = existingUserByEmail.rows[0].id;
          await dbClient.query(
            `INSERT INTO auth_providers (user_id, provider, provider_id, provider_email, access_token, is_primary, metadata)
             VALUES ($1, 'google', $2, $3, $4, false, $5)
             ON CONFLICT (provider, provider_id) DO UPDATE SET access_token = $4, updated_at = NOW()`,
            [userId, googleUserId, email, accessToken, JSON.stringify({ name: payload.name, picture })]
          );
          if (picture) {
            await dbClient.query(
              `UPDATE users SET profile_image_url = COALESCE(profile_image_url, $1) WHERE id = $2`,
              [picture, userId]
            );
          }
        } else {
          isNewUser = true;
          const userResult2 = await dbClient.query(
            `INSERT INTO users (email, first_name, last_name, profile_image_url, primary_provider, primary_provider_id)
             VALUES ($1, $2, $3, $4, 'google', $5)
             RETURNING id`,
            [email, firstName, lastName, picture, googleUserId]
          );
          userId = userResult2.rows[0].id;
          await dbClient.query(
            `INSERT INTO auth_providers (user_id, provider, provider_id, provider_email, access_token, is_primary, metadata)
             VALUES ($1, 'google', $2, $3, $4, true, $5)`,
            [userId, googleUserId, email, accessToken, JSON.stringify({ name: payload.name, picture })]
          );
        }
      } else {
        isNewUser = true;
        const userResult2 = await dbClient.query(
          `INSERT INTO users (first_name, last_name, profile_image_url, primary_provider, primary_provider_id)
           VALUES ($1, $2, $3, 'google', $4)
           RETURNING id`,
          [firstName, lastName, picture, googleUserId]
        );
        userId = userResult2.rows[0].id;
        await dbClient.query(
          `INSERT INTO auth_providers (user_id, provider, provider_id, access_token, is_primary, metadata)
           VALUES ($1, 'google', $2, $3, true, $4)`,
          [userId, googleUserId, accessToken, JSON.stringify({ name: payload.name, picture })]
        );
      }
    }
    const userResult = await dbClient.query(
      `SELECT id, email, first_name, last_name, profile_image_url, created_at FROM users WHERE id = $1`,
      [userId]
    );
    if (userResult.rows.length === 0) {
      await dbClient.query("ROLLBACK");
      return res.status(500).json({ error: "Failed to retrieve user data" });
    }
    const dbUser = userResult.rows[0];
    await dbClient.query("COMMIT");
    if (isNewUser) {
      await createSyncDataIfNeeded(userId);
      await ensureTrialSubscription(userId, plan);
    }
    const { token, expiresAt } = await createSessionWithDrizzle(userId);
    setAuthCookie2(res, token, req);
    res.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        displayName: [dbUser.first_name, dbUser.last_name].filter(Boolean).join(" ") || payload.name,
        avatarUrl: dbUser.profile_image_url,
        provider: "google",
        isNewUser,
        createdAt: dbUser.created_at?.toISOString() || (/* @__PURE__ */ new Date()).toISOString()
      },
      token,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    await dbClient.query("ROLLBACK").catch(() => {
    });
    console.error("Google auth error:", error);
    res.status(500).json({ error: "Google authentication failed" });
  } finally {
    dbClient.release();
  }
});
async function exchangeAppleAuthCode(authorizationCode, clientRedirectUri) {
  const clientId = process.env.APPLE_CLIENT_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY;
  if (!clientId || !teamId || !keyId || !privateKey) {
    console.error("Apple web auth not configured: missing APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, or APPLE_PRIVATE_KEY");
    return null;
  }
  try {
    const clientSecret = appleSignin.getClientSecret({
      clientID: clientId,
      teamID: teamId,
      keyIdentifier: keyId,
      privateKey: privateKey.replace(/\\n/g, "\n")
      // Handle escaped newlines from env
    });
    let redirectUri = clientRedirectUri;
    if (!redirectUri) {
      const domain = process.env.REPLIT_DEV_DOMAIN || "localhost:5000";
      redirectUri = domain.includes("localhost") ? "https://localhost:5000/auth/callback/apple" : `https://${domain}/auth/callback/apple`;
    }
    console.log("Apple auth code exchange with redirectUri:", redirectUri);
    const tokenResponse = await appleSignin.getAuthorizationToken(authorizationCode, {
      clientID: clientId,
      clientSecret,
      redirectUri
    });
    if (!tokenResponse || !tokenResponse.id_token) {
      console.error("Apple token exchange failed: no id_token in response");
      return null;
    }
    const payload = await appleSignin.verifyIdToken(tokenResponse.id_token, {
      audience: clientId,
      ignoreExpiration: false
    });
    if (!payload || !payload.sub) {
      console.error("Apple token verification failed after exchange");
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email
    };
  } catch (error) {
    console.error("Apple auth code exchange error:", error);
    return null;
  }
}
async function verifyAppleToken(identityToken) {
  const bundleId = "com.chefspaice.chefspaice";
  const serviceId = process.env.APPLE_CLIENT_ID || `service.${bundleId}`;
  const expoGoBundleId = "host.exp.Exponent";
  const validAudiences = [bundleId, serviceId, expoGoBundleId];
  try {
    for (const audience of validAudiences) {
      try {
        const payload = await appleSignin.verifyIdToken(identityToken, {
          audience,
          ignoreExpiration: false
        });
        if (payload && payload.sub) {
          console.log(`Apple token verified with audience: ${audience}`);
          return {
            sub: payload.sub,
            email: payload.email
          };
        }
      } catch (err) {
        continue;
      }
    }
    console.warn("Apple token verification failed: no valid audience matched");
    return null;
  } catch (error) {
    console.error("Apple token JWKS verification failed:", error);
    return null;
  }
}
var social_auth_router_default = router10;

// server/routers/sync.router.ts
init_db();
init_schema();
import { Router as Router12 } from "express";
import { eq as eq6 } from "drizzle-orm";
var router11 = Router12();
async function getSessionFromToken(token) {
  if (!token) return null;
  const sessions = await db.select().from(userSessions).where(eq6(userSessions.token, token));
  if (sessions.length === 0) return null;
  const session = sessions[0];
  if (new Date(session.expiresAt) < /* @__PURE__ */ new Date()) {
    return null;
  }
  return session;
}
function getAuthToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}
router11.post("/inventory", async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    const { operation, data, clientTimestamp } = req.body;
    if (operation === "create") {
      const limitCheck = await checkPantryItemLimit(session.userId);
      const remaining = typeof limitCheck.remaining === "number" ? limitCheck.remaining : Infinity;
      if (remaining < 1) {
        return res.status(403).json({
          error: ERROR_MESSAGES[ERROR_CODES.PANTRY_LIMIT_REACHED],
          code: ERROR_CODES.PANTRY_LIMIT_REACHED,
          limit: limitCheck.limit,
          remaining: 0
        });
      }
    }
    const existingSyncData = await db.select().from(userSyncData).where(eq6(userSyncData.userId, session.userId));
    let currentInventory = [];
    if (existingSyncData.length > 0 && existingSyncData[0].inventory) {
      currentInventory = JSON.parse(existingSyncData[0].inventory);
    }
    if (operation === "create") {
      currentInventory.push(data);
    } else if (operation === "update") {
      const index2 = currentInventory.findIndex(
        (item) => item.id === data.id
      );
      if (index2 !== -1) {
        currentInventory[index2] = data;
      } else {
        const limitCheck = await checkPantryItemLimit(session.userId);
        const remaining = typeof limitCheck.remaining === "number" ? limitCheck.remaining : Infinity;
        if (remaining < 1) {
          return res.status(403).json({
            error: ERROR_MESSAGES[ERROR_CODES.PANTRY_LIMIT_REACHED],
            code: ERROR_CODES.PANTRY_LIMIT_REACHED,
            limit: limitCheck.limit,
            remaining: 0
          });
        }
        currentInventory.push(data);
      }
    } else if (operation === "delete") {
      currentInventory = currentInventory.filter(
        (item) => item.id !== data.id
      );
    }
    const finalLimitCheck = await checkPantryItemLimit(session.userId);
    const maxLimit = typeof finalLimitCheck.limit === "number" ? finalLimitCheck.limit : Infinity;
    if (currentInventory.length > maxLimit) {
      return res.status(403).json({
        error: ERROR_MESSAGES[ERROR_CODES.PANTRY_LIMIT_REACHED],
        code: ERROR_CODES.PANTRY_LIMIT_REACHED,
        limit: finalLimitCheck.limit,
        count: currentInventory.length
      });
    }
    if (existingSyncData.length === 0) {
      await db.insert(userSyncData).values({
        userId: session.userId,
        inventory: JSON.stringify(currentInventory)
      });
    } else {
      await db.update(userSyncData).set({
        inventory: JSON.stringify(currentInventory),
        lastSyncedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq6(userSyncData.userId, session.userId));
    }
    res.json({
      success: true,
      syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
      operation,
      itemId: data.id
    });
  } catch (error) {
    console.error("Inventory sync error:", error);
    res.status(500).json({ error: "Failed to sync inventory" });
  }
});
router11.put("/inventory", async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    const { data, clientTimestamp } = req.body;
    if (!data || !data.id) {
      return res.status(400).json({ error: "Invalid data: missing id" });
    }
    const existingSyncData = await db.select().from(userSyncData).where(eq6(userSyncData.userId, session.userId));
    let currentInventory = [];
    if (existingSyncData.length > 0 && existingSyncData[0].inventory) {
      currentInventory = JSON.parse(existingSyncData[0].inventory);
    }
    const index2 = currentInventory.findIndex(
      (item) => item.id === data.id
    );
    if (index2 !== -1) {
      const existingItem = currentInventory[index2];
      const existingTimestamp = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
      const newTimestamp = clientTimestamp ? new Date(clientTimestamp).getTime() : Date.now();
      if (newTimestamp >= existingTimestamp) {
        currentInventory[index2] = { ...data, updatedAt: clientTimestamp || (/* @__PURE__ */ new Date()).toISOString() };
      } else {
        return res.json({
          success: true,
          syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
          operation: "skipped",
          reason: "stale_update",
          itemId: data.id
        });
      }
    } else {
      const limitCheck = await checkPantryItemLimit(session.userId);
      const remaining = typeof limitCheck.remaining === "number" ? limitCheck.remaining : Infinity;
      if (remaining < 1) {
        return res.status(403).json({
          error: ERROR_MESSAGES[ERROR_CODES.PANTRY_LIMIT_REACHED],
          code: ERROR_CODES.PANTRY_LIMIT_REACHED,
          limit: limitCheck.limit,
          remaining: 0
        });
      }
      currentInventory.push({ ...data, updatedAt: clientTimestamp || (/* @__PURE__ */ new Date()).toISOString() });
    }
    const finalLimitCheck = await checkPantryItemLimit(session.userId);
    const maxLimit = typeof finalLimitCheck.limit === "number" ? finalLimitCheck.limit : Infinity;
    if (currentInventory.length > maxLimit) {
      return res.status(403).json({
        error: ERROR_MESSAGES[ERROR_CODES.PANTRY_LIMIT_REACHED],
        code: ERROR_CODES.PANTRY_LIMIT_REACHED,
        limit: finalLimitCheck.limit,
        count: currentInventory.length
      });
    }
    await db.update(userSyncData).set({
      inventory: JSON.stringify(currentInventory),
      lastSyncedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(userSyncData.userId, session.userId));
    res.json({
      success: true,
      syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
      operation: "update",
      itemId: data.id
    });
  } catch (error) {
    console.error("Inventory update sync error:", error);
    res.status(500).json({ error: "Failed to sync inventory update" });
  }
});
router11.delete("/inventory", async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    const { data } = req.body;
    const existingSyncData = await db.select().from(userSyncData).where(eq6(userSyncData.userId, session.userId));
    let currentInventory = [];
    if (existingSyncData.length > 0 && existingSyncData[0].inventory) {
      currentInventory = JSON.parse(existingSyncData[0].inventory);
    }
    currentInventory = currentInventory.filter(
      (item) => item.id !== data.id
    );
    await db.update(userSyncData).set({
      inventory: JSON.stringify(currentInventory),
      lastSyncedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(userSyncData.userId, session.userId));
    res.json({
      success: true,
      syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
      operation: "delete",
      itemId: data.id
    });
  } catch (error) {
    console.error("Inventory delete sync error:", error);
    res.status(500).json({ error: "Failed to sync inventory deletion" });
  }
});
router11.post("/recipes", async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    const { operation, data } = req.body;
    const existingSyncData = await db.select().from(userSyncData).where(eq6(userSyncData.userId, session.userId));
    let currentRecipes = [];
    if (existingSyncData.length > 0 && existingSyncData[0].recipes) {
      currentRecipes = JSON.parse(existingSyncData[0].recipes);
    }
    if (operation === "create") {
      currentRecipes.push(data);
    } else if (operation === "update") {
      const index2 = currentRecipes.findIndex(
        (item) => item.id === data.id
      );
      if (index2 !== -1) {
        currentRecipes[index2] = data;
      } else {
        currentRecipes.push(data);
      }
    } else if (operation === "delete") {
      currentRecipes = currentRecipes.filter(
        (item) => item.id !== data.id
      );
    }
    if (existingSyncData.length === 0) {
      await db.insert(userSyncData).values({
        userId: session.userId,
        recipes: JSON.stringify(currentRecipes)
      });
    } else {
      await db.update(userSyncData).set({
        recipes: JSON.stringify(currentRecipes),
        lastSyncedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq6(userSyncData.userId, session.userId));
    }
    res.json({
      success: true,
      syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
      operation,
      itemId: data.id
    });
  } catch (error) {
    console.error("Recipes sync error:", error);
    res.status(500).json({ error: "Failed to sync recipes" });
  }
});
router11.put("/recipes", async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    const { data, clientTimestamp } = req.body;
    if (!data || !data.id) {
      return res.status(400).json({ error: "Invalid data: missing id" });
    }
    const existingSyncData = await db.select().from(userSyncData).where(eq6(userSyncData.userId, session.userId));
    let currentRecipes = [];
    if (existingSyncData.length > 0 && existingSyncData[0].recipes) {
      currentRecipes = JSON.parse(existingSyncData[0].recipes);
    }
    const index2 = currentRecipes.findIndex(
      (item) => item.id === data.id
    );
    if (index2 !== -1) {
      const existingItem = currentRecipes[index2];
      const existingTimestamp = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
      const newTimestamp = clientTimestamp ? new Date(clientTimestamp).getTime() : Date.now();
      if (newTimestamp >= existingTimestamp) {
        currentRecipes[index2] = { ...data, updatedAt: clientTimestamp || (/* @__PURE__ */ new Date()).toISOString() };
      } else {
        return res.json({
          success: true,
          syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
          operation: "skipped",
          reason: "stale_update",
          itemId: data.id
        });
      }
    } else {
      currentRecipes.push({ ...data, updatedAt: clientTimestamp || (/* @__PURE__ */ new Date()).toISOString() });
    }
    await db.update(userSyncData).set({
      recipes: JSON.stringify(currentRecipes),
      lastSyncedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(userSyncData.userId, session.userId));
    res.json({
      success: true,
      syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
      operation: "update",
      itemId: data.id
    });
  } catch (error) {
    console.error("Recipes update sync error:", error);
    res.status(500).json({ error: "Failed to sync recipe update" });
  }
});
router11.delete("/recipes", async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    const { data } = req.body;
    const existingSyncData = await db.select().from(userSyncData).where(eq6(userSyncData.userId, session.userId));
    let currentRecipes = [];
    if (existingSyncData.length > 0 && existingSyncData[0].recipes) {
      currentRecipes = JSON.parse(existingSyncData[0].recipes);
    }
    currentRecipes = currentRecipes.filter(
      (item) => item.id !== data.id
    );
    await db.update(userSyncData).set({
      recipes: JSON.stringify(currentRecipes),
      lastSyncedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(userSyncData.userId, session.userId));
    res.json({
      success: true,
      syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
      operation: "delete",
      itemId: data.id
    });
  } catch (error) {
    console.error("Recipes delete sync error:", error);
    res.status(500).json({ error: "Failed to sync recipe deletion" });
  }
});
router11.post("/mealPlans", async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    const { operation, data } = req.body;
    const existingSyncData = await db.select().from(userSyncData).where(eq6(userSyncData.userId, session.userId));
    let currentMealPlans = [];
    if (existingSyncData.length > 0 && existingSyncData[0].mealPlans) {
      currentMealPlans = JSON.parse(existingSyncData[0].mealPlans);
    }
    if (operation === "create") {
      currentMealPlans.push(data);
    } else if (operation === "update") {
      const index2 = currentMealPlans.findIndex(
        (item) => item.id === data.id
      );
      if (index2 !== -1) {
        currentMealPlans[index2] = data;
      } else {
        currentMealPlans.push(data);
      }
    } else if (operation === "delete") {
      currentMealPlans = currentMealPlans.filter(
        (item) => item.id !== data.id
      );
    }
    if (existingSyncData.length === 0) {
      await db.insert(userSyncData).values({
        userId: session.userId,
        mealPlans: JSON.stringify(currentMealPlans)
      });
    } else {
      await db.update(userSyncData).set({
        mealPlans: JSON.stringify(currentMealPlans),
        lastSyncedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq6(userSyncData.userId, session.userId));
    }
    res.json({
      success: true,
      syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
      operation,
      itemId: data.id
    });
  } catch (error) {
    console.error("Meal plans sync error:", error);
    res.status(500).json({ error: "Failed to sync meal plans" });
  }
});
router11.put("/mealPlans", async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    const { data, clientTimestamp } = req.body;
    if (!data || !data.id) {
      return res.status(400).json({ error: "Invalid data: missing id" });
    }
    const existingSyncData = await db.select().from(userSyncData).where(eq6(userSyncData.userId, session.userId));
    let currentMealPlans = [];
    if (existingSyncData.length > 0 && existingSyncData[0].mealPlans) {
      currentMealPlans = JSON.parse(existingSyncData[0].mealPlans);
    }
    const index2 = currentMealPlans.findIndex(
      (item) => item.id === data.id
    );
    if (index2 !== -1) {
      const existingItem = currentMealPlans[index2];
      const existingTimestamp = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
      const newTimestamp = clientTimestamp ? new Date(clientTimestamp).getTime() : Date.now();
      if (newTimestamp >= existingTimestamp) {
        currentMealPlans[index2] = { ...data, updatedAt: clientTimestamp || (/* @__PURE__ */ new Date()).toISOString() };
      } else {
        return res.json({
          success: true,
          syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
          operation: "skipped",
          reason: "stale_update",
          itemId: data.id
        });
      }
    } else {
      currentMealPlans.push({ ...data, updatedAt: clientTimestamp || (/* @__PURE__ */ new Date()).toISOString() });
    }
    await db.update(userSyncData).set({
      mealPlans: JSON.stringify(currentMealPlans),
      lastSyncedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(userSyncData.userId, session.userId));
    res.json({
      success: true,
      syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
      operation: "update",
      itemId: data.id
    });
  } catch (error) {
    console.error("Meal plans update sync error:", error);
    res.status(500).json({ error: "Failed to sync meal plan update" });
  }
});
router11.delete("/mealPlans", async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    const { data } = req.body;
    const existingSyncData = await db.select().from(userSyncData).where(eq6(userSyncData.userId, session.userId));
    let currentMealPlans = [];
    if (existingSyncData.length > 0 && existingSyncData[0].mealPlans) {
      currentMealPlans = JSON.parse(existingSyncData[0].mealPlans);
    }
    currentMealPlans = currentMealPlans.filter(
      (item) => item.id !== data.id
    );
    await db.update(userSyncData).set({
      mealPlans: JSON.stringify(currentMealPlans),
      lastSyncedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(userSyncData.userId, session.userId));
    res.json({
      success: true,
      syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
      operation: "delete",
      itemId: data.id
    });
  } catch (error) {
    console.error("Meal plans delete sync error:", error);
    res.status(500).json({ error: "Failed to sync meal plan deletion" });
  }
});
router11.post("/cookware", async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    const { operation, data } = req.body;
    const existingSyncData = await db.select().from(userSyncData).where(eq6(userSyncData.userId, session.userId));
    let currentCookware = [];
    if (existingSyncData.length > 0 && existingSyncData[0].cookware) {
      currentCookware = JSON.parse(existingSyncData[0].cookware);
    }
    const isAddingNewItem = operation === "create" || operation === "update" && currentCookware.findIndex(
      (item) => item.id === data.id
    ) === -1;
    if (isAddingNewItem) {
      const limitCheck = await checkCookwareLimit(session.userId);
      const maxLimit = typeof limitCheck.limit === "number" ? limitCheck.limit : Infinity;
      if (currentCookware.length >= maxLimit) {
        return res.status(403).json({
          error: ERROR_MESSAGES[ERROR_CODES.COOKWARE_LIMIT_REACHED],
          code: ERROR_CODES.COOKWARE_LIMIT_REACHED,
          limit: limitCheck.limit,
          remaining: 0,
          count: currentCookware.length
        });
      }
    }
    if (operation === "create") {
      currentCookware.push(data);
    } else if (operation === "update") {
      const index2 = currentCookware.findIndex(
        (item) => item.id === data.id
      );
      if (index2 !== -1) {
        currentCookware[index2] = data;
      } else {
        currentCookware.push(data);
      }
    } else if (operation === "delete") {
      currentCookware = currentCookware.filter(
        (item) => item.id !== data.id
      );
    }
    if (existingSyncData.length === 0) {
      await db.insert(userSyncData).values({
        userId: session.userId,
        cookware: JSON.stringify(currentCookware)
      });
    } else {
      await db.update(userSyncData).set({
        cookware: JSON.stringify(currentCookware),
        lastSyncedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq6(userSyncData.userId, session.userId));
    }
    res.json({
      success: true,
      syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
      operation,
      itemId: data.id
    });
  } catch (error) {
    console.error("Cookware sync error:", error);
    res.status(500).json({ error: "Failed to sync cookware" });
  }
});
router11.put("/cookware", async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    const { data, clientTimestamp } = req.body;
    if (!data || !data.id) {
      return res.status(400).json({ error: "Invalid data: missing id" });
    }
    const existingSyncData = await db.select().from(userSyncData).where(eq6(userSyncData.userId, session.userId));
    let currentCookware = [];
    if (existingSyncData.length > 0 && existingSyncData[0].cookware) {
      currentCookware = JSON.parse(existingSyncData[0].cookware);
    }
    const index2 = currentCookware.findIndex(
      (item) => item.id === data.id
    );
    if (index2 === -1) {
      const limitCheck = await checkCookwareLimit(session.userId);
      const maxLimit = typeof limitCheck.limit === "number" ? limitCheck.limit : Infinity;
      if (currentCookware.length >= maxLimit) {
        return res.status(403).json({
          error: ERROR_MESSAGES[ERROR_CODES.COOKWARE_LIMIT_REACHED],
          code: ERROR_CODES.COOKWARE_LIMIT_REACHED,
          limit: limitCheck.limit,
          remaining: 0,
          count: currentCookware.length
        });
      }
      currentCookware.push({ ...data, updatedAt: clientTimestamp || (/* @__PURE__ */ new Date()).toISOString() });
    } else {
      const existingItem = currentCookware[index2];
      const existingTimestamp = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
      const newTimestamp = clientTimestamp ? new Date(clientTimestamp).getTime() : Date.now();
      if (newTimestamp >= existingTimestamp) {
        currentCookware[index2] = { ...data, updatedAt: clientTimestamp || (/* @__PURE__ */ new Date()).toISOString() };
      } else {
        return res.json({
          success: true,
          syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
          operation: "skipped",
          reason: "stale_update",
          itemId: data.id
        });
      }
    }
    if (existingSyncData.length === 0) {
      await db.insert(userSyncData).values({
        userId: session.userId,
        cookware: JSON.stringify(currentCookware)
      });
    } else {
      await db.update(userSyncData).set({
        cookware: JSON.stringify(currentCookware),
        lastSyncedAt: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq6(userSyncData.userId, session.userId));
    }
    res.json({
      success: true,
      syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
      operation: "update",
      itemId: data.id
    });
  } catch (error) {
    console.error("Cookware update sync error:", error);
    res.status(500).json({ error: "Failed to sync cookware update" });
  }
});
router11.delete("/cookware", async (req, res) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    const { data } = req.body;
    const existingSyncData = await db.select().from(userSyncData).where(eq6(userSyncData.userId, session.userId));
    let currentCookware = [];
    if (existingSyncData.length > 0 && existingSyncData[0].cookware) {
      currentCookware = JSON.parse(existingSyncData[0].cookware);
    }
    currentCookware = currentCookware.filter(
      (item) => item.id !== data.id
    );
    await db.update(userSyncData).set({
      cookware: JSON.stringify(currentCookware),
      lastSyncedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq6(userSyncData.userId, session.userId));
    res.json({
      success: true,
      syncedAt: (/* @__PURE__ */ new Date()).toISOString(),
      operation: "delete",
      itemId: data.id
    });
  } catch (error) {
    console.error("Cookware delete sync error:", error);
    res.status(500).json({ error: "Failed to sync cookware deletion" });
  }
});
var sync_router_default = router11;

// server/routers/feedback.router.ts
init_db();
init_schema();
import { Router as Router13 } from "express";
import { z as z6 } from "zod";
import { eq as eq7, desc as desc2, isNull } from "drizzle-orm";
import OpenAI7 from "openai";
var router12 = Router13();
var openai6 = new OpenAI7({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
});
var feedbackRequestSchema = z6.object({
  type: z6.enum(["feedback", "bug"]),
  category: z6.string().optional(),
  message: z6.string().min(1, "Message is required"),
  userEmail: z6.string().email().optional().nullable(),
  deviceInfo: z6.string().optional(),
  screenContext: z6.string().optional(),
  stepsToReproduce: z6.string().optional(),
  severity: z6.enum(["minor", "major", "critical"]).optional()
});
var updateFeedbackSchema = z6.object({
  status: z6.enum(["new", "reviewed", "in_progress", "resolved", "closed"]).optional(),
  priority: z6.enum(["low", "medium", "high", "urgent"]).optional(),
  adminNotes: z6.string().optional().nullable(),
  resolutionPrompt: z6.string().optional().nullable(),
  assignedTo: z6.string().optional().nullable(),
  bucketId: z6.number().optional().nullable()
});
async function getAuthenticatedAdmin(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Authentication required", status: 401 };
  }
  const token = authHeader.slice(7);
  const sessions = await db.select().from(userSessions).where(eq7(userSessions.token, token));
  if (sessions.length === 0 || new Date(sessions[0].expiresAt) <= /* @__PURE__ */ new Date()) {
    return { error: "Invalid session", status: 401 };
  }
  const userResult = await db.select().from(users).where(eq7(users.id, sessions[0].userId));
  if (userResult.length === 0) {
    return { error: "User not found", status: 401 };
  }
  if (!userResult[0].isAdmin) {
    return { error: "Admin access required", status: 403 };
  }
  return { user: userResult[0] };
}
async function categorizeFeedback(feedbackItem) {
  const existingBuckets = await db.select().from(feedbackBuckets).where(eq7(feedbackBuckets.status, "open"));
  if (existingBuckets.length === 0) {
    const newBucket = await createNewBucket(feedbackItem);
    return { bucketId: newBucket.id, isNewBucket: true };
  }
  const bucketsContext = existingBuckets.map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    type: b.bucketType
  }));
  try {
    const response = await openai6.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a feedback categorization assistant. Your task is to determine if a new feedback item belongs to an existing bucket or needs a new bucket.

Analyze the feedback and compare it to existing buckets. Return a JSON response with:
- "existingBucketId": the ID of an existing bucket if the feedback is similar (null if none match)
- "needsNewBucket": true if the feedback needs a new bucket, false otherwise
- "suggestedTitle": if needsNewBucket is true, provide a concise title for the new bucket
- "suggestedDescription": if needsNewBucket is true, provide a brief description

Be liberal in grouping similar feedback together. Group by the core issue or feature request, not by exact wording.`
        },
        {
          role: "user",
          content: `Existing buckets:
${JSON.stringify(bucketsContext, null, 2)}

New feedback to categorize:
Type: ${feedbackItem.type}
Category: ${feedbackItem.category || "Not specified"}
Message: ${feedbackItem.message}
Screen: ${feedbackItem.screenContext || "Not specified"}
${feedbackItem.stepsToReproduce ? `Steps to reproduce: ${feedbackItem.stepsToReproduce}` : ""}
${feedbackItem.severity ? `Severity: ${feedbackItem.severity}` : ""}`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 500
    });
    const result = JSON.parse(response.choices[0]?.message?.content || "{}");
    if (result.existingBucketId && !result.needsNewBucket) {
      return { bucketId: result.existingBucketId, isNewBucket: false };
    }
    const newBucket = await db.insert(feedbackBuckets).values({
      title: result.suggestedTitle || `${feedbackItem.type === "bug" ? "Bug" : "Feature"}: ${feedbackItem.message.substring(0, 50)}`,
      description: result.suggestedDescription || feedbackItem.message.substring(0, 200),
      bucketType: feedbackItem.type === "bug" ? "bug" : "feature",
      status: "open",
      priority: feedbackItem.priority || "medium"
    }).returning();
    return { bucketId: newBucket[0].id, isNewBucket: true };
  } catch (error) {
    console.error("AI categorization failed, creating new bucket:", error);
    const newBucket = await createNewBucket(feedbackItem);
    return { bucketId: newBucket.id, isNewBucket: true };
  }
}
async function createNewBucket(feedbackItem) {
  const bucketResult = await db.insert(feedbackBuckets).values({
    title: `${feedbackItem.type === "bug" ? "Bug" : "Feature"}: ${feedbackItem.message.substring(0, 80)}`,
    description: feedbackItem.message.substring(0, 300),
    bucketType: feedbackItem.type === "bug" ? "bug" : "feature",
    status: "open",
    priority: feedbackItem.priority || "medium"
  }).returning();
  return bucketResult[0];
}
router12.post("/", async (req, res) => {
  try {
    const validatedData = feedbackRequestSchema.parse(req.body);
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const sessions = await db.select().from(userSessions).where(eq7(userSessions.token, token));
      if (sessions.length > 0 && new Date(sessions[0].expiresAt) > /* @__PURE__ */ new Date()) {
        userId = sessions[0].userId;
      }
    }
    const feedbackEntry = await db.insert(feedback).values({
      userId,
      type: validatedData.type,
      category: validatedData.category || null,
      message: validatedData.message,
      userEmail: validatedData.userEmail || null,
      deviceInfo: validatedData.deviceInfo || null,
      screenContext: validatedData.screenContext || null,
      stepsToReproduce: validatedData.stepsToReproduce || null,
      severity: validatedData.severity || null,
      status: "new",
      priority: "medium"
    }).returning();
    const createdFeedback = feedbackEntry[0];
    categorizeFeedback(createdFeedback).then(async ({ bucketId }) => {
      if (bucketId) {
        await db.update(feedback).set({ bucketId, updatedAt: /* @__PURE__ */ new Date() }).where(eq7(feedback.id, createdFeedback.id));
      }
    }).catch((err) => {
      console.error("Background categorization failed:", err);
    });
    console.log(`[Feedback] New ${validatedData.type} submitted:`, createdFeedback.id);
    res.json({
      success: true,
      message: validatedData.type === "bug" ? "Thank you for reporting this issue. We'll look into it!" : "Thank you for your feedback!",
      id: createdFeedback.id
    });
  } catch (error) {
    console.error("Feedback submission error:", error);
    if (error instanceof z6.ZodError) {
      return res.status(400).json({ error: "Invalid feedback data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});
router12.get("/", async (req, res) => {
  try {
    const authResult = await getAuthenticatedAdmin(req.headers.authorization);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }
    const { status, type, priority } = req.query;
    const allFeedback = await db.select().from(feedback).orderBy(desc2(feedback.createdAt)).limit(200);
    let filtered = allFeedback;
    if (status && status !== "all") {
      filtered = filtered.filter((f) => f.status === status);
    }
    if (type && type !== "all") {
      filtered = filtered.filter((f) => f.type === type);
    }
    if (priority && priority !== "all") {
      filtered = filtered.filter((f) => f.priority === priority);
    }
    res.json({ feedback: filtered });
  } catch (error) {
    console.error("Feedback fetch error:", error);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});
router12.get("/stats", async (req, res) => {
  try {
    const authResult = await getAuthenticatedAdmin(req.headers.authorization);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }
    const allFeedback = await db.select().from(feedback);
    const allBuckets = await db.select().from(feedbackBuckets);
    const stats = {
      total: allFeedback.length,
      uncategorized: allFeedback.filter((f) => !f.bucketId).length,
      byStatus: {
        new: allFeedback.filter((f) => f.status === "new").length,
        reviewed: allFeedback.filter((f) => f.status === "reviewed").length,
        in_progress: allFeedback.filter((f) => f.status === "in_progress").length,
        resolved: allFeedback.filter((f) => f.status === "resolved").length,
        closed: allFeedback.filter((f) => f.status === "closed").length
      },
      byType: {
        feedback: allFeedback.filter((f) => f.type === "feedback").length,
        bug: allFeedback.filter((f) => f.type === "bug").length
      },
      buckets: {
        total: allBuckets.length,
        open: allBuckets.filter((b) => b.status === "open").length,
        in_progress: allBuckets.filter((b) => b.status === "in_progress").length,
        completed: allBuckets.filter((b) => b.status === "completed").length
      }
    };
    res.json(stats);
  } catch (error) {
    console.error("Feedback stats error:", error);
    res.status(500).json({ error: "Failed to fetch feedback stats" });
  }
});
router12.get("/buckets", async (req, res) => {
  try {
    const authResult = await getAuthenticatedAdmin(req.headers.authorization);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }
    const { status } = req.query;
    let buckets = await db.select().from(feedbackBuckets).orderBy(desc2(feedbackBuckets.createdAt));
    if (status && status !== "all") {
      buckets = buckets.filter((b) => b.status === status);
    }
    const bucketsWithItems = await Promise.all(
      buckets.map(async (bucket) => {
        const items = await db.select().from(feedback).where(eq7(feedback.bucketId, bucket.id)).orderBy(desc2(feedback.createdAt));
        return { ...bucket, items };
      })
    );
    res.json({ buckets: bucketsWithItems });
  } catch (error) {
    console.error("Buckets fetch error:", error);
    res.status(500).json({ error: "Failed to fetch buckets" });
  }
});
router12.post("/buckets/:id/generate-prompt", async (req, res) => {
  try {
    const authResult = await getAuthenticatedAdmin(req.headers.authorization);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid bucket ID" });
    }
    const bucketResult = await db.select().from(feedbackBuckets).where(eq7(feedbackBuckets.id, id));
    if (bucketResult.length === 0) {
      return res.status(404).json({ error: "Bucket not found" });
    }
    const bucket = bucketResult[0];
    const items = await db.select().from(feedback).where(eq7(feedback.bucketId, id));
    if (items.length === 0) {
      return res.status(400).json({ error: "Bucket has no feedback items" });
    }
    const feedbackSummary = items.map(
      (item, idx) => `### Feedback ${idx + 1} (ID: ${item.id})
- **Type:** ${item.type}
- **Category:** ${item.category || "Not specified"}
- **Screen/Context:** ${item.screenContext || "Not specified"}
- **Message:** ${item.message}
${item.stepsToReproduce ? `- **Steps to Reproduce:** ${item.stepsToReproduce}` : ""}
${item.severity ? `- **Severity:** ${item.severity}` : ""}
${item.deviceInfo ? `- **Device Info:** ${item.deviceInfo}` : ""}`
    ).join("\n\n");
    try {
      const response = await openai6.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a technical product manager creating a detailed implementation prompt for a developer. 

Your task is to synthesize multiple feedback items into a single, comprehensive prompt that can be given to an AI coding assistant (like Replit Agent) to implement the fix or feature.

The prompt should:
1. Start with a clear, actionable title
2. Summarize the core issue or feature request
3. List specific requirements derived from all feedback items
4. Suggest implementation approach if applicable
5. Include any relevant technical context from the feedback
6. Specify testing criteria to verify the implementation

Be specific and technical. The prompt should be self-contained and provide all context needed for implementation.`
          },
          {
            role: "user",
            content: `Bucket: ${bucket.title}
Type: ${bucket.bucketType}
Description: ${bucket.description || "No description"}

Feedback items in this bucket:

${feedbackSummary}

Generate a comprehensive implementation prompt for addressing all these feedback items.`
          }
        ],
        max_completion_tokens: 2e3
      });
      const generatedPrompt = response.choices[0]?.message?.content || "";
      await db.update(feedbackBuckets).set({ generatedPrompt, updatedAt: /* @__PURE__ */ new Date() }).where(eq7(feedbackBuckets.id, id));
      res.json({ prompt: generatedPrompt, bucketId: id });
    } catch (aiError) {
      console.error("AI prompt generation failed:", aiError);
      let fallbackPrompt = `## ${bucket.bucketType === "bug" ? "Bug Fix" : "Feature Implementation"}: ${bucket.title}

### Summary
${bucket.description || "Implementation needed based on user feedback."}

### User Feedback Items (${items.length} total)

${feedbackSummary}

### Requirements
${items.map((item, idx) => `${idx + 1}. Address: ${item.message.substring(0, 100)}...`).join("\n")}

### Testing
- Verify all reported issues are resolved
- Test on affected screens/contexts
- Ensure no regression in related functionality`;
      await db.update(feedbackBuckets).set({ generatedPrompt: fallbackPrompt, updatedAt: /* @__PURE__ */ new Date() }).where(eq7(feedbackBuckets.id, id));
      res.json({ prompt: fallbackPrompt, bucketId: id });
    }
  } catch (error) {
    console.error("Prompt generation error:", error);
    res.status(500).json({ error: "Failed to generate prompt" });
  }
});
router12.post("/buckets/:id/complete", async (req, res) => {
  try {
    const authResult = await getAuthenticatedAdmin(req.headers.authorization);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid bucket ID" });
    }
    const now = /* @__PURE__ */ new Date();
    await db.update(feedbackBuckets).set({
      status: "completed",
      completedAt: now,
      updatedAt: now
    }).where(eq7(feedbackBuckets.id, id));
    await db.update(feedback).set({
      status: "resolved",
      resolvedAt: now,
      updatedAt: now
    }).where(eq7(feedback.bucketId, id));
    console.log(`[Feedback] Bucket ${id} marked as completed`);
    res.json({ success: true, message: "Bucket and all feedback items marked as completed" });
  } catch (error) {
    console.error("Bucket completion error:", error);
    res.status(500).json({ error: "Failed to complete bucket" });
  }
});
router12.post("/categorize-uncategorized", async (req, res) => {
  try {
    const authResult = await getAuthenticatedAdmin(req.headers.authorization);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }
    const uncategorized = await db.select().from(feedback).where(isNull(feedback.bucketId));
    let categorized = 0;
    for (const item of uncategorized) {
      try {
        const { bucketId } = await categorizeFeedback(item);
        if (bucketId) {
          await db.update(feedback).set({ bucketId, updatedAt: /* @__PURE__ */ new Date() }).where(eq7(feedback.id, item.id));
          categorized++;
        }
      } catch (err) {
        console.error(`Failed to categorize feedback ${item.id}:`, err);
      }
    }
    res.json({
      success: true,
      message: `Categorized ${categorized} of ${uncategorized.length} uncategorized items`
    });
  } catch (error) {
    console.error("Categorization error:", error);
    res.status(500).json({ error: "Failed to categorize feedback" });
  }
});
router12.get("/:id", async (req, res) => {
  try {
    const authResult = await getAuthenticatedAdmin(req.headers.authorization);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid feedback ID" });
    }
    const result = await db.select().from(feedback).where(eq7(feedback.id, id));
    if (result.length === 0) {
      return res.status(404).json({ error: "Feedback not found" });
    }
    res.json(result[0]);
  } catch (error) {
    console.error("Feedback fetch error:", error);
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});
router12.patch("/:id", async (req, res) => {
  try {
    const authResult = await getAuthenticatedAdmin(req.headers.authorization);
    if ("error" in authResult) {
      return res.status(authResult.status).json({ error: authResult.error });
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid feedback ID" });
    }
    const validatedData = updateFeedbackSchema.parse(req.body);
    const updateValues = {
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (validatedData.status !== void 0) {
      updateValues.status = validatedData.status;
      if (validatedData.status === "resolved") {
        updateValues.resolvedAt = /* @__PURE__ */ new Date();
      }
    }
    if (validatedData.priority !== void 0) {
      updateValues.priority = validatedData.priority;
    }
    if (validatedData.adminNotes !== void 0) {
      updateValues.adminNotes = validatedData.adminNotes;
    }
    if (validatedData.resolutionPrompt !== void 0) {
      updateValues.resolutionPrompt = validatedData.resolutionPrompt;
    }
    if (validatedData.assignedTo !== void 0) {
      updateValues.assignedTo = validatedData.assignedTo;
    }
    if (validatedData.bucketId !== void 0) {
      updateValues.bucketId = validatedData.bucketId;
    }
    const result = await db.update(feedback).set(updateValues).where(eq7(feedback.id, id)).returning();
    if (result.length === 0) {
      return res.status(404).json({ error: "Feedback not found" });
    }
    console.log(`[Feedback] Updated feedback ${id}:`, Object.keys(updateValues));
    res.json(result[0]);
  } catch (error) {
    console.error("Feedback update error:", error);
    if (error instanceof z6.ZodError) {
      return res.status(400).json({ error: "Invalid update data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update feedback" });
  }
});
var feedback_router_default = router12;

// server/stripe/subscriptionRouter.ts
init_db();
init_schema();
import { Router as Router14 } from "express";
import { eq as eq8 } from "drizzle-orm";

// server/stripe/stripeClient.ts
import Stripe from "stripe";
var connectionSettings;
async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY ? "repl " + process.env.REPL_IDENTITY : process.env.WEB_REPL_RENEWAL ? "depl " + process.env.WEB_REPL_RENEWAL : null;
  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }
  const connectorName = "stripe";
  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const targetEnvironment = isProduction ? "production" : "development";
  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", connectorName);
  url.searchParams.set("environment", targetEnvironment);
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      X_REPLIT_TOKEN: xReplitToken
    }
  });
  const data = await response.json();
  connectionSettings = data.items?.[0];
  if (!connectionSettings || !connectionSettings.settings.publishable || !connectionSettings.settings.secret) {
    throw new Error(`Stripe ${targetEnvironment} connection not found`);
  }
  return {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret
  };
}
async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, {
    apiVersion: "2025-11-17.clover"
  });
}
async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}
async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}
var stripeSync = null;
async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import("stripe-replit-sync");
    const secretKey = await getStripeSecretKey();
    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL,
        max: 2
      },
      stripeSecretKey: secretKey
    });
  }
  return stripeSync;
}

// server/stripe/subscriptionRouter.ts
var router13 = Router14();
var pricesCache = {
  data: null,
  timestamp: 0
};
var PRICES_CACHE_TTL_MS = 60 * 60 * 1e3;
async function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  const [session] = await db.select().from(userSessions).where(eq8(userSessions.token, token)).limit(1);
  if (!session || new Date(session.expiresAt) < /* @__PURE__ */ new Date()) {
    return null;
  }
  const [user] = await db.select().from(users).where(eq8(users.id, session.userId)).limit(1);
  return user ? { id: user.id, email: user.email } : null;
}
router13.get("/prices", async (_req, res) => {
  try {
    if (pricesCache.data && Date.now() - pricesCache.timestamp < PRICES_CACHE_TTL_MS) {
      return res.json(pricesCache.data);
    }
    const stripe = await getUncachableStripeClient();
    const prices = await stripe.prices.list({
      active: true,
      type: "recurring",
      expand: ["data.product"]
    });
    console.log(`[Stripe Prices] Found ${prices.data.length} active recurring prices`);
    for (const p of prices.data) {
      console.log(`[Stripe Price] id=${p.id}, interval=${p.recurring?.interval}, interval_count=${p.recurring?.interval_count}, amount=${p.unit_amount}`);
    }
    let monthlyPrice = null;
    let annualPrice = null;
    for (const price of prices.data) {
      const product = price.product;
      const productName = typeof product === "object" && product?.name ? product.name : "Subscription";
      const priceInfo = {
        id: price.id,
        amount: price.unit_amount || 0,
        currency: price.currency,
        interval: price.recurring?.interval || "month",
        intervalCount: price.recurring?.interval_count || 1,
        trialDays: price.recurring?.trial_period_days || 7,
        productName
      };
      if (price.recurring?.interval === "month" && price.recurring.interval_count === 1) {
        if (!monthlyPrice || priceInfo.amount > 0) {
          monthlyPrice = priceInfo;
        }
      } else if (price.recurring?.interval === "year" && price.recurring.interval_count === 1) {
        if (!annualPrice || priceInfo.amount > 0) {
          annualPrice = priceInfo;
        }
      }
    }
    const result = { monthly: monthlyPrice, annual: annualPrice };
    if (monthlyPrice || annualPrice) {
      pricesCache.data = result;
      pricesCache.timestamp = Date.now();
    }
    res.json(result);
  } catch (error) {
    console.error("Error fetching subscription prices:", error);
    res.status(500).json({ error: "Failed to fetch subscription prices" });
  }
});
router13.post("/create-checkout-session", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const { priceId, successUrl, cancelUrl } = req.body;
    if (!priceId) {
      return res.status(400).json({ error: "priceId is required" });
    }
    const stripe = await getUncachableStripeClient();
    const [existingSubscription] = await db.select().from(subscriptions).where(eq8(subscriptions.userId, user.id)).limit(1);
    let stripeCustomerId = existingSubscription?.stripeCustomerId;
    if (!stripeCustomerId) {
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });
      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id
          }
        });
        stripeCustomerId = customer.id;
      }
    }
    const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0] ? `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}` : "http://localhost:5000";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      subscription_data: {
        trial_period_days: 7,
        metadata: {
          userId: user.id
        }
      },
      allow_promotion_codes: true,
      success_url: successUrl || `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/subscription/cancel`,
      metadata: {
        userId: user.id,
        type: "subscription"
      }
    });
    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});
router13.post("/create-portal-session", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const [existingSubscription] = await db.select().from(subscriptions).where(eq8(subscriptions.userId, user.id)).limit(1);
    if (!existingSubscription?.stripeCustomerId) {
      return res.status(400).json({ error: "No subscription found for this user" });
    }
    const stripe = await getUncachableStripeClient();
    const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0] ? `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}` : "http://localhost:5000";
    const session = await stripe.billingPortal.sessions.create({
      customer: existingSubscription.stripeCustomerId,
      return_url: req.body.returnUrl || `${baseUrl}/settings`
    });
    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating portal session:", error);
    res.status(500).json({ error: "Failed to create billing portal session" });
  }
});
router13.get("/status", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const [subscription] = await db.select().from(subscriptions).where(eq8(subscriptions.userId, user.id)).limit(1);
    if (!subscription) {
      return res.json({
        status: "none",
        planType: null,
        currentPeriodEnd: null,
        trialEnd: null,
        cancelAtPeriodEnd: false
      });
    }
    res.json({
      status: subscription.status,
      planType: subscription.planType,
      currentPeriodStart: subscription.currentPeriodStart?.toISOString() || null,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
      trialStart: subscription.trialStart?.toISOString() || null,
      trialEnd: subscription.trialEnd?.toISOString() || null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt?.toISOString() || null
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    res.status(500).json({ error: "Failed to fetch subscription status" });
  }
});
router13.get("/publishable-key", async (_req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (error) {
    console.error("Error fetching publishable key:", error);
    res.status(500).json({ error: "Failed to get Stripe publishable key" });
  }
});
router13.get("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"]
    });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    const subscription = session.subscription;
    res.json({
      customerEmail: session.customer_email || session.customer_details?.email || null,
      subscriptionId: typeof session.subscription === "string" ? session.subscription : subscription?.id || null,
      planType: subscription?.items?.data?.[0]?.price?.recurring?.interval === "year" ? "annual" : "monthly",
      trialEnd: subscription?.trial_end ? new Date(subscription.trial_end * 1e3).toISOString() : null,
      amount: session.amount_total,
      currency: session.currency
    });
  } catch (error) {
    console.error("Error fetching session details:", error);
    res.status(500).json({ error: "Failed to fetch session details" });
  }
});
router13.get("/me", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const entitlements = await getUserEntitlements(user.id);
    const [subscription] = await db.select().from(subscriptions).where(eq8(subscriptions.userId, user.id)).limit(1);
    res.json({
      tier: entitlements.tier,
      status: entitlements.status,
      planType: subscription?.planType || null,
      entitlements: entitlements.limits,
      usage: entitlements.usage,
      remaining: entitlements.remaining,
      trialEndsAt: entitlements.trialEndsAt?.toISOString() || null,
      currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd || false
    });
  } catch (error) {
    console.error("Error fetching subscription entitlements:", error);
    res.status(500).json({ error: "Failed to fetch subscription info" });
  }
});
router13.get("/check-limit/:limitType", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const { limitType } = req.params;
    let result;
    switch (limitType) {
      case "pantryItems":
        result = await checkPantryItemLimit(user.id);
        break;
      case "aiRecipes":
        result = await checkAiRecipeLimit(user.id);
        break;
      case "cookware":
        result = await checkCookwareLimit(user.id);
        break;
      default:
        return res.status(400).json({ error: "Invalid limit type. Use: pantryItems, aiRecipes, or cookware" });
    }
    res.json(result);
  } catch (error) {
    console.error("Error checking limit:", error);
    res.status(500).json({ error: "Failed to check limit" });
  }
});
router13.get("/check-feature/:feature", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const { feature } = req.params;
    const validFeatures = [
      "recipeScanning",
      "bulkScanning",
      "aiKitchenAssistant",
      "weeklyMealPrepping",
      "customStorageAreas"
    ];
    if (!validFeatures.includes(feature)) {
      return res.status(400).json({
        error: `Invalid feature. Use: ${validFeatures.join(", ")}`
      });
    }
    const allowed = await checkFeatureAccess(
      user.id,
      feature
    );
    res.json({
      allowed,
      upgradeRequired: !allowed
    });
  } catch (error) {
    console.error("Error checking feature access:", error);
    res.status(500).json({ error: "Failed to check feature access" });
  }
});
router13.post("/upgrade", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const { billingPeriod = "monthly", successUrl, cancelUrl } = req.body;
    const stripe = await getUncachableStripeClient();
    const [existingSubscription] = await db.select().from(subscriptions).where(eq8(subscriptions.userId, user.id)).limit(1);
    let stripeCustomerId = existingSubscription?.stripeCustomerId;
    if (!stripeCustomerId) {
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });
      if (existingCustomers.data.length > 0) {
        stripeCustomerId = existingCustomers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id
          }
        });
        stripeCustomerId = customer.id;
      }
    }
    const prices = await stripe.prices.list({
      active: true,
      type: "recurring",
      expand: ["data.product"]
    });
    let priceId = null;
    for (const price of prices.data) {
      const product = price.product;
      const productName = typeof product === "object" && product?.name || "";
      if (productName.toLowerCase().includes("pro")) {
        if (billingPeriod === "annual" && price.recurring?.interval === "year") {
          priceId = price.id;
          break;
        } else if (billingPeriod === "monthly" && price.recurring?.interval === "month") {
          priceId = price.id;
          break;
        }
      }
    }
    if (!priceId) {
      for (const price of prices.data) {
        if (billingPeriod === "annual" && price.recurring?.interval === "year") {
          priceId = price.id;
          break;
        } else if (billingPeriod === "monthly" && price.recurring?.interval === "month") {
          priceId = price.id;
          break;
        }
      }
    }
    if (!priceId) {
      return res.status(400).json({ error: "No suitable price found for Pro upgrade" });
    }
    const baseUrl = process.env.REPLIT_DOMAINS?.split(",")[0] ? `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}` : "http://localhost:5000";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      subscription_data: {
        metadata: {
          userId: user.id,
          tier: "PRO" /* PRO */
        }
      },
      allow_promotion_codes: true,
      success_url: successUrl || `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${baseUrl}/subscription/cancel`,
      metadata: {
        userId: user.id,
        type: "upgrade",
        tier: "PRO" /* PRO */
      }
    });
    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error("Error creating upgrade checkout session:", error);
    res.status(500).json({ error: "Failed to create upgrade session" });
  }
});
var subscriptionRouter_default = router13;

// server/routers/admin/subscriptions.router.ts
init_db();
init_schema();
import { Router as Router15 } from "express";
import { eq as eq10, sql as sql2, and as and3, count } from "drizzle-orm";

// server/middleware/requireAdmin.ts
init_db();
init_schema();
import { eq as eq9 } from "drizzle-orm";
async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const token = authHeader.slice(7);
    const [session] = await db.select().from(userSessions).where(eq9(userSessions.token, token)).limit(1);
    if (!session || new Date(session.expiresAt) < /* @__PURE__ */ new Date()) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    const [user] = await db.select().from(users).where(eq9(users.id, session.userId)).limit(1);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    if (!user.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    req.userId = user.id;
    req.user = user;
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).json({ error: "Failed to verify admin access" });
  }
}

// server/routers/admin/subscriptions.router.ts
var router14 = Router15();
router14.use(requireAdmin);
router14.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    let query = db.select({
      id: subscriptions.id,
      userId: subscriptions.userId,
      stripeCustomerId: subscriptions.stripeCustomerId,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      stripePriceId: subscriptions.stripePriceId,
      status: subscriptions.status,
      planType: subscriptions.planType,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      trialStart: subscriptions.trialStart,
      trialEnd: subscriptions.trialEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      canceledAt: subscriptions.canceledAt,
      createdAt: subscriptions.createdAt,
      updatedAt: subscriptions.updatedAt,
      userEmail: users.email,
      userDisplayName: users.displayName,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userCreatedAt: users.createdAt
    }).from(subscriptions).leftJoin(users, eq10(subscriptions.userId, users.id));
    if (status && typeof status === "string" && status !== "all") {
      query = query.where(eq10(subscriptions.status, status));
    }
    const results = await query.orderBy(sql2`${subscriptions.createdAt} DESC`);
    const subscriptionsWithUsers = results.map((row) => ({
      id: row.id,
      userId: row.userId,
      stripeCustomerId: row.stripeCustomerId,
      stripeSubscriptionId: row.stripeSubscriptionId,
      stripePriceId: row.stripePriceId,
      status: row.status,
      planType: row.planType,
      currentPeriodStart: row.currentPeriodStart,
      currentPeriodEnd: row.currentPeriodEnd,
      trialStart: row.trialStart,
      trialEnd: row.trialEnd,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      canceledAt: row.canceledAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      user: {
        id: row.userId,
        email: row.userEmail || "",
        displayName: row.userDisplayName,
        firstName: row.userFirstName,
        lastName: row.userLastName,
        createdAt: row.userCreatedAt
      }
    }));
    res.json(subscriptionsWithUsers);
  } catch (error) {
    console.error("Error fetching admin subscriptions:", error);
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});
router14.get("/stats", async (_req, res) => {
  try {
    const [totalActiveResult] = await db.select({ count: count() }).from(subscriptions).where(eq10(subscriptions.status, "active"));
    const [totalTrialingResult] = await db.select({ count: count() }).from(subscriptions).where(eq10(subscriptions.status, "trialing"));
    const [totalPastDueResult] = await db.select({ count: count() }).from(subscriptions).where(eq10(subscriptions.status, "past_due"));
    const [totalCanceledResult] = await db.select({ count: count() }).from(subscriptions).where(eq10(subscriptions.status, "canceled"));
    const [totalSubscriptionsResult] = await db.select({ count: count() }).from(subscriptions);
    const monthlyActiveResults = await db.select({ count: count() }).from(subscriptions).where(
      and3(
        eq10(subscriptions.status, "active"),
        eq10(subscriptions.planType, "monthly")
      )
    );
    const annualActiveResults = await db.select({ count: count() }).from(subscriptions).where(
      and3(
        eq10(subscriptions.status, "active"),
        eq10(subscriptions.planType, "annual")
      )
    );
    const [convertedFromTrialResult] = await db.select({ count: count() }).from(subscriptions).where(
      and3(
        eq10(subscriptions.status, "active"),
        sql2`${subscriptions.trialStart} IS NOT NULL`
      )
    );
    const [totalTrialsStartedResult] = await db.select({ count: count() }).from(subscriptions).where(sql2`${subscriptions.trialStart} IS NOT NULL`);
    const totalActive = totalActiveResult?.count || 0;
    const totalTrialing = totalTrialingResult?.count || 0;
    const totalPastDue = totalPastDueResult?.count || 0;
    const totalCanceled = totalCanceledResult?.count || 0;
    const totalSubscriptions = totalSubscriptionsResult?.count || 0;
    const monthlyActive = monthlyActiveResults[0]?.count || 0;
    const annualActive = annualActiveResults[0]?.count || 0;
    const convertedFromTrial = convertedFromTrialResult?.count || 0;
    const totalTrialsStarted = totalTrialsStartedResult?.count || 0;
    const MONTHLY_PRICE = 499;
    const ANNUAL_PRICE = 4990;
    const monthlyMRR = Number(monthlyActive) * MONTHLY_PRICE;
    const annualMRR = Math.round(Number(annualActive) * ANNUAL_PRICE / 12);
    const totalMRR = monthlyMRR + annualMRR;
    const trialConversionRate = totalTrialsStarted > 0 ? Math.round(Number(convertedFromTrial) / Number(totalTrialsStarted) * 100) : 0;
    res.json({
      totalActive: Number(totalActive),
      totalTrialing: Number(totalTrialing),
      totalPastDue: Number(totalPastDue),
      totalCanceled: Number(totalCanceled),
      totalSubscriptions: Number(totalSubscriptions),
      monthlyActive: Number(monthlyActive),
      annualActive: Number(annualActive),
      mrr: totalMRR,
      trialConversionRate
    });
  } catch (error) {
    console.error("Error fetching subscription stats:", error);
    res.status(500).json({ error: "Failed to fetch subscription stats" });
  }
});
router14.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.select({
      id: subscriptions.id,
      userId: subscriptions.userId,
      stripeCustomerId: subscriptions.stripeCustomerId,
      stripeSubscriptionId: subscriptions.stripeSubscriptionId,
      stripePriceId: subscriptions.stripePriceId,
      status: subscriptions.status,
      planType: subscriptions.planType,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      trialStart: subscriptions.trialStart,
      trialEnd: subscriptions.trialEnd,
      cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
      canceledAt: subscriptions.canceledAt,
      createdAt: subscriptions.createdAt,
      updatedAt: subscriptions.updatedAt,
      userEmail: users.email,
      userDisplayName: users.displayName,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userCreatedAt: users.createdAt
    }).from(subscriptions).leftJoin(users, eq10(subscriptions.userId, users.id)).where(eq10(subscriptions.id, id)).limit(1);
    if (!result) {
      return res.status(404).json({ error: "Subscription not found" });
    }
    const subscription = {
      id: result.id,
      userId: result.userId,
      stripeCustomerId: result.stripeCustomerId,
      stripeSubscriptionId: result.stripeSubscriptionId,
      stripePriceId: result.stripePriceId,
      status: result.status,
      planType: result.planType,
      currentPeriodStart: result.currentPeriodStart,
      currentPeriodEnd: result.currentPeriodEnd,
      trialStart: result.trialStart,
      trialEnd: result.trialEnd,
      cancelAtPeriodEnd: result.cancelAtPeriodEnd,
      canceledAt: result.canceledAt,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      user: {
        id: result.userId,
        email: result.userEmail || "",
        displayName: result.userDisplayName,
        firstName: result.userFirstName,
        lastName: result.userLastName,
        createdAt: result.userCreatedAt
      }
    };
    res.json(subscription);
  } catch (error) {
    console.error("Error fetching subscription details:", error);
    res.status(500).json({ error: "Failed to fetch subscription details" });
  }
});
var subscriptions_router_default = router14;

// server/routes.ts
init_db();
init_schema();

// server/middleware/requireSubscription.ts
init_db();
init_schema();
import { eq as eq11 } from "drizzle-orm";
var ACTIVE_STATUSES = ["active", "trialing"];
async function requireSubscription(req, res, next) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const [subscription] = await db.select().from(subscriptions).where(eq11(subscriptions.userId, userId)).limit(1);
    if (!subscription) {
      return res.status(403).json({
        error: "subscription_required",
        message: "Active subscription required"
      });
    }
    if (!ACTIVE_STATUSES.includes(subscription.status)) {
      return res.status(403).json({
        error: "subscription_required",
        message: "Active subscription required"
      });
    }
    next();
  } catch (error) {
    console.error("Subscription middleware error:", error);
    return res.status(500).json({ error: "Failed to verify subscription" });
  }
}

// server/routes.ts
import { inArray as inArray2 } from "drizzle-orm";
var openai8 = new OpenAI9({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});
var shelfLifeRequestSchema = z7.object({
  foodName: z7.string().min(1, "Food name is required"),
  category: z7.string().optional(),
  storageLocation: z7.string().optional()
});
var aiSuggestionCache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS6 = 24 * 60 * 60 * 1e3;
function getCacheKey2(foodName, storageLocation) {
  return `${foodName.toLowerCase().trim()}:${(storageLocation || "refrigerator").toLowerCase().trim()}`;
}
function getFromCache3(key) {
  const entry = aiSuggestionCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS6) {
    aiSuggestionCache.delete(key);
    return null;
  }
  return entry.response;
}
function setInCache3(key, response) {
  aiSuggestionCache.set(key, {
    response,
    timestamp: Date.now()
  });
}
async function getAIShelfLifeSuggestion(foodName, category, storageLocation) {
  const cacheKey = getCacheKey2(foodName, storageLocation);
  const cached = getFromCache3(cacheKey);
  if (cached) {
    console.log(`Shelf life cache hit for: ${foodName}`);
    return cached;
  }
  const prompt = `As a food safety expert, estimate how long this food item will stay fresh:

Food: ${foodName}
${category ? `Category: ${category}` : ""}
Storage: ${storageLocation || "refrigerator"}

Consider:
- USDA food safety guidelines
- Common storage practices
- Signs of spoilage for this food type

Return JSON: {
  "days": number,
  "notes": "brief storage tip",
  "signs_of_spoilage": "what to look for"
}`;
  try {
    const completion = await openai8.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a food safety expert. Provide accurate, conservative shelf life estimates based on USDA guidelines. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 256
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }
    const parsed = JSON.parse(content);
    const response = {
      suggestedDays: Math.max(1, Math.min(365, parsed.days || 7)),
      confidence: "medium",
      source: "ai",
      notes: parsed.notes || void 0,
      signsOfSpoilage: parsed.signs_of_spoilage || void 0
    };
    setInCache3(cacheKey, response);
    console.log(`Shelf life AI response cached for: ${foodName}`);
    return response;
  } catch (error) {
    console.error("AI shelf life estimation error:", error);
    throw error;
  }
}
function mapFoodCategory(usdaCategory) {
  const categoryLower = usdaCategory.toLowerCase();
  if (categoryLower.includes("fruit") || categoryLower.includes("vegetable") || categoryLower.includes("produce") || categoryLower.includes("salad")) {
    return "Produce";
  }
  if (categoryLower.includes("dairy") || categoryLower.includes("milk") || categoryLower.includes("cheese") || categoryLower.includes("yogurt") || categoryLower.includes("cream") || categoryLower.includes("butter")) {
    return "Dairy";
  }
  if (categoryLower.includes("meat") || categoryLower.includes("beef") || categoryLower.includes("pork") || categoryLower.includes("chicken") || categoryLower.includes("turkey") || categoryLower.includes("lamb") || categoryLower.includes("poultry")) {
    return "Meat";
  }
  if (categoryLower.includes("fish") || categoryLower.includes("seafood") || categoryLower.includes("shellfish") || categoryLower.includes("shrimp") || categoryLower.includes("salmon") || categoryLower.includes("tuna")) {
    return "Seafood";
  }
  if (categoryLower.includes("bread") || categoryLower.includes("bakery") || categoryLower.includes("baked") || categoryLower.includes("pastry") || categoryLower.includes("cake") || categoryLower.includes("cookie")) {
    return "Bakery";
  }
  if (categoryLower.includes("frozen")) {
    return "Frozen";
  }
  if (categoryLower.includes("canned") || categoryLower.includes("preserved")) {
    return "Canned";
  }
  if (categoryLower.includes("beverage") || categoryLower.includes("drink") || categoryLower.includes("juice") || categoryLower.includes("soda") || categoryLower.includes("water") || categoryLower.includes("coffee") || categoryLower.includes("tea")) {
    return "Beverages";
  }
  if (categoryLower.includes("snack") || categoryLower.includes("chip") || categoryLower.includes("cracker") || categoryLower.includes("nut") || categoryLower.includes("candy") || categoryLower.includes("chocolate")) {
    return "Snacks";
  }
  if (categoryLower.includes("sauce") || categoryLower.includes("condiment") || categoryLower.includes("dressing") || categoryLower.includes("spice") || categoryLower.includes("seasoning") || categoryLower.includes("oil") || categoryLower.includes("vinegar")) {
    return "Condiments";
  }
  if (categoryLower.includes("grain") || categoryLower.includes("cereal") || categoryLower.includes("pasta") || categoryLower.includes("rice") || categoryLower.includes("oat")) {
    return "Grains";
  }
  if (categoryLower.includes("legume") || categoryLower.includes("bean") || categoryLower.includes("lentil") || categoryLower.includes("pea")) {
    return "Legumes";
  }
  if (categoryLower.includes("egg")) {
    return "Dairy";
  }
  return "Pantry Staples";
}
async function registerRoutes(app2) {
  app2.use("/api/auth", auth_router_default);
  app2.use("/api/auth/social", social_auth_router_default);
  app2.use("/api/subscriptions", subscriptionRouter_default);
  app2.use("/api/feedback", feedback_router_default);
  app2.use("/api/cooking-terms", cooking_terms_router_default);
  app2.use("/api/appliances", appliancesRouter);
  app2.use("/api/admin/subscriptions", requireAdmin, subscriptions_router_default);
  app2.use("/api/suggestions", requireAuth, requireSubscription, suggestions_router_default);
  app2.use("/api/recipes", requireAuth, requireSubscription, recipes_router_default);
  app2.use("/api/nutrition", requireAuth, requireSubscription, nutrition_router_default);
  app2.use("/api/instacart", requireAuth, requireSubscription, instacart_router_default);
  app2.use("/api/user/appliances", requireAuth, requireSubscription, userAppliancesRouter);
  app2.use("/api/voice", requireAuth, requireSubscription, voice_router_default);
  app2.use("/api/ai", requireAuth, requireSubscription, image_analysis_router_default);
  app2.use("/api/ingredients", requireAuth, requireSubscription, ingredients_router_default);
  app2.use("/api/sync", requireAuth, requireSubscription, sync_router_default);
  app2.post("/api/chat", async (req, res) => {
    try {
      const { message, context, history, inventory, preferences, equipment, userId } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      const { chatFunctionDefinitions: chatFunctionDefinitions2, executeChatAction: executeChatAction2, getUserSyncData: getUserSyncData3 } = await Promise.resolve().then(() => (init_chat_actions(), chat_actions_exports));
      const authHeader = req.headers.authorization;
      let authenticatedUserId = null;
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const sessions = await db.select().from(userSessions).where(eq13(userSessions.token, token));
        if (sessions.length > 0 && new Date(sessions[0].expiresAt) > /* @__PURE__ */ new Date()) {
          authenticatedUserId = sessions[0].userId;
        }
      }
      if (authenticatedUserId) {
        const hasAccess = await checkFeatureAccess(authenticatedUserId, "aiKitchenAssistant");
        if (!hasAccess) {
          return res.status(403).json({
            error: "Live AI Kitchen Assistant is a Pro feature. Upgrade to Pro to chat with your AI kitchen assistant.",
            code: "FEATURE_NOT_AVAILABLE",
            feature: "aiKitchenAssistant"
          });
        }
      }
      let inventoryContext = context || "";
      let fullInventory = [];
      let userPreferences = preferences || null;
      let userEquipment = equipment || [];
      if (authenticatedUserId) {
        const userData = await getUserSyncData3(authenticatedUserId);
        fullInventory = userData.inventory;
        if (fullInventory.length > 0) {
          inventoryContext = `Available ingredients: ${fullInventory.map((i) => `${i.quantity} ${i.unit} ${i.name}`).join(", ")}`;
        }
        if (userData.preferences) {
          userPreferences = userData.preferences;
        }
        if (userData.cookware && userData.cookware.length > 0) {
          userEquipment = userData.cookware;
        }
      } else if (inventory && Array.isArray(inventory)) {
        fullInventory = inventory;
        inventoryContext = `Available ingredients: ${inventory.map((i) => `${i.quantity || 1} ${i.unit || "item"} ${i.name}`).join(", ")}`;
      }
      let preferencesContext = "";
      if (userPreferences) {
        const prefParts = [];
        if (userPreferences.dietaryRestrictions?.length > 0) {
          prefParts.push(`Dietary restrictions: ${userPreferences.dietaryRestrictions.join(", ")}`);
        }
        if (userPreferences.cuisinePreferences?.length > 0) {
          prefParts.push(`Favorite cuisines: ${userPreferences.cuisinePreferences.join(", ")}`);
        }
        if (userPreferences.macroTargets) {
          const mt = userPreferences.macroTargets;
          prefParts.push(`Daily macro targets: ${mt.calories || "N/A"} cal, ${mt.protein || "N/A"}g protein, ${mt.carbs || "N/A"}g carbs, ${mt.fat || "N/A"}g fat`);
        }
        if (prefParts.length > 0) {
          preferencesContext = `
USER'S PREFERENCES:
${prefParts.join("\n")}`;
        }
      }
      let equipmentContext = "";
      if (userEquipment && userEquipment.length > 0) {
        try {
          const equipmentIds = userEquipment.map((item) => {
            if (typeof item === "number") return item;
            if (typeof item === "object" && item !== null && "id" in item) {
              return typeof item.id === "number" ? item.id : parseInt(String(item.id), 10);
            }
            if (typeof item === "string") return parseInt(item, 10);
            return NaN;
          }).filter((id) => !isNaN(id));
          if (equipmentIds.length > 0) {
            const applianceRecords = await db.select({ id: appliances.id, name: appliances.name }).from(appliances).where(inArray2(appliances.id, equipmentIds));
            if (applianceRecords.length > 0) {
              const applianceNames = applianceRecords.map((a) => a.name);
              equipmentContext = `
USER'S KITCHEN EQUIPMENT: ${applianceNames.join(", ")}
Note: Only suggest recipes that can be made with the equipment the user has. If they don't have specialty appliances, suggest alternatives.`;
            }
          }
        } catch (error) {
          console.error("Failed to fetch appliance names:", error);
        }
      }
      const systemPrompt = `You are ChefSpAIce, an intelligent kitchen assistant with the ability to take actions on behalf of users.

CAPABILITIES:
- Add items to the user's pantry inventory
- Mark items as consumed when the user uses them
- Log wasted items when food goes bad
- Generate personalized recipes based on available ingredients and user preferences
- Create weekly meal plans respecting dietary restrictions
- Add items to shopping lists
- Provide cooking tips, nutrition info, and food storage advice
- Collect user feedback and bug reports through a conversational flow

FEEDBACK COLLECTION:
When a user wants to send feedback or report a bug, guide them conversationally:
1. First, acknowledge their intent and ask what type of feedback (suggestion, compliment, question) or bug (UI issue, crash, data problem, performance issue)
2. Ask them to describe their feedback or the bug in detail
3. For bug reports, ask what they were doing when it happened
4. Optionally ask if they'd like to provide an email for follow-up
5. Once you have enough information, use the save_feedback function to record it
6. Thank them warmly for their contribution to improving the app

${inventoryContext ? `USER'S CURRENT INVENTORY:
${inventoryContext}

When suggesting recipes, prioritize ingredients the user actually has. If asked to add, consume, or waste items, use the appropriate function.` : "The user has not added any ingredients yet. Encourage them to add items to their pantry to get personalized suggestions."}${preferencesContext}${equipmentContext}

${authenticatedUserId ? `IMPORTANT: This user is authenticated. You CAN perform actions on their behalf like adding items, generating recipes, creating meal plans, etc. When the user asks you to do something actionable, USE THE AVAILABLE FUNCTIONS to actually perform the action.` : `NOTE: This user is not logged in. You can provide advice and suggestions, but tell them to log in to enable features like saving recipes, meal planning, and shopping lists.`}

BEHAVIOR GUIDELINES:
- Be proactive: If a user says "I just bought milk", add it to their inventory
- Be helpful: If a user says "I used all the eggs", mark them as consumed
- Be practical: Keep responses concise and actionable
- ALWAYS respect the user's dietary restrictions when suggesting or generating recipes
- Consider the user's cuisine preferences when making suggestions
- When asked to generate a recipe, always use the generate_recipe function
- When asked for a meal plan, use create_meal_plan function
- When asked to add to shopping list, use add_to_shopping_list function`;
      const messages = [
        { role: "system", content: systemPrompt }
      ];
      if (history && Array.isArray(history)) {
        history.forEach(
          (msg) => {
            messages.push({ role: msg.role, content: msg.content });
          }
        );
      }
      messages.push({ role: "user", content: message });
      const completionOptions = {
        model: "gpt-4o-mini",
        messages,
        max_completion_tokens: 1024
      };
      if (authenticatedUserId) {
        completionOptions.tools = chatFunctionDefinitions2;
        completionOptions.tool_choice = "auto";
      }
      const completion = await openai8.chat.completions.create(completionOptions);
      const responseMessage = completion.choices[0]?.message;
      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0 && authenticatedUserId) {
        const toolCalls = responseMessage.tool_calls;
        const actionResults = [];
        for (const toolCall of toolCalls) {
          const toolCallAny = toolCall;
          if (!toolCallAny.function) continue;
          const functionName = toolCallAny.function.name;
          const args = JSON.parse(toolCallAny.function.arguments);
          console.log(`[Chat] Executing function: ${functionName}`, args);
          const result = await executeChatAction2(authenticatedUserId, functionName, args);
          actionResults.push({ name: functionName, result });
        }
        const followUpMessages = [
          ...messages,
          responseMessage,
          ...toolCalls.map((toolCall, index2) => ({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(actionResults[index2]?.result || { success: false })
          }))
        ];
        const finalCompletion = await openai8.chat.completions.create({
          model: "gpt-4o-mini",
          messages: followUpMessages,
          max_completion_tokens: 1024
        });
        const finalReply = finalCompletion.choices[0]?.message?.content || "I've completed the action for you.";
        return res.json({
          reply: finalReply,
          actions: actionResults.map((ar) => ar.result),
          refreshData: true
        });
      }
      const reply = responseMessage?.content || "I'm sorry, I couldn't process that request.";
      res.json({ reply });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });
  app2.get("/api/food/search", async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required" });
      }
      const apiKey = process.env.USDA_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "USDA API key not configured" });
      }
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&pageSize=25`
      );
      if (!response.ok) {
        throw new Error(`USDA API error: ${response.status}`);
      }
      const data = await response.json();
      const foods = (data.foods || []).map((food) => {
        const nutrients = food.foodNutrients || [];
        const getN = (id) => nutrients.find((n) => n.nutrientId === id)?.value || 0;
        const usdaCategory = food.foodCategory || food.brandedFoodCategory || "";
        return {
          fdcId: food.fdcId,
          description: food.description,
          brandOwner: food.brandOwner || null,
          dataType: food.dataType,
          servingSize: food.servingSize || 100,
          servingSizeUnit: food.servingSizeUnit || "g",
          nutrition: {
            calories: Math.round(getN(1008)),
            // Energy (kcal)
            protein: Math.round(getN(1003) * 10) / 10,
            // Protein
            carbs: Math.round(getN(1005) * 10) / 10,
            // Carbohydrates
            fat: Math.round(getN(1004) * 10) / 10,
            // Total fat
            fiber: Math.round(getN(1079) * 10) / 10,
            // Fiber
            sugar: Math.round(getN(2e3) * 10) / 10
            // Sugars
          },
          category: mapFoodCategory(usdaCategory),
          usdaCategory: usdaCategory || null
        };
      });
      res.json({ foods, totalHits: data.totalHits || 0 });
    } catch (error) {
      console.error("Food search error:", error);
      res.status(500).json({ error: "Failed to search food database" });
    }
  });
  app2.get("/api/food/:fdcId", async (req, res) => {
    try {
      const { fdcId } = req.params;
      if (!fdcId) {
        return res.status(400).json({ error: "Food ID is required" });
      }
      const apiKey = process.env.USDA_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "USDA API key not configured" });
      }
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`
      );
      if (!response.ok) {
        throw new Error(`USDA API error: ${response.status}`);
      }
      const food = await response.json();
      const nutrients = food.foodNutrients || [];
      const getN = (id) => {
        const nutrient = nutrients.find(
          (n) => n.nutrient?.id === id || n.nutrientId === id
        );
        return nutrient?.amount || nutrient?.value || 0;
      };
      const usdaCategory = food.foodCategory || food.brandedFoodCategory || "";
      const result = {
        fdcId: food.fdcId,
        description: food.description,
        brandOwner: food.brandOwner || null,
        ingredients: food.ingredients || null,
        servingSize: food.servingSize || food.householdServingFullText || 100,
        servingSizeUnit: food.servingSizeUnit || "g",
        nutrition: {
          calories: Math.round(getN(1008)),
          protein: Math.round(getN(1003) * 10) / 10,
          carbs: Math.round(getN(1005) * 10) / 10,
          fat: Math.round(getN(1004) * 10) / 10,
          fiber: Math.round(getN(1079) * 10) / 10,
          sugar: Math.round(getN(2e3) * 10) / 10,
          sodium: Math.round(getN(1093)),
          cholesterol: Math.round(getN(1253))
        },
        category: mapFoodCategory(usdaCategory),
        usdaCategory: usdaCategory || null
      };
      res.json(result);
    } catch (error) {
      console.error("Food details error:", error);
      res.status(500).json({ error: "Failed to get food details" });
    }
  });
  app2.get("/api/food/barcode/:code", async (req, res) => {
    try {
      const { code } = req.params;
      if (!code) {
        return res.status(400).json({ error: "Barcode is required" });
      }
      const cleanCode = code.replace(/\D/g, "");
      const usdaProduct = await lookupUSDABarcode(cleanCode);
      if (usdaProduct) {
        const mapped = mapUSDAToFoodItem(usdaProduct);
        let servingSize = 100;
        let servingSizeUnit = "g";
        if (mapped.nutrition.servingSize) {
          const match = mapped.nutrition.servingSize.match(/^([\d.]+)\s*(.*)$/);
          if (match) {
            servingSize = parseFloat(match[1]) || 100;
            servingSizeUnit = match[2]?.trim() || "g";
          }
        } else if (usdaProduct.servingSize) {
          servingSize = usdaProduct.servingSize;
          servingSizeUnit = usdaProduct.servingSizeUnit || "g";
        }
        const product2 = {
          barcode: cleanCode,
          name: mapped.name,
          brand: mapped.brandOwner || null,
          category: mapFoodCategory(mapped.category),
          usdaCategory: mapped.category || null,
          imageUrl: null,
          servingSize,
          servingSizeUnit,
          nutrition: {
            calories: mapped.nutrition.calories,
            protein: mapped.nutrition.protein,
            carbs: mapped.nutrition.carbs,
            fat: mapped.nutrition.fat,
            fiber: mapped.nutrition.fiber || 0,
            sugar: mapped.nutrition.sugar || 0
          },
          ingredients: mapped.ingredients || null,
          source: "usda"
        };
        console.log(
          `Found USDA product for barcode ${cleanCode}: ${product2.name}`
        );
        return res.json({ product: product2 });
      }
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${cleanCode}.json`,
        {
          headers: {
            "User-Agent": "FreshPantry/1.0 (Replit App)"
          }
        }
      );
      if (!response.ok) {
        console.log(
          `OpenFoodFacts API error for barcode ${cleanCode}: ${response.status}`
        );
        return res.json({ product: null, message: "Product not found" });
      }
      const data = await response.json();
      if (data.status !== 1 || !data.product) {
        console.log(`Product not found for barcode ${cleanCode}`);
        return res.json({
          product: null,
          message: "Product not found in database"
        });
      }
      const p = data.product;
      const nutrients = p.nutriments || {};
      const openFoodFactsCategory = p.categories || p.categories_tags?.[0] || "";
      const product = {
        barcode: cleanCode,
        name: p.product_name || p.product_name_en || "Unknown Product",
        brand: p.brands || null,
        category: mapFoodCategory(openFoodFactsCategory),
        usdaCategory: openFoodFactsCategory || null,
        imageUrl: p.image_front_url || p.image_url || null,
        servingSize: p.serving_quantity || 100,
        servingSizeUnit: p.serving_quantity_unit || "g",
        nutrition: {
          calories: Math.round(
            nutrients["energy-kcal_100g"] || nutrients.energy_value || 0
          ),
          protein: Math.round((nutrients.proteins_100g || 0) * 10) / 10,
          carbs: Math.round((nutrients.carbohydrates_100g || 0) * 10) / 10,
          fat: Math.round((nutrients.fat_100g || 0) * 10) / 10,
          fiber: Math.round((nutrients.fiber_100g || 0) * 10) / 10,
          sugar: Math.round((nutrients.sugars_100g || 0) * 10) / 10
        },
        ingredients: p.ingredients_text || null,
        source: "openfoodfacts"
      };
      console.log(
        `Found OpenFoodFacts product for barcode ${cleanCode}: ${product.name}`
      );
      res.json({ product });
    } catch (error) {
      console.error("Barcode lookup error:", error);
      res.status(500).json({ error: "Failed to lookup barcode" });
    }
  });
  app2.post(
    "/api/suggestions/shelf-life",
    async (req, res) => {
      try {
        const parseResult = shelfLifeRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
          const errorMessages = parseResult.error.errors.map((e) => e.message).join(", ");
          console.error("Shelf life validation error:", errorMessages);
          return res.status(400).json({
            error: "Invalid input",
            details: errorMessages
          });
        }
        const { foodName, category, storageLocation } = parseResult.data;
        const normalizedFood = foodName.toLowerCase().trim();
        const normalizedLocation = (storageLocation || "refrigerator").toLowerCase().trim();
        const locationMap = {
          fridge: "refrigerator",
          freezer: "freezer",
          pantry: "pantry",
          counter: "counter",
          refrigerator: "refrigerator"
        };
        const mappedLocation = locationMap[normalizedLocation] || "refrigerator";
        const directMatch = getShelfLifeForLocation(
          normalizedFood,
          mappedLocation
        );
        if (directMatch) {
          console.log(
            `Shelf life direct match for: ${foodName} in ${mappedLocation}`
          );
          return res.json({
            suggestedDays: directMatch.days,
            confidence: "high",
            source: "local",
            notes: directMatch.notes
          });
        }
        if (category) {
          const categoryMatch = getShelfLifeForLocation(
            category.toLowerCase(),
            mappedLocation
          );
          if (categoryMatch) {
            console.log(
              `Shelf life category match for: ${foodName} (${category}) in ${mappedLocation}`
            );
            return res.json({
              suggestedDays: categoryMatch.days,
              confidence: "high",
              source: "local",
              notes: categoryMatch.notes
            });
          }
        }
        const partialMatch = findPartialMatch(normalizedFood);
        if (partialMatch) {
          const matchedEntry = getShelfLifeForLocation(
            partialMatch.matchedCategory,
            mappedLocation
          );
          if (matchedEntry) {
            console.log(
              `Shelf life partial match for: ${foodName} -> ${partialMatch.matchedCategory} in ${mappedLocation}`
            );
            return res.json({
              suggestedDays: matchedEntry.days,
              confidence: "medium",
              source: "local",
              notes: matchedEntry.notes
            });
          }
          console.log(
            `Shelf life partial match (default location) for: ${foodName} -> ${partialMatch.matchedCategory}`
          );
          return res.json({
            suggestedDays: partialMatch.days,
            confidence: "medium",
            source: "local",
            notes: partialMatch.notes
          });
        }
        try {
          console.log(`Shelf life AI fallback for: ${foodName}`);
          const aiSuggestion = await getAIShelfLifeSuggestion(
            foodName,
            category,
            mappedLocation
          );
          return res.json(aiSuggestion);
        } catch (aiError) {
          console.error("AI fallback failed, using default:", aiError);
          return res.json({
            suggestedDays: 7,
            confidence: "low",
            source: "local",
            notes: "Default estimate. Please verify based on product packaging."
          });
        }
      } catch (error) {
        console.error("Shelf life suggestion error:", error);
        return res.status(500).json({
          suggestedDays: 7,
          confidence: "low",
          source: "local",
          notes: "Error occurred. Using default 7-day estimate.",
          error: "Failed to get shelf life suggestion"
        });
      }
    }
  );
  app2.get("/api/barcode/raw", async (req, res) => {
    try {
      const { barcode } = req.query;
      if (!barcode || typeof barcode !== "string") {
        return res.status(400).json({ error: "Barcode is required" });
      }
      const cleanBarcode = barcode.replace(/\D/g, "");
      let openFoodFactsResult = {
        found: false,
        raw: null
      };
      try {
        const offResponse = await fetch(
          `https://world.openfoodfacts.org/api/v0/product/${cleanBarcode}.json`,
          {
            headers: {
              "User-Agent": "ChefSpAIce/1.0 (barcode-test)",
              Accept: "application/json"
            }
          }
        );
        if (offResponse.ok) {
          const offData = await offResponse.json();
          openFoodFactsResult = {
            found: offData.status === 1 && !!offData.product,
            raw: offData
          };
        }
      } catch (err) {
        console.error("OpenFoodFacts lookup error:", err);
      }
      let usdaResult = {
        found: false,
        raw: null
      };
      const usdaApiKey = process.env.USDA_API_KEY;
      if (usdaApiKey) {
        try {
          const usdaResponse = await fetch(
            `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaApiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: cleanBarcode,
                dataType: ["Branded"],
                pageSize: 10
              })
            }
          );
          if (usdaResponse.ok) {
            const usdaData = await usdaResponse.json();
            const foods = usdaData.foods || [];
            const exactMatch = foods.find((food) => {
              if (food.gtinUpc) {
                const foodUpc = food.gtinUpc.replace(/\D/g, "");
                return foodUpc === cleanBarcode || foodUpc.endsWith(cleanBarcode) || cleanBarcode.endsWith(foodUpc);
              }
              return false;
            });
            usdaResult = {
              found: !!exactMatch || foods.length > 0,
              raw: {
                searchResults: usdaData,
                exactMatch: exactMatch || null,
                firstResult: foods[0] || null
              }
            };
          }
        } catch (err) {
          console.error("USDA lookup error:", err);
        }
      } else {
        usdaResult.raw = { error: "USDA_API_KEY not configured" };
      }
      res.json({
        barcode: cleanBarcode,
        openFoodFacts: openFoodFactsResult,
        usda: usdaResult
      });
    } catch (error) {
      console.error("Barcode raw lookup error:", error);
      res.status(500).json({ error: "Failed to lookup barcode" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    console.log("[TEST] Registering test endpoints for development mode");
    app2.post("/api/test/set-subscription-tier", requireAuth, async (req, res) => {
      console.log("[TEST] set-subscription-tier endpoint hit (with auth)");
      try {
        const userId = req.userId;
        if (!userId) {
          return res.status(401).json({ error: "Not authenticated" });
        }
        const { tier, status } = req.body;
        if (!tier || !["BASIC", "PRO"].includes(tier)) {
          return res.status(400).json({ error: "Invalid tier. Must be 'BASIC' or 'PRO'" });
        }
        const validStatuses = ["active", "trialing", "canceled", "expired"];
        const newStatus = status && validStatuses.includes(status) ? status : "active";
        await db.update(users).set({
          subscriptionTier: tier,
          subscriptionStatus: newStatus,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(users.id, userId));
        const { subscriptions: subscriptions2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        await db.update(subscriptions2).set({
          status: newStatus,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(subscriptions2.userId, userId));
        console.log(`[TEST] Set user ${userId} to tier: ${tier}, status: ${newStatus}`);
        res.json({
          success: true,
          tier,
          status: newStatus,
          message: `Subscription updated to ${tier} (${newStatus})`
        });
      } catch (error) {
        console.error("Error setting subscription tier:", error);
        res.status(500).json({ error: "Failed to set subscription tier" });
      }
    });
    app2.post("/api/test/set-tier-by-email", async (req, res) => {
      console.log("[TEST] set-tier-by-email endpoint hit");
      try {
        const { email, tier, status } = req.body;
        if (!email) {
          return res.status(400).json({ error: "Email is required" });
        }
        if (!tier || !["BASIC", "PRO"].includes(tier)) {
          return res.status(400).json({ error: "Invalid tier. Must be 'BASIC' or 'PRO'" });
        }
        const [user] = await db.select().from(users).where(eq13(users.email, email)).limit(1);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        const validStatuses = ["active", "trialing", "canceled", "expired"];
        const newStatus = status && validStatuses.includes(status) ? status : "active";
        await db.update(users).set({
          subscriptionTier: tier,
          subscriptionStatus: newStatus,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(users.id, user.id));
        const { subscriptions: subscriptions2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        await db.update(subscriptions2).set({
          status: newStatus,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq13(subscriptions2.userId, user.id));
        console.log(`[TEST] Set user ${user.id} (${email}) to tier: ${tier}, status: ${newStatus}`);
        res.json({
          success: true,
          userId: user.id,
          email,
          tier,
          status: newStatus,
          message: `Subscription updated to ${tier} (${newStatus})`
        });
      } catch (error) {
        console.error("Error setting subscription tier:", error);
        res.status(500).json({ error: "Failed to set subscription tier" });
      }
    });
  }
  app2.get("/privacy-policy", (_req, res) => {
    const privacyPath = __require("path").resolve(
      process.cwd(),
      "server",
      "templates",
      "privacy-policy.html"
    );
    res.sendFile(privacyPath);
  });
  app2.get("/support", (_req, res) => {
    const supportPath = __require("path").resolve(
      process.cwd(),
      "server",
      "templates",
      "support.html"
    );
    res.sendFile(supportPath);
  });
  app2.get("/marketing", (_req, res) => {
    const marketingPath = __require("path").resolve(
      process.cwd(),
      "server",
      "templates",
      "marketing.html"
    );
    res.sendFile(marketingPath);
  });
  app2.get("/feature-graphic", (_req, res) => {
    const featurePath = __require("path").resolve(
      process.cwd(),
      "server",
      "templates",
      "feature-graphic.html"
    );
    res.sendFile(featurePath);
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";
import { Client } from "pg";
import { runMigrations } from "stripe-replit-sync";

// server/stripe/webhookHandlers.ts
init_db();
init_schema();
import { eq as eq14 } from "drizzle-orm";

// server/stripe/subscriptionConfig.ts
var SUBSCRIPTION_CONFIG = {
  TRIAL_DAYS: TRIAL_CONFIG.TRIAL_DAYS,
  BASIC_MONTHLY: {
    priceId: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID || "",
    amount: MONTHLY_PRICES.BASIC * 100,
    interval: "month",
    name: "ChefSpAIce Basic Monthly",
    tier: "BASIC" /* BASIC */
  },
  BASIC_ANNUAL: {
    priceId: process.env.STRIPE_BASIC_ANNUAL_PRICE_ID || "",
    amount: ANNUAL_PRICES.BASIC * 100,
    interval: "year",
    name: "ChefSpAIce Basic Annual",
    tier: "BASIC" /* BASIC */
  },
  PRO_MONTHLY: {
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "",
    amount: MONTHLY_PRICES.PRO * 100,
    interval: "month",
    name: "ChefSpAIce Pro Monthly",
    tier: "PRO" /* PRO */
  },
  PRO_ANNUAL: {
    priceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || "",
    amount: ANNUAL_PRICES.PRO * 100,
    interval: "year",
    name: "ChefSpAIce Pro Annual",
    tier: "PRO" /* PRO */
  },
  MONTHLY: {
    priceId: process.env.STRIPE_MONTHLY_PRICE_ID || process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "",
    amount: MONTHLY_PRICES.PRO * 100,
    interval: "month",
    name: "Monthly Subscription"
  },
  ANNUAL: {
    priceId: process.env.STRIPE_ANNUAL_PRICE_ID || process.env.STRIPE_PRO_ANNUAL_PRICE_ID || "",
    amount: ANNUAL_PRICES.PRO * 100,
    interval: "year",
    name: "Annual Subscription"
  }
};
var PRODUCTS = {
  ["BASIC" /* BASIC */]: {
    name: "ChefSpAIce Basic",
    description: "Essential kitchen management with 25 pantry items, 5 AI recipes/month, and 5 cookware items",
    tier: "BASIC" /* BASIC */,
    monthlyPrice: MONTHLY_PRICES.BASIC * 100,
    annualPrice: ANNUAL_PRICES.BASIC * 100
  },
  ["PRO" /* PRO */]: {
    name: "ChefSpAIce Pro",
    description: "Unlimited pantry items, AI recipes, and cookware. Plus Recipe Scanning, Bulk Scanning, Live AI Kitchen Assistant, Custom Storage Areas, and Weekly Meal Prepping",
    tier: "PRO" /* PRO */,
    monthlyPrice: MONTHLY_PRICES.PRO * 100,
    annualPrice: ANNUAL_PRICES.PRO * 100
  }
};
function getPlanTypeFromPriceId(priceId) {
  if (!priceId) return null;
  if (priceId === SUBSCRIPTION_CONFIG.BASIC_MONTHLY.priceId || priceId === SUBSCRIPTION_CONFIG.PRO_MONTHLY.priceId || priceId === SUBSCRIPTION_CONFIG.MONTHLY.priceId) {
    return "monthly";
  }
  if (priceId === SUBSCRIPTION_CONFIG.BASIC_ANNUAL.priceId || priceId === SUBSCRIPTION_CONFIG.PRO_ANNUAL.priceId || priceId === SUBSCRIPTION_CONFIG.ANNUAL.priceId) {
    return "annual";
  }
  return null;
}
function getTierFromProductName(productName) {
  const normalizedName = productName.toLowerCase();
  if (normalizedName.includes("pro")) {
    return "PRO" /* PRO */;
  }
  if (normalizedName.includes("basic")) {
    return "BASIC" /* BASIC */;
  }
  return "PRO" /* PRO */;
}
async function getTierFromPriceId(priceId, stripe) {
  try {
    const price = await stripe.prices.retrieve(priceId, {
      expand: ["product"]
    });
    const product = price.product;
    const productName = typeof product === "object" && product?.name ? product.name : "";
    const productMetadata = typeof product === "object" && product?.metadata ? product.metadata : {};
    const tierFromMetadata = productMetadata.tier;
    const tier = tierFromMetadata || getTierFromProductName(productName);
    const interval = price.recurring?.interval;
    const planType = interval === "year" ? "annual" : "monthly";
    return { tier, planType };
  } catch (error) {
    console.error("[SubscriptionConfig] Error fetching price details:", error);
    return null;
  }
}

// server/stripe/webhookHandlers.ts
var WebhookHandlers = class {
  static async processWebhook(payload, signature, uuid) {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. Received type: " + typeof payload + ". This usually means express.json() parsed the body before reaching this handler. FIX: Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature, uuid);
    const event = JSON.parse(payload.toString());
    await processSubscriptionEvent(event);
  }
};
async function processSubscriptionEvent(event) {
  console.log("[Webhook] Processing event:", event.type);
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case "customer.subscription.created":
        await handleSubscriptionCreated(event.data.object);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error(`[Webhook] Error processing ${event.type}:`, error);
  }
}
async function findUserByStripeCustomerId(stripeCustomerId) {
  const [subscription] = await db.select().from(subscriptions).where(eq14(subscriptions.stripeCustomerId, stripeCustomerId)).limit(1);
  return subscription?.userId || null;
}
async function findUserIdFromCustomerMetadata(stripeCustomerId) {
  try {
    const stripe = await getUncachableStripeClient();
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    if (customer.deleted) return null;
    return customer.metadata?.userId || null;
  } catch (error) {
    console.error("[Webhook] Error fetching customer metadata:", error);
    return null;
  }
}
async function updateUserSubscriptionTier(userId, tier, status, stripeCustomerId, stripeSubscriptionId, trialEnd) {
  const updateData = {
    subscriptionTier: tier,
    subscriptionStatus: status,
    updatedAt: /* @__PURE__ */ new Date()
  };
  if (stripeCustomerId) {
    updateData.stripeCustomerId = stripeCustomerId;
  }
  if (stripeSubscriptionId) {
    updateData.stripeSubscriptionId = stripeSubscriptionId;
  }
  if (trialEnd) {
    updateData.trialEndsAt = trialEnd;
  }
  await db.update(users).set(updateData).where(eq14(users.id, userId));
  console.log(`[Webhook] Updated user ${userId} tier to ${tier}, status to ${status}`);
}
async function handleCheckoutSessionCompleted(session) {
  console.log("[Webhook] checkout.session.completed:", session.id);
  if (session.mode !== "subscription") {
    console.log("[Webhook] Skipping non-subscription checkout session");
    return;
  }
  const stripeCustomerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!stripeCustomerId || !stripeSubscriptionId) {
    console.error("[Webhook] Missing customer or subscription ID in checkout session");
    return;
  }
  const userId = session.metadata?.userId || await findUserIdFromCustomerMetadata(stripeCustomerId);
  if (!userId) {
    console.error("[Webhook] Could not find userId for checkout session:", session.id);
    return;
  }
  const stripe = await getUncachableStripeClient();
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const priceId = subscription.items?.data?.[0]?.price?.id;
  let planType = getPlanTypeFromPriceId(priceId || "") || "monthly";
  let tier = session.metadata?.tier || "BASIC" /* BASIC */;
  if (priceId) {
    const tierInfo = await getTierFromPriceId(priceId, stripe);
    if (tierInfo) {
      tier = tierInfo.tier;
      planType = tierInfo.planType;
    }
  }
  const now = /* @__PURE__ */ new Date();
  const currentPeriodStart = new Date((subscription.current_period_start || subscription.start_date || Date.now() / 1e3) * 1e3);
  const currentPeriodEnd = new Date((subscription.current_period_end || Date.now() / 1e3 + 30 * 24 * 60 * 60) * 1e3);
  const trialStart = subscription.trial_start ? new Date(subscription.trial_start * 1e3) : null;
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1e3) : null;
  await db.insert(subscriptions).values({
    userId,
    stripeCustomerId,
    stripeSubscriptionId,
    stripePriceId: priceId || null,
    status: subscription.status,
    planType,
    currentPeriodStart,
    currentPeriodEnd,
    trialStart,
    trialEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false
  }).onConflictDoUpdate({
    target: subscriptions.userId,
    set: {
      stripeCustomerId,
      stripeSubscriptionId,
      stripePriceId: priceId || null,
      status: subscription.status,
      planType,
      currentPeriodStart,
      currentPeriodEnd,
      trialStart,
      trialEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      updatedAt: now
    }
  });
  const status = subscription.status === "trialing" ? "trialing" : "active";
  await updateUserSubscriptionTier(userId, tier, status, stripeCustomerId, stripeSubscriptionId, trialEnd);
  console.log("[Webhook] Subscription record created/updated for user:", userId, "Tier:", tier);
}
async function handleSubscriptionCreated(subscription) {
  console.log("[Webhook] customer.subscription.created:", subscription.id);
  const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (!stripeCustomerId) {
    console.error("[Webhook] Missing customer ID in subscription");
    return;
  }
  const userId = subscription.metadata?.userId || await findUserByStripeCustomerId(stripeCustomerId) || await findUserIdFromCustomerMetadata(stripeCustomerId);
  if (!userId) {
    console.log("[Webhook] No userId found for subscription, will be linked via checkout.session.completed");
    return;
  }
  const sub = subscription;
  const priceId = sub.items?.data?.[0]?.price?.id;
  let planType = getPlanTypeFromPriceId(priceId || "") || "monthly";
  let tier = subscription.metadata?.tier || "BASIC" /* BASIC */;
  if (priceId) {
    const stripe = await getUncachableStripeClient();
    const tierInfo = await getTierFromPriceId(priceId, stripe);
    if (tierInfo) {
      tier = tierInfo.tier;
      planType = tierInfo.planType;
    }
  }
  const now = /* @__PURE__ */ new Date();
  const currentPeriodStart = new Date((sub.current_period_start || sub.start_date || Date.now() / 1e3) * 1e3);
  const currentPeriodEnd = new Date((sub.current_period_end || Date.now() / 1e3 + 30 * 24 * 60 * 60) * 1e3);
  const trialStart = sub.trial_start ? new Date(sub.trial_start * 1e3) : null;
  const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1e3) : null;
  await db.insert(subscriptions).values({
    userId,
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId || null,
    status: subscription.status,
    planType,
    currentPeriodStart,
    currentPeriodEnd,
    trialStart,
    trialEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false
  }).onConflictDoUpdate({
    target: subscriptions.userId,
    set: {
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId || null,
      status: subscription.status,
      planType,
      currentPeriodStart,
      currentPeriodEnd,
      trialStart,
      trialEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      updatedAt: now
    }
  });
  const status = subscription.status === "trialing" ? "trialing" : "active";
  await updateUserSubscriptionTier(userId, tier, status, stripeCustomerId, subscription.id, trialEnd);
  console.log("[Webhook] Subscription created for user:", userId, "Tier:", tier);
}
async function handleSubscriptionUpdated(subscription) {
  console.log("[Webhook] customer.subscription.updated:", subscription.id);
  const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (!stripeCustomerId) {
    console.error("[Webhook] Missing customer ID in subscription");
    return;
  }
  const userId = await findUserByStripeCustomerId(stripeCustomerId);
  if (!userId) {
    console.log("[Webhook] No user found for subscription update:", subscription.id);
    return;
  }
  const sub = subscription;
  const priceId = sub.items?.data?.[0]?.price?.id;
  let planType = getPlanTypeFromPriceId(priceId || "") || "monthly";
  let tier = subscription.metadata?.tier || "BASIC" /* BASIC */;
  if (priceId) {
    const stripe = await getUncachableStripeClient();
    const tierInfo = await getTierFromPriceId(priceId, stripe);
    if (tierInfo) {
      tier = tierInfo.tier;
      planType = tierInfo.planType;
    }
  }
  const currentPeriodStart = new Date((sub.current_period_start || sub.start_date || Date.now() / 1e3) * 1e3);
  const currentPeriodEnd = new Date((sub.current_period_end || Date.now() / 1e3 + 30 * 24 * 60 * 60) * 1e3);
  const trialStart = sub.trial_start ? new Date(sub.trial_start * 1e3) : null;
  const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1e3) : null;
  const canceledAt = sub.canceled_at ? new Date(sub.canceled_at * 1e3) : null;
  await db.update(subscriptions).set({
    stripePriceId: priceId || null,
    status: subscription.status,
    planType,
    currentPeriodStart,
    currentPeriodEnd,
    trialStart,
    trialEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
    canceledAt,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq14(subscriptions.stripeCustomerId, stripeCustomerId));
  const statusStr = subscription.status === "trialing" ? "trialing" : subscription.status === "active" ? "active" : subscription.status;
  await updateUserSubscriptionTier(userId, tier, statusStr, stripeCustomerId, void 0, trialEnd);
  console.log("[Webhook] Subscription updated for user:", userId, "Tier:", tier, "Status:", subscription.status);
}
async function handleSubscriptionDeleted(subscription) {
  console.log("[Webhook] customer.subscription.deleted:", subscription.id);
  const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (!stripeCustomerId) {
    console.error("[Webhook] Missing customer ID in subscription");
    return;
  }
  const sub = subscription;
  const canceledAt = sub.canceled_at ? new Date(sub.canceled_at * 1e3) : /* @__PURE__ */ new Date();
  const finalStatus = subscription.status === "canceled" ? "canceled" : "expired";
  await db.update(subscriptions).set({
    status: finalStatus,
    canceledAt,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq14(subscriptions.stripeCustomerId, stripeCustomerId));
  const userId = await findUserByStripeCustomerId(stripeCustomerId);
  if (userId) {
    await updateUserSubscriptionTier(userId, "BASIC" /* BASIC */, finalStatus);
  }
  console.log("[Webhook] Subscription marked as", finalStatus, "for customer:", stripeCustomerId);
}
async function handleInvoicePaid(invoice) {
  console.log("[Webhook] invoice.paid:", invoice.id);
  const inv = invoice;
  if (!inv.subscription) {
    console.log("[Webhook] Invoice not related to subscription, skipping");
    return;
  }
  const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!stripeCustomerId) {
    console.error("[Webhook] Missing customer ID in invoice");
    return;
  }
  const stripe = await getUncachableStripeClient();
  const subscriptionId = typeof inv.subscription === "string" ? inv.subscription : inv.subscription?.id;
  if (!subscriptionId) return;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const currentPeriodStart = new Date((subscription.current_period_start || Date.now() / 1e3) * 1e3);
  const currentPeriodEnd = new Date((subscription.current_period_end || Date.now() / 1e3 + 30 * 24 * 60 * 60) * 1e3);
  await db.update(subscriptions).set({
    status: "active",
    currentPeriodStart,
    currentPeriodEnd,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq14(subscriptions.stripeCustomerId, stripeCustomerId));
  console.log("[Webhook] Subscription confirmed active for customer:", stripeCustomerId);
}
async function handleInvoicePaymentFailed(invoice) {
  console.log("[Webhook] invoice.payment_failed:", invoice.id);
  const inv = invoice;
  if (!inv.subscription) {
    console.log("[Webhook] Invoice not related to subscription, skipping");
    return;
  }
  const stripeCustomerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!stripeCustomerId) {
    console.error("[Webhook] Missing customer ID in invoice");
    return;
  }
  await db.update(subscriptions).set({
    status: "past_due",
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq14(subscriptions.stripeCustomerId, stripeCustomerId));
  console.log("[Webhook] Subscription marked as past_due for customer:", stripeCustomerId);
}

// server/jobs/trialExpirationJob.ts
init_db();
init_schema();
import { eq as eq15, and as and4, lt } from "drizzle-orm";
async function checkExpiredTrials() {
  const now = /* @__PURE__ */ new Date();
  const errors = [];
  let expiredCount = 0;
  try {
    const expiredTrials = await db.select({
      userId: subscriptions.userId,
      trialEnd: subscriptions.trialEnd,
      status: subscriptions.status
    }).from(subscriptions).where(
      and4(
        eq15(subscriptions.status, "trialing"),
        lt(subscriptions.trialEnd, now)
      )
    );
    console.log(`[TrialJob] Found ${expiredTrials.length} expired trials to process`);
    for (const trial of expiredTrials) {
      try {
        await expireTrialSubscription(trial.userId);
        expiredCount++;
        console.log(`[TrialJob] Expired trial for user ${trial.userId}`);
      } catch (error) {
        const msg = `Failed to expire trial for user ${trial.userId}: ${error}`;
        errors.push(msg);
        console.error(`[TrialJob] ${msg}`);
      }
    }
    console.log(`[TrialJob] Successfully expired ${expiredCount} trials`);
  } catch (error) {
    const msg = `Error querying expired trials: ${error}`;
    errors.push(msg);
    console.error(`[TrialJob] ${msg}`);
  }
  return { expired: expiredCount, errors };
}
var jobInterval = null;
function startTrialExpirationJob(intervalMs = 60 * 60 * 1e3) {
  if (jobInterval) {
    console.log("[TrialJob] Job already running");
    return;
  }
  console.log(`[TrialJob] Starting trial expiration job (interval: ${intervalMs}ms)`);
  checkExpiredTrials();
  jobInterval = setInterval(async () => {
    console.log("[TrialJob] Running scheduled trial expiration check...");
    await checkExpiredTrials();
  }, intervalMs);
}

// server/index.ts
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    origins.add("http://localhost:8081");
    origins.add("http://127.0.0.1:8081");
    origins.add("http://localhost:5000");
    origins.add("http://127.0.0.1:5000");
    const origin = req.header("origin");
    if (origin && origins.has(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Requested-With");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(cookieParser());
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
  app2.use(
    fileUpload({
      limits: { fileSize: 10 * 1024 * 1024 },
      abortOnLimit: true
    })
  );
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function isMobileUserAgent(userAgent) {
  if (!userAgent) return false;
  const mobilePatterns = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i;
  return mobilePatterns.test(userAgent);
}
function isWebRoute(pathname) {
  const cleanPath = pathname.toLowerCase().split("?")[0];
  const webRoutes = ["/", "/about", "/privacy", "/terms", "/attributions", "/subscription-success", "/subscription-canceled", "/onboarding"];
  return webRoutes.includes(cleanPath);
}
function configureExpoRouting(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  const isDevelopment = process.env.NODE_ENV !== "production";
  const staticBuildPath = path.resolve(process.cwd(), "static-build");
  const hasStaticBuild = fs.existsSync(path.join(staticBuildPath, "index.html"));
  log("Serving static Expo files with dynamic manifest routing");
  log(`Environment: ${isDevelopment ? "development" : "production"}, Static build: ${hasStaticBuild ? "available" : "not found"}`);
  let metroProxy = null;
  if (isDevelopment) {
    metroProxy = createProxyMiddleware({
      target: "http://localhost:8081",
      changeOrigin: true,
      ws: true,
      on: {
        error: (err, req, res) => {
          log(`Metro proxy error: ${err.message}`);
          if (res && !res.headersSent && res.writeHead) {
            res.writeHead(502, { "Content-Type": "text/html" });
            res.end("<h1>Metro bundler not available</h1><p>Please wait for Metro to start or refresh the page.</p>");
          }
        }
      }
    });
  }
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api/test")) {
      log(`[DEBUG] Test API route: ${req.method} ${req.path}`);
    }
    if (req.path.startsWith("/api")) {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      if (req.path === "/" || req.path === "/manifest") {
        return serveExpoManifest(platform, res);
      }
    }
    const userAgent = req.header("user-agent");
    const isMobile = isMobileUserAgent(userAgent);
    if (req.path === "/" && isMobile && !platform) {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    const isMetroAsset = req.path.startsWith("/_expo") || req.path.startsWith("/node_modules") || req.path.endsWith(".bundle") || req.path.endsWith(".map");
    if (isDevelopment && metroProxy) {
      if (isWebRoute(req.path) || isMetroAsset) {
        return metroProxy(req, res, next);
      }
    } else if (hasStaticBuild && isWebRoute(req.path)) {
      const indexPath = path.join(staticBuildPath, "index.html");
      return res.sendFile(indexPath);
    }
    next();
  });
  log(`Expo routing: ${isDevelopment ? "Desktop browsers proxied to Metro" : "Serving static build"}, mobile browsers get QR page`);
}
function configureStaticFiles(app2) {
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app2.use(express.static(path.resolve(process.cwd(), "static-build")));
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, _next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
}
async function warmupDatabase(databaseUrl, retries = 3, delay = 2e3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const client = new Client({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 5e3
    });
    try {
      log(`Warming up database connection... (attempt ${attempt}/${retries})`);
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      log("Database connection ready");
      return true;
    } catch (error) {
      try {
        await client.end();
      } catch {
      }
      if (attempt === retries) {
        console.error("Failed to connect to database after retries:", error);
        return false;
      }
      log(`Database warmup attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise((resolve2) => setTimeout(resolve2, delay));
    }
  }
  return false;
}
async function initStripe(retries = 3, delay = 2e3) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log("DATABASE_URL not found, skipping Stripe initialization");
    return;
  }
  const dbReady = await warmupDatabase(databaseUrl);
  if (!dbReady) {
    log("Database not available, skipping Stripe initialization");
    return;
  }
  try {
    log("Initializing Stripe schema...");
    await runMigrations({
      databaseUrl
    });
    log("Stripe schema ready");
  } catch (migrationError) {
    console.error("Failed to initialize Stripe schema:", migrationError);
    return;
  }
  try {
    const stripeSync2 = await getStripeSync();
    log("Setting up managed webhook...");
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const { webhook, uuid } = await stripeSync2.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`,
      {
        enabled_events: ["*"],
        description: "Managed webhook for Stripe sync"
      }
    );
    log(`Webhook configured: ${webhook.url} (UUID: ${uuid})`);
    stripeSync2.syncBackfill({
      include: ["checkout_sessions"]
    }).then(() => {
      log("Stripe checkout sessions synced");
    }).catch((err) => {
      console.error("Error syncing Stripe data:", err);
    });
  } catch (error) {
    console.error("Failed to initialize Stripe:", error);
  }
}
(async () => {
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: Date.now() });
  });
  setupCors(app);
  app.post(
    "/api/stripe/webhook/:uuid",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const signature = req.headers["stripe-signature"];
      if (!signature) {
        return res.status(400).json({ error: "Missing stripe-signature" });
      }
      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;
        if (!Buffer.isBuffer(req.body)) {
          console.error("STRIPE WEBHOOK ERROR: req.body is not a Buffer");
          return res.status(500).json({ error: "Webhook processing error" });
        }
        const { uuid } = req.params;
        await WebhookHandlers.processWebhook(req.body, sig, uuid);
        res.status(200).json({ received: true });
      } catch (error) {
        console.error("Webhook error:", error.message);
        res.status(400).json({ error: "Webhook processing error" });
      }
    }
  );
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoRouting(app);
  const server = await registerRoutes(app);
  configureStaticFiles(app);
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
      initStripe().catch((err) => {
        console.error("Background Stripe init failed:", err);
      });
      startTrialExpirationJob(60 * 60 * 1e3);
    }
  );
})();
