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