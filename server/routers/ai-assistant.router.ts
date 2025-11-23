/**
 * AI Assistant Router (Task 7)
 * 
 * Comprehensive chat assistant with conversation management.
 * Provides multi-turn conversations with context awareness.
 */

import { Router, Request, Response } from "express";
import { isAuthenticated } from "../middleware";
import { storage } from "../storage/index";
import { z } from "zod";
import { getOpenAIClient } from "../config/openai-config";

const router = Router();

// Initialize OpenAI client using safe configuration
// Using GPT-4 model for the AI assistant
const openai = getOpenAIClient();

// Check if OpenAI is configured
function checkOpenAIConfiguration(res: Response): boolean {
  if (!openai) {
    res.status(503).json({ 
      error: "AI service not configured",
      message: "OpenAI API key is required for this feature. Please configure OPENAI_API_KEY or AI_INTEGRATIONS_OPENAI_API_KEY."
    });
    return false;
  }
  return true;
}

/**
 * GET /api/assistant/conversations
 * Get all conversations for the authenticated user
 */
router.get("/conversations", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const conversations = await storage.user.chat.getConversations(userId);
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
router.post("/conversations", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
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
 * GET /api/assistant/conversations/:id
 * Get a specific conversation with its messages
 */
router.get("/conversations/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id } = req.params;
    
    const conversation = await storage.user.chat.getConversation(userId, id);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    const messages = await storage.user.chat.getMessages(id);
    const context = await storage.user.chat.getConversationContext(id);
    
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
router.put("/conversations/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id } = req.params;
    const { title } = req.body;
    
    const conversation = await storage.user.chat.updateConversation(userId, id, { title });
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
router.delete("/conversations/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id } = req.params;
    
    await storage.user.chat.deleteConversation(userId, id);
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
router.post("/conversations/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id: conversationId } = req.params;
    const { content } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Message content is required" });
    }
    
    // Verify conversation belongs to user
    const conversation = await storage.user.chat.getConversation(userId, conversationId);
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    
    // Save user message
    const userMessage = await storage.user.chat.createMessage({
      conversationId,
      role: "user",
      content,
    });
    
    // Get conversation history
    const messages = await storage.user.chat.getMessages(conversationId, 20);
    const context = await storage.user.chat.getConversationContext(conversationId);
    
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
    const assistantMessage = await storage.user.chat.createMessage({
      conversationId,
      role: "assistant",
      content: aiResponse,
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
      
      await storage.user.chat.updateConversationContext(conversationId, {
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
router.post("/feedback", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { messageId, rating, feedback } = req.body;
    
    // Log feedback for analytics
    await storage.user.chat.createActivityLog({
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