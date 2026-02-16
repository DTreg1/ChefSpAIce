import { Router, Request, Response, NextFunction } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { successResponse } from "../lib/apiResponse";
import {
  findPartialMatch,
  getShelfLifeForLocation,
} from "../lib/shelf-life-data";
import { CacheService } from "../lib/cache";
import { logger } from "../lib/logger";
import { validateBody } from "../middleware/validateBody";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const shelfLifeRequestSchema = z.object({
  foodName: z.string().min(1, "Food name is required"),
  category: z.string().optional(),
  storageLocation: z.string().optional(),
});

type ConfidenceLevel = "high" | "medium" | "low";

type SourceType = "local" | "ai";

interface ShelfLifeResponse {
  suggestedDays: number;
  confidence: ConfidenceLevel;
  source: SourceType;
  notes?: string;
  signsOfSpoilage?: string;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const shelfLifeCache = new CacheService<ShelfLifeResponse>({
  defaultTtlMs: CACHE_TTL_MS,
});

function getCacheKey(foodName: string, storageLocation?: string): string {
  return `${foodName.toLowerCase().trim()}:${(storageLocation || "refrigerator").toLowerCase().trim()}`;
}

async function getAIShelfLifeSuggestion(
  foodName: string,
  category?: string,
  storageLocation?: string,
): Promise<ShelfLifeResponse> {
  const cacheKey = getCacheKey(foodName, storageLocation);
  const cached = await shelfLifeCache.get(cacheKey);
  if (cached) {
    if (process.env.NODE_ENV !== "production") {
      logger.debug("Shelf life cache hit", { foodName });
    }
    return cached;
  }

  const prompt = `As a food safety expert, estimate how long this food item will stay fresh:

Food: ${foodName}
${category ? `Category: ${category}` : ""}
Storage: ${storageLocation || "refrigerator"}

Consider:
- USDA food safety guidelines
- Common storage practices
- Signs of spoilage for this food type

Return JSON: {
  "days": number,
  "notes": "brief storage tip",
  "signs_of_spoilage": "what to look for"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a food safety expert. Provide accurate, conservative shelf life estimates based on USDA guidelines. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 256,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);
    const response: ShelfLifeResponse = {
      suggestedDays: Math.max(1, Math.min(365, parsed.days || 7)),
      confidence: "medium",
      source: "ai",
      notes: parsed.notes || undefined,
      signsOfSpoilage: parsed.signs_of_spoilage || undefined,
    };

    await shelfLifeCache.set(cacheKey, response);
    if (process.env.NODE_ENV !== "production") {
      logger.debug("Shelf life AI response cached", { foodName });
    }

    return response;
  } catch (error) {
    logger.error("AI shelf life estimation error", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

router.post("/", validateBody(shelfLifeRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { foodName, category, storageLocation } = req.body;
    const normalizedFood = foodName.toLowerCase().trim();
    const normalizedLocation = (storageLocation || "refrigerator")
      .toLowerCase()
      .trim();

    const locationMap: Record<string, string> = {
      fridge: "refrigerator",
      freezer: "freezer",
      pantry: "pantry",
      counter: "counter",
      refrigerator: "refrigerator",
    };
    const mappedLocation =
      locationMap[normalizedLocation] || "refrigerator";

    const directMatch = getShelfLifeForLocation(
      normalizedFood,
      mappedLocation,
    );
    if (directMatch) {
      if (process.env.NODE_ENV !== "production") {
        logger.debug("Shelf life direct match", { foodName, location: mappedLocation });
      }
      return res.json(successResponse({
        suggestedDays: directMatch.days,
        confidence: "high" as ConfidenceLevel,
        source: "local" as SourceType,
        notes: directMatch.notes,
      }));
    }

    if (category) {
      const categoryMatch = getShelfLifeForLocation(
        category.toLowerCase(),
        mappedLocation,
      );
      if (categoryMatch) {
        if (process.env.NODE_ENV !== "production") {
          logger.debug("Shelf life category match", { foodName, category, location: mappedLocation });
        }
        return res.json(successResponse({
          suggestedDays: categoryMatch.days,
          confidence: "high" as ConfidenceLevel,
          source: "local" as SourceType,
          notes: categoryMatch.notes,
        }));
      }
    }

    const partialMatch = findPartialMatch(normalizedFood);
    if (partialMatch) {
      const matchedEntry = getShelfLifeForLocation(
        partialMatch.matchedCategory,
        mappedLocation,
      );
      if (matchedEntry) {
        if (process.env.NODE_ENV !== "production") {
          logger.debug("Shelf life partial match", { foodName, matchedCategory: partialMatch.matchedCategory, location: mappedLocation });
        }
        return res.json(successResponse({
          suggestedDays: matchedEntry.days,
          confidence: "medium" as ConfidenceLevel,
          source: "local" as SourceType,
          notes: matchedEntry.notes,
        }));
      }

      if (process.env.NODE_ENV !== "production") {
        logger.debug("Shelf life partial match (default location)", { foodName, matchedCategory: partialMatch.matchedCategory });
      }
      return res.json(successResponse({
        suggestedDays: partialMatch.days,
        confidence: "medium" as ConfidenceLevel,
        source: "local" as SourceType,
        notes: partialMatch.notes,
      }));
    }

    try {
      logger.info("Shelf life AI fallback", { foodName });
      const aiSuggestion = await getAIShelfLifeSuggestion(
        foodName,
        category,
        mappedLocation,
      );
      return res.json(successResponse(aiSuggestion));
    } catch (aiError) {
      logger.error("AI fallback failed, using default", { error: aiError instanceof Error ? aiError.message : String(aiError) });

      return res.json(successResponse({
        suggestedDays: 7,
        confidence: "low" as ConfidenceLevel,
        source: "local" as SourceType,
        notes:
          "Default estimate. Please verify based on product packaging.",
      }));
    }
  } catch (error) {
    next(error);
  }
});

export default router;
