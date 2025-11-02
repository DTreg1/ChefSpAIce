/**
 * Intelligent Notification Service
 * 
 * This service implements the smart notification system that uses OpenAI for relevance scoring
 * and TensorFlow.js for timing prediction to achieve 50% higher engagement rates.
 * 
 * Key Features:
 * - OpenAI-powered relevance scoring for notification content
 * - User behavior pattern learning with TensorFlow.js
 * - Smart scheduling that delays non-urgent notifications to optimal delivery times
 * - Respect for quiet hours and frequency limits
 * - Real-time feedback processing to improve predictions
 */

import { OpenAI } from 'openai';
import * as tf from '@tensorflow/tfjs-node';
import { storage } from '../storage';
import {
  type NotificationScores,
  type InsertNotificationScores,
  type NotificationPreferences,
  type NotificationFeedback,
} from '@shared/schema';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface NotificationPayload {
  type: 'expiring_food' | 'meal_reminder' | 'recipe_suggestion' | 'shopping_alert' | 'achievement' | 'system';
  title: string;
  body: string;
  data?: Record<string, any>;
  urgency: 'immediate' | 'high' | 'medium' | 'low';
  category?: string;
  actionUrl?: string;
  notificationId?: string; // Reference to notificationHistory if exists
}

export class IntelligentNotificationService {
  private timingModel: tf.Sequential | null = null;
  private modelInitialized = false;
  private readonly MIN_TRAINING_SAMPLES = 20;

  constructor() {
    // Initialize the timing prediction model on startup
    this.initializeModel().catch(console.error);
  }

  /**
   * Initialize or load the TensorFlow.js timing prediction model
   */
  private async initializeModel(): Promise<void> {
    try {
      // Try to load existing model from disk
      const modelPath = './models/notification-timing';
      
      try {
        this.timingModel = await tf.loadLayersModel(`file://${modelPath}/model.json`) as tf.Sequential;
        console.log('Loaded existing timing prediction model');
      } catch (error) {
        // Create a new model if none exists
        this.timingModel = this.createNewModel();
        console.log('Created new timing prediction model');
      }
      
      this.modelInitialized = true;
    } catch (error) {
      console.error('Error initializing timing model:', error);
    }
  }

  /**
   * Create a new TensorFlow.js model for timing prediction
   */
  private createNewModel(): tf.Sequential {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [8], // hour, dayOfWeek, notificationType, userActiveHours, etc.
          units: 16,
          activation: 'relu',
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 8,
          activation: 'relu',
        }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid', // Output: probability of engagement
        }),
      ],
    });

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy'],
    });

    return model;
  }

  /**
   * Score notification relevance using OpenAI
   */
  async scoreNotificationRelevance(
    userId: string,
    notification: NotificationPayload,
    userContext?: {
      recentActivity?: string[];
      preferences?: Record<string, any>;
      currentInventory?: string[];
    }
  ): Promise<{
    relevanceScore: number;
    reasoning: string;
    suggestedPersonalization?: string;
  }> {
    try {
      const prompt = `
        You are an intelligent notification system. Score the relevance of this notification for the user.
        
        Notification:
        Type: ${notification.type}
        Title: ${notification.title}
        Body: ${notification.body}
        Urgency: ${notification.urgency}
        
        User Context:
        ${userContext?.recentActivity ? `Recent Activity: ${userContext.recentActivity.join(', ')}` : ''}
        ${userContext?.preferences ? `Preferences: ${JSON.stringify(userContext.preferences)}` : ''}
        ${userContext?.currentInventory ? `Current Food Items: ${userContext.currentInventory.slice(0, 10).join(', ')}` : ''}
        
        Provide:
        1. A relevance score from 0.0 to 1.0 (1.0 being most relevant)
        2. Brief reasoning for the score
        3. Optional: A personalized version of the notification body
        
        Response format:
        {
          "relevanceScore": <number>,
          "reasoning": "<string>",
          "suggestedPersonalization": "<optional string>"
        }
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a notification relevance scoring system. Always respond with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        relevanceScore: Math.max(0, Math.min(1, result.relevanceScore || 0.5)),
        reasoning: result.reasoning || 'Default scoring applied',
        suggestedPersonalization: result.suggestedPersonalization,
      };
    } catch (error) {
      console.error('Error scoring notification relevance:', error);
      // Fallback scoring based on urgency
      const fallbackScores = {
        immediate: 1.0,
        high: 0.8,
        medium: 0.5,
        low: 0.3,
      };
      
      return {
        relevanceScore: fallbackScores[notification.urgency] || 0.5,
        reasoning: 'Fallback scoring based on urgency level',
      };
    }
  }

  /**
   * Predict optimal delivery time using TensorFlow.js
   */
  async predictOptimalDeliveryTime(
    userId: string,
    notification: NotificationPayload,
    relevanceScore: number
  ): Promise<{
    optimalTime: Date;
    confidence: number;
    reason: string;
  }> {
    try {
      const now = new Date();
      const prefs = await storage.getNotificationPreferences(userId);
      
      // If immediate urgency, send now
      if (notification.urgency === 'immediate') {
        return {
          optimalTime: now,
          confidence: 1.0,
          reason: 'Immediate urgency notification',
        };
      }

      // Check quiet hours
      if (prefs?.quietHours?.enabled && prefs.quietHours.periods?.length > 0) {
        const inQuietHours = this.isInQuietHours(now, prefs.quietHours.periods);
        if (inQuietHours) {
          const endOfQuietHours = this.getEndOfQuietHours(now, prefs.quietHours.periods);
          return {
            optimalTime: endOfQuietHours,
            confidence: 0.9,
            reason: 'Delayed until end of quiet hours',
          };
        }
      }

      // Get user engagement patterns
      const engagementData = await storage.getRecentUserEngagement(userId, 30);
      const feedbackHistory = await storage.getNotificationFeedback(userId);
      
      // If we have enough training data, use the model
      if (this.modelInitialized && feedbackHistory.length >= this.MIN_TRAINING_SAMPLES) {
        const prediction = await this.predictWithModel(
          notification,
          relevanceScore,
          feedbackHistory,
          prefs
        );
        
        if (prediction.confidence > 0.7) {
          return prediction;
        }
      }

      // Fallback to heuristic-based prediction
      return this.heuristicPrediction(notification, relevanceScore, feedbackHistory, prefs);
    } catch (error) {
      console.error('Error predicting optimal delivery time:', error);
      
      // Default: delay low-priority notifications by 2 hours
      const defaultDelay = notification.urgency === 'low' ? 2 * 60 * 60 * 1000 : 0;
      return {
        optimalTime: new Date(Date.now() + defaultDelay),
        confidence: 0.3,
        reason: 'Default timing applied',
      };
    }
  }

  /**
   * Use TensorFlow model for prediction
   */
  private async predictWithModel(
    notification: NotificationPayload,
    relevanceScore: number,
    feedbackHistory: NotificationFeedback[],
    prefs: NotificationPreferences | undefined
  ): Promise<{ optimalTime: Date; confidence: number; reason: string }> {
    if (!this.timingModel) {
      throw new Error('Model not initialized');
    }

    // Analyze historical engagement patterns
    const engagementByHour = new Array(24).fill(0);
    const engagementByDay = new Array(7).fill(0);
    
    feedbackHistory
      .filter(f => f.action === 'clicked')
      .forEach(feedback => {
        const date = new Date(feedback.actionAt);
        engagementByHour[date.getHours()]++;
        engagementByDay[date.getDay()]++;
      });

    // Find peak engagement hours
    const peakHours = engagementByHour
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(h => h.hour);

    // Test different delivery times and pick the best one
    const now = new Date();
    const candidates: { time: Date; score: number }[] = [];
    
    for (let hoursAhead = 0; hoursAhead <= 12; hoursAhead++) {
      const candidateTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
      const hour = candidateTime.getHours();
      const dayOfWeek = candidateTime.getDay();
      
      // Prepare input features
      const features = tf.tensor2d([[
        hour / 23, // Normalized hour
        dayOfWeek / 6, // Normalized day of week
        this.encodeNotificationType(notification.type),
        relevanceScore,
        engagementByHour[hour] / Math.max(...engagementByHour, 1), // Historical engagement at this hour
        engagementByDay[dayOfWeek] / Math.max(...engagementByDay, 1), // Historical engagement on this day
        this.encodeUrgency(notification.urgency),
        peakHours.includes(hour) ? 1 : 0, // Is peak hour
      ]]);
      
      const prediction = this.timingModel.predict(features) as tf.Tensor;
      const score = (await prediction.data())[0];
      
      candidates.push({
        time: candidateTime,
        score: score,
      });
      
      features.dispose();
      prediction.dispose();
    }

    // Select the best candidate
    const best = candidates.reduce((prev, curr) => 
      curr.score > prev.score ? curr : prev
    );

    return {
      optimalTime: best.time,
      confidence: best.score,
      reason: `ML model prediction (peak hours: ${peakHours.join(', ')})`,
    };
  }

  /**
   * Heuristic-based prediction when ML model isn't available
   */
  private heuristicPrediction(
    notification: NotificationPayload,
    relevanceScore: number,
    feedbackHistory: NotificationFeedback[],
    prefs: NotificationPreferences | undefined
  ): { optimalTime: Date; confidence: number; reason: string } {
    const now = new Date();
    
    // Analyze click patterns by hour
    const clicksByHour = new Map<number, number>();
    feedbackHistory
      .filter(f => f.action === 'clicked')
      .forEach(feedback => {
        const hour = new Date(feedback.actionAt).getHours();
        clicksByHour.set(hour, (clicksByHour.get(hour) || 0) + 1);
      });

    // Find the most active hours
    const sortedHours = Array.from(clicksByHour.entries())
      .sort((a, b) => b[1] - a[1]);
    
    if (sortedHours.length > 0) {
      const [bestHour] = sortedHours[0];
      
      // Calculate time until next occurrence of best hour
      let targetTime = new Date(now);
      targetTime.setHours(bestHour, 0, 0, 0);
      
      if (targetTime <= now) {
        // If the hour has passed today, schedule for tomorrow
        targetTime.setDate(targetTime.getDate() + 1);
      }
      
      // For high relevance, send sooner
      if (relevanceScore > 0.8 && notification.urgency !== 'low') {
        const hoursUntilTarget = (targetTime.getTime() - now.getTime()) / (60 * 60 * 1000);
        if (hoursUntilTarget > 4) {
          // If target is more than 4 hours away, send in 1 hour instead
          targetTime = new Date(now.getTime() + 60 * 60 * 1000);
        }
      }
      
      return {
        optimalTime: targetTime,
        confidence: 0.6,
        reason: `Scheduled for peak engagement hour (${bestHour}:00)`,
      };
    }
    
    // Default heuristic: morning (9 AM) or evening (5 PM)
    const hour = now.getHours();
    let targetHour = hour < 12 ? 9 : 17;
    
    const targetTime = new Date(now);
    targetTime.setHours(targetHour, 0, 0, 0);
    
    if (targetTime <= now) {
      // If we've passed the target time today, schedule for tomorrow
      targetTime.setDate(targetTime.getDate() + 1);
    }
    
    return {
      optimalTime: targetTime,
      confidence: 0.4,
      reason: `Default scheduling to ${targetHour}:00`,
    };
  }

  /**
   * Process and score a notification for intelligent delivery
   */
  async processNotification(
    userId: string,
    notification: NotificationPayload,
    userContext?: Record<string, any>
  ): Promise<InsertNotificationScores> {
    // Score relevance using OpenAI
    const { relevanceScore, reasoning, suggestedPersonalization } = await this.scoreNotificationRelevance(
      userId,
      notification,
      userContext
    );

    // Predict optimal delivery time using TensorFlow.js
    const { optimalTime, confidence, reason } = await this.predictOptimalDeliveryTime(
      userId,
      notification,
      relevanceScore
    );

    // Map urgency to numeric level
    const urgencyLevels: Record<string, number> = {
      immediate: 5,
      high: 4,
      medium: 2,
      low: 1,
    };

    // Create notification score record
    const score: InsertNotificationScores = {
      userId,
      notificationId: notification.notificationId,
      relevanceScore,
      urgencyLevel: urgencyLevels[notification.urgency] || 2,
      optimalTime,
      holdUntil: optimalTime,
      modelVersion: 'v1.0.0',
      features: {
        hourOfDay: optimalTime.getHours(),
        dayOfWeek: optimalTime.getDay(),
        notificationType: notification.type,
        contentLength: notification.body.length,
        hasActionItems: !!notification.actionUrl,
        recentEngagementRate: confidence,
        timeSinceLastOpen: 0, // Would be calculated from user session data
        userContext: userContext || {},
      },
    };

    return score;
  }

  /**
   * Train the model with new feedback data
   */
  async updateModelWithFeedback(feedback: NotificationFeedback[]): Promise<void> {
    if (!this.modelInitialized || !this.timingModel || feedback.length < this.MIN_TRAINING_SAMPLES) {
      return;
    }

    try {
      // Prepare training data
      const features: number[][] = [];
      const labels: number[] = [];
      
      for (const fb of feedback) {
        const score = await storage.getNotificationScores(fb.userId, 1);
        if (score.length === 0) continue;
        
        const notification = score[0];
        const sentTime = new Date(notification.actualSentAt || notification.createdAt || new Date());
        
        // Get notification type from features if available
        const notificationType = notification.features?.notificationType || 'system';
        
        features.push([
          sentTime.getHours() / 23,
          sentTime.getDay() / 6,
          this.encodeNotificationType(notificationType),
          notification.relevanceScore || 0.5,
          0.5, // Placeholder for historical engagement
          0.5, // Placeholder for day engagement
          notification.urgencyLevel / 5, // Normalize numeric urgency level
          0, // Placeholder for peak hour flag
        ]);
        
        labels.push(fb.action === 'clicked' ? 1 : 0);
      }
      
      if (features.length === 0) return;
      
      // Convert to tensors
      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels, [labels.length, 1]);
      
      // Train the model
      await this.timingModel.fit(xs, ys, {
        epochs: 10,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(`Training epoch ${epoch + 1}: loss = ${logs?.loss?.toFixed(4)}`);
          },
        },
      });
      
      // Save the updated model
      await this.timingModel.save('file://./models/notification-timing');
      
      // Clean up tensors
      xs.dispose();
      ys.dispose();
      
      console.log('Model updated with new feedback data');
    } catch (error) {
      console.error('Error updating model with feedback:', error);
    }
  }

  /**
   * Helper: Check if current time is in quiet hours
   */
  private isInQuietHours(time: Date, periods: Array<{ start: string; end: string; days: number[] }>): boolean {
    const hour = time.getHours();
    const minute = time.getMinutes();
    const dayOfWeek = time.getDay();
    const currentMinutes = hour * 60 + minute;
    
    for (const period of periods) {
      // Check if today is included in this period
      if (!period.days.includes(dayOfWeek)) continue;
      
      const [startHour, startMinute] = period.start.split(':').map(Number);
      const [endHour, endMinute] = period.end.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      
      if (startMinutes <= endMinutes) {
        // Quiet hours don't cross midnight
        if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
          return true;
        }
      } else {
        // Quiet hours cross midnight
        if (currentMinutes >= startMinutes || currentMinutes < endMinutes) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Helper: Get end of quiet hours
   */
  private getEndOfQuietHours(time: Date, periods: Array<{ start: string; end: string; days: number[] }>): Date {
    const dayOfWeek = time.getDay();
    let earliestEnd: Date | null = null;
    
    for (const period of periods) {
      // Check current and next 7 days for the next end time
      for (let daysAhead = 0; daysAhead < 7; daysAhead++) {
        const checkDate = new Date(time);
        checkDate.setDate(checkDate.getDate() + daysAhead);
        const checkDay = checkDate.getDay();
        
        if (!period.days.includes(checkDay)) continue;
        
        const [endHour, endMinute] = period.end.split(':').map(Number);
        const endTime = new Date(checkDate);
        endTime.setHours(endHour, endMinute, 0, 0);
        
        // Only consider future end times
        if (endTime > time && (!earliestEnd || endTime < earliestEnd)) {
          earliestEnd = endTime;
        }
      }
    }
    
    // If no end time found, default to tomorrow morning
    return earliestEnd || new Date(time.getTime() + 8 * 60 * 60 * 1000);
  }

  /**
   * Helper: Encode notification type as number
   */
  private encodeNotificationType(type: string): number {
    const types = ['expiring_food', 'meal_reminder', 'recipe_suggestion', 'shopping_alert', 'achievement', 'system'];
    return types.indexOf(type) / (types.length - 1);
  }

  /**
   * Helper: Encode urgency as number
   */
  private encodeUrgency(urgency: string): number {
    const levels = ['low', 'medium', 'high', 'immediate'];
    return levels.indexOf(urgency) / (levels.length - 1);
  }

  /**
   * Process notification queue and send pending notifications
   */
  async processNotificationQueue(): Promise<void> {
    try {
      const now = new Date();
      const pendingNotifications = await storage.getPendingNotifications(now);
      
      console.log(`Processing ${pendingNotifications.length} pending notifications`);
      
      for (const notification of pendingNotifications) {
        try {
          // Check user preferences for frequency limits
          const prefs = await storage.getNotificationPreferences(notification.userId);
          
          if (prefs?.frequencyLimit) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            
            const recentNotifs = await storage.getNotificationScores(notification.userId, 100);
            const todayCount = recentNotifs.filter(n => 
              n.actualSentAt && new Date(n.actualSentAt) >= todayStart
            ).length;
            
            // Check daily limit
            if (todayCount >= prefs.frequencyLimit) {
              console.log(`User ${notification.userId} has reached daily notification limit`);
              continue;
            }
          }
          
          // Send the notification (this would integrate with your push notification system)
          const notificationInfo = notification.notificationId ? 
            `Notification ID: ${notification.notificationId}` : 
            `Relevance: ${notification.relevanceScore.toFixed(2)}`;
          console.log(`Sending notification to user ${notification.userId}: ${notificationInfo}`);
          
          // Update the notification as sent
          await storage.updateNotificationScore(notification.id, {
            actualSentAt: now,
          });
          
          // You would integrate with your existing push notification system here
          // For example: await sendPushNotification(notification.userId, notification);
          
        } catch (error) {
          console.error(`Error processing notification ${notification.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error processing notification queue:', error);
    }
  }
}

// Export singleton instance
export const intelligentNotificationService = new IntelligentNotificationService();