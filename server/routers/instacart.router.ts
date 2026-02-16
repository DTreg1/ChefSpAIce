/**
 * =============================================================================
 * INSTACART INTEGRATION ROUTER
 * =============================================================================
 * 
 * Provides integration with Instacart Connect API for:
 * - Creating shopping links for ingredients
 * - Recipe-based shopping lists
 * 
 * Uses INSTACART_API_KEY environment variable for authentication
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validateBody";
import { successResponse } from "../lib/apiResponse";
import { logger } from "../lib/logger";
import { toInstacartUnit } from "../lib/unit-conversion";

export interface InstacartLineItemMeasurement {
  size: number;
  unit: string;
}

export interface InstacartLineItemInput {
  name: string;
  quantity?: number;
  unit?: string;
  display_text?: string;
  upc?: string;
  upcs?: string[];
  product_ids?: string[];
  brand?: string;
  brand_filters?: string[];
  health_filters?: string[];
  line_item_measurements?: InstacartLineItemMeasurement;
  image_url?: string;
  instructions?: string;
  enable_pantry_items?: boolean;
}

export interface InstacartLineItem {
  name: string;
  quantity: number;
  unit: string;
  display_text: string;
  upcs?: string[];
  product_ids?: string[];
  brand_filters?: string[];
  health_filters?: string[];
  line_item_measurements?: InstacartLineItemMeasurement;
  image_url?: string;
  instructions?: string;
  enable_pantry_items?: boolean;
}

interface InstacartRecipeIngredient {
  name: string;
  display_text: string;
  measurements: Array<{ quantity: number; unit: string }>;
  filters?: {
    brand_filters?: string[];
    health_filters?: string[];
  };
  upcs?: string[];
  product_ids?: number[];
}

function cleanUpc(upc: string): string {
  return upc.replace(/\D/g, "");
}

function buildLineItem(input: InstacartLineItemInput): InstacartLineItem {
  const unit = toInstacartUnit(input.unit || "each");
  const quantity = input.quantity || 1;

  const lineItem: InstacartLineItem = {
    name: input.name,
    quantity,
    unit,
    display_text: input.display_text || `${quantity} ${input.unit || ""} ${input.name}`.trim(),
  };

  const upcs: string[] = [];
  if (input.upcs && Array.isArray(input.upcs)) {
    upcs.push(...input.upcs.map(cleanUpc).filter(Boolean));
  }
  if (input.upc) {
    const cleaned = cleanUpc(input.upc);
    if (cleaned && !upcs.includes(cleaned)) {
      upcs.push(cleaned);
    }
  }
  if (upcs.length > 0) {
    lineItem.upcs = upcs;
  }

  if (input.product_ids && Array.isArray(input.product_ids) && input.product_ids.length > 0) {
    lineItem.product_ids = input.product_ids;
  }

  const brandFilters: string[] = [];
  if (input.brand_filters && Array.isArray(input.brand_filters)) {
    brandFilters.push(...input.brand_filters);
  }
  if (input.brand && !brandFilters.includes(input.brand)) {
    brandFilters.push(input.brand);
  }
  if (brandFilters.length > 0) {
    lineItem.brand_filters = brandFilters;
  }

  if (input.health_filters && Array.isArray(input.health_filters) && input.health_filters.length > 0) {
    lineItem.health_filters = input.health_filters;
  }

  if (input.line_item_measurements && typeof input.line_item_measurements === "object") {
    const { size, unit: measUnit } = input.line_item_measurements;
    if (typeof size === "number" && typeof measUnit === "string") {
      lineItem.line_item_measurements = { size, unit: measUnit };
    }
  }

  if (input.image_url) {
    lineItem.image_url = input.image_url;
  }

  if (input.instructions) {
    lineItem.instructions = input.instructions;
  }

  if (typeof input.enable_pantry_items === "boolean") {
    lineItem.enable_pantry_items = input.enable_pantry_items;
  }

  return lineItem;
}

function buildRecipeIngredient(input: InstacartLineItemInput): InstacartRecipeIngredient {
  const unit = toInstacartUnit(input.unit || "each");
  const quantity = input.quantity || 1;

  const ingredient: InstacartRecipeIngredient = {
    name: input.name,
    display_text: input.display_text || `${quantity} ${input.unit || ""} ${input.name}`.trim(),
    measurements: [{ quantity, unit }],
  };

  const brandFilters: string[] = [];
  if (input.brand_filters && Array.isArray(input.brand_filters)) {
    brandFilters.push(...input.brand_filters);
  }
  if (input.brand && !brandFilters.includes(input.brand)) {
    brandFilters.push(input.brand);
  }

  const healthFilters: string[] = [];
  if (input.health_filters && Array.isArray(input.health_filters)) {
    healthFilters.push(...input.health_filters);
  }

  if (brandFilters.length > 0 || healthFilters.length > 0) {
    ingredient.filters = {};
    if (brandFilters.length > 0) {
      ingredient.filters.brand_filters = brandFilters;
    }
    if (healthFilters.length > 0) {
      ingredient.filters.health_filters = healthFilters;
    }
  }

  const upcs: string[] = [];
  if (input.upcs && Array.isArray(input.upcs)) {
    upcs.push(...input.upcs.map(cleanUpc).filter(Boolean));
  }
  if (input.upc) {
    const cleaned = cleanUpc(input.upc);
    if (cleaned && !upcs.includes(cleaned)) {
      upcs.push(cleaned);
    }
  }
  if (upcs.length > 0) {
    ingredient.upcs = upcs;
  }

  if (input.product_ids && Array.isArray(input.product_ids) && input.product_ids.length > 0) {
    ingredient.product_ids = input.product_ids.map((id) => typeof id === "number" ? id : parseInt(id, 10)).filter((id) => !isNaN(id));
  }

  return ingredient;
}

function parseInstacartError(responseText: string, statusCode: number): string {
  try {
    const parsed = JSON.parse(responseText);

    if (parsed?.error?.message) {
      let message = parsed.error.message;

      if (parsed.error.errors && Array.isArray(parsed.error.errors)) {
        const subMessages = parsed.error.errors
          .map((e: { error?: { message?: string }; meta?: { key?: string } }) => {
            const subMsg = e.error?.message || "Unknown error";
            const key = e.meta?.key;
            return key ? `${key}: ${subMsg}` : subMsg;
          })
          .filter(Boolean);

        if (subMessages.length > 0) {
          message += ` (${subMessages.join("; ")})`;
        }
      }

      return message;
    }
  } catch {
  }

  switch (statusCode) {
    case 401:
      return "Instacart API key is invalid or expired";
    case 403:
      return "Insufficient permissions for this Instacart API operation";
    case 429:
      return "Instacart API rate limit exceeded. Please try again later";
    default:
      if (statusCode >= 500) {
        return "Instacart service is temporarily unavailable";
      }
      return `Instacart API request failed (HTTP ${statusCode})`;
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
): Promise<globalThis.Response> {
  let lastResponse: globalThis.Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status !== 429 || attempt === maxRetries) {
      return response;
    }

    lastResponse = response;

    const retryAfterHeader = response.headers.get("Retry-After");
    let delayMs: number;

    if (retryAfterHeader) {
      const retryAfterSeconds = parseInt(retryAfterHeader, 10);
      delayMs = isNaN(retryAfterSeconds) ? Math.pow(2, attempt) * 1000 : retryAfterSeconds * 1000;
    } else {
      delayMs = Math.pow(2, attempt) * 1000;
    }

    logger.warn("Instacart API rate limited, retrying", {
      attempt: attempt + 1,
      maxRetries,
      delayMs,
      url,
    });

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return lastResponse!;
}

function validateProducts(products: unknown): InstacartLineItemInput[] {
  if (!products || !Array.isArray(products) || products.length === 0) {
    throw AppError.badRequest("Products array is required and must be non-empty", "MISSING_PRODUCTS");
  }

  const validated: InstacartLineItemInput[] = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (!p || typeof p !== "object" || !p.name || typeof p.name !== "string" || !p.name.trim()) {
      throw AppError.badRequest(`Product at index ${i} must have a non-empty name`, "INVALID_PRODUCT");
    }
    validated.push(p as InstacartLineItemInput);
  }

  return validated;
}

const router = Router();

function getInstacartBaseUrl(): string {
  return process.env.NODE_ENV === "production" 
    ? "https://connect.instacart.com"
    : "https://connect.dev.instacart.tools";
}

function getInstacartApiKey(): string | null {
  return process.env.INSTACART_API_KEY || null;
}

function isInstacartConfigured(): boolean {
  return !!getInstacartApiKey();
}

/**
 * GET /api/instacart/status
 * Check if Instacart integration is configured
 */
router.get("/status", (_req: Request, res: Response) => {
  const configured = isInstacartConfigured();
  res.json(successResponse({ configured }, configured 
      ? "Instacart API is configured and ready" 
      : "Instacart API key not configured"));
});

/**
 * GET /api/instacart/retailers
 * Find nearby retailers by postal code and country
 */
router.get("/retailers", async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = getInstacartApiKey();

  if (!apiKey) {
    throw AppError.badRequest("Instacart integration not configured", "INSTACART_NOT_CONFIGURED");
  }

  try {
    const { postal_code, country_code } = req.query;

    if (!postal_code || !country_code) {
      throw AppError.badRequest("postal_code and country_code are required", "MISSING_PARAMS");
    }

    const response = await fetchWithRetry(
      `${getInstacartBaseUrl()}/idp/v1/retailers?postal_code=${encodeURIComponent(String(postal_code))}&country_code=${encodeURIComponent(String(country_code))}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Accept": "application/json",
        },
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Instacart retailers error", { status: response.status, errorText });
      const errorMessage = parseInstacartError(errorText, response.status);
      throw new AppError(
        errorMessage,
        response.status,
        "INSTACART_RETAILERS_FAILED",
        true,
        errorText,
      );
    }

    const data = await response.json();
    return res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/instacart/products-link
 * Create a shopping link for a list of products
 * 
 * Body: { 
 *   title?: string,
 *   products: InstacartLineItemInput[],
 *   linkbackUrl?: string,
 *   retailer_key?: string
 * }
 */
const productsLinkSchema = z.object({
  products: z.array(z.object({ name: z.string().min(1) }).passthrough()).min(1, "Products array must have at least one item"),
  title: z.string().optional(),
  linkbackUrl: z.string().optional(),
  retailer_key: z.string().optional(),
});

router.post("/products-link", validateBody(productsLinkSchema), async (req, res, next) => {
  const apiKey = getInstacartApiKey();
  
  if (!apiKey) {
    throw AppError.badRequest("Instacart integration not configured", "INSTACART_NOT_CONFIGURED");
  }

  try {
    const { products, title, linkbackUrl, retailer_key } = req.body;

    const validatedProducts = validateProducts(products);
    const lineItems = validatedProducts.map(buildLineItem);

    logger.info("Creating Instacart products link", {
      itemCount: lineItems.length,
      hasUpcs: lineItems.some(li => li.upcs && li.upcs.length > 0),
      hasBrandFilters: lineItems.some(li => li.brand_filters && li.brand_filters.length > 0),
    });

    const requestBody: Record<string, unknown> = {
      title: title || "Shopping List",
      link_type: "shopping_list",
      line_items: lineItems,
    };

    if (retailer_key) {
      requestBody.retailer_key = retailer_key;
    }

    if (linkbackUrl) {
      requestBody.landing_page_configuration = {
        partner_linkback_url: linkbackUrl,
      };
    }

    const response = await fetchWithRetry(`${getInstacartBaseUrl()}/idp/v1/products/products_link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Instacart products link error", { status: response.status, errorText });
      const errorMessage = parseInstacartError(errorText, response.status);
      throw new AppError(
        errorMessage,
        response.status,
        "INSTACART_PRODUCTS_LINK_FAILED",
        true,
        errorText,
      );
    }

    const data = await response.json();
    return res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/instacart/recipe
 * Create a shopping link for recipe ingredients
 * 
 * Body: { 
 *   title: string,
 *   ingredients: InstacartLineItemInput[],
 *   servings?: number,
 *   cooking_time?: number,
 *   instructions?: string[],
 *   imageUrl?: string,
 *   linkbackUrl?: string,
 *   enable_pantry_items?: boolean,
 *   retailer_key?: string
 * }
 */
const recipeIngredientSchema = z.object({
  title: z.string().min(1, "Recipe title is required"),
  ingredients: z.array(z.object({ name: z.string().min(1) }).passthrough()).min(1, "At least one ingredient is required"),
  imageUrl: z.string().optional(),
  linkbackUrl: z.string().optional(),
  retailer_key: z.string().optional(),
  servings: z.number().int().positive().optional(),
  cooking_time: z.number().int().positive().optional(),
  instructions: z.array(z.string()).optional(),
  enable_pantry_items: z.boolean().optional(),
});

router.post("/recipe", validateBody(recipeIngredientSchema), async (req, res, next) => {
  const apiKey = getInstacartApiKey();
  
  if (!apiKey) {
    throw AppError.badRequest("Instacart integration not configured", "INSTACART_NOT_CONFIGURED");
  }

  try {
    const { title, ingredients, imageUrl, linkbackUrl, retailer_key, servings, cooking_time, instructions, enable_pantry_items } = req.body;

    const validatedIngredients = validateProducts(ingredients);
    const recipeIngredients = validatedIngredients.map(buildRecipeIngredient);

    logger.info("Creating Instacart recipe link", {
      title,
      itemCount: recipeIngredients.length,
      hasUpcs: recipeIngredients.some(ri => ri.upcs && ri.upcs.length > 0),
      hasFilters: recipeIngredients.some(ri => ri.filters !== undefined),
    });

    const requestBody: Record<string, unknown> = {
      title,
      image_url: imageUrl || undefined,
      ingredients: recipeIngredients,
    };

    if (servings && typeof servings === "number") {
      requestBody.servings = servings;
    }

    if (cooking_time && typeof cooking_time === "number") {
      requestBody.cooking_time = cooking_time;
    }

    if (instructions && Array.isArray(instructions)) {
      requestBody.instructions = instructions.filter((s: unknown) => typeof s === "string" && s.trim());
    }

    const landingPageConfig: Record<string, unknown> = {};
    if (linkbackUrl) {
      landingPageConfig.partner_linkback_url = linkbackUrl;
    }
    if (typeof enable_pantry_items === "boolean") {
      landingPageConfig.enable_pantry_items = enable_pantry_items;
    }
    if (Object.keys(landingPageConfig).length > 0) {
      requestBody.landing_page_configuration = landingPageConfig;
    }

    if (retailer_key) {
      requestBody.retailer_key = retailer_key;
    }

    const response = await fetchWithRetry(`${getInstacartBaseUrl()}/idp/v1/products/recipe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Accept": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Instacart recipe link error", { status: response.status, errorText });
      const errorMessage = parseInstacartError(errorText, response.status);
      throw new AppError(
        errorMessage,
        response.status,
        "INSTACART_RECIPE_LINK_FAILED",
        true,
        errorText,
      );
    }

    const data = await response.json();
    return res.json(successResponse(data));
  } catch (error) {
    next(error);
  }
});

export default router;
