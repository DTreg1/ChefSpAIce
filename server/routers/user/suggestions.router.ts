import { Router, type Request, type Response, type NextFunction } from "express";
import OpenAI from "openai";
import { z } from "zod";
import {
  generateItemsHash,
  parseTips,
  isCacheValid,
  type ExpiringItem,
  type WasteReductionCacheEntry,
} from "../../lib/waste-reduction-utils";
import { logger } from "../../lib/logger";
import { AppError } from "../../middleware/errorHandler";
import { successResponse } from "../../lib/apiResponse";
import { withCircuitBreaker } from "../../lib/circuit-breaker";
import { validateBody } from "../../middleware/validateBody";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const wasteReductionCache = new Map<string, WasteReductionCacheEntry>();

function getFromCache(key: string): WasteReductionCacheEntry | null {
  const entry = wasteReductionCache.get(key);
  if (!entry) return null;

  if (!isCacheValid(entry.timestamp)) {
    wasteReductionCache.delete(key);
    return null;
  }

  return entry;
}

function setInCache(
  key: string,
  data: Omit<WasteReductionCacheEntry, "timestamp">,
): void {
  wasteReductionCache.set(key, {
    ...data,
    timestamp: Date.now(),
  });
}

const shelfLifeCache = new Map<
  string,
  {
    suggestedDays: number;
    confidence: string;
    source: string;
    notes?: string;
    signsOfSpoilage?: string;
    timestamp: number;
  }
>();

const shelfLifeSchema = z.object({
  foodName: z.string().min(1, "Food name is required"),
  category: z.string().optional(),
  storageLocation: z.string().min(1, "Storage location is required"),
});

router.post("/shelf-life", validateBody(shelfLifeSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { foodName, category, storageLocation } = req.body;

    const cacheKey = `${foodName.toLowerCase()}:${category?.toLowerCase() || ""}:${storageLocation.toLowerCase()}`;
    const cached = shelfLifeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
      return res.json(successResponse({
        suggestedDays: cached.suggestedDays,
        confidence: cached.confidence,
        source: cached.source,
        notes: cached.notes,
        signsOfSpoilage: cached.signsOfSpoilage,
      }));
    }

    const prompt = `You are a food safety expert. Determine the shelf life for the following food item.

Food item: ${foodName}
Category: ${category || "Unknown"}
Storage location: ${storageLocation}

Provide the estimated shelf life in days. Consider:
- Food safety guidelines (USDA, FDA)
- The specific storage location (${storageLocation})
- Whether the item is opened or unopened (assume fresh/unopened)

Return JSON:
{
  "suggestedDays": <number>,
  "confidence": "high" | "medium" | "low",
  "notes": "<brief storage tip>",
  "signsOfSpoilage": "<what to look for when it goes bad>"
}`;

    const completion = await withCircuitBreaker("openai", () => openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a food safety expert. Always respond with valid JSON. Be conservative with shelf life estimates for safety.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 256,
    }));

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);
    const result = {
      suggestedDays: parsed.suggestedDays || 7,
      confidence: parsed.confidence || "medium",
      source: "ai" as const,
      notes: parsed.notes,
      signsOfSpoilage: parsed.signsOfSpoilage,
    };

    shelfLifeCache.set(cacheKey, { ...result, timestamp: Date.now() });

    return res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

const wasteReductionSchema = z.object({
  expiringItems: z.array(z.object({
    id: z.number().optional(),
    name: z.string().optional(),
    daysUntilExpiry: z.number().optional(),
    quantity: z.number().optional(),
  })).optional().default([]),
});

router.post("/waste-reduction", validateBody(wasteReductionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const forceRefresh = req.query.refresh === "true";
    const clientItems = req.body.expiringItems;

    if (clientItems.length === 0) {
      return res.json(successResponse({
        suggestions: [],
        expiringItems: [],
      }));
    }

    const expiringItems: ExpiringItem[] = clientItems.map((item: any) => ({
      id: item.id || 0,
      name: item.name || "Unknown",
      daysUntilExpiry: Math.max(0, item.daysUntilExpiry || 0),
      quantity: item.quantity || 1,
    }));

    const deviceId = (req.headers["x-device-id"] as string) || "anonymous";
    const itemsHash = generateItemsHash(expiringItems);
    const cacheKey = `${deviceId}:${itemsHash}`;

    if (forceRefresh) {
      wasteReductionCache.delete(cacheKey);
    }

    const cached = getFromCache(cacheKey);
    if (cached && !forceRefresh) {
      if (process.env.NODE_ENV !== "production") {
        logger.debug("Waste reduction cache hit", { deviceId });
      }
      return res.json(successResponse({
        suggestions: cached.suggestions,
        expiringItems: cached.expiringItems,
      }));
    }

    const itemsList = expiringItems
      .map(
        (item) =>
          `- ${item.name} (${item.quantity}x) - expires in ${item.daysUntilExpiry} day${item.daysUntilExpiry !== 1 ? "s" : ""}`,
      )
      .join("\n");

    const prompt = `You are a food waste reduction expert helping a home cook.

These food items are expiring soon:
${itemsList}

Provide 3-5 actionable tips to help use these items before they expire.

Categories (MUST use exactly one per tip):
- "recipe": For cooking/meal suggestions - include a searchQuery for finding recipes
- "storage": For storage tips to extend freshness
- "freeze": For freezing recommendations
- "preserve": For canning, pickling, or preservation methods
- "general": For other general tips

Rules:
- Each tip text under 100 characters
- Be specific to the items listed
- Prioritize items expiring soonest
- Practical for home cooks
- Include at least one recipe tip with searchQuery
- For recipe tips, searchQuery should be a simple recipe search term

Return JSON:
{
  "suggestions": [
    {
      "text": "Make a stir-fry with the expiring vegetables",
      "category": "recipe",
      "searchQuery": "vegetable stir fry"
    },
    {
      "text": "Store tomatoes at room temperature to preserve flavor",
      "category": "storage"
    },
    {
      "text": "Freeze the chicken within 24 hours",
      "category": "freeze"
    }
  ]
}`;

    try {
      const completion = await withCircuitBreaker("openai", () => openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful food waste reduction assistant. Always respond with valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 512,
      }));

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      const parsed = JSON.parse(content);
      const rawSuggestions = parsed.suggestions || [];
      const suggestions = parseTips(rawSuggestions);

      setInCache(cacheKey, { suggestions, expiringItems });
      logger.info("Waste reduction tips generated", { deviceId });

      return res.json(successResponse({
        suggestions,
        expiringItems,
      }));
    } catch (aiError) {
      logger.error("AI waste reduction tips error", { error: aiError instanceof Error ? aiError.message : String(aiError) });

      return res.json(successResponse({
        suggestions: [],
        expiringItems,
      }));
    }
  } catch (error) {
    next(error);
  }
});

const funFactCache = new Map<
  string,
  {
    fact: string;
    timestamp: number;
  }
>();

const FUN_FACT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const funFactSchema = z.object({
  items: z.array(z.object({ name: z.string() }).passthrough()).optional().default([]),
  nutritionTotals: z.object({
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
    itemsWithNutrition: z.number().optional(),
  }).optional(),
});

router.post("/fun-fact", validateBody(funFactSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, nutritionTotals } = req.body;

    if (items.length === 0) {
      return res.json(successResponse({
        fact: "Add some items to your inventory to discover fun facts about your food!",
      }));
    }

    const itemNames = items.map((i: any) => i.name).slice(0, 20);
    const cacheKey = `funfact:${itemNames.sort().join(",")}:${nutritionTotals?.calories || 0}`;
    
    const cached = funFactCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < FUN_FACT_CACHE_TTL) {
      return res.json(successResponse({ fact: cached.fact }));
    }

    const itemList = itemNames.join(", ");
    const nutritionContext = nutritionTotals 
      ? `Total nutrition: ${nutritionTotals.calories} calories, ${nutritionTotals.protein}g protein, ${nutritionTotals.carbs}g carbs, ${nutritionTotals.fat}g fat from ${nutritionTotals.itemsWithNutrition} items.`
      : "";

    const prompt = `Based on this kitchen inventory, generate ONE short, fun, interesting fact (1-2 sentences max).

Inventory items: ${itemList}
${nutritionContext}

The fact should be:
- Surprising, educational, or amusing
- Related to the specific foods in the inventory
- About food history, nutrition trivia, cultural facts, or cooking tips
- Encouraging and positive in tone

Examples of good facts:
- "Your eggs could make 3 perfect French omelets - the dish that chefs use to test their skills!"
- "With your tomatoes and basil, you have the classic combo that inspired Caprese salad in 1950s Italy."
- "Your pantry has enough protein for a small army of gym enthusiasts!"

Return JSON: { "fact": "<your fun fact>" }`;

    const completion = await withCircuitBreaker("openai", () => openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a fun, witty food expert who shares interesting facts. Always respond with valid JSON. Keep facts brief and engaging.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 150,
    }));

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);
    const fact = parsed.fact || "Your kitchen is full of delicious possibilities!";

    funFactCache.set(cacheKey, { fact, timestamp: Date.now() });

    return res.json(successResponse({ fact }));
  } catch (error) {
    next(error);
  }
});

export default router;
