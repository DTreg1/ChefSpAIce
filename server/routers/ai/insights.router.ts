/**
 * AI Insights Router
 * 
 * Provides endpoints for generating and managing AI-powered insights
 * from analytics data.
 * 
 * Base path: /api/v1/ai/insights
 * 
 * @module server/routers/ai/insights.router
 */

import { Router, Request, Response } from "express";
import { storage } from "../../storage/index";
import { isAuthenticated, getAuthenticatedUserId } from "../../middleware/oauth.middleware";
import { asyncHandler } from "../../middleware/error.middleware";
import { AnalyticsService } from "../../services/analytics.service";

const router = Router();
const analyticsService = new AnalyticsService();

/**
 * POST /generate
 * Generate insights from data
 */
router.post("/generate", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { metricName, dataPoints, period } = req.body;

  if (!metricName || !dataPoints || !period) {
    return res.status(400).json({ error: "Missing required fields: metricName, dataPoints, period" });
  }

  try {
    const insight = await analyticsService.generateInsight(userId, {
      metricName,
      dataPoints,
      period
    });

    res.json(insight);
  } catch (error) {
    console.error("Failed to generate insight:", error);
    res.status(500).json({ error: "Failed to generate insight" });
  }
}));

/**
 * GET /daily
 * Get daily insight summary
 */
router.get("/daily", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const insights = await storage.platform.analytics.getDailyInsightSummary(userId);
    res.json(insights);
  } catch (error) {
    console.error("Failed to get daily insights:", error);
    res.status(500).json({ error: "Failed to get daily insights" });
  }
}));

/**
 * POST /explain
 * Explain specific metric
 */
router.post("/explain", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { metricName, context } = req.body;

  if (!metricName) {
    return res.status(400).json({ error: "Missing required field: metricName" });
  }

  try {
    const explanation = await analyticsService.explainMetric(userId, metricName, context);
    res.json({ explanation });
  } catch (error) {
    console.error("Failed to explain metric:", error);
    res.status(500).json({ error: "Failed to explain metric" });
  }
}));

/**
 * GET /
 * Get all insights
 */
router.get("/", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { type } = req.query;

  try {
    const insights = await storage.platform.analytics.getAnalyticsInsights(
      userId, 
      type as string | undefined
    );

    res.json(insights);
  } catch (error) {
    console.error("Failed to get insights:", error);
    res.status(500).json({ error: "Failed to get insights" });
  }
}));

/**
 * PATCH /:insightId/read
 * Mark insight as read
 */
router.patch("/:insightId/read", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { insightId } = req.params;

  try {
    await storage.platform.analytics.markInsightAsRead(insightId);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to mark insight as read:", error);
    res.status(500).json({ error: "Failed to mark insight as read" });
  }
}));

/**
 * GET /stats
 * Get analytics statistics
 */
router.get("/stats", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { type, period } = req.query;

  try {
    const validType = type as 'sessions' | 'events' | 'usage';
    const validPeriod = (period as 'day' | 'week' | 'month') || 'day';
    
    const stats = await storage.platform.analytics.getAnalyticsStats(
      validType || 'usage',
      userId,
      validPeriod
    );
    res.json(stats);
  } catch (error) {
    console.error("Failed to get analytics stats:", error);
    res.status(500).json({ error: "Failed to get analytics stats" });
  }
}));

/**
 * GET /trends
 * Get trend analysis
 */
router.get("/trends", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const trends = await storage.platform.analytics.getCurrentTrends();
    res.json(trends);
  } catch (error) {
    console.error("Failed to get trends:", error);
    res.status(500).json({ error: "Failed to get trends" });
  }
}));

/**
 * GET /predictions
 * Get user predictions
 */
router.get("/predictions", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { type } = req.query;

  try {
    const predictions = await storage.platform.analytics.getUserPredictions(
      userId,
      type as string | undefined
    );
    res.json(predictions);
  } catch (error) {
    console.error("Failed to get predictions:", error);
    res.status(500).json({ error: "Failed to get predictions" });
  }
}));

export default router;
