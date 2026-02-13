import { Router, Request, Response, NextFunction } from "express";
import OpenAI from "openai";
import {
  parseAnalysisResponse,
  getImageMimeType,
  isValidImageFormat,
  detectMimeTypeFromBuffer,
  SUPPORTED_IMAGE_FORMATS,
  MAX_FILE_SIZE,
} from "../../../lib/food-analysis-parser";
import { AppError } from "../../../middleware/errorHandler";
import { logger } from "../../../lib/logger";
import { successResponse } from "../../../lib/apiResponse";
import { withCircuitBreaker } from "../../../lib/circuit-breaker";

const router = Router();

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export function setOpenAIClient(client: OpenAI | null) {
  openaiClient = client;
}

const FOOD_ANALYSIS_PROMPT = `Analyze this image and identify all visible food items.

For each food item found, extract:
- name: Common food name (be specific, e.g., "Gala Apple" not just "apple", "Whole Milk" not just "milk")
- category: One of: produce, dairy, meat, seafood, bread, canned, frozen, beverages, condiments, snacks, grains, spices, other
- quantity: Estimated count or amount (as a number)
- quantityUnit: One of: items, lbs, oz, bunch, container, bag, box, bottle, can
- storageLocation: Recommended storage - one of: refrigerator, freezer, pantry, counter
- shelfLifeDays: Estimated days of freshness from today (as a number, 1-365)
- confidence: Your confidence in this identification from 0.0 to 1.0

Guidelines:
- Be specific with names when brand or variety is visible
- If multiple of the same item exist, count them accurately
- For packaged items, read labels if visible
- If you're unsure about identification, use lower confidence (0.3-0.6)
- High confidence (0.8-1.0) only when very certain
- Medium confidence (0.5-0.79) when reasonably sure
- Low confidence (0.1-0.49) when guessing

Return valid JSON in this exact format:
{
  "items": [
    {
      "name": "Food Name",
      "category": "produce",
      "quantity": 3,
      "quantityUnit": "items",
      "storageLocation": "refrigerator",
      "shelfLifeDays": 7,
      "confidence": 0.85
    }
  ],
  "notes": "Any additional observations about the food items"
}

If no food is visible in the image, return:
{
  "items": [],
  "error": "No food items detected in this image"
}`;

router.post("/analyze-food", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const contentType = req.headers["content-type"] || "";

    if (!contentType.includes("multipart/form-data")) {
      throw AppError.badRequest("Expected multipart/form-data with image file", "INVALID_CONTENT_TYPE");
    }

    const files = (req as any).files;
    const file = files?.image || files?.file;

    if (!file) {
      throw AppError.badRequest("No image file provided. Please upload an image with field name 'image' or 'file'", "MISSING_IMAGE_FILE");
    }

    const filename = file.name || file.originalname || "image.jpg";
    const fileData = file.data || file.buffer;

    if (!fileData || fileData.length === 0) {
      throw AppError.badRequest("The uploaded image file appears to be empty", "EMPTY_IMAGE_FILE");
    }

    if (fileData.length > MAX_FILE_SIZE) {
      throw AppError.badRequest(`Image file too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`, "FILE_TOO_LARGE");
    }

    let mimeType = detectMimeTypeFromBuffer(fileData);

    if (!mimeType) {
      if (isValidImageFormat(filename)) {
        mimeType = getImageMimeType(filename);
      }
    }

    if (!mimeType) {
      throw AppError.badRequest(`Invalid image format. Supported formats: ${SUPPORTED_IMAGE_FORMATS.join(", ")}`, "INVALID_IMAGE_FORMAT");
    }

    const base64Image = fileData.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Image}`;

    logger.info("Analyzing food image", { filename, sizeKB: (fileData.length / 1024).toFixed(1), mimeType });

    const openai = getOpenAIClient();
    const completion = await withCircuitBreaker("openai", () => openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert food identification system. You analyze images to identify food items with high accuracy. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: FOOD_ANALYSIS_PROMPT,
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
      max_completion_tokens: 2048,
    }));

    const content = completion.choices[0]?.message?.content;
    const parseResult = parseAnalysisResponse(content || null);

    if (!parseResult.success) {
      logger.error("Failed to parse image analysis response", { error: parseResult.error });
      throw AppError.internal(parseResult.error || "Failed to parse AI response", "AI_PARSE_ERROR");
    }

    logger.info("Image analysis complete", { itemCount: parseResult.data!.items.length });
    return res.json(successResponse(parseResult.data));
  } catch (error) {
    next(error);
  }
});

router.get("/health", (_req: Request, res: Response) => {
  res.json(successResponse({
    status: "ok",
    supportedFormats: SUPPORTED_IMAGE_FORMATS,
    maxFileSize: `${MAX_FILE_SIZE / 1024 / 1024}MB`,
    model: "gpt-4o",
  }));
});

export default router;
