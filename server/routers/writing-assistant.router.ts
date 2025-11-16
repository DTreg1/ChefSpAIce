/**
 * Writing Assistant Router (Task 10)
 * 
 * Comprehensive writing assistance with grammar checking,
 * style suggestions, and tone adjustment.
 */

import { Router, type Request as ExpressRequest, type Response as ExpressResponse } from "express";
import { isAuthenticated } from "../middleware";
import { storage } from "../storage";
import { z } from "zod";
import { getOpenAIClient } from "../config/openai-config";

const router = Router();

// Initialize OpenAI client
const openai = getOpenAIClient();

/**
 * POST /api/writing/analyze
 * Analyze text for grammar, style, and tone
 */
router.post("/analyze", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const schema = z.object({
      text: z.string().min(1),
      type: z.enum(['email', 'blog', 'academic', 'casual', 'business']).optional(),
      targetTone: z.enum(['formal', 'casual', 'friendly', 'professional', 'persuasive']).optional(),
      checkFor: z.array(z.enum(['grammar', 'style', 'tone', 'clarity', 'conciseness'])).optional()
    });
    
    const { text, type, targetTone, checkFor } = schema.parse(req.body);
    
    // Create writing session
    const session = await storage.createWritingSession({
      userId,
      originalText: text
    });
    
    // Analyze text
    const analysis = await analyzeText(text, type, targetTone, checkFor);
    
    // Save suggestions
    if (analysis.suggestions.length > 0) {
      await storage.addWritingSuggestions(session.id, analysis.suggestions);
    }
    
    res.json({
      sessionId: session.id,
      analysis
    });
  } catch (error) {
    console.error("Error analyzing text:", error);
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
          "suggestionType": "grammar|style|tone|clarity|conciseness",
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
    model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: text
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2000
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
      sentenceCount: text.split(/[.!?]+/).filter(s => s.trim()).length
    }
  };
}

/**
 * POST /api/writing/improve
 * Apply improvements to text
 */
router.post("/improve", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { sessionId, suggestionIds } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }
    
    // Get session
    const session = await storage.getWritingSession(userId, sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    // Apply selected suggestions
    let improvedText = session.improvedText || session.originalText;
    const improvements: string[] = [];
    
    if (suggestionIds && suggestionIds.length > 0) {
      // Mark suggestions as accepted
      for (const suggestionId of suggestionIds) {
        await storage.updateSuggestionStatus(suggestionId, true);
        improvements.push(suggestionId);
      }
      
      // Generate improved text with AI
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "Apply the accepted improvements to the text while maintaining its original meaning."
          },
          {
            role: "user",
            content: `Original: ${session.originalText}\n\nApply improvements based on accepted suggestions.`
          }
        ],
        max_completion_tokens: 2000
      });
      
      improvedText = completion.choices[0]?.message?.content || session.originalText;
    }
    
    // Update session
    const updatedSession = await storage.updateWritingSession(
      userId, 
      sessionId,
      improvedText,
      improvements
    );
    
    res.json(updatedSession);
  } catch (error) {
    console.error("Error improving text:", error);
    res.status(500).json({ error: "Failed to improve text" });
  }
});

/**
 * POST /api/writing/adjust-tone
 * Adjust the tone of text
 */
router.post("/adjust-tone", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const { text, currentTone, targetTone } = req.body;
    
    if (!text || !targetTone) {
      return res.status(400).json({ error: "Text and target tone are required" });
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using efficient model for tone adjustment
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
      max_completion_tokens: 1500
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    res.json(result);
  } catch (error) {
    console.error("Error adjusting tone:", error);
    res.status(500).json({ error: "Failed to adjust tone" });
  }
});

/**
 * POST /api/writing/paraphrase
 * Paraphrase text while maintaining meaning
 */
router.post("/paraphrase", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
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
      max_completion_tokens: 1500
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '{"variations":[]}');
    res.json(result.variations || []);
  } catch (error) {
    console.error("Error paraphrasing text:", error);
    res.status(500).json({ error: "Failed to paraphrase text" });
  }
});

/**
 * GET /api/writing/stats
 * Get user's writing statistics
 */
router.get("/stats", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const stats = await storage.getWritingStats(userId);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching writing stats:", error);
    res.status(500).json({ error: "Failed to fetch writing stats" });
  }
});

/**
 * POST /api/writing/check-plagiarism
 * Check for potential plagiarism (basic implementation)
 */
router.post("/check-plagiarism", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    
    // Note: Real plagiarism checking would require external service
    // This is a simplified implementation that checks for common phrases
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
      max_completion_tokens: 500
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    res.json(result);
  } catch (error) {
    console.error("Error checking plagiarism:", error);
    res.status(500).json({ error: "Failed to check plagiarism" });
  }
});

/**
 * GET /api/writing/sessions/:id
 * Get a specific writing session
 */
router.get("/sessions/:id", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id } = req.params;
    
    const session = await storage.getWritingSession(userId, id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    
    res.json(session);
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

export default router;