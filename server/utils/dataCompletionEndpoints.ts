/**
 * Data Completion API Endpoints
 *
 * Provides endpoints for users to review and complete incomplete product data
 * from USDA or other import sources. Includes data quality assessment and
 * manual entry workflows.
 */

import { Router } from "express";
import { storage as storageInstance } from "../storage/index";
import { searchUSDAFoods, getFoodByFdcId } from "../integrations/usda";
import {
  searchOFFByBarcode,
  searchOFFByName,
  getCombinedNutrition,
  enrichWithOFF,
} from "../integrations/openFoodFacts";
import {
  assessDataQuality,
  ensureRequiredFields,
  getFoodDefaults,
  calculateExpirationDate,
} from "../data/foodCategoryDefaults";
import { resolveStorageLocationId } from "./storageLocationResolver";
import type { NutritionInfo } from "@shared/schema";

export function createDataCompletionRoutes(storage: typeof storageInstance) {
  const router = Router();

  /**
   * Assess data quality for a potential inventory item
   * Returns quality score, missing fields, and suggestions
   */
  router.post("/assess-quality", async (req, res) => {
    try {
      const { item, userId } = req.body;

      if (!userId || !item) {
        return res.status(400).json({ error: "Missing userId or item data" });
      }

      // Assess data quality
      const assessment = assessDataQuality(item);

      // Get intelligent defaults based on category/description
      const defaults = getFoodDefaults(item.foodCategory, item.name);

      // Resolve storage location if needed
      let storageLocationId = item.storageLocationId;
      if (!storageLocationId && defaults.storageLocation) {
        storageLocationId = await resolveStorageLocationId(
          storage,
          userId,
          defaults.storageLocation,
        );
      }

      // Build suggestions for missing fields
      const suggestions: any = {};

      if (!item.quantity) {
        suggestions.quantity = defaults.quantity;
      }

      if (!item.unit) {
        suggestions.unit = defaults.unit;
      }

      if (!item.storageLocationId && storageLocationId) {
        suggestions.storageLocationId = storageLocationId;
        suggestions.storageLocationName = defaults.storageLocation;
      }

      if (!item.expirationDate) {
        suggestions.expirationDate = calculateExpirationDate(
          defaults.estimatedExpirationDays,
        );
        suggestions.expirationDays = defaults.estimatedExpirationDays;
      }

      // Check for nutrition data completeness
      const hasNutrition =
        item.nutrition &&
        item.nutrition.calories > 0 &&
        (item.nutrition.protein > 0 ||
          item.nutrition.carbs > 0 ||
          item.nutrition.fat > 0);

      return res.json({
        assessment,
        suggestions,
        hasCompleteNutrition: hasNutrition,
        canImport: assessment.score >= 50, // Minimum score threshold
      });
    } catch (error) {
      console.error("Error assessing data quality:", error);
      return res.status(500).json({ error: "Failed to assess data quality" });
    }
  });

  /**
   * Enrich incomplete product data using multiple sources
   * Tries USDA first, then OpenFoodFacts, then applies defaults
   */
  router.post("/enrich-product", async (req, res) => {
    try {
      const { product, userId } = req.body;

      if (!userId || !product) {
        return res
          .status(400)
          .json({ error: "Missing userId or product data" });
      }

      let enrichedProduct = { ...product };

      // Step 1: Try USDA if we have a barcode or name
      if (!enrichedProduct.fdcId) {
        if (product.barcode || product.name) {
          const searchQuery = product.barcode || product.name;
          const usdaResults = await searchUSDAFoods(searchQuery);

          if (usdaResults?.foods?.length > 0) {
            const firstResult = usdaResults.foods[0];
            enrichedProduct = {
              ...enrichedProduct,
              fdcId: firstResult.fdcId,
              name: enrichedProduct.name || firstResult.description,
              foodCategory:
                enrichedProduct.foodCategory || firstResult.foodCategory,
              nutrition: enrichedProduct.nutrition || firstResult.nutrition,
              ingredients:
                enrichedProduct.ingredients || firstResult.ingredients,
            };
          }
        }
      } else if (!enrichedProduct.nutrition) {
        // We have fdcId but missing nutrition - refetch from USDA
        const usdaFood = await getFoodByFdcId(parseInt(enrichedProduct.fdcId));
        if (usdaFood?.nutrition) {
          enrichedProduct.nutrition = usdaFood.nutrition;
        }
      }

      // Step 2: Try OpenFoodFacts for missing data
      if (
        !enrichedProduct.nutrition ||
        !enrichedProduct.ingredients ||
        !enrichedProduct.imageUrl
      ) {
        const offEnriched = await enrichWithOFF(enrichedProduct);
        enrichedProduct = { ...enrichedProduct, ...offEnriched };
      }

      // Step 3: Apply intelligent defaults
      const defaults = getFoodDefaults(
        enrichedProduct.foodCategory,
        enrichedProduct.name,
      );

      if (!enrichedProduct.quantity) {
        enrichedProduct.quantity = defaults.quantity;
      }

      if (!enrichedProduct.unit) {
        enrichedProduct.unit = defaults.unit;
      }

      if (!enrichedProduct.storageLocationId) {
        const locationId = await resolveStorageLocationId(
          storage,
          userId,
          defaults.storageLocation,
        );
        if (locationId) {
          enrichedProduct.storageLocationId = locationId;
          enrichedProduct.storageLocationName = defaults.storageLocation;
        }
      }

      if (!enrichedProduct.expirationDate) {
        enrichedProduct.expirationDate = calculateExpirationDate(
          defaults.estimatedExpirationDays,
        );
      }

      // Step 4: Final data quality assessment
      const finalAssessment = assessDataQuality(enrichedProduct);

      return res.json({
        product: enrichedProduct,
        dataQuality: finalAssessment,
        sources: {
          usda: !!enrichedProduct.fdcId,
          openFoodFacts: !!(
            enrichedProduct.nutrition && !enrichedProduct.fdcId
          ),
          defaults: true,
        },
      });
    } catch (error) {
      console.error("Error enriching product:", error);
      return res.status(500).json({ error: "Failed to enrich product data" });
    }
  });

  /**
   * Search multiple data sources for product information
   * Returns combined results from USDA and OpenFoodFacts
   */
  router.get("/search-products", async (req, res) => {
    try {
      const { query, barcode, userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
      }

      if (!query && !barcode) {
        return res
          .status(400)
          .json({ error: "Missing search query or barcode" });
      }

      const results: any[] = [];

      // Search by barcode if provided
      if (barcode) {
        // Try OpenFoodFacts first for barcodes (they specialize in this)
        const offProduct = await searchOFFByBarcode(barcode as string);
        if (offProduct) {
          results.push({
            source: "OpenFoodFacts",
            ...offProduct,
            barcode,
          });
        }

        // Also try USDA
        const usdaResults = await searchUSDAFoods(barcode as string);
        if (usdaResults?.foods?.length > 0) {
          results.push(
            ...usdaResults.foods.slice(0, 3).map((f) => ({
              source: "USDA",
              name: f.description,
              brand: f.brandOwner,
              category: f.foodCategory,
              nutrition: f.nutrition,
              fdcId: f.fdcId,
              barcode: f.gtinUpc,
            })),
          );
        }
      }

      // Search by name if provided
      if (query && !barcode) {
        // Search USDA
        const usdaResults = await searchUSDAFoods(query as string);
        if (usdaResults?.foods?.length > 0) {
          results.push(
            ...usdaResults.foods.slice(0, 5).map((f) => ({
              source: "USDA",
              name: f.description,
              brand: f.brandOwner,
              category: f.foodCategory,
              nutrition: f.nutrition,
              fdcId: f.fdcId,
              barcode: f.gtinUpc,
            })),
          );
        }

        // Search OpenFoodFacts
        const offResults = await searchOFFByName(query as string, 5);
        results.push(
          ...offResults.map((p) => ({
            source: "OpenFoodFacts",
            ...p,
          })),
        );
      }

      // Apply data quality assessment to each result
      const assessedResults = results.map((product) => {
        const assessment = assessDataQuality(product);
        return {
          ...product,
          dataQuality: assessment,
        };
      });

      // Sort by data quality score
      assessedResults.sort((a, b) => b.dataQuality.score - a.dataQuality.score);

      return res.json({
        results: assessedResults.slice(0, 10), // Return top 10 results
        searchQuery: query || barcode,
      });
    } catch (error) {
      console.error("Error searching products:", error);
      return res.status(500).json({ error: "Failed to search products" });
    }
  });

  /**
   * Complete and save an inventory item with enriched data
   * Validates all required fields before saving
   */
  router.post("/complete-and-save", async (req, res) => {
    try {
      const { item, userId } = req.body;

      if (!userId || !item) {
        return res.status(400).json({ error: "Missing userId or item data" });
      }

      // Ensure all required fields are populated
      const completedItem = ensureRequiredFields(
        item,
        item.foodCategory,
        item.name,
      );

      // Resolve storage location ID if only name is provided
      if (!completedItem.storageLocationId && completedItem.storageLocation) {
        const locationId = await resolveStorageLocationId(
          storage,
          userId,
          completedItem.storageLocation,
        );
        if (locationId) {
          completedItem.storageLocationId = locationId;
        } else {
          return res.status(400).json({
            error: "Unable to resolve storage location",
          });
        }
      }

      // Validate required fields
      if (
        !completedItem.name ||
        !completedItem.quantity ||
        !completedItem.unit ||
        !completedItem.storageLocationId
      ) {
        return res.status(400).json({
          error: "Missing required fields",
          missing: {
            name: !completedItem.name,
            quantity: !completedItem.quantity,
            unit: !completedItem.unit,
            storageLocationId: !completedItem.storageLocationId,
          },
        });
      }

      // Create the inventory item
      const savedItem = await storage.createFoodItem(userId, {
        ...completedItem,
      });

      return res.json({
        success: true,
        item: savedItem,
      });
    } catch (error) {
      console.error("Error completing and saving item:", error);
      return res.status(500).json({ error: "Failed to save inventory item" });
    }
  });

  return router;
}
