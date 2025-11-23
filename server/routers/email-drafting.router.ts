/**
 * Smart Email/Message Drafting Router (Task 9)
 * 
 * Generates contextual email/message drafts with multiple variations.
 * Uses GPT-3.5-turbo for efficient draft generation.
 */

import { Router, Request, Response } from "express";
import { isAuthenticated } from "../middleware";
import { storage } from "../storage/index";
import { z } from "zod";
import { getOpenAIClient } from "../config/openai-config";

const router = Router();

// Initialize OpenAI client
const openai = getOpenAIClient();

/**
 * GET /api/drafts/templates
 * Get available draft templates
 */
router.get("/templates", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const contextType = req.query.contextType as string | undefined;
    const templates = await storage.platform.ai.getDraftTemplates(contextType);
    res.json(templates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

/**
 * POST /api/drafts/templates
 * Create a new draft template
 */
router.post("/templates", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const schema = z.object({
      contextType: z.string(),
      templatePrompt: z.string()
    });
    
    const data = schema.parse(req.body);
    const template = await storage.platform.ai.createDraftTemplate({
      ...data,
      usageCount: 0
    });
    res.json(template);
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({ error: "Failed to create template" });
  }
});

/**
 * POST /api/drafts/generate
 * Generate draft variations based on context
 */
router.post("/generate", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const schema = z.object({
      originalMessage: z.string(),
      contextType: z.enum(['email', 'message', 'comment', 'customer_complaint']).default('email'),
      tones: z.array(z.enum(['formal', 'casual', 'friendly', 'apologetic', 'solution-focused', 'empathetic'])).optional(),
      subject: z.string().optional(),
      approach: z.string().optional()
    });
    
    const { originalMessage, contextType, tones, subject, approach } = schema.parse(req.body);
    
    // Default tones based on context
    const selectedTones = tones || (contextType === 'customer_complaint' 
      ? ['apologetic', 'solution-focused', 'empathetic']
      : ['formal', 'casual', 'friendly']);
    
    // Generate drafts using AI
    const drafts = await generateDraftVariations(originalMessage, contextType, selectedTones);
    
    // Save generated drafts with unique message ID and analytics metadata
    const messageId = `msg_${Date.now()}`;
    const savedDrafts = await Promise.all(
      drafts.map((draft, index) => storage.platform.ai.createGeneratedDraft(userId, {
        originalMessageId: messageId,
        originalMessage,
        draftContent: draft.content,
        tone: draft.tone,
        contextType,
        metadata: {
          model: 'gpt-4o-mini',
          temperature: 0.8,
          subject: subject || 'General response',
          approach: approach || (index === 0 ? 'Direct' : index === 1 ? 'Detailed' : 'Concise'),
          variationNumber: index + 1,
          contextType
        }
      }))
    );
    
    res.json(savedDrafts);
  } catch (error) {
    console.error("Error generating drafts:", error);
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
): Promise<Array<{
  content: string;
  tone: string;
}>> {
  const contextInstructions = {
    'customer_complaint': 'You are responding to a customer complaint. Be professional, acknowledge their concerns, and offer solutions.',
    'email': 'You are drafting a professional email response.',
    'message': 'You are drafting a conversational message response.',
    'comment': 'You are drafting a comment or forum response.'
  };

  const toneDescriptions = {
    'formal': 'Use formal language with proper business etiquette',
    'casual': 'Use relaxed, conversational language',
    'friendly': 'Use warm, approachable language with a positive tone',
    'apologetic': 'Express sincere regret and take responsibility',
    'solution-focused': 'Emphasize practical solutions and next steps',
    'empathetic': 'Show understanding and compassion for their situation'
  };

  const systemPrompt = `You are an expert at crafting contextual responses. ${contextInstructions[contextType as keyof typeof contextInstructions] || contextInstructions.email}
    
Generate ${tones.length} different response drafts to the following message, each with a different tone.

Tones to use:
${tones.map(tone => `- ${tone}: ${toneDescriptions[tone as keyof typeof toneDescriptions] || tone}`).join('\n')}

Return a JSON object with a "drafts" array containing objects with "content" and "tone" fields.
Each draft should be complete and ready to send.`;
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: `Original message to respond to:\n"${originalMessage}"`
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2000,
    temperature: 0.8
  });
  
  const result = JSON.parse(completion.choices[0]?.message?.content || '{"drafts":[]}');
  const drafts = result.drafts || [];
  
  // Ensure we have the right number of drafts
  return tones.map((tone, index) => ({
    content: drafts[index]?.content || `[Draft generation failed for ${tone} tone]`,
    tone: tone
  }));
}

/**
 * POST /api/drafts/feedback
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
      editedContent: z.string().optional()
    });
    
    const { draftId, selected, edited, editedContent } = schema.parse(req.body);
    
    if (selected) {
      await storage.platform.ai.markDraftSelected(userId, draftId);
    }
    
    if (edited && editedContent) {
      await storage.platform.ai.markDraftEdited(userId, draftId, editedContent);
    }
    
    // Log activity
    await storage.platform.ai.createActivityLog({
      userId,
      action: selected ? "draft_selected" : "draft_viewed",
      entity: "draft",
      entityId: draftId,
      metadata: { edited, selected }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error submitting draft feedback:", error);
    res.status(500).json({ error: "Failed to submit draft feedback" });
  }
});

/**
 * GET /api/drafts/history
 * Get user's draft history
 */
router.get("/history", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const originalMessageId = req.query.messageId as string | undefined;
    const history = await storage.platform.ai.getGeneratedDrafts(userId, originalMessageId);
    res.json(history);
  } catch (error) {
    console.error("Error fetching draft history:", error);
    res.status(500).json({ error: "Failed to fetch draft history" });
  }
});

/**
 * POST /api/drafts/quick-reply
 * Generate quick contextual replies
 */
router.post("/quick-reply", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { message, sentiment } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    
    // Generate quick reply options
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
      max_completion_tokens: 200
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || '{"replies":[]}');
    
    res.json(result.replies || []);
  } catch (error) {
    console.error("Error generating quick replies:", error);
    res.status(500).json({ error: "Failed to generate quick replies" });
  }
});

/**
 * POST /api/drafts/improve
 * Improve/polish an existing draft
 */
router.post("/improve", isAuthenticated, async (req: Request, res: Response) => {
  try {
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
      max_completion_tokens: 1000
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    res.json(result);
  } catch (error) {
    console.error("Error improving draft:", error);
    res.status(500).json({ error: "Failed to improve draft" });
  }
});

export default router;