/**
 * Chat Router
 * 
 * Comprehensive chat API for AI assistant with conversation management.
 * Provides conversation history, context management, and feedback tracking.
 */

import { Router, Request, Response } from 'express';
import { getAuthenticatedUserId, sendError, sendSuccess } from '../types/request-helpers';
import { isAuthenticated } from '../middleware/auth.middleware';
import { chatService } from '../services/chatService';
import { z } from 'zod';

const router = Router();

// Request validation schemas
const sendMessageSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional()
});

const feedbackSchema = z.object({
  messageId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional()
});

/**
 * POST /api/chat/message
 * Send a message to the AI assistant
 */
router.post('/message', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate request body
    const parsed = sendMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        details: parsed.error.flatten() 
      });
    }

    const { message, conversationId } = parsed.data;

    // Send message and get response
    const result = await chatService.sendMessage(
      userId,
      message,
      conversationId
    );

    res.json(result);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ 
      error: 'Failed to send message',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/chat/conversations
 * Get list of user's conversations
 */
router.get('/conversations', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const conversations = await chatService.getUserConversations(userId);
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch conversations' 
    });
  }
});

/**
 * GET /api/chat/conversation/:id
 * Get conversation history with messages
 */
router.get('/conversation/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    const conversationData = await chatService.getConversationMessages(id, userId);
    res.json(conversationData);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    if (error instanceof Error && error.message === 'Conversation not found') {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.status(500).json({ 
      error: 'Failed to fetch conversation' 
    });
  }
});

/**
 * DELETE /api/chat/conversation/:id
 * Delete a conversation and all its messages
 */
router.delete('/conversation/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    await chatService.deleteConversation(id, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ 
      error: 'Failed to delete conversation' 
    });
  }
});

/**
 * POST /api/chat/feedback
 * Rate an assistant response
 */
router.post('/feedback', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate request body
    const parsed = feedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        details: parsed.error.flatten() 
      });
    }

    const { messageId, rating, comment } = parsed.data;

    await chatService.saveFeedback(
      messageId,
      userId,
      rating,
      comment
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving feedback:', error);
    if (error instanceof Error && error.message === 'Message not found') {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.status(500).json({ 
      error: 'Failed to save feedback' 
    });
  }
});

export default router;