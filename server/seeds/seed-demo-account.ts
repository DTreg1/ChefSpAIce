/**
 * Demo Account Seed Script
 * 
 * Creates a demo account for Apple App Store Review with:
 * - Known credentials for testing
 * - Sample inventory, recipes, and meal plans
 * - Active subscription
 * 
 * Usage: npx tsx server/seeds/seed-demo-account.ts
 */

import { db } from "../db";
import { users, userSyncData, userSyncKV, subscriptions, userAppliances, userInventoryItems, userSavedRecipes, userMealPlans, userShoppingItems, userCookwareItems } from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const DEMO_EMAIL = "demo@chefspaice.com";
const DEMO_PASSWORD = process.env.DEMO_ACCOUNT_PASSWORD || "ChefSpAIce2024!";
const BCRYPT_ROUNDS = 12;

async function seedDemoAccount() {
  logger.info("ChefSpAIce Demo Account Setup started");

  try {
    // Check if demo user exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, DEMO_EMAIL),
    });

    let userId: string;

    if (existing) {
      logger.info("Demo user already exists, updating");
      userId = existing.id;
      
      // Update password in case it changed
      const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);
      await db
        .update(users)
        .set({
          password: hashedPassword,
          displayName: "Demo User",
          hasCompletedOnboarding: true,
          subscriptionTier: "STANDARD",
          subscriptionStatus: "active",
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    } else {
      logger.info("Creating new demo user");
      const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

      const [newUser] = await db
        .insert(users)
        .values({
          email: DEMO_EMAIL,
          password: hashedPassword,
          displayName: "Demo User",
          hasCompletedOnboarding: true,
          subscriptionTier: "STANDARD",
          subscriptionStatus: "active",
          dietaryRestrictions: [],
          allergens: [],
          favoriteCategories: ["Italian", "Asian", "Mediterranean"],
          storageAreasEnabled: ["refrigerator", "freezer", "pantry", "counter"],
          householdSize: 4,
          dailyMeals: 3,
          cookingSkillLevel: "intermediate",
          preferredUnits: "imperial",
          notificationsEnabled: true,
          notifyExpiringFood: true,
          notifyMealReminders: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      userId = newUser.id;
    }

    logger.info("Demo user ready", { userId });

    // Create or update subscription
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const existingSub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    });

    if (existingSub) {
      await db
        .update(subscriptions)
        .set({
          status: "active",
          planType: "annual",
          currentPeriodEnd: oneYearFromNow,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, userId));
      logger.info("Updated existing subscription");
    } else {
      await db.insert(subscriptions).values({
        userId,
        status: "active",
        planType: "annual",
        currentPeriodStart: new Date(),
        currentPeriodEnd: oneYearFromNow,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      logger.info("Created subscription");
    }

    // Create sample sync data
    const sampleInventory = [
      {
        id: "demo-inv-1",
        name: "Chicken Breast",
        quantity: 2,
        unit: "lbs",
        storageArea: "refrigerator",
        expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        category: "Protein",
        addedAt: new Date().toISOString(),
      },
      {
        id: "demo-inv-2",
        name: "Broccoli",
        quantity: 2,
        unit: "heads",
        storageArea: "refrigerator",
        expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        category: "Vegetable",
        addedAt: new Date().toISOString(),
      },
      {
        id: "demo-inv-3",
        name: "Jasmine Rice",
        quantity: 5,
        unit: "lbs",
        storageArea: "pantry",
        category: "Grain",
        addedAt: new Date().toISOString(),
      },
      {
        id: "demo-inv-4",
        name: "Olive Oil",
        quantity: 1,
        unit: "bottle",
        storageArea: "pantry",
        category: "Oil",
        addedAt: new Date().toISOString(),
      },
      {
        id: "demo-inv-5",
        name: "Eggs",
        quantity: 12,
        unit: "count",
        storageArea: "refrigerator",
        expirationDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        category: "Dairy",
        addedAt: new Date().toISOString(),
      },
      {
        id: "demo-inv-6",
        name: "Milk",
        quantity: 1,
        unit: "gallon",
        storageArea: "refrigerator",
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        category: "Dairy",
        addedAt: new Date().toISOString(),
      },
      {
        id: "demo-inv-7",
        name: "Garlic",
        quantity: 1,
        unit: "head",
        storageArea: "counter",
        category: "Vegetable",
        addedAt: new Date().toISOString(),
      },
      {
        id: "demo-inv-8",
        name: "Soy Sauce",
        quantity: 1,
        unit: "bottle",
        storageArea: "pantry",
        category: "Condiment",
        addedAt: new Date().toISOString(),
      },
      {
        id: "demo-inv-9",
        name: "Frozen Peas",
        quantity: 1,
        unit: "bag",
        storageArea: "freezer",
        category: "Vegetable",
        addedAt: new Date().toISOString(),
      },
      {
        id: "demo-inv-10",
        name: "Pasta",
        quantity: 2,
        unit: "boxes",
        storageArea: "pantry",
        category: "Grain",
        addedAt: new Date().toISOString(),
      },
    ];

    const sampleRecipes = [
      {
        id: "demo-recipe-1",
        title: "Chicken Stir Fry",
        description: "Quick and healthy weeknight dinner with fresh vegetables",
        prepTime: 15,
        cookTime: 20,
        servings: 4,
        ingredients: [
          "2 lbs chicken breast, sliced",
          "2 heads broccoli, cut into florets",
          "3 cloves garlic, minced",
          "3 tbsp soy sauce",
          "2 tbsp olive oil",
          "1 cup jasmine rice",
        ],
        instructions: [
          "Cook rice according to package directions",
          "Heat olive oil in a large wok or skillet over high heat",
          "Add chicken and cook until golden, about 5-7 minutes",
          "Add garlic and broccoli, stir fry for 3-4 minutes",
          "Add soy sauce and toss to coat",
          "Serve over rice",
        ],
        cuisineType: "Asian",
        difficulty: "easy",
        createdAt: new Date().toISOString(),
      },
      {
        id: "demo-recipe-2",
        title: "Classic Scrambled Eggs",
        description: "Fluffy, creamy scrambled eggs perfect for breakfast",
        prepTime: 5,
        cookTime: 5,
        servings: 2,
        ingredients: [
          "4 eggs",
          "2 tbsp milk",
          "1 tbsp butter",
          "Salt and pepper to taste",
        ],
        instructions: [
          "Whisk eggs and milk together in a bowl",
          "Melt butter in a non-stick pan over medium-low heat",
          "Add eggs and gently stir with a spatula",
          "Cook until just set, remove from heat while still slightly wet",
          "Season with salt and pepper",
        ],
        cuisineType: "American",
        difficulty: "easy",
        createdAt: new Date().toISOString(),
      },
      {
        id: "demo-recipe-3",
        title: "Garlic Pasta",
        description: "Simple and delicious pasta with garlic and olive oil",
        prepTime: 10,
        cookTime: 15,
        servings: 4,
        ingredients: [
          "1 lb pasta",
          "6 cloves garlic, thinly sliced",
          "1/2 cup olive oil",
          "Red pepper flakes",
          "Fresh parsley",
          "Parmesan cheese",
        ],
        instructions: [
          "Cook pasta according to package directions, reserve 1 cup pasta water",
          "While pasta cooks, slowly heat olive oil and garlic over low heat",
          "Cook garlic until golden (about 5 minutes), don't let it burn",
          "Add red pepper flakes",
          "Toss drained pasta with garlic oil",
          "Add pasta water as needed, top with parsley and parmesan",
        ],
        cuisineType: "Italian",
        difficulty: "easy",
        createdAt: new Date().toISOString(),
      },
    ];

    const today = new Date();
    const sampleMealPlan = {
      weekStart: today.toISOString(),
      meals: [
        {
          id: "demo-meal-1",
          date: today.toISOString(),
          mealType: "dinner",
          recipeId: "demo-recipe-1",
          recipeTitle: "Chicken Stir Fry",
        },
        {
          id: "demo-meal-2",
          date: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          mealType: "breakfast",
          recipeId: "demo-recipe-2",
          recipeTitle: "Classic Scrambled Eggs",
        },
        {
          id: "demo-meal-3",
          date: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          mealType: "dinner",
          recipeId: "demo-recipe-3",
          recipeTitle: "Garlic Pasta",
        },
      ],
    };

    const sampleAppliances = [
      {
        id: "demo-appliance-1",
        name: "Stainless Steel Skillet",
        type: "pan",
        size: "12-inch",
        material: "stainless steel",
        heatSource: "induction",
        addedAt: new Date().toISOString()
      },
      {
        id: "demo-appliance-2",
        name: "Non-Stick Frying Pan",
        type: "pan",
        size: "10-inch",
        material: "aluminum",
        heatSource: "gas",
        addedAt: new Date().toISOString()
      },
      {
        id: "demo-appliance-3",
        name: "Large Mixing Bowl",
        type: "bowl",
        size: "6-quart",
        material: "glass",
        addedAt: new Date().toISOString()
      },
      {
        id: "demo-appliance-4",
        name: "Blender",
        type: "blender",
        size: "medium",
        material: "plastic",
        addedAt: new Date().toISOString()
      }
      ];

    // Insert inventory items into normalized table
    await db.delete(userInventoryItems).where(eq(userInventoryItems.userId, userId));
    for (const item of sampleInventory) {
      await db.insert(userInventoryItems).values({
        userId,
        itemId: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        storageLocation: item.storageArea,
        category: item.category,
        purchaseDate: item.addedAt,
        expirationDate: item.expirationDate || null,
      }).onConflictDoNothing();
    }
    logger.info("Inserted inventory items into normalized table", { count: sampleInventory.length });

    // Insert recipes into normalized table
    await db.delete(userSavedRecipes).where(eq(userSavedRecipes.userId, userId));
    for (const recipe of sampleRecipes) {
      await db.insert(userSavedRecipes).values({
        userId,
        itemId: recipe.id,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        isFavorite: false,
      }).onConflictDoNothing();
    }
    logger.info("Inserted recipes into normalized table", { count: sampleRecipes.length });

    // Insert meal plans into normalized table
    await db.delete(userMealPlans).where(eq(userMealPlans.userId, userId));
    for (const meal of sampleMealPlan.meals) {
      await db.insert(userMealPlans).values({
        userId,
        itemId: meal.id,
        date: meal.date,
        meals: [{ type: meal.mealType, recipeId: meal.recipeId, customMeal: meal.recipeTitle }],
      }).onConflictDoNothing();
    }
    logger.info("Inserted meal plans into normalized table", { count: sampleMealPlan.meals.length });

    // Insert shopping items into normalized table (empty for demo)
    await db.delete(userShoppingItems).where(eq(userShoppingItems.userId, userId));
    logger.info("Cleared shopping items for demo user");

    // Insert cookware items into normalized table
    await db.delete(userCookwareItems).where(eq(userCookwareItems.userId, userId));
    for (const appliance of sampleAppliances) {
      await db.insert(userCookwareItems).values({
        userId,
        itemId: appliance.id,
        name: appliance.name,
        category: appliance.type,
      }).onConflictDoNothing();
    }
    logger.info("Inserted cookware items into normalized table", { count: sampleAppliances.length });

    // Migrate preferences to userSyncKV
    const preferencesObject = {
      cuisinePreferences: ["Italian", "Asian", "Mediterranean"],
      dietaryRestrictions: [],
      notificationsEnabled: true,
    };

    await db
      .insert(userSyncKV)
      .values({
        userId,
        section: "preferences",
        data: preferencesObject,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userSyncKV.userId, userSyncKV.section],
        set: {
          data: preferencesObject,
          updatedAt: new Date(),
        },
      });
    logger.info("Migrated preferences to userSyncKV");

    // Create or update userSyncData with all JSONB columns set to null
    const existingSync = await db.query.userSyncData.findFirst({
      where: eq(userSyncData.userId, userId),
    });

    if (existingSync) {
      await db
        .update(userSyncData)
        .set({
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSyncData.userId, userId));
      logger.info("Updated sync data metadata");
    } else {
      await db.insert(userSyncData).values({
        userId,
        lastSyncedAt: new Date(),
      });
      logger.info("Created sync data record");
    }

    // Add some sample appliances (using IDs from the appliances table)
    // Clear existing appliances for demo user first
    await db.delete(userAppliances).where(eq(userAppliances.userId, userId));
    
    // Get common appliances from database
    const { appliances } = await import("@shared/schema");
    const commonAppliances = await db
      .select({ id: appliances.id, name: appliances.name })
      .from(appliances)
      .where(eq(appliances.isCommon, true))
      .limit(10);
    
    if (commonAppliances.length > 0) {
      for (const appliance of commonAppliances) {
        await db
          .insert(userAppliances)
          .values({
            userId,
            applianceId: appliance.id,
          })
          .onConflictDoNothing();
      }
      logger.info("Added appliances", { count: commonAppliances.length });
    } else {
      logger.info("No appliances found in database - skipping appliance setup");
    }

    logger.info("Demo Account Setup Complete", {
      inventoryItems: sampleInventory.length,
      recipes: sampleRecipes.length,
      mealPlans: sampleMealPlan.meals.length,
      kitchenAppliances: sampleAppliances.length,
      subscription: "Standard (1 year)",
    });

  } catch (error) {
    logger.error("Error setting up demo account", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedDemoAccount()
    .then(() => {
      logger.info("Done!");
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Failed", { error: error instanceof Error ? error.message : String(error) });
      process.exit(1);
    });
}

export { seedDemoAccount, DEMO_EMAIL, DEMO_PASSWORD };
