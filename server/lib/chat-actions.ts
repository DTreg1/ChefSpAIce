import { eq, and, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../db";
import { userSyncData, feedback, userInventoryItems, userSavedRecipes, userMealPlans, userShoppingItems, userCookwareItems, userWasteLogs, userConsumedLogs, userSyncKV } from "../../shared/schema";
import OpenAI from "openai";
import { generateRecipe as generateRecipeService, type InventoryItem } from "../services/recipeGenerationService";
import { logger } from "./logger";
import { AppError } from "../middleware/errorHandler";
import { updateSectionTimestamp } from "../routers/sync/sync-helpers";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export interface FoodItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  storageLocation: string;
  purchaseDate: string;
  expirationDate: string;
  category: string;
  notes?: string;
}

export interface WasteEntry {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  reason: string;
  wastedAt: string;
  originalItemId?: string;
}

export interface ConsumedEntry {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  consumedAt: string;
  originalItemId?: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  isChecked: boolean;
  category?: string;
  recipeId?: string;
}

export interface MealPlan {
  id: string;
  date: string;
  meals: Record<string, string | undefined>;
}

export interface NavigationInstruction {
  screen: string;
  params?: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
  actionType: string;
  navigateTo?: NavigationInstruction;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultExpirationDate(daysFromNow: number = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export const chatFunctionDefinitions: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "add_inventory_item",
      description: "Add a new food item to the user's pantry inventory. Use this when the user says they bought something, added something to their pantry, or wants to track a new item.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The name of the food item (e.g., 'Chicken Breast', 'Milk', 'Apples')"
          },
          quantity: {
            type: "number",
            description: "The quantity of the item (e.g., 2, 1.5, 12)"
          },
          unit: {
            type: "string",
            description: "The unit of measurement (e.g., 'lbs', 'oz', 'count', 'cups', 'gallons')"
          },
          storageLocation: {
            type: "string",
            enum: ["fridge", "freezer", "pantry", "counter"],
            description: "Where the item is stored"
          },
          category: {
            type: "string",
            enum: ["Produce", "Dairy", "Meat", "Seafood", "Bakery", "Frozen", "Canned", "Beverages", "Snacks", "Condiments", "Grains", "Legumes", "Pantry Staples", "Other"],
            description: "The category of the food item"
          },
          expirationDays: {
            type: "number",
            description: "Number of days until expiration. If not specified, defaults based on food type."
          },
          notes: {
            type: "string",
            description: "Optional notes about the item"
          }
        },
        required: ["name", "quantity", "unit", "storageLocation", "category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "consume_inventory_item",
      description: "Mark a food item as consumed/used. Use this when the user says they ate something, used an ingredient, or cooked with something from their inventory.",
      parameters: {
        type: "object",
        properties: {
          itemName: {
            type: "string",
            description: "The name of the item that was consumed"
          },
          quantity: {
            type: "number",
            description: "How much was consumed"
          },
          unit: {
            type: "string",
            description: "The unit of measurement"
          },
          removeCompletely: {
            type: "boolean",
            description: "If true, removes the entire item from inventory. If false, just reduces the quantity."
          }
        },
        required: ["itemName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "waste_inventory_item",
      description: "Log a food item as wasted/thrown away. Use this when the user says something went bad, expired, or they had to throw something out.",
      parameters: {
        type: "object",
        properties: {
          itemName: {
            type: "string",
            description: "The name of the item that was wasted"
          },
          quantity: {
            type: "number",
            description: "How much was wasted"
          },
          unit: {
            type: "string",
            description: "The unit of measurement"
          },
          reason: {
            type: "string",
            enum: ["expired", "spoiled", "forgot", "didn't like", "too much", "other"],
            description: "Why the item was wasted"
          },
          removeCompletely: {
            type: "boolean",
            description: "If true, removes the entire item from inventory. If false, just reduces the quantity."
          }
        },
        required: ["itemName", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_recipe",
      description: "Generate a recipe based on the user's available ingredients. Use this when the user asks for recipe ideas, wants to know what to cook, or asks for meal suggestions.",
      parameters: {
        type: "object",
        properties: {
          mealType: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner", "snack"],
            description: "The type of meal"
          },
          cuisine: {
            type: "string",
            description: "Preferred cuisine style (e.g., 'Italian', 'Mexican', 'Asian')"
          },
          maxTime: {
            type: "number",
            description: "Maximum cooking time in minutes"
          },
          servings: {
            type: "number",
            description: "Number of servings"
          },
          prioritizeExpiring: {
            type: "boolean",
            description: "Whether to prioritize ingredients that are expiring soon"
          },
          quickRecipe: {
            type: "boolean",
            description: "If true, generate a recipe that can be made in under 20 minutes"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "open_recipe_customizer",
      description: "Open the recipe customization screen where the user can configure all recipe generation options. Use this when the user wants to customize their recipe settings, wants full control over recipe generation, or asks to open the recipe generator.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_meal_plan",
      description: "Create a weekly meal plan for the user. IMPORTANT: Before calling this function, you MUST first ask the user about their meal planning style if they haven't specified it. Ask if they want: 1) 'Batch prep' - cook all meals on one day to eat throughout the week, 2) 'Daily variety' - cook fresh meals each day with different recipes, or 3) 'Mixed' - some prep-ahead meals and some fresh cooking. Only call this function after you know their preference.",
      parameters: {
        type: "object",
        properties: {
          startDate: {
            type: "string",
            description: "The start date for the meal plan (YYYY-MM-DD format). Defaults to today."
          },
          daysCount: {
            type: "number",
            description: "Number of days to plan for (1-7). Defaults to 7."
          },
          mealsPerDay: {
            type: "array",
            items: {
              type: "string",
              enum: ["breakfast", "lunch", "dinner", "snack"]
            },
            description: "Which meals to include in the plan"
          },
          dietaryRestrictions: {
            type: "string",
            description: "Any dietary restrictions to consider"
          },
          planningStyle: {
            type: "string",
            enum: ["batch_prep", "daily_variety", "mixed"],
            description: "The meal planning style: 'batch_prep' for cooking all meals on one day to reheat throughout the week (meal prep Sunday style), 'daily_variety' for cooking fresh meals each day with different recipes, 'mixed' for a combination of some prep-ahead meals and some fresh cooking."
          }
        },
        required: ["planningStyle"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_to_shopping_list",
      description: "Add items to the user's shopping list. Use this when the user says they need to buy something, are running low on something, or want to add items to their grocery list.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Name of the item to buy" },
                quantity: { type: "number", description: "Quantity needed" },
                unit: { type: "string", description: "Unit of measurement" },
                category: { type: "string", description: "Category for grouping in store" }
              },
              required: ["name"]
            },
            description: "List of items to add to the shopping list"
          }
        },
        required: ["items"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_inventory_summary",
      description: "Get a summary of the user's current inventory. Use this when the user asks what they have, wants to know their stock, or asks about specific items.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "Filter by specific category"
          },
          expiringOnly: {
            type: "boolean",
            description: "Only show items expiring within 5 days"
          },
          storageLocation: {
            type: "string",
            enum: ["fridge", "freezer", "pantry", "counter"],
            description: "Filter by storage location"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "save_feedback",
      description: "Save user feedback or bug report. Use this when the user wants to send feedback, report a bug, make a suggestion, or report an issue with the app.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["feedback", "bug"],
            description: "Whether this is general feedback or a bug report"
          },
          category: {
            type: "string",
            enum: ["suggestion", "general", "compliment", "question", "crash", "ui", "data", "performance"],
            description: "The category of feedback. For feedback: suggestion, general, compliment, question. For bugs: crash, ui, data, performance."
          },
          message: {
            type: "string",
            description: "The main content of the feedback or bug description"
          },
          stepsToReproduce: {
            type: "string",
            description: "For bug reports: steps to reproduce the issue"
          },
          severity: {
            type: "string",
            enum: ["minor", "major", "critical"],
            description: "For bug reports: how severe is the issue"
          },
          userEmail: {
            type: "string",
            description: "User's email for follow-up (optional)"
          }
        },
        required: ["type", "message"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "lookup_nutrition",
      description: "Look up detailed nutrition information for a food item. Use this when the user asks about calories, macros, nutrition facts, or nutritional content of any food. Can look up by food name or by a specific item in their inventory.",
      parameters: {
        type: "object",
        properties: {
          foodName: {
            type: "string",
            description: "The name of the food to look up (e.g., 'chicken breast', 'brown rice', 'avocado'). Required unless inventoryItemName is provided."
          },
          brand: {
            type: "string",
            description: "Optional brand name for more specific results (e.g., 'Chobani', 'Barilla')"
          },
          inventoryItemName: {
            type: "string",
            description: "Look up nutrition for an item already in the user's inventory by matching this name. When provided, foodName is optional — the matched inventory item's name will be used."
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_inventory_levels",
      description: "Check inventory levels for specific items, find items that are running low, or check what's expiring soon. More targeted than the general inventory summary. Use when the user asks 'do I have enough X?', 'what's about to expire?', 'am I running low on anything?', or 'how much X do I have?'.",
      parameters: {
        type: "object",
        properties: {
          itemNames: {
            type: "array",
            items: { type: "string" },
            description: "Specific item names to check (e.g., ['milk', 'eggs', 'butter'])"
          },
          checkExpiring: {
            type: "boolean",
            description: "If true, find all items expiring within the specified days"
          },
          expiringWithinDays: {
            type: "number",
            description: "Number of days to check for expiring items. Defaults to 3."
          },
          checkLowStock: {
            type: "boolean",
            description: "If true, identify items with quantity of 1 or less"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "remove_shopping_items",
      description: "Mark items as purchased or remove items from the shopping list. Use when the user says they bought items, picked something up, or wants to clear items from their list.",
      parameters: {
        type: "object",
        properties: {
          itemNames: {
            type: "array",
            items: { type: "string" },
            description: "Names of items to mark as purchased or remove"
          },
          markAsPurchased: {
            type: "boolean",
            description: "If true, mark items as checked/purchased. If false, remove them entirely. Defaults to true."
          },
          clearAll: {
            type: "boolean",
            description: "If true, clear all checked/purchased items from the list"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_meal_plan",
      description: "Update or swap a meal in an existing meal plan. Use when the user wants to change a specific meal, swap dinner for something else, or modify their plan for a particular day.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "The date to modify (YYYY-MM-DD format)"
          },
          mealSlot: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner", "snack"],
            description: "Which meal slot to update"
          },
          newMeal: {
            type: "string",
            description: "The new meal name and description"
          },
          clearDay: {
            type: "boolean",
            description: "If true, clear all meals for the specified date"
          }
        },
        required: ["date"]
      }
    }
  }
];

export async function getUserSyncData(userId: string) {
  const [inventoryRows, recipeRows, mealPlanRows, shoppingRows, cookwareRows, wasteLogRows, consumedLogRows, preferencesRow] = await Promise.all([
    db.select().from(userInventoryItems).where(and(eq(userInventoryItems.userId, userId), isNull(userInventoryItems.deletedAt))),
    db.select().from(userSavedRecipes).where(eq(userSavedRecipes.userId, userId)),
    db.select().from(userMealPlans).where(eq(userMealPlans.userId, userId)),
    db.select().from(userShoppingItems).where(eq(userShoppingItems.userId, userId)),
    db.select().from(userCookwareItems).where(eq(userCookwareItems.userId, userId)),
    db.select().from(userWasteLogs).where(eq(userWasteLogs.userId, userId)),
    db.select().from(userConsumedLogs).where(eq(userConsumedLogs.userId, userId)),
    db.select().from(userSyncKV).where(and(eq(userSyncKV.userId, userId), eq(userSyncKV.section, "preferences"))).limit(1),
  ]);

  const inventory = inventoryRows.map(item => ({
    id: item.itemId,
    name: item.name,
    barcode: item.barcode,
    quantity: item.quantity,
    unit: item.unit,
    storageLocation: item.storageLocation,
    purchaseDate: item.purchaseDate,
    expirationDate: item.expirationDate,
    category: item.category,
    usdaCategory: item.usdaCategory,
    nutrition: item.nutrition,
    notes: item.notes,
    imageUri: item.imageUri,
    fdcId: item.fdcId,
    updatedAt: item.updatedAt?.toISOString(),
  }));

  const recipes = recipeRows.map(r => ({
    id: r.itemId,
    title: r.title,
    description: r.description,
    ingredients: r.ingredients,
    instructions: r.instructions,
    prepTime: r.prepTime,
    cookTime: r.cookTime,
    servings: r.servings,
    imageUri: r.imageUri,
    cloudImageUri: r.cloudImageUri,
    nutrition: r.nutrition,
    isFavorite: r.isFavorite,
    ...(r.extraData as Record<string, unknown> || {}),
    updatedAt: r.updatedAt?.toISOString(),
  }));

  const mealPlans = mealPlanRows.map(mp => ({
    id: mp.itemId,
    date: mp.date,
    meals: mp.meals,
    ...(mp.extraData as Record<string, unknown> || {}),
    updatedAt: mp.updatedAt?.toISOString(),
  }));

  const shoppingList = shoppingRows.map(s => ({
    id: s.itemId,
    name: s.name,
    quantity: s.quantity,
    unit: s.unit,
    isChecked: s.isChecked,
    category: s.category,
    recipeId: s.recipeId,
    ...(s.extraData as Record<string, unknown> || {}),
    updatedAt: s.updatedAt?.toISOString(),
  }));

  const cookware = cookwareRows.map(c => ({
    id: c.itemId,
    name: c.name,
    category: c.category,
    alternatives: c.alternatives,
    ...(c.extraData as Record<string, unknown> || {}),
    updatedAt: c.updatedAt?.toISOString(),
  }));

  return {
    inventory,
    recipes,
    mealPlans,
    shoppingList,
    wasteLog: wasteLogRows.map(row => ({
      itemName: row.itemName,
      quantity: row.quantity,
      unit: row.unit,
      reason: row.reason,
      date: row.date,
      ...(row.extraData as Record<string, unknown> || {}),
    })),
    consumedLog: consumedLogRows.map(row => ({
      itemName: row.itemName,
      quantity: row.quantity,
      unit: row.unit,
      date: row.date,
      ...(row.extraData as Record<string, unknown> || {}),
    })),
    preferences: preferencesRow.length > 0 ? preferencesRow[0].data : null,
    cookware,
  };
}

async function updateUserSyncData(userId: string, updates: Record<string, unknown>) {
  if (updates.mealPlans !== undefined) {
    const mealPlans = updates.mealPlans as Array<Record<string, unknown>>;
    await db.delete(userMealPlans).where(eq(userMealPlans.userId, userId));
    if (Array.isArray(mealPlans) && mealPlans.length > 0) {
      await db.insert(userMealPlans).values(mealPlans.map((mp) => ({
        userId,
        itemId: String(mp.id),
        date: String(mp.date || ""),
        meals: mp.meals ?? null,
      })));
    }
  }

  const syncPayload: Record<string, unknown> = {
    lastSyncedAt: new Date(),
    updatedAt: new Date(),
  };

  await db
    .insert(userSyncData)
    .values({
      userId,
      ...syncPayload,
    })
    .onConflictDoUpdate({
      target: userSyncData.userId,
      set: syncPayload,
    });
}

export async function executeAddInventoryItem(
  userId: string,
  args: {
    name: string;
    quantity: number;
    unit: string;
    storageLocation: string;
    category: string;
    expirationDays?: number;
    notes?: string;
  }
): Promise<ActionResult> {
  try {
    const itemId = generateId();
    const purchaseDate = getTodayDate();
    const expirationDate = getDefaultExpirationDate(args.expirationDays || 7);

    await db.insert(userInventoryItems).values({
      userId,
      itemId,
      name: args.name,
      quantity: args.quantity,
      unit: args.unit,
      storageLocation: args.storageLocation,
      category: args.category,
      purchaseDate,
      expirationDate,
      notes: args.notes || null,
      updatedAt: new Date(),
    });

    await updateSectionTimestamp(userId, "inventory");

    const newItem: FoodItem = {
      id: itemId,
      name: args.name,
      quantity: args.quantity,
      unit: args.unit,
      storageLocation: args.storageLocation,
      category: args.category,
      purchaseDate,
      expirationDate,
      notes: args.notes
    };

    return {
      success: true,
      message: `Added ${args.quantity} ${args.unit} of ${args.name} to your ${args.storageLocation}.`,
      data: newItem,
      actionType: "add_inventory_item"
    };
  } catch (error) {
    logger.error("Error adding inventory item", { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to add ${args.name} to inventory.`,
      actionType: "add_inventory_item"
    };
  }
}

export async function executeConsumeItem(
  userId: string,
  args: {
    itemName: string;
    quantity?: number;
    unit?: string;
    removeCompletely?: boolean;
  }
): Promise<ActionResult> {
  try {
    const inventoryRows = await db.select().from(userInventoryItems).where(
      and(eq(userInventoryItems.userId, userId), isNull(userInventoryItems.deletedAt))
    );

    const itemNameLower = args.itemName.toLowerCase();
    const matchedRow = inventoryRows.find(
      (item) => item.name.toLowerCase().includes(itemNameLower) ||
        itemNameLower.includes(item.name.toLowerCase())
    );

    if (!matchedRow) {
      return {
        success: false,
        message: `Could not find "${args.itemName}" in your inventory.`,
        actionType: "consume_inventory_item"
      };
    }

    const consumedEntry: ConsumedEntry = {
      id: generateId(),
      itemName: matchedRow.name,
      quantity: args.quantity || matchedRow.quantity,
      unit: args.unit || matchedRow.unit,
      consumedAt: new Date().toISOString(),
      originalItemId: matchedRow.itemId
    };

    if (args.removeCompletely || !args.quantity || args.quantity >= matchedRow.quantity) {
      await db.delete(userInventoryItems).where(
        and(eq(userInventoryItems.userId, userId), eq(userInventoryItems.itemId, matchedRow.itemId))
      );
    } else {
      await db.update(userInventoryItems).set({
        quantity: matchedRow.quantity - args.quantity,
        updatedAt: new Date(),
      }).where(
        and(eq(userInventoryItems.userId, userId), eq(userInventoryItems.itemId, matchedRow.itemId))
      );
    }

    await db.insert(userConsumedLogs).values({
      userId,
      entryId: randomUUID(),
      itemName: consumedEntry.itemName,
      quantity: consumedEntry.quantity,
      unit: consumedEntry.unit,
      date: consumedEntry.consumedAt,
    });

    await updateSectionTimestamp(userId, "consumedLog");
    await updateSectionTimestamp(userId, "inventory");

    return {
      success: true,
      message: `Marked ${args.quantity || matchedRow.quantity} ${args.unit || matchedRow.unit} of ${matchedRow.name} as consumed.`,
      data: consumedEntry,
      actionType: "consume_inventory_item"
    };
  } catch (error) {
    logger.error("Error consuming item", { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to mark ${args.itemName} as consumed.`,
      actionType: "consume_inventory_item"
    };
  }
}

export async function executeWasteItem(
  userId: string,
  args: {
    itemName: string;
    quantity?: number;
    unit?: string;
    reason: string;
    removeCompletely?: boolean;
  }
): Promise<ActionResult> {
  try {
    const inventoryRows = await db.select().from(userInventoryItems).where(
      and(eq(userInventoryItems.userId, userId), isNull(userInventoryItems.deletedAt))
    );

    const itemNameLower = args.itemName.toLowerCase();
    const matchedRow = inventoryRows.find(
      (item) => item.name.toLowerCase().includes(itemNameLower) ||
        itemNameLower.includes(item.name.toLowerCase())
    );

    if (!matchedRow) {
      return {
        success: false,
        message: `Could not find "${args.itemName}" in your inventory.`,
        actionType: "waste_inventory_item"
      };
    }

    const wasteEntry: WasteEntry = {
      id: generateId(),
      itemName: matchedRow.name,
      quantity: args.quantity || matchedRow.quantity,
      unit: args.unit || matchedRow.unit,
      reason: args.reason,
      wastedAt: new Date().toISOString(),
      originalItemId: matchedRow.itemId
    };

    if (args.removeCompletely || !args.quantity || args.quantity >= matchedRow.quantity) {
      await db.delete(userInventoryItems).where(
        and(eq(userInventoryItems.userId, userId), eq(userInventoryItems.itemId, matchedRow.itemId))
      );
    } else {
      await db.update(userInventoryItems).set({
        quantity: matchedRow.quantity - args.quantity,
        updatedAt: new Date(),
      }).where(
        and(eq(userInventoryItems.userId, userId), eq(userInventoryItems.itemId, matchedRow.itemId))
      );
    }

    await db.insert(userWasteLogs).values({
      userId,
      entryId: randomUUID(),
      itemName: wasteEntry.itemName,
      quantity: wasteEntry.quantity,
      unit: wasteEntry.unit,
      reason: wasteEntry.reason,
      date: wasteEntry.wastedAt,
    });

    await updateSectionTimestamp(userId, "wasteLog");
    await updateSectionTimestamp(userId, "inventory");

    return {
      success: true,
      message: `Logged ${args.quantity || matchedRow.quantity} ${args.unit || matchedRow.unit} of ${matchedRow.name} as wasted (${args.reason}).`,
      data: wasteEntry,
      actionType: "waste_inventory_item"
    };
  } catch (error) {
    logger.error("Error logging waste", { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to log ${args.itemName} as wasted.`,
      actionType: "waste_inventory_item"
    };
  }
}

export function executeOpenRecipeCustomizer(): ActionResult {
  return {
    success: true,
    message: "Opening the recipe customization screen where you can configure all your recipe preferences.",
    actionType: "open_recipe_customizer",
    navigateTo: {
      screen: "GenerateRecipe",
      params: {}
    }
  };
}

export async function executeGenerateRecipe(
  userId: string,
  args: {
    mealType?: string;
    cuisine?: string;
    maxTime?: number;
    servings?: number;
    prioritizeExpiring?: boolean;
    quickRecipe?: boolean;
  }
): Promise<ActionResult> {
  try {
    const userData = await getUserSyncData(userId);
    
    if (userData.inventory.length === 0) {
      return {
        success: false,
        message: "You don't have any items in your inventory yet. Add some ingredients first, and I can suggest recipes based on what you have!",
        actionType: "generate_recipe"
      };
    }

    const inventoryForService: InventoryItem[] = userData.inventory.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: item.expirationDate || "",
    }));

    const validMealType = args.mealType as "breakfast" | "lunch" | "dinner" | "snack" | "late night snack" | undefined;

    const result = await generateRecipeService({
      userId,
      prioritizeExpiring: args.prioritizeExpiring,
      quickRecipe: args.quickRecipe,
      servings: args.servings || 4,
      maxTime: args.maxTime || 60,
      cuisine: args.cuisine,
      mealType: validMealType,
      inventory: inventoryForService,
    });

    if (!result.success || !result.recipe) {
      return {
        success: false,
        message: result.error || "Failed to generate a recipe. Please try again.",
        actionType: "generate_recipe"
      };
    }

    const recipeToSave = result.recipe;
    await db.insert(userSavedRecipes).values({
      userId,
      itemId: recipeToSave.id,
      title: recipeToSave.title,
      description: recipeToSave.description || null,
      ingredients: recipeToSave.ingredients || null,
      instructions: recipeToSave.instructions || null,
      prepTime: recipeToSave.prepTime || null,
      cookTime: recipeToSave.cookTime || null,
      servings: recipeToSave.servings || null,
      imageUri: (recipeToSave as any).imageUri || null,
      cloudImageUri: null,
      nutrition: recipeToSave.nutrition || null,
      isFavorite: recipeToSave.isFavorite ?? false,
      extraData: null,
    });
    await updateSectionTimestamp(userId, "recipes");

    return {
      success: true,
      message: `Generated recipe: ${result.recipe.title}. ${result.recipe.description}`,
      data: result.recipe,
      actionType: "generate_recipe",
      navigateTo: {
        screen: "RecipeDetail",
        params: { recipeId: result.recipe.id }
      }
    };
  } catch (error) {
    const errorMessage = error instanceof AppError ? error.message : "Failed to generate a recipe. Please try again.";
    logger.error("Error generating recipe", {
      error: error instanceof Error ? error.message : String(error),
      code: error instanceof AppError ? error.errorCode : undefined,
    });
    return {
      success: false,
      message: errorMessage,
      actionType: "generate_recipe"
    };
  }
}

export async function executeCreateMealPlan(
  userId: string,
  args: {
    startDate?: string;
    daysCount?: number;
    mealsPerDay?: string[];
    dietaryRestrictions?: string;
    planningStyle: "batch_prep" | "daily_variety" | "mixed";
  }
): Promise<ActionResult> {
  try {
    // Runtime validation: require planningStyle
    if (!args.planningStyle) {
      return {
        success: false,
        message: "Before I create your meal plan, I need to know your preference! Would you like:\n\n1. **Batch prep** - Cook all meals on one day (like Sunday meal prep) to eat throughout the week\n2. **Daily variety** - Cook fresh meals each day with different recipes\n3. **Mixed** - Some prep-ahead meals and some fresh cooking\n\nWhich style works best for you?",
        actionType: "create_meal_plan"
      };
    }

    const userData = await getUserSyncData(userId);
    
    if (userData.inventory.length === 0) {
      return {
        success: false,
        message: "You need some ingredients in your inventory first to create a meal plan.",
        actionType: "create_meal_plan"
      };
    }

    const inventoryList = userData.inventory.map((item) => item.name).join(", ");
    const daysCount = args.daysCount || 7;
    const mealsPerDay = args.mealsPerDay || ["breakfast", "lunch", "dinner"];
    const planningStyle = args.planningStyle;
    
    // Build style-specific instructions
    let styleInstructions = "";
    let styleDescription = "";
    switch (planningStyle) {
      case "batch_prep":
        styleInstructions = `- BATCH PREP STYLE: Design meals that can all be cooked on ONE day (like Sunday meal prep) and stored/reheated throughout the week
- Focus on dishes that reheat well: casseroles, grain bowls, soups, stews, roasted proteins, and sturdy salads
- Group similar cooking tasks together (e.g., roast multiple proteins at once, cook all grains together)
- Include prep instructions noting what can be made ahead
- Avoid dishes that don't hold well (crispy items, delicate salads, etc.)
- Focus on balanced nutrition throughout the week`;
        styleDescription = "batch prep";
        break;
      case "daily_variety":
        styleInstructions = `- DAILY VARIETY STYLE: Design fresh meals to be cooked each day with maximum variety
- Each day should have distinct flavors and cuisines
- Include quick weeknight meals (under 30 min) for busy days
- Vary cooking methods throughout the week
- Prioritize freshness and diverse ingredients
- Focus on balanced nutrition throughout the week`;
        styleDescription = "daily variety";
        break;
      case "mixed":
        styleInstructions = `- MIXED STYLE: Combine some prep-ahead meals with some fresh daily cooking
- Plan 2-3 meals that can be batch prepped on the weekend
- Include 2-3 quick fresh meals for variety during the week
- For EVERY meal, add a tag at the end: [PREP AHEAD] or [COOK FRESH]
- Balance convenience with variety
- Focus on balanced nutrition throughout the week`;
        styleDescription = "mixed (prep-ahead + fresh)";
        break;
    }
    
    const mealPlanPrompt = `Create a ${daysCount}-day meal plan using these available ingredients: ${inventoryList}

Planning Style: ${styleDescription.toUpperCase()}

Requirements:
- Include these meals each day: ${mealsPerDay.join(", ")}
${args.dietaryRestrictions ? `- Dietary restrictions: ${args.dietaryRestrictions}` : ""}
${styleInstructions}
- Use the available ingredients efficiently

Return as JSON:
{
  "days": [
    {
      "dayNumber": 1,
      "meals": {
        "breakfast": "Meal name and brief description${planningStyle === "mixed" ? " [PREP AHEAD or COOK FRESH]" : ""}",
        "lunch": "Meal name and brief description${planningStyle === "mixed" ? " [PREP AHEAD or COOK FRESH]" : ""}",
        "dinner": "Meal name and brief description${planningStyle === "mixed" ? " [PREP AHEAD or COOK FRESH]" : ""}"
      }
    }
  ],
  "shoppingNeeded": ["any additional items needed"]${planningStyle === "batch_prep" ? ',\n  "prepDayInstructions": "Brief overview of batch cooking order and tips"' : ""}
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a meal planning expert. Create practical, balanced meal plans using available ingredients. Always respond with valid JSON."
        },
        { role: "user", content: mealPlanPrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048
    });

    const planContent = completion.choices[0]?.message?.content;
    if (!planContent) {
      throw new Error("No meal plan generated");
    }

    const planData = JSON.parse(planContent);
    const startDate = args.startDate || getTodayDate();
    
    const mealPlans = planData.days.map((day: { dayNumber: number; meals: Record<string, string> }, index: number) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + index);
      return {
        id: generateId(),
        date: date.toISOString().split('T')[0],
        meals: day.meals
      };
    });

    for (const mp of mealPlans) {
      await db.insert(userMealPlans).values({
        userId,
        itemId: mp.id,
        date: mp.date,
        meals: mp.meals,
        extraData: null,
      });
    }

    if (planData.shoppingNeeded && planData.shoppingNeeded.length > 0) {
      const newShoppingItems = planData.shoppingNeeded.map((item: string) => ({
        id: generateId(),
        name: item,
        quantity: 1,
        unit: "item",
        isChecked: false
      }));
      for (const si of newShoppingItems) {
        await db.insert(userShoppingItems).values({
          userId,
          itemId: si.id,
          name: si.name,
          quantity: si.quantity,
          unit: si.unit,
          isChecked: si.isChecked,
          extraData: null,
        });
      }
    }

    await updateSectionTimestamp(userId, "mealPlans");
    await updateSectionTimestamp(userId, "shoppingList");

    let message = `Created a ${daysCount}-day ${styleDescription} meal plan for you!`;
    if (planningStyle === "batch_prep" && planData.prepDayInstructions) {
      message += ` Prep day tip: ${planData.prepDayInstructions}`;
    }
    if (planData.shoppingNeeded && planData.shoppingNeeded.length > 0) {
      message += ` Also added ${planData.shoppingNeeded.length} items to your shopping list.`;
    }

    return {
      success: true,
      message,
      data: { mealPlans, shoppingNeeded: planData.shoppingNeeded, prepDayInstructions: planData.prepDayInstructions },
      actionType: "create_meal_plan"
    };
  } catch (error) {
    logger.error("Error creating meal plan", { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: "Failed to create meal plan. Please try again.",
      actionType: "create_meal_plan"
    };
  }
}

export async function executeAddToShoppingList(
  userId: string,
  args: {
    items: Array<{
      name: string;
      quantity?: number;
      unit?: string;
      category?: string;
    }>;
  }
): Promise<ActionResult> {
  try {
    const newItems: ShoppingListItem[] = [];

    for (const item of args.items) {
      const itemId = generateId();
      await db.insert(userShoppingItems).values({
        userId,
        itemId,
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || "item",
        isChecked: false,
        category: item.category || null,
        updatedAt: new Date(),
      });
      newItems.push({
        id: itemId,
        name: item.name,
        quantity: item.quantity || 1,
        unit: item.unit || "item",
        isChecked: false,
        category: item.category,
      });
    }

    await updateSectionTimestamp(userId, "shoppingList");

    const itemNames = args.items.map(i => i.name).join(", ");
    return {
      success: true,
      message: `Added ${args.items.length} item(s) to your shopping list: ${itemNames}`,
      data: newItems,
      actionType: "add_to_shopping_list"
    };
  } catch (error) {
    logger.error("Error adding to shopping list", { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: "Failed to add items to shopping list.",
      actionType: "add_to_shopping_list"
    };
  }
}

export async function executeGetInventorySummary(
  userId: string,
  args: {
    category?: string;
    expiringOnly?: boolean;
    storageLocation?: string;
  }
): Promise<ActionResult> {
  try {
    const userData = await getUserSyncData(userId);
    let inventory = userData.inventory as FoodItem[];

    if (args.category) {
      inventory = inventory.filter(item => 
        item.category.toLowerCase() === args.category!.toLowerCase()
      );
    }

    if (args.storageLocation) {
      inventory = inventory.filter(item => 
        item.storageLocation === args.storageLocation
      );
    }

    if (args.expiringOnly) {
      const fiveDaysFromNow = new Date();
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);
      inventory = inventory.filter(item => {
        const expDate = new Date(item.expirationDate);
        return expDate <= fiveDaysFromNow;
      });
    }

    if (inventory.length === 0) {
      return {
        success: true,
        message: args.expiringOnly 
          ? "You don't have any items expiring soon. Great job managing your pantry!"
          : "Your inventory is empty. Would you like to add some items?",
        data: [],
        actionType: "get_inventory_summary"
      };
    }

    const summary = inventory.map(item => 
      `${item.quantity} ${item.unit} ${item.name} (${item.storageLocation})`
    ).join("\n");

    return {
      success: true,
      message: `Here's what you have:\n${summary}`,
      data: inventory,
      actionType: "get_inventory_summary"
    };
  } catch (error) {
    logger.error("Error getting inventory summary", { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: "Failed to retrieve inventory.",
      actionType: "get_inventory_summary"
    };
  }
}

export async function executeSaveFeedback(
  userId: string | null,
  args: {
    type: "feedback" | "bug";
    category?: string;
    message: string;
    stepsToReproduce?: string;
    severity?: "minor" | "major" | "critical";
    userEmail?: string;
  }
): Promise<ActionResult> {
  try {
    const feedbackEntry = await db
      .insert(feedback)
      .values({
        userId,
        type: args.type,
        category: args.category || null,
        message: args.message,
        userEmail: args.userEmail || null,
        stepsToReproduce: args.stepsToReproduce || null,
        severity: args.severity || null,
        status: "new",
      })
      .returning();

    logger.info("Feedback saved", { feedbackId: feedbackEntry[0].id });

    const thankYouMessage = args.type === "bug"
      ? "Thank you for reporting this issue! Our team will look into it and work on a fix."
      : "Thank you for your feedback! We really appreciate you taking the time to share your thoughts.";

    return {
      success: true,
      message: thankYouMessage,
      data: { feedbackId: feedbackEntry[0].id },
      actionType: "save_feedback"
    };
  } catch (error) {
    logger.error("Error saving feedback", { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: "I'm sorry, there was an issue saving your feedback. Please try again later.",
      actionType: "save_feedback"
    };
  }
}

export async function executeLookupNutrition(
  userId: string | null,
  args: {
    foodName?: string;
    brand?: string;
    inventoryItemName?: string;
  }
): Promise<ActionResult> {
  try {
    const { lookupNutritionByName } = await import("../services/nutritionLookupService");
    
    let lookupName = args.foodName;
    let lookupBrand = args.brand;

    if (args.inventoryItemName && userId) {
      const userData = await getUserSyncData(userId);
      const searchLower = args.inventoryItemName.toLowerCase();
      const match = (userData.inventory as FoodItem[]).find(
        (item) => item.name.toLowerCase().includes(searchLower) ||
          searchLower.includes(item.name.toLowerCase())
      );
      if (match) {
        lookupName = match.name;
      } else if (!lookupName) {
        lookupName = args.inventoryItemName;
      }
    }

    if (!lookupName) {
      return {
        success: false,
        message: "Please specify a food name or an inventory item to look up nutrition for.",
        actionType: "lookup_nutrition"
      };
    }

    const nutrition = await lookupNutritionByName(lookupName, lookupBrand);
    
    if (!nutrition) {
      return {
        success: false,
        message: `Could not find nutrition data for "${lookupName}"${lookupBrand ? ` (${lookupBrand})` : ""}. Try a more general food name.`,
        actionType: "lookup_nutrition"
      };
    }

    const summary = [
      `Nutrition for ${nutrition.foodName}${nutrition.brand ? ` (${nutrition.brand})` : ""}:`,
      `Serving size: ${nutrition.servingSize}`,
      `Calories: ${nutrition.calories}`,
      `Total Fat: ${nutrition.totalFat}g${nutrition.saturatedFat != null ? ` (Saturated: ${nutrition.saturatedFat}g)` : ""}`,
      `Total Carbs: ${nutrition.totalCarbohydrates}g${nutrition.dietaryFiber != null ? ` (Fiber: ${nutrition.dietaryFiber}g)` : ""}`,
      `Protein: ${nutrition.protein}g`,
      nutrition.sodium != null ? `Sodium: ${nutrition.sodium}mg` : null,
      nutrition.cholesterol != null ? `Cholesterol: ${nutrition.cholesterol}mg` : null,
    ].filter(Boolean).join("\n");

    return {
      success: true,
      message: summary,
      data: nutrition,
      actionType: "lookup_nutrition"
    };
  } catch (error) {
    logger.error("Error looking up nutrition", { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: `Failed to look up nutrition for "${args.foodName || args.inventoryItemName}".`,
      actionType: "lookup_nutrition"
    };
  }
}

export async function executeCheckInventoryLevels(
  userId: string,
  args: {
    itemNames?: string[];
    checkExpiring?: boolean;
    expiringWithinDays?: number;
    checkLowStock?: boolean;
  }
): Promise<ActionResult> {
  try {
    const userData = await getUserSyncData(userId);
    const inventory = userData.inventory as FoodItem[];

    if (inventory.length === 0) {
      return {
        success: true,
        message: "Your inventory is empty. Add some items to start tracking!",
        data: { items: [], expiring: [], lowStock: [] },
        actionType: "check_inventory_levels"
      };
    }

    const results: string[] = [];
    const responseData: Record<string, unknown> = {};

    if (args.itemNames && args.itemNames.length > 0) {
      const found: FoodItem[] = [];
      const notFound: string[] = [];

      for (const searchName of args.itemNames) {
        const searchLower = searchName.toLowerCase();
        const match = inventory.find(
          (item) => item.name.toLowerCase().includes(searchLower) ||
            searchLower.includes(item.name.toLowerCase())
        );
        if (match) {
          found.push(match);
        } else {
          notFound.push(searchName);
        }
      }

      if (found.length > 0) {
        results.push("Found items:");
        for (const item of found) {
          const daysUntilExpiry = item.expirationDate
            ? Math.ceil((new Date(item.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
          let status = `${item.quantity} ${item.unit} of ${item.name} (${item.storageLocation})`;
          if (daysUntilExpiry !== null) {
            if (daysUntilExpiry < 0) status += " - EXPIRED";
            else if (daysUntilExpiry <= 2) status += ` - expires in ${daysUntilExpiry} day(s)!`;
            else if (daysUntilExpiry <= 5) status += ` - expires in ${daysUntilExpiry} days`;
          }
          results.push(`  - ${status}`);
        }
      }

      if (notFound.length > 0) {
        results.push(`Not in inventory: ${notFound.join(", ")}`);
      }

      responseData.found = found;
      responseData.notFound = notFound;
    }

    if (args.checkExpiring) {
      const days = args.expiringWithinDays || 3;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);

      const expiring = inventory.filter((item) => {
        if (!item.expirationDate) return false;
        const expDate = new Date(item.expirationDate);
        return expDate <= cutoff;
      }).sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());

      if (expiring.length > 0) {
        results.push(`Items expiring within ${days} days:`);
        for (const item of expiring) {
          const daysLeft = Math.ceil((new Date(item.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          const urgency = daysLeft < 0 ? "EXPIRED" : daysLeft === 0 ? "expires today" : `${daysLeft} day(s) left`;
          results.push(`  - ${item.quantity} ${item.unit} ${item.name} (${urgency})`);
        }
      } else {
        results.push(`No items expiring within ${days} days.`);
      }

      responseData.expiring = expiring;
    }

    if (args.checkLowStock) {
      const lowStock = inventory.filter((item) => item.quantity <= 1);

      if (lowStock.length > 0) {
        results.push("Low stock items:");
        for (const item of lowStock) {
          results.push(`  - ${item.quantity} ${item.unit} ${item.name}`);
        }
      } else {
        results.push("No items are running low.");
      }

      responseData.lowStock = lowStock;
    }

    if (results.length === 0) {
      results.push(`You have ${inventory.length} items in your inventory.`);
    }

    return {
      success: true,
      message: results.join("\n"),
      data: responseData,
      actionType: "check_inventory_levels"
    };
  } catch (error) {
    logger.error("Error checking inventory levels", { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: "Failed to check inventory levels.",
      actionType: "check_inventory_levels"
    };
  }
}

export async function executeRemoveShoppingItems(
  userId: string,
  args: {
    itemNames?: string[];
    markAsPurchased?: boolean;
    clearAll?: boolean;
  }
): Promise<ActionResult> {
  try {
    const shoppingRows = await db.select().from(userShoppingItems).where(eq(userShoppingItems.userId, userId));

    if (shoppingRows.length === 0) {
      return {
        success: true,
        message: "Your shopping list is already empty.",
        actionType: "remove_shopping_items"
      };
    }

    if (args.clearAll) {
      const checkedItems = shoppingRows.filter((i) => i.isChecked);
      const checkedCount = checkedItems.length;
      for (const item of checkedItems) {
        await db.delete(userShoppingItems).where(
          and(eq(userShoppingItems.userId, userId), eq(userShoppingItems.itemId, item.itemId))
        );
      }
      await updateSectionTimestamp(userId, "shoppingList");
      return {
        success: true,
        message: checkedCount > 0
          ? `Cleared ${checkedCount} purchased item(s) from your shopping list. ${shoppingRows.length - checkedCount} item(s) remaining.`
          : "No purchased items to clear.",
        data: { cleared: checkedCount, remaining: shoppingRows.length - checkedCount },
        actionType: "remove_shopping_items"
      };
    }

    if (!args.itemNames || args.itemNames.length === 0) {
      return {
        success: false,
        message: "Please specify which items to update on your shopping list.",
        actionType: "remove_shopping_items"
      };
    }

    const updated: string[] = [];
    const notFound: string[] = [];
    const markPurchased = args.markAsPurchased !== false;

    for (const searchName of args.itemNames) {
      const searchLower = searchName.toLowerCase();
      const matchedRow = shoppingRows.find(
        (item) => item.name.toLowerCase().includes(searchLower) ||
          searchLower.includes(item.name.toLowerCase())
      );

      if (matchedRow) {
        if (markPurchased) {
          await db.update(userShoppingItems).set({
            isChecked: true,
            updatedAt: new Date(),
          }).where(
            and(eq(userShoppingItems.userId, userId), eq(userShoppingItems.itemId, matchedRow.itemId))
          );
          updated.push(matchedRow.name);
        } else {
          await db.delete(userShoppingItems).where(
            and(eq(userShoppingItems.userId, userId), eq(userShoppingItems.itemId, matchedRow.itemId))
          );
          updated.push(matchedRow.name);
        }
      } else {
        notFound.push(searchName);
      }
    }

    await updateSectionTimestamp(userId, "shoppingList");

    const parts: string[] = [];
    if (updated.length > 0) {
      parts.push(markPurchased
        ? `Marked as purchased: ${updated.join(", ")}`
        : `Removed from list: ${updated.join(", ")}`
      );
    }
    if (notFound.length > 0) {
      parts.push(`Not found on list: ${notFound.join(", ")}`);
    }

    return {
      success: true,
      message: parts.join(". "),
      data: { updated, notFound },
      actionType: "remove_shopping_items"
    };
  } catch (error) {
    logger.error("Error updating shopping list", { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: "Failed to update shopping list.",
      actionType: "remove_shopping_items"
    };
  }
}

export async function executeUpdateMealPlan(
  userId: string,
  args: {
    date: string;
    mealSlot?: string;
    newMeal?: string;
    clearDay?: boolean;
  }
): Promise<ActionResult> {
  try {
    const userData = await getUserSyncData(userId);
    const mealPlans = userData.mealPlans as MealPlan[];

    const planIdx = mealPlans.findIndex((p) => p.date === args.date);

    if (args.clearDay) {
      if (planIdx === -1) {
        return {
          success: false,
          message: `No meal plan found for ${args.date}.`,
          actionType: "update_meal_plan"
        };
      }
      mealPlans.splice(planIdx, 1);
      await updateUserSyncData(userId, { mealPlans });
      return {
        success: true,
        message: `Cleared meal plan for ${args.date}.`,
        actionType: "update_meal_plan"
      };
    }

    if (!args.mealSlot || !args.newMeal) {
      return {
        success: false,
        message: "Please specify which meal slot to update and the new meal.",
        actionType: "update_meal_plan"
      };
    }

    if (planIdx === -1) {
      const newPlan: MealPlan = {
        id: generateId(),
        date: args.date,
        meals: { [args.mealSlot]: args.newMeal }
      };
      mealPlans.push(newPlan);
      await updateUserSyncData(userId, { mealPlans });
      return {
        success: true,
        message: `Added ${args.mealSlot} for ${args.date}: ${args.newMeal}`,
        data: newPlan,
        actionType: "update_meal_plan"
      };
    }

    const oldMeal = mealPlans[planIdx].meals[args.mealSlot];
    mealPlans[planIdx].meals[args.mealSlot] = args.newMeal;
    await updateUserSyncData(userId, { mealPlans });

    return {
      success: true,
      message: oldMeal
        ? `Updated ${args.mealSlot} for ${args.date}: "${oldMeal}" → "${args.newMeal}"`
        : `Set ${args.mealSlot} for ${args.date}: ${args.newMeal}`,
      data: mealPlans[planIdx],
      actionType: "update_meal_plan"
    };
  } catch (error) {
    logger.error("Error updating meal plan", { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      message: "Failed to update meal plan.",
      actionType: "update_meal_plan"
    };
  }
}

export async function executeChatAction(
  userId: string,
  functionName: string,
  args: Record<string, unknown>
): Promise<ActionResult> {
  switch (functionName) {
    case "add_inventory_item":
      return executeAddInventoryItem(userId, args as Parameters<typeof executeAddInventoryItem>[1]);
    case "consume_inventory_item":
      return executeConsumeItem(userId, args as Parameters<typeof executeConsumeItem>[1]);
    case "waste_inventory_item":
      return executeWasteItem(userId, args as Parameters<typeof executeWasteItem>[1]);
    case "generate_recipe":
      return executeGenerateRecipe(userId, args as Parameters<typeof executeGenerateRecipe>[1]);
    case "open_recipe_customizer":
      return executeOpenRecipeCustomizer();
    case "create_meal_plan":
      return executeCreateMealPlan(userId, args as Parameters<typeof executeCreateMealPlan>[1]);
    case "add_to_shopping_list":
      return executeAddToShoppingList(userId, args as Parameters<typeof executeAddToShoppingList>[1]);
    case "get_inventory_summary":
      return executeGetInventorySummary(userId, args as Parameters<typeof executeGetInventorySummary>[1]);
    case "save_feedback":
      return executeSaveFeedback(userId, args as Parameters<typeof executeSaveFeedback>[1]);
    case "lookup_nutrition":
      return executeLookupNutrition(userId, args as Parameters<typeof executeLookupNutrition>[1]);
    case "check_inventory_levels":
      return executeCheckInventoryLevels(userId, args as Parameters<typeof executeCheckInventoryLevels>[1]);
    case "remove_shopping_items":
      return executeRemoveShoppingItems(userId, args as Parameters<typeof executeRemoveShoppingItems>[1]);
    case "update_meal_plan":
      return executeUpdateMealPlan(userId, args as Parameters<typeof executeUpdateMealPlan>[1]);
    default:
      return {
        success: false,
        message: `Unknown action: ${functionName}`,
        actionType: functionName
      };
  }
}
