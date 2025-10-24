import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { recipes, chatMessages, insertRecipeSchema, insertChatMessageSchema, type Recipe, type ChatMessage } from "@shared/schema";
import { isAuthenticated } from "../replitAuth";
import { validateBody, validateQuery } from "../middleware";
import { openai } from "../openai";
import { batchedApiLogger } from "../batchedApiLogger";
import { cleanupOldMessagesForUser } from "../chatCleanup";

const router = Router();

// Chat messages endpoints
router.get("/chat/messages", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await storage.getChatMessages(userId, limit);

    // Return in chronological order for display
    res.json(messages.reverse());
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({ error: "Failed to fetch chat messages" });
  }
});

router.post(
  "/chat/messages",
  isAuthenticated,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validation = insertChatMessageSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors
        });
      }

      const message = await storage.createChatMessage({
        ...validation.data,
        userId,
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error creating chat message:", error);
      res.status(500).json({ error: "Failed to create chat message" });
    }
  }
);

router.delete("/chat/messages", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    await storage.clearChatMessages(userId);
    res.json({ message: "Chat history cleared" });
  } catch (error) {
    console.error("Error clearing chat messages:", error);
    res.status(500).json({ error: "Failed to clear chat messages" });
  }
});

// Main chat endpoint with AI
router.post(
  "/chat",
  isAuthenticated,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { message, includeInventory } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      if (!openai) {
        return res.status(500).json({ error: "OpenAI API not configured" });
      }

      // Save user message
      await storage.createChatMessage({
        userId,
        role: "user",
        content: message,
      });

      // Cleanup old messages periodically
      await cleanupOldMessagesForUser(userId);

      // Get inventory context if requested
      let inventoryContext = "";
      if (includeInventory) {
        const items = await storage.getFoodItems(userId);
        
        if (items.length > 0) {
          inventoryContext = `\n\nUser's current food inventory:\n${items
            .map((item: any) => `- ${item.name}: ${item.quantity} ${item.unit || ""} (${item.foodCategory || "uncategorized"})`)
            .join("\n")}`;
        }
      }

      // Get recent chat history for context
      const history = await storage.getChatMessages(userId, 10);

      const messages: any[] = [
        {
          role: "system",
          content: `You are ChefSpAIce, a helpful cooking assistant. You provide recipe suggestions, cooking tips, and meal planning advice. Be concise but friendly.${inventoryContext}`,
        },
        ...history.reverse().map((msg: ChatMessage) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const assistantMessage = completion.choices[0].message?.content || "";

      // Save assistant message
      const saved = await storage.createChatMessage({
        userId,
        role: "assistant",
        content: assistantMessage,
      });

      // Log API usage
      await batchedApiLogger.logApiUsage(userId, {
        apiName: "openai",
        endpoint: "chat",
        queryParams: `model=gpt-4-turbo-preview`,
        statusCode: 200,
        success: true,
      });

      res.json({
        message: assistantMessage,
        saved,
      });
    } catch (error) {
      console.error("Error in chat:", error);
      res.status(500).json({ error: "Failed to process chat" });
    }
  }
);

// Recipe generation endpoint
router.post(
  "/recipes/generate",
  isAuthenticated,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { 
        prompt, 
        useInventory, 
        dietaryRestrictions = [],
        cuisine,
        mealType,
        difficulty = "medium",
        maxCookTime
      } = req.body;

      if (!openai) {
        return res.status(500).json({ error: "OpenAI API not configured" });
      }

      // Build context
      let context = "Generate a detailed recipe with the following requirements:\n";
      
      if (prompt) {
        context += `\nUser request: ${prompt}\n`;
      }

      if (useInventory) {
        const items = await storage.getFoodItems(userId);
        
        if (items.length > 0) {
          context += `\nAvailable ingredients:\n${items
            .map((item: any) => `- ${item.name} (${item.quantity} available)`)
            .join("\n")}\n`;
        }
      }

      if (dietaryRestrictions.length > 0) {
        context += `\nDietary restrictions: ${dietaryRestrictions.join(", ")}\n`;
      }

      if (cuisine) context += `\nCuisine type: ${cuisine}\n`;
      if (mealType) context += `\nMeal type: ${mealType}\n`;
      if (difficulty) context += `\nDifficulty level: ${difficulty}\n`;
      if (maxCookTime) context += `\nMaximum cooking time: ${maxCookTime} minutes\n`;

      context += `
Return a JSON object with the following structure:
{
  "title": "Recipe name",
  "description": "Brief description",
  "ingredients": ["ingredient 1", "ingredient 2", ...],
  "instructions": ["step 1", "step 2", ...],
  "prepTime": "X minutes",
  "cookTime": "Y minutes",
  "servings": number,
  "usedIngredients": ["ingredients from user inventory"],
  "missingIngredients": ["ingredients user needs to buy"]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: context }],
        temperature: 0.8,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      });

      const recipeData = JSON.parse(completion.choices[0].message?.content || "{}");

      // Save recipe to database
      const saved = await storage.createRecipe({
        userId,
        ...recipeData,
      });

      // Log API usage
      await batchedApiLogger.logApiUsage(userId, {
        apiName: "openai",
        endpoint: "recipes/generate",
        queryParams: `model=gpt-4-turbo-preview`,
        statusCode: 200,
        success: true,
      });

      res.json(saved);
    } catch (error) {
      console.error("Error generating recipe:", error);
      res.status(500).json({ error: "Failed to generate recipe" });
    }
  }
);

// Recipe CRUD endpoints
router.get("/recipes", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const { 
      saved, 
      cuisine, 
      difficulty,
      maxCookTime,
      search 
    } = req.query;

    // Get all user recipes first
    let userRecipes = await storage.getRecipes(userId);
    
    // Apply filters
    if (saved === "true") {
      userRecipes = userRecipes.filter((r: Recipe) => r.isFavorite === true);
    }
    
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      userRecipes = userRecipes.filter((r: Recipe) => 
        r.title.toLowerCase().includes(searchTerm)
      );
    }

    res.json(userRecipes);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
});

router.patch(
  "/recipes/:id",
  isAuthenticated,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const recipeId = req.params.id;

      // Verify recipe belongs to user
      const recipes = await storage.getRecipes(userId);
      const existing = recipes.find((r: Recipe) => r.id === recipeId);

      if (!existing) {
        return res.status(404).json({ error: "Recipe not found" });
      }

      const updated = await storage.updateRecipe(recipeId, userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(500).json({ error: "Failed to update recipe" });
    }
  }
);

router.delete("/recipes/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const recipeId = req.params.id;

    // Verify recipe belongs to user
    const recipes = await storage.getRecipes(userId);
    const existing = recipes.find((r: Recipe) => r.id === recipeId);

    if (!existing) {
      return res.status(404).json({ error: "Recipe not found" });
    }

    await storage.deleteRecipe(recipeId, userId);
    res.json({ message: "Recipe deleted successfully" });
  } catch (error) {
    console.error("Error deleting recipe:", error);
    res.status(500).json({ error: "Failed to delete recipe" });
  }
});

export default router;