/**
 * Migration script to update all existing food items to use the 5 major food groups
 * Run with: npm run migrate:categories
 */

import { db } from './db';
import { foodItems } from '@shared/schema';
import { normalizeCategory } from './category-mapping';
import { eq, sql } from 'drizzle-orm';

async function migrateCategories() {
  console.log('Starting category migration to 5 major food groups...\n');
  
  try {
    // Get all unique categories currently in the database
    const currentCategories = await db
      .selectDistinct({ category: foodItems.foodCategory })
      .from(foodItems)
      .execute();
    
    console.log('Current categories in database:');
    const categoryCounts: Record<string, number> = {};
    
    for (const row of currentCategories) {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(foodItems)
        .where(row.category === null 
          ? sql`${foodItems.foodCategory} IS NULL`
          : eq(foodItems.foodCategory, row.category))
        .then(r => r[0]?.count || 0);
      
      categoryCounts[row.category || 'null'] = count;
      console.log(`  - ${row.category || 'null'}: ${count} items`);
    }
    
    console.log('\nMigrating categories to 5 major food groups...');
    
    // Get all items and update their categories
    const allItems = await db.select().from(foodItems);
    let updateCount = 0;
    const migrationMap: Record<string, number> = {};
    
    for (const item of allItems) {
      const oldCategory = item.foodCategory;
      const newCategory = normalizeCategory(oldCategory);
      
      if (oldCategory !== newCategory) {
        await db
          .update(foodItems)
          .set({ foodCategory: newCategory })
          .where(eq(foodItems.id, item.id));
        
        updateCount++;
        
        // Track migration for reporting
        const key = `${oldCategory || 'null'} → ${newCategory}`;
        migrationMap[key] = (migrationMap[key] || 0) + 1;
      }
    }
    
    console.log(`\nMigration complete! Updated ${updateCount} items.`);
    
    if (Object.keys(migrationMap).length > 0) {
      console.log('\nMigration details:');
      for (const [mapping, count] of Object.entries(migrationMap)) {
        console.log(`  - ${mapping}: ${count} items`);
      }
    }
    
    // Show final category distribution
    console.log('\nFinal category distribution:');
    const finalCategories = await db
      .selectDistinct({ category: foodItems.foodCategory })
      .from(foodItems)
      .execute();
    
    for (const row of finalCategories) {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(foodItems)
        .where(row.category === null 
          ? sql`${foodItems.foodCategory} IS NULL`
          : eq(foodItems.foodCategory, row.category))
        .then(r => r[0]?.count || 0);
      
      console.log(`  - ${row.category}: ${count} items`);
    }
    
    console.log('\n✅ Category migration successful!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateCategories();