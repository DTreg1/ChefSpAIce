import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { validateQuery, analyticsRateLimit } from "../middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { insertWebVitalSchema } from "@shared/schema";

const router = Router();

// Web Vitals Analytics endpoint
router.post("/analytics", analyticsRateLimit, asyncHandler(async (req: any, res) => {
  // Get user ID if authenticated, otherwise null for anonymous tracking
  const userId = req.user?.claims?.sub || null;

  // Capture request metadata
  const userAgent = req.headers["user-agent"] || null;
  const url = req.headers["referer"] || req.headers["origin"] || null;

  // Log the incoming data for debugging
  console.log("Analytics POST received:", {
    body: req.body,
    userId,
    userAgent: userAgent?.substring(0, 50),
    url
  });

  // Validate using Zod schema
  const validated = insertWebVitalSchema.parse({
    ...req.body,
    userId,
    metricId: req.body.id, // Map 'id' from web-vitals to 'metricId'
    navigationType: req.body.navigationType || null,
    userAgent,
    url,
  });

  await storage.recordWebVital(validated);

  res.status(200).json({ success: true });
}));

// Get Web Vitals statistics
router.get(
  "/analytics/stats",
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
  "/analytics/api-health",
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
    
    const stats = await storage.getApiUsageStats(userId, daysNum);
    
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