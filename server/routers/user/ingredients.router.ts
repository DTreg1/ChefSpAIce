import { Router, Request, Response, NextFunction } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { AppError } from "../../middleware/errorHandler";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const INGREDIENT_SCAN_PROMPT = `Analyze this image of a food product label or ingredient list.

Extract the following information:
1. Product name (if visible)
2. All ingredients listed on the label
3. Nutrition information per serving (if visible):
   - Calories
   - Protein (grams)
   - Carbohydrates (grams)
   - Fat (grams)
   - Fiber (grams)
   - Sugar (grams)
   - Sodium (mg)
4. Serving size (if visible)
5. Number of servings per container (if visible)

For each ingredient identified, suggest:
- A simplified common name for inventory tracking
- The appropriate storage location (refrigerator, freezer, pantry, counter)
- An estimated category (produce, dairy, meat, seafood, bread, canned, frozen, beverages, condiments, snacks, grains, spices, other)

Return valid JSON in this exact format:
{
  "productName": "Product Name or null if not visible",
  "ingredients": [
    {
      "name": "Ingredient name",
      "simplifiedName": "Common name for inventory",
      "category": "category",
      "storageLocation": "pantry"
    }
  ],
  "nutrition": {
    "servingSize": "1 cup (240ml)",
    "servingsPerContainer": 4,
    "calories": 150,
    "protein": 8,
    "carbs": 12,
    "fat": 8,
    "fiber": 0,
    "sugar": 12,
    "sodium": 130
  },
  "rawText": "The complete text visible on the label",
  "confidence": 0.85,
  "notes": "Any relevant observations"
}

If the image doesn't show a readable ingredient label, return:
{
  "error": "Could not read ingredient label from this image",
  "suggestion": "Please take a clearer photo of the ingredient list or nutrition facts panel"
}`;

const scanRequestSchema = z.object({
  image: z.string().min(1, "Base64 image data is required"),
});

const scannedIngredientSchema = z.object({
  name: z.string().default("Unknown"),
  simplifiedName: z.string().default("Unknown"),
  category: z.string().default("other"),
  storageLocation: z.string().default("pantry"),
});

const nutritionInfoSchema = z
  .object({
    servingSize: z.string().optional(),
    servingsPerContainer: z.number().optional(),
    calories: z.number().optional(),
    protein: z.number().optional(),
    carbs: z.number().optional(),
    fat: z.number().optional(),
    fiber: z.number().optional(),
    sugar: z.number().optional(),
    sodium: z.number().optional(),
  })
  .nullable();

const scanResultSchema = z.object({
  productName: z.string().nullable().default(null),
  ingredients: z.array(scannedIngredientSchema).default([]),
  nutrition: nutritionInfoSchema.optional().default(null),
  rawText: z.string().default(""),
  confidence: z.number().default(0.5),
  notes: z.string().optional(),
  error: z.string().optional(),
  suggestion: z.string().optional(),
});

interface ScannedIngredient {
  name: string;
  simplifiedName: string;
  category: string;
  storageLocation: string;
}

interface NutritionInfo {
  servingSize?: string;
  servingsPerContainer?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

interface _ScanResult {
  productName: string | null;
  ingredients: ScannedIngredient[];
  nutrition: NutritionInfo | null;
  rawText: string;
  confidence: number;
  notes?: string;
  error?: string;
  suggestion?: string;
}
// @ts-ignore - defined for future use
type ScanResult = _ScanResult;

router.post("/scan", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contentType = req.headers["content-type"] || "";

    let base64Image: string;

    if (contentType.includes("multipart/form-data")) {
      const files = (req as any).files;
      const file = files?.image || files?.file;

      if (!file) {
        throw AppError.badRequest("No image file provided", "NO_IMAGE").withDetails({ suggestion: "Please upload an image of the ingredient label" });
      }

      const fileData = file.data || file.buffer;
      if (!fileData || fileData.length === 0) {
        throw AppError.badRequest("The uploaded image file appears to be empty", "EMPTY_IMAGE");
      }

      const maxSize = 10 * 1024 * 1024;
      if (fileData.length > maxSize) {
        throw AppError.badRequest(`Image file too large. Maximum size is ${maxSize / 256 / 256}MB`, "IMAGE_TOO_LARGE");
      }

      base64Image = fileData.toString("base64");
    } else if (contentType.includes("application/json")) {
      const parseResult = scanRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        throw AppError.badRequest("Invalid request body", "VALIDATION_ERROR").withDetails(parseResult.error.errors);
      }
      base64Image = parseResult.data.image.replace(
        /^data:image\/\w+;base64,/,
        "",
      );
    } else {
      throw AppError.badRequest("Expected multipart/form-data or application/json", "INVALID_CONTENT_TYPE");
    }

    const mimeType = detectMimeType(base64Image);
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    console.log(`[Ingredients] Scanning label: ${(base64Image.length / 1024).toFixed(1)}KB`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert OCR system specialized in reading food product labels, ingredient lists, and nutrition facts panels. Extract information accurately and return valid JSON.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: INGREDIENT_SCAN_PROMPT,
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
      throw AppError.internal("No response from AI service", "AI_NO_RESPONSE");
    }

    let rawResult: unknown;
    try {
      rawResult = JSON.parse(content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw AppError.internal("Failed to parse ingredient scan results", "AI_PARSE_ERROR");
    }

    const parseResult = scanResultSchema.safeParse(rawResult);
    if (!parseResult.success) {
      console.error("AI response validation failed:", parseResult.error.errors);
      throw AppError.internal("Invalid response format from AI service", "AI_INVALID_FORMAT").withDetails({ suggestion: "Please try again with a clearer photo" });
    }

    const result = parseResult.data;

    if (result.error) {
      return res.status(200).json({
        error: result.error,
        suggestion: result.suggestion,
      });
    }

    console.log(`[Ingredients] Scan complete: ${result.ingredients.length} items found`);

    return res.json({
      productName: result.productName,
      ingredients: result.ingredients,
      nutrition: result.nutrition,
      rawText: result.rawText,
      confidence: result.confidence,
      notes: result.notes,
    });
  } catch (error) {
    next(error);
  }
});

function detectMimeType(base64: string): string {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBORw")) return "image/png";
  if (base64.startsWith("R0lGOD")) return "image/gif";
  if (base64.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

export default router;
