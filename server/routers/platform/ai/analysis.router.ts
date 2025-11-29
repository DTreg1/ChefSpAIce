/**
 * AI Analysis Router
 *
 * Consolidated router for all AI analysis services including:
 * - Sentiment analysis
 * - Trend detection and monitoring
 * - Predictive analytics
 * - Data extraction and insights
 *
 * Base path: /api/ai/analysis
 */

import { Router, Request, Response } from "express";
import {
  isAuthenticated,
  adminOnly,
  getAuthenticatedUserId,
} from "../../../middleware/oauth.middleware";
import { storage } from "../../../storage/index";
import { z } from "zod";
import { getOpenAIClient } from "../../../config/openai-config";
import { asyncHandler } from "../../../middleware/error.middleware";
import { sentimentService } from "../../../services/sentiment.service";
import { trendAnalyzer } from "../../../services/trend-analyzer.service";
import { predictionService } from "../../../services/prediction.service";
import { rateLimiters } from "../../../middleware/rateLimit";
import {
  AIError,
  handleOpenAIError,
  retryWithBackoff,
  createErrorResponse,
} from "../../../utils/ai-error-handler";
import { getCircuitBreaker } from "../../../utils/circuit-breaker";

const router = Router();

// Initialize OpenAI client
const openai = getOpenAIClient();

// Circuit breaker for OpenAI calls
const openaiBreaker = getCircuitBreaker("openai-analysis");

// ==================== VALIDATION SCHEMAS ====================

// Sentiment Analysis
const analyzeRequestSchema = z.object({
  content: z.string().min(1, "Content is required"),
  contentId: z.string().optional(),
  contentType: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const sentimentTrendsSchema = z.object({
  periodType: z
    .enum(["hour", "day", "week", "month", "quarter", "year"])
    .optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Trend Analysis
const analyzeTrendsSchema = z.object({
  dataSource: z
    .enum(["analytics", "feedback", "inventory", "recipes", "all"])
    .optional()
    .default("all"),
  timeWindow: z
    .object({
      value: z.number().min(1).max(365),
      unit: z.enum(["hours", "days", "weeks", "months"]),
    })
    .optional()
    .default({ value: 7, unit: "days" }),
  minSampleSize: z.number().min(10).optional().default(50),
  includeInterpretation: z.boolean().optional().default(true),
});

const subscribeTrendsSchema = z.object({
  alertType: z.enum([
    "threshold",
    "emergence",
    "acceleration",
    "peak",
    "decline",
    "anomaly",
  ]),
  conditions: z.object({
    minGrowthRate: z.number().min(0).optional(),
    minConfidence: z.number().min(0).max(1).optional(),
    keywords: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    trendTypes: z.array(z.string()).optional(),
  }),
  notificationChannels: z
    .array(z.enum(["email", "push", "in-app", "webhook"]))
    .optional(),
});

// Predictions
const predictUserSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  predictionTypes: z
    .array(
      z.enum([
        "churn_risk",
        "next_action",
        "engagement_drop",
        "feature_adoption",
      ]),
    )
    .optional(),
  includeFactors: z.boolean().optional(),
});

const churnPredictionSchema = z.object({
  threshold: z.number().min(0).max(1).optional().default(0.8),
  limit: z.number().int().min(1).max(100).optional().default(20),
  includeInterventions: z.boolean().optional().default(true),
});

// Data Extraction
const extractionSchema = z.object({
  text: z.string().min(1).max(50000),
  extractionType: z
    .enum(["entities", "keywords", "structured", "summary"])
    .default("entities"),
  template: z
    .object({
      fields: z.array(
        z.object({
          name: z.string(),
          type: z.enum(["text", "number", "date", "boolean", "array"]),
          description: z.string().optional(),
          required: z.boolean().optional(),
        }),
      ),
    })
    .optional(),
});

// ==================== SENTIMENT ANALYSIS ENDPOINTS ====================

/**
 * POST /api/ai/analysis/sentiment
 * Analyze text sentiment with emotion detection
 */
router.post(
  "/sentiment",
  isAuthenticated,
  rateLimiters.openai.middleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const validation = analyzeRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { content, contentId, contentType, metadata } = validation.data;

    try {
      // Perform sentiment analysis using the sentimentService
      const analysis = await sentimentService.analyzeSentiment({
        content,
        contentId: contentId || `content_${Date.now()}`,
        userId,
        contentType,
        metadata,
      });

      res.json({
        success: true,
        analysis,
        cached: false,
      });
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      const aiError = handleOpenAIError(error as Error);
      res.status(aiError.statusCode).json(createErrorResponse(aiError));
    }
  }),
);

/**
 * GET /api/ai/analysis/sentiment/trends
 * Get sentiment trends over time
 */
router.get(
  "/sentiment/trends",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const validation = sentimentTrendsSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { periodType = "day", limit = 30 } = validation.data;

    try {
      // Get trends from analytics storage
      const trends = await storage.platform.analytics.getTrends(
        undefined,
        "active",
      );

      res.json({
        success: true,
        trends: trends.slice(0, limit),
        metadata: {
          periodType,
          limit,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Sentiment trends error:", error);
      res.status(500).json({
        error: "Failed to get sentiment trends",
      });
    }
  }),
);

/**
 * GET /api/ai/analysis/sentiment/insights
 * Get AI-generated insights from sentiment data
 */
router.get(
  "/sentiment/insights",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      // Get insights from analytics storage
      const insights =
        await storage.platform.analytics.getAnalyticsInsights(userId);

      res.json({
        success: true,
        insights,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Sentiment insights error:", error);
      res.status(500).json({
        error: "Failed to generate insights",
      });
    }
  }),
);

// ==================== TREND ANALYSIS ENDPOINTS ====================

/**
 * GET /api/ai/analysis/trends/current
 * Get current active trends
 */
router.get(
  "/trends/current",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const trends = await storage.platform.analytics.getCurrentTrends();

      res.json({
        success: true,
        trends,
        metadata: {
          count: trends.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error getting current trends:", error);
      res.status(500).json({
        error: "Failed to get current trends",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }),
);

/**
 * GET /api/ai/analysis/trends/emerging
 * Get emerging trends that are gaining momentum
 */
router.get(
  "/trends/emerging",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const emergingTrends =
        await storage.platform.analytics.getEmergingTrends();

      res.json({
        success: true,
        trends: emergingTrends,
        metadata: {
          count: emergingTrends.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error getting emerging trends:", error);
      res.status(500).json({
        error: "Failed to get emerging trends",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }),
);

/**
 * POST /api/ai/analysis/trends/analyze
 * Analyze data to detect new trends
 */
router.post(
  "/trends/analyze",
  isAuthenticated,
  rateLimiters.openai.middleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const validation = analyzeTrendsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { dataSource, timeWindow, minSampleSize, includeInterpretation } =
      validation.data;

    try {
      // Trigger trend analysis
      const results = await trendAnalyzer.analyzeTrends({
        dataSource,
        timeWindow,
        minSampleSize,
      });

      // Get trends array from results
      const trendsArray = Array.isArray(results)
        ? results
        : (results as any).trends || [];

      // Get AI interpretation if requested
      let interpretation = null;
      if (includeInterpretation && trendsArray.length > 0 && openai) {
        try {
          const prompt = `Analyze these detected trends and provide business insights:
${JSON.stringify(trendsArray.slice(0, 5), null, 2)}

Provide:
1. Key insights from these trends
2. Recommended actions
3. Potential opportunities
4. Risk factors to monitor

Format as JSON with fields: insights, recommendations, opportunities, risks.`;

          const completion = await openaiBreaker.execute(async () => {
            return await openai!.chat.completions.create({
              model: "gpt-4o",
              messages: [{ role: "user", content: prompt }],
              max_tokens: 1000,
              temperature: 0.5,
              response_format: { type: "json_object" },
            });
          });

          interpretation = JSON.parse(
            completion.choices[0]?.message?.content || "{}",
          );
        } catch (aiError) {
          console.error("Error getting AI interpretation:", aiError);
        }
      }

      // Save detected trends to storage
      for (const trend of trendsArray) {
        await storage.platform.analytics.createTrend({
          trendName: trend.name || `Trend ${Date.now()}`,
          trendType: trend.type || "increasing",
          metric: trend.metric || "unknown",
          currentValue: trend.currentValue || 0,
          previousValue: trend.previousValue || 0,
          changePercent: trend.changePercent || 0,
          timePeriod: trend.period || "day",
          significance: trend.significance || 0.5,
          detectedAt: new Date(),
        });
      }

      res.json({
        success: true,
        results,
        interpretation,
        metadata: {
          analyzedAt: new Date().toISOString(),
          dataSource,
          timeWindow,
        },
      });
    } catch (error) {
      console.error("Trend analysis error:", error);
      const aiError = handleOpenAIError(error as Error);
      res.status(aiError.statusCode).json(createErrorResponse(aiError));
    }
  }),
);

/**
 * POST /api/ai/analysis/trends/subscribe
 * Subscribe to trend alerts
 */
router.post(
  "/trends/subscribe",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const validation = subscribeTrendsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const {
      alertType,
      conditions,
      notificationChannels = ["in-app"],
    } = validation.data;

    try {
      // Map alertType to match schema requirements
      const mappedAlertType =
        alertType === "threshold"
          ? "threshold_exceeded"
          : alertType === "peak"
            ? "emergence"
            : alertType === "decline"
              ? "emergence"
              : (alertType as
                  | "emergence"
                  | "acceleration"
                  | "anomaly"
                  | "prediction"
                  | "threshold_exceeded");

      const alert = await storage.platform.analytics.createTrendAlert({
        userId,
        alertType: mappedAlertType,
        trendId: `trend_${Date.now()}`,
        alertLevel: "info",
        message: `Alert for ${alertType}`,
        conditions: conditions as Record<string, [any, ...any[]]>,
        isActive: true,
      });

      res.json({
        success: true,
        alert,
      });
    } catch (error) {
      console.error("Error creating trend subscription:", error);
      res.status(500).json({
        error: "Failed to create trend subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }),
);

// ==================== PREDICTIVE ANALYTICS ENDPOINTS ====================

/**
 * GET /api/ai/analysis/predict/user/:userId
 * Get predictions for a specific user
 */
router.get(
  "/predict/user/:userId",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const requestingUserId = getAuthenticatedUserId(req);
    if (!requestingUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { userId } = req.params;
    const { predictionTypes, includeFactors } = req.query;

    try {
      // Get user predictions from storage
      const predictionType = predictionTypes
        ? (predictionTypes as string[])[0]
        : undefined;
      const predictions = await storage.platform.analytics.getUserPredictions(
        userId,
        predictionType,
      );

      // If no recent predictions, generate new ones
      if (
        predictions.length === 0 ||
        predictions.every(
          (p: any) =>
            new Date(p.createdAt).getTime() < Date.now() - 24 * 60 * 60 * 1000,
        )
      ) {
        const newPredictions =
          await predictionService.generateUserPredictions(userId);
        predictions.push(...newPredictions);
      }

      res.json({
        success: true,
        predictions,
        metadata: {
          userId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Prediction error:", error);
      res.status(500).json({
        error: "Failed to get user predictions",
      });
    }
  }),
);

/**
 * POST /api/ai/analysis/predict/churn
 * Predict churn risk for users
 */
router.post(
  "/predict/churn",
  isAuthenticated,
  rateLimiters.openai.middleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const requestingUserId = getAuthenticatedUserId(req);
    if (!requestingUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const validation = churnPredictionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { threshold, limit, includeInterventions } = validation.data;

    try {
      // Get high churn risk users from storage
      const predictions =
        await storage.platform.analytics.getChurnRiskUsers(threshold);

      // Generate interventions if requested
      let interventions: Record<string, any> = {};
      if (includeInterventions && predictions.length > 0) {
        for (const pred of predictions.slice(0, Math.min(5, limit))) {
          const intervention = await predictionService.generateIntervention(pred as any);
          interventions[pred.userId] = intervention;
        }
      }

      res.json({
        success: true,
        predictions,
        interventions: includeInterventions ? interventions : undefined,
        metadata: {
          threshold,
          totalHighRisk: predictions.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Churn prediction error:", error);
      const aiError = handleOpenAIError(error as Error);
      res.status(aiError.statusCode).json(createErrorResponse(aiError));
    }
  }),
);

/**
 * GET /api/ai/analysis/predict/segments
 * Get user segments based on predictive analysis
 */
router.get(
  "/predict/segments",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const segments = await predictionService.getUserSegments();

      res.json({
        success: true,
        segments,
        metadata: {
          totalSegments: segments.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Segmentation error:", error);
      res.status(500).json({
        error: "Failed to get user segments",
      });
    }
  }),
);

// ==================== DATA EXTRACTION ENDPOINTS ====================

/**
 * POST /api/ai/analysis/extract
 * Extract structured data from unstructured text
 */
router.post(
  "/extract",
  isAuthenticated,
  rateLimiters.openai.middleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!openai) {
      return res.status(503).json({
        error: "AI service not configured",
        message: "OpenAI API key is required for this feature.",
      });
    }

    const validation = extractionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { text, extractionType, template } = validation.data;

    try {
      let prompt = "";
      let responseFormat: any = undefined;

      switch (extractionType) {
        case "entities":
          prompt = `Extract all named entities from this text:
"${text}"

Identify and categorize:
- People names
- Organization names
- Locations
- Dates and times
- Products or services
- Quantities and measurements

Format as JSON with fields: people, organizations, locations, dates, products, quantities.`;
          responseFormat = { type: "json_object" };
          break;

        case "keywords":
          prompt = `Extract the key topics and keywords from this text:
"${text}"

Identify:
- Main topics (3-5)
- Key terms and phrases
- Important concepts
- Relevant categories

Format as JSON with fields: topics, keywords, concepts, categories.`;
          responseFormat = { type: "json_object" };
          break;

        case "structured":
          if (!template) {
            return res
              .status(400)
              .json({ error: "Template required for structured extraction" });
          }
          prompt = `Extract structured data from this text according to the template:
"${text}"

Template fields:
${JSON.stringify(template.fields, null, 2)}

Extract the values for each field and format as JSON.`;
          responseFormat = { type: "json_object" };
          break;

        case "summary":
          prompt = `Extract and summarize the key information from this text:
"${text}"

Provide:
- Main points (3-5 bullet points)
- Key facts and figures
- Important conclusions
- Action items if any

Format as JSON with fields: mainPoints, facts, conclusions, actionItems.`;
          responseFormat = { type: "json_object" };
          break;
      }

      const completion = await openaiBreaker.execute(async () => {
        return await openai!.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1500,
          temperature: 0.3,
          response_format: responseFormat,
        });
      });

      const extractedData = JSON.parse(
        completion.choices[0]?.message?.content || "{}",
      );

      // Save extraction to storage using createExtractedData
      const extraction = await storage.platform.ai.createExtractedData({
        sourceId: `text_${Date.now()}`,
        sourceType: "document",
        templateId: null,
        inputText: text,
        extractedFields: extractedData,
        confidence: 0.95,
        validationStatus: "pending",
      });

      res.json({
        success: true,
        extractionId: extraction.id,
        extractedData,
        metadata: {
          extractionType,
          textLength: text.length,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Data extraction error:", error);
      const aiError = handleOpenAIError(error as Error);
      res.status(aiError.statusCode).json(createErrorResponse(aiError));
    }
  }),
);

/**
 * GET /api/ai/analysis/insights
 * Get AI-generated insights from analytics data
 */
router.get(
  "/insights",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      // Get recent analytics events
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentData = await storage.platform.analytics.getAnalyticsEvents(
        userId,
        undefined,
        thirtyDaysAgo,
      );

      if (!openai) {
        // Return basic insights without AI
        return res.json({
          success: true,
          insights: {
            summary: "AI insights not available - OpenAI not configured",
            trends: [],
            recommendations: [],
          },
        });
      }

      const prompt = `Analyze this analytics data and provide actionable insights:
${JSON.stringify(recentData, null, 2)}

Provide:
1. Executive summary (2-3 sentences)
2. Key trends identified
3. Actionable recommendations
4. Areas of concern

Format as JSON with fields: summary, trends (array), recommendations (array), concerns (array).`;

      const completion = await openaiBreaker.execute(async () => {
        return await openai!.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1500,
          temperature: 0.5,
          response_format: { type: "json_object" },
        });
      });

      const insights = JSON.parse(
        completion.choices[0]?.message?.content || "{}",
      );

      res.json({
        success: true,
        insights,
        metadata: {
          dataRange: "last_30_days",
          generatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Insights generation error:", error);
      const aiError = handleOpenAIError(error as Error);
      res.status(aiError.statusCode).json(createErrorResponse(aiError));
    }
  }),
);

/**
 * GET /api/ai/analysis/stats
 * Get analysis service usage statistics
 */
router.get(
  "/stats",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      // Get usage stats from various services
      const trends = await storage.platform.analytics.getTrends();
      const predictions =
        await storage.platform.analytics.getUserPredictions(userId);
      const insights =
        await storage.platform.analytics.getAnalyticsInsights(userId);

      res.json({
        success: true,
        stats: {
          sentimentAnalyses: insights.length,
          trendsDetected: trends.length,
          predictionsMade: predictions.length,
        },
        endpoints: {
          sentiment: "/api/ai/analysis/sentiment/*",
          trends: "/api/ai/analysis/trends/*",
          predictions: "/api/ai/analysis/predict/*",
          extraction: "/api/ai/analysis/extract",
          insights: "/api/ai/analysis/insights",
        },
        metadata: {
          userId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error getting analysis stats:", error);
      res.status(500).json({
        error: "Failed to get analysis statistics",
      });
    }
  }),
);

// ==================== INSIGHTS ENDPOINTS ====================

/**
 * POST /api/ai/analysis/insights/generate
 * Generate insights from data
 */
router.post(
  "/insights/generate",
  isAuthenticated,
  rateLimiters.openai.middleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { metricName, dataPoints, period } = req.body;

    if (!metricName || !dataPoints || !period) {
      return res.status(400).json({
        error: "Missing required fields: metricName, dataPoints, period",
      });
    }

    try {
      if (!openai) {
        return res.status(503).json({ error: "AI service not configured" });
      }

      const prompt = `Analyze the following data and generate insights:
Metric: ${metricName}
Period: ${period}
Data points: ${JSON.stringify(dataPoints)}

Provide:
1. Trend analysis
2. Key observations
3. Recommendations
4. Anomalies or concerns

Format as JSON with fields: trend, observations, recommendations, anomalies.`;

      const completion = await openaiBreaker.execute(async () => {
        return await openai!.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
          temperature: 0.5,
          response_format: { type: "json_object" },
        });
      });

      const insight = JSON.parse(
        completion.choices[0]?.message?.content || "{}",
      );

      // Store the insight using createAnalyticsInsight
      const savedInsight =
        await storage.platform.analytics.createAnalyticsInsight({
          insightType: "trend",
          title: `Analysis of ${metricName}`,
          description:
            insight.observations?.[0] || "No significant observations",
          category: "analytics",
          severity: insight.anomalies?.length > 0 ? "warning" : "info",
          metrics: insight,
          recommendations: insight.recommendations || [],
          isRead: false,
          isActionable: true,
        });

      res.json({
        id: savedInsight.id,
        ...insight,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to generate insight:", error);
      const aiError = handleOpenAIError(error as Error);
      res.status(aiError.statusCode).json(createErrorResponse(aiError));
    }
  }),
);

/**
 * GET /api/ai/analysis/insights/daily
 * Get daily insight summary
 */
router.get(
  "/insights/daily",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const insights =
        await storage.platform.analytics.getDailyInsightSummary(userId);
      res.json(insights);
    } catch (error) {
      console.error("Failed to get daily insights:", error);
      res.status(500).json({ error: "Failed to get daily insights" });
    }
  }),
);

/**
 * POST /api/ai/analysis/insights/explain
 * Explain specific metric
 */
router.post(
  "/insights/explain",
  isAuthenticated,
  rateLimiters.openai.middleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { metricName, context } = req.body;

    if (!metricName) {
      return res
        .status(400)
        .json({ error: "Missing required field: metricName" });
    }

    try {
      if (!openai) {
        return res.status(503).json({ error: "AI service not configured" });
      }

      const prompt = `Explain the following metric in simple terms:
Metric: ${metricName}
${context ? `Context: ${JSON.stringify(context)}` : ""}

Provide a clear, concise explanation that:
1. Explains what this metric measures
2. Why it matters
3. How to interpret the values
4. Actions to improve it

Format as JSON with fields: definition, importance, interpretation, actions.`;

      const completion = await openaiBreaker.execute(async () => {
        return await openai!.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 500,
          temperature: 0.3,
          response_format: { type: "json_object" },
        });
      });

      const explanation = JSON.parse(
        completion.choices[0]?.message?.content || "{}",
      );
      res.json({ explanation });
    } catch (error) {
      console.error("Failed to explain metric:", error);
      const aiError = handleOpenAIError(error as Error);
      res.status(aiError.statusCode).json(createErrorResponse(aiError));
    }
  }),
);

/**
 * GET /api/ai/analysis/insights/all
 * Get all insights
 */
router.get(
  "/insights/all",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { type } = req.query;

    try {
      const insights = await storage.platform.analytics.getAnalyticsInsights(
        userId,
        type as string | undefined,
      );

      res.json(insights);
    } catch (error) {
      console.error("Failed to get insights:", error);
      res.status(500).json({ error: "Failed to get insights" });
    }
  }),
);

/**
 * PATCH /api/ai/analysis/insights/:insightId/read
 * Mark insight as read
 */
router.patch(
  "/insights/:insightId/read",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { insightId } = req.params;

    try {
      await storage.platform.analytics.markInsightAsRead(insightId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to mark insight as read:", error);
      res.status(500).json({ error: "Failed to mark insight as read" });
    }
  }),
);

/**
 * GET /api/ai/analysis/insights/predictions
 * Get user predictions
 */
router.get(
  "/insights/predictions",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { type } = req.query;

    try {
      const predictions = await storage.platform.analytics.getUserPredictions(
        userId,
        type as string | undefined,
      );
      res.json(predictions);
    } catch (error) {
      console.error("Failed to get predictions:", error);
      res.status(500).json({ error: "Failed to get predictions" });
    }
  }),
);

// ==================== RECOMMENDATIONS/EMBEDDINGS ENDPOINTS ====================

/**
 * GET /api/ai/analysis/recommendations/user/:userId
 * Get personalized content recommendations for a user
 */
router.get(
  "/recommendations/user/:userId",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const requestingUserId = getAuthenticatedUserId(req);
    if (!requestingUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { userId } = req.params;
    const { type = "article", limit = 10 } = req.query;

    // Ensure users can only get their own recommendations
    if (requestingUserId !== userId) {
      return res
        .status(403)
        .json({ error: "Forbidden: Can only access your own recommendations" });
    }

    const schema = z.object({
      userId: z.string().min(1),
      type: z.string().min(1),
      limit: z.coerce.number().min(1).max(50).default(10),
    });

    try {
      const validated = schema.parse({ userId, type, limit });

      // Import and use embeddings service
      const { EmbeddingsService } = await import("../../../services/embeddings.service");
      const embeddingsService = new EmbeddingsService(storage.platform.content);

      const recommendations =
        await embeddingsService.getPersonalizedRecommendations(
          validated.userId,
          validated.type,
          validated.limit,
        );

      res.json({
        success: true,
        userId: validated.userId,
        recommendations,
        count: recommendations.length,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid parameters",
          details: error.errors,
        });
      }

      console.error("Error fetching recommendations:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch recommendations",
      });
    }
  }),
);

/**
 * GET /api/ai/analysis/content/:id/related
 * Get semantically similar content based on embeddings
 */
router.get(
  "/content/:id/related",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Authentication required" });

    const { id } = req.params;
    const { type = "article", limit = 10 } = req.query;

    const schema = z.object({
      id: z.string().min(1),
      type: z.string().min(1),
      limit: z.coerce.number().min(1).max(50).default(10),
    });

    try {
      const validated = schema.parse({ id, type, limit });

      const { EmbeddingsService } = await import("../../../services/embeddings.service");
      const embeddingsService = new EmbeddingsService(storage.platform.content);

      const relatedContent = await embeddingsService.findRelatedContent(
        validated.id,
        validated.type,
        userId,
        validated.limit,
      );

      res.json({
        success: true,
        contentId: validated.id,
        contentType: validated.type,
        related: relatedContent,
        count: relatedContent.length,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid parameters",
          details: error.errors,
        });
      }

      console.error("Error fetching related content:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch related content",
      });
    }
  }),
);

/**
 * POST /api/ai/analysis/content/embeddings/generate
 * Generate embedding for a single piece of content
 */
router.post(
  "/content/embeddings/generate",
  isAuthenticated,
  rateLimiters.openai.middleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Authentication required" });

    const schema = z.object({
      contentId: z.string().min(1),
      contentType: z.string().min(1),
      text: z.string().min(1),
      metadata: z.any().optional(),
    });

    try {
      const validated = schema.parse(req.body);

      const { EmbeddingsService } = await import("../../../services/embeddings.service");
      const embeddingsService = new EmbeddingsService(storage.platform.content);

      const embedding = await embeddingsService.createContentEmbedding(
        validated.contentId,
        validated.contentType,
        validated.text,
        validated.metadata,
        userId,
      );

      res.json({
        success: true,
        embedding: {
          id: embedding.id,
          contentId: embedding.contentId,
          contentType: embedding.contentType,
          embeddingType: embedding.embeddingType,
          createdAt: embedding.createdAt,
          updatedAt: embedding.updatedAt,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid request body",
          details: error.errors,
        });
      }

      console.error("Error generating embedding:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate embedding",
      });
    }
  }),
);

/**
 * POST /api/ai/analysis/content/embeddings/refresh
 * Refresh embeddings for multiple content items
 */
router.post(
  "/content/embeddings/refresh",
  isAuthenticated,
  rateLimiters.openai.middleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Authentication required" });

    const schema = z.object({
      contentType: z.string().min(1),
      contents: z
        .array(
          z.object({
            id: z.string().min(1),
            text: z.string().min(1),
            metadata: z.any().optional(),
          }),
        )
        .min(1)
        .max(100),
    });

    try {
      const validated = schema.parse(req.body);

      const { EmbeddingsService } = await import("../../../services/embeddings.service");
      const embeddingsService = new EmbeddingsService(storage.platform.content);

      const result = await embeddingsService.refreshEmbeddings(
        validated.contentType,
        userId,
        validated.contents,
      );

      res.json({
        success: true,
        processed: result.processed,
        failed: result.failed,
        message: `Successfully processed ${result.processed} items, ${result.failed} failed`,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid request body",
          details: error.errors,
        });
      }

      console.error("Error refreshing embeddings:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to refresh embeddings",
      });
    }
  }),
);

/**
 * POST /api/ai/analysis/content/search/semantic
 * Search for content using semantic similarity
 */
router.post(
  "/content/search/semantic",
  isAuthenticated,
  rateLimiters.openai.middleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Authentication required" });

    const schema = z.object({
      query: z.string().min(1),
      contentType: z.string().min(1),
      limit: z.number().min(1).max(50).default(10),
      threshold: z.number().min(0).max(1).default(0.7),
    });

    try {
      const validated = schema.parse(req.body);

      const { EmbeddingsService } = await import("../../../services/embeddings.service");
      const embeddingsService = new EmbeddingsService(storage.platform.content);

      // Generate embedding for the query
      const queryEmbedding = await embeddingsService.generateEmbedding(
        validated.query,
      );

      // Search for similar content
      const results = await storage.platform.content.searchByEmbedding(
        queryEmbedding,
        validated.contentType,
        validated.limit,
      );

      // Filter by threshold and format results
      const filteredResults = results
        .filter((r: any) => r.similarity >= validated.threshold)
        .map((r: any) => ({
          id: r.contentId,
          type: r.contentType,
          title: r.metadata?.title || "Untitled",
          score: r.similarity,
          metadata: r.metadata,
        }));

      res.json({
        success: true,
        query: validated.query,
        results: filteredResults,
        count: filteredResults.length,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid request body",
          details: error.errors,
        });
      }

      console.error("Error in semantic search:", error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "Semantic search failed",
      });
    }
  }),
);

/**
 * DELETE /api/ai/analysis/content/:id/cache
 * Clear cached related content for a specific item
 */
router.delete(
  "/content/:id/cache",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Authentication required" });

    const { id } = req.params;
    const { type = "article" } = req.query;

    // Set an expired cache entry to effectively clear it
    const expiresAt = new Date(0);

    await storage.platform.content.cacheRelatedContent({
      contentId: id as string,
      contentType: type as
        | "recipe"
        | "article"
        | "product"
        | "document"
        | "media",
      relatedContent: {
        contentIds: [],
        scores: [],
        algorithm: "cache_clear",
      },
      expiresAt,
    });

    res.json({
      success: true,
      message: `Cache cleared for content ${id}`,
    });
  }),
);

// ==================== NATURAL LANGUAGE QUERY ENDPOINTS ====================

const naturalQuerySchema = z.object({
  naturalQuery: z
    .string()
    .min(1, "Query is required")
    .max(500, "Query too long"),
});

const executeQuerySchema = z.object({
  queryId: z.string().uuid("Invalid query ID"),
  sql: z.string().min(1, "SQL query is required"),
});

/**
 * POST /api/ai/analysis/query/natural
 * Convert natural language to SQL query
 */
router.post(
  "/query/natural",
  isAuthenticated,
  rateLimiters.openai.middleware(),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { naturalQuery } = naturalQuerySchema.parse(req.body);

      const { convertNaturalLanguageToSQL } = await import(
        "../../../services/openai-query.service"
      );
      const result = await convertNaturalLanguageToSQL(naturalQuery, userId);

      const queryLog = await storage.platform.ai.createQueryLog(userId, {
        tableName: result.tablesAccessed?.[0] || "unknown",
        queryType: result.queryType,
        executionTime: 0,
      });

      res.json({
        queryId: queryLog.id,
        sql: result.sql,
        explanation: result.explanation,
        confidence: result.confidence,
        queryType: result.queryType,
        tablesAccessed: result.tablesAccessed,
      });
    } catch (error) {
      console.error("Error converting natural language to SQL:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to convert query",
      });
    }
  }),
);

/**
 * POST /api/ai/analysis/query/execute
 * Execute a validated SQL query
 */
router.post(
  "/query/execute",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { queryId, sql } = executeQuerySchema.parse(req.body);

      const logs = await storage.platform.ai.getQueryLogs(userId, 100);
      const queryLog = logs.find((log: any) => log.id === queryId);

      if (!queryLog) {
        return res.status(404).json({ error: "Query not found" });
      }

      const startTime = Date.now();
      try {
        const { executeValidatedQuery } = await import(
          "../../../services/openai-query.service"
        );
        const { results, rowCount } = await executeValidatedQuery(
          sql,
          userId,
          queryLog.queryHash || "",
        );
        const executionTime = Date.now() - startTime;

        await storage.platform.ai.updateQueryLog(queryId, {
          rowsAffected: rowCount,
          executionTime,
        });

        res.json({
          results,
          rowCount,
          executionTime,
        });
      } catch (execError) {
        const executionTime = Date.now() - startTime;

        await storage.platform.ai.updateQueryLog(queryId, {
          executionTime,
        });

        throw execError;
      }
    } catch (error) {
      console.error("Error executing query:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to execute query",
      });
    }
  }),
);

/**
 * GET /api/ai/analysis/query/history
 * Get user's query history
 */
router.get(
  "/query/history",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const history = await storage.platform.ai.getQueryLogs(userId, limit);
      res.json(history);
    } catch (error) {
      console.error("Error getting query history:", error);
      res.status(500).json({ error: "Failed to get query history" });
    }
  }),
);

/**
 * GET /api/ai/analysis/query/:id
 * Get a specific query by ID
 */
router.get(
  "/query/:id",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const logs = await storage.platform.ai.getQueryLogs(userId, 100);
      const query = logs.find((log: any) => log.id === req.params.id);

      if (!query) {
        return res.status(404).json({ error: "Query not found" });
      }

      res.json(query);
    } catch (error) {
      console.error("Error getting query:", error);
      res.status(500).json({ error: "Failed to get query" });
    }
  }),
);

export default router;
