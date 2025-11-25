/**
 * Writing Assistant Router
 * 
 * Comprehensive writing assistance with grammar checking,
 * style suggestions, and tone adjustment.
 * 
 * Base path: /api/v1/ai/writing
 * 
 * @module server/routers/ai/writing.router
 */

import { Router, Request, Response } from "express";
import { isAuthenticated } from "../../middleware";
import { storage } from "../../storage/index";
import { z } from "zod";
import { getOpenAIClient } from "../../config/openai-config";

const router = Router();

const openai = getOpenAIClient();

/**
 * POST /analyze
 * Analyze text for grammar, style, and tone
 */
router.post("/analyze", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const schema = z.object({
      text: z.string().min(1),
      type: z.enum(['email', 'blog', 'academic', 'casual', 'business']).optional(),
      targetTone: z.enum(['formal', 'casual', 'friendly', 'professional', 'persuasive']).optional(),
      checkFor: z.array(z.enum(['grammar', 'style', 'tone', 'clarity', 'conciseness'])).optional()
    });
    
    const { text, type, targetTone, checkFor } = schema.parse(req.body);
    
    const session = await storage.platform.ai.createWritingSession(userId, {
      sessionType: 'review',
      startContent: text
    });
    
    const analysis = await analyzeText(text, type, targetTone, checkFor);
    
    if (analysis.suggestions.length > 0) {
      await storage.platform.ai.addWritingSuggestions(
        session.id, 
        analysis.suggestions.map(s => ({
          suggestionType: s.suggestionType as 'grammar' | 'style' | 'clarity' | 'tone' | 'vocabulary',
          originalText: s.originalSnippet,
          suggestedText: s.suggestedSnippet,
          reason: s.reason
        }))
      );
    }
    
    res.json({
      sessionId: session.id,
      analysis
    });
  } catch (error) {
    console.error("Error analyzing text:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to analyze text" });
  }
});

/**
 * Helper function to analyze text
 */
async function analyzeText(
  text: string,
  type?: string,
  targetTone?: string,
  checkFor?: string[]
): Promise<{
  overallScore: number;
  suggestions: Array<{
    suggestionType: string;
    originalSnippet: string;
    suggestedSnippet: string;
    reason?: string;
  }>;
  metrics: {
    readability: number;
    clarity: number;
    tone: string;
    wordCount: number;
    sentenceCount: number;
  };
}> {
  if (!openai) {
    throw new Error("OpenAI client not configured");
  }

  const checksToPerform = checkFor || ['grammar', 'style', 'tone', 'clarity'];
  
  const systemPrompt = `You are an expert writing assistant. Analyze the following text for:
    ${checksToPerform.join(", ")}
    
    Text type: ${type || "general"}
    ${targetTone ? `Target tone: ${targetTone}` : ""}
    
    Provide detailed analysis in JSON format:
    {
      "overallScore": 0-100,
      "suggestions": [
        {
          "suggestionType": "grammar|style|tone|clarity|vocabulary",
          "originalSnippet": "exact text with issue",
          "suggestedSnippet": "corrected text",
          "reason": "why this change improves the text"
        }
      ],
      "metrics": {
        "readability": 0-100,
        "clarity": 0-100,
        "tone": "current tone",
        "wordCount": number,
        "sentenceCount": number
      }
    }`;
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text }
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000
  });
  
  const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
  
  return {
    overallScore: result.overallScore || 0,
    suggestions: result.suggestions || [],
    metrics: result.metrics || {
      readability: 0,
      clarity: 0,
      tone: "neutral",
      wordCount: text.split(/\s+/).length,
      sentenceCount: text.split(/[.!?]+/).filter((s: string) => s.trim()).length
    }
  };
}

/**
 * POST /improve
 * Apply improvements to text
 */
router.post("/improve", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { sessionId, suggestionIds } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }
    
    const session = await storage.platform.ai.getWritingSession(userId, sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    let improvedText = session.endContent || session.startContent || '';
    
    if (suggestionIds && suggestionIds.length > 0 && openai) {
      const suggestions = await storage.platform.ai.getWritingSuggestions(sessionId);
      const acceptedSuggestions = suggestions.filter(s => suggestionIds.includes(s.id));
      
      for (const suggestion of acceptedSuggestions) {
        await storage.platform.ai.updateWritingSuggestion(suggestion.id, { isAccepted: true });
      }
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Apply the accepted improvements to the text while maintaining its original meaning."
          },
          {
            role: "user",
            content: `Original: ${session.startContent}\n\nApply improvements based on accepted suggestions:\n${acceptedSuggestions.map(s => `- Change "${s.originalText}" to "${s.suggestedText}"`).join('\n')}`
          }
        ],
        max_tokens: 2000
      });
      
      improvedText = completion.choices[0]?.message?.content || session.startContent || '';
    }
    
    const updatedSession = await storage.platform.ai.updateWritingSession(
      userId, 
      sessionId,
      {
        endContent: improvedText,
        suggestionsAccepted: (session.suggestionsAccepted || 0) + (suggestionIds?.length || 0)
      }
    );
    
    res.json(updatedSession);
  } catch (error) {
    console.error("Error improving text:", error);
    res.status(500).json({ error: "Failed to improve text" });
  }
});

/**
 * POST /adjust-tone
 * Adjust the tone of text
 */
router.post("/adjust-tone", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: "AI service not available" });
    }
    
    const { text, currentTone, targetTone } = req.body;
    
    if (!text || !targetTone) {
      return res.status(400).json({ error: "Text and target tone are required" });
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Adjust the tone of the following text from ${currentTone || "current"} to ${targetTone}.
          Maintain the core message and information while changing the tone.
          Return JSON: { "adjustedText": "...", "changes": ["change1", "change2"] }`
        },
        {
          role: "user",
          content: text
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    res.json(result);
  } catch (error) {
    console.error("Error adjusting tone:", error);
    res.status(500).json({ error: "Failed to adjust tone" });
  }
});

/**
 * POST /paraphrase
 * Paraphrase text while maintaining meaning
 */
router.post("/paraphrase", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: "AI service not available" });
    }
    
    const { text, style } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    
    const completion = await openai.chat.completions.create({
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
    res.json(result.variations || []);
  } catch (error) {
    console.error("Error paraphrasing text:", error);
    res.status(500).json({ error: "Failed to paraphrase text" });
  }
});

/**
 * GET /stats
 * Get user's writing statistics
 */
router.get("/stats", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const stats = await storage.platform.ai.getWritingStats(userId);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching writing stats:", error);
    res.status(500).json({ error: "Failed to fetch writing stats" });
  }
});

/**
 * POST /check-plagiarism
 * Check for potential plagiarism (basic implementation)
 */
router.post("/check-plagiarism", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: "AI service not available" });
    }
    
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    
    const completion = await openai.chat.completions.create({
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

/**
 * GET /sessions/:id
 * Get a specific writing session
 */
router.get("/sessions/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
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
 * GET /sessions
 * List user's writing sessions
 */
router.get("/sessions", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const limit = parseInt(req.query.limit as string) || 20;
    const sessions = await storage.platform.ai.getWritingSessions(userId, limit);
    
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

export default router;
