/**
 * JSON Schema definitions for USDA and barcode data types
 * These are used across the application for consistent data validation
 */

import { z } from "zod";

// ==================== Nutrition Schema ====================
export const nutritionInfoSchema = z.object({
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbohydrates: z.number().optional(),
  fat: z.number().optional(),
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
  servingSize: z.string().optional(),
  servingUnit: z.string().optional(),
});

export type NutritionInfo = z.infer<typeof nutritionInfoSchema>;

// ==================== USDA Food Data Schema ====================
export const usdaFoodDataSchema = z.object({
  fdcId: z.string(),
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
  foodNutrients: z.array(z.object({
    nutrientId: z.number(),
    nutrientName: z.string(),
    nutrientNumber: z.string().optional(),
    unitName: z.string(),
    value: z.number(),
  })).optional(),
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
  source: z.enum(['barcode_lookup', 'openfoodfacts', 'manual']).optional(),
  cachedAt: z.date().optional(),
});

export type BarcodeData = z.infer<typeof barcodeDataSchema>;