/**
 * RESTful Recipes & Chat Router v1
 * Implements standardized RESTful endpoints for recipes and chat management
 */

import { Router, Request, Response } from "express";
import { getAuthenticatedUserId, sendError, sendSuccess } from "../../types/request-helpers";
import { storage } from "../../storage/index";
import { insertChatMessageSchema, type ChatMessage, type Recipe } from "@shared/schema";
import { isAuthenticated } from "../../middleware/oauth.middleware";
import { openai } from "../../integrations/openai";
import { batchedApiLogger } from "../../utils/batchedApiLogger";
import rateLimiters from "../../middleware/rateLimit";
import {
  AIError,
  handleOpenAIError,
  retryWithBackoff,
  createErrorResponse,
  formatErrorForLogging
} from "../../utils/ai-error-handler";
import { getCircuitBreaker } from "../../utils/circuit-breaker";
import { createApiResponse, PaginatedResponse } from "../../config/api.config";

const router = Router();

// Circuit breakers for different OpenAI operations
const chatCircuitBreaker = getCircuitBreaker('openai-chat-standard', {
  failureThreshold: 5,
  recoveryTimeout: 60000,
  successThreshold: 2
});

const recipeCircuitBreaker = getCircuitBreaker('openai-recipe-generation', {
  failureThreshold: 3,
  recoveryTimeout: 90000,
  successThreshold: 1
});

// ============================================
// RECIPES RESOURCE
// ============================================

/**
 * GET /api/v1/recipes
 * List all recipes with filtering and pagination
 */
router.get("/recipes", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const {
      page = "1",
      limit = "20",
      cuisine,
      difficulty,
      tags,
      search,
      sort = "createdAt",
      order = "desc"
    } = req.query;
    
    // Get recipes from storage
    const recipes = await storage.user.recipes.getUserRecipes(userId);
    
    // Apply filters
    let filteredRecipes = recipes;
    
    // Search filter
    if (search) {
      const searchStr = String(search).toLowerCase();
      filteredRecipes = filteredRecipes.filter(recipe => 
        recipe.title.toLowerCase().includes(searchStr) ||
        recipe.description?.toLowerCase().includes(searchStr) ||
        recipe.ingredients?.some((ing: any) => ing.toLowerCase().includes(searchStr))
      );
    }
    
    // Cuisine filter
    if (cuisine) {
      filteredRecipes = filteredRecipes.filter(recipe => 
        recipe.cuisine?.toLowerCase() === String(cuisine).toLowerCase()
      );
    }
    
    // Difficulty filter
    if (difficulty) {
      filteredRecipes = filteredRecipes.filter(recipe => 
        recipe.difficulty === difficulty
      );
    }
    
    // Tags filter
    if (tags) {
      const tagList = String(tags).split(',');
      filteredRecipes = filteredRecipes.filter(recipe => 
        recipe.tags?.some((tag: string) => tagList.includes(tag))
      );
    }
    
    // Sorting
    filteredRecipes.sort((a: any, b: any) => {
      const modifier = order === "desc" ? -1 : 1;
      const sortField = String(sort);
      return (a[sortField] > b[sortField] ? 1 : -1) * modifier;
    });
    
    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedRecipes = filteredRecipes.slice(startIndex, endIndex);
    
    res.json(createApiResponse.paginated(
      paginatedRecipes,
      pageNum,
      limitNum,
      filteredRecipes.length
    ));
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch recipes"));
  }
});

/**
 * GET /api/v1/recipes/:id
 * Get a specific recipe
 */
router.get("/recipes/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const recipeId = req.params.id;
    const recipe = await storage.user.recipes.getRecipeById(userId, recipeId);
    
    if (!recipe) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Recipe not found"));
    }
    
    res.json(createApiResponse.success(recipe));
  } catch (error) {
    console.error("Error fetching recipe:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch recipe"));
  }
});

/**
 * POST /api/v1/recipes
 * Create a new recipe
 */
router.post("/recipes", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const recipeData = req.body;
    
    // TODO: Add validation schema for recipe creation
    if (!recipeData.title) {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "Recipe title is required"
      ));
    }
    
    const newRecipe = await storage.user.recipes.createRecipe(userId, recipeData);
    
    res.status(201).json(createApiResponse.success(newRecipe, "Recipe created successfully"));
  } catch (error) {
    console.error("Error creating recipe:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to create recipe"));
  }
});

/**
 * PUT /api/v1/recipes/:id
 * Update a recipe
 */
router.put("/recipes/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const recipeId = req.params.id;
    const updateData = req.body;
    
    const updatedRecipe = await storage.user.recipes.updateRecipe(userId, recipeId, updateData);
    
    if (!updatedRecipe) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Recipe not found"));
    }
    
    res.json(createApiResponse.success(updatedRecipe, "Recipe updated successfully"));
  } catch (error) {
    console.error("Error updating recipe:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to update recipe"));
  }
});

/**
 * DELETE /api/v1/recipes/:id
 * Delete a recipe
 */
router.delete("/recipes/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const recipeId = req.params.id;
    await storage.user.recipes.deleteRecipe(userId, recipeId);
    
    res.json(createApiResponse.success({ id: recipeId }, "Recipe deleted successfully"));
  } catch (error) {
    console.error("Error deleting recipe:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to delete recipe"));
  }
});

/**
 * POST /api/v1/recipes/:recipeId/reviews
 * Add a review to a recipe
 */
router.post("/recipes/:recipeId/reviews", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const recipeId = req.params.recipeId;
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "Rating must be between 1 and 5"
      ));
    }
    
    const review = await storage.user.recipes.addRecipeReview(userId, recipeId, {
      rating,
      comment,
      userId,
      createdAt: new Date().toISOString()
    });
    
    res.status(201).json(createApiResponse.success(review, "Review added successfully"));
  } catch (error) {
    console.error("Error adding review:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to add review"));
  }
});

/**
 * GET /api/v1/recipes/:recipeId/reviews
 * Get reviews for a recipe
 */
router.get("/recipes/:recipeId/reviews", async (req: Request, res: Response) => {
  try {
    const recipeId = req.params.recipeId;
    const { page = "1", limit = "10" } = req.query;
    
    const reviews = await storage.user.recipes.getRecipeReviews(recipeId);
    
    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedReviews = reviews.slice(startIndex, endIndex);
    
    res.json(createApiResponse.paginated(
      paginatedReviews,
      pageNum,
      limitNum,
      reviews.length
    ));
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch reviews"));
  }
});

// ============================================
// CHATS RESOURCE
// ============================================

/**
 * GET /api/v1/chats
 * List all chat sessions for a user
 */
router.get("/chats", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const { page = "1", limit = "10" } = req.query;
    
    // Get or create default chat session
    const sessions = await storage.user.chat.getChatSessions(userId);
    
    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedSessions = sessions.slice(startIndex, endIndex);
    
    res.json(createApiResponse.paginated(
      paginatedSessions,
      pageNum,
      limitNum,
      sessions.length
    ));
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch chat sessions"));
  }
});

/**
 * POST /api/v1/chats
 * Create a new chat session
 */
router.post("/chats", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const { title, context } = req.body;
    
    const session = await storage.user.chat.createChatSession(userId, {
      title: title || "New Chat",
      context: context || null,
      createdAt: new Date().toISOString()
    });
    
    res.status(201).json(createApiResponse.success(session, "Chat session created successfully"));
  } catch (error) {
    console.error("Error creating chat session:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to create chat session"));
  }
});

/**
 * GET /api/v1/chats/:chatId
 * Get a specific chat session
 */
router.get("/chats/:chatId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const chatId = req.params.chatId;
    const session = await storage.user.chat.getChatSession(userId, chatId);
    
    if (!session) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Chat session not found"));
    }
    
    res.json(createApiResponse.success(session));
  } catch (error) {
    console.error("Error fetching chat session:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch chat session"));
  }
});

/**
 * DELETE /api/v1/chats/:chatId
 * Delete a chat session and its messages
 */
router.delete("/chats/:chatId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const chatId = req.params.chatId;
    await storage.user.chat.deleteChatSession(userId, chatId);
    
    res.json(createApiResponse.success({ id: chatId }, "Chat session deleted successfully"));
  } catch (error) {
    console.error("Error deleting chat session:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to delete chat session"));
  }
});

/**
 * GET /api/v1/chats/:chatId/messages
 * Get messages for a specific chat session
 */
router.get("/chats/:chatId/messages", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const chatId = req.params.chatId === "default" ? userId : req.params.chatId;
    const { limit = "50", before } = req.query;
    
    const messages = await storage.user.chat.getChatMessages(userId, Number(limit));
    
    // Filter by before timestamp if provided
    let filteredMessages = messages;
    if (before) {
      const beforeDate = new Date(String(before));
      filteredMessages = messages.filter((msg: ChatMessage) => 
        new Date(msg.createdAt!) < beforeDate
      );
    }
    
    // Return in chronological order for display
    res.json(createApiResponse.success(filteredMessages.reverse()));
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch chat messages"));
  }
});

/**
 * POST /api/v1/chats/:chatId/messages
 * Send a message in a chat session (handles AI responses)
 */
router.post(
  "/chats/:chatId/messages",
  isAuthenticated,
  rateLimiters.openai.middleware(),
  async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
      
      const chatId = req.params.chatId === "default" ? userId : req.params.chatId;
      const { message, includeInventory } = req.body;
      
      if (!message) {
        return res.status(400).json(createApiResponse.error(
          "VALIDATION_ERROR",
          "Message is required"
        ));
      }
      
      // Save user message
      const userMessage = await storage.user.chat.createChatMessage(userId, {
        role: 'user',
        content: message
      });
      
      // Prepare context for AI
      const messages: any[] = [];
      
      // System message with cooking assistant context
      messages.push({
        role: 'system',
        content: `You are ChefBot, a helpful cooking assistant with expertise in recipes, meal planning, and culinary techniques.
        You help users with cooking questions, recipe suggestions, and meal planning based on their available ingredients.
        Be friendly, concise, and practical in your responses. Focus on clear, actionable cooking advice.`
      });
      
      // Include user's inventory if requested
      if (includeInventory) {
        const inventory = await storage.user.inventory.getFoodItems(userId, 'all');
        if (inventory && inventory.length > 0) {
          const inventoryList = inventory.map((item: any) => `- ${item.name} (${item.quantity} ${item.unit})`).join('\n');
          messages.push({
            role: 'system',
            content: `The user has the following ingredients available:\n${inventoryList}`
          });
        }
      }
      
      // Get recent message history
      const history = await storage.user.chat.getChatMessages(userId, 10);
      history.reverse().forEach((msg: ChatMessage) => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
      
      // Add current message
      messages.push({
        role: 'user',
        content: message
      });
      
      // Call OpenAI with circuit breaker
      const aiResponse = await chatCircuitBreaker.execute(async () => {
        return await retryWithBackoff(
          async () => {
            const completion = await openai.chat.completions.create({
              model: "gpt-4-turbo-preview",
              messages,
              max_tokens: 800,
              temperature: 0.7,
            });
            return completion.choices[0].message.content;
          },
          {
            maxRetries: 3,
            initialDelay: 1000,
            onRetry: (attempt, error, delay) => {
              console.log(`Retrying OpenAI chat request (attempt ${attempt + 1}/3)...`);
            }
          }
        );
      });
      
      // Save assistant response
      const assistantMessage = await storage.user.chat.createChatMessage(userId, {
        role: 'assistant',
        content: aiResponse || "I'm sorry, I couldn't generate a response. Please try again."
      });
      
      // Clean up old messages (keep last 100)
      const allMessages = await storage.user.chat.getChatMessages(userId, 200);
      if (allMessages.length > 100) {
        const messagesToDelete = allMessages.slice(100);
        for (const msg of messagesToDelete) {
          await storage.user.chat.deleteChatMessage(userId, msg.id);
        }
      }
      
      res.json(createApiResponse.success({
        message: aiResponse,
        saved: assistantMessage
      }));
      
    } catch (error: any) {
      if (error.code === 'CIRCUIT_BREAKER_OPEN') {
        return res.status(503).json(createApiResponse.error(
          "SERVICE_UNAVAILABLE",
          "AI service is temporarily unavailable. Please try again later."
        ));
      }
      
      const aiError = handleOpenAIError(error);
      console.error("Chat AI error:", formatErrorForLogging(aiError));
      
      res.status(aiError.statusCode || 500).json(
        createErrorResponse(aiError)
      );
    }
  }
);

/**
 * DELETE /api/v1/chats/:chatId/messages
 * Clear all messages in a chat session
 */
router.delete("/chats/:chatId/messages", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    
    const chatId = req.params.chatId === "default" ? userId : req.params.chatId;
    await storage.user.chat.deleteChatHistory(userId);
    
    res.json(createApiResponse.success(null, "Chat history cleared successfully"));
  } catch (error) {
    console.error("Error clearing chat messages:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to clear chat messages"));
  }
});

export default router;