/**
 * Prediction System API Routes
 * 
 * Provides endpoints for predictive analytics using TensorFlow.js and OpenAI.
 * Supports churn prediction, user behavior analysis, and retention interventions.
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { analyticsStorage } from "../storage/index";
import { isAuthenticated, getAuthenticatedUserId } from "../middleware/oauth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { Request } from "express";
import { predictionService } from "../services/predictionService";

const router = Router();

// Request validation schemas
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

const interventionSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  predictionId: z.string().min(1, "Prediction ID is required"),
  regenerate: z.boolean().optional(),
});

const segmentSchema = z.object({
  segmentType: z.enum(['risk_level', 'behavior_pattern', 'engagement_trend']).optional(),
  minProbability: z.number().min(0).max(1).optional(),
});

const accuracySchema = z.object({
  predictionId: z.string().min(1, "Prediction ID is required"),
  actualOutcome: z.string().min(1, "Actual outcome is required"),
  accuracyScore: z.number().min(0).max(1),
});

/**
 * GET /api/predict/user/:userId
 * Get predictions for a specific user
 */
router.get(
  "/user/:userId",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const requestingUserId = getAuthenticatedUserId(req);
    if (!requestingUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { userId } = req.params;
    const { predictionTypes, includeFactors } = req.query;

    try {
      // Get user predictions from storage
      const predictions = await analyticsStorage.getUserPredictions(userId, {
        predictionType: predictionTypes ? predictionTypes[0] : undefined,
        status: 'pending',
      });

      // If no recent predictions, generate new ones
      if (predictions.length === 0 || 
          predictions.every(p => new Date(p.createdAt).getTime() < Date.now() - 24 * 60 * 60 * 1000)) {
        const newPredictions = await predictionService.generateUserPredictions(userId);
        predictions.push(...newPredictions);
      }

      res.json({
        success: true,
        predictions,
        metadata: {
          userId,
          timestamp: new Date().toISOString(),
          count: predictions.length,
        }
      });
    } catch (error) {
      console.error("Error getting user predictions:", error);
      res.status(500).json({
        error: "Failed to get user predictions",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * POST /api/predict/churn
 * Get users with high churn risk and suggest interventions
 */
router.post(
  "/churn",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate request body
    const validation = churnPredictionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { threshold, limit, includeInterventions } = validation.data;

    try {
      // Get high-risk churn users
      const churnRisks = await analyticsStorage.getChurnRiskUsers(threshold);
      const limitedRisks = churnRisks.slice(0, limit);

      // Generate interventions if requested
      let interventions: Record<string, any> = {};
      if (includeInterventions) {
        for (const risk of limitedRisks) {
          const intervention = await predictionService.generateIntervention(risk);
          interventions[risk.userId] = intervention;
        }
      }

      res.json({
        success: true,
        churnRisks: limitedRisks,
        interventions,
        metadata: {
          threshold,
          totalRiskUsers: churnRisks.length,
          returnedCount: limitedRisks.length,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error("Error predicting churn:", error);
      res.status(500).json({
        error: "Failed to predict churn risks",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * POST /api/predict/intervention
 * Generate or regenerate intervention suggestions for a user
 */
router.post(
  "/intervention",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const requestingUserId = getAuthenticatedUserId(req);
    if (!requestingUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate request body
    const validation = interventionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { userId, predictionId, regenerate } = validation.data;

    try {
      // Get the prediction
      const prediction = await analyticsStorage.getPredictionById(predictionId);
      if (!prediction) {
        return res.status(404).json({ error: "Prediction not found" });
      }

      // Generate intervention
      const intervention = await predictionService.generateIntervention(
        prediction,
        { regenerate }
      );

      // Update prediction with intervention
      if (intervention.recommendedAction) {
        await analyticsStorage.updatePredictionStatus(
          predictionId,
          'intervention_suggested',
          intervention.recommendedAction
        );
      }

      res.json({
        success: true,
        intervention,
        prediction,
        metadata: {
          userId,
          predictionId,
          generated: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error("Error generating intervention:", error);
      res.status(500).json({
        error: "Failed to generate intervention",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/predict/segments
 * Get user segments based on predictive models
 */
router.get(
  "/segments",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { segmentType, minProbability } = req.query;

    try {
      // Get segments from prediction service
      const segments = await predictionService.getUserSegments({
        segmentType: segmentType,
        minProbability: minProbability ? parseFloat(minProbability as string) : undefined,
      });

      res.json({
        success: true,
        segments,
        metadata: {
          totalUsers: segments.reduce((sum, seg) => sum + seg.userCount, 0),
          segmentCount: segments.length,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error("Error getting segments:", error);
      res.status(500).json({
        error: "Failed to get user segments",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * POST /api/predict/accuracy
 * Record the accuracy of a prediction
 */
router.post(
  "/accuracy",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate request body
    const validation = accuracySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { predictionId, actualOutcome, accuracyScore } = validation.data;

    try {
      // Record accuracy
      const accuracy = await analyticsStorage.createPredictionAccuracy({
        predictionId,
        actualOutcome,
        accuracyScore,
        outcomeDate: new Date(),
      });

      // Update prediction status
      await analyticsStorage.updatePredictionStatus(
        predictionId,
        'resolved'
      );

      // Get accuracy statistics
      const stats = await analyticsStorage.getPredictionAccuracy({
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          end: new Date(),
        }
      });

      res.json({
        success: true,
        accuracy,
        stats,
        metadata: {
          predictionId,
          recorded: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error("Error recording accuracy:", error);
      res.status(500).json({
        error: "Failed to record prediction accuracy",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/predict/accuracy/stats
 * Get prediction accuracy statistics
 */
router.get(
  "/accuracy/stats",
  isAuthenticated,
  asyncHandler(async (req: Request, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { dateRange, predictionType } = req.query;

    try {
      let dateFilter;
      if (dateRange === 'week') {
        dateFilter = {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date(),
        };
      } else if (dateRange === 'month') {
        dateFilter = {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
        };
      } else if (dateRange === 'quarter') {
        dateFilter = {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          end: new Date(),
        };
      }

      const stats = await analyticsStorage.getPredictionAccuracy({
        dateRange: dateFilter,
        predictionType: predictionType as string,
      });

      res.json({
        success: true,
        stats,
        metadata: {
          dateRange: dateRange || 'all',
          predictionType: predictionType || 'all',
          timestamp: new Date().toISOString(),
        }
      });
    } catch (error) {
      console.error("Error getting accuracy stats:", error);
      res.status(500).json({
        error: "Failed to get accuracy statistics",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

export default router;