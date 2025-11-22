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
// Use OAuth authentication middleware
import { isAuthenticated, getAuthenticatedUserId } from "../middleware/oauth.middleware";
import { openai } from "../integrations/openai";
import { storage } from "../storage/index";
import { batchedApiLogger } from "../utils/batchedApiLogger";
import rateLimiters from "../middleware/rateLimit";
import {
  AIError,
  AIErrorCode,
  handleOpenAIError,
  retryWithBackoff,
  createErrorResponse,
  formatErrorForLogging
} from "../utils/ai-error-handler";
import { getCircuitBreaker } from "../utils/circuit-breaker";
import { termDetector } from "../services/term-detector.service";
import type { Message } from "@shared/schema";

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

      if (!openai) {
        writeSSEError(res, new AIError(
          'OpenAI not configured',
          AIErrorCode.AUTH_ERROR,
          500,
          false,
          'AI service is not configured'
        ));
        return res.end();
      }

      // Save user message
      await storage.createChatMessage(userId, {
        role: "user",
        content: message,
      });

      // Build context
      let inventoryContext = "";
      if (includeInventory) {
        const items = await storage.getFoodItems(userId);
        if (items.length > 0) {
          inventoryContext = `\n\nUser's current food inventory:\n${items
            .map((item: any) => `- ${item.name}: ${item.quantity} ${item.unit || ""} (${item.foodCategory || "uncategorized"})`)
            .join("\n")}`;
        }
      }

      // Get chat history
      const history = await storage.getChatMessages(userId, 10);
      const messages: any[] = [
        {
          role: "system",
          content: `You are ChefSpAIce, a helpful cooking assistant. You provide recipe suggestions, cooking tips, and meal planning advice. Be concise but friendly.${inventoryContext}`,
        },
        ...history.reverse().map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
      ];

      // Execute through circuit breaker with retry logic
      await chatCircuitBreaker.execute(async () => {
        return await retryWithBackoff(async () => {
          try {
            const response = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages,
              temperature: 0.7,
              max_tokens: 500,
              stream: streamingEnabled,
            });

            if (!streamingEnabled) {
              // Non-streaming response
              const completion = response as any;
              const content = completion.choices[0].message?.content || "";

              writeSSE(res, 'message', content);
              accumulatedContent = content;
              contentStarted = true;

            } else {
              // Streaming response
              const stream = response as any;
              for await (const chunk of stream) {
                try {
                  const content = chunk.choices[0]?.delta?.content || "";
                  if (content) {
                    writeSSE(res, 'message', content);
                    accumulatedContent += content;
                    contentStarted = true;

                    // Flush the response to ensure client receives data immediately
                    if (res.flush) {
                      res.flush();
                    }
                  }
                } catch (chunkError) {
                  console.error('[Stream] Error processing chunk:', chunkError);
                  // Continue processing other chunks
                }
              }
            }

            // Save assistant response if we have content
            if (accumulatedContent) {
              await storage.createChatMessage(userId, {
                role: "assistant",
                content: accumulatedContent,
              });

              // Detect cooking terms in the response
              let detectedTerms: Array<{
                term: string;
                termId: string;
                category: string;
                shortDefinition: string;
                difficulty?: string | null;
                start: number;
                end: number;
              }> = [];
              try {
                const matches = await termDetector.detectTerms(accumulatedContent, {
                  maxMatches: 50,
                  contextAware: true
                });

                // Convert matches to simpler format for client
                detectedTerms = matches.map(match => ({
                  term: match.originalTerm,
                  termId: match.termId,
                  category: match.category,
                  shortDefinition: match.shortDefinition,
                  difficulty: match.difficulty,
                  start: match.start,
                  end: match.end
                }));
              } catch (termError) {
                console.error('[Chat Stream] Error detecting cooking terms:', termError);
                // Continue without terms - don't fail the whole response
              }

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