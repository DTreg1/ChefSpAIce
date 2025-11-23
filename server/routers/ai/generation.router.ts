/**
 * AI Generation Router
 * 
 * Consolidated router for all AI generation services including:
 * - Writing assistance (grammar, style, tone adjustment)
 * - Content generation (expansion, summarization)
 * - Translation services
 * - Recipe and meal generation
 * 
 * Base path: /api/ai/generation
 */

import { Router, Request, Response } from "express";
import { isAuthenticated } from "../../middleware/oauth.middleware";
import { storage } from "../../storage/index";
import { z } from "zod";
import OpenAI from "openai";
import { getOpenAIClient } from "../../config/openai-config";
import { getAuthenticatedUserId } from "../../middleware/oauth.middleware";
import { rateLimiters } from "../../middleware/rateLimit";
import {
  AIError,
  handleOpenAIError,
  retryWithBackoff,
  createErrorResponse,
} from "../../utils/ai-error-handler";
import { getCircuitBreaker } from "../../utils/circuit-breaker";
import { syllable } from "syllable";
import Sentiment from "sentiment";
import rs from "text-readability";

const router = Router();

// Initialize OpenAI client
const openai = getOpenAIClient();

// Initialize NLP tools
const sentiment = new Sentiment();

// Circuit breaker for OpenAI calls
const openaiBreaker = getCircuitBreaker("openai-generation");

// ==================== VALIDATION SCHEMAS ====================

const analyzeTextSchema = z.object({
  text: z.string().min(1).max(50000),
  options: z.object({
    checkGrammar: z.boolean().default(true),
    checkSpelling: z.boolean().default(true),
    checkStyle: z.boolean().default(true),
    suggestTone: z.boolean().default(true),
    targetTone: z.enum(["formal", "casual", "professional", "friendly", "academic"]).optional(),
  }).optional(),
});

const adjustToneSchema = z.object({
  text: z.string().min(1).max(10000),
  targetTone: z.enum(["formal", "casual", "professional", "friendly", "academic"]),
});

const expandTextSchema = z.object({
  text: z.string().min(1).max(5000),
  targetLength: z.enum(["short", "medium", "long"]).default("medium"),
});

const summarizeTextSchema = z.object({
  text: z.string().min(50).max(50000),
  length: z.enum(["brief", "moderate", "detailed"]).default("moderate"),
  format: z.enum(["paragraph", "bullets", "outline"]).default("paragraph"),
});

const translateSchema = z.object({
  text: z.string().min(1).max(10000),
  sourceLang: z.string().optional(),
  targetLang: z.string(),
  preserveFormatting: z.boolean().default(true),
});

const recipeGenerationSchema = z.object({
  ingredients: z.array(z.string()).min(1),
  preferences: z.object({
    cuisineType: z.string().optional(),
    dietaryRestrictions: z.array(z.string()).optional(),
    cookingTime: z.enum(["quick", "moderate", "lengthy"]).optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  }).optional(),
  servings: z.number().min(1).max(20).default(4),
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Calculate readability score using Flesch Reading Ease
 */
function calculateReadability(text: string): number {
  try {
    const score = rs.fleschReadingEase(text);
    return Math.max(0, Math.min(100, score));
  } catch (error) {
    console.error("Error calculating readability:", error);
    return 50; // Default middle score on error
  }
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Detect tone of text using sentiment analysis
 */
function detectTone(text: string): string {
  const result = sentiment.analyze(text);
  
  if (result.score > 5) return "positive";
  if (result.score < -5) return "negative";
  if (result.score > 2) return "friendly";
  if (result.score < -2) return "serious";
  return "neutral";
}

/**
 * Check if OpenAI is configured
 */
function checkOpenAIConfiguration(res: Response): boolean {
  if (!openai) {
    res.status(503).json({ 
      error: "AI service not configured",
      message: "OpenAI API key is required for this feature."
    });
    return false;
  }
  return true;
}

// ==================== WRITING ASSISTANCE ENDPOINTS ====================

/**
 * POST /api/ai/generation/writing/analyze
 * Analyze text for grammar, style, and tone improvements
 */
router.post("/writing/analyze", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!checkOpenAIConfiguration(res)) return;
    
    const validation = analyzeTextSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { text, options } = validation.data;
    const {
      checkGrammar = true,
      checkSpelling = true,
      checkStyle = true,
      suggestTone = true,
      targetTone,
    } = options || {};
    
    // Calculate text metrics
    const wordCount = countWords(text);
    const readabilityScore = calculateReadability(text);
    const detectedTone = detectTone(text);
    
    // Create writing session
    const session = await storage.platform.ai.createWritingSession({
      userId,
      originalText: text,
      documentId: null,
    });
    
    const suggestions: any[] = [];
    
    // AI-powered analysis
    if (checkStyle || suggestTone) {
      const prompt = `Analyze this text for writing improvements:

Text: "${text}"

Provide specific suggestions for:
${checkGrammar ? "- Grammar and spelling corrections" : ""}
${checkStyle ? "- Style and clarity improvements" : ""}
${suggestTone && targetTone ? `- Adjusting tone to be more ${targetTone}` : ""}
${checkStyle ? "- Removing passive voice where appropriate" : ""}
${checkStyle ? "- Improving word choice and conciseness" : ""}

For each suggestion, provide:
1. The original text snippet (exact quote, 5-15 words)
2. The suggested replacement
3. The reason for the change
4. The type (grammar, style, tone, clarity, conciseness)

Format as JSON array. Only return valid JSON, no other text.`;

      const completion = await openaiBreaker.execute(async () => {
        return await openai!.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2000,
          temperature: 0.3,
          response_format: { type: "json_object" },
        });
      });

      try {
        const aiSuggestions = JSON.parse(completion.choices[0]?.message?.content || "[]");
        if (Array.isArray(aiSuggestions)) {
          suggestions.push(...aiSuggestions);
        }
      } catch (parseError) {
        console.error("Error parsing AI suggestions:", parseError);
      }
    }
    
    // Save suggestions to storage
    if (suggestions.length > 0) {
      await storage.platform.ai.addWritingSuggestions(
        session.id,
        suggestions.map(s => ({
          suggestionType: s.type || "style",
          originalSnippet: s.original || "",
          suggestedSnippet: s.suggested || "",
          reason: s.reason,
        }))
      );
    }
    
    res.json({
      sessionId: session.id,
      metrics: {
        wordCount,
        readabilityScore,
        tone: detectedTone,
        targetTone: targetTone || detectedTone,
      },
      suggestions,
    });
  } catch (error) {
    const errorResponse = handleOpenAIError(error as Error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
});

/**
 * POST /api/ai/generation/writing/tone
 * Adjust the tone of text
 */
router.post("/writing/tone", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!checkOpenAIConfiguration(res)) return;
    
    const validation = adjustToneSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { text, targetTone } = validation.data;
    
    const toneDescriptions = {
      formal: "formal, professional, and respectful",
      casual: "casual, conversational, and relaxed",
      professional: "professional, clear, and business-appropriate",
      friendly: "friendly, warm, and approachable",
      academic: "academic, scholarly, and precise",
    };
    
    const prompt = `Rewrite this text to have a ${toneDescriptions[targetTone]} tone:

"${text}"

Maintain the same meaning and key points, but adjust the language, word choice, and sentence structure to match the ${targetTone} tone.

Return only the rewritten text, no explanations.`;

    const completion = await openaiBreaker.execute(async () => {
      return await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        temperature: 0.5,
      });
    });
    
    const adjustedText = completion.choices[0]?.message?.content || text;
    
    res.json({
      originalText: text,
      adjustedText,
      targetTone,
    });
  } catch (error) {
    const errorResponse = handleOpenAIError(error as Error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
});

/**
 * POST /api/ai/generation/writing/expand
 * Expand text to be more detailed
 */
router.post("/writing/expand", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!checkOpenAIConfiguration(res)) return;
    
    const validation = expandTextSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { text, targetLength } = validation.data;
    
    const expansionFactors = {
      short: "slightly (about 25% more)",
      medium: "moderately (about 50% more)",
      long: "significantly (about 100% more)",
    };
    
    const prompt = `Expand this text ${expansionFactors[targetLength]}:

"${text}"

Add relevant details, examples, and explanations to make the text more comprehensive while maintaining the original meaning and style.

Return only the expanded text, no explanations.`;

    const completion = await openaiBreaker.execute(async () => {
      return await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 3000,
        temperature: 0.7,
      });
    });
    
    const expandedText = completion.choices[0]?.message?.content || text;
    
    res.json({
      originalText: text,
      expandedText,
      originalLength: countWords(text),
      expandedLength: countWords(expandedText),
      targetLength,
    });
  } catch (error) {
    const errorResponse = handleOpenAIError(error as Error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
});

// ==================== SUMMARIZATION ENDPOINTS ====================

/**
 * POST /api/ai/generation/summarize
 * Summarize text content
 */
router.post("/summarize", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!checkOpenAIConfiguration(res)) return;
    
    const validation = summarizeTextSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { text, length, format } = validation.data;
    
    const lengthDescriptions = {
      brief: "very brief (2-3 sentences)",
      moderate: "moderate (1-2 paragraphs)",
      detailed: "detailed (3-4 paragraphs)",
    };
    
    const formatInstructions = {
      paragraph: "Format as continuous paragraphs.",
      bullets: "Format as bullet points.",
      outline: "Format as a hierarchical outline.",
    };
    
    const prompt = `Summarize this text in a ${lengthDescriptions[length]} manner:

"${text}"

${formatInstructions[format]}

Focus on the key points and main ideas. Return only the summary, no explanations.`;

    const completion = await openaiBreaker.execute(async () => {
      return await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1000,
        temperature: 0.3,
      });
    });
    
    const summary = completion.choices[0]?.message?.content || "";
    
    res.json({
      originalLength: countWords(text),
      summary,
      summaryLength: countWords(summary),
      format,
      compressionRatio: (countWords(summary) / countWords(text)).toFixed(2),
    });
  } catch (error) {
    const errorResponse = handleOpenAIError(error as Error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
});

// ==================== TRANSLATION ENDPOINTS ====================

/**
 * POST /api/ai/generation/translate
 * Translate text between languages
 */
router.post("/translate", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!checkOpenAIConfiguration(res)) return;
    
    const validation = translateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { text, sourceLang, targetLang, preserveFormatting } = validation.data;
    
    const prompt = `Translate the following text ${sourceLang ? `from ${sourceLang}` : ""} to ${targetLang}:

"${text}"

${preserveFormatting ? "Preserve the original formatting, including line breaks and spacing." : ""}

Return only the translated text, no explanations.`;

    const completion = await openaiBreaker.execute(async () => {
      return await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 3000,
        temperature: 0.3,
      });
    });
    
    const translatedText = completion.choices[0]?.message?.content || "";
    
    // Save translation to storage
    const translation = await storage.platform.ai.createTranslation({
      userId,
      sourceText: text,
      translatedText,
      sourceLang: sourceLang || "auto",
      targetLang,
      confidence: 0.95,
      metadata: {
        preserveFormatting,
        model: "gpt-4o",
      },
    });
    
    res.json({
      translationId: translation.id,
      sourceText: text,
      translatedText,
      sourceLang: sourceLang || "auto-detected",
      targetLang,
      wordCount: {
        source: countWords(text),
        translated: countWords(translatedText),
      },
    });
  } catch (error) {
    const errorResponse = handleOpenAIError(error as Error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
});

/**
 * POST /api/ai/generation/translate/detect
 * Detect the language of text
 */
router.post("/translate/detect", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!checkOpenAIConfiguration(res)) return;
    
    const { text } = req.body;
    
    if (!text || text.length < 3) {
      return res.status(400).json({ error: "Text too short for language detection" });
    }
    
    const prompt = `Detect the language of this text and return only the ISO 639-1 language code (e.g., 'en' for English, 'es' for Spanish):

"${text}"

Return only the 2-letter language code, nothing else.`;

    const completion = await openaiBreaker.execute(async () => {
      return await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 10,
        temperature: 0,
      });
    });
    
    const detectedLang = completion.choices[0]?.message?.content?.trim().toLowerCase() || "unknown";
    
    res.json({
      detectedLanguage: detectedLang,
      confidence: 0.95,
    });
  } catch (error) {
    const errorResponse = handleOpenAIError(error as Error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
});

// ==================== RECIPE GENERATION ENDPOINTS ====================

/**
 * POST /api/ai/generation/recipe
 * Generate a recipe based on ingredients and preferences
 */
router.post("/recipe", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!checkOpenAIConfiguration(res)) return;
    
    const validation = recipeGenerationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { ingredients, preferences, servings } = validation.data;
    
    const prompt = `Create a recipe using these ingredients: ${ingredients.join(", ")}

Preferences:
- Servings: ${servings}
${preferences?.cuisineType ? `- Cuisine type: ${preferences.cuisineType}` : ""}
${preferences?.dietaryRestrictions ? `- Dietary restrictions: ${preferences.dietaryRestrictions.join(", ")}` : ""}
${preferences?.cookingTime ? `- Cooking time: ${preferences.cookingTime}` : ""}
${preferences?.difficulty ? `- Difficulty level: ${preferences.difficulty}` : ""}

Provide a complete recipe with:
1. Recipe name
2. Total time (prep + cooking)
3. Difficulty level
4. Complete ingredient list with measurements
5. Step-by-step instructions
6. Nutritional information estimate per serving

Format as JSON with these fields: name, prepTime, cookTime, totalTime, difficulty, ingredients (array), instructions (array), nutrition (object with calories, protein, carbs, fat).`;

    const completion = await openaiBreaker.execute(async () => {
      return await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        temperature: 0.7,
        response_format: { type: "json_object" },
      });
    });
    
    const recipeData = JSON.parse(completion.choices[0]?.message?.content || "{}");
    
    // Save recipe to storage
    const recipe = await storage.user.recipes.createRecipe(userId, {
      name: recipeData.name || "AI Generated Recipe",
      ingredients: recipeData.ingredients || ingredients.map(i => ({ item: i, amount: "", unit: "" })),
      instructions: recipeData.instructions || [],
      prepTime: recipeData.prepTime || 15,
      cookTime: recipeData.cookTime || 30,
      servings: servings,
      difficulty: recipeData.difficulty || "medium",
      cuisine: preferences?.cuisineType || "International",
      dietaryTags: preferences?.dietaryRestrictions || [],
      nutritionPerServing: recipeData.nutrition || {},
      sourceUrl: null,
      imageUrl: null,
      notes: "AI-generated recipe based on available ingredients",
      isPublic: false,
      tags: ["ai-generated"],
    });
    
    res.json({
      recipeId: recipe.id,
      recipe: recipeData,
      metadata: {
        generatedAt: new Date().toISOString(),
        model: "gpt-4o",
        basedOnIngredients: ingredients,
      },
    });
  } catch (error) {
    const errorResponse = handleOpenAIError(error as Error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
});

// ==================== AI ASSISTANT CONVERSATION ENDPOINTS ====================

/**
 * GET /api/ai/generation/conversations
 * Get all conversations for the authenticated user
 */
router.get("/conversations", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const conversations = await storage.user.chat.getConversations(userId);
    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

/**
 * POST /api/ai/generation/conversations
 * Create a new conversation
 */
router.post("/conversations", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { title } = req.body;
    const conversationTitle = title || "New Conversation";
    
    const conversation = await storage.user.chat.createConversation(userId, conversationTitle);
    res.json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

/**
 * POST /api/ai/generation/conversations/:id/messages
 * Send a message in a conversation
 */
router.post("/conversations/:id/messages", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!checkOpenAIConfiguration(res)) return;
    
    const { id } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    
    // Save user message
    await storage.user.chat.addMessage(userId, id, {
      conversationId: id,
      role: "user",
      content: message,
    });
    
    // Get conversation history for context
    const conversation = await storage.user.chat.getConversation(userId, id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    // Prepare messages for OpenAI
    const messages = [
      {
        role: "system" as const,
        content: "You are a helpful AI assistant for a kitchen management app. Help users with recipes, meal planning, and cooking advice.",
      },
      ...conversation.messages.slice(-10).map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ];
    
    // Generate AI response
    const completion = await openaiBreaker.execute(async () => {
      return await openai!.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      });
    });
    
    const aiResponse = completion.choices[0]?.message?.content || "I apologize, but I couldn't generate a response.";
    
    // Save AI response
    const aiMessage = await storage.user.chat.addMessage(userId, id, {
      conversationId: id,
      role: "assistant",
      content: aiResponse,
    });
    
    res.json(aiMessage);
  } catch (error) {
    const errorResponse = handleOpenAIError(error as Error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
});

/**
 * GET /api/ai/generation/conversations/:id
 * Get a specific conversation
 */
router.get("/conversations/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const conversation = await storage.user.chat.getConversation(userId, req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    res.json(conversation);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

/**
 * PATCH /api/ai/generation/conversations/:id
 * Update a conversation
 */
router.patch("/conversations/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { title, context, metadata } = req.body;
    const updated = await storage.user.chat.updateConversation(
      userId,
      req.params.id,
      { title, context, metadata }
    );
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating conversation:", error);
    res.status(500).json({ error: "Failed to update conversation" });
  }
});

/**
 * DELETE /api/ai/generation/conversations/:id
 * Delete a conversation
 */
router.delete("/conversations/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    await storage.user.chat.deleteConversation(userId, req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

/**
 * GET /api/ai/generation/conversations/:id/messages
 * Get all messages in a conversation
 */
router.get("/conversations/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const messages = await storage.user.chat.getMessages(userId, req.params.id);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/**
 * DELETE /api/ai/generation/conversations/:conversationId/messages/:messageId
 * Delete a message from a conversation
 */
router.delete("/conversations/:conversationId/messages/:messageId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    await storage.user.chat.deleteMessage(
      userId,
      req.params.conversationId,
      req.params.messageId
    );
    
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

/**
 * GET /api/ai/generation/stats
 * Get AI generation usage statistics
 */
router.get("/stats", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const stats = await storage.platform.ai.getWritingStats(userId);
    
    res.json({
      ...stats,
      endpoints: {
        writing: "/api/ai/generation/writing/*",
        translation: "/api/ai/generation/translate/*",
        summarization: "/api/ai/generation/summarize",
        recipe: "/api/ai/generation/recipe",
        conversations: "/api/ai/generation/conversations/*",
      },
    });
  } catch (error) {
    console.error("Error getting generation stats:", error);
    res.status(500).json({ error: "Failed to get generation statistics" });
  }
});

export default router;