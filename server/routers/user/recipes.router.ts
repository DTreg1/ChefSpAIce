import { Router, type Request, type Response, type NextFunction } from "express";
import OpenAI from "openai";
import { eq, and } from "drizzle-orm";
import {
  checkAiRecipeLimit,
  incrementAiRecipeCount,
  checkFeatureAccess,
} from "../../services/subscriptionService";
import { logger } from "../../lib/logger";
import { AppError } from "../../middleware/errorHandler";
import { validateBody } from "../../middleware/validateBody";
import { successResponse, errorResponse } from "../../lib/apiResponse";
import { withCircuitBreaker } from "../../lib/circuit-breaker";
import { db } from "../../db";
import { userSavedRecipes } from "@shared/schema";
import {
  generateRecipeSchema,
  generateImageSchema,
  recipeScanRequestSchema,
  organizeInventory,
  buildSmartPrompt,
  buildOpenAIMessages,
  postProcessRecipe,
  generateRecipeImage,
  scanRecipeFromImage,
  type GeneratedRecipe,
} from "../../services/recipeGenerationService";

export {
  type InventoryItem,
  type ExpiringItem,
  type EquipmentItem,
  calculateDaysUntilExpiry,
  organizeInventory,
  buildSmartPrompt,
} from "../../services/recipeGenerationService";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

router.post("/generate", validateBody(generateRecipeSchema), async (req: Request, res: Response, next: NextFunction) => {
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
    } = req.body;

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
    const messages = buildOpenAIMessages(prompt, effectiveIngredientCount);

    const completion = await withCircuitBreaker("openai", () => openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    }));

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    let recipe: GeneratedRecipe = JSON.parse(content);

    const inventoryItems = [...expiringItems, ...otherItems];
    const { recipe: processedRecipe } = postProcessRecipe(recipe, inventoryItems, quickRecipe);
    recipe = processedRecipe;

    logger.info("Recipe generated", { title: recipe.title, usedExpiringCount: recipe.usedExpiringCount, totalExpiringItems: expiringItems.length });

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

router.post("/generate-stream", validateBody(generateRecipeSchema), async (req: Request, res: Response, next: NextFunction) => {
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
    } = req.body;

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
      logger.debug("Smart generation prompt (stream)", {
        promptPreview: prompt.substring(0, 500),
      });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let aborted = false;
    req.on('close', () => { aborted = true; });

    const effectiveIngredientCount = ingredientCount || { min: 4, max: 6 };
    const messages = buildOpenAIMessages(prompt, effectiveIngredientCount);

    const stream = await withCircuitBreaker("openai", () => openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
      stream: true,
    }));

    let fullContent = "";

    for await (const chunk of stream) {
      if (aborted) break;
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ type: "chunk", text: delta })}\n\n`);
      }
    }

    if (aborted) {
      res.end();
      return;
    }

    if (!fullContent) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "No response from AI" })}\n\n`);
      res.end();
      return;
    }

    let recipe: GeneratedRecipe = JSON.parse(fullContent);

    const inventoryItems = [...expiringItems, ...otherItems];

    try {
      const { recipe: processedRecipe } = postProcessRecipe(recipe, inventoryItems, quickRecipe);
      recipe = processedRecipe;
    } catch (postProcessError) {
      res.write(`data: ${JSON.stringify({ type: "error", message: "Could not generate a valid recipe. Not enough matching ingredients were found." })}\n\n`);
      res.end();
      return;
    }

    logger.info("Recipe generated (stream)", { title: recipe.title, usedExpiringCount: recipe.usedExpiringCount, totalExpiringItems: expiringItems.length });

    await incrementAiRecipeCount(req.userId!);
    const updatedLimit = await checkAiRecipeLimit(req.userId!);

    res.write(`data: ${JSON.stringify({
      type: "done",
      recipe: {
        ...recipe,
        totalExpiringItems: expiringItems.length,
        prioritizedExpiring: prioritizeExpiring,
        subscription: {
          aiRecipesRemaining: updatedLimit.remaining,
          aiRecipesLimit: updatedLimit.limit,
        },
      },
    })}\n\n`);

    res.end();
  } catch (error) {
    if (res.headersSent) {
      const message = error instanceof Error ? error.message : "Recipe generation failed";
      res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
      res.end();
    } else {
      next(error);
    }
  }
});

router.post("/generate-image", validateBody(generateImageSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recipeId, title, description, cuisine } = req.body;
    const userId = req.userId!;

    const result = await generateRecipeImage(title, description, cuisine);

    const imageBuffer = Buffer.from(result.imageBase64, "base64");
    const thumbnailBuffer = Buffer.from(result.thumbnailBase64, "base64");

    await db
      .update(userSavedRecipes)
      .set({
        imageData: imageBuffer,
        thumbnailData: thumbnailBuffer,
      })
      .where(
        and(
          eq(userSavedRecipes.userId, userId),
          eq(userSavedRecipes.itemId, recipeId),
        ),
      );

    return res.json(successResponse({
      imageBase64: result.imageBase64,
      thumbnailBase64: result.thumbnailBase64,
      format: result.format,
    }));
  } catch (error) {
    next(error);
  }
});

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

    const result = await scanRecipeFromImage(base64Image);

    if (result.error) {
      return res.status(200).json(errorResponse(result.error, "SCAN_FAILED", { suggestion: result.suggestion }));
    }

    return res.json(successResponse({
      title: result.title,
      description: result.description,
      ingredients: result.ingredients,
      instructions: result.instructions,
      prepTime: result.prepTime,
      cookTime: result.cookTime,
      servings: result.servings,
      notes: result.notes,
    }));
  } catch (error) {
    next(error);
  }
});

router.get("/image/:recipeId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw AppError.unauthorized("Authentication required");
    }

    const { recipeId } = req.params;

    const rows = await db
      .select({ imageData: userSavedRecipes.imageData })
      .from(userSavedRecipes)
      .where(
        and(
          eq(userSavedRecipes.userId, req.userId),
          eq(userSavedRecipes.itemId, recipeId)
        )
      );

    if (rows.length === 0 || !rows[0].imageData) {
      return res.status(404).json(errorResponse("Image not found", "NOT_FOUND"));
    }

    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(rows[0].imageData);
  } catch (error) {
    next(error);
  }
});

router.get("/image/:recipeId/thumbnail", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      throw AppError.unauthorized("Authentication required");
    }

    const { recipeId } = req.params;

    const rows = await db
      .select({ thumbnailData: userSavedRecipes.thumbnailData })
      .from(userSavedRecipes)
      .where(
        and(
          eq(userSavedRecipes.userId, req.userId),
          eq(userSavedRecipes.itemId, recipeId)
        )
      );

    if (rows.length === 0 || !rows[0].thumbnailData) {
      return res.status(404).json(errorResponse("Thumbnail not found", "NOT_FOUND"));
    }

    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(rows[0].thumbnailData);
  } catch (error) {
    next(error);
  }
});

export default router;
