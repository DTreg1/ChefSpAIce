import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { storage } from "../storage";
import {
  fraudScores,
  suspiciousActivities,
  fraudReviews,
  insertFraudScoreSchema,
  insertSuspiciousActivitySchema,
  insertFraudReviewSchema
} from "@shared/schema";
import { FraudDetectionService } from "../services/fraud.service";
import { isAuthenticated } from "../middleware/auth.middleware";
import { and, eq, gte, desc, sql } from "drizzle-orm";

const router = Router();
const fraudService = new FraudDetectionService();

// Schema validations
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

// Analyze transaction or user action for fraud
router.post("/api/fraud/analyze", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const validatedData = analyzeTransactionSchema.parse(req.body);
    
    // Run fraud analysis
    const analysisResult = await fraudService.analyzeTransaction(
      userId,
      validatedData.amount,
      validatedData.paymentMethod,
      validatedData.recipientId,
      {
        ...validatedData.metadata,
        ipAddress: validatedData.ipAddress || req.ip
      }
    );

    // Store fraud score
    await storage.createFraudScore({
      userId,
      score: analysisResult.fraudScore,
      factors: analysisResult.factors
    });

    // If high risk, create suspicious activity
    if (analysisResult.fraudScore > 0.75 || analysisResult.shouldBlock) {
      await storage.createSuspiciousActivity({
        userId,
        activityType: 'transaction',
        details: {
          description: `High-risk transaction detected: $${validatedData.amount} via ${validatedData.paymentMethod}`,
          evidence: [
            `Fraud score: ${analysisResult.fraudScore}`,
            `Amount: $${validatedData.amount}`,
            `Payment method: ${validatedData.paymentMethod}`
          ],
          metadata: {
            amount: validatedData.amount,
            paymentMethod: validatedData.paymentMethod,
            recipientId: validatedData.recipientId,
            fraudScore: analysisResult.fraudScore
          }
        },
        riskLevel: analysisResult.fraudScore > 0.9 ? 'critical' : 
                   analysisResult.fraudScore > 0.75 ? 'high' : 'medium'
      });
    }

    res.json(analysisResult);
  } catch (error) {
    console.error("Error analyzing transaction:", error);
    res.status(500).json({ error: "Failed to analyze transaction" });
  }
});

// Get fraud alerts and suspicious activities
router.get("/api/fraud/alerts", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Get user to check admin status
    const user = await storage.getUser(userId);
    const isAdmin = user?.isAdmin || false;

    // Get suspicious activities
    const activities = await storage.getSuspiciousActivities(
      isAdmin ? undefined : userId,
      isAdmin
    );

    // Get recent fraud scores for the user or all users (admin)
    let scores;
    if (isAdmin) {
      scores = await db
        .select()
        .from(fraudScores)
        .orderBy(desc(fraudScores.timestamp))
        .limit(100);
    } else {
      scores = await storage.getFraudScores(userId, 20);
    }

    // Calculate alert severity
    const alerts = activities
      .filter(activity => activity.status === 'pending' || activity.status === 'reviewing')
      .map(activity => ({
        id: activity.id,
        userId: activity.userId,
        type: activity.activityType,
        description: (activity.details as any).description || 'Suspicious activity detected',
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

// Get fraud statistics and reports
router.get("/api/fraud/report/:period", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    const period = req.params.period as 'day' | 'week' | 'month';
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!['day', 'week', 'month'].includes(period)) {
      return res.status(400).json({ error: "Invalid period. Use 'day', 'week', or 'month'" });
    }
    
    // Get user to check admin status
    const user = await storage.getUser(userId);
    const isAdmin = user?.isAdmin || false;

    // Admin gets full system stats, users get their own
    if (!isAdmin) {
      // Get user-specific stats
      const userScores = await storage.getFraudScores(userId, 100);
      const userActivities = await storage.getSuspiciousActivities(userId, false);
      const userReviews = await storage.getFraudReviews(userId);

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
      // Get system-wide stats for admins
      const stats = await storage.getFraudStats(period);
      res.json(stats);
    }
  } catch (error) {
    console.error("Error generating fraud report:", error);
    res.status(500).json({ error: "Failed to generate fraud report" });
  }
});

// Review and update suspicious activity (admin only)
router.post("/api/fraud/review", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Get user to check admin status
    const user = await storage.getUser(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const validatedData = reviewActivitySchema.parse(req.body);
    
    // Update suspicious activity status
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

    await storage.updateSuspiciousActivity(
      validatedData.activityId,
      newStatus,
      new Date()
    );

    // Create fraud review record
    await storage.createFraudReview({
      userId: userId, // The user being reviewed (from activity)
      reviewerId: userId, // The admin doing the review
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
    res.status(500).json({ error: "Failed to review activity" });
  }
});

// Get fraud patterns for ML training (admin only)
router.get("/api/fraud/patterns", isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Get user to check admin status
    const user = await storage.getUser(userId);
    if (!user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get confirmed fraud cases for pattern analysis
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

    // Get dismissed cases for comparison
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

    // Extract patterns
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

// Helper functions
function extractPatterns(activities: any[]) {
  const patterns: any = {
    activityTypes: {},
    riskLevels: {},
    commonFactors: []
  };

  activities.forEach(activity => {
    // Count activity types
    patterns.activityTypes[activity.activityType] = 
      (patterns.activityTypes[activity.activityType] || 0) + 1;
    
    // Count risk levels
    patterns.riskLevels[activity.riskLevel] = 
      (patterns.riskLevels[activity.riskLevel] || 0) + 1;
    
    // Extract common factors from details
    if (activity.details) {
      const data = (activity.details as any).metadata;
      if (data && data.fraudScore > 0.8) {
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
      Object.keys(s.factors as any).forEach(factor => {
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