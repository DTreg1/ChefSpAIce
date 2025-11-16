import { Router, Request as ExpressRequest, Response as ExpressResponse } from "express";
import { storage } from "../storage";
import { analyticsRateLimit } from "../middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { insertWebVitalSchema, insertAnalyticsEventSchema } from "@shared/schema";
import { retryWithBackoff } from "../utils/retry-handler";

const router = Router();

// Web Vitals Analytics endpoint
router.post("/", analyticsRateLimit, asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
  // Get user ID if authenticated, otherwise null for anonymous tracking
  const userId = req.user?.claims?.sub || null;

  // Capture request metadata
  const userAgent = req.headers["user-agent"] || null;
  const url = req.headers["referer"] || req.headers["origin"] || null;

  // Log the incoming data for debugging in development
  if (process.env.NODE_ENV === 'development') {
    console.log("Analytics POST received:", {
      body: req.body,
      userId,
      userAgent: userAgent?.substring(0, 50),
      url
    });
  }

  try {
    // Validate using Zod schema
    const validated = insertWebVitalSchema.parse({
      ...req.body,
      userId,
      metricId: req.body.id, // Map 'id' from web-vitals to 'metricId'
      navigationType: req.body.navigationType || null,
      userAgent,
      url,
    });

    // Record with consolidated retry logic
    try {
      await retryWithBackoff(
        async () => {
          await storage.recordWebVital(validated);
        },
        {
          maxRetries: 3,
          initialDelay: 100, // Start with 100ms to match original logic
          onRetry: (attempt, error, delay) => {
            console.log(`[Analytics] Retrying web vital recording after ${delay}ms (attempt ${attempt + 1}/4)`);
          }
        }
      );
    } catch (lastError) {
      // Log error but don't fail the request
      console.error("Failed to record web vital after retries:", lastError);
    }
    
  } catch (validationError) {
    // Log validation errors but don't fail the request
    console.warn("Analytics validation error:", validationError);
  }

  // Always return success to not break client analytics
  res.status(200).json({ success: true });
}));

// Analytics Events endpoint - batch processing
router.post("/events", analyticsRateLimit, asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
  const userId = req.user?.claims?.sub || null;
  const { events  } = req.body || {};
  
  if (!events || !Array.isArray(events)) {
    return res.status(400).json({ error: "Invalid events format" });
  }
  
  try {
    // Validate and prepare each event with server-side data
    const validatedEvents = [];
    
    for (const event of events) {
      try {
        // Validate each event using the schema
        const validated = insertAnalyticsEventSchema.parse({
          ...event,
          userId,
          // Server-side timestamp will be set by the database default
        });
        validatedEvents.push(validated);
      } catch (validationError) {
        // Log validation errors but continue processing valid events
        console.warn("Event validation error:", validationError);
      }
    }
    
    if (validatedEvents.length === 0) {
      return res.status(400).json({ error: "No valid events to process" });
    }
    
    // Batch insert validated events
    await storage.recordAnalyticsEventsBatch(validatedEvents);
    
    res.status(200).json({ 
      success: true, 
      processed: validatedEvents.length, 
      skipped: events.length - validatedEvents.length 
    });
  } catch (error) {
    console.error("Failed to record analytics events:", error);
    res.status(500).json({ error: "Failed to record events" });
  }
}));

// Session start endpoint
router.post("/sessions/start", asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
  const userId = req.user?.claims?.sub || null;
  const sessionData = {
    ...req.body,
    userId,
  };
  
  try {
    const session = await storage.createUserSession(sessionData);
    res.json({ success: true, sessionId: session.sessionId });
  } catch (error) {
    console.error("Failed to create session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
}));

// Session end endpoint
router.post("/sessions/end", asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
  const userId = req.user?.claims?.sub || null;
  const { sessionId, exitPage  } = req.body || {};
  
  if (!sessionId) {
    return res.status(400).json({ error: "Missing sessionId" });
  }
  
  try {
    const endTime = new Date();
    
    // Get session to calculate duration - scoped to current user for security
    const sessions = await storage.getUserSessions(userId || undefined, { limit: 100 });
    const session = sessions.find(s => s.sessionId === sessionId);
    
    if (!session) {
      // Session not found or doesn't belong to this user
      return res.status(403).json({ error: "Session not found or access denied" });
    }
    
    if (session.startTime) {
      const duration = Math.floor((endTime.getTime() - new Date(session.startTime).getTime()) / 1000);
      
      // Only update sessions that belong to the current user
      await storage.updateUserSession(sessionId, {
        endTime,
        exitPage,
        duration,
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to end session:", error);
    res.status(500).json({ error: "Failed to end session" });
  }
}));

// Get Analytics Dashboard Stats
router.get("/dashboard", asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
  const { startDate, endDate } = req.query;
  
  const start = startDate ? new Date(startDate as string) : undefined;
  const end = endDate ? new Date(endDate as string) : undefined;
  
  try {
    const stats = await storage.getAnalyticsStats(start, end);
    res.json(stats);
  } catch (error) {
    console.error("Failed to get analytics stats:", error);
    res.status(500).json({ error: "Failed to get analytics stats" });
  }
}));

// Get Web Vitals statistics
router.get(
  "/stats",
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const { metric, days } = req.query;
    
    // Validate days parameter
    let daysNum = 7; // default
    if (days) {
      const parsed = parseInt(days as string);
      if (isNaN(parsed) || parsed < 1 || parsed > 365) {
        return res.status(400).json({
          error: "Invalid 'days' parameter. Must be a number between 1 and 365",
        });
      }
      daysNum = parsed;
    }
    
    const stats = await storage.getWebVitalsStats(metric as string | undefined, daysNum);
    res.json(stats);
  })
);

// Get API Health Metrics
router.get(
  "/api-health",
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const userId = req.user?.claims?.sub;
    const { days } = req.query;
    
    // Validate days parameter
    let daysNum = 7; // default
    if (days) {
      const parsed = parseInt(days as string);
      if (isNaN(parsed) || parsed < 1 || parsed > 365) {
        return res.status(400).json({
          error: "Invalid 'days' parameter. Must be a number between 1 and 365",
        });
      }
      daysNum = parsed;
    }
    
    // Get stats for all APIs if no userId, or user-specific stats
    const stats = userId 
      ? await storage.getApiUsageStats(userId, '', daysNum)  // Empty string for all APIs
      : { totalCalls: 0, successfulCalls: 0, failedCalls: 0 };
    
    // Calculate success rate
    const successRate = stats.totalCalls > 0
      ? (stats.successfulCalls / stats.totalCalls) * 100
      : 100;
    
    res.json({
      period: `${daysNum} days`,
      totalCalls: stats.totalCalls,
      successfulCalls: stats.successfulCalls,
      failedCalls: stats.failedCalls,
      successRate: successRate.toFixed(2),
      // These fields might not exist in basic stats, so we provide defaults
      apiBreakdown: (stats as any).apiBreakdown || {},
      errorTypes: (stats as any).errorTypes || {},
      averageResponseTime: (stats as any).averageResponseTime || null,
    });
  })
);

export default router;