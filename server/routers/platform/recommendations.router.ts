import { Router, Request, Response } from "express";
import { isAuthenticated, getAuthenticatedUserId } from "../../middleware/oauth.middleware";
import { asyncHandler } from "../../middleware/error.middleware";
import { storage } from "../../storage/index";
import { openai } from "../../integrations/openai";
import { ApiError } from "../../utils/apiError";

const router = Router();

router.get(
  "/recipes",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    try {
      const userRecipes = await storage.user.recipes.getRecipes(userId);
      const inventoryItems = await storage.user.inventory.getFoodItems(userId);

      const availableIngredients = inventoryItems.map((item: any) => item.name).join(", ");

      if (!openai) {
        const recommendations = userRecipes.slice(0, limit).map((recipe: any) => ({
          id: recipe.id,
          title: recipe.title,
          reason: "Based on your saved recipes",
          score: 0.8,
        }));

        return res.json({
          recommendations,
          source: "saved_recipes",
        });
      }

      const prompt = `Based on these available ingredients: ${availableIngredients || "general pantry items"}
      
Suggest ${limit} recipe ideas. For each, provide:
1. A title
2. Brief reason why it's recommended
3. Main ingredients needed
4. Difficulty level (easy/medium/hard)
5. Estimated time in minutes

Return as JSON array with format:
[{ "title": "...", "reason": "...", "ingredients": [...], "difficulty": "...", "timeMinutes": ... }]`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      });

      let recommendations = [];
      try {
        recommendations = JSON.parse(completion.choices[0].message?.content || "[]");
      } catch {
        recommendations = [];
      }

      res.json({
        recommendations,
        source: "ai_generated",
        basedOn: {
          inventoryItemCount: inventoryItems.length,
          savedRecipeCount: userRecipes.length,
        },
      });
    } catch (error) {
      console.error("Error generating recipe recommendations:", error);
      throw new ApiError("Unable to generate recipe recommendations", 500, { cause: error });
    }
  })
);

router.get(
  "/ingredients",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    try {
      const inventoryItems = await storage.user.inventory.getFoodItems(userId);
      const userRecipes = await storage.user.recipes.getRecipes(userId);

      const existingIngredients = new Set(
        inventoryItems.map((item: any) => item.name.toLowerCase())
      );

      const recipeIngredients: Record<string, number> = {};
      for (const recipe of userRecipes) {
        const ingredients = recipe.ingredients || [];
        for (const ingredient of ingredients) {
          const normalized = ingredient.toLowerCase().trim();
          if (!existingIngredients.has(normalized)) {
            recipeIngredients[normalized] = (recipeIngredients[normalized] || 0) + 1;
          }
        }
      }

      const recommendations = Object.entries(recipeIngredients)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([ingredient, count]) => ({
          name: ingredient,
          reason: `Used in ${count} of your saved recipes`,
          frequency: count,
          priority: count > 3 ? "high" : count > 1 ? "medium" : "low",
        }));

      res.json({
        recommendations,
        source: "recipe_analysis",
        basedOn: {
          inventoryItemCount: inventoryItems.length,
          savedRecipeCount: userRecipes.length,
        },
      });
    } catch (error) {
      console.error("Error generating ingredient recommendations:", error);
      throw new ApiError("Unable to generate ingredient recommendations", 500, { cause: error });
    }
  })
);

router.get(
  "/meal-plans",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const days = Math.min(parseInt(req.query.days as string) || 7, 14);

    try {
      const inventoryItems = await storage.user.inventory.getFoodItems(userId);
      const userRecipes = await storage.user.recipes.getRecipes(userId);

      const availableIngredients = inventoryItems.map((item: any) => item.name).join(", ");

      if (!openai) {
        const mealPlan = Array.from({ length: days }, (_, i) => ({
          day: i + 1,
          date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          meals: {
            breakfast: userRecipes[i % userRecipes.length]?.title || "Suggested breakfast",
            lunch: userRecipes[(i + 1) % userRecipes.length]?.title || "Suggested lunch",
            dinner: userRecipes[(i + 2) % userRecipes.length]?.title || "Suggested dinner",
          },
        }));

        return res.json({
          mealPlan,
          source: "saved_recipes",
        });
      }

      const prompt = `Create a ${days}-day meal plan based on these available ingredients: ${availableIngredients || "general pantry items"}

For each day, suggest breakfast, lunch, and dinner. Consider:
1. Variety in meals
2. Using ingredients before they expire
3. Balanced nutrition

Return as JSON array with format:
[{ "day": 1, "breakfast": "...", "lunch": "...", "dinner": "...", "notes": "..." }]`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2000,
      });

      let mealPlanData = [];
      try {
        mealPlanData = JSON.parse(completion.choices[0].message?.content || "[]");
      } catch {
        mealPlanData = [];
      }

      const mealPlan = mealPlanData.map((day: any, i: number) => ({
        day: day.day || i + 1,
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        meals: {
          breakfast: day.breakfast,
          lunch: day.lunch,
          dinner: day.dinner,
        },
        notes: day.notes,
      }));

      res.json({
        mealPlan,
        source: "ai_generated",
        basedOn: {
          inventoryItemCount: inventoryItems.length,
          savedRecipeCount: userRecipes.length,
        },
      });
    } catch (error) {
      console.error("Error generating meal plan recommendations:", error);
      throw new ApiError("Unable to generate meal plan recommendations", 500, { cause: error });
    }
  })
);

export default router;
