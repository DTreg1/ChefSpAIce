/**
 * Consolidated AI Content Router
 * 
 * Unified router for all AI content generation services including:
 * - Writing assistance (grammar, style, tone adjustment)
 * - Content generation (expansion, summarization)
 * - Translation services
 * - Recipe and meal generation
 * - Smart email/message drafting
 * - Excerpt generation and A/B testing
 * 
 * Base path: /api/ai/content
 * 
 * Sub-routes:
 * - /drafts/* - Email/message drafting
 * - /excerpts/* - Excerpt generation and optimization
 * - /* - General content generation
 * 
 * @module server/routers/ai/content.router
 */

import { Router, Request, Response } from "express";
import { isAuthenticated, getAuthenticatedUserId } from "../../middleware/auth.middleware";
import { storage } from "../../storage/index";
import { z } from "zod";
import OpenAI from "openai";
import { getOpenAIClient } from "../../config/openai-config";
import { rateLimiters } from "../../middleware/rate-limit.middleware";
import { circuitBreakers, executeWithBreaker } from "../../middleware/circuit-breaker.middleware";
import {
  AIError,
  handleOpenAIError,
  retryWithBackoff,
  createErrorResponse,
} from "../../utils/ai-error-handler";
import { syllable } from "syllable";
import Sentiment from "sentiment";
import rs from "text-readability";
import { excerptService } from "../../services/excerpt.service";
import type { IStorage } from "../../storage/interfaces/IStorage";

const router = Router();

const openai = getOpenAIClient();

const sentiment = new Sentiment();

const openaiBreaker = circuitBreakers.openaiGeneration;

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

const paraphraseSchema = z.object({
  text: z.string().min(1).max(10000),
  style: z.string().optional(),
});

const generateExcerptSchema = z.object({
  content: z.string().min(50, "Content must be at least 50 characters"),
  contentId: z.string().min(1),
  targetPlatform: z.enum(['twitter', 'linkedin', 'facebook', 'instagram', 'generic']).optional(),
  excerptType: z.enum(['social', 'email', 'card', 'meta', 'summary']).optional(),
  tone: z.enum(['professional', 'casual', 'formal', 'friendly', 'exciting', 'informative']).optional(),
  style: z.enum(['descriptive', 'action-oriented', 'question-based', 'teaser', 'summary']).optional(),
  targetAudience: z.string().optional(),
  callToAction: z.boolean().optional(),
  hashtags: z.boolean().optional(),
  emojis: z.boolean().optional(),
  maxCharacters: z.number().min(20).max(5000).optional(),
  temperature: z.number().min(0).max(1).optional(),
  variantCount: z.number().min(1).max(5).optional(),
});

const optimizeExcerptSchema = z.object({
  excerptId: z.string(),
  targetCTR: z.number().min(0).max(1).optional(),
});

const trackPerformanceSchema = z.object({
  views: z.number().min(0).optional(),
  clicks: z.number().min(0).optional(),
  shares: z.number().min(0).optional(),
  engagements: z.number().min(0).optional(),
  conversions: z.number().min(0).optional(),
  bounces: z.number().min(0).optional(),
  timeOnPage: z.number().min(0).optional(),
  platformMetrics: z.object({
    twitter: z.object({
      impressions: z.number().optional(),
      retweets: z.number().optional(),
      likes: z.number().optional(),
      replies: z.number().optional(),
    }).optional(),
    linkedin: z.object({
      impressions: z.number().optional(),
      reactions: z.number().optional(),
      comments: z.number().optional(),
      reposts: z.number().optional(),
    }).optional(),
    facebook: z.object({
      reach: z.number().optional(),
      reactions: z.number().optional(),
      comments: z.number().optional(),
      shares: z.number().optional(),
    }).optional(),
    email: z.object({
      opens: z.number().optional(),
      clicks: z.number().optional(),
      forwards: z.number().optional(),
    }).optional(),
  }).optional(),
});

// ==================== HELPER FUNCTIONS ====================

function calculateReadability(text: string): number {
  try {
    const score = rs.fleschReadingEase(text);
    return Math.max(0, Math.min(100, score));
  } catch (error) {
    console.error("Error calculating readability:", error);
    return 50;
  }
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

function detectTone(text: string): string {
  const result = sentiment.analyze(text);
  
  if (result.score > 5) return "positive";
  if (result.score < -5) return "negative";
  if (result.score > 2) return "friendly";
  if (result.score < -2) return "serious";
  return "neutral";
}

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

async function generateDraftVariations(
  originalMessage: string,
  contextType: string,
  tones: string[]
): Promise<Array<{ content: string; tone: string }>> {
  if (!openai) {
    throw new Error("OpenAI client not configured");
  }

  const contextInstructions: Record<string, string> = {
    'customer_complaint': 'You are responding to a customer complaint. Be professional, acknowledge their concerns, and offer solutions.',
    'email': 'You are drafting a professional email response.',
    'message': 'You are drafting a conversational message response.',
    'comment': 'You are drafting a comment or forum response.'
  };

  const toneDescriptions: Record<string, string> = {
    'formal': 'Use formal language with proper business etiquette',
    'casual': 'Use relaxed, conversational language',
    'friendly': 'Use warm, approachable language with a positive tone',
    'apologetic': 'Express sincere regret and take responsibility',
    'solution-focused': 'Emphasize practical solutions and next steps',
    'empathetic': 'Show understanding and compassion for their situation'
  };

  const systemPrompt = `You are an expert at crafting contextual responses. ${contextInstructions[contextType] || contextInstructions.email}
    
Generate ${tones.length} different response drafts to the following message, each with a different tone.

Tones to use:
${tones.map(tone => `- ${tone}: ${toneDescriptions[tone] || tone}`).join('\n')}

Return a JSON object with a "drafts" array containing objects with "content" and "tone" fields.
Each draft should be complete and ready to send.`;
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Original message to respond to:\n"${originalMessage}"` }
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000,
    temperature: 0.8
  });
  
  const result = JSON.parse(completion.choices[0]?.message?.content || '{"drafts":[]}');
  const drafts = result.drafts || [];
  
  return tones.map((tone, index) => ({
    content: drafts[index]?.content || `[Draft generation failed for ${tone} tone]`,
    tone: tone
  }));
}

// ==================== WRITING ASSISTANCE ENDPOINTS ====================

/**
 * POST /api/ai/content/analyze
 * Analyze text for grammar, style, and tone improvements
 */
router.post("/analyze", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
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
    
    const wordCount = countWords(text);
    const readabilityScore = calculateReadability(text);
    const detectedTone = detectTone(text);
    
    const session = await storage.platform.ai.createWritingSession(userId, {
      originalText: text,
      documentId: null,
    });
    
    const suggestions: any[] = [];
    
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
    
    if (suggestions.length > 0) {
      await storage.platform.ai.addWritingSuggestions(
        session.id,
        suggestions.map(s => ({
          suggestionType: (s.type || "style") as "tone" | "grammar" | "style" | "clarity" | "vocabulary",
          originalText: s.original || "",
          suggestedText: s.suggested || "",
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
    const aiError = handleOpenAIError(error as Error);
    res.status(aiError.statusCode).json(createErrorResponse(aiError));
  }
});

/**
 * POST /api/ai/content/tone
 * Adjust the tone of text
 */
router.post("/tone", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
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
    const aiError = handleOpenAIError(error as Error);
    res.status(aiError.statusCode).json(createErrorResponse(aiError));
  }
});

/**
 * POST /api/ai/content/expand
 * Expand text to be more detailed
 */
router.post("/expand", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
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
    const aiError = handleOpenAIError(error as Error);
    res.status(aiError.statusCode).json(createErrorResponse(aiError));
  }
});

/**
 * POST /api/ai/content/summarize
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
    const aiError = handleOpenAIError(error as Error);
    res.status(aiError.statusCode).json(createErrorResponse(aiError));
  }
});

/**
 * POST /api/ai/content/paraphrase
 * Paraphrase text while maintaining meaning
 */
router.post("/paraphrase", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!checkOpenAIConfiguration(res)) return;
    
    const validation = paraphraseSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { text, style } = validation.data;
    
    const completion = await openai!.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Paraphrase the following text ${style ? `in a ${style} style` : ""}.
          Provide 3 different variations.
          Return JSON: { "variations": ["version1", "version2", "version3"] }`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '{"variations":[]}');
    res.json({ variations: result.variations || [] });
  } catch (error) {
    const aiError = handleOpenAIError(error as Error);
    res.status(aiError.statusCode).json(createErrorResponse(aiError));
  }
});

// ==================== TRANSLATION ENDPOINTS ====================

/**
 * POST /api/ai/content/translate
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
    
    const translation = await storage.platform.ai.translateContent(userId, {
      sourceText: text,
      translatedText,
      sourceLanguage: sourceLang || "auto",
      targetLanguage: targetLang,
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
    const aiError = handleOpenAIError(error as Error);
    res.status(aiError.statusCode).json(createErrorResponse(aiError));
  }
});

/**
 * POST /api/ai/content/translate/detect
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
    const aiError = handleOpenAIError(error as Error);
    res.status(aiError.statusCode).json(createErrorResponse(aiError));
  }
});

// ==================== RECIPE GENERATION ENDPOINTS ====================

/**
 * POST /api/ai/content/recipe
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
    
    const recipe = await storage.user.recipes.createRecipe(userId, {
      title: recipeData.name || "AI Generated Recipe",
      ingredients: recipeData.ingredients || ingredients.map((i: string) => ({ item: i, amount: "", unit: "" })),
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
    const aiError = handleOpenAIError(error as Error);
    res.status(aiError.statusCode).json(createErrorResponse(aiError));
  }
});

// ==================== AI CONVERSATION ENDPOINTS ====================

/**
 * GET /api/ai/content/conversations
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
 * POST /api/ai/content/conversations
 * Create a new conversation
 */
router.post("/conversations", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const createSchema = z.object({
      title: z.string().min(1).max(200).optional(),
      type: z.enum(["assistant", "recipe", "meal_planning"]).optional(),
    });
    
    const validationResult = createSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid input",
        details: validationResult.error.errors 
      });
    }
    
    const { title, type = "assistant" } = validationResult.data;
    const conversationTitle = title || "New Conversation";
    
    const conversation = await storage.user.chat.createConversation(userId, conversationTitle);
    res.json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

/**
 * POST /api/ai/content/conversations/:id/messages
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
    
    const conversation = await storage.user.chat.getConversation(userId, id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    await storage.user.chat.addMessage(userId, id, {
      role: "user",
      content: message,
    });
    
    const messages = await storage.user.chat.getMessages(userId, id);
    
    const completion = await openaiBreaker.execute(async () => {
      return await openai!.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a helpful kitchen and cooking assistant. Help users with recipes, meal planning, ingredient substitutions, cooking techniques, and food-related questions. Be friendly, informative, and provide practical advice.",
          },
          ...messages.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });
    });
    
    const assistantMessage = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    
    const savedMessage = await storage.user.chat.addMessage(userId, id, {
      role: "assistant",
      content: assistantMessage,
    });
    
    res.json({
      message: savedMessage,
      conversationId: id,
    });
  } catch (error) {
    const aiError = handleOpenAIError(error as Error);
    res.status(aiError.statusCode).json(createErrorResponse(aiError));
  }
});

/**
 * GET /api/ai/content/conversations/:id/messages
 * Get messages for a conversation
 */
router.get("/conversations/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id } = req.params;
    
    const conversation = await storage.user.chat.getConversation(userId, id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    const messages = await storage.user.chat.getMessages(userId, id);
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

/**
 * DELETE /api/ai/content/conversations/:id
 * Delete a conversation
 */
router.delete("/conversations/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id } = req.params;
    
    await storage.user.chat.deleteConversation(userId, id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

// ==================== DRAFTING ENDPOINTS ====================

/**
 * GET /api/ai/content/drafts/templates
 * Get available draft templates
 */
router.get("/drafts/templates", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const templates = await storage.platform.ai.getDraftTemplates(category);
    res.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

/**
 * POST /api/ai/content/drafts/templates
 * Create a new draft template
 */
router.post("/drafts/templates", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const schema = z.object({
      name: z.string().min(1),
      category: z.enum(['email', 'document', 'social', 'recipe', 'letter', 'report']),
      templateContent: z.string().min(1),
      tone: z.enum(['formal', 'casual', 'professional', 'friendly', 'persuasive']).optional(),
      language: z.string().length(2).default('en'),
      variables: z.array(z.string()).optional(),
      isPublic: z.boolean().default(false)
    });
    
    const data = schema.parse(req.body);
    const template = await storage.platform.ai.createDraftTemplate({
      ...data,
      createdBy: userId
    });
    res.json(template);
  } catch (error) {
    console.error("Error creating template:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create template" });
  }
});

/**
 * POST /api/ai/content/drafts/generate
 * Generate draft variations based on context
 */
router.post("/drafts/generate", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!checkOpenAIConfiguration(res)) return;
    
    const schema = z.object({
      originalMessage: z.string().min(1),
      contextType: z.enum(['email', 'message', 'comment', 'customer_complaint']).default('email'),
      tones: z.array(z.enum(['formal', 'casual', 'friendly', 'apologetic', 'solution-focused', 'empathetic'])).optional(),
      subject: z.string().optional(),
      approach: z.string().optional()
    });
    
    const { originalMessage, contextType, tones, subject, approach } = schema.parse(req.body);
    
    const selectedTones = tones || (contextType === 'customer_complaint' 
      ? ['apologetic', 'solution-focused', 'empathetic']
      : ['formal', 'casual', 'friendly']);
    
    const drafts = await generateDraftVariations(originalMessage, contextType, selectedTones);
    
    const savedDrafts = await Promise.all(
      drafts.map((draft, index) => storage.platform.ai.createGeneratedDraft(userId, {
        prompt: originalMessage,
        generatedContent: draft.content,
        contentType: 'text',
        metadata: {
          model: 'gpt-4o-mini',
          temperature: 0.8,
          subject: subject || 'General response',
          approach: approach || (index === 0 ? 'Direct' : index === 1 ? 'Detailed' : 'Concise'),
          variationNumber: index + 1,
          contextType,
          tone: draft.tone
        }
      }))
    );
    
    res.json(savedDrafts);
  } catch (error) {
    console.error("Error generating drafts:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to generate drafts" });
  }
});

/**
 * POST /api/ai/content/drafts/quick-reply
 * Generate quick contextual replies
 */
router.post("/drafts/quick-reply", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!checkOpenAIConfiguration(res)) return;
    
    const { message, sentiment: msgSentiment } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    
    const completion = await openai!.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Generate 3 quick reply options for the given message. 
          Consider the sentiment: ${msgSentiment || "neutral"}.
          Return JSON: { "replies": ["reply1", "reply2", "reply3"] }`
        },
        {
          role: "user",
          content: `Message to reply to: "${message}"`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 200
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '{"replies":[]}');
    
    res.json(result.replies || []);
  } catch (error) {
    console.error("Error generating quick replies:", error);
    res.status(500).json({ error: "Failed to generate quick replies" });
  }
});

/**
 * POST /api/ai/content/drafts/improve
 * Improve/polish an existing draft
 */
router.post("/drafts/improve", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    if (!checkOpenAIConfiguration(res)) return;
    
    const { draft, improvements } = req.body;
    
    if (!draft) {
      return res.status(400).json({ error: "Draft is required" });
    }
    
    const improvementsList = improvements || ["clarity", "conciseness", "tone"];
    
    const completion = await openai!.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Improve the following draft focusing on: ${improvementsList.join(", ")}.
          Return JSON: { 
            "improved": "improved text",
            "changes": ["change1", "change2"],
            "suggestions": ["suggestion1", "suggestion2"]
          }`
        },
        {
          role: "user",
          content: draft
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    res.json(result);
  } catch (error) {
    console.error("Error improving draft:", error);
    res.status(500).json({ error: "Failed to improve draft" });
  }
});

/**
 * POST /api/ai/content/drafts/feedback
 * Track if draft was used/edited
 */
router.post("/drafts/feedback", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const schema = z.object({
      draftId: z.string(),
      selected: z.boolean(),
      edited: z.boolean().optional(),
      editedContent: z.string().optional(),
      rating: z.number().min(1).max(5).optional()
    });
    
    const { draftId, selected, edited, editedContent, rating } = schema.parse(req.body);
    
    const updates: Record<string, any> = {};
    
    if (edited && editedContent) {
      updates.editedContent = editedContent;
    }
    
    if (rating) {
      updates.rating = rating;
    }
    
    if (Object.keys(updates).length > 0) {
      await storage.platform.ai.updateGeneratedDraft(userId, draftId, updates);
    }
    
    res.json({ success: true, selected, edited: !!edited });
  } catch (error) {
    console.error("Error submitting draft feedback:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to submit draft feedback" });
  }
});

/**
 * GET /api/ai/content/drafts/history
 * Get user's draft history
 */
router.get("/drafts/history", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const templateId = req.query.templateId as string | undefined;
    const history = await storage.platform.ai.getGeneratedDrafts(userId, templateId);
    res.json(history);
  } catch (error) {
    console.error("Error fetching draft history:", error);
    res.status(500).json({ error: "Failed to fetch draft history" });
  }
});

/**
 * GET /api/ai/content/drafts/:id
 * Get a specific draft by ID
 */
router.get("/drafts/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id } = req.params;
    const draft = await storage.platform.ai.getGeneratedDraft(userId, id);
    
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }
    
    res.json(draft);
  } catch (error) {
    console.error("Error fetching draft:", error);
    res.status(500).json({ error: "Failed to fetch draft" });
  }
});

/**
 * DELETE /api/ai/content/drafts/:id
 * Delete a specific draft
 */
router.delete("/drafts/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id } = req.params;
    await storage.platform.ai.deleteGeneratedDraft(userId, id);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting draft:", error);
    res.status(500).json({ error: "Failed to delete draft" });
  }
});

// ==================== EXCERPT ENDPOINTS ====================

/**
 * POST /api/ai/content/excerpts/generate
 * Generate multiple excerpt variants for A/B testing
 */
router.post("/excerpts/generate", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const validatedData = generateExcerptSchema.parse(req.body);
    
    const generatedExcerpts = await excerptService.generateExcerpts({
      content: validatedData.content,
      targetPlatform: validatedData.targetPlatform,
      excerptType: validatedData.excerptType,
      tone: validatedData.tone,
      style: validatedData.style,
      targetAudience: validatedData.targetAudience,
      callToAction: validatedData.callToAction,
      hashtags: validatedData.hashtags,
      emojis: validatedData.emojis,
      maxCharacters: validatedData.maxCharacters,
      temperature: validatedData.temperature,
      variantCount: validatedData.variantCount,
    });

    const savedExcerpts = [];
    for (const generated of generatedExcerpts) {
      const excerpt = await storage.platform.ai.createExcerpt(userId, {
        contentId: validatedData.contentId,
        originalContent: validatedData.content,
        excerptText: generated.text,
        excerptType: validatedData.excerptType || 'social',
        targetPlatform: validatedData.targetPlatform || 'generic',
        characterCount: generated.characterCount,
        wordCount: generated.wordCount,
        variant: generated.variant,
        generationParams: generated.generationParams,
        socialMetadata: generated.metadata,
        isActive: generated.variant === 'A',
      });
      savedExcerpts.push(excerpt);
    }

    res.json({ 
      success: true, 
      excerpts: savedExcerpts,
      message: `Generated ${savedExcerpts.length} excerpt variants` 
    });
  } catch (error) {
    console.error('Error generating excerpts:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to generate excerpts' });
  }
});

/**
 * GET /api/ai/content/excerpts/test
 * Get A/B test variants for a content
 */
router.get("/excerpts/test", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { contentId } = req.query;
    if (!contentId || typeof contentId !== 'string') {
      return res.status(400).json({ error: 'Content ID is required' });
    }

    const excerpts = await storage.platform.ai.getExcerptsByContent(userId, contentId);
    
    if (excerpts.length === 0) {
      return res.status(404).json({ error: 'No excerpts found for this content' });
    }

    const variants = excerpts.map(excerpt => ({
      id: excerpt.id,
      variant: excerpt.variant,
      text: excerpt.excerptText,
      characterCount: excerpt.characterCount,
      wordCount: excerpt.wordCount,
      ctr: excerpt.clickThroughRate,
      isActive: excerpt.isActive,
      platform: excerpt.targetPlatform,
      type: excerpt.excerptType,
    }));

    res.json({ 
      success: true, 
      variants,
      activeVariant: variants.find(v => v.isActive),
    });
  } catch (error) {
    console.error('Error getting test variants:', error);
    res.status(500).json({ error: 'Failed to get test variants' });
  }
});

/**
 * GET /api/ai/content/excerpts/performance
 * Get performance metrics for excerpts
 */
router.get("/excerpts/performance", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { excerptId, startDate, endDate } = req.query;
    
    if (!excerptId || typeof excerptId !== 'string') {
      return res.status(400).json({ error: 'Excerpt ID is required' });
    }

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const performance = await storage.platform.ai.getExcerptPerformance(excerptId, start, end);

    const totals = performance.reduce((acc, perf) => ({
      views: acc.views + perf.views,
      clicks: acc.clicks + perf.clicks,
      shares: acc.shares + (perf.shares || 0),
      engagements: acc.engagements + (perf.engagements || 0),
      conversions: acc.conversions + (perf.conversions || 0),
      bounces: acc.bounces + (perf.bounces || 0),
    }), {
      views: 0,
      clicks: 0,
      shares: 0,
      engagements: 0,
      conversions: 0,
      bounces: 0,
    });

    const aggregateMetrics = {
      totalViews: totals.views,
      totalClicks: totals.clicks,
      totalShares: totals.shares,
      totalEngagements: totals.engagements,
      totalConversions: totals.conversions,
      totalBounces: totals.bounces,
      averageCTR: totals.views > 0 ? totals.clicks / totals.views : 0,
      averageShareRate: totals.views > 0 ? totals.shares / totals.views : 0,
      averageEngagementRate: totals.views > 0 ? totals.engagements / totals.views : 0,
      conversionRate: totals.views > 0 ? totals.conversions / totals.views : 0,
      bounceRate: totals.views > 0 ? totals.bounces / totals.views : 0,
    };

    res.json({ 
      success: true, 
      daily: performance,
      aggregate: aggregateMetrics,
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

/**
 * PUT /api/ai/content/excerpts/optimize
 * Optimize excerpt based on performance
 */
router.put("/excerpts/optimize", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const validatedData = optimizeExcerptSchema.parse(req.body);

    const excerpts = await storage.platform.ai.getExcerptsByContent(userId, validatedData.excerptId);
    const excerpt = excerpts.find(e => e.id === validatedData.excerptId);
    
    if (!excerpt) {
      return res.status(404).json({ error: 'Excerpt not found' });
    }

    const performance = await storage.platform.ai.getExcerptPerformance(validatedData.excerptId);
    if (performance.length === 0) {
      return res.status(400).json({ error: 'No performance data available for optimization' });
    }

    const totals = performance.reduce((acc, perf) => ({
      views: acc.views + perf.views,
      clicks: acc.clicks + perf.clicks,
      shares: acc.shares + (perf.shares || 0),
      engagements: acc.engagements + (perf.engagements || 0),
    }), { views: 0, clicks: 0, shares: 0, engagements: 0 });

    const performanceData = {
      ctr: totals.views > 0 ? totals.clicks / totals.views : 0,
      shareRate: totals.views > 0 ? totals.shares / totals.views : 0,
      engagementRate: totals.views > 0 ? totals.engagements / totals.views : 0,
    };

    const optimized = await excerptService.optimizeExcerpt(
      excerpt.excerptText,
      performanceData,
      validatedData.targetCTR || 0.2
    );

    const optimizedExcerpt = await storage.platform.ai.createExcerpt(userId, {
      contentId: excerpt.contentId,
      originalContent: excerpt.originalContent || '',
      excerptText: optimized.text,
      excerptType: excerpt.excerptType,
      targetPlatform: excerpt.targetPlatform || 'generic',
      characterCount: optimized.characterCount,
      wordCount: optimized.wordCount,
      variant: optimized.variant,
      generationParams: optimized.generationParams,
      socialMetadata: optimized.metadata,
      isActive: false,
    });

    res.json({ 
      success: true, 
      original: excerpt,
      optimized: optimizedExcerpt,
      performanceData,
      message: 'Excerpt optimized based on performance data',
    });
  } catch (error) {
    console.error('Error optimizing excerpt:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to optimize excerpt' });
  }
});

/**
 * GET /api/ai/content/excerpts/:contentId
 * Get all excerpts for a content
 */
router.get("/excerpts/:contentId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { contentId } = req.params;
    const excerpts = await storage.platform.ai.getExcerptsByContent(userId, contentId);

    res.json({ 
      success: true, 
      excerpts,
      count: excerpts.length,
    });
  } catch (error) {
    console.error('Error getting excerpts:', error);
    res.status(500).json({ error: 'Failed to get excerpts' });
  }
});

/**
 * PUT /api/ai/content/excerpts/:excerptId/activate
 * Set an excerpt as active
 */
router.put("/excerpts/:excerptId/activate", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { excerptId } = req.params;
    const { contentId } = req.body;

    if (!contentId) {
      return res.status(400).json({ error: 'Content ID is required' });
    }

    await storage.platform.ai.setActiveExcerpt(userId, contentId, excerptId);

    res.json({ 
      success: true, 
      message: 'Excerpt activated successfully',
    });
  } catch (error) {
    console.error('Error activating excerpt:', error);
    res.status(500).json({ error: 'Failed to activate excerpt' });
  }
});

/**
 * DELETE /api/ai/content/excerpts/:excerptId
 * Delete an excerpt
 */
router.delete("/excerpts/:excerptId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { excerptId } = req.params;
    await storage.platform.ai.deleteExcerpt(userId, excerptId);

    res.json({ 
      success: true, 
      message: 'Excerpt deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting excerpt:', error);
    res.status(500).json({ error: 'Failed to delete excerpt' });
  }
});

/**
 * POST /api/ai/content/excerpts/:excerptId/track
 * Track a performance event for an excerpt
 */
router.post("/excerpts/:excerptId/track", async (req: Request, res: Response) => {
  try {
    const { excerptId } = req.params;
    const validatedData = trackPerformanceSchema.parse(req.body);

    const performance = await storage.platform.ai.recordExcerptPerformance({
      excerptId,
      views: validatedData.views || 0,
      clicks: validatedData.clicks || 0,
      shares: validatedData.shares,
      engagements: validatedData.engagements,
      conversions: validatedData.conversions,
      bounces: validatedData.bounces,
      timeOnPage: validatedData.timeOnPage,
      platformMetrics: validatedData.platformMetrics,
      date: new Date().toISOString().split('T')[0],
    });

    res.json({ 
      success: true, 
      performance,
      message: 'Performance tracked successfully',
    });
  } catch (error) {
    console.error('Error tracking performance:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to track performance' });
  }
});

// ==================== WRITING SESSIONS ENDPOINTS ====================

/**
 * GET /api/ai/content/writing/sessions
 * List user's writing sessions
 */
router.get("/writing/sessions", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const limit = parseInt(req.query.limit as string) || 20;
    const sessions = await storage.platform.ai.getWritingSessions(userId, limit);
    
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

/**
 * GET /api/ai/content/writing/sessions/:id
 * Get a specific writing session
 */
router.get("/writing/sessions/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id } = req.params;
    
    const session = await storage.platform.ai.getWritingSession(userId, id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    const suggestions = await storage.platform.ai.getWritingSuggestions(id);
    
    res.json({ ...session, suggestions });
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

/**
 * GET /api/ai/content/writing/stats
 * Get user's writing statistics
 */
router.get("/writing/stats", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const stats = await storage.platform.ai.getWritingStats(userId);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching writing stats:", error);
    res.status(500).json({ error: "Failed to fetch writing stats" });
  }
});

/**
 * POST /api/ai/content/writing/check-plagiarism
 * Check for potential plagiarism (basic implementation)
 */
router.post("/writing/check-plagiarism", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    if (!checkOpenAIConfiguration(res)) return;
    
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    
    const completion = await openai!.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze if this text contains common phrases or appears to be original.
          Return JSON: { 
            "originalityScore": 0-100,
            "flaggedPhrases": ["phrase1", "phrase2"],
            "recommendation": "text recommendation"
          }`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    res.json(result);
  } catch (error) {
    console.error("Error checking plagiarism:", error);
    res.status(500).json({ error: "Failed to check plagiarism" });
  }
});

export default router;
