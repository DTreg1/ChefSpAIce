/**
 * Fraud Detection Router
 * 
 * Provides endpoints for fraud detection, monitoring, and review.
 * Includes transaction analysis, suspicious activity tracking, and reporting.
 * 
 * Base path: /api/v1/fraud-detection
 * 
 * @module server/routers/platform/fraud.router
 */

import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { storage } from "../../storage/index";
import {
  fraudScores,
  suspiciousActivities
} from "@shared/schema";
import { FraudDetectionService } from "../../services/fraud.service";
import { isAuthenticated, adminOnly } from "../../middleware/oauth.middleware";
import { eq, gte, desc, sql } from "drizzle-orm";

const router = Router();
const fraudService = new FraudDetectionService();

const analyzeTransactionSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.string(),
  recipientId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  ipAddress: z.string().optional()
});

const reviewActivitySchema = z.object({
  activityId: z.string().uuid(),
  decision: z.enum(['confirm', 'dismiss', 'escalate']),
  notes: z.string().optional()
});

/**
 * POST /analyze
 * Analyze transaction or user action for fraud
 */
router.post("/analyze", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const validatedData = analyzeTransactionSchema.parse(req.body);
    
    const analysisResult = await fraudService.analyzeTransaction(
      userId,
      'transaction',
      {
        amount: validatedData.amount,
        paymentMethod: validatedData.paymentMethod,
        recipientId: validatedData.recipientId,
        ...validatedData.metadata,
        ipAddress: validatedData.ipAddress || req.ip
      }
    );

    await storage.admin.security.createFraudScore({
      userId,
      score: analysisResult.fraudScore,
      factors: analysisResult.factors,
      modelVersion: "v1.0"
    });

    if (analysisResult.fraudScore > 0.75 || analysisResult.shouldBlock) {
      await storage.admin.security.createSuspiciousActivity({
        userId,
        activityType: 'transaction',
        status: 'pending',
        details: {
          description: `High-risk transaction detected: $${validatedData.amount} via ${validatedData.paymentMethod}`,
          evidence: [
            `Fraud score: ${analysisResult.fraudScore}`,
            `Amount: $${validatedData.amount}`,
            `Payment method: ${validatedData.paymentMethod}`
          ]
        },
        riskLevel: analysisResult.fraudScore > 0.9 ? 'critical' : 
                   analysisResult.fraudScore > 0.75 ? 'high' : 'medium',
        severity: analysisResult.fraudScore > 0.9 ? 'critical' : 
                  analysisResult.fraudScore > 0.75 ? 'high' : 'medium',
      } as any);
    }

    res.json(analysisResult);
  } catch (error) {
    console.error("Error analyzing transaction:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to analyze transaction" });
  }
});

/**
 * GET /alerts
 * Get fraud alerts and suspicious activities
 */
router.get("/alerts", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const isAdmin = (req.user as any)?.role === 'admin';

    const activities = await storage.admin.security.getSuspiciousActivities(
      isAdmin ? undefined : userId,
      isAdmin
    );

    let scores;
    if (isAdmin) {
      scores = await db
        .select()
        .from(fraudScores)
        .orderBy(desc(fraudScores.timestamp))
        .limit(100);
    } else {
      scores = await storage.admin.security.getFraudScores(userId, 20);
    }

    const alerts = activities
      .filter(activity => activity.status === 'pending' || activity.status === 'reviewing')
      .map(activity => ({
        id: activity.id,
        userId: activity.userId,
        type: activity.activityType,
        description: (activity.details as any)?.description || 'Suspicious activity detected',
        severity: activity.riskLevel,
        timestamp: activity.detectedAt,
        autoBlocked: activity.autoBlocked,
        status: activity.status
      }));

    res.json({
      alerts,
      recentScores: scores.map(score => ({
        userId: score.userId,
        score: score.score,
        timestamp: score.timestamp,
        factors: score.factors
      })),
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      pendingReview: alerts.filter(a => a.status === 'pending').length
    });
  } catch (error) {
    console.error("Error fetching fraud alerts:", error);
    res.status(500).json({ error: "Failed to fetch fraud alerts" });
  }
});

/**
 * GET /report/:period
 * Get fraud statistics and reports
 */
router.get("/report/:period", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    const period = req.params.period as 'day' | 'week' | 'month';
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!['day', 'week', 'month'].includes(period)) {
      return res.status(400).json({ error: "Invalid period. Use 'day', 'week', or 'month'" });
    }
    
    const isAdmin = (req.user as any)?.role === 'admin';

    if (!isAdmin) {
      const userScores = await storage.admin.security.getFraudScores(userId, 100);
      const userActivities = await storage.admin.security.getSuspiciousActivities(userId, false);
      const userReviews = await storage.admin.security.getFraudReviews(userId);

      res.json({
        userStats: {
          averageScore: userScores.length > 0 
            ? userScores.reduce((sum, s) => sum + s.score, 0) / userScores.length 
            : 0,
          totalScores: userScores.length,
          suspiciousActivities: userActivities.length,
          reviewsReceived: userReviews.length,
          currentRiskLevel: userScores[0]?.score > 0.75 ? 'high' :
                           userScores[0]?.score > 0.5 ? 'medium' : 
                           userScores[0]?.score > 0.25 ? 'low' : 'minimal'
        }
      });
    } else {
      const stats = await storage.admin.security.getFraudStats(period);
      res.json(stats);
    }
  } catch (error) {
    console.error("Error generating fraud report:", error);
    res.status(500).json({ error: "Failed to generate fraud report" });
  }
});

/**
 * POST /review
 * Review and update suspicious activity (admin only)
 */
router.post("/review", isAuthenticated, adminOnly, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const validatedData = reviewActivitySchema.parse(req.body);
    
    let newStatus: 'confirmed' | 'dismissed' | 'escalated';
    switch (validatedData.decision) {
      case 'confirm':
        newStatus = 'confirmed';
        break;
      case 'dismiss':
        newStatus = 'dismissed';
        break;
      case 'escalate':
        newStatus = 'escalated';
        break;
    }

    await storage.admin.security.updateSuspiciousActivity(
      validatedData.activityId,
      newStatus,
      new Date()
    );

    await storage.admin.security.createFraudReview({
      userId: userId,
      reviewerId: userId,
      decision: validatedData.decision === 'confirm' ? 'banned' : 
                validatedData.decision === 'escalate' ? 'monitor' : 'cleared',
      notes: validatedData.notes || null,
      activityId: validatedData.activityId
    });

    res.json({ 
      success: true, 
      message: `Activity ${validatedData.decision}ed successfully` 
    });
  } catch (error) {
    console.error("Error reviewing activity:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to review activity" });
  }
});

/**
 * GET /patterns
 * Get fraud patterns for ML training (admin only)
 */
router.get("/patterns", isAuthenticated, adminOnly, async (req, res) => {
  try {
    const confirmedFraud = await db
      .select({
        userId: suspiciousActivities.userId,
        activityType: suspiciousActivities.activityType,
        riskLevel: suspiciousActivities.riskLevel,
        details: suspiciousActivities.details,
        detectedAt: suspiciousActivities.detectedAt
      })
      .from(suspiciousActivities)
      .where(eq(suspiciousActivities.status, 'confirmed'))
      .orderBy(desc(suspiciousActivities.detectedAt))
      .limit(500);

    const dismissedCases = await db
      .select({
        userId: suspiciousActivities.userId,
        activityType: suspiciousActivities.activityType,
        riskLevel: suspiciousActivities.riskLevel,
        details: suspiciousActivities.details,
        detectedAt: suspiciousActivities.detectedAt
      })
      .from(suspiciousActivities)
      .where(eq(suspiciousActivities.status, 'dismissed'))
      .orderBy(desc(suspiciousActivities.detectedAt))
      .limit(500);

    const patterns = {
      confirmedPatterns: extractPatterns(confirmedFraud),
      dismissedPatterns: extractPatterns(dismissedCases),
      topRiskFactors: await getTopRiskFactors(),
      temporalPatterns: await getTemporalPatterns()
    };

    res.json(patterns);
  } catch (error) {
    console.error("Error fetching fraud patterns:", error);
    res.status(500).json({ error: "Failed to fetch fraud patterns" });
  }
});

/**
 * GET /high-risk
 * Get high-risk users
 */
router.get("/high-risk", isAuthenticated, adminOnly, async (req, res) => {
  try {
    const threshold = parseFloat(req.query.threshold as string) || 0.75;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const highRiskUsers = await storage.admin.security.getHighRiskUsers(threshold, limit);
    res.json(highRiskUsers);
  } catch (error) {
    console.error("Error fetching high-risk users:", error);
    res.status(500).json({ error: "Failed to fetch high-risk users" });
  }
});

function extractPatterns(activities: any[]) {
  const patterns: any = {
    activityTypes: {},
    riskLevels: {},
    commonFactors: []
  };

  activities.forEach(activity => {
    patterns.activityTypes[activity.activityType] = 
      (patterns.activityTypes[activity.activityType] || 0) + 1;
    
    patterns.riskLevels[activity.riskLevel] = 
      (patterns.riskLevels[activity.riskLevel] || 0) + 1;
    
    if (activity.details) {
      const data = (activity.details as any);
      if (data.fraudScore && data.fraudScore > 0.8) {
        patterns.commonFactors.push({
          type: activity.activityType,
          score: data.fraudScore,
          factors: data.factors || []
        });
      }
    }
  });

  return patterns;
}

async function getTopRiskFactors() {
  const scores = await db
    .select({
      factors: fraudScores.factors,
      score: fraudScores.score
    })
    .from(fraudScores)
    .where(gte(fraudScores.score, 0.7))
    .limit(200);

  const factorCounts: { [key: string]: number } = {};
  scores.forEach(s => {
    if (s.factors) {
      Object.keys(s.factors).forEach(factor => {
        factorCounts[factor] = (factorCounts[factor] || 0) + 1;
      });
    }
  });

  return Object.entries(factorCounts)
    .map(([factor, count]) => ({ factor, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

async function getTemporalPatterns() {
  const activities = await db
    .select({
      hour: sql`EXTRACT(HOUR FROM ${suspiciousActivities.detectedAt})`.as('hour'),
      dayOfWeek: sql`EXTRACT(DOW FROM ${suspiciousActivities.detectedAt})`.as('dayOfWeek'),
      count: sql`COUNT(*)`.as('count')
    })
    .from(suspiciousActivities)
    .groupBy(
      sql`EXTRACT(HOUR FROM ${suspiciousActivities.detectedAt})`,
      sql`EXTRACT(DOW FROM ${suspiciousActivities.detectedAt})`
    );

  return {
    hourlyDistribution: activities.map(a => ({
      hour: a.hour,
      count: Number(a.count)
    })),
    weeklyDistribution: activities.map(a => ({
      dayOfWeek: a.dayOfWeek,
      count: Number(a.count)
    }))
  };
}

export default router;
