/**
 * Notification API Routes
 * 
 * Endpoints for managing the intelligent notification system including preferences,
 * sending smart notifications, recording feedback, and viewing engagement metrics.
 */

import { Router, type Request, type Response } from 'express';
import { storage } from "../../storage/index";
import { intelligentNotificationService } from '../../notifications/intelligent-service';
import { isAuthenticated, adminOnly } from '../../middleware/oauth.middleware';
import { z } from 'zod';
import { insertNotificationPreferenceSchema } from '@shared/schema';

const router = Router();

// ==================== Test Endpoint (Development Only) ====================

/**
 * GET /api/notifications/test
 * Test endpoint to verify intelligent notification service is working
 */
router.get('/test', async (_req: Request, res: Response) => {
  try {
    // Test that the service is initialized
    const testNotification = {
      type: 'expiring_food' as const,
      title: 'Test Notification',
      body: 'This is a test of the intelligent notification system',
      data: { foodItemId: 'test-item' },
      urgency: 'medium' as const,
    };
    
    // Score the test notification
    const score = await intelligentNotificationService.scoreNotificationRelevance(
      'test-user',
      testNotification as any
    );
    
    res.json({
      status: 'healthy',
      message: 'Intelligent notification service is running',
      test: {
        notification: testNotification,
        relevanceScore: score,
        scheduler: {
          queueProcessing: 'Every 5 minutes',
          modelTraining: 'Every 6 hours', 
          cleanup: 'Daily at 3am',
        },
      },
    });
  } catch (error) {
    console.error('Error in test endpoint:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Service test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================== Preferences Management ====================

/**
 * GET /api/notifications/preferences
 * Get current user's notification preferences
 */
router.get('/preferences', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const preferences = await storage.user.notifications.getNotificationPreferences(userId);
    
    if (!preferences) {
      // Return default preferences if none exist
      return res.json({
        notificationTypes: {
          expiringFood: { enabled: true, weight: 1.0, urgencyThreshold: 2 },
          mealReminder: { enabled: true, weight: 0.8, urgencyThreshold: 24 },
          recipeSuggestion: { enabled: true, weight: 0.6, urgencyThreshold: 48 },
          shoppingAlert: { enabled: true, weight: 0.7, urgencyThreshold: 4 },
          systemUpdates: { enabled: false, weight: 0.3, urgencyThreshold: 72 },
        },
        quietHours: {
          enabled: false,
          periods: [],
        },
        frequencyLimit: 10,
        enableSmartTiming: true,
        enableRelevanceScoring: true,
        preferredChannels: ['push', 'in-app'],
      });
    }
    
    res.json(preferences);
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({ error: 'Failed to get notification preferences' });
  }
});

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
 */
router.put('/preferences', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Validate the request body
    const validatedData = insertNotificationPreferenceSchema
      .omit({ userId: true })
      .parse(req.body);
    
    const prefsToUpdate = {
      userId,
      notificationType: validatedData.notificationType || 'general',
      enabled: validatedData.enabled ?? true,
      frequency: validatedData.frequency,
      quietHoursStart: validatedData.quietHoursStart,
      quietHoursEnd: validatedData.quietHoursEnd,
      minImportance: validatedData.minImportance,
      channels: validatedData.channels,
      metadata: validatedData.metadata,
    };
    const updated = await storage.user.notifications.upsertNotificationPreferences(prefsToUpdate);
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid preferences data', details: error.errors });
    }
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// ==================== Smart Notification Sending ====================

const sendNotificationSchema = z.object({
  type: z.enum(['expiring_food', 'meal_reminder', 'recipe_suggestion', 'shopping_alert', 'achievement', 'system']),
  title: z.string(),
  body: z.string(),
  data: z.record(z.any()).optional(),
  urgency: z.enum(['immediate', 'high', 'medium', 'low']).default('medium'),
  category: z.string().optional(),
  actionUrl: z.string().optional(),
  userContext: z.record(z.any()).optional(),
});

/**
 * POST /api/notifications/smart-send
 * Send a notification using intelligent timing and relevance scoring
 */
router.post('/smart-send', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const validatedData = sendNotificationSchema.parse(req.body);
    
    // Check if smart features are enabled
    const prefs = await storage.user.notifications.getNotificationPreferences(userId);
    
    // Process the notification through the intelligent service
    const scoreData = await intelligentNotificationService.processNotification(
      userId,
      validatedData as any,
      validatedData.userContext
    );
    
    // Save the notification score to the database
    const score = await storage.user.notifications.createNotificationScore(scoreData);
    
    // If immediate urgency or smart timing disabled (in metadata), send now
    const enableSmartTiming = prefs?.metadata?.enableSmartTiming !== false;
    if (validatedData.urgency === 'immediate' || !enableSmartTiming) {
      // This would integrate with your existing push notification system
      // For now, we just mark it as ready to send
      await storage.user.notifications.updateNotificationScore(score.id, {
        holdUntil: new Date(),
      });
      
      return res.json({
        success: true,
        notificationScoreId: score.id,
        scheduledFor: 'immediate',
        relevanceScore: score.relevanceScore,
      });
    }
    
    res.json({
      success: true,
      notificationScoreId: score.id,
      scheduledFor: score.holdUntil,
      relevanceScore: score.relevanceScore,
      reason: score.factors?.userContext || 'Optimally scheduled',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid notification data', details: error.errors });
    }
    console.error('Error sending smart notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// ==================== Feedback Recording ====================

const feedbackSchema = z.object({
  notificationId: z.string(),
  action: z.enum(['clicked', 'dismissed', 'disabled', 'snoozed']),
  engagementTime: z.number().optional(),
  followupAction: z.string().optional(),
  sentiment: z.number().min(-1).max(1).optional(),
  deviceInfo: z.object({
    platform: z.string(),
    deviceType: z.string(),
    appVersion: z.string().optional(),
  }).optional(),
});

/**
 * POST /api/notifications/feedback
 * Record user interaction with a notification
 */
router.post('/feedback', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const validatedData = feedbackSchema.parse(req.body);
    
    // Map action to feedbackType for schema compatibility
    type FeedbackType = 'useful' | 'not_useful' | 'too_frequent' | 'wrong_time' | 'irrelevant';
    const feedbackTypeMap: Record<string, FeedbackType> = {
      'clicked': 'useful',
      'dismissed': 'not_useful',
      'disabled': 'too_frequent',
      'snoozed': 'wrong_time',
    };
    const feedback = await storage.user.notifications.createNotificationFeedback({
      userId,
      notificationId: validatedData.notificationId,
      feedbackType: feedbackTypeMap[validatedData.action] || 'not_useful',
      reason: validatedData.followupAction,
    });
    
    // Trigger model update with new feedback (async, non-blocking)
    setImmediate(async () => {
      try {
        const recentFeedback = await storage.user.notifications.getNotificationFeedback(userId);
        if (recentFeedback.length >= 20) {
          await intelligentNotificationService.updateModelWithFeedback(recentFeedback);
        }
      } catch (error) {
        console.error('Error updating model with feedback:', error);
      }
    });
    
    res.json({
      success: true,
      feedbackId: feedback.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid feedback data', details: error.errors });
    }
    console.error('Error recording notification feedback:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// ==================== Analytics & Insights ====================

/**
 * GET /api/notifications/engagement
 * Get user's notification engagement metrics
 */
router.get('/engagement', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const days = parseInt(req.query.days as string) || 7;
    
    const engagement = await storage.user.notifications.getRecentUserEngagement(userId, days);
    
    // Get notification scores for additional insights
    const scores = await storage.user.notifications.getNotificationScores(userId);
    
    // Calculate average relevance scores (use score or relevanceScore)
    const avgRelevanceScore = scores.length > 0
      ? scores.reduce((sum, s) => sum + (s.relevanceScore ?? s.score ?? 0), 0) / scores.length
      : 0;
    
    // Calculate timing accuracy (how often we hit optimal times)
    const sentScores = scores.filter(s => s.actualSentAt);
    const timingAccuracy = sentScores.length > 0
      ? sentScores.filter(s => {
          const actualTime = new Date(s.actualSentAt!).getTime();
          // Use holdUntil as optimal time since optimalTime doesn't exist in schema
          const optimalTime = s.holdUntil ? new Date(s.holdUntil).getTime() : actualTime;
          const diff = Math.abs(actualTime - optimalTime);
          return diff < 60 * 60 * 1000; // Within 1 hour
        }).length / sentScores.length
      : 0;
    
    // Compute click rate from engagement counts
    const totalSent = engagement.sent || 0;
    const clickRate = totalSent > 0 ? (engagement.clicked || 0) / totalSent : 0;
    
    res.json({
      ...engagement,
      avgRelevanceScore,
      timingAccuracy,
      period: `${days} days`,
      improvementRate: clickRate > 0.3 ? 'achieving-target' : 'improving',
    });
  } catch (error) {
    console.error('Error getting engagement metrics:', error);
    res.status(500).json({ error: 'Failed to get engagement metrics' });
  }
});

/**
 * GET /api/notifications/insights
 * Get ML-powered insights about notification performance
 */
router.get('/insights', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Get recent feedback and scores
    const feedbackList = await storage.user.notifications.getNotificationFeedback(userId);
    const scores = await storage.user.notifications.getNotificationScores(userId);
    const engagement = await storage.user.notifications.getRecentUserEngagement(userId, 30);
    
    // Analyze patterns
    const insights: any[] = [];
    
    // Best performing notification types
    const typePerformance = new Map<string, { sent: number; clicked: number }>();
    scores.forEach(score => {
      const type = score.notificationType || 'unknown';
      if (!typePerformance.has(type)) {
        typePerformance.set(type, { sent: 0, clicked: 0 });
      }
      const perf = typePerformance.get(type)!;
      perf.sent++;
      
      // Check if notification was clicked by checking feedbackType
      const wasClicked = feedbackList.some(f => 
        f.notificationId === score.id && f.feedbackType === 'useful'
      );
      if (wasClicked) {
        perf.clicked++;
      }
    });
    
    // Find best performing type
    let bestType = '';
    let bestCTR = 0;
    typePerformance.forEach((perf, type) => {
      const ctr = perf.sent > 0 ? perf.clicked / perf.sent : 0;
      if (ctr > bestCTR) {
        bestType = type;
        bestCTR = ctr;
      }
    });
    
    if (bestType) {
      insights.push({
        type: 'best-performing',
        title: 'Top Performing Notification',
        description: `${bestType.replace('_', ' ')} notifications have ${(bestCTR * 100).toFixed(0)}% click rate`,
        metric: bestCTR,
      });
    }
    
    // Optimal delivery times
    const clicksByHour = new Array(24).fill(0);
    const sentByHour = new Array(24).fill(0);
    
    feedbackList.filter(f => f.feedbackType === 'useful').forEach(f => {
      const hour = f.createdAt ? new Date(f.createdAt).getHours() : 0;
      clicksByHour[hour]++;
    });
    
    scores.filter(s => s.actualSentAt).forEach(s => {
      const hour = new Date(s.actualSentAt!).getHours();
      sentByHour[hour]++;
    });
    
    const hourCTR = clicksByHour.map((clicks, hour) => ({
      hour,
      ctr: sentByHour[hour] > 0 ? clicks / sentByHour[hour] : 0,
    })).sort((a, b) => b.ctr - a.ctr);
    
    if (hourCTR[0]?.ctr > 0) {
      insights.push({
        type: 'optimal-time',
        title: 'Best Engagement Time',
        description: `Users are most engaged at ${hourCTR[0].hour}:00`,
        metric: hourCTR[0].ctr,
      });
    }
    
    // Overall improvement - compute from engagement data
    const totalSentForInsights = engagement.sent || 0;
    const clickRateInsights = totalSentForInsights > 0 ? (engagement.clicked || 0) / totalSentForInsights : 0;
    
    if (clickRateInsights > 0) {
      const improvementTarget = 0.5; // 50% improvement target
      const currentImprovement = clickRateInsights - 0.2; // Assuming 20% baseline
      const percentToTarget = (currentImprovement / (improvementTarget - 0.2)) * 100;
      
      insights.push({
        type: 'improvement',
        title: 'Engagement Improvement',
        description: `${percentToTarget.toFixed(0)}% toward 50% engagement improvement goal`,
        metric: clickRateInsights,
      });
    }
    
    res.json({
      insights,
      summary: {
        totalNotifications: scores.length,
        totalFeedback: feedbackList.length,
        currentClickRate: clickRateInsights,
        avgEngagementTime: null, // Not available in current schema
      },
    });
  } catch (error) {
    console.error('Error getting notification insights:', error);
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

/**
 * POST /api/notifications/process-queue
 * Manually trigger processing of the notification queue
 * (This would normally be called by a cron job)
 */
router.post('/process-queue', isAuthenticated, adminOnly, async (req: Request, res: Response) => {
  try {
    await intelligentNotificationService.processNotificationQueue();
    
    res.json({
      success: true,
      message: 'Notification queue processed',
    });
  } catch (error) {
    console.error('Error processing notification queue:', error);
    res.status(500).json({ error: 'Failed to process notification queue' });
  }
});

export default router;