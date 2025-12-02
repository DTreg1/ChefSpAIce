import { db } from "../db";
import { sql } from "drizzle-orm";

// This script adds performance indexes for common query patterns
// Run with: npx tsx server/add-performance-indexes.ts

async function addIndexes() {
  // console.log("Adding performance indexes...");

  try {
    // Food Items - Critical for inventory queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_food_items_user_expiration 
      ON food_items(user_id, expiration_date)
    `);
    // console.log("✓ Added index: food_items(user_id, expiration_date)");

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_food_items_user_storage_location 
      ON food_items(user_id, storage_location_id)
    `);
    // console.log("✓ Added index: food_items(user_id, storage_location_id)");

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_food_items_user_food_category 
      ON food_items(user_id, food_category)
    `);
    // console.log("✓ Added index: food_items(user_id, food_category)");

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_food_items_user_added_at 
      ON food_items(user_id, added_at DESC)
    `);
    // console.log("✓ Added index: food_items(user_id, added_at DESC)");

    // Recipes - For user recipe queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_recipes_user_created 
      ON recipes(user_id, created_at DESC)
    `);
    // console.log("✓ Added index: recipes(user_id, created_at DESC)");

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_recipes_user_favorite 
      ON recipes(user_id, is_favorite, created_at DESC)
    `);
    // console.log("✓ Added index: recipes(user_id, is_favorite, created_at DESC)");

    // Meal Plans - For calendar queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date 
      ON meal_plans(user_id, date)
    `);
    // console.log("✓ Added index: meal_plans(user_id, date)");

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date_meal 
      ON meal_plans(user_id, date, meal_type)
    `);
    // console.log("✓ Added index: meal_plans(user_id, date, meal_type)");

    // Shopping List - For list queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_shopping_list_user_created 
      ON shopping_list_items(user_id, created_at)
    `);
    // console.log("✓ Added index: shopping_list_items(user_id, created_at)");

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_shopping_list_user_checked 
      ON shopping_list_items(user_id, is_checked)
    `);
    // console.log("✓ Added index: shopping_list_items(user_id, is_checked)");

    // Chat Messages - For conversation history
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_chat_messages_user_timestamp 
      ON chat_messages(user_id, timestamp DESC)
    `);
    // console.log("✓ Added index: chat_messages(user_id, timestamp DESC)");

    // API Usage Logs - For analytics queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_api_usage_user_timestamp 
      ON api_usage_logs(user_id, timestamp DESC)
    `);
    // console.log("✓ Added index: api_usage_logs(user_id, timestamp DESC)");

    // FDC Cache - For nutrition lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_fdc_cache_fdc_id 
      ON fdc_cache(fdc_id)
    `);
    // console.log("✓ Added index: fdc_cache(fdc_id)");

    // Barcode Products - For barcode lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_barcode_products_barcode 
      ON barcode_products(barcode_number)
    `);
    // console.log("✓ Added index: barcode_products(barcode_number)");

    // console.log("\n✅ All indexes added successfully!");
    // console.log("Note: These indexes will significantly improve query performance for:");
    // console.log("  • Food item expiration tracking");
    // console.log("  • Recipe and meal plan lookups");
    // console.log("  • Shopping list operations");
    // console.log("  • Chat history retrieval");
    // console.log("  • Analytics queries");
  } catch (error) {
    console.error("❌ Error adding indexes:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the migration
addIndexes();
