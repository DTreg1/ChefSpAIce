#!/usr/bin/env tsx
/**
 * Script to update all food items with missing nutrition data
 * Run with: tsx scripts/update-nutrition.ts
 */

import { db } from "../server/db";
import { userInventory } from "../shared/schema";
import {
  searchUSDAFoods,
  getFoodByFdcId,
  isNutritionDataValid,
} from "../server/usda";
import { eq } from "drizzle-orm";

async function updateMissingNutrition() {
  console.log("Starting nutrition data update for all food items...\n");

  try {
    // Get all food items
    const allItems = await db.select().from(userInventory);
    console.log(`Found ${allItems.length} total food items`);

    // Filter items without nutrition
    const itemsWithoutNutrition = allItems.filter((item) => !item.nutrition);
    console.log(
      `Found ${itemsWithoutNutrition.length} items without nutrition data\n`,
    );

    if (itemsWithoutNutrition.length === 0) {
      console.log("All items already have nutrition data!");
      return;
    }

    let updated = 0;
    let failed = 0;

    for (const item of itemsWithoutNutrition) {
      console.log(`Processing: ${item.name} (ID: ${item.id})`);

      try {
        let nutrition = null;
        let usdaData = null;

        // Try extracting FDC ID from existing USDA data first
        let fdcId = null;
        if (
          item.usdaData &&
          typeof item.usdaData === "object" &&
          "fdcId" in item.usdaData
        ) {
          fdcId = item.usdaData.fdcId;
        }

        // Try FDC ID first if available
        if (fdcId) {
          console.log(`  - Trying FDC ID: ${fdcId}`);
          const foodDetails = await getFoodByFdcId(parseInt(fdcId));
          if (foodDetails && foodDetails.nutrition) {
            nutrition = JSON.stringify(foodDetails.nutrition) as any;
            usdaData = foodDetails; // Store as object, not JSON string
            console.log(`  ✓ Found nutrition data using existing FDC ID`);
          }
        }

        // If no nutrition yet, search by name
        if (!nutrition) {
          console.log(`  - Searching USDA for "${item.name}"`);
          const searchResults = await searchUSDAFoods(item.name);

          if (searchResults.foods && searchResults.foods.length > 0) {
            // Try up to 5 search results
            for (const searchResult of searchResults.foods.slice(0, 5)) {
              try {
                console.log(`  - Trying FDC ID: ${searchResult.fdcId}`);
                const foodDetails = await getFoodByFdcId(searchResult.fdcId);

                if (foodDetails && foodDetails.nutrition) {
                  nutrition = JSON.stringify(foodDetails.nutrition) as any;
                  usdaData = foodDetails; // Store as object, not JSON string
                  console.log(`  ✓ Found nutrition data for "${item.name}"`);
                  break;
                }
              } catch (err) {
                // Continue to next result
              }
            }
          }
        }

        if (!nutrition) {
          failed++;
          console.log(`  ❌ No nutrition data found\n`);
          continue;
        }

        // Parse and validate nutrition data before saving
        let nutritionData: any;
        let weightInGrams: number | null = null;

        try {
          nutritionData = JSON.parse(nutrition);
          const quantity = parseFloat(item.quantity) || 1;
          const servingSize = parseFloat(nutritionData.servingSize) || 100;
          weightInGrams = quantity * servingSize;

          // Validate the nutrition data
          if (!isNutritionDataValid(nutritionData, item.name)) {
            console.log(`  ⚠️ Skipping item due to invalid nutrition data\n`);
            failed++;
            continue;
          }
        } catch (e) {
          console.error("  ! Error parsing/validating nutrition:", e);
          failed++;
          continue;
        }

        // Update the item only if nutrition data is valid
        await db
          .update(userInventory)
          .set({
            nutrition,
            usdaData,
            weightInGrams,
          })
          .where(eq(userInventory.id, item.id));

        updated++;
        console.log(`  ✅ Updated successfully\n`);

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`  ❌ Error processing item:`, error);
        failed++;
      }
    }

    console.log("\n========================================");
    console.log("Nutrition Update Complete!");
    console.log(`✅ Updated: ${updated} items`);
    console.log(`❌ Failed: ${failed} items`);
    console.log(`📊 Total processed: ${itemsWithoutNutrition.length} items`);
    console.log("========================================\n");
  } catch (error) {
    console.error("Fatal error during nutrition update:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the update
updateMissingNutrition();
