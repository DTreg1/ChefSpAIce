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
import { isAuthenticated, adminOnly, getAuthenticatedUserId } from "../../middleware/oauth.middleware";
import { storage } from "../../storage/index";
import { z } from "zod";
import { getOpenAIClient } from "../../config/openai-config";
import { asyncHandler } from "../../middleware/error.middleware";
import { sentimentService } from "../../services/sentimentService";
import { trendAnalyzer } from "../../services/trend-analyzer.service";
import { predictionService } from "../../services/predictionService";
import { rateLimiters } from "../../middleware/rateLimit";
import {
  AIError,
  handleOpenAIError,
  retryWithBackoff,
  createErrorResponse,
} from "../../utils/ai-error-handler";
import { getCircuitBreaker } from "../../utils/circuit-breaker";

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
  periodType: z.enum(['hour', 'day', 'week', 'month', 'quarter', 'year']).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Trend Analysis
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

// Predictions
const predictUserSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  predictionTypes: z.array(z.enum(['churn_risk', 'next_action', 'engagement_drop', 'feature_adoption'])).optional(),
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
  extractionType: z.enum(['entities', 'keywords', 'structured', 'summary']).default('entities'),
  template: z.object({
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['text', 'number', 'date', 'boolean', 'array']),
      description: z.string().optional(),
      required: z.boolean().optional(),
    })),
  }).optional(),
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

      res.json({
        success: true,
        analysis: savedAnalysis,
        cached: false,
      });
    } catch (error) {
      console.error("Sentiment analysis error:", error);
      const errorResponse = handleOpenAIError(error as Error);
      res.status(errorResponse.status).json(errorResponse.body);
    }
  })
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

    const { periodType = 'day', limit = 30 } = validation.data;

    try {
      const trends = await sentimentService.getTrends({
        userId,
        periodType,
        limit,
      });

      res.json({
        success: true,
        trends,
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
  })
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
      const insights = await sentimentService.generateInsights(userId);

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
  })
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
 * GET /api/ai/analysis/trends/emerging
 * Get emerging trends that are gaining momentum
 */
router.get(
  "/trends/emerging",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const emergingTrends = await storage.platform.analytics.getEmergingTrends();
      
      res.json({
        success: true,
        trends: emergingTrends,
        metadata: {
          count: emergingTrends.length,
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

    const { dataSource, timeWindow, minSampleSize, includeInterpretation } = validation.data;

    try {
      // Trigger trend analysis
      const results = await trendAnalyzer.analyzeTrends({
        dataSource,
        timeWindow,
        minSampleSize,
      });

      // Get AI interpretation if requested
      let interpretation = null;
      if (includeInterpretation && results.trends.length > 0 && openai) {
        try {
          const prompt = `Analyze these detected trends and provide business insights:
${JSON.stringify(results.trends.slice(0, 5), null, 2)}

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

          interpretation = JSON.parse(completion.choices[0]?.message?.content || "{}");
        } catch (aiError) {
          console.error("Error getting AI interpretation:", aiError);
        }
      }

      // Save detected trends
      for (const trend of results.trends) {
        await storage.platform.analytics.createTrend({
          trendType: trend.type,
          metric: trend.metric,
          direction: trend.direction,
          strength: trend.strength,
          startDate: new Date(trend.startDate),
          endDate: new Date(trend.endDate),
          dataPoints: trend.dataPoints,
          confidence: trend.confidence,
          status: "active",
          metadata: {
            dataSource,
            timeWindow,
            detectedBy: "ai-analysis",
          },
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
      const errorResponse = handleOpenAIError(error as Error);
      res.status(errorResponse.status).json(errorResponse.body);
    }
  })
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

    const { alertType, conditions, notificationChannels = ['in-app'] } = validation.data;

    try {
      const alert = await storage.platform.analytics.createTrendAlert({
        userId,
        alertType,
        conditions,
        notificationChannels,
        status: 'active',
        lastTriggered: null,
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
  })
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
      const predictions = await storage.platform.analytics.getUserPredictions(userId, {
        predictionType: predictionTypes ? (predictionTypes as string[])[0] : undefined,
        status: 'pending',
      });

      // If no recent predictions, generate new ones
      if (predictions.length === 0 || 
          predictions.every((p: any) => new Date(p.createdAt).getTime() < Date.now() - 24 * 60 * 60 * 1000)) {
        const newPredictions = await predictionService.generateUserPredictions(userId);
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
  })
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
      const predictions = await predictionService.predictChurnRisk({
        threshold,
        limit,
      });

      // Generate interventions if requested
      let interventions = {};
      if (includeInterventions && predictions.length > 0) {
        for (const prediction of predictions.slice(0, 5)) {
          const intervention = await predictionService.generateIntervention(
            prediction.userId,
            prediction.id
          );
          interventions[prediction.userId] = intervention;
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
      const errorResponse = handleOpenAIError(error as Error);
      res.status(errorResponse.status).json(errorResponse.body);
    }
  })
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
  })
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
        message: "OpenAI API key is required for this feature."
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
        case 'entities':
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

        case 'keywords':
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

        case 'structured':
          if (!template) {
            return res.status(400).json({ error: "Template required for structured extraction" });
          }
          prompt = `Extract structured data from this text according to the template:
"${text}"

Template fields:
${JSON.stringify(template.fields, null, 2)}

Extract the values for each field and format as JSON.`;
          responseFormat = { type: "json_object" };
          break;

        case 'summary':
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

      const extractedData = JSON.parse(completion.choices[0]?.message?.content || "{}");

      // Save extraction to storage
      const extraction = await storage.platform.ai.createDataExtraction({
        userId,
        sourceText: text,
        extractionType,
        extractedData,
        template: template || null,
        confidence: 0.95,
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
      const errorResponse = handleOpenAIError(error as Error);
      res.status(errorResponse.status).json(errorResponse.body);
    }
  })
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
      // Get recent analytics data
      const recentData = await storage.platform.analytics.getRecentAnalytics(30);
      
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

      const insights = JSON.parse(completion.choices[0]?.message?.content || "{}");

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
      const errorResponse = handleOpenAIError(error as Error);
      res.status(errorResponse.status).json(errorResponse.body);
    }
  })
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
      const sentimentCount = await storage.platform.ai.getSentimentAnalysisCount(userId);
      const trendCount = await storage.platform.analytics.getTrendCount();
      const predictionCount = await storage.platform.analytics.getPredictionCount(userId);

      res.json({
        success: true,
        stats: {
          sentimentAnalyses: sentimentCount,
          trendsDetected: trendCount,
          predictionsMade: predictionCount,
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
  })
);

export default router;