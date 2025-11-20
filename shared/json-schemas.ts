/**
 * Shared Zod schemas for JSON/JSONB columns
 * 
 * Purpose: Provide reusable, type-safe Zod schemas for common JSON structures
 * used across multiple tables. This ensures consistency and reduces duplication.
 * 
 * Tier Classification:
 * - Tier A (Critical): Strong, structured schemas for user-facing data
 * - Tier B (Semi-structured): Partial schemas with passthrough for flexibility
 * - Tier C (Operational): Generic schemas with docblock justification
 */

import { z } from "zod";

// ========================================
// TIER A: Critical User-Facing Schemas
// ========================================

/**
 * Nutrition information schema (Tier A)
 * Used by: userInventory, userRecipes, fdcCache
 * 
 * Based on USDA FoodData Central nutrient structure.
 * Provides strong typing for nutrition calculations.
 */
export const nutritionInfoSchema = z.object({
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbohydrates: z.number().optional(),
  fat: z.number().optional(),
  fiber: z.number().optional(),
  sugar: z.number().optional(),
  sodium: z.number().optional(),
  servingSize: z.string().optional(),
  servingUnit: z.string().optional(),
}).passthrough(); // Allow additional nutrients

/**
 * Push token device info schema (Tier A)
 * Used by: pushTokens, notificationFeedback
 */
export const deviceInfoSchema = z.object({
  deviceId: z.string(),
  deviceModel: z.string().optional(),
  osVersion: z.string().optional(),
  appVersion: z.string().optional(),
  platform: z.enum(["ios", "android", "web"]).optional(),
}).passthrough();

/**
 * Notification type preferences schema (Tier A)
 * Used by: notificationPreferences
 */
export const notificationTypesSchema = z.object({
  expiringFood: z.boolean().optional(),
  recipeSuggestions: z.boolean().optional(),
  mealReminders: z.boolean().optional(),
  shoppingListUpdates: z.boolean().optional(),
  systemAnnouncements: z.boolean().optional(),
}).passthrough();

/**
 * Quiet hours configuration schema (Tier A)
 * Used by: notificationPreferences
 */
export const quietHoursSchema = z.object({
  enabled: z.boolean(),
  startTime: z.string(), // HH:MM format
  endTime: z.string(),   // HH:MM format
  timezone: z.string().optional(),
});

/**
 * Notification ML features schema (Tier A)
 * Used by: notificationScores
 */
export const notificationFeaturesSchema = z.object({
  engagementScore: z.number().optional(),
  relevanceScore: z.number().optional(),
  timingScore: z.number().optional(),
  personalizedScore: z.number().optional(),
}).passthrough();

// ========================================
// TIER B: Semi-Structured Analytics Schemas
// ========================================

/**
 * Web vitals metrics schema (Tier B)
 * Used by: webVitals
 * 
 * Core Web Vitals with optional custom metrics.
 */
export const webVitalsMetricsSchema = z.object({
  LCP: z.number().optional(), // Largest Contentful Paint
  FID: z.number().optional(), // First Input Delay
  CLS: z.number().optional(), // Cumulative Layout Shift
  TTFB: z.number().optional(), // Time to First Byte
  FCP: z.number().optional(), // First Contentful Paint
}).passthrough();

/**
 * Search analytics schema (Tier B)
 * Used by: searchLogs
 */
export const searchAnalyticsSchema = z.object({
  resultsCount: z.number().optional(),
  clickedResultIndex: z.number().optional(),
  timeToFirstClick: z.number().optional(),
  filterQuery: z.record(z.any()).optional(),
}).passthrough();

/**
 * Content embedding metadata schema (Tier B)
 * Used by: contentEmbeddings
 */
export const embeddingMetadataSchema = z.object({
  model: z.string().optional(),
  dimensions: z.number().optional(),
  tokenCount: z.number().optional(),
  generatedAt: z.string().optional(),
}).passthrough();

// ========================================
// TIER C: Operational/Logging Schemas
// ========================================

/**
 * Generic metadata schema (Tier C)
 * Used by: Various operational tables
 * 
 * Justification: Operational metadata has no fixed structure.
 * Using z.any() allows flexibility for evolving requirements.
 */
export const genericMetadataSchema = z.record(z.any());

/**
 * API request/response data schema (Tier C)
 * Used by: apiUsageLogs
 * 
 * Justification: API payloads vary widely by endpoint.
 * Generic typing prevents schema brittleness.
 */
export const apiDataSchema = z.record(z.any());

/**
 * Cache data schema (Tier C)
 * Used by: fdcCache, barcodeCache
 * 
 * Justification: Cached API responses from external services.
 * Schema should match upstream provider, not enforce our own.
 */
export const cacheDataSchema = z.any();

// ========================================
// Utility Schemas
// ========================================

/**
 * String array schema
 * Common pattern for tags, categories, lists
 */
export const stringArraySchema = z.array(z.string());

/**
 * Timestamp schema
 * ISO 8601 date-time string
 */
export const timestampSchema = z.string().datetime();

/**
 * UUID schema
 * UUID v4 format
 */
export const uuidSchema = z.string().uuid();

// ========================================
// Composite Schemas
// ========================================

/**
 * USDA FoodData Central full response (Tier A)
 * Used by: userInventory, fdcCache
 */
export const usdaFoodDataSchema = z.object({
  fdcId: z.number(),
  description: z.string(),
  dataType: z.string().optional(),
  brandOwner: z.string().optional(),
  gtinUpc: z.string().optional(),
  ingredients: z.string().optional(),
  foodCategory: z.string().optional(),
  nutrients: z.array(z.object({
    nutrientId: z.number(),
    nutrientName: z.string(),
    value: z.number(),
    unitName: z.string(),
  })).optional(),
  nutrition: z.object({
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
  }).optional(),
  servingSize: z.number().optional(),
  servingSizeUnit: z.string().optional(),
}).passthrough(); // Allow additional USDA fields

// Export the inferred type for client use
export type USDAFoodItem = z.infer<typeof usdaFoodDataSchema>;

/**
 * USDA Search Response (Tier A)
 * Used by: server/usda.ts, server/utils/usdaCache.ts
 * 
 * Response structure from USDA FoodData Central search endpoint.
 */
export const usdaSearchResponseSchema = z.object({
  totalHits: z.number(),
  currentPage: z.number(),
  totalPages: z.number(),
  foods: z.array(usdaFoodDataSchema),
});

export type USDASearchResponse = z.infer<typeof usdaSearchResponseSchema>;

/**
 * Nutrition information type (Tier A)
 * Exported for use in application code.
 */
export type NutritionInfo = z.infer<typeof nutritionInfoSchema>;

/**
 * Barcode lookup response (Tier A)
 * Used by: userInventory
 */
export const barcodeDataSchema = z.object({
  upc: z.string(),
  productName: z.string().optional(),
  brand: z.string().optional(),
  imageUrl: z.string().optional(),
  nutrition: nutritionInfoSchema.optional(),
}).passthrough(); // Allow additional barcode API fields

