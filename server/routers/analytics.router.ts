import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { validateQuery, analyticsRateLimit } from "../middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { insertWebVitalSchema } from "@shared/schema";

const router = Router();

// Web Vitals Analytics endpoint
router.post("/", analyticsRateLimit, asyncHandler(async (req: any, res) => {
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

    // Record with retry logic
    let retries = 3;
    let lastError;
    
    while (retries > 0) {
      try {
        await storage.recordWebVital(validated);
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        retries--;
        if (retries > 0) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - retries) * 100));
        }
      }
    }
    
    if (retries === 0 && lastError) {
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

// Get Web Vitals statistics
router.get(
  "/stats",
  asyncHandler(async (req: any, res) => {
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
  asyncHandler(async (req: any, res) => {
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