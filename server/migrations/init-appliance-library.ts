// Script to initialize the appliance library with comprehensive data
import { db } from "../db";
import { applianceLibrary } from "@shared/schema";
import { applianceLibraryData } from "../data/appliance-library-data";

export async function initializeApplianceLibrary() {
  try {
    // console.log("Initializing appliance library...");

    // Check if library is already populated
    const existingCount = await db.$count(applianceLibrary);

    if (existingCount > 0) {
      // console.log(`Appliance library already has ${existingCount} items`);
      return;
    }

    // Insert all items
    const insertData = applianceLibraryData.map((item) => ({
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      description: item.description,
      capabilities: item.capabilities,
      sizeOrCapacity: item.sizeOrCapacity,
      material: item.material,
      isCommon: item.isCommon,
      searchTerms: item.searchTerms,
    }));

    await db.insert(applianceLibrary).values(insertData as any);

    // console.log(`Successfully initialized appliance library with ${insertData.length} items`);
  } catch (error) {
    console.error("Error initializing appliance library:", error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeApplianceLibrary()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
