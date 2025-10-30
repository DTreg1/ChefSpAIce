/**
 * Smart Email/Message Drafting Router (Task 9)
 * 
 * Generates contextual email/message drafts with multiple variations.
 * Uses GPT-3.5-turbo for efficient draft generation.
 */

import { Router, type Request as ExpressRequest, type Response as ExpressResponse } from "express";
import { isAuthenticated } from "../middleware";
import { storage } from "../storage";
import OpenAI from "openai";
import { z } from "zod";

const router = Router();

// Initialize OpenAI client
// Referenced from blueprint:javascript_openai_ai_integrations
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "not-needed"
});

/**
 * GET /api/drafts/templates
 * Get available draft templates
 */
router.get("/templates", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const contextType = req.query.contextType as string | undefined;
    const templates = await storage.getDraftTemplates(contextType);
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
router.post("/templates", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = req.user?.claims.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const schema = z.object({
      contextType: z.string(),
      templatePrompt: z.string()
    });
    
    const data = schema.parse(req.body);
    const template = await storage.createDraftTemplate({
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
router.post("/generate", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = req.user?.claims.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const schema = z.object({
      contextType: z.string(),
      context: z.object({
        recipient: z.string().optional(),
        subject: z.string().optional(),
        purpose: z.string(),
        tone: z.enum(['formal', 'casual', 'friendly', 'professional']).optional(),
        keyPoints: z.array(z.string()).optional(),
        previousMessage: z.string().optional()
      }),
      numberOfVariations: z.number().min(1).max(5).default(3)
    });
    
    const { contextType, context, numberOfVariations } = schema.parse(req.body);
    
    // Generate drafts using AI
    const drafts = await generateDraftVariations(contextType, context, numberOfVariations);
    
    // Save generated drafts
    const savedDrafts = await storage.saveGeneratedDrafts(userId, drafts);
    
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
  contextType: string, 
  context: any, 
  numberOfVariations: number
): Promise<Array<{
  contextType: string;
  draftContent: string;
  tone: string;
  variations: any;
}>> {
  const systemPrompt = `You are an expert email/message writer. Generate ${numberOfVariations} different versions of a ${contextType} message.
    
    Context:
    - Recipient: ${context.recipient || "General"}
    - Purpose: ${context.purpose}
    - Tone: ${context.tone || "professional"}
    - Key Points: ${context.keyPoints?.join(", ") || "None specified"}
    ${context.previousMessage ? `- Replying to: "${context.previousMessage}"` : ""}
    
    Generate ${numberOfVariations} variations with different approaches but same core message.
    
    Return JSON array with this structure:
    [
      {
        "content": "Full message text",
        "tone": "actual tone used",
        "approach": "brief description of approach",
        "subject": "suggested subject line if email"
      }
    ]`;
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Using GPT-3.5-turbo equivalent for efficiency
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: `Generate ${numberOfVariations} ${contextType} drafts for: ${context.purpose}`
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 2000,
    temperature: 0.8 // Higher temperature for more variation
  });
  
  const result = JSON.parse(completion.choices[0]?.message?.content || "[]");
  const variations = Array.isArray(result) ? result : (result.variations || []);
  
  return variations.map((v: any) => ({
    contextType,
    draftContent: v.content,
    tone: v.tone || context.tone || "professional",
    variations: {
      approach: v.approach,
      subject: v.subject
    }
  }));
}

/**
 * POST /api/drafts/:id/select
 * Mark a draft as selected/used
 */
router.post("/:id/select", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = req.user?.claims.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id } = req.params;
    const { edited } = req.body;
    
    await storage.markDraftSelected(userId, id, edited || false);
    
    // Log activity
    await storage.createActivityLog({
      userId,
      action: "draft_selected",
      entity: "draft",
      entityId: id,
      metadata: { edited }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error selecting draft:", error);
    res.status(500).json({ error: "Failed to select draft" });
  }
});

/**
 * GET /api/drafts/history
 * Get user's draft history
 */
router.get("/history", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = req.user?.claims.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await storage.getDraftHistory(userId, limit);
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
router.post("/quick-reply", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = req.user?.claims.sub;
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
router.post("/improve", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
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