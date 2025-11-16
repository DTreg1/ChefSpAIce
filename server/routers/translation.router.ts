/**
 * Translation Router
 * 
 * API endpoints for real-time content translation using OpenAI GPT.
 * Supports context-aware translation, language detection, and preferences.
 */

import { Router } from "express";
import { storage } from "../storage";
import { isAuthenticated } from "../middleware/auth.middleware";
import { z } from "zod";
import OpenAI from "openai";
import { db } from "../db";
import { translations } from "@shared/schema";

const router = Router();

// Initialize OpenAI with Replit AI Integration (referenced from blueprint:javascript_openai_ai_integrations)
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// Input validation schemas
const translateRequestSchema = z.object({
  content: z.string().min(1, "Content is required"),
  contentId: z.string().optional(),
  targetLanguages: z.array(z.string()).optional(),
  contentType: z.enum(['post', 'recipe', 'message', 'general']).default('general'),
  context: z.string().optional(),
  preserveFormatting: z.boolean().default(true)
});

const detectLanguageSchema = z.object({
  text: z.string().min(1, "Text is required")
});

const verifyTranslationSchema = z.object({
  translationId: z.string()
});

const languagePreferencesSchema = z.object({
  preferredLanguages: z.array(z.string()).min(1),
  autoTranslate: z.boolean().default(true),
  nativeLanguage: z.string().default('en'),
  showOriginalText: z.boolean().default(false),
  translationQuality: z.enum(['fast', 'balanced', 'high']).default('balanced'),
  excludedContentTypes: z.array(z.string()).optional()
});

/**
 * Translate text using OpenAI GPT with context awareness
 */
async function performTranslation(
  text: string,
  targetLanguage: string,
  contentType: string,
  context?: string,
  preserveFormatting?: boolean
): Promise<string> {
  const languageNames: Record<string, string> = {
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese (Simplified)',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'pl': 'Polish'
  };

  const targetLanguageName = languageNames[targetLanguage] || targetLanguage;
  
  // Build context-aware prompt
  let systemPrompt = `You are a professional translator. Translate the following content to ${targetLanguageName}.
Maintain the original meaning and tone while making it natural in the target language.`;

  if (contentType === 'recipe') {
    systemPrompt += `\nThis is a recipe, so preserve cooking terms and measurements appropriately for the target culture.`;
  } else if (contentType === 'post') {
    systemPrompt += `\nThis is a social media post or article. Maintain the author's voice and style.`;
  }

  if (preserveFormatting) {
    systemPrompt += `\nPreserve all formatting including line breaks, bold, italics, links, and lists.`;
  }

  if (context) {
    systemPrompt += `\nAdditional context: ${context}`;
  }

  systemPrompt += `\nProvide ONLY the translation, no explanations or notes.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ],
      max_completion_tokens: 8192,
      temperature: 0.3 // Lower temperature for more consistent translations
    });

    return response.choices[0]?.message?.content || text;
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("Failed to translate content");
  }
}

/**
 * Detect language using OpenAI
 */
async function detectLanguageAI(text: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        { 
          role: "system", 
          content: "Detect the language of the provided text. Return ONLY the ISO 639-1 language code (e.g., 'en' for English, 'es' for Spanish, 'fr' for French). No explanations." 
        },
        { role: "user", content: text }
      ],
      max_completion_tokens: 10,
      temperature: 0
    });

    const detectedCode = response.choices[0]?.message?.content?.trim().toLowerCase();
    return detectedCode || 'en';
  } catch (error) {
    console.error("Language detection error:", error);
    // Fallback to simple detection
    return await storage.detectLanguage(text);
  }
}

/**
 * POST /api/translate
 * Translate content into target languages
 */
router.post("/translate", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session?.passport?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate request
    const validatedData = translateRequestSchema.parse(req.body);
    const { content, contentId, targetLanguages, contentType, context, preserveFormatting } = validatedData;

    // Generate contentId if not provided
    const actualContentId = contentId || `content_${Date.now()}`;

    // Determine target languages
    let languagesToTranslate = targetLanguages;
    if (!languagesToTranslate || languagesToTranslate.length === 0) {
      // Get user's preferred languages
      const prefs = await storage.getLanguagePreferences(userId);
      languagesToTranslate = prefs?.preferredLanguages || ['es', 'fr', 'de'];
    }

    // Detect source language
    const sourceLanguage = await detectLanguageAI(content);

    // Perform translations in parallel
    const translationPromises: Promise<any>[] = languagesToTranslate
      .filter(lang => lang !== sourceLanguage) // Don't translate to same language
      .map(async (targetLang): Promise<any> => {
        try {
          // Check if translation already exists
          const existing = await storage.getTranslation(actualContentId, targetLang);
          if (existing && !existing.isVerified) {
            return existing;
          }

          // Perform translation
          const translatedText = await performTranslation(
            content,
            targetLang,
            contentType,
            context,
            preserveFormatting
          );

          // Store translation
          const [translationResult] = await db
            .insert(translations)
            .values({
              contentId: actualContentId,
              languageCode: targetLang,
              translatedText,
              originalText: content,
              contentType,
              isVerified: false,
              translationMetadata: {
                model: 'gpt-5',
                sourceLanguage,
                context,
                preservedFormatting: preserveFormatting
              }
            })
            .onConflictDoUpdate({
              target: [translations.contentId, translations.languageCode],
              set: {
                translatedText,
                originalText: content,
                contentType,
                translationMetadata: {
                  model: 'gpt-5',
                  sourceLanguage,
                  context,
                  preservedFormatting: preserveFormatting
                },
                updatedAt: new Date()
              }
            })
            .returning();

          return translationResult;
        } catch (error) {
          console.error(`Failed to translate to ${targetLang}:`, error);
          return null;
        }
      });

    const translationResults = (await Promise.all(translationPromises)).filter((t): t is NonNullable<typeof t> => t !== null);

    res.json({
      contentId: actualContentId,
      sourceLanguage,
      translations: translationResults,
      totalTranslations: translationResults.length
    });
  } catch (error) {
    console.error("Translation error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: error.errors });
    }
    res.status(500).json({ error: "Failed to translate content" });
  }
});

/**
 * GET /api/translate/detect
 * Detect language of text
 */
router.get("/translate/detect", isAuthenticated, async (req, res) => {
  try {
    const { text } = detectLanguageSchema.parse(req.query);
    
    const detectedLanguage = await detectLanguageAI(text);
    const languages = await storage.getSupportedLanguages();
    const languageInfo = languages.find(l => l.code === detectedLanguage);

    res.json({
      code: detectedLanguage,
      name: languageInfo?.name || 'Unknown',
      nativeName: languageInfo?.nativeName || 'Unknown'
    });
  } catch (error) {
    console.error("Language detection error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: error.errors });
    }
    res.status(500).json({ error: "Failed to detect language" });
  }
});

/**
 * GET /api/content/:id/translations
 * Get all translations for content
 */
router.get("/content/:id/translations", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { language } = req.query;

    const translations = await storage.getTranslations(id, language as string | undefined);

    res.json({
      contentId: id,
      translations,
      total: translations.length
    });
  } catch (error) {
    console.error("Error fetching translations:", error);
    res.status(500).json({ error: "Failed to fetch translations" });
  }
});

/**
 * POST /api/translate/verify
 * Mark translation as verified
 */
router.post("/translate/verify", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session?.passport?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { translationId } = verifyTranslationSchema.parse(req.body);
    
    const translation = await storage.verifyTranslation(translationId, userId);
    
    res.json({
      success: true,
      translation
    });
  } catch (error) {
    console.error("Error verifying translation:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: error.errors });
    }
    res.status(500).json({ error: "Failed to verify translation" });
  }
});

/**
 * GET /api/languages/supported
 * Get list of supported languages
 */
router.get("/languages/supported", async (req, res) => {
  try {
    const languages = await storage.getSupportedLanguages();
    res.json(languages);
  } catch (error) {
    console.error("Error fetching languages:", error);
    res.status(500).json({ error: "Failed to fetch supported languages" });
  }
});

/**
 * GET /api/languages/preferences
 * Get user's language preferences
 */
router.get("/languages/preferences", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session?.passport?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const preferences = await storage.getLanguagePreferences(userId);
    
    if (!preferences) {
      // Return default preferences if none exist
      return res.json({
        preferredLanguages: ['en'],
        autoTranslate: true,
        nativeLanguage: 'en',
        showOriginalText: false,
        translationQuality: 'balanced',
        excludedContentTypes: []
      });
    }

    res.json(preferences);
  } catch (error) {
    console.error("Error fetching language preferences:", error);
    res.status(500).json({ error: "Failed to fetch language preferences" });
  }
});

/**
 * POST /api/languages/preferences
 * Update user's language preferences
 */
router.post("/languages/preferences", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session?.passport?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const validatedData = languagePreferencesSchema.parse(req.body);
    
    const preferences = await storage.upsertLanguagePreferences(userId, validatedData);
    
    res.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error("Error updating language preferences:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update language preferences" });
  }
});

/**
 * DELETE /api/translate/:id
 * Delete a translation
 */
router.delete("/translate/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    await storage.deleteTranslation(id);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting translation:", error);
    res.status(500).json({ error: "Failed to delete translation" });
  }
});

export { router as translationRouter };