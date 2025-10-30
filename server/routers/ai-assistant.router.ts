/**
 * AI Assistant Router (Task 7)
 * 
 * Comprehensive chat assistant with conversation management.
 * Provides multi-turn conversations with context awareness.
 */

import { Router, type Request as ExpressRequest, type Response as ExpressResponse } from "express";
import { isAuthenticated } from "../middleware";
import { storage } from "../storage";
import OpenAI from "openai";
import { z } from "zod";

const router = Router();

// Initialize OpenAI client using Replit AI Integrations
// Referenced from blueprint:javascript_openai_ai_integrations
// Using GPT-4 model for the AI assistant
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "not-needed"
});

/**
 * GET /api/assistant/conversations
 * Get all conversations for the authenticated user
 */
router.get("/conversations", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = req.user?.claims.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const conversations = await storage.getConversations(userId);
    res.json(conversations);
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

/**
 * POST /api/assistant/conversations
 * Create a new conversation
 */
router.post("/conversations", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = req.user?.claims.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { title } = req.body;
    const conversationTitle = title || "New Conversation";
    
    const conversation = await storage.createConversation(userId, conversationTitle);
    res.json(conversation);
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

/**
 * GET /api/assistant/conversations/:id
 * Get a specific conversation with its messages
 */
router.get("/conversations/:id", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = req.user?.claims.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id } = req.params;
    
    const conversation = await storage.getConversation(userId, id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    const messages = await storage.getMessages(id);
    const context = await storage.getConversationContext(id);
    
    res.json({
      conversation,
      messages,
      context
    });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

/**
 * PUT /api/assistant/conversations/:id
 * Update conversation (e.g., rename)
 */
router.put("/conversations/:id", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = req.user?.claims.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id } = req.params;
    const { title } = req.body;
    
    const conversation = await storage.updateConversation(userId, id, { title });
    res.json(conversation);
  } catch (error) {
    console.error("Error updating conversation:", error);
    res.status(500).json({ error: "Failed to update conversation" });
  }
});

/**
 * DELETE /api/assistant/conversations/:id
 * Delete a conversation and all its messages
 */
router.delete("/conversations/:id", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = req.user?.claims.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id } = req.params;
    
    await storage.deleteConversation(userId, id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

/**
 * POST /api/assistant/conversations/:id/messages
 * Send a message to the assistant and get a response
 */
router.post("/conversations/:id/messages", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = req.user?.claims.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id: conversationId } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Message content is required" });
    }
    
    // Verify conversation belongs to user
    const conversation = await storage.getConversation(userId, conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    // Save user message
    const userMessage = await storage.createMessage({
      conversationId,
      role: "user",
      content,
      tokensUsed: 0
    });
    
    // Get conversation history
    const messages = await storage.getMessages(conversationId, 20);
    const context = await storage.getConversationContext(conversationId);
    
    // Build messages for OpenAI
    const openaiMessages: any[] = [
      {
        role: "system",
        content: `You are a helpful AI assistant. Be concise, accurate, and friendly. 
          ${context?.contextSummary ? `Previous context: ${context.contextSummary}` : ''}`
      }
    ];
    
    // Add message history
    messages.forEach(msg => {
      openaiMessages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content
      });
    });
    
    // Get AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // Using GPT-4 for comprehensive AI assistant
      messages: openaiMessages,
      max_completion_tokens: 2000,
      temperature: 0.7
    });
    
    const aiResponse = completion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";
    const tokensUsed = completion.usage?.total_tokens || 0;
    
    // Save AI response
    const assistantMessage = await storage.createMessage({
      conversationId,
      role: "assistant",
      content: aiResponse,
      tokensUsed
    });
    
    // Update context if needed (every 10 messages)
    if (messages.length % 10 === 0 && messages.length > 0) {
      // Generate context summary
      const summaryCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using GPT-4o-mini for summary generation
        messages: [
          {
            role: "system",
            content: "Summarize the key points of this conversation in 2-3 sentences."
          },
          ...openaiMessages.slice(1) // Exclude system message
        ],
        max_completion_tokens: 200
      });
      
      const summary = summaryCompletion.choices[0]?.message?.content || "";
      
      await storage.updateConversationContext(conversationId, {
        contextSummary: summary,
        keyFacts: [] // Could extract key facts here
      });
    }
    
    res.json({
      userMessage,
      assistantMessage
    });
  } catch (error) {
    console.error("Error processing message:", error);
    res.status(500).json({ error: "Failed to process message" });
  }
});

/**
 * POST /api/assistant/feedback
 * Rate assistant response
 */
router.post("/feedback", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = req.user?.claims.sub;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { messageId, rating, feedback } = req.body;
    
    // Log feedback for analytics
    await storage.createActivityLog({
      userId,
      action: "assistant_feedback",
      entity: "message",
      entityId: messageId,
      metadata: { rating, feedback }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error saving feedback:", error);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

export default router;