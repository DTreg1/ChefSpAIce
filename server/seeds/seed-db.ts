#!/usr/bin/env node
import { seedCommonFoodItems } from "./seed-common-food-items";

// console.log("Starting database seeding...");

seedCommonFoodItems(false)
  .then((result) => {
    // console.log("\n✓ Database seeded successfully");
    // console.log(`Total items: ${result.totalItems}`);
    // console.log(`Successfully saved: ${result.successCount}`);
    // console.log(`Errors: ${result.errorCount}`);
    // console.log(`Time elapsed: ${result.elapsedTime.toFixed(2)} seconds`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n✗ Seeding failed:", error);
    process.exit(1);
  });
