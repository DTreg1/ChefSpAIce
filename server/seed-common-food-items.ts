import { storage } from "./storage";
import { fetchOnboardingItemUsdaData } from "./onboarding-usda";
import { getOnboardingUpcs, onboardingUsdaMapping } from "./onboarding-usda-mapping";
import { getItemsByCategory } from "./onboarding-items-expanded";
import { normalizeCategory } from "./category-mapping";
import type { InsertOnboardingInventory } from "@shared/schema";

/**
 * Seeds the commonFoodItems table with all onboarding items and their USDA data.
 * This should be run once during initial setup and can be re-run to update data.
 */
export async function seedCommonFoodItems(forceUpdate = false) {
  console.log("Starting to seed common food items...");
  
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
  
  console.log(`Processing ${allItems.size} common food items...`);
  
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
          const existing = await storage.getCommonFoodItemByName(displayName);
          if (existing) {
            console.log(`Skipping ${displayName} - already exists`);
            return { success: true, skipped: true };
          }
        }
        
        // Fetch USDA data for the item
        console.log(`Processing ${displayName}...`);
        const usdaData = await fetchOnboardingItemUsdaData(displayName);
        
        // Prepare the common food item data
        const commonItem: InsertOnboardingInventory = {
          displayName,
          upc: itemData.upc || null,
          fdcId: usdaData?.fdcId ? String(usdaData.fdcId) : itemData.fdcId || null,
          description: usdaData?.description || itemData.description || displayName,
          quantity: itemData.quantity || "1",
          unit: itemData.unit || "unit",
          storage: itemData.storage || "Pantry",
          expirationDays: itemData.expirationDays || 30,
          category: itemData.category || null,
          foodCategory: normalizeCategory(usdaData?.foodCategory || itemData.category || null),
          nutrition: usdaData?.nutrition || null,
          usdaData: usdaData ? {
            fdcId: usdaData.fdcId,
            description: usdaData.description,
            dataType: usdaData.dataType,
            brandOwner: usdaData.brandOwner,
            gtinUpc: usdaData.gtinUpc,
            ingredients: usdaData.ingredients,
            foodCategory: usdaData.foodCategory,
            servingSize: usdaData.servingSize,
            servingSizeUnit: usdaData.servingSizeUnit,
            nutrition: usdaData.nutrition,
          } : null,
          brandOwner: usdaData?.brandOwner || null,
          ingredients: usdaData?.ingredients || null,
          servingSize: usdaData?.servingSize ? String(usdaData.servingSize) : null,
          servingSizeUnit: usdaData?.servingSizeUnit || null,
          dataSource: usdaData ? 
            (itemData.upc ? 'usda_upc' : 
             itemData.fdcId ? 'usda_fdc' : 
             'usda_search') : 
            'manual',
        };
        
        // Save to database
        await storage.upsertCommonFoodItem(commonItem);
        console.log(`✓ Saved ${displayName}`);
        return { success: true, skipped: false };
      } catch (error: any) {
        console.error(`✗ Error processing ${displayName}:`, error.message);
        return { 
          success: false, 
          error: { item: displayName, error: error.message }
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
    console.log(`Progress: ${i + batch.length}/${itemsArray.length} items processed`);
    
    // Add a small delay between batches to avoid rate limiting
    if (i + batchSize < itemsArray.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const elapsedTime = (Date.now() - startTime) / 1000;
  
  console.log("\n=== Seeding Complete ===");
  console.log(`Total items processed: ${itemsArray.length}`);
  console.log(`Successfully saved: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Time elapsed: ${elapsedTime.toFixed(2)} seconds`);
  
  if (errors.length > 0) {
    console.log("\n=== Errors ===");
    errors.forEach(({ item, error }) => {
      console.log(`- ${item}: ${error}`);
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
    .then(result => {
      console.log("\n✓ Seeding completed successfully");
      process.exit(0);
    })
    .catch(error => {
      console.error("\n✗ Seeding failed:", error);
      process.exit(1);
    });
}