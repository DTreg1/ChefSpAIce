/**
 * Smart Email/Message Drafting Router
 * 
 * Generates contextual email/message drafts with multiple variations.
 * Uses GPT-4o-mini for efficient draft generation.
 * 
 * Base path: /api/v1/ai/drafts
 * 
 * @module server/routers/email-drafting.router
 */

import { Router, Request, Response } from "express";
import { isAuthenticated } from "../middleware";
import { storage } from "../storage/index";
import { z } from "zod";
import { getOpenAIClient } from "../config/openai-config";

const router = Router();

const openai = getOpenAIClient();

/**
 * GET /templates
 * Get available draft templates
 */
router.get("/templates", isAuthenticated, async (req: Request, res: Response) => {
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
 * POST /templates
 * Create a new draft template
 */
router.post("/templates", isAuthenticated, async (req: Request, res: Response) => {
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
 * POST /generate
 * Generate draft variations based on context
 */
router.post("/generate", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
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
 * Helper function to generate draft variations
 */
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

/**
 * POST /feedback
 * Track if draft was used/edited
 */
router.post("/feedback", isAuthenticated, async (req: Request, res: Response) => {
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
 * GET /history
 * Get user's draft history
 */
router.get("/history", isAuthenticated, async (req: Request, res: Response) => {
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
 * POST /quick-reply
 * Generate quick contextual replies
 */
router.post("/quick-reply", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!openai) {
      return res.status(503).json({ error: "AI service not available" });
    }
    
    const { message, sentiment } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Generate 3 quick reply options for the given message. 
          Consider the sentiment: ${sentiment || "neutral"}.
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
 * POST /improve
 * Improve/polish an existing draft
 */
router.post("/improve", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: "AI service not available" });
    }
    
    const { draft, improvements } = req.body;
    
    if (!draft) {
      return res.status(400).json({ error: "Draft is required" });
    }
    
    const improvementsList = improvements || ["clarity", "conciseness", "tone"];
    
    const completion = await openai.chat.completions.create({
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
 * GET /:id
 * Get a specific draft by ID
 */
router.get("/:id", isAuthenticated, async (req: Request, res: Response) => {
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
 * DELETE /:id
 * Delete a specific draft
 */
router.delete("/:id", isAuthenticated, async (req: Request, res: Response) => {
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

export default router;
