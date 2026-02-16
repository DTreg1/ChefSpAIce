import { Router, Request, Response, NextFunction } from "express";
import OpenAI from "openai";
import {
  getImageMimeType,
  isValidImageFormat,
  detectMimeTypeFromBuffer,
  SUPPORTED_IMAGE_FORMATS,
  MAX_FILE_SIZE,
} from "../../../lib/food-analysis-parser";
import { lookupUSDABarcode, mapUSDAToFoodItem } from "../../../integrations/usda";
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

export interface ReceiptItem {
  name: string;
  category: string;
  quantity: number;
  quantityUnit: string;
  storageLocation: string;
  shelfLifeDays: number;
  confidence: number;
  price?: number;
  upc?: string;
  originalText?: string;
}

export interface ReceiptAnalysisResult {
  items: ReceiptItem[];
  storeName?: string;
  purchaseDate?: string;
  totalAmount?: number;
  notes?: string;
  error?: string;
}

const RECEIPT_ANALYSIS_PROMPT = `Analyze this grocery receipt image and extract all food items purchased.

For each food item found on the receipt, extract:
- name: The full product name (interpret abbreviations, e.g., "ORG BAN" = "Organic Bananas", "GALA APL" = "Gala Apples")
- category: One of: produce, dairy, meat, seafood, bread, canned, frozen, beverages, condiments, snacks, grains, spices, other
- quantity: The quantity purchased (default to 1 if not specified)
- quantityUnit: One of: items, lbs, oz, kg, g, bunch, container, bag, box, bottle, can, pack
- storageLocation: Recommended storage - one of: refrigerator, freezer, pantry, counter
- shelfLifeDays: Estimated days of freshness from purchase (1-365)
- confidence: Your confidence in this identification from 0.0 to 1.0
- price: The price if visible (as a number, no currency symbol)
- upc: The UPC/barcode if visible on the receipt (12-13 digit number)
- originalText: The exact text from the receipt for this item

Guidelines:
- INTERPRET ABBREVIATIONS: Receipts often use shortened names. Expand them to full readable names.
  Examples: "ORG BAN" → "Organic Bananas", "WHL MLK GAL" → "Whole Milk Gallon", "GRN ONION" → "Green Onions"
- Skip non-food items (cleaning supplies, paper products, etc.)
- If weight is shown (e.g., "2.5 lb"), use that as quantity with "lbs" as unit
- Read prices accurately from the receipt
- If you see UPC codes, include them
- Be conservative with shelf life estimates

Also extract store information:
- storeName: The store name if visible at top of receipt
- purchaseDate: The date of purchase if visible (YYYY-MM-DD format)
- totalAmount: The total amount paid if visible

Return valid JSON in this exact format:
{
  "items": [
    {
      "name": "Organic Bananas",
      "category": "produce",
      "quantity": 3,
      "quantityUnit": "lbs",
      "storageLocation": "counter",
      "shelfLifeDays": 5,
      "confidence": 0.9,
      "price": 4.99,
      "upc": "012345678901",
      "originalText": "ORG BAN 3LB @1.99/LB"
    }
  ],
  "storeName": "Kroger",
  "purchaseDate": "2025-01-19",
  "totalAmount": 87.42,
  "notes": "Any additional observations"
}

If no food items are found, return:
{
  "items": [],
  "error": "No food items detected on this receipt"
}`;

function parseReceiptResponse(content: string | null): { success: boolean; data?: ReceiptAnalysisResult; error?: string } {
  if (!content) {
    return { success: false, error: "No response content" };
  }

  try {
    const parsed = JSON.parse(content);
    
    if (!parsed.items || !Array.isArray(parsed.items)) {
      return { success: false, error: "Invalid response structure: missing items array" };
    }

    const validCategories = ["produce", "dairy", "meat", "seafood", "bread", "canned", "frozen", "beverages", "condiments", "snacks", "grains", "spices", "other"];
    const validUnits = ["items", "lbs", "oz", "kg", "g", "bunch", "container", "bag", "box", "bottle", "can", "pack"];
    const validLocations = ["refrigerator", "freezer", "pantry", "counter"];

    const items: ReceiptItem[] = parsed.items.map((item: any) => ({
      name: String(item.name || "Unknown Item"),
      category: validCategories.includes(item.category) ? item.category : "other",
      quantity: Number(item.quantity) || 1,
      quantityUnit: validUnits.includes(item.quantityUnit) ? item.quantityUnit : "items",
      storageLocation: validLocations.includes(item.storageLocation) ? item.storageLocation : "refrigerator",
      shelfLifeDays: Math.max(1, Math.min(365, Number(item.shelfLifeDays) || 7)),
      confidence: Math.max(0, Math.min(1, Number(item.confidence) || 0.7)),
      price: item.price ? Number(item.price) : undefined,
      upc: item.upc ? String(item.upc).replace(/\D/g, "") : undefined,
      originalText: item.originalText ? String(item.originalText) : undefined,
    }));

    return {
      success: true,
      data: {
        items,
        storeName: parsed.storeName ? String(parsed.storeName) : undefined,
        purchaseDate: parsed.purchaseDate ? String(parsed.purchaseDate) : undefined,
        totalAmount: parsed.totalAmount ? Number(parsed.totalAmount) : undefined,
        notes: parsed.notes ? String(parsed.notes) : undefined,
        error: parsed.error ? String(parsed.error) : undefined,
      },
    };
  } catch (e) {
    return { success: false, error: `Failed to parse JSON: ${e}` };
  }
}

router.post("/analyze-receipt", async (req: Request, res: Response, next: NextFunction) => {
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

    const filename = file.name || file.originalname || "receipt.jpg";
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

    logger.info("Analyzing receipt image", { filename, sizeKB: (fileData.length / 1024).toFixed(1), mimeType });

    const openai = getOpenAIClient();
    const completion = await withCircuitBreaker("openai", () => openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert at reading and interpreting grocery store receipts. You excel at expanding abbreviated product names into their full, readable forms. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: RECEIPT_ANALYSIS_PROMPT,
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
    const parseResult = parseReceiptResponse(content);

    if (!parseResult.success || !parseResult.data) {
      logger.error("Failed to parse receipt analysis response", { error: parseResult.error });
      throw AppError.internal(parseResult.error || "Failed to parse AI response", "AI_PARSE_ERROR");
    }

    const itemsWithUSDA = await Promise.all(
      parseResult.data.items.map(async (item) => {
        if (item.upc) {
          try {
            const usdaResult = await lookupUSDABarcode(item.upc);
            if (usdaResult) {
              const mapped = mapUSDAToFoodItem(usdaResult);
              logger.info("UPC barcode matched", { upc: item.upc, matchedName: mapped.name });
              return {
                ...item,
                name: mapped.name || item.name,
                category: mapped.category?.toLowerCase() || item.category,
                nutrition: mapped.nutrition,
              };
            }
          } catch (e) {
            logger.warn("UPC lookup failed", { upc: item.upc, error: e instanceof Error ? e.message : String(e) });
          }
        }
        return item;
      })
    );

    const result: ReceiptAnalysisResult = {
      ...parseResult.data,
      items: itemsWithUSDA,
    };

    logger.info("Receipt analysis complete", { itemCount: result.items.length });
    return res.json(successResponse(result));
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
