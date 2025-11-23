/**
 * Sentiment Analysis API Routes
 * 
 * Provides endpoints for analyzing text sentiment using TensorFlow.js and OpenAI.
 * Supports emotion detection, aspect-based sentiment, and trend analysis.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage/index";
import { isAuthenticated, adminOnly, getAuthenticatedUserId } from "../middleware/oauth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { Request } from "express";
import { sentimentService } from "../services/sentimentService";

const router = Router();

// Request validation schemas
const analyzeRequestSchema = z.object({
  content: z.string().min(1, "Content is required"),
  contentId: z.string().optional(),
  contentType: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const trendsRequestSchema = z.object({
  periodType: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const insightsRequestSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * POST /api/sentiment/analyze
 * Analyze text sentiment with emotion detection
 */
router.post(
  "/analyze",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate request body
    const validation = analyzeRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { content, contentId, contentType, metadata } = validation.data;

    try {
      // Check if content was already analyzed
      if (contentId) {
        const existing = await storage.platform.ai.getSentimentAnalysis(contentId);
        if (existing) {
          return res.json({
            success: true,
            analysis: existing,
            cached: true,
          });
        }
      }

      // Perform sentiment analysis
      const analysis = await sentimentService.analyzeSentiment({
        content,
        contentId: contentId || `content_${Date.now()}`,
        userId,
        contentType,
        metadata,
      });

      // Store the analysis
      const savedAnalysis = await storage.platform.ai.createSentimentAnalysis({
        ...analysis,
        userId,
        contentId: contentId || analysis.contentId,
        contentType: contentType || 'general',
        content,
      });

      // Update trends asynchronously (don't wait)
      sentimentService.updateTrends(userId, savedAnalysis).catch(err => {
        console.error("Failed to update trends:", err);
      });

      res.json({
        success: true,
        analysis: savedAnalysis,
        cached: false,
      });
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      res.status(500).json({
        error: "Failed to analyze sentiment",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/sentiment/user/:userId
 * Get user's sentiment history
 */
router.get(
  "/user/:userId",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const currentUserId = getAuthenticatedUserId(req);
    const requestedUserId = req.params.userId;
    
    if (!currentUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Users can only access their own sentiment history unless admin
    if (currentUserId !== requestedUserId) {
      const user = await storage.platform.ai.getUser(currentUserId);
      if (!user?.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
    }

    const limit = parseInt(req.query.limit as string) || 50;

    try {
      const analyses = await storage.platform.ai.getUserSentimentAnalyses(requestedUserId, limit);
      
      res.json({
        success: true,
        analyses,
        count: analyses.length,
      });
    } catch (error) {
      console.error("Failed to get user sentiment history:", error);
      res.status(500).json({
        error: "Failed to retrieve sentiment history",
      });
    }
  })
);

/**
 * GET /api/sentiment/trends
 * Get sentiment trends over time
 */
router.get(
  "/trends",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate query parameters
    const validation = trendsRequestSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { periodType, limit } = validation.data;
    const isGlobal = req.query.global === 'true';

    try {
      const trends = await storage.platform.ai.getSentimentTrends(
        isGlobal ? null : userId,
        periodType,
        limit || 30
      );

      res.json({
        success: true,
        trends,
        periodType: periodType || 'all',
        isGlobal,
      });
    } catch (error) {
      console.error("Failed to get sentiment trends:", error);
      res.status(500).json({
        error: "Failed to retrieve sentiment trends",
      });
    }
  })
);

/**
 * GET /api/sentiment/insights
 * Get sentiment insights dashboard data
 */
router.get(
  "/insights",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate query parameters
    const validation = insightsRequestSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { startDate, endDate } = validation.data;
    const user = await storage.platform.ai.getUser(userId);
    const isGlobal = req.query.global === 'true' && user?.isAdmin;

    try {
      const insights = await storage.platform.ai.getSentimentInsights(
        isGlobal ? undefined : userId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined
      );

      res.json({
        success: true,
        insights,
        period: {
          startDate: startDate || null,
          endDate: endDate || null,
        },
        isGlobal,
      });
    } catch (error) {
      console.error("Failed to get sentiment insights:", error);
      res.status(500).json({
        error: "Failed to retrieve sentiment insights",
      });
    }
  })
);

/**
 * GET /api/sentiment/analysis/:contentId
 * Get sentiment analysis for specific content
 */
router.get(
  "/analysis/:contentId",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const { contentId } = req.params;

    try {
      const analysis = await storage.platform.ai.getSentimentAnalysis(contentId);
      
      if (!analysis) {
        return res.status(404).json({
          error: "Sentiment analysis not found",
        });
      }

      // Check if user has access to this analysis
      const userId = getAuthenticatedUserId(req);
      if (analysis.userId !== userId) {
        if (!userId) {
          return res.status(401).json({ error: "Authentication required" });
        }
        const user = await storage.platform.ai.getUser(userId);
        if (!user?.isAdmin) {
          return res.status(403).json({ error: "Access denied" });
        }
      }

      res.json({
        success: true,
        analysis,
      });
    } catch (error) {
      console.error("Failed to get sentiment analysis:", error);
      res.status(500).json({
        error: "Failed to retrieve sentiment analysis",
      });
    }
  })
);

/**
 * GET /api/sentiment/dashboard
 * Get main metrics dashboard data
 */
router.get(
  "/dashboard",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { period, periodType } = req.query;

    try {
      // Get latest metrics or for specific period
      let metrics;
      if (period && periodType) {
        const [result] = await storage.platform.ai.getSentimentMetrics(
          period as string,
          periodType as "day" | "week" | "month"
        );
        metrics = result;
      } else {
        metrics = await storage.platform.ai.getLatestSentimentMetrics();
      }

      if (!metrics) {
        return res.status(404).json({
          error: "No sentiment metrics found",
        });
      }

      // Get active alerts
      const alerts = await storage.platform.ai.getSentimentAlerts("active", 5);

      // Get segment breakdown if available
      const segments = period
        ? await storage.platform.ai.getSentimentSegments(period as string)
        : [];

      res.json({
        success: true,
        metrics,
        alerts,
        segments,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to get sentiment dashboard:", error);
      res.status(500).json({
        error: "Failed to retrieve dashboard data",
      });
    }
  })
);

/**
 * GET /api/sentiment/alerts/active
 * Get active sentiment alerts
 */
router.get(
  "/alerts/active",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const limit = parseInt(req.query.limit as string) || 20;

    try {
      const alerts = await storage.platform.ai.getSentimentAlerts("active", limit);

      res.json({
        success: true,
        alerts,
        count: alerts.length,
      });
    } catch (error) {
      console.error("Failed to get active alerts:", error);
      res.status(500).json({
        error: "Failed to retrieve active alerts",
      });
    }
  })
);

/**
 * POST /api/sentiment/alerts/config
 * Configure alert thresholds
 */
router.post(
  "/alerts/config",
  isAuthenticated,
  adminOnly,
  asyncHandler(async (req: Request, res) => {
    const { alertType, threshold, severity } = req.body;

    if (!alertType || !threshold || !severity) {
      return res.status(400).json({
        error: "Missing required fields: alertType, threshold, severity",
      });
    }

    try {
      // Create new alert configuration
      const alert = await storage.platform.ai.createSentimentAlert({
        alertType,
        threshold,
        currentValue: threshold, // Will be updated when triggered
        severity,
        message: `Alert configured for ${alertType} with threshold ${threshold}`,
        metadata: {
          suggestedActions: [`Monitor ${alertType} patterns`, 'Review threshold if needed'],
        },
      });

      res.json({
        success: true,
        alert,
        message: "Alert threshold configured successfully",
      });
    } catch (error) {
      console.error("Failed to configure alert:", error);
      res.status(500).json({
        error: "Failed to configure alert threshold",
      });
    }
  })
);

/**
 * PATCH /api/sentiment/alerts/:alertId
 * Update alert status (acknowledge or resolve)
 */
router.patch(
  "/alerts/:alertId",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { alertId } = req.params;
    const { status } = req.body;

    if (!status || !["acknowledged", "resolved"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Must be 'acknowledged' or 'resolved'",
      });
    }

    try {
      const update: any = { status };
      
      if (status === "acknowledged") {
        update.acknowledgedBy = userId;
        update.acknowledgedAt = new Date();
      } else if (status === "resolved") {
        update.resolvedAt = new Date();
      }

      const updatedAlert = await storage.platform.ai.updateSentimentAlert(alertId, update);

      res.json({
        success: true,
        alert: updatedAlert,
        message: `Alert ${status} successfully`,
      });
    } catch (error) {
      console.error("Failed to update alert:", error);
      res.status(500).json({
        error: "Failed to update alert status",
      });
    }
  })
);

/**
 * GET /api/sentiment/breakdown
 * Get sentiment breakdown by category/feature
 */
router.get(
  "/breakdown",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { period, periodType } = req.query;

    if (!period || !periodType) {
      return res.status(400).json({
        error: "Period and periodType are required",
      });
    }

    try {
      const breakdown = await storage.platform.ai.getSentimentBreakdown(
        period as string,
        periodType as "day" | "week" | "month"
      );

      res.json({
        success: true,
        breakdown,
        period,
        periodType,
      });
    } catch (error) {
      console.error("Failed to get sentiment breakdown:", error);
      res.status(500).json({
        error: "Failed to retrieve sentiment breakdown",
      });
    }
  })
);

/**
 * GET /api/sentiment/report
 * Generate sentiment report with insights
 */
router.get(
  "/report",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { period, periodType } = req.query;

    if (!period || !periodType) {
      return res.status(400).json({
        error: "Period and periodType are required",
      });
    }

    try {
      const report = await storage.platform.ai.generateSentimentReport(
        period as string,
        periodType as "day" | "week" | "month"
      );

      res.json({
        success: true,
        report,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to generate sentiment report:", error);
      res.status(500).json({
        error: "Failed to generate sentiment report",
      });
    }
  })
);

/**
 * POST /api/sentiment/batch
 * Analyze multiple texts in batch
 */
router.post(
  "/batch",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "Items array is required",
      });
    }

    if (items.length > 100) {
      return res.status(400).json({
        error: "Maximum 100 items per batch",
      });
    }

    try {
      const results = await Promise.all(
        items.map(async (item) => {
          try {
            // Analyze sentiment
            const analysis = await sentimentService.analyzeSentiment({
              content: item.content,
              contentId: item.contentId || `batch_${Date.now()}_${Math.random()}`,
              userId,
              contentType: item.contentType,
              metadata: item.metadata,
            });

            // Store the analysis
            const savedAnalysis = await storage.platform.ai.createSentimentAnalysis({
              ...analysis,
              userId,
              contentId: item.contentId || analysis.contentId,
              contentType: item.contentType || 'batch',
              content: item.content,
            });

            return {
              success: true,
              contentId: item.contentId,
              analysis: savedAnalysis,
            };
          } catch (error) {
            return {
              success: false,
              contentId: item.contentId,
              error: error instanceof Error ? error.message : "Analysis failed",
            };
          }
        })
      );

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      res.json({
        success: true,
        results,
        summary: {
          total: items.length,
          successful,
          failed,
        },
      });
    } catch (error) {
      console.error("Batch sentiment analysis error:", error);
      res.status(500).json({
        error: "Failed to process batch analysis",
      });
    }
  })
);

export default router;