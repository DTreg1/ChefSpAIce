import { eq } from "drizzle-orm";
import { db } from "../db";
import { userSyncData, userSessions } from "../../shared/schema";
import OpenAI from "openai";

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

export interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
  actionType: string;
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
      name: "create_meal_plan",
      description: "Create a weekly meal plan for the user. Use this when the user asks for meal planning, wants to plan their week, or asks for a weekly menu.",
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
          }
        },
        required: []
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
  }
];

export async function getUserSyncData(userId: string) {
  const existingSyncData = await db
    .select()
    .from(userSyncData)
    .where(eq(userSyncData.userId, userId));

  if (existingSyncData.length === 0) {
    return {
      inventory: [],
      recipes: [],
      mealPlans: [],
      shoppingList: [],
      wasteLog: [],
      consumedLog: [],
      preferences: null,
      cookware: []
    };
  }

  const data = existingSyncData[0];
  return {
    inventory: data.inventory ? JSON.parse(data.inventory) : [],
    recipes: data.recipes ? JSON.parse(data.recipes) : [],
    mealPlans: data.mealPlans ? JSON.parse(data.mealPlans) : [],
    shoppingList: data.shoppingList ? JSON.parse(data.shoppingList) : [],
    wasteLog: data.wasteLog ? JSON.parse(data.wasteLog) : [],
    consumedLog: data.consumedLog ? JSON.parse(data.consumedLog) : [],
    preferences: data.preferences ? JSON.parse(data.preferences) : null,
    cookware: data.cookware ? JSON.parse(data.cookware) : []
  };
}

async function updateUserSyncData(userId: string, updates: Record<string, unknown>) {
  const existingSyncData = await db
    .select()
    .from(userSyncData)
    .where(eq(userSyncData.userId, userId));

  const updatePayload: Record<string, unknown> = {
    lastSyncedAt: new Date(),
    updatedAt: new Date()
  };

  for (const [key, value] of Object.entries(updates)) {
    updatePayload[key] = JSON.stringify(value);
  }

  if (existingSyncData.length === 0) {
    await db.insert(userSyncData).values({
      userId,
      ...updatePayload
    });
  } else {
    await db
      .update(userSyncData)
      .set(updatePayload)
      .where(eq(userSyncData.userId, userId));
  }
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
    const userData = await getUserSyncData(userId);
    const newItem: FoodItem = {
      id: generateId(),
      name: args.name,
      quantity: args.quantity,
      unit: args.unit,
      storageLocation: args.storageLocation,
      category: args.category,
      purchaseDate: getTodayDate(),
      expirationDate: getDefaultExpirationDate(args.expirationDays || 7),
      notes: args.notes
    };

    userData.inventory.push(newItem);
    await updateUserSyncData(userId, { inventory: userData.inventory });

    return {
      success: true,
      message: `Added ${args.quantity} ${args.unit} of ${args.name} to your ${args.storageLocation}.`,
      data: newItem,
      actionType: "add_inventory_item"
    };
  } catch (error) {
    console.error("Error adding inventory item:", error);
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
    const userData = await getUserSyncData(userId);
    const itemNameLower = args.itemName.toLowerCase();
    
    const itemIndex = userData.inventory.findIndex(
      (item: FoodItem) => item.name.toLowerCase().includes(itemNameLower) ||
        itemNameLower.includes(item.name.toLowerCase())
    );

    if (itemIndex === -1) {
      return {
        success: false,
        message: `Could not find "${args.itemName}" in your inventory.`,
        actionType: "consume_inventory_item"
      };
    }

    const item = userData.inventory[itemIndex] as FoodItem;
    const consumedEntry: ConsumedEntry = {
      id: generateId(),
      itemName: item.name,
      quantity: args.quantity || item.quantity,
      unit: args.unit || item.unit,
      consumedAt: new Date().toISOString(),
      originalItemId: item.id
    };

    userData.consumedLog.push(consumedEntry);

    if (args.removeCompletely || !args.quantity || args.quantity >= item.quantity) {
      userData.inventory.splice(itemIndex, 1);
    } else {
      (userData.inventory[itemIndex] as FoodItem).quantity -= args.quantity;
    }

    await updateUserSyncData(userId, {
      inventory: userData.inventory,
      consumedLog: userData.consumedLog
    });

    return {
      success: true,
      message: `Marked ${args.quantity || item.quantity} ${args.unit || item.unit} of ${item.name} as consumed.`,
      data: consumedEntry,
      actionType: "consume_inventory_item"
    };
  } catch (error) {
    console.error("Error consuming item:", error);
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
    const userData = await getUserSyncData(userId);
    const itemNameLower = args.itemName.toLowerCase();
    
    const itemIndex = userData.inventory.findIndex(
      (item: FoodItem) => item.name.toLowerCase().includes(itemNameLower) ||
        itemNameLower.includes(item.name.toLowerCase())
    );

    if (itemIndex === -1) {
      return {
        success: false,
        message: `Could not find "${args.itemName}" in your inventory.`,
        actionType: "waste_inventory_item"
      };
    }

    const item = userData.inventory[itemIndex] as FoodItem;
    const wasteEntry: WasteEntry = {
      id: generateId(),
      itemName: item.name,
      quantity: args.quantity || item.quantity,
      unit: args.unit || item.unit,
      reason: args.reason,
      wastedAt: new Date().toISOString(),
      originalItemId: item.id
    };

    userData.wasteLog.push(wasteEntry);

    if (args.removeCompletely || !args.quantity || args.quantity >= item.quantity) {
      userData.inventory.splice(itemIndex, 1);
    } else {
      (userData.inventory[itemIndex] as FoodItem).quantity -= args.quantity;
    }

    await updateUserSyncData(userId, {
      inventory: userData.inventory,
      wasteLog: userData.wasteLog
    });

    return {
      success: true,
      message: `Logged ${args.quantity || item.quantity} ${args.unit || item.unit} of ${item.name} as wasted (${args.reason}).`,
      data: wasteEntry,
      actionType: "waste_inventory_item"
    };
  } catch (error) {
    console.error("Error logging waste:", error);
    return {
      success: false,
      message: `Failed to log ${args.itemName} as wasted.`,
      actionType: "waste_inventory_item"
    };
  }
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

    const inventoryList = userData.inventory.map((item: FoodItem) => item.name).join(", ");
    
    const recipePrompt = `Based on these available ingredients: ${inventoryList}

Generate a simple, practical recipe with these preferences:
${args.mealType ? `- Meal type: ${args.mealType}` : ""}
${args.cuisine ? `- Cuisine style: ${args.cuisine}` : ""}
${args.maxTime ? `- Max cooking time: ${args.maxTime} minutes` : ""}
${args.servings ? `- Servings: ${args.servings}` : "- Servings: 4"}
${args.quickRecipe ? "- This should be a quick recipe (under 20 minutes)" : ""}
${args.prioritizeExpiring ? "- Prioritize using ingredients that might expire soon" : ""}

Return the recipe in this JSON format:
{
  "title": "Recipe Name",
  "description": "Brief appetizing description",
  "ingredients": [{"name": "ingredient", "quantity": 1, "unit": "cup"}],
  "instructions": ["Step 1...", "Step 2..."],
  "prepTime": 10,
  "cookTime": 20,
  "servings": 4
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful chef assistant. Generate practical, easy-to-follow recipes based on available ingredients. Always respond with valid JSON."
        },
        { role: "user", content: recipePrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1024
    });

    const recipeContent = completion.choices[0]?.message?.content;
    if (!recipeContent) {
      throw new Error("No recipe generated");
    }

    const recipe = JSON.parse(recipeContent);
    const savedRecipe = {
      id: generateId(),
      ...recipe,
      isFavorite: false,
      isAIGenerated: true,
      createdAt: new Date().toISOString()
    };

    userData.recipes.push(savedRecipe);
    await updateUserSyncData(userId, { recipes: userData.recipes });

    return {
      success: true,
      message: `Generated recipe: ${recipe.title}. ${recipe.description}`,
      data: savedRecipe,
      actionType: "generate_recipe"
    };
  } catch (error) {
    console.error("Error generating recipe:", error);
    return {
      success: false,
      message: "Failed to generate a recipe. Please try again.",
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
  }
): Promise<ActionResult> {
  try {
    const userData = await getUserSyncData(userId);
    
    if (userData.inventory.length === 0) {
      return {
        success: false,
        message: "You need some ingredients in your inventory first to create a meal plan.",
        actionType: "create_meal_plan"
      };
    }

    const inventoryList = userData.inventory.map((item: FoodItem) => item.name).join(", ");
    const daysCount = args.daysCount || 7;
    const mealsPerDay = args.mealsPerDay || ["breakfast", "lunch", "dinner"];
    
    const mealPlanPrompt = `Create a ${daysCount}-day meal plan using these available ingredients: ${inventoryList}

Requirements:
- Include these meals each day: ${mealsPerDay.join(", ")}
${args.dietaryRestrictions ? `- Dietary restrictions: ${args.dietaryRestrictions}` : ""}
- Focus on variety and balanced nutrition
- Use the available ingredients efficiently

Return as JSON:
{
  "days": [
    {
      "dayNumber": 1,
      "meals": {
        "breakfast": "Meal name and brief description",
        "lunch": "Meal name and brief description",
        "dinner": "Meal name and brief description"
      }
    }
  ],
  "shoppingNeeded": ["any additional items needed"]
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
    
    const mealPlans: MealPlan[] = planData.days.map((day: { dayNumber: number; meals: Record<string, string> }, index: number) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + index);
      return {
        id: generateId(),
        date: date.toISOString().split('T')[0],
        meals: day.meals
      };
    });

    userData.mealPlans = [...userData.mealPlans, ...mealPlans];
    
    if (planData.shoppingNeeded && planData.shoppingNeeded.length > 0) {
      const newShoppingItems = planData.shoppingNeeded.map((item: string) => ({
        id: generateId(),
        name: item,
        quantity: 1,
        unit: "item",
        isChecked: false
      }));
      userData.shoppingList = [...userData.shoppingList, ...newShoppingItems];
    }

    await updateUserSyncData(userId, { 
      mealPlans: userData.mealPlans,
      shoppingList: userData.shoppingList
    });

    let message = `Created a ${daysCount}-day meal plan for you!`;
    if (planData.shoppingNeeded && planData.shoppingNeeded.length > 0) {
      message += ` Also added ${planData.shoppingNeeded.length} items to your shopping list.`;
    }

    return {
      success: true,
      message,
      data: { mealPlans, shoppingNeeded: planData.shoppingNeeded },
      actionType: "create_meal_plan"
    };
  } catch (error) {
    console.error("Error creating meal plan:", error);
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
    const userData = await getUserSyncData(userId);
    
    const newItems: ShoppingListItem[] = args.items.map(item => ({
      id: generateId(),
      name: item.name,
      quantity: item.quantity || 1,
      unit: item.unit || "item",
      isChecked: false,
      category: item.category
    }));

    userData.shoppingList = [...userData.shoppingList, ...newItems];
    await updateUserSyncData(userId, { shoppingList: userData.shoppingList });

    const itemNames = args.items.map(i => i.name).join(", ");
    return {
      success: true,
      message: `Added ${args.items.length} item(s) to your shopping list: ${itemNames}`,
      data: newItems,
      actionType: "add_to_shopping_list"
    };
  } catch (error) {
    console.error("Error adding to shopping list:", error);
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
    console.error("Error getting inventory summary:", error);
    return {
      success: false,
      message: "Failed to retrieve inventory.",
      actionType: "get_inventory_summary"
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
    case "create_meal_plan":
      return executeCreateMealPlan(userId, args as Parameters<typeof executeCreateMealPlan>[1]);
    case "add_to_shopping_list":
      return executeAddToShoppingList(userId, args as Parameters<typeof executeAddToShoppingList>[1]);
    case "get_inventory_summary":
      return executeGetInventorySummary(userId, args as Parameters<typeof executeGetInventorySummary>[1]);
    default:
      return {
        success: false,
        message: `Unknown action: ${functionName}`,
        actionType: functionName
      };
  }
}
