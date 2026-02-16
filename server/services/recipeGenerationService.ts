import OpenAI from "openai";
import { z } from "zod";
import {
  formatInventoryForPrompt,
  UNIT_CONVERSION_PROMPT_ADDITION,
  normalizeUnit,
  compareQuantities,
  AvailabilityStatus,
} from "../lib/unit-conversion";
import {
  checkAiRecipeLimit,
  incrementAiRecipeCount,
} from "./subscriptionService";
import {
  formatSubstitutionsForPrompt,
} from "../config/ingredient-substitutions";
import { logger } from "../lib/logger";
import { AppError } from "../middleware/errorHandler";
import { processImageFromBase64, processImage } from "./imageProcessingService";
import { withCircuitBreaker } from "../lib/circuit-breaker";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

export const generateRecipeSchema = z.object({
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

export const generateImageSchema = z.object({
  recipeId: z.string().min(1, "Recipe ID is required"),
  title: z.string().min(1, "Recipe title is required").max(100),
  description: z.string().max(1000).optional(),
  cuisine: z.string().max(50).optional(),
});

export const recipeScanRequestSchema = z.object({
  image: z.string().min(1, "Base64 image data is required"),
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

export interface GeneratedRecipe {
  title: string;
  description: string;
  ingredients: Array<{
    name: string;
    inventoryMatch?: string;
    quantity: number | string;
    unit: string;
    fromInventory?: boolean;
    availabilityStatus?: AvailabilityStatus;
    percentAvailable?: number;
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

export interface GenerateRecipeParams {
  userId: string;
  prioritizeExpiring?: boolean;
  quickRecipe?: boolean;
  selectedIngredientIds?: (number | string)[];
  servings?: number;
  maxTime?: number;
  dietaryRestrictions?: string;
  cuisine?: string;
  mealType?: "breakfast" | "lunch" | "dinner" | "snack" | "late night snack";
  inventory: InventoryItem[];
  equipment?: EquipmentItem[];
  macroTargets?: { protein: number; carbs: number; fat: number };
  previousRecipeTitles?: string[];
  ingredientCount?: { min: number; max: number };
}

export interface GenerateRecipeResult {
  success: boolean;
  recipe?: GeneratedRecipe & {
    id: string;
    isFavorite: boolean;
    isAIGenerated: boolean;
    createdAt: string;
    totalExpiringItems?: number;
    prioritizedExpiring?: boolean;
  };
  subscription?: {
    aiRecipesRemaining: number | "unlimited";
    aiRecipesLimit: number | "unlimited";
  };
  error?: string;
  details?: string;
  code?: string;
}

export interface PostProcessResult {
  recipe: GeneratedRecipe;
  inventoryIngredients: GeneratedRecipe["ingredients"];
  filteredCount: number;
}

export interface ImageResult {
  imageBase64: string;
  thumbnailBase64: string;
  format: string;
}

export interface ScannedRecipe {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prepTime: string;
  cookTime: string;
  servings: number;
  notes: string;
  error?: string;
  suggestion?: string;
}

export type ChatMessage = { role: "system" | "user"; content: string };

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

export const ALLOWED_CUISINES = [
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

export const RECIPE_SCAN_PROMPT = `Analyze this image of a recipe from a cookbook, magazine, or printed page.

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

const CUISINE_CHEF_PERSONAS: Record<string, {
  name: string;
  title: string;
  philosophy: string;
  techniques: string[];
  signatureElements: string[];
}> = {
  italian: {
    name: "Chef Marco",
    title: "Italian Culinary Master",
    philosophy: "In Italian cooking, we let ingredients speak for themselves. Quality over complexity - a few perfect ingredients prepared with respect create magic. We cook with love, season with intuition, and always taste as we go.",
    techniques: [
      "Building flavor through proper sautéing in olive oil",
      "Al dente pasta cooking with starchy water reserved",
      "Layering herbs at different cooking stages",
      "Finishing dishes with high-quality olive oil",
    ],
    signatureElements: ["Fresh herbs (basil, oregano, rosemary)", "Garlic and olive oil foundation", "Parmesan and pecorino", "Tomato-based sauces built slowly"],
  },
  mexican: {
    name: "Chef Rosa",
    title: "Mexican Culinary Tradition Keeper",
    philosophy: "Mexican cuisine is about bold, layered flavors built through generations of wisdom. We toast our spices, char our peppers, and understand that the best dishes tell stories of family and heritage.",
    techniques: [
      "Toasting dried chiles and spices before use",
      "Building complex salsas with roasted ingredients",
      "Properly seasoning proteins with citrus and spice",
      "Layering textures - crispy, creamy, fresh",
    ],
    signatureElements: ["Cumin, coriander, and chile powder", "Fresh lime and cilantro", "Layered heat from various peppers", "Corn and bean foundations"],
  },
  asian: {
    name: "Chef Wei",
    title: "Pan-Asian Culinary Expert",
    philosophy: "Asian cooking is about balance - sweet, sour, salty, bitter, and umami in harmony. We respect the wok's heat, cut ingredients with precision, and understand that preparation is everything.",
    techniques: [
      "High-heat wok cooking for proper 'wok hei'",
      "Mise en place - everything prepared before cooking",
      "Balancing the five flavors in every dish",
      "Proper marinating for tender, flavorful proteins",
    ],
    signatureElements: ["Soy sauce and fish sauce for depth", "Fresh ginger and garlic", "Sesame oil as finishing touch", "Rice and noodle foundations"],
  },
  mediterranean: {
    name: "Chef Sophia",
    title: "Mediterranean Wellness Chef",
    philosophy: "Mediterranean cooking celebrates the sun, the sea, and the garden. We use olive oil generously, embrace vegetables as stars not sides, and understand that healthy eating should be delicious eating.",
    techniques: [
      "Roasting vegetables to caramelize natural sugars",
      "Building mezze-style small plates",
      "Marinating with lemon, olive oil, and herbs",
      "Grilling for smoky depth",
    ],
    signatureElements: ["Extra virgin olive oil throughout", "Lemon and garlic brightness", "Fresh herbs like oregano and mint", "Feta, olives, and capers for salt"],
  },
  indian: {
    name: "Chef Priya",
    title: "Indian Spice Master",
    philosophy: "Indian cooking is alchemy - transforming humble ingredients through spice and technique into something transcendent. We bloom our spices in oil, build masalas with care, and understand that patience creates depth.",
    techniques: [
      "Blooming whole spices in hot oil (tadka)",
      "Building flavor through onion-tomato-ginger base",
      "Toasting and grinding fresh spice blends",
      "Slow cooking for developed, complex flavors",
    ],
    signatureElements: ["Cumin, coriander, turmeric foundation", "Fresh ginger and garlic paste", "Garam masala as finishing spice", "Yogurt for marinades and cooling"],
  },
  french: {
    name: "Chef Jean-Pierre",
    title: "Classical French Cuisine Master",
    philosophy: "French cooking is the foundation of culinary arts. We build from mother sauces, respect mise en place, and understand that technique creates elegance. Butter is not feared - it is celebrated.",
    techniques: [
      "Building fond through proper searing",
      "Creating pan sauces with deglazing",
      "Proper emulsification for silky sauces",
      "Resting meats and finishing with butter",
    ],
    signatureElements: ["Butter, shallots, and wine", "Fresh thyme, tarragon, and parsley", "Stocks and reductions for depth", "Classical herb bouquets"],
  },
  japanese: {
    name: "Chef Takeshi",
    title: "Japanese Culinary Artist",
    philosophy: "Japanese cooking honors the ingredient's natural essence. We cut with precision, balance presentation with flavor, and understand that simplicity requires the greatest skill. Every element serves a purpose.",
    techniques: [
      "Knife skills for uniform, beautiful cuts",
      "Dashi building for umami foundation",
      "Quick cooking to preserve freshness",
      "Presentation as art form",
    ],
    signatureElements: ["Soy sauce, mirin, sake balance", "Dashi and miso for umami", "Rice as sacred foundation", "Fresh, seasonal ingredients"],
  },
  chinese: {
    name: "Chef Lin",
    title: "Chinese Regional Cuisine Expert",
    philosophy: "Chinese cooking spans thousands of years and dozens of regional styles. We understand the breath of the wok, the importance of texture, and that balance of yin and yang creates perfect dishes.",
    techniques: [
      "Velveting proteins for silky texture",
      "Wok hei - the breath of the wok",
      "Stir-frying in proper sequence",
      "Balancing colors and textures",
    ],
    signatureElements: ["Soy, rice wine, and sesame oil", "Five-spice and white pepper", "Ginger-scallion aromatics", "Cornstarch for silky sauces"],
  },
  thai: {
    name: "Chef Niran",
    title: "Thai Flavor Balance Master",
    philosophy: "Thai cooking is about harmony of opposites - spicy and cooling, sweet and sour, salty and fresh. We build layers of flavor from curry paste foundations and finish with fresh herbs that sing.",
    techniques: [
      "Pounding curry pastes for aromatic base",
      "Balancing fish sauce, lime, sugar, and chile",
      "Cooking with coconut milk properly",
      "Finishing with fresh Thai basil and lime",
    ],
    signatureElements: ["Fish sauce for savory depth", "Fresh lime and palm sugar balance", "Lemongrass, galangal, kaffir lime", "Thai basil and cilantro finish"],
  },
  korean: {
    name: "Chef Min-jun",
    title: "Korean Fermentation & Flavor Expert",
    philosophy: "Korean cooking celebrates fermentation, bold flavors, and communal eating. We understand that gochujang, doenjang, and kimchi aren't just ingredients - they're living traditions that add soul to every dish.",
    techniques: [
      "Building ssam (wrap) style presentations",
      "Marinating with gochujang and soy",
      "Balancing fermented pastes with fresh elements",
      "Creating banchan-style accompaniments",
    ],
    signatureElements: ["Gochujang and gochugaru for heat", "Sesame oil and seeds", "Fermented elements like kimchi", "Rice and noodle foundations"],
  },
  greek: {
    name: "Chef Dimitris",
    title: "Greek Taverna Tradition Keeper",
    philosophy: "Greek cooking is honest food - simple preparations that let quality ingredients shine. We drizzle olive oil generously, squeeze lemon liberally, and understand that the best meals are shared with family.",
    techniques: [
      "Slow roasting for tender, flavorful results",
      "Building layers in baked dishes",
      "Marinating with lemon, olive oil, oregano",
      "Charring vegetables for depth",
    ],
    signatureElements: ["Olive oil and lemon everywhere", "Oregano, dill, and mint", "Feta cheese crumbled generously", "Garlic and honey accents"],
  },
};

function getChefBackstory(cuisine?: string): string {
  if (!cuisine) {
    return `You are the Head Chef at ChefSpAIce Kitchen - a creative culinary director who draws from global traditions to create delicious, waste-reducing recipes. You respect all cuisines and adapt techniques to what the home cook has available.`;
  }
  
  const cuisineLower = cuisine.toLowerCase();
  const chef = CUISINE_CHEF_PERSONAS[cuisineLower];
  
  if (!chef) {
    return `You are the Head Chef at ChefSpAIce Kitchen, and today you're channeling the spirit of ${cuisine} cuisine. Draw on authentic techniques and flavor profiles while adapting to what the home cook has available.`;
  }
  
  let backstory = `You are ${chef.name}, ${chef.title} at ChefSpAIce Kitchen.\n\n`;
  backstory += `YOUR PHILOSOPHY: "${chef.philosophy}"\n\n`;
  backstory += `YOUR TECHNIQUES:\n`;
  chef.techniques.forEach(t => backstory += `- ${t}\n`);
  backstory += `\nYOUR SIGNATURE ELEMENTS:\n`;
  chef.signatureElements.forEach(s => backstory += `- ${s}\n`);
  
  return backstory;
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
  void _prioritizeExpiring;

  const chefBackstory = getChefBackstory(cuisine);
  
  let prompt = `=== YOUR CULINARY IDENTITY ===\n\n${chefBackstory}\n\n`;

  prompt += `=== MISSION ===\n\n`;
  prompt += `Help reduce food waste by creating delicious recipes from the user's available ingredients.\n\n`;

  prompt += `=== SMART RECIPE CREATION ===\n\n`;

  prompt += `PRIMARY GOAL: Create the BEST possible recipe using the user's inventory. Apply your culinary expertise and techniques!\n\n`;

  prompt += `INVENTORY ITEMS: Start with what the user has available (listed below).\n\n`;

  prompt += `ALWAYS AVAILABLE: Water and ice are always available and can be used freely.\n\n`;

  prompt += `=== SMART SUBSTITUTIONS ===\n\n`;

  prompt += `When crafting the recipe, use ONLY ingredients from the user's inventory.\n`;
  prompt += `If an ideal ingredient isn't available but a suitable substitute IS in their inventory, use the substitute and add a subtle note.\n\n`;

  prompt += `Include a "substitutionNotes" array with helpful hints ONLY when you're using a substitute:\n`;
  prompt += `- "Using lime juice here - lemon would also work beautifully"\n`;
  prompt += `- "Butter adds richness - olive oil is a lighter alternative"\n`;
  prompt += `- "Greek yogurt makes a great stand-in for sour cream"\n`;
  prompt += `- "Tortillas work perfectly in place of bread for this"\n\n`;

  prompt += `Only include notes when you're actually using a substitute from their inventory - don't suggest ingredients they don't have.\n\n`;

  prompt += `Common substitution categories to reference:\n`;
  prompt += formatSubstitutionsForPrompt();
  prompt += `\n`;

  prompt += `=== INGREDIENT NAMING ===\n\n`;

  prompt += `For matching purposes, include an "inventoryMatch" field that maps to the EXACT inventory name.\n`;
  prompt += `For display purposes, use a clean, appetizing name in the "name" field.\n`;
  prompt += `Example: If inventory has "boneless skinless chicken breast", you can display as "chicken breast" but inventoryMatch should be "boneless skinless chicken breast".\n\n`;

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
  prompt += `Create a balanced, satisfying meal that feels complete.\n\n`;

  const hasEquipment = equipment && equipment.length > 0;
  const examplePrepTime = quickRecipe ? 5 : 15;
  const exampleCookTime = quickRecipe ? 10 : 30;

  prompt += `=== RESPONSE FORMAT ===\n`;
  prompt += `Respond with ONLY valid JSON matching this exact schema:\n`;
  prompt += `{
  "title": "Creative Recipe Name",
  "description": "One appetizing sentence about the dish",
  "ingredients": [
    {"name": "Clean Display Name", "inventoryMatch": "exact inventory item name", "quantity": 2, "unit": "cups", "fromInventory": true}
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
  prompt += `- All ingredients come from the user's inventory\n`;
  prompt += `- Each ingredient has both "name" (display) and "inventoryMatch" (exact inventory name) fields\n`;
  prompt += `- All inventory ingredients marked fromInventory: true\n`;
  prompt += `- Include substitution notes ONLY when using a substitute (empty array if no substitutes used)\n`;
  prompt += `- Title and description use natural, appetizing language\n`;
  prompt += `- Recipe is different from previous generations if any were listed\n`;
  prompt += `- Total time (prepTime + cookTime) ≤ ${quickRecipe ? 20 : maxTime} minutes\n`;
  prompt += `- Ingredient count is between ${ingredientCount.min} and ${ingredientCount.max}\n`;

  return prompt;
}

export function fuzzyMatch(recipeIngredient: string, inventoryItem: string): boolean {
  const normalize = (s: string) => {
    let normalized = s
      .toLowerCase()
      .trim()
      .replace(/[,()]/g, " ")
      .replace(
        /\b(fresh|organic|raw|cooked|frozen|canned|dried|whole|sliced|diced|chopped|minced|ground|crushed|shredded|grated|peeled|boneless|skinless|lean|extra\s*virgin|light|heavy|low[\s-]?fat|fat[\s-]?free|unsalted|salted|sweetened|unsweetened|plain|greek|regular|large|medium|small|ripe|overripe|unripe|commercially\s*prepared|store[\s-]?bought|homemade|white|wheat|multigrain|enriched)\b/g,
        "",
      )
      .replace(/\b(loaf|loaves|slice|slices|bag|package|can|jar|bottle|box|bunch|head)\s+of\s+/g, "")
      .replace(/\s+/g, " ")
      .trim();

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

    for (const [plural, singular] of Object.entries(vesWordsToF)) {
      if (normalized.endsWith(plural)) {
        normalized = normalized.slice(0, -plural.length) + singular;
        break;
      }
    }

    if (!normalized.endsWith("f") && !normalized.endsWith("fe")) {
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

      const skipDepluralization = singularWordsEndingInS.has(normalized);

      if (!skipDepluralization) {
        if (normalized.endsWith("ies")) {
          normalized = normalized.slice(0, -3) + "y";
        } else if (normalized.endsWith("oes")) {
          normalized = normalized.slice(0, -2);
        } else if (normalized.match(/(sh|ch|x|z|ss)es$/)) {
          normalized = normalized.slice(0, -2);
        } else if (normalized.endsWith("s") && normalized.length > 3) {
          normalized = normalized.slice(0, -1);
        }
      }
    }

    normalized = normalized.replace(/[-_]/g, " ");

    return normalized;
  };

  const normRecipe = normalize(recipeIngredient);
  const normInventory = normalize(inventoryItem);

  if (normRecipe === normInventory) return true;

  if (
    normRecipe.includes(normInventory) ||
    normInventory.includes(normRecipe)
  )
    return true;

  const wordsRecipe = normRecipe.split(/\s+/).filter((w) => w.length > 1);
  const wordsInventory = normInventory
    .split(/\s+/)
    .filter((w) => w.length > 1);

  const coreRecipe = wordsRecipe[wordsRecipe.length - 1] || normRecipe;
  const coreInventory =
    wordsInventory[wordsInventory.length - 1] || normInventory;
  if (coreRecipe === coreInventory) return true;

  const matchingWords = wordsRecipe.filter((wr) =>
    wordsInventory.some(
      (wi) =>
        wr === wi ||
        (wr.length > 3 &&
          wi.length > 3 &&
          (wr.includes(wi) || wi.includes(wr))),
    ),
  );

  if (
    matchingWords.length > 0 &&
    matchingWords.length >=
      Math.max(1, Math.min(wordsRecipe.length, wordsInventory.length) * 0.4)
  ) {
    return true;
  }

  return false;
}

export function isAllowedUtility(ingredientName: string): boolean {
  const normalized = ingredientName.toLowerCase().trim();
  return ALLOWED_UTILITIES.has(normalized);
}

export function sanitizeForPrompt(text: string, maxLength: number): string {
  return text
    .replace(/[^\w\s,.-]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function detectMimeType(base64: string): string {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBORw")) return "image/png";
  if (base64.startsWith("R0lGOD")) return "image/gif";
  if (base64.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

const FOOD_TERMS = [
  "chicken", "beef", "pork", "fish", "salmon", "tuna", "shrimp", "lamb", "bacon",
  "ham", "turkey", "sausage", "steak", "ground meat", "meatball", "tofu", "tempeh",
  "seitan", "duck", "veal", "crab", "lobster", "scallop",
  "tomato", "tomatoes", "onion", "onions", "garlic", "mushroom", "mushrooms",
  "carrot", "carrots", "potato", "potatoes", "broccoli", "spinach", "lettuce",
  "cucumber", "zucchini", "squash", "eggplant", "bell pepper", "jalapeño", "celery",
  "cabbage", "kale", "asparagus", "cauliflower", "green beans", "artichoke", "beet",
  "radish", "turnip", "leek", "shallot", "scallion",
  "apple", "banana", "orange", "lemon", "lime", "avocado", "mango", "pineapple",
  "strawberry", "blueberry", "raspberry", "grape", "peach", "pear", "melon",
  "watermelon", "cherry", "kiwi", "coconut", "pomegranate", "fig", "date",
  "cheese", "cheddar", "mozzarella", "parmesan", "feta", "cream cheese", "cream",
  "milk", "yogurt", "sour cream", "butter", "ghee", "ricotta",
  "rice", "pasta", "noodle", "bread", "tortilla", "quinoa", "couscous", "oat",
  "barley", "farro", "bulgur", "flour", "cornmeal", "polenta",
  "egg", "eggs",
  "mayo", "mayonnaise", "ketchup", "mustard", "soy sauce", "vinegar", "hot sauce",
  "sriracha", "worcestershire", "tahini", "pesto",
  "beans", "lentil", "chickpea", "black beans", "kidney beans", "pinto beans",
  "cilantro", "basil", "parsley", "thyme", "rosemary", "oregano", "dill", "mint",
  "sage", "chive", "ginger",
  "corn", "peas", "olive", "caper", "pickle", "honey", "maple syrup", "almond",
  "walnut", "cashew", "peanut", "pecan", "pistachio",
];

function findUnmatchedIngredients(text: string, validIngredientTerms: string[]): string[] {
  const textLower = text.toLowerCase();

  return FOOD_TERMS.filter((term) => {
    if (!textLower.includes(term)) return false;
    if (ALLOWED_UTILITIES.has(term)) return false;
    return !validIngredientTerms.some(
      (valid) => valid.includes(term) || term.includes(valid),
    );
  });
}

export function postProcessRecipe(
  recipe: GeneratedRecipe,
  inventoryItems: InventoryItem[],
  quickRecipe: boolean,
): PostProcessResult {
  const originalIngredientCount = recipe.ingredients?.length || 0;
  recipe.ingredients = (recipe.ingredients || [])
    .map((ing) => {
      const matchedInventoryItem = inventoryItems.find((invItem) =>
        fuzzyMatch(ing.inventoryMatch || ing.name, invItem.name),
      );

      if (matchedInventoryItem) {
        const recipeQty = typeof ing.quantity === 'number' ? ing.quantity : parseFloat(String(ing.quantity)) || 1;
        const recipeUnit = ing.unit || '';
        const inventoryQty = matchedInventoryItem.quantity || 1;
        const inventoryUnit = matchedInventoryItem.unit || null;

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

      if (process.env.NODE_ENV !== "production") {
        logger.debug("Removing ingredient not in inventory", { ingredient: ing.name });
      }
      return null;
    })
    .filter((ing): ing is NonNullable<typeof ing> => ing !== null);

  const inventoryIngredients = recipe.ingredients.filter(
    (ing) => ing.fromInventory === true,
  );
  if (inventoryIngredients.length < 2) {
    throw AppError.badRequest(
      "Could not generate a valid recipe",
      "INSUFFICIENT_INGREDIENTS",
    ).withDetails({ details: "Not enough matching ingredients were found. Please try again or add more items to your inventory." });
  }

  const validIngredientTerms = recipe.ingredients.flatMap((ing) => {
    const name = ing.name.toLowerCase();
    const words = name.split(/\s+/).filter((w) => w.length > 2);
    return [name, ...words];
  });

  const descPhantoms = findUnmatchedIngredients(recipe.description || "", validIngredientTerms);
  if (descPhantoms.length > 0) {
    if (process.env.NODE_ENV !== "production") {
      logger.debug("Description mentions invalid ingredients, rewriting", { phantomIngredients: descPhantoms });
    }
    const ingredientList = inventoryIngredients.map((i) => i.name).join(", ");
    recipe.description = `A delicious dish featuring ${ingredientList}.`;
  }

  const instructionsText = (recipe.instructions || []).join(" ");
  const instrPhantoms = findUnmatchedIngredients(instructionsText, validIngredientTerms);
  if (instrPhantoms.length > 0) {
    if (process.env.NODE_ENV !== "production") {
      logger.debug("Instructions mention invalid ingredients, filtering", { phantomIngredients: instrPhantoms });
    }
    recipe.instructions = (recipe.instructions || []).map((step) => {
      let cleanStep = step;
      instrPhantoms.forEach((phantom) => {
        const regex = new RegExp(`\\b${phantom}s?\\b`, "gi");
        cleanStep = cleanStep.replace(regex, "ingredients");
      });
      return cleanStep;
    });
  }

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

  return { recipe, inventoryIngredients, filteredCount };
}

export function buildOpenAIMessages(
  prompt: string,
  ingredientCount: { min: number; max: number },
): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a master chef at ChefSpAIce Kitchen, crafting authentic, delicious recipes using proper culinary techniques.

YOUR CORE PRINCIPLES:
1. Apply authentic techniques and flavor profiles for the cuisine you're creating
2. Create the BEST possible recipe using ONLY what the user has available
3. Use fuzzy matching: "chicken" matches "chicken breast", "apple" matches "green apples"
4. Water and ice are always available
5. For each ingredient, provide a clean "name" for display and "inventoryMatch" for the exact inventory item
6. When using a substitute from their inventory, add a subtle note (e.g., "Using lime here - lemon works too")
7. Only add substitution notes when you're actually using a substitute - don't suggest ingredients they don't have
8. Write instructions that teach proper technique, not just steps
9. Always respond with valid JSON matching the exact schema provided`,
    },
    {
      role: "user",
      content: prompt,
    },
  ];
}

export async function generateRecipeImage(
  title: string,
  description?: string,
  cuisine?: string,
): Promise<ImageResult> {
  const safeTitle = sanitizeForPrompt(title, 80);
  const safeDescription = description
    ? sanitizeForPrompt(description, 150)
    : "";
  const safeCuisine =
    cuisine && ALLOWED_CUISINES.includes(cuisine.toLowerCase())
      ? cuisine.toLowerCase()
      : "";

  let imagePrompt = `Stunning professional food photography of "${safeTitle}"`;

  if (safeDescription) {
    imagePrompt += `, featuring ${safeDescription}`;
  }

  if (safeCuisine) {
    imagePrompt += `. Authentic ${safeCuisine} cuisine presentation with traditional plating style`;
  }

  imagePrompt += `. Hero shot composition with dramatic lighting from the side creating beautiful shadows and highlights. Rich, saturated colors that make the food look irresistible. Steam or fresh garnishes add life to the dish. Artfully arranged on a beautiful plate or bowl that complements the cuisine. Rustic wooden table or marble surface background with subtle props like fresh herbs, spices, or ingredients scattered artistically. Bokeh background effect. Magazine-quality food styling, Michelin-star presentation. Warm color temperature. Shot with a 50mm lens at f/2.8. Ultra high definition, photorealistic, no text or watermarks.`;

  logger.info("Generating recipe image", { title: safeTitle });

  const response = await withCircuitBreaker("openai", () => openai.images.generate({
    model: "gpt-image-1",
    prompt: imagePrompt,
    n: 1,
    size: "512x512",
    quality: "medium",
  }));

  const imageData = response.data?.[0];

  if (!imageData) {
    throw new Error("No image data returned");
  }

  if (imageData.b64_json) {
    const processed = await processImageFromBase64(imageData.b64_json);
    const displayBase64 = processed.display.toString("base64");
    const thumbnailBase64 = processed.thumbnail.toString("base64");

    return {
      imageBase64: displayBase64,
      thumbnailBase64,
      format: "webp",
    };
  } else if (imageData.url) {
    const imageResponse = await fetch(imageData.url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from URL: ${imageResponse.status}`);
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const processed = await processImage(buffer);
    const displayBase64 = processed.display.toString("base64");
    const thumbnailBase64 = processed.thumbnail.toString("base64");

    return {
      imageBase64: displayBase64,
      thumbnailBase64,
      format: "webp",
    };
  } else {
    throw new Error("No image URL or data returned");
  }
}

export async function scanRecipeFromImage(base64Image: string): Promise<ScannedRecipe> {
  const mimeType = detectMimeType(base64Image);
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  logger.info("Scanning recipe image", { imageSizeKB: (base64Image.length / 1024).toFixed(1) });

  const completion = await withCircuitBreaker("openai", () => openai.chat.completions.create({
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
  }));

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

  logger.info("Recipe scan complete", { title: result.title });

  return {
    title: result.title || "Untitled Recipe",
    description: result.description || "",
    ingredients: result.ingredients || [],
    instructions: result.instructions || [],
    prepTime: result.prepTime || "",
    cookTime: result.cookTime || "",
    servings: result.servings || 4,
    notes: result.notes || "",
    error: result.error,
    suggestion: result.suggestion,
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function generateRecipe(
  params: GenerateRecipeParams
): Promise<GenerateRecipeResult> {
  try {
    const {
      userId,
      prioritizeExpiring = false,
      quickRecipe = false,
      selectedIngredientIds,
      servings = 4,
      maxTime = 60,
      dietaryRestrictions,
      cuisine,
      mealType,
      inventory,
      equipment,
      macroTargets = { protein: 50, carbs: 35, fat: 15 },
      previousRecipeTitles = [],
      ingredientCount = { min: 4, max: 6 },
    } = params;

    const limitCheck = await checkAiRecipeLimit(userId);
    const remaining = typeof limitCheck.remaining === 'number' ? limitCheck.remaining : Infinity;
    if (remaining < 1) {
      return {
        success: false,
        error: "Monthly AI recipe limit reached. Upgrade your subscription for unlimited recipes.",
        code: "AI_RECIPE_LIMIT_REACHED",
      };
    }

    if (!inventory || inventory.length === 0) {
      return {
        success: false,
        error: "No ingredients available",
        details: "Please add items to your inventory first.",
      };
    }

    const { expiringItems, otherItems } = organizeInventory(
      inventory,
      selectedIngredientIds,
    );

    if (expiringItems.length === 0 && otherItems.length === 0) {
      return {
        success: false,
        error: "No ingredients to use",
        details: "Please add items to your inventory.",
      };
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
      logger.debug("Smart generation prompt", { promptPreview: prompt.substring(0, 500) });
    }

    const messages = buildOpenAIMessages(prompt, ingredientCount);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    let recipe: GeneratedRecipe = JSON.parse(content);

    const allInventoryItems = [...expiringItems, ...otherItems];

    const postProcessed = postProcessRecipe(recipe, allInventoryItems, quickRecipe);
    recipe = postProcessed.recipe;

    if (postProcessed.inventoryIngredients.length < 2) {
      return {
        success: false,
        error: "Could not generate a valid recipe",
        details: "Not enough matching ingredients were found. Please try again or add more items to your inventory.",
      };
    }

    logger.info("Recipe generated", { title: recipe.title, usedExpiringCount: recipe.usedExpiringCount, totalExpiringItems: expiringItems.length });

    await incrementAiRecipeCount(userId);
    const updatedLimit = await checkAiRecipeLimit(userId);

    const savedRecipe = {
      id: generateId(),
      ...recipe,
      isFavorite: false,
      isAIGenerated: true,
      createdAt: new Date().toISOString(),
      totalExpiringItems: expiringItems.length,
      prioritizedExpiring: prioritizeExpiring,
    };

    return {
      success: true,
      recipe: savedRecipe,
      subscription: {
        aiRecipesRemaining: updatedLimit.remaining,
        aiRecipesLimit: updatedLimit.limit,
      },
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    if (error instanceof OpenAI.APIError) {
      const status = error.status;
      logger.error("OpenAI API error during recipe generation", {
        status,
        message: error.message,
        code: error.code,
        type: error.type,
      });

      if (status === 429) {
        throw new AppError(
          "Our recipe service is experiencing high demand. Please wait a moment and try again.",
          429,
          "AI_RATE_LIMITED",
        );
      }

      if (status === 503) {
        throw new AppError(
          "Our recipe engine is temporarily unavailable. Please try again in a few minutes.",
          503,
          "AI_MODEL_UNAVAILABLE",
        );
      }

      if (status === 400) {
        throw new AppError(
          "Something went wrong with the recipe request. Please adjust your preferences and try again.",
          400,
          "AI_INVALID_REQUEST",
        );
      }

      if (status === 401 || status === 403) {
        throw new AppError(
          "The recipe service is temporarily unable to authenticate. Please try again later or contact support.",
          502,
          "AI_AUTH_ERROR",
        );
      }

      throw new AppError(
        "An unexpected error occurred while generating your recipe. Please try again.",
        502,
        "AI_SERVICE_ERROR",
      );
    }

    logger.error("Recipe generation error", { error: error instanceof Error ? error.message : String(error) });
    return {
      success: false,
      error: "Failed to generate recipe",
    };
  }
}
