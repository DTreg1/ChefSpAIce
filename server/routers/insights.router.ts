import { Router, Request, Response } from "express";
import { storage } from "../storage/index";
import { isAuthenticated, getAuthenticatedUserId } from "../middleware/oauth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { insertAnalyticsInsightSchema, insertInsightFeedbackSchema } from "@shared/schema";
import { AnalyticsService } from "../services/analytics.service";

const router = Router();
const analyticsService = new AnalyticsService();

// Generate insights from data
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

// Get daily insight summary
router.get("/daily", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { date } = req.query;

  try {
    const insights = await storage.platform.analytics.getDailyInsightSummary(userId, date as string);
    res.json(insights);
  } catch (error) {
    console.error("Failed to get daily insights:", error);
    res.status(500).json({ error: "Failed to get daily insights" });
  }
}));

// Explain specific metric
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

// Get all insights
router.get("/", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { metricName, period, category, importance, isRead, limit } = req.query;

  try {
    const insights = await storage.platform.analytics.getAnalyticsInsights(userId, {
      metricName: metricName as string,
      period: period as string,
      category: category as string,
      importance: importance ? parseInt(importance as string) : undefined,
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      limit: limit ? parseInt(limit as string) : 50
    });

    res.json(insights);
  } catch (error) {
    console.error("Failed to get insights:", error);
    res.status(500).json({ error: "Failed to get insights" });
  }
}));

// Mark insight as read
router.patch("/:insightId/read", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { insightId } = req.params;

  try {
    await storage.platform.analytics.markInsightAsRead(userId, insightId);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to mark insight as read:", error);
    res.status(500).json({ error: "Failed to mark insight as read" });
  }
}));

// Submit feedback for an insight
router.post("/:insightId/feedback", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { insightId } = req.params;
  const { helpfulScore, comments, wasActionable, resultOutcome } = req.body;

  if (!helpfulScore || helpfulScore < 1 || helpfulScore > 5) {
    return res.status(400).json({ error: "helpfulScore must be between 1 and 5" });
  }

  try {
    const feedback = await storage.platform.analytics.createInsightFeedback({
      insightId,
      userId,
      helpfulScore,
      comments,
      wasActionable,
      resultOutcome
    });

    res.json(feedback);
  } catch (error) {
    console.error("Failed to submit feedback:", error);
    res.status(500).json({ error: "Failed to submit feedback" });
  }
}));

// Get feedback for an insight
router.get("/:insightId/feedback", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const { insightId } = req.params;

  try {
    const feedback = await storage.platform.analytics.getInsightFeedback(insightId);
    res.json(feedback);
  } catch (error) {
    console.error("Failed to get feedback:", error);
    res.status(500).json({ error: "Failed to get feedback" });
  }
}));

// Subscribe to insights
router.post("/subscribe", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { subscriptionType } = req.body;

  if (!subscriptionType || !['all', 'important', 'none'].includes(subscriptionType)) {
    return res.status(400).json({ error: "Invalid subscription type. Must be 'all', 'important', or 'none'" });
  }

  try {
    await storage.platform.analytics.subscribeToInsights(userId, subscriptionType);
    res.json({ success: true, subscriptionType });
  } catch (error) {
    console.error("Failed to update subscription:", error);
    res.status(500).json({ error: "Failed to update subscription" });
  }
}));

// Get analytics statistics
router.get("/stats", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const stats = await storage.platform.analytics.getAnalyticsStats(userId);
    res.json(stats);
  } catch (error) {
    console.error("Failed to get analytics stats:", error);
    res.status(500).json({ error: "Failed to get analytics stats" });
  }
}));

export default router;