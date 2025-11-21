/**
 * Trend Detection API Routes
 * 
 * Provides endpoints for automatic trend detection, pattern analysis, and alerts.
 * Uses TensorFlow.js for time series analysis and OpenAI for interpretation.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { analyticsStorage } from "../storage/index";
import { isAuthenticated, getAuthenticatedUserId } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { Request } from "express";
import { trendAnalyzer } from "../services/trend-analyzer.service";
import { openai } from "../openai";

const router = Router();

// Request validation schemas
const analyzeTrendsSchema = z.object({
  dataSource: z.enum(['analytics', 'feedback', 'inventory', 'recipes', 'all']).optional().default('all'),
  timeWindow: z.object({
    value: z.number().min(1).max(365),
    unit: z.enum(['hours', 'days', 'weeks', 'months'])
  }).optional().default({ value: 7, unit: 'days' }),
  minSampleSize: z.number().min(10).optional().default(50),
  includeInterpretation: z.boolean().optional().default(true),
});

const subscribeTrendsSchema = z.object({
  alertType: z.enum(['threshold', 'emergence', 'acceleration', 'peak', 'decline', 'anomaly']),
  conditions: z.object({
    minGrowthRate: z.number().min(0).optional(),
    minConfidence: z.number().min(0).max(1).optional(),
    keywords: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    trendTypes: z.array(z.string()).optional(),
  }),
  notificationChannels: z.array(z.enum(['email', 'push', 'in-app', 'webhook'])).optional(),
});

const acknowledgeTrendAlertSchema = z.object({
  alertId: z.string().min(1, "Alert ID is required"),
  actionTaken: z.string().optional(),
});

const trendFiltersSchema = z.object({
  status: z.union([z.string(), z.array(z.string())]).optional(),
  trendType: z.union([z.string(), z.array(z.string())]).optional(),
  minStrength: z.number().min(0).max(1).optional(),
  dateRange: z.object({
    start: z.string().transform(str => new Date(str)),
    end: z.string().transform(str => new Date(str))
  }).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

/**
 * GET /api/trends/current
 * Get current active trends
 */
router.get(
  "/current",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    try {
      const trends = await analyticsStorage.getCurrentTrends();
      
      res.json({
        success: true,
        trends,
        metadata: {
          count: trends.length,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error("Error getting current trends:", error);
      res.status(500).json({
        error: "Failed to get current trends",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/trends/emerging
 * Get newly detected emerging trends
 */
router.get(
  "/emerging",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    try {
      const trends = await analyticsStorage.getEmergingTrends();
      
      res.json({
        success: true,
        trends,
        metadata: {
          count: trends.length,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error("Error getting emerging trends:", error);
      res.status(500).json({
        error: "Failed to get emerging trends",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/trends/historical
 * Get historical trends within a date range
 */
router.get(
  "/historical",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({
        error: "Date range required",
        details: "Provide 'start' and 'end' query parameters",
      });
    }
    
    try {
      const dateRange = {
        start: new Date(start as string),
        end: new Date(end as string)
      };
      
      const trends = await analyticsStorage.getHistoricalTrends(dateRange);
      
      res.json({
        success: true,
        trends,
        metadata: {
          count: trends.length,
          dateRange,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error("Error getting historical trends:", error);
      res.status(500).json({
        error: "Failed to get historical trends",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * POST /api/trends/analyze
 * Trigger trend analysis on data
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
    const validation = analyzeTrendsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }
    
    const { dataSource, timeWindow, minSampleSize, includeInterpretation } = validation.data;
    
    try {
      // Analyze trends using the trend analyzer service
      const trends = await trendAnalyzer.analyzeTrends({
        dataSource,
        timeWindow,
        minSampleSize
      });
      
      // Add AI interpretation if requested
      if (includeInterpretation && trends.length > 0) {
        for (const trend of trends) {
          if (!trend.interpretation && openai) {
            try {
              const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{
                  role: "system",
                  content: "You are a trend analysis expert. Provide a brief, business-focused interpretation of the trend data."
                }, {
                  role: "user",
                  content: `Interpret this trend: ${trend.trendName} with ${trend.growthRate}% growth, strength ${trend.strength}. Keywords: ${trend.dataPoints?.keywords?.join(', ')}. Provide business impact and recommendations.`
                }],
                temperature: 0.7,
                max_tokens: 300
              });
              
              const interpretation = completion.choices[0]?.message?.content || "";
              const lines = interpretation.split('\n');
              
              // Parse AI response for structured data
              trend.interpretation = interpretation;
              trend.businessImpact = lines.find(l => l.toLowerCase().includes('impact')) || "";
              trend.recommendations = lines
                .filter(l => l.startsWith('-') || l.startsWith('•'))
                .map(l => l.replace(/^[-•]\s*/, ''));
            } catch (aiError) {
              console.error("Error getting AI interpretation:", aiError);
            }
          }
          
          // Update trend in storage
          await analyticsStorage.updateTrend(trend.id, trend);
        }
      }
      
      res.json({
        success: true,
        trends,
        metadata: {
          dataSource,
          timeWindow,
          minSampleSize,
          analyzedAt: new Date().toISOString(),
          trendsDetected: trends.length
        }
      });
    } catch (error) {
      console.error("Error analyzing trends:", error);
      res.status(500).json({
        error: "Failed to analyze trends",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * POST /api/trends/subscribe
 * Subscribe to trend alerts
 */
router.post(
  "/subscribe",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Validate request body
    const validation = subscribeTrendsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }
    
    const { alertType, conditions, notificationChannels } = validation.data;
    
    try {
      const alert = await analyticsStorage.subscribeTrendAlerts(userId, conditions, alertType);
      
      // Update notification channels if provided
      if (notificationChannels) {
        await analyticsStorage.updateTrendAlert(alert.id, {
          notificationChannels
        });
      }
      
      res.json({
        success: true,
        alert,
        message: "Successfully subscribed to trend alerts"
      });
    } catch (error) {
      console.error("Error subscribing to trend alerts:", error);
      res.status(500).json({
        error: "Failed to subscribe to trend alerts",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/trends/alerts
 * Get user's trend alert subscriptions
 */
router.get(
  "/alerts",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      const alerts = await analyticsStorage.getTrendAlerts(userId);
      
      res.json({
        success: true,
        alerts,
        metadata: {
          count: alerts.length,
          userId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error getting trend alerts:", error);
      res.status(500).json({
        error: "Failed to get trend alerts",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * POST /api/trends/alerts/acknowledge
 * Acknowledge a trend alert
 */
router.post(
  "/alerts/acknowledge",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Validate request body
    const validation = acknowledgeTrendAlertSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }
    
    const { alertId, actionTaken } = validation.data;
    
    try {
      await analyticsStorage.acknowledgeTrendAlert(alertId, actionTaken);
      
      res.json({
        success: true,
        message: "Alert acknowledged successfully"
      });
    } catch (error) {
      console.error("Error acknowledging trend alert:", error);
      res.status(500).json({
        error: "Failed to acknowledge trend alert",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/trends/:trendId
 * Get specific trend details
 */
router.get(
  "/:trendId",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const { trendId } = req.params;
    
    try {
      const trend = await analyticsStorage.getTrendById(trendId);
      
      if (!trend) {
        return res.status(404).json({
          error: "Trend not found"
        });
      }
      
      // Get related alerts
      const alerts = await analyticsStorage.getTrendAlertsByTrendId(trendId);
      
      res.json({
        success: true,
        trend,
        alerts,
        metadata: {
          trendId,
          alertCount: alerts.length,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error getting trend details:", error);
      res.status(500).json({
        error: "Failed to get trend details",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/trends
 * Get trends with filters
 */
router.get(
  "/",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    // Validate query parameters
    const validation = trendFiltersSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid filters",
        details: validation.error.errors,
      });
    }
    
    const filters = validation.data;
    
    try {
      const trends = await analyticsStorage.getTrends(filters);
      
      res.json({
        success: true,
        trends,
        metadata: {
          count: trends.length,
          filters,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error getting trends:", error);
      res.status(500).json({
        error: "Failed to get trends",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

export default router;