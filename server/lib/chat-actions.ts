import { eq } from "drizzle-orm";
import { db } from "../db";
import { userSyncData, feedback } from "../../shared/schema";
import OpenAI from "openai";
import { generateRecipe as generateRecipeService, type InventoryItem } from "../services/recipeGenerationService";
import { logger } from "./logger";

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
    inventory: (data.inventory as any[]) || [],
    recipes: (data.recipes as any[]) || [],
    mealPlans: (data.mealPlans as any[]) || [],
    shoppingList: (data.shoppingList as any[]) || [],
    wasteLog: (data.wasteLog as any[]) || [],
    consumedLog: (data.consumedLog as any[]) || [],
    preferences: data.preferences || null,
    cookware: (data.cookware as any[]) || []
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
    updatePayload[key] = value;
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

    const inventoryForService: InventoryItem[] = userData.inventory.map((item: FoodItem) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      expiryDate: item.expirationDate,
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

    userData.recipes.push(result.recipe);
    await updateUserSyncData(userId, { recipes: userData.recipes });

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
    logger.error("Error generating recipe", { error: error instanceof Error ? error.message : String(error) });
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

    const inventoryList = userData.inventory.map((item: FoodItem) => item.name).join(", ");
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
    default:
      return {
        success: false,
        message: `Unknown action: ${functionName}`,
        actionType: functionName
      };
  }
}
