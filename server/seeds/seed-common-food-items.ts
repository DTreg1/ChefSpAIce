import { storage } from "../storage";
import { onboardingUsdaMapping } from "../data/onboarding-usda-mapping";
import { fetchOnboardingItemsUsdaData } from "../data/onboarding-items";
import { normalizeCategory } from "../data/category-mapping";
import type { InsertOnboardingInventory } from "@shared/schema";

/**
 * Seeds the commonFoodItems table with all onboarding items and their USDA data.
 * This should be run once during initial setup and can be re-run to update data.
 */
export async function seedCommonFoodItems(forceUpdate = false) {
  // console.log("Starting to seed common food items...");
  
  const startTime = Date.now();
  const itemsByCategory = getItemsByCategory();
  const allItems = new Map<string, any>();
  
  // Flatten all items from expanded list
  Object.values(itemsByCategory).forEach(items => {
    items.forEach(item => {
      allItems.set(item.displayName, item);
    });
  });
  
  // Merge with USDA mapping data (which has UPCs)
  Object.entries(onboardingUsdaMapping).forEach(([name, mappingData]) => {
    const existingItem = allItems.get(name);
    if (existingItem) {
      // Merge the data
      allItems.set(name, {
        ...existingItem,
        upc: mappingData.upc || existingItem.upc,
        fdcId: mappingData.fdcId || existingItem.fdcId,
        description: mappingData.description || existingItem.description,
      });
    } else {
      // Add new item from mapping
      allItems.set(name, {
        ...mappingData,
        displayName: name,  // Override any displayName from mappingData
      });
    }
  });
  
  // console.log(`Processing ${allItems.size} common food items...`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors: { item: string; error: string }[] = [];
  
  // Process items in batches to avoid overwhelming the API
  const itemsArray = Array.from(allItems.entries());
  const batchSize = 10;
  
  for (let i = 0; i < itemsArray.length; i += batchSize) {
    const batch = itemsArray.slice(i, Math.min(i + batchSize, itemsArray.length));
    
    // Process batch in parallel
    const promises = batch.map(async ([displayName, itemData]) => {
      try {
        // Check if item already exists and skip if not forcing update
        if (!forceUpdate) {
          const existing = await storage.getOnboardingInventoryByName(displayName);
          if (existing) {
            // console.log(`Skipping ${displayName} - already exists`);
            return { success: true, skipped: true };
          }
        }
        
        // Fetch USDA data for the item
        // console.log(`Processing ${displayName}...`);
        const usdaData = await fetchOnboardingItemUsdaData(displayName);
        
        // Prepare the common food item data
        const commonItem: InsertOnboardingInventory = {
          name: displayName,
          category: normalizeCategory(usdaData?.foodCategory || itemData.category || 'Other'),
          storageLocation: itemData.storage || "pantry",
          commonBrand: usdaData?.brandOwner || null,
          defaultQuantity: itemData.quantity || "1",
          defaultUnit: itemData.unit || "item",
          imageUrl: itemData.imageUrl || null,
          isPopular: itemData.isPopular || false,
          usdaData: usdaData || undefined,
          sortOrder: 0
        };
        
        // Save to database
        await storage.upsertOnboardingInventoryItem(commonItem);
        // console.log(`✓ Saved ${displayName}`);
        return { success: true, skipped: false };
      } catch (error: unknown) {
        console.error(`✗ Error processing ${displayName}:`, error instanceof Error ? error.message : String(error));
        return { 
          success: false, 
          error: { item: displayName, error: error instanceof Error ? error.message : String(error) }
        };
      }
    });
    
    const results = await Promise.all(promises);
    
    results.forEach(result => {
      if (result.success && !result.skipped) {
        successCount++;
      } else if (!result.success) {
        errorCount++;
        if (result.error) {
          errors.push(result.error);
        }
      }
    });
    
    // Log progress
    // console.log(`Progress: ${i + batch.length}/${itemsArray.length} items processed`);
    
    // Add a small delay between batches to avoid rate limiting
    if (i + batchSize < itemsArray.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const elapsedTime = (Date.now() - startTime) / 1000;
  
  // console.log("\n=== Seeding Complete ===");
  // console.log(`Total items processed: ${itemsArray.length}`);
  // console.log(`Successfully saved: ${successCount}`);
  // console.log(`Errors: ${errorCount}`);
  // console.log(`Time elapsed: ${elapsedTime.toFixed(2)} seconds`);
  
  if (errors.length > 0) {
    // console.log("\n=== Errors ===");
    errors.forEach(({ item, error }) => {
      // console.log(`- ${item}: ${error}`);
    });
  }
  
  return {
    totalItems: itemsArray.length,
    successCount,
    errorCount,
    errors,
    elapsedTime,
  };
}

// Run the seeding if this file is executed directly
// Check if running as main module using import.meta.url
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const forceUpdate = process.argv.includes("--force");
  
  seedCommonFoodItems(forceUpdate)
    .then(() => {
      // console.log("\n✓ Seeding completed successfully");
      process.exit(0);
    })
    .catch(error => {
      console.error("\n✗ Seeding failed:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}