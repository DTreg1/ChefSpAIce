import { Router, Request as ExpressRequest, Response as ExpressResponse } from "express";
import { storage } from "../storage";
// Use OAuth authentication middleware
import { isAuthenticated } from "../middleware/auth.middleware";
import { extractNutrition } from "../utils/nutritionCalculator";
import { z } from "zod";

const router = Router();

// Query validation schema
const daysQuerySchema = z.object({
  days: z.coerce.number().min(1).max(365).optional().default(7),
});

// Get nutrition statistics
router.get(
  "/nutrition/stats",
  isAuthenticated,
  async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
    try {
      const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const { days } = daysQuerySchema.parse(req.query);
      
      // Get food items for the user
      const items = await storage.getFoodItems(userId);
      
      // Calculate nutrition stats based on items
      const stats = {
        totalItems: items.length,
        itemsWithNutrition: items.filter((item) => item.usdaData).length,
        averageCalories: 0,
        averageProtein: 0,
        averageCarbs: 0,
        averageFat: 0,
        daysAnalyzed: days,
      };
      
      // Calculate averages if there are items with nutrition data
      const itemsWithNutrition = items.filter((item) => item.usdaData);
      if (itemsWithNutrition.length > 0) {
        const totals = itemsWithNutrition.reduce((acc, item) => {
          const nutrition = extractNutrition(item.usdaData);
          if (!nutrition) return acc;
          
          return {
            calories: acc.calories + (nutrition.calories || 0),
            protein: acc.protein + (nutrition.protein || 0),
            carbs: acc.carbs + (nutrition.carbs || 0),
            fat: acc.fat + (nutrition.fat || 0),
          };
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
        
        stats.averageCalories = Math.round(totals.calories / itemsWithNutrition.length);
        stats.averageProtein = Math.round(totals.protein / itemsWithNutrition.length);
        stats.averageCarbs = Math.round(totals.carbs / itemsWithNutrition.length);
        stats.averageFat = Math.round(totals.fat / itemsWithNutrition.length);
      }
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching nutrition stats:", error);
      res.status(500).json({ error: "Failed to fetch nutrition stats" });
    }
  }
);

// Get nutrition items (food items with nutrition data)
router.get(
  "/nutrition/items",
  isAuthenticated,
  async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
    try {
      const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const { category, minCalories, maxCalories, sortBy = "name" } = req.query;
      
      // Get food items with nutrition data
      let items = await storage.getFoodItems(userId);
      items = items.filter((item) => item.usdaData);
      
      // Apply filters
      if (category) {
        items = items.filter((item) => item.foodCategory === category);
      }
      
      if (minCalories || maxCalories) {
        items = items.filter((item) => {
          const nutrition = extractNutrition(item.usdaData);
          if (!nutrition) return false;
          
          const calories = nutrition.calories || 0;
          
          if (minCalories && calories < Number(minCalories)) return false;
          if (maxCalories && calories > Number(maxCalories)) return false;
          return true;
        });
      }
      
      // Sort items
      if (sortBy === "calories") {
        items.sort((a, b) => {
          const aNutrition = extractNutrition(a.usdaData);
          const bNutrition = extractNutrition(b.usdaData);
          return (bNutrition?.calories || 0) - (aNutrition?.calories || 0);
        });
      } else if (sortBy === "protein") {
        items.sort((a, b) => {
          const aNutrition = extractNutrition(a.usdaData);
          const bNutrition = extractNutrition(b.usdaData);
          return (bNutrition?.protein || 0) - (aNutrition?.protein || 0);
        });
      } else {
        items.sort((a, b) => a.name.localeCompare(b.name));
      }
      
      // Add nutrition summary to each item
      const itemsWithNutrition = items.map((item) => {
        const nutrition = extractNutrition(item.usdaData);
        return {
          ...item,
          nutritionSummary: nutrition ? {
            calories: nutrition.calories,
            protein: nutrition.protein,
            carbohydrates: nutrition.carbs,
            fat: nutrition.fat,
            fiber: nutrition.fiber,
            sugar: nutrition.sugar,
            sodium: nutrition.sodium,
          } : null,
        };
      });
      
      res.json(itemsWithNutrition);
    } catch (error) {
      console.error("Error fetching nutrition items:", error);
      res.status(500).json({ error: "Failed to fetch nutrition items" });
    }
  }
);

// Calculate daily nutrition intake
router.get(
  "/nutrition/daily",
  isAuthenticated,
  async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
    try {
      const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const { date = new Date().toISOString().split("T")[0] } = req.query;
      
      // Get meal plans for the date
      const mealPlans = await storage.getMealPlans(userId);
      const todaysMeals = mealPlans.filter((plan) => plan.date === date);
      
      // Get recipes for those meal plans
      const recipes = await storage.getRecipes(userId);
      const todaysRecipes = recipes.filter((recipe) =>
        todaysMeals.some((plan) => plan.recipeId === recipe.id)
      );
      
      // Calculate total nutrition for the day
      const dailyNutrition = {
        date,
        meals: todaysMeals.length,
        totalCalories: 0 as number,
        totalProtein: 0 as number,
        totalCarbs: 0 as number,
        totalFat: 0 as number,
        totalFiber: 0 as number,
        mealBreakdown: [] as Array<{
          mealType: string;
          recipeName: string;
          servings: number;
          nutrition: {
            calories: number;
            protein: number;
            carbs: number;
            fat: number;
          };
        }>,
      };
      
      // Add nutrition from each meal
      todaysMeals.forEach((plan) => {
        const recipe = todaysRecipes.find((r) => r.id === plan.recipeId);
        if (recipe && recipe.nutrition) {
          const nutrition = recipe.nutrition;
          const servingMultiplier = plan.servings || 1;
          
          dailyNutrition.totalCalories += Number(nutrition.calories || 0) * servingMultiplier;
          dailyNutrition.totalProtein += Number(nutrition.protein || 0) * servingMultiplier;
          dailyNutrition.totalCarbs += Number(nutrition.carbs || 0) * servingMultiplier;
          dailyNutrition.totalFat += Number(nutrition.fat || 0) * servingMultiplier;
          dailyNutrition.totalFiber += Number(nutrition.fiber || 0) * servingMultiplier;
          
          dailyNutrition.mealBreakdown.push({
            mealType: plan.mealType,
            recipeName: recipe.title,
            servings: servingMultiplier,
            nutrition: {
              calories: Number(nutrition.calories || 0) * servingMultiplier,
              protein: Number(nutrition.protein || 0) * servingMultiplier,
              carbs: Number(nutrition.carbs || 0) * servingMultiplier,
              fat: Number(nutrition.fat || 0) * servingMultiplier,
            },
          });
        }
      });
      
      res.json(dailyNutrition);
    } catch (error) {
      console.error("Error calculating daily nutrition:", error);
      res.status(500).json({ error: "Failed to calculate daily nutrition" });
    }
  }
);

export default router;
