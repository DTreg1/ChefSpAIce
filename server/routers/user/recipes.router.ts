import { Router, type Request, type Response, type NextFunction } from "express";
import OpenAI from "openai";
import { z } from "zod";
import {
  formatInventoryForPrompt,
  UNIT_CONVERSION_PROMPT_ADDITION,
  normalizeUnit,
  compareQuantities,
  AvailabilityStatus,
} from "../../lib/unit-conversion";
import {
  checkAiRecipeLimit,
  incrementAiRecipeCount,
  checkFeatureAccess,
} from "../../services/subscriptionService";
import { logger } from "../../lib/logger";
import { AppError } from "../../middleware/errorHandler";
import { successResponse, errorResponse } from "../../lib/apiResponse";
import { processImageFromBase64 } from "../../services/imageProcessingService";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const generateRecipeSchema = z.object({
  prioritizeExpiring: z.boolean().default(false),
  quickRecipe: z.boolean().default(false),
  ingredients: z.array(z.union([z.number(), z.string()])).optional(),
  servings: z.number().min(1).max(20).default(4),
  maxTime: z.number().min(5).max(480).default(60),
  dietaryRestrictions: z.string().optional(),
  cuisine: z.string().optional(),
  mealType: z
    .enum(["breakfast", "lunch", "dinner", "snack", "late night snack"])
    .optional(),
  inventory: z
    .array(
      z.object({
        id: z.union([z.number(), z.string()]),
        name: z.string(),
        quantity: z.number().optional(),
        unit: z.string().optional(),
        expiryDate: z.string().nullable().optional(),
      }),
    )
    .optional(),
  equipment: z
    .array(
      z.object({
        id: z.union([z.number(), z.string()]),
        name: z.string(),
        alternatives: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  macroTargets: z
    .object({
      protein: z.number().min(5).max(80).default(50),
      carbs: z.number().min(5).max(80).default(35),
      fat: z.number().min(5).max(80).default(15),
    })
    .optional(),
  previousRecipeTitles: z.array(z.string()).optional(),
  ingredientCount: z
    .object({
      min: z.number().min(2).max(10).default(4),
      max: z.number().min(2).max(10).default(6),
    })
    .optional(),
});

export interface InventoryItem {
  id: number | string;
  name: string;
  quantity?: number;
  unit?: string;
  expiryDate?: string | null;
  daysUntilExpiry?: number;
}

export interface ExpiringItem extends InventoryItem {
  daysUntilExpiry: number;
}

export interface EquipmentItem {
  id: number | string;
  name: string;
  alternatives?: string[];
}

interface GeneratedRecipe {
  title: string;
  description: string;
  ingredients: Array<{
    name: string;
    quantity: number | string;
    unit: string;
    fromInventory?: boolean;
  }>;
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  usedExpiringItems?: string[];
  usedExpiringCount?: number;
  requiredEquipment?: string[];
  optionalEquipment?: string[];
  substitutionNotes?: string[];
}

export function calculateDaysUntilExpiry(
  expiryDate: string | null | undefined,
): number | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function organizeInventory(
  items: InventoryItem[],
  selectedIds?: (number | string)[],
): {
  expiringItems: ExpiringItem[];
  otherItems: InventoryItem[];
} {
  const EXPIRING_THRESHOLD_DAYS = 3;

  const filteredItems =
    selectedIds && selectedIds.length > 0
      ? items.filter((item) => {
          const itemIdStr = String(item.id);
          return selectedIds.some((selId) => String(selId) === itemIdStr);
        })
      : items;

  const itemsWithExpiry = filteredItems.map((item) => ({
    ...item,
    daysUntilExpiry: calculateDaysUntilExpiry(item.expiryDate),
  }));

  const expiringItems: ExpiringItem[] = itemsWithExpiry
    .filter(
      (item) =>
        item.daysUntilExpiry !== null &&
        item.daysUntilExpiry <= EXPIRING_THRESHOLD_DAYS,
    )
    .map((item) => ({
      ...item,
      daysUntilExpiry: item.daysUntilExpiry as number,
    }))
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  const otherItems: InventoryItem[] = itemsWithExpiry
    .filter(
      (item) =>
        item.daysUntilExpiry === null ||
        item.daysUntilExpiry > EXPIRING_THRESHOLD_DAYS,
    )
    .map((item) => ({
      ...item,
      daysUntilExpiry: item.daysUntilExpiry ?? undefined,
    }));

  return { expiringItems, otherItems };
}

export function buildSmartPrompt(params: {
  expiringItems: ExpiringItem[];
  otherItems: InventoryItem[];
  prioritizeExpiring: boolean;
  quickRecipe: boolean;
  servings: number;
  maxTime: number;
  dietaryRestrictions?: string;
  cuisine?: string;
  mealType?: string;
  equipment?: EquipmentItem[];
  macroTargets?: { protein: number; carbs: number; fat: number };
  previousRecipeTitles?: string[];
  ingredientCount?: { min: number; max: number };
}): string {
  const {
    expiringItems,
    otherItems,
    prioritizeExpiring: _prioritizeExpiring,
    quickRecipe,
    servings,
    maxTime,
    dietaryRestrictions,
    cuisine,
    mealType,
    equipment,
    macroTargets = { protein: 50, carbs: 35, fat: 15 },
    previousRecipeTitles = [],
    ingredientCount = { min: 4, max: 6 },
  } = params;
  void _prioritizeExpiring; // reserved for future use

  let prompt = `You are a creative home chef helping reduce food waste.\n\n`;

  prompt += `=== SMART RECIPE CREATION ===\n\n`;

  prompt += `PRIMARY GOAL: Create the BEST possible recipe using the user's inventory. Quality matters most!\n\n`;

  prompt += `INVENTORY ITEMS: Start with what the user has available (listed below).\n\n`;

  prompt += `ALWAYS AVAILABLE: Water and ice are always available and can be used freely.\n\n`;

  prompt += `=== SMART SUBSTITUTIONS ===\n\n`;

  prompt += `When crafting the recipe, use ONLY ingredients from the user's inventory.\n`;
  prompt += `If an ideal ingredient isn't available but a suitable substitute IS in their inventory, use the substitute and note it subtly.\n`;
  prompt += `Include a "substitutionNotes" array with helpful hints like:\n`;
  prompt += `- "Using lime juice here - lemon would also work beautifully"\n`;
  prompt += `- "Butter adds richness - olive oil is a lighter alternative"\n`;
  prompt += `- "Greek yogurt makes a great stand-in for sour cream"\n`;
  prompt += `Only include notes when you're using a substitute - don't suggest ingredients they don't have.\n\n`;

  prompt += `=== INGREDIENT NAMING ===\n\n`;

  prompt += `For matching purposes, include an "inventoryMatch" field that maps to the EXACT inventory name.\n`;
  prompt += `For display purposes, use a clean, appetizing name in the "name" field.\n\n`;

  prompt += `=== INGREDIENT COUNT ===\n\n`;
  prompt += `Target ${ingredientCount.min} to ${ingredientCount.max} ingredients for this recipe.\n`;
  prompt += `Focus on quality over quantity - a well-crafted dish with fewer ingredients is better than one that uses everything available.\n\n`;

  prompt += UNIT_CONVERSION_PROMPT_ADDITION + `\n`;

  if (previousRecipeTitles.length > 0) {
    prompt += `=== VARIETY REQUIREMENT ===\n`;
    prompt += `The user has recently generated these recipes. Create something SIGNIFICANTLY DIFFERENT:\n`;
    previousRecipeTitles.forEach((title) => {
      prompt += `- ${title}\n`;
    });
    prompt += `Choose a different cooking style, cuisine influence, or main ingredient focus.\n\n`;
  }

  if (mealType) {
    prompt += `MEAL TYPE: ${mealType.toUpperCase()}\n`;
    if (mealType === "breakfast") {
      prompt += `- Create a breakfast-appropriate dish (eggs, pancakes, toast, smoothies, oatmeal, etc.)\n`;
      prompt += `- Focus on morning-friendly flavors and quick preparation\n`;
    } else if (mealType === "lunch") {
      prompt += `- Create a satisfying lunch dish (salads, sandwiches, wraps, soups, light mains)\n`;
      prompt += `- Balance nutrition and convenience\n`;
    } else if (mealType === "dinner") {
      prompt += `- Create a hearty dinner dish (mains, pastas, stir-fries, casseroles)\n`;
      prompt += `- Focus on satisfying, complete meals\n`;
    } else if (mealType === "snack" || mealType === "late night snack") {
      prompt += `- Create a quick, light snack\n`;
      prompt += `- Keep portions smaller and preparation simple\n`;
    }
    prompt += `\n`;
  }

  if (quickRecipe) {
    prompt += `IMPORTANT TIME CONSTRAINT: This recipe MUST be completable in under 20 minutes total (prep + cook time combined).\n`;
    prompt += `- Prioritize quick-cooking methods (stir-fry, sautéing, no-cook, microwave)\n`;
    prompt += `- Minimize prep work (use pre-cut, canned, or quick-prep ingredients)\n`;
    prompt += `- One-pan or simple techniques preferred\n`;
    prompt += `- No marinating, slow cooking, or extended baking required\n\n`;
  }

  prompt += `=== USER'S KITCHEN INVENTORY ===\n\n`;

  if (expiringItems.length > 0) {
    prompt += `ITEMS EXPIRING SOON (${expiringItems.length} items):\n`;
    prompt += `NOTE: These items are expiring soon. Consider using them IF they make sense for a delicious, cohesive ${mealType || 'meal'}. `;
    prompt += `However, a GOOD MEAL is MORE IMPORTANT than using expiring items. `;
    prompt += `Do NOT force expiring items into a recipe if they don't belong - it's better to skip them than create a bad dish.\n`;
    const formattedExpiring = formatInventoryForPrompt(expiringItems);
    expiringItems.forEach((item, index) => {
      const urgency =
        item.daysUntilExpiry <= 1
          ? "EXPIRES TODAY/TOMORROW"
          : `expires in ${item.daysUntilExpiry} days`;
      prompt += `- ${formattedExpiring[index]} - ${urgency}\n`;
    });
    prompt += `\n`;
  }

  if (otherItems.length > 0) {
    prompt += `ALSO AVAILABLE:\n`;
    const formattedOther = formatInventoryForPrompt(otherItems);
    formattedOther.forEach((formatted) => {
      prompt += `- ${formatted}\n`;
    });
    prompt += `\n`;
  }

  if (equipment && equipment.length > 0) {
    prompt += `=== EQUIPMENT AVAILABLE ===\n`;
    equipment.forEach((item) => {
      prompt += `- ${item.name}\n`;
    });
    prompt += `Only use equipment from this list.\n\n`;
  } else {
    prompt += `=== EQUIPMENT ===\n`;
    prompt += `Assume basic equipment: Pot, Pan, Knife, Cutting board, Mixing bowl, Spoon, Fork\n`;
    prompt += `Do NOT require specialty equipment like blenders, food processors, stand mixers.\n\n`;
  }

  prompt += `=== USER PREFERENCES ===\n`;
  prompt += `- Servings: ${servings}\n`;
  if (quickRecipe) {
    prompt += `- Max TOTAL time: 20 minutes (prep + cook combined)\n`;
  } else {
    prompt += `- Max time: ${maxTime} minutes\n`;
  }
  if (dietaryRestrictions) {
    prompt += `- Diet: ${dietaryRestrictions}\n`;
  }
  if (cuisine) {
    prompt += `- Cuisine style: ${cuisine}\n`;
  }
  prompt += `\n`;

  prompt += `=== NUTRITION TARGETS ===\n`;
  prompt += `Target macro ratio by calories:\n`;
  prompt += `- Protein: ~${macroTargets.protein}%\n`;
  prompt += `- Carbohydrates: ~${macroTargets.carbs}%\n`;
  prompt += `- Fat: ~${macroTargets.fat}%\n`;
  prompt += `Prioritize lean proteins and whole food carb sources when possible.\n\n`;

  prompt += `=== MEAL COMPOSITION GUIDELINES ===\n`;
  prompt += `- Use only ONE primary protein source per dish (e.g., chicken OR beef, not both)\n`;
  prompt += `- Pick the protein that best fits the cuisine/dish style or is expiring soonest\n`;
  prompt += `- Focus on complementary ingredients that enhance the main protein\n`;
  prompt += `- Create cohesive dishes that make culinary sense, not just ingredient dumps\n`;
  prompt += `- Less is more: a well-balanced 4-6 ingredient dish beats a cluttered one\n\n`;

  const examplePrepTime = quickRecipe ? 5 : 15;
  const exampleCookTime = quickRecipe ? 10 : 30;

  const hasEquipment = equipment && equipment.length > 0;

  prompt += `=== NAMING GUIDELINES ===\n`;
  prompt += `The inventory items may have verbose database-style names like "chicken, broilers or fryers, breast, meat only, raw".\n`;
  prompt += `TITLE & DESCRIPTION: Use simple, natural names that sound appetizing:\n`;
  prompt += `- Say "chicken breast" not "chicken, broilers or fryers, breast, meat only, raw"\n`;
  prompt += `- Say "eggs" not "egg, whole, raw, fresh"\n`;
  prompt += `- Say "tomatoes" not "tomatoes, red, ripe, raw, year round average"\n`;
  prompt += `- Say "white bread" not "bread, white, commercially prepared"\n`;
  prompt += `INGREDIENTS ARRAY: Keep the original inventory name so the app can match it.\n`;
  prompt += `Example: If inventory has "chicken, broilers or fryers, breast, meat only, raw", use that exact name in ingredients array.\n\n`;

  prompt += `=== REQUIRED OUTPUT FORMAT ===\n`;
  prompt += `Return ONLY this JSON structure:\n`;
  prompt += `{
  "title": "Descriptive recipe name",
  "description": "2-3 sentence appetizing description. Use natural ingredient names (e.g., 'chicken breast' not 'chicken, broilers or fryers, breast, meat only, raw'). Make it sound delicious.",
  "ingredients": [
    {"name": "exact name from inventory list", "quantity": 1, "unit": "cup", "fromInventory": true},
    {"name": "exact name from inventory list", "quantity": 2, "unit": "tbsp", "fromInventory": true}
  ],
  "instructions": ["Step 1: Specific action...", "Step 2: ..."],
  "prepTime": ${examplePrepTime},
  "cookTime": ${exampleCookTime},
  "servings": ${servings},
  "nutrition": {"calories": 400, "protein": ${Math.round((400 * macroTargets.protein) / 100 / 4)}, "carbs": ${Math.round((400 * macroTargets.carbs) / 100 / 4)}, "fat": ${Math.round((400 * macroTargets.fat) / 100 / 9)}},
  "usedExpiringItems": ["item1", "item2"],
  "substitutionNotes": ["Using lime here - lemon would also work", "Butter adds richness to this dish"]${
    hasEquipment
      ? `,
  "requiredEquipment": ["Pan"],
  "optionalEquipment": []`
      : ""
  }
}\n\n`;

  prompt += `=== FINAL CHECKLIST ===\n`;
  prompt += `Before responding, verify:\n`;
  prompt += `- All ingredients come from the user's inventory (no exceptions for oil, salt, etc.)\n`;
  prompt += `- Ingredient names in the JSON array match the inventory names exactly for proper matching\n`;
  prompt += `- All ingredients marked fromInventory: true\n`;
  prompt += `- Include substitution notes ONLY when using a substitute (empty array if no substitutes used)\n`;
  prompt += `- Title and description use natural, appetizing language (simplified ingredient names)\n`;
  prompt += `- Recipe is different from previous generations if any were listed\n`;
  prompt += `- Total time (prepTime + cookTime) ≤ ${quickRecipe ? 20 : maxTime} minutes\n`;
  prompt += `- Nutrition roughly matches target macros: ${macroTargets.protein}% protein, ${macroTargets.carbs}% carbs, ${macroTargets.fat}% fat\n`;

  return prompt;
}

router.post("/generate", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw AppError.unauthorized("Authentication required");
    }

    const limitCheck = await checkAiRecipeLimit(req.userId);
    const remaining = typeof limitCheck.remaining === 'number' ? limitCheck.remaining : Infinity;
    if (remaining < 1) {
      throw AppError.forbidden(
        "Monthly AI recipe limit reached. Upgrade your subscription for unlimited recipes.",
        "AI_RECIPE_LIMIT_REACHED",
      ).withDetails({ limit: limitCheck.limit, remaining: 0 });
    }

    const parseResult = generateRecipeSchema.safeParse(req.body);

    if (!parseResult.success) {
      const errorMessages = parseResult.error.errors
        .map((e) => e.message)
        .join(", ");
      throw AppError.badRequest("Invalid input", "VALIDATION_ERROR").withDetails({ errors: errorMessages });
    }

    const {
      prioritizeExpiring,
      quickRecipe,
      ingredients: selectedIngredientIds,
      servings,
      maxTime,
      dietaryRestrictions,
      cuisine,
      mealType,
      inventory,
      equipment,
      macroTargets,
      previousRecipeTitles,
      ingredientCount,
    } = parseResult.data;

    if (!inventory || inventory.length === 0) {
      if (selectedIngredientIds && selectedIngredientIds.length === 0) {
        throw AppError.badRequest(
          "No ingredients available",
          "NO_INGREDIENTS",
        ).withDetails({ details: "Please add items to your inventory or select ingredients" });
      }
    }

    const { expiringItems, otherItems } = organizeInventory(
      inventory || [],
      selectedIngredientIds,
    );

    if (expiringItems.length === 0 && otherItems.length === 0) {
      throw AppError.badRequest(
        "No ingredients to use",
        "NO_INGREDIENTS",
      ).withDetails({ details: "Please add items to your inventory" });
    }

    const effectiveMaxTime = quickRecipe ? 20 : maxTime;

    const prompt = buildSmartPrompt({
      expiringItems,
      otherItems,
      prioritizeExpiring,
      quickRecipe,
      servings,
      maxTime: effectiveMaxTime,
      dietaryRestrictions,
      cuisine,
      mealType,
      equipment,
      macroTargets,
      previousRecipeTitles,
      ingredientCount,
    });

    if (process.env.NODE_ENV !== "production") {
      logger.debug("Smart generation prompt", {
        promptPreview: prompt.substring(0, 500),
      });
    }

    const effectiveIngredientCount = ingredientCount || { min: 4, max: 6 };
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a creative culinary assistant that creates the BEST possible recipes from user-provided ingredients.

KEY PRINCIPLES:
1. Use ONLY ingredients from the user's inventory - use fuzzy matching ("chicken" matches "chicken breast")
2. Water and ice are always available
3. Target ${effectiveIngredientCount.min}-${effectiveIngredientCount.max} ingredients for focused, quality dishes
4. When using a substitute ingredient, add a subtle note (e.g., "Using lime here - lemon works too")
5. Use clean, appetizing ingredient names for display while tracking inventory matches
6. Always respond with valid JSON matching the exact schema provided`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    let recipe: GeneratedRecipe = JSON.parse(content);

    // Universal cooking utilities that are acceptable even when not in inventory
    // These are basic necessities that most kitchens have and don't require tracking
    const ALLOWED_UTILITIES = new Set([
      "water",
      "tap water",
      "cold water",
      "hot water",
      "warm water",
      "ice water",
      "ice",
      "ice cubes",
    ]);

    // Enhanced fuzzy match helper - handles plurals, variations, descriptors
    const fuzzyMatch = (
      recipeIngredient: string,
      inventoryItem: string,
    ): boolean => {
      // Normalize function: lowercase, remove common descriptors, handle plurals
      const normalize = (s: string) => {
        let normalized = s
          .toLowerCase()
          .trim()
          // Remove punctuation (commas, parentheses, etc.)
          .replace(/[,()]/g, " ")
          // Remove common descriptors that shouldn't affect matching
          .replace(
            /\b(fresh|organic|raw|cooked|frozen|canned|dried|whole|sliced|diced|chopped|minced|ground|crushed|shredded|grated|peeled|boneless|skinless|lean|extra\s*virgin|light|heavy|low[\s-]?fat|fat[\s-]?free|unsalted|salted|sweetened|unsweetened|plain|greek|regular|large|medium|small|ripe|overripe|unripe|commercially\s*prepared|store[\s-]?bought|homemade|white|wheat|multigrain|enriched)\b/g,
            "",
          )
          // Remove "X of" packaging patterns like "loaf of", "slices of" (keeps the main ingredient)
          .replace(/\b(loaf|loaves|slice|slices|bag|package|can|jar|bottle|box|bunch|head)\s+of\s+/g, "")
          .replace(/\s+/g, " ")
          .trim();

        // Handle plurals more comprehensively
        // Only apply ves->f for specific known words (knife, loaf, leaf, etc.)
        const vesWordsToF: Record<string, string> = {
          knives: "knife",
          loaves: "loaf",
          leaves: "leaf",
          halves: "half",
          calves: "calf",
          shelves: "shelf",
          wolves: "wolf",
          selves: "self",
        };

        // Check for specific ves->f transformations
        for (const [plural, singular] of Object.entries(vesWordsToF)) {
          if (normalized.endsWith(plural)) {
            normalized = normalized.slice(0, -plural.length) + singular;
            break;
          }
        }

        // Handle other plurals (avoiding ves words that shouldn't change)
        if (!normalized.endsWith("f") && !normalized.endsWith("fe")) {
          // Words that naturally end in 's' and should NOT be de-pluralized
          const singularWordsEndingInS = new Set([
            "couscous",
            "hummus",
            "molasses",
            "asparagus",
            "citrus",
            "hibiscus",
            "cactus",
            "octopus",
            "surplus",
            "bonus",
            "mucus",
            "radius",
            "focus",
            "bass",
            "moss",
            "grass",
            "class",
            "glass",
            "mass",
            "pass",
            "brass",
            "swiss",
            "stress",
            "dress",
            "press",
            "chess",
            "less",
            "mess",
            "brussels",
            "sprouts",
            "oats",
            "grits",
            "nuts",
            "greens",
            "beans",
          ]);

          // Skip de-pluralization for words in the exception list
          const skipDepluralization = singularWordsEndingInS.has(normalized);

          if (!skipDepluralization) {
            // Apply plural rules in specific order
            if (normalized.endsWith("ies")) {
              // berries -> berry, cherries -> cherry
              normalized = normalized.slice(0, -3) + "y";
            } else if (normalized.endsWith("oes")) {
              // tomatoes -> tomato, potatoes -> potato
              normalized = normalized.slice(0, -2);
            } else if (normalized.match(/(sh|ch|x|z|ss)es$/)) {
              // dishes -> dish, boxes -> box, lunches -> lunch
              normalized = normalized.slice(0, -2);
            } else if (normalized.endsWith("s") && normalized.length > 3) {
              // apples -> apple, olives -> olive, carrots -> carrot
              // Only remove 's' if word is long enough
              normalized = normalized.slice(0, -1);
            }
          }
        }

        // Normalize separators
        normalized = normalized.replace(/[-_]/g, " ");

        return normalized;
      };

      const normRecipe = normalize(recipeIngredient);
      const normInventory = normalize(inventoryItem);

      // Exact match after normalization
      if (normRecipe === normInventory) return true;

      // Partial/contains match (handles "chicken" matching "chicken breast")
      if (
        normRecipe.includes(normInventory) ||
        normInventory.includes(normRecipe)
      )
        return true;

      // Word-level matching for compound ingredients
      const wordsRecipe = normRecipe.split(/\s+/).filter((w) => w.length > 1);
      const wordsInventory = normInventory
        .split(/\s+/)
        .filter((w) => w.length > 1);

      // Check if the core/main word matches (usually the last word is the main ingredient)
      const coreRecipe = wordsRecipe[wordsRecipe.length - 1] || normRecipe;
      const coreInventory =
        wordsInventory[wordsInventory.length - 1] || normInventory;
      if (coreRecipe === coreInventory) return true;

      // Check for significant word overlap
      const matchingWords = wordsRecipe.filter((wr) =>
        wordsInventory.some(
          (wi) =>
            wr === wi ||
            (wr.length > 3 &&
              wi.length > 3 &&
              (wr.includes(wi) || wi.includes(wr))),
        ),
      );

      // If at least one significant word matches, consider it a match
      if (
        matchingWords.length > 0 &&
        matchingWords.length >=
          Math.max(1, Math.min(wordsRecipe.length, wordsInventory.length) * 0.4)
      ) {
        return true;
      }

      return false;
    };

    // Check if ingredient is an allowed utility (water, ice, etc.)
    const isAllowedUtility = (ingredientName: string): boolean => {
      const normalized = ingredientName.toLowerCase().trim();
      return ALLOWED_UTILITIES.has(normalized);
    };

    // Validate and filter ingredients - ALL must come from inventory (with utility exceptions)
    const inventoryItems = [...expiringItems, ...otherItems];

    const originalIngredientCount = recipe.ingredients?.length || 0;
    recipe.ingredients = (recipe.ingredients || [])
      .map((ing) => {
        // Check if ingredient fuzzy-matches any inventory item and get the matched item
        const matchedInventoryItem = inventoryItems.find((invItem) =>
          fuzzyMatch(ing.name, invItem.name),
        );
        
        if (matchedInventoryItem) {
          // Calculate quantity availability using USDA conversion
          const recipeQty = typeof ing.quantity === 'number' ? ing.quantity : parseFloat(String(ing.quantity)) || 1;
          const recipeUnit = ing.unit || '';
          const inventoryQty = matchedInventoryItem.quantity || 1;
          const inventoryUnit = matchedInventoryItem.unit || null;
          
          // Compare quantities - this uses USDA portion data when available
          const comparison = compareQuantities(
            inventoryQty,
            inventoryUnit,
            recipeQty,
            recipeUnit,
          );
          
          return {
            ...ing,
            fromInventory: true,
            availabilityStatus: comparison.status,
            percentAvailable: comparison.percentAvailable ?? 100,
          };
        }

        // Allow universal utilities like water even if not in inventory
        if (isAllowedUtility(ing.name)) {
          if (process.env.NODE_ENV !== "production") {
            logger.debug("Allowing utility ingredient", { ingredient: ing.name });
          }
          return { 
            ...ing, 
            fromInventory: false,
            availabilityStatus: 'available' as AvailabilityStatus,
            percentAvailable: 100,
          };
        }

        // Ingredient doesn't match inventory - remove it (no exceptions for oil, salt, etc.)
        if (process.env.NODE_ENV !== "production") {
          logger.debug("Removing ingredient not in inventory", { ingredient: ing.name });
        }
        return null;
      })
      .filter((ing): ing is NonNullable<typeof ing> => ing !== null);

    // Ensure we have at least 2 inventory ingredients
    // This prevents meaningless single-ingredient or empty recipes
    const inventoryIngredients = recipe.ingredients.filter(
      (ing) => ing.fromInventory === true,
    );
    if (inventoryIngredients.length < 2) {
      throw AppError.badRequest(
        "Could not generate a valid recipe",
        "INSUFFICIENT_INGREDIENTS",
      ).withDetails({ details: "Not enough matching ingredients were found. Please try again or add more items to your inventory." });
    }

    // Build list of valid ingredient terms for validation
    const validIngredientTerms = recipe.ingredients.flatMap((ing) => {
      const name = ing.name.toLowerCase();
      // Extract individual words and the full name
      const words = name.split(/\s+/).filter((w) => w.length > 2);
      return [name, ...words];
    });

    // Helper to check if text mentions ingredients not in our list
    const findUnmatchedIngredients = (text: string): string[] => {
      const textLower = text.toLowerCase();
      // Comprehensive list of food items that could be phantom ingredients
      const foodTerms = [
        // Proteins
        "chicken",
        "beef",
        "pork",
        "fish",
        "salmon",
        "tuna",
        "shrimp",
        "lamb",
        "bacon",
        "ham",
        "turkey",
        "sausage",
        "steak",
        "ground meat",
        "meatball",
        "tofu",
        "tempeh",
        "seitan",
        "duck",
        "veal",
        "crab",
        "lobster",
        "scallop",
        // Vegetables
        "tomato",
        "tomatoes",
        "onion",
        "onions",
        "garlic",
        "mushroom",
        "mushrooms",
        "carrot",
        "carrots",
        "potato",
        "potatoes",
        "broccoli",
        "spinach",
        "lettuce",
        "cucumber",
        "zucchini",
        "squash",
        "eggplant",
        "bell pepper",
        "jalapeño",
        "celery",
        "cabbage",
        "kale",
        "asparagus",
        "cauliflower",
        "green beans",
        "artichoke",
        "beet",
        "radish",
        "turnip",
        "leek",
        "shallot",
        "scallion",
        // Fruits
        "apple",
        "banana",
        "orange",
        "lemon",
        "lime",
        "avocado",
        "mango",
        "pineapple",
        "strawberry",
        "blueberry",
        "raspberry",
        "grape",
        "peach",
        "pear",
        "melon",
        "watermelon",
        "cherry",
        "kiwi",
        "coconut",
        "pomegranate",
        "fig",
        "date",
        // Dairy
        "cheese",
        "cheddar",
        "mozzarella",
        "parmesan",
        "feta",
        "cream cheese",
        "cream",
        "milk",
        "yogurt",
        "sour cream",
        "butter",
        "ghee",
        "ricotta",
        // Grains & Starches
        "rice",
        "pasta",
        "noodle",
        "bread",
        "tortilla",
        "quinoa",
        "couscous",
        "oat",
        "barley",
        "farro",
        "bulgur",
        "flour",
        "cornmeal",
        "polenta",
        // Eggs
        "egg",
        "eggs",
        // Condiments & Sauces
        "mayo",
        "mayonnaise",
        "ketchup",
        "mustard",
        "soy sauce",
        "vinegar",
        "hot sauce",
        "sriracha",
        "worcestershire",
        "tahini",
        "pesto",
        // Legumes
        "beans",
        "lentil",
        "chickpea",
        "black beans",
        "kidney beans",
        "pinto beans",
        // Herbs & Aromatics
        "cilantro",
        "basil",
        "parsley",
        "thyme",
        "rosemary",
        "oregano",
        "dill",
        "mint",
        "sage",
        "chive",
        "ginger",
        // Others
        "corn",
        "peas",
        "olive",
        "caper",
        "pickle",
        "honey",
        "maple syrup",
        "almond",
        "walnut",
        "cashew",
        "peanut",
        "pecan",
        "pistachio",
      ];

      return foodTerms.filter((term) => {
        if (!textLower.includes(term)) return false;
        // Allowed utilities like water should not be flagged
        if (ALLOWED_UTILITIES.has(term)) return false;
        // Check if this term matches any valid ingredient
        return !validIngredientTerms.some(
          (valid) => valid.includes(term) || term.includes(valid),
        );
      });
    };

    // Check description for phantom ingredients
    const descPhantoms = findUnmatchedIngredients(recipe.description || "");
    if (descPhantoms.length > 0) {
      if (process.env.NODE_ENV !== "production") {
        logger.debug("Description mentions invalid ingredients, rewriting", { phantomIngredients: descPhantoms });
      }
      const ingredientList = inventoryIngredients.map((i) => i.name).join(", ");
      recipe.description = `A delicious dish featuring ${ingredientList}.`;
    }

    // Check instructions for phantom ingredients and rewrite problematic steps
    const instructionsText = (recipe.instructions || []).join(" ");
    const instrPhantoms = findUnmatchedIngredients(instructionsText);
    if (instrPhantoms.length > 0) {
      if (process.env.NODE_ENV !== "production") {
        logger.debug("Instructions mention invalid ingredients, filtering", { phantomIngredients: instrPhantoms });
      }
      // Rewrite instructions to use generic terms instead of specific phantom ingredients
      recipe.instructions = (recipe.instructions || []).map((step) => {
        let cleanStep = step;
        instrPhantoms.forEach((phantom) => {
          const regex = new RegExp(`\\b${phantom}s?\\b`, "gi");
          cleanStep = cleanStep.replace(regex, "ingredients");
        });
        return cleanStep;
      });
    }

    // Normalize units in recipe ingredients for consistent display
    recipe.ingredients = recipe.ingredients.map((ing) => ({
      ...ing,
      unit: normalizeUnit(ing.unit) || ing.unit,
    }));

    const filteredCount = originalIngredientCount - recipe.ingredients.length;
    if (filteredCount > 0 && process.env.NODE_ENV !== "production") {
      logger.debug("Filtered out ingredients not in inventory", { filteredCount });
    }

    if (quickRecipe) {
      const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
      if (totalTime > 20) {
        if (process.env.NODE_ENV !== "production") {
          logger.debug("Quick recipe time exceeded, clamping to 20 min total", { totalTime });
        }
        const ratio = 20 / totalTime;
        recipe.prepTime = Math.max(
          5,
          Math.floor((recipe.prepTime || 10) * ratio),
        );
        recipe.cookTime = Math.max(5, 20 - recipe.prepTime);
      }
    }

    const usedExpiringCount = recipe.usedExpiringItems?.length || 0;
    recipe.usedExpiringCount = usedExpiringCount;

    logger.info("Recipe generated", { title: recipe.title, usedExpiringCount, totalExpiringItems: expiringItems.length });

    await incrementAiRecipeCount(req.userId!);

    const updatedLimit = await checkAiRecipeLimit(req.userId!);

    return res.json(successResponse({
      ...recipe,
      totalExpiringItems: expiringItems.length,
      prioritizedExpiring: prioritizeExpiring,
      subscription: {
        aiRecipesRemaining: updatedLimit.remaining,
        aiRecipesLimit: updatedLimit.limit,
      },
    }));
  } catch (error) {
    next(error);
  }
});

// Generate recipe image endpoint
const generateImageSchema = z.object({
  title: z.string().min(1, "Recipe title is required").max(100),
  description: z.string().max(1000).optional(),
  cuisine: z.string().max(50).optional(),
});

// Sanitize text input for safe prompt construction
function sanitizeForPrompt(text: string, maxLength: number): string {
  return text
    .replace(/[^\w\s,.-]/g, "") // Remove special characters except basic punctuation
    .trim()
    .slice(0, maxLength);
}

// Allowed cuisines to prevent prompt injection
const ALLOWED_CUISINES = [
  "italian",
  "mexican",
  "chinese",
  "japanese",
  "indian",
  "thai",
  "french",
  "mediterranean",
  "american",
  "korean",
  "vietnamese",
  "greek",
  "spanish",
  "middle eastern",
  "caribbean",
  "african",
];

router.post("/generate-image", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = generateImageSchema.parse(req.body);
    const { title, description, cuisine } = body;

    // Sanitize inputs to prevent prompt injection
    const safeTitle = sanitizeForPrompt(title, 80);
    const safeDescription = description
      ? sanitizeForPrompt(description, 150)
      : "";
    const safeCuisine =
      cuisine && ALLOWED_CUISINES.includes(cuisine.toLowerCase())
        ? cuisine.toLowerCase()
        : "";

    // Build an enhanced prompt for vibrant, appetizing food photography
    let imagePrompt = `Stunning professional food photography of "${safeTitle}"`;

    if (safeDescription) {
      imagePrompt += `, featuring ${safeDescription}`;
    }

    if (safeCuisine) {
      imagePrompt += `. Authentic ${safeCuisine} cuisine presentation with traditional plating style`;
    }

    // Enhanced styling for more vibrant, appetizing images
    imagePrompt += `. Hero shot composition with dramatic lighting from the side creating beautiful shadows and highlights. Rich, saturated colors that make the food look irresistible. Steam or fresh garnishes add life to the dish. Artfully arranged on a beautiful plate or bowl that complements the cuisine. Rustic wooden table or marble surface background with subtle props like fresh herbs, spices, or ingredients scattered artistically. Bokeh background effect. Magazine-quality food styling, Michelin-star presentation. Warm color temperature. Shot with a 50mm lens at f/2.8. Ultra high definition, photorealistic, no text or watermarks.`;

    logger.info("Generating recipe image", { title: safeTitle });

    const response = await openai.images.generate({
      model: "gpt-image-1",
      prompt: imagePrompt,
      n: 1,
      size: "1024x1024",
      quality: "low",
    });

    const imageData = response.data?.[0];

    if (!imageData) {
      throw new Error("No image data returned");
    }

    if (imageData.b64_json) {
      const processed = await processImageFromBase64(imageData.b64_json);
      const displayBase64 = processed.display.toString("base64");
      const thumbnailBase64 = processed.thumbnail.toString("base64");

      return res.json(successResponse({
        imageBase64: displayBase64,
        thumbnailBase64,
        format: "webp",
      }));
    } else if (imageData.url) {
      return res.json(successResponse({
        imageUrl: imageData.url,
      }));
    } else {
      throw new Error("No image URL or data returned");
    }
  } catch (error) {
    next(error);
  }
});

const recipeScanRequestSchema = z.object({
  image: z.string().min(1, "Base64 image data is required"),
});

const RECIPE_SCAN_PROMPT = `Analyze this image of a recipe from a cookbook, magazine, or printed page.

Extract the following information:
1. Recipe title
2. Description (if visible)
3. All ingredients with their quantities
4. Step-by-step cooking instructions
5. Prep time (if visible)
6. Cook time (if visible)
7. Number of servings (if visible)
8. Any notes or tips

Return valid JSON in this exact format:
{
  "title": "Recipe Title",
  "description": "Brief description of the dish",
  "ingredients": [
    "2 cups flour",
    "1 tsp salt",
    "3 large eggs"
  ],
  "instructions": [
    "Preheat oven to 350°F",
    "Mix dry ingredients in a bowl",
    "Add wet ingredients and stir until combined"
  ],
  "prepTime": "15 minutes",
  "cookTime": "30 minutes",
  "servings": 4,
  "notes": "Any additional tips or variations"
}

If the image doesn't show a readable recipe, return:
{
  "error": "Could not read recipe from this image",
  "suggestion": "Please take a clearer photo of the recipe, making sure all text is visible"
}`;

function detectMimeType(base64: string): string {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBORw")) return "image/png";
  if (base64.startsWith("R0lGOD")) return "image/gif";
  if (base64.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

router.post("/scan", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw AppError.unauthorized("Authentication required");
    }

    const hasAccess = await checkFeatureAccess(req.userId, "recipeScanning");
    if (!hasAccess) {
      throw AppError.forbidden(
        "Recipe scanning requires an active subscription. Upgrade to scan recipes from images.",
        "FEATURE_NOT_AVAILABLE",
      ).withDetails({ feature: "recipeScanning" });
    }

    const contentType = req.headers["content-type"] || "";

    let base64Image: string;

    if (contentType.includes("application/json")) {
      const parseResult = recipeScanRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest("Invalid request body", "VALIDATION_ERROR").withDetails({ errors: parseResult.error.errors });
      }
      base64Image = parseResult.data.image.replace(
        /^data:image\/\w+;base64,/,
        "",
      );
    } else {
      throw AppError.badRequest("Expected application/json content type", "INVALID_CONTENT_TYPE");
    }

    const mimeType = detectMimeType(base64Image);
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    logger.info("Scanning recipe image", { imageSizeKB: (base64Image.length / 1024).toFixed(1) });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert at reading and extracting recipes from images of cookbooks, magazines, and printed recipe cards. Extract information accurately and return valid JSON.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: RECIPE_SCAN_PROMPT,
            },
            {
              type: "image_url",
              image_url: {
                url: dataUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4096,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI service");
    }

    let result: any;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      throw new Error("Failed to parse recipe scan results");
    }

    if (result.error) {
      return res.status(200).json(errorResponse(result.error, "SCAN_FAILED", { suggestion: result.suggestion }));
    }

    logger.info("Recipe scan complete", { title: result.title });

    return res.json(successResponse({
      title: result.title || "Untitled Recipe",
      description: result.description || "",
      ingredients: result.ingredients || [],
      instructions: result.instructions || [],
      prepTime: result.prepTime || "",
      cookTime: result.cookTime || "",
      servings: result.servings || 4,
      notes: result.notes || "",
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
