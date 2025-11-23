/**
 * Writing Assistant Router
 * 
 * Comprehensive writing improvement API with grammar checking,
 * style suggestions, tone adjustment, and content improvements.
 * 
 * Features:
 * - Grammar and spelling checking
 * - Style and clarity improvements
 * - Tone adjustment (formal ↔ casual)
 * - Content expansion and summarization
 * - Readability scoring
 */

import { Router, Request, Response } from "express";
import { isAuthenticated } from "../middleware/oauth.middleware";
import { storage } from "../storage/index";
import { z } from "zod";
import OpenAI from "openai";
// Natural language processing tools
// Using simple word tokenization without the natural library
import { syllable } from "syllable";
import Sentiment from "sentiment";
import rs from "text-readability";
import { insertWritingSessionSchema, insertWritingSuggestionSchema } from "@shared/schema";
import type { WritingSession, WritingSuggestion } from "@shared/schema";

const router = Router();

// Initialize OpenAI with Replit AI Integrations
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// Initialize NLP tools
const sentiment = new Sentiment();

// Simple word tokenizer function
function tokenizeWords(text: string): string[] {
  return text.split(/\s+/).filter(word => word.length > 0);
}

// Validation schemas
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
});

// Helper Functions

/**
 * Calculate readability score using Flesch Reading Ease
 */
function calculateReadability(text: string): number {
  try {
    const score = rs.fleschReadingEase(text);
    return Math.max(0, Math.min(100, score));
  } catch {
    return 50; // Default middle score on error
  }
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  const words = tokenizeWords(text);
  return words.length;
}

/**
 * Detect tone of text
 */
function detectTone(text: string): string {
  const sentimentResult = sentiment.analyze(text);
  const avgWordLength = text.length / countWords(text);
  const complexWords = text.split(/\s+/).filter(word => syllable(word) >= 3).length;
  const complexityRatio = complexWords / countWords(text);
  
  if (complexityRatio > 0.3 && avgWordLength > 5) {
    return "academic";
  } else if (complexityRatio > 0.2) {
    return "professional";
  } else if (sentimentResult.score > 2) {
    return "friendly";
  } else if (sentimentResult.score < -2) {
    return "formal";
  } else {
    return "casual";
  }
}

/**
 * Basic grammar and spelling checking
 */
function checkGrammarAndSpelling(text: string): WritingSuggestion[] {
  const suggestions: WritingSuggestion[] = [];
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  
  // Common grammar patterns to check
  const grammarPatterns = [
    {
      pattern: /\bi\b/g,
      replacement: "I",
      type: "grammar",
      category: "capitalization",
      reason: "The pronoun 'I' should always be capitalized",
    },
    {
      pattern: /\b(definately|definatly|definetly)\b/gi,
      replacement: "definitely",
      type: "spelling",
      category: "common_misspelling",
      reason: "Common misspelling of 'definitely'",
    },
    {
      pattern: /\b(procceed|procede)\b/gi,
      replacement: "proceed",
      type: "spelling",
      category: "common_misspelling",
      reason: "Correct spelling is 'proceed'",
    },
    {
      pattern: /\b(recieve)\b/gi,
      replacement: "receive",
      type: "spelling",
      category: "common_misspelling",
      reason: "Correct spelling is 'receive' (i before e except after c)",
    },
    {
      pattern: /\b(occured|ocurred)\b/gi,
      replacement: "occurred",
      type: "spelling",
      category: "common_misspelling",
      reason: "Correct spelling is 'occurred' with double 'r'",
    },
    {
      pattern: /\b(seperate)\b/gi,
      replacement: "separate",
      type: "spelling",
      category: "common_misspelling",
      reason: "Correct spelling is 'separate'",
    },
    {
      pattern: /\b(alot)\b/gi,
      replacement: "a lot",
      type: "grammar",
      category: "spacing",
      reason: "'A lot' should be written as two words",
    },
    {
      pattern: /\b(could of|would of|should of)\b/gi,
      replacement: (match: string) => match.replace(" of", " have"),
      type: "grammar",
      category: "verb_form",
      reason: "Use 'have' instead of 'of' after modal verbs",
    },
    {
      pattern: /\b(your)\s+(going|coming|leaving)\b/gi,
      replacement: "you're $2",
      type: "grammar",
      category: "contraction",
      reason: "Use 'you're' (you are) instead of 'your' (possessive)",
    },
    {
      pattern: /\b(there)\s+(going|coming|leaving)\b/gi,
      replacement: "they're $2",
      type: "grammar",
      category: "contraction",
      reason: "Use 'they're' (they are) instead of 'there' (location)",
    },
  ];
  
  // Apply grammar patterns
  grammarPatterns.forEach(({ pattern, replacement, type, category, reason }) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const originalSnippet = match[0];
      const suggestedSnippet = typeof replacement === 'string' 
        ? replacement 
        : replacement(originalSnippet);
      
      suggestions.push({
        id: '',
        sessionId: '',
        suggestionType: type,
        originalSnippet,
        suggestedSnippet,
        reason,
        accepted: false,
        createdAt: new Date(),
      });
    }
  });
  
  return suggestions;
}

// API Routes

/**
 * POST /api/writing/analyze
 * Comprehensive text analysis with all improvements
 */
router.post("/analyze", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
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
    
    const suggestions: Omit<WritingSuggestion, "id" | "sessionId" | "createdAt">[] = [];
    
    // Grammar and spelling checking
    if (checkGrammar || checkSpelling) {
      const basicSuggestions = checkGrammarAndSpelling(text);
      suggestions.push(...basicSuggestions);
    }
    
    // AI-powered style and tone suggestions
    if (checkStyle || suggestTone) {
      try {
        const prompt = `Analyze this text for writing improvements:

Text: "${text}"

Provide specific suggestions for:
${checkStyle ? "- Style and clarity improvements" : ""}
${suggestTone && targetTone ? `- Adjusting tone to be more ${targetTone}` : ""}
${checkStyle ? "- Removing passive voice where appropriate" : ""}
${checkStyle ? "- Improving word choice and conciseness" : ""}

For each suggestion, provide:
1. The original text snippet (exact quote, 5-15 words)
2. The suggested replacement
3. The reason for the change
4. The type (style, tone, clarity, conciseness)

Format as JSON array:
[{
  "original": "exact snippet from text",
  "suggested": "improved version",
  "reason": "explanation",
  "type": "style|tone|clarity|conciseness",
  "severity": "suggestion|warning"
}]

Only return valid JSON array, no other text.`;

        const completion = await openai.chat.completions.create({
          model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
          messages: [{ role: "user", content: prompt }],
          max_completion_tokens: 2000,
          response_format: { type: "json_object" },
        });
        
        const aiResponse = completion.choices[0]?.message?.content;
        if (aiResponse) {
          try {
            const aiSuggestions = JSON.parse(aiResponse);
            const suggestionArray = Array.isArray(aiSuggestions) ? aiSuggestions : aiSuggestions.suggestions || [];
            
            suggestionArray.forEach((suggestion: any) => {
              // Find position of the original snippet in the text
              const position = text.indexOf(suggestion.original);
              if (position >= 0) {
                suggestions.push({
                  suggestionType: suggestion.type || "style",
                  originalSnippet: suggestion.original,
                  suggestedSnippet: suggestion.suggested,
                  reason: suggestion.reason,
                  category: suggestion.type,
                  severity: suggestion.severity || "suggestion",
                  position,
                  length: suggestion.original.length,
                  confidence: 0.8,
                  accepted: false,
                });
              }
            });
          } catch (parseError) {
            console.error("Error parsing AI suggestions:", parseError);
          }
        }
      } catch (aiError) {
        console.error("Error getting AI suggestions:", aiError);
      }
    }
    
    // Save suggestions to database
    if (suggestions.length > 0) {
      await storage.platform.ai.addWritingSuggestions(session.id, suggestions);
    }
    
    res.json({
      sessionId: session.id,
      originalText: text,
      metrics: {
        wordCount,
        readabilityScore,
        tone: detectedTone,
        targetTone: targetTone || detectedTone,
      },
      suggestions: suggestions.map((s, idx) => ({
        ...s,
        id: `suggestion-${idx}`,
        sessionId: session.id,
      })),
    });
  } catch (error) {
    console.error("Error analyzing text:", error);
    res.status(500).json({ error: "Failed to analyze text" });
  }
});

/**
 * POST /api/writing/grammar
 * Check grammar and spelling only
 */
router.post("/grammar", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    
    const suggestions = checkGrammarAndSpelling(text);
    
    res.json({
      suggestions: suggestions.map((s, idx) => ({
        ...s,
        id: `grammar-${idx}`,
      })),
    });
  } catch (error) {
    console.error("Error checking grammar:", error);
    res.status(500).json({ error: "Failed to check grammar" });
  }
});

/**
 * POST /api/writing/tone
 * Adjust tone of text
 */
router.post("/tone", isAuthenticated, async (req: Request, res: Response) => {
  try {
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

    const completion = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 2000,
    });
    
    const adjustedText = completion.choices[0]?.message?.content || text;
    
    res.json({
      originalText: text,
      adjustedText,
      targetTone,
    });
  } catch (error) {
    console.error("Error adjusting tone:", error);
    res.status(500).json({ error: "Failed to adjust tone" });
  }
});

/**
 * POST /api/writing/expand
 * Expand bullet points or brief text into paragraphs
 */
router.post("/expand", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validation = expandTextSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { text, targetLength } = validation.data;
    
    const lengthGuides = {
      short: "1-2 sentences",
      medium: "3-5 sentences",
      long: "2-3 paragraphs",
    };
    
    const prompt = `Expand this text/bullet points into ${lengthGuides[targetLength]}:

"${text}"

Create well-written, coherent prose that fully develops the ideas presented. Maintain a professional tone unless the original suggests otherwise.

Return only the expanded text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 3000,
    });
    
    const expandedText = completion.choices[0]?.message?.content || text;
    
    res.json({
      originalText: text,
      expandedText,
      targetLength,
      wordCount: countWords(expandedText),
    });
  } catch (error) {
    console.error("Error expanding text:", error);
    res.status(500).json({ error: "Failed to expand text" });
  }
});

/**
 * POST /api/writing/summarize
 * Create summary of long text
 */
router.post("/summarize", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validation = summarizeTextSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { text, length } = validation.data;
    
    const lengthGuides = {
      brief: "1-2 sentences capturing the main point",
      moderate: "3-5 sentences with key details",
      detailed: "A comprehensive paragraph covering all main points",
    };
    
    const prompt = `Summarize this text in ${lengthGuides[length]}:

"${text}"

Focus on the most important information and maintain clarity.

Return only the summary.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 1000,
    });
    
    const summary = completion.choices[0]?.message?.content || "";
    
    res.json({
      originalText: text,
      summary,
      length,
      originalWordCount: countWords(text),
      summaryWordCount: countWords(summary),
      compressionRatio: Math.round((countWords(summary) / countWords(text)) * 100),
    });
  } catch (error) {
    console.error("Error summarizing text:", error);
    res.status(500).json({ error: "Failed to summarize text" });
  }
});

/**
 * POST /api/writing/session/:sessionId/accept
 * Accept suggestions and update session
 */
router.post("/session/:sessionId/accept", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { sessionId } = req.params;
    const { suggestionIds, improvedText } = req.body;
    
    if (!Array.isArray(suggestionIds) || !improvedText) {
      return res.status(400).json({ error: "Invalid request body" });
    }
    
    // Update session with improved text
    const updatedSession = await storage.platform.ai.updateWritingSession(
      userId,
      sessionId,
      improvedText,
      suggestionIds
    );
    
    res.json({
      session: updatedSession,
      acceptedSuggestions: suggestionIds.length,
    });
  } catch (error) {
    console.error("Error accepting suggestions:", error);
    res.status(500).json({ error: "Failed to accept suggestions" });
  }
});

/**
 * GET /api/writing/stats
 * Get user's writing statistics
 */
router.get("/stats", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const stats = await storage.platform.ai.getWritingStats(userId);
    
    res.json(stats);
  } catch (error) {
    console.error("Error getting writing stats:", error);
    res.status(500).json({ error: "Failed to get writing stats" });
  }
});

export default router;