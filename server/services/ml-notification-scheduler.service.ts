/**
 * Notification Scheduler Service
 * 
 * Runs periodic tasks for the intelligent notification system including:
 * - Processing the notification queue for delayed deliveries
 * - Training the ML model with new feedback data
 * - Cleaning up old notification records
 */

import * as cron from 'node-cron';
import { intelligentNotificationService } from '../notifications/intelligent-service';
import { storage } from "../storage/index";
import { db } from '../db';
import { notificationFeedback, notificationScores } from '@shared/schema';
import { gte, lte, and, isNotNull, desc } from 'drizzle-orm';

export class NotificationSchedulerService {
  private queueProcessingTask: cron.ScheduledTask | null = null;
  private modelTrainingTask: cron.ScheduledTask | null = null;
  private cleanupTask: cron.ScheduledTask | null = null;
  
  /**
   * Start all notification-related scheduled tasks
   */
  start(): void {
    
    // Process notification queue every minute
    // TEMPORARILY DISABLED: This is blocking server startup
    /* this.queueProcessingTask = cron.schedule('* * * * *', async () => {
      try {
        await intelligentNotificationService.processNotificationQueue();
      } catch (error) {
        console.error('Error in notification queue processing:', error);
      }
    }); */
    
    // Train model with new feedback every 6 hours
    this.modelTrainingTask = cron.schedule('0 */6 * * *', async () => {
      try {
        console.log('Starting ML model training with recent feedback...');
        
        // Get all users who have recent feedback
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const recentFeedback = await db
          .selectDistinct({ userId: notificationFeedback.userId })
          .from(notificationFeedback)
          .where(
            gte(notificationFeedback.createdAt, sevenDaysAgo)
          )
          .limit(100);
        
        for (const { userId } of recentFeedback) {
          const feedback = await storage.user.notifications.getNotificationFeedback(userId);
          if (feedback.length >= 20) {
            await intelligentNotificationService.updateModelWithFeedback(feedback);
            console.log(`Updated model for user ${userId} with ${feedback.length} feedback items`);
          }
        }
        
        console.log('ML model training completed');
      } catch (error) {
        console.error('Error in model training task:', error);
      }
    });
    
    // Clean up old notification records every day at 3 AM
    this.cleanupTask = cron.schedule('0 3 * * *', async () => {
      try {
        console.log('Starting notification cleanup...');
        
        // Delete notification scores older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        await db
          .delete(notificationScores)
          .where(
            and(
              lte(notificationScores.createdAt, thirtyDaysAgo),
              isNotNull(notificationScores.actualSentAt) // Only delete sent notifications
            )
          );
        
        // Delete feedback older than 90 days
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        
        await db
          .delete(notificationFeedback)
          .where(
            lte(notificationFeedback.createdAt, ninetyDaysAgo)
          );
        
        console.log('Notification cleanup completed');
      } catch (error) {
        console.error('Error in cleanup task:', error);
      }
    });
  }
  
  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    if (this.queueProcessingTask) {
      this.queueProcessingTask.stop();
      this.queueProcessingTask = null;
    }
    
    if (this.modelTrainingTask) {
      this.modelTrainingTask.stop();
      this.modelTrainingTask = null;
    }
    
    if (this.cleanupTask) {
      this.cleanupTask.stop();
      this.cleanupTask = null;
    }
  }
}

// Create and export singleton instance
export const notificationScheduler = new NotificationSchedulerService();