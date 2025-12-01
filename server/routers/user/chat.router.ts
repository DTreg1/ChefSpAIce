/**
 * Streaming Chat Router
 * 
 * Implements Server-Sent Events (SSE) for real-time AI chat with comprehensive error handling.
 * Features:
 * - Streaming responses for better UX
 * - Graceful error recovery during stream
 * - Circuit breaker protection
 * - Retry logic for transient failures
 */

import { Router, Request, Response } from "express";
import { isAuthenticated, getAuthenticatedUserId } from "../../middleware/oauth.middleware";
import { batchedApiLogger } from "../../utils/batchedApiLogger";
import rateLimiters from "../../middleware/rateLimit";
import {
  AIError,
  AIErrorCode,
  handleOpenAIError,
  retryWithBackoff,
  createErrorResponse,
  formatErrorForLogging
} from "../../utils/ai-error-handler";
import { getCircuitBreaker } from "../../utils/circuit-breaker";
import { chatService } from "../../services/chat.service";
import { storage } from "../../storage/index";
import { openai } from "../../integrations/openai";
import { insertChatMessageSchema, type ChatMessage } from "@shared/schema";

const router = Router();

// Circuit breaker for OpenAI chat
const chatCircuitBreaker = getCircuitBreaker('openai-chat', {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  successThreshold: 2,
  monitoringWindow: 60000
});

/**
 * Helper to write SSE event
 */
function writeSSE(res: Response, event: string, data: any): void {
  const message = typeof data === 'string' ? data : JSON.stringify(data);
  res.write(`event: ${event}\ndata: ${message}\n\n`);
}

/**
 * Helper to write SSE error
 */
function writeSSEError(res: Response, error: any): void {
  const errorResponse = createErrorResponse(error);
  writeSSE(res, 'error', errorResponse);
}

/**
 * POST /api/chat/stream
 * 
 * Streaming chat endpoint with Server-Sent Events (SSE).
 * Provides real-time AI responses with comprehensive error handling.
 * 
 * Request Body:
 * - message: String (required) - User's message
 * - includeInventory: Boolean (optional) - Include user's inventory in context
 * - streamingEnabled: Boolean (optional, default: true) - Enable streaming
 * 
 * Response: Server-Sent Events stream with:
 * - Event: 'message' - Partial message chunks
 * - Event: 'done' - Stream completion
 * - Event: 'error' - Error information with retry guidance
 * 
 * Error Recovery:
 * - Automatic retry for transient failures
 * - Graceful degradation on circuit breaker trip
 * - User-friendly error messages
 */
router.post(
  "/stream",
  isAuthenticated,
  rateLimiters.openai.middleware(),
  async (req: Request, res: Response) => {
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Send initial connection event
    writeSSE(res, 'connected', { timestamp: Date.now() });

    // Track whether we've started sending content
    let contentStarted = false;
    let accumulatedContent = '';

    try {
      const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const { message, includeInventory, streamingEnabled = true  } = req.body || {};

      if (!message) {
        writeSSEError(res, new AIError(
          'Message is required',
          AIErrorCode.UNKNOWN,
          400,
          false,
          'Please provide a message'
        ));
        return res.end();
      }

      // Save user message via service
      await chatService.saveUserMessage(userId, message);

      // Build context via service (includes inventory and history)
      const context = await chatService.buildChatContext(userId, includeInventory, 10);
      const messages = context.messages;

      // Execute through circuit breaker with retry logic
      await chatCircuitBreaker.execute(async () => {
        return await retryWithBackoff(async () => {
          try {
            if (!streamingEnabled) {
              // Non-streaming response via service
              const content = await chatService.createChatCompletion(messages);
              writeSSE(res, 'message', content);
              accumulatedContent = content;
              contentStarted = true;
            } else {
              // Streaming response via service
              const stream = await chatService.createChatStream(messages);
              for await (const content of stream) {
                writeSSE(res, 'message', content);
                accumulatedContent += content;
                contentStarted = true;

                // Flush the response to ensure client receives data immediately
                if (res.flush) {
                  res.flush();
                }
              }
            }

            // Save assistant response if we have content
            if (accumulatedContent) {
              // Save via service
              await chatService.saveAssistantMessage(userId, accumulatedContent);

              // Detect cooking terms via service
              const detectedTerms = await chatService.detectCookingTerms(accumulatedContent);

              // Log successful API usage
              await batchedApiLogger.logApiUsage(userId, {
                apiName: "openai",
                endpoint: "chat-stream",
                method: "POST" as const,
                statusCode: 200,
              });

              // Send detected terms if any were found
              if (detectedTerms.length > 0) {
                writeSSE(res, 'terms', detectedTerms);
              }
            }

            // Send completion event
            writeSSE(res, 'done', {
              messageLength: accumulatedContent.length,
              timestamp: Date.now()
            });

          } catch (streamError) {
            // If we've already started sending content, send an error event
            if (contentStarted) {
              console.error('[Stream] Error during streaming:', streamError);
              writeSSEError(res, streamError);

              // Log the partial success/failure
              await batchedApiLogger.logApiUsage(userId, {
                apiName: "openai",
                endpoint: "chat-stream",
                method: "POST" as const,
                statusCode: 206, // Partial content
              });
            }
            throw streamError; // Re-throw for retry logic
          }
        }, {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000
        });
      });

    } catch (error: Error | unknown) {
      // Log the error
      console.error('[Chat Stream] Error:', formatErrorForLogging(error));

      // If we haven't sent any content yet, send error
      if (!contentStarted) {
        writeSSEError(res, error);
      }

      // Log failed API usage
      const errorUserId = getAuthenticatedUserId(req);
      if (errorUserId) {
        const aiError = error instanceof AIError ? error : handleOpenAIError(error);
        await batchedApiLogger.logApiUsage(errorUserId, {
          apiName: "openai",
          endpoint: "chat-stream",
          method: "POST" as const,
          statusCode: aiError.statusCode,
        }).catch(logError => {
          console.error('[Chat Stream] Failed to log error:', logError);
        });
      }
    } finally {
      // Always end the response
      res.end();
    }
  }
);

/**
 * POST /messages
 * 
 * Creates a new chat message (typically from client-side storage sync).
 */
router.post("/messages", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const validation = insertChatMessageSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        details: validation.error.errors
      });
    }

    const message = await storage.user.chat.createChatMessage(userId, validation.data);
    res.json(message);
  } catch (error) {
    console.error("Error creating chat message:", error);
    res.status(500).json({ error: "Failed to create chat message" });
  }
});

/**
 * POST /
 * 
 * Main AI chat endpoint powered by OpenAI GPT-4.
 * Provides conversational cooking assistance with inventory awareness.
 */
router.post(
  "/",
  isAuthenticated,
  rateLimiters.openai.middleware(),
  async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    let assistantMessage = "";
    
    try {
      const { message, includeInventory } = req.body || {};

      if (!message) {
        const error = new AIError(
          'Message is required',
          AIErrorCode.UNKNOWN,
          400,
          false,
          'Please provide a message'
        );
        return res.status(400).json(createErrorResponse(error));
      }

      if (!openai) {
        const error = new AIError(
          'OpenAI API not configured',
          AIErrorCode.UNKNOWN,
          500,
          false,
          'AI service is not configured. Please contact support.'
        );
        return res.status(500).json(createErrorResponse(error));
      }

      // Persist user message to database for conversation history
      await storage.user.chat.createChatMessage(userId, {
        role: "user",
        content: message,
      });

      // Build inventory context when requested
      let inventoryContext = "";
      if (includeInventory) {
        const items = await storage.user.inventory.getFoodItems(userId);
        
        if (items.length > 0) {
          inventoryContext = `\n\nUser's current food inventory:\n${items
            .map((item: any) => `- ${item.name}: ${item.quantity} ${item.unit || ""} (${item.foodCategory || "uncategorized"})`)
            .join("\n")}`;
        }
      }

      // Fetch recent conversation history to maintain context
      const history = await storage.user.chat.getChatMessages(userId, 10);

      const messages: any[] = [
        {
          role: "system",
          content: `You are ChefSpAIce, a helpful cooking assistant. You provide recipe suggestions, cooking tips, and meal planning advice. Be concise but friendly.${inventoryContext}`,
        },
        ...history.reverse().map((msg: ChatMessage) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      // Execute through circuit breaker with retry logic
      const completion = await chatCircuitBreaker.execute(async () => {
        return await retryWithBackoff(async () => {
          return await openai.chat.completions.create({
            model: "gpt-4o",
            messages,
            temperature: 0.7,
            max_tokens: 500,
          });
        }, {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 10000
        });
      });

      assistantMessage = completion.choices[0].message?.content || "";

      if (!assistantMessage) {
        throw new AIError(
          'Empty response from AI',
          AIErrorCode.UNKNOWN,
          502,
          true,
          'AI returned an empty response. Please try again.'
        );
      }

      // Save assistant message
      const saved = await storage.user.chat.createChatMessage(userId, {
        role: "assistant",
        content: assistantMessage,
      });

      // Log successful API usage
      await batchedApiLogger.logApiUsage(userId, {
        apiName: "openai",
        endpoint: "chat",
        method: "POST" as const,
        statusCode: 200,
      });

      res.json({
        message: assistantMessage,
        saved,
      });
    } catch (error: Error | unknown) {
      // Log the error details
      console.error("Error in chat:", formatErrorForLogging(error));
      
      // Log failed API usage
      const aiError = error instanceof AIError ? error : handleOpenAIError(error);
      await batchedApiLogger.logApiUsage(userId, {
        apiName: "openai",
        endpoint: "chat",
        method: "POST" as const,
        statusCode: aiError.statusCode,
      }).catch(logError => {
        console.error('Failed to log API error:', logError);
      });
      
      // Send error response
      const errorResponse = createErrorResponse(error);
      res.status(aiError.statusCode).json(errorResponse);
    }
  }
);

/**
 * GET /messages
 * 
 * Retrieves chat message history for the authenticated user.
 * Messages are ordered chronologically for display in the chat UI.
 */
router.get("/messages", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await storage.user.chat.getChatMessages(userId, limit);
    res.json(messages.reverse());
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({ error: "Failed to fetch chat messages" });
  }
});

/**
 * DELETE /messages
 * 
 * Clears all chat history for the authenticated user.
 */
router.delete("/messages", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    await storage.user.chat.deleteChatHistory(userId);
    res.json({ message: "Chat history cleared" });
  } catch (error) {
    console.error("Error clearing chat messages:", error);
    res.status(500).json({ error: "Failed to clear chat messages" });
  }
});

/**
 * GET /api/chat/stream/health
 * 
 * Health check endpoint for streaming chat service.
 * Returns circuit breaker status and service health.
 */
router.get("/health", isAuthenticated, (req: Request, res: Response) => {
  const stats = chatCircuitBreaker.getStats();
  const isHealthy = stats.state === 'closed';

  res.status(isHealthy ? 200 : 503).json({
    healthy: isHealthy,
    circuitBreaker: {
      state: stats.state,
      failures: stats.failures,
      successes: stats.successes,
      totalRequests: stats.totalRequests,
      totalFailures: stats.totalFailures,
      totalSuccesses: stats.totalSuccesses,
      lastFailureTime: stats.lastFailureTime,
      recentStateChanges: stats.stateChanges.slice(-5) // Last 5 state changes
    },
    service: 'chat-stream',
    timestamp: Date.now()
  });
});

/**
 * POST /api/chat/message
 * 
 * Alias for /messages - Creates a new chat message and gets AI response.
 * Used by chat-interface.tsx
 */
router.post("/message", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Accept both 'content' and 'message' field names for flexibility
    const { content, message, conversationId } = req.body;
    const messageContent = content || message;
    
    if (!messageContent) {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Save user message with conversationId in metadata
    const userMessage = await storage.user.chat.createChatMessage(userId, {
      role: "user",
      content: messageContent,
      metadata: conversationId ? { conversationId } : undefined
    });

    // Get AI response using the chat service
    try {
      const context = await chatService.buildChatContext(userId, true, 10);
      const aiResponse = await chatService.createChatCompletion(context.messages);
      
      // Save AI response with conversationId in metadata
      const assistantMessage = await storage.user.chat.createChatMessage(userId, {
        role: "assistant",
        content: aiResponse,
        metadata: conversationId ? { conversationId } : undefined
      });

      res.json({
        userMessage,
        assistantMessage,
        response: aiResponse
      });
    } catch (aiError) {
      console.error("AI response error:", aiError);
      // Return user message but indicate AI failed
      res.json({
        userMessage,
        assistantMessage: null,
        response: null,
        error: "AI service temporarily unavailable"
      });
    }
  } catch (error) {
    console.error("Error in chat message:", error);
    res.status(500).json({ error: "Failed to process message" });
  }
});

/**
 * GET /api/chat/conversations
 * 
 * Get all conversations for the authenticated user.
 */
router.get("/conversations", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Get unique conversations from chat messages
    const messages = await storage.user.chat.getChatMessages(userId, 100);
    
    // Group by conversationId and extract unique conversations
    const conversationMap = new Map<string, any>();
    for (const msg of messages) {
      const convId = (msg.metadata as any)?.conversationId || 'default';
      if (!conversationMap.has(convId)) {
        conversationMap.set(convId, {
          id: convId,
          title: msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : ''),
          lastMessage: msg.content,
          createdAt: msg.createdAt,
          updatedAt: msg.createdAt
        });
      }
    }
    
    const conversations = Array.from(conversationMap.values());
    res.json(conversations);
  } catch (error) {
    console.error("Error getting conversations:", error);
    res.status(500).json({ error: "Failed to get conversations" });
  }
});

/**
 * GET /api/chat/conversation/:conversationId
 * 
 * Get messages for a specific conversation.
 */
router.get("/conversation/:conversationId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { conversationId } = req.params;
    const messages = await storage.user.chat.getChatMessages(userId, 100);
    
    // Filter by conversationId stored in metadata
    const conversationMessages = messages.filter((m: any) => 
      ((m.metadata as any)?.conversationId || 'default') === conversationId
    );
    
    res.json({
      id: conversationId,
      messages: conversationMessages
    });
  } catch (error) {
    console.error("Error getting conversation:", error);
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

/**
 * POST /api/chat/conversation
 * 
 * Create a new conversation.
 */
router.post("/conversation", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({
      id: conversationId,
      title: "New Conversation",
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

/**
 * DELETE /api/chat/conversation/:conversationId
 * 
 * Delete a conversation.
 */
router.delete("/conversation/:conversationId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { conversationId } = req.params;
    
    // Delete messages for this conversation
    await storage.user.chat.deleteChatHistory(userId);
    
    res.json({ success: true, deletedConversationId: conversationId });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

/**
 * POST /api/chat/stream/reset
 * 
 * Admin endpoint to reset circuit breaker.
 * Useful for manual intervention when service is recovered.
 */
router.post("/reset", isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Check if user is admin (you may want to implement proper admin check)
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Reset circuit breaker
    chatCircuitBreaker.reset();

    // Log the reset action (commented out as "internal" is not a valid apiName)
    // await batchedApiLogger.logApiUsage(userId, {
    //   apiName: "internal",
    //   endpoint: "chat-stream-reset",
    //   statusCode: 200,
    //   success: true,
    // });

    res.json({
      message: 'Circuit breaker reset successfully',
      stats: chatCircuitBreaker.getStats()
    });
  } catch (error) {
    console.error('[Chat Stream] Reset error:', error);
    res.status(500).json({ error: 'Failed to reset circuit breaker' });
  }
});

export default router;