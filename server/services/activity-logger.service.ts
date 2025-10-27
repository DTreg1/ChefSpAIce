/**
 * Activity Logger Service
 * 
 * Centralized service for logging all user actions and system events.
 * Provides async logging with batching, error handling, and performance optimizations.
 */

import { db } from "../db";
import { activityLogs, type InsertActivityLog, type ActivityLog } from "@shared/schema";
import { eq, sql, and, desc, gte, lte, inArray, or, isNull } from "drizzle-orm";

// Define all tracked action types as constants for consistency
export const ActivityActions = {
  // User actions
  LOGIN: 'login',
  LOGOUT: 'logout', 
  SIGNUP: 'signup',
  SETTINGS_CHANGED: 'settings_changed',
  PROFILE_UPDATED: 'profile_updated',
  
  // Food inventory
  FOOD_ADDED: 'food_added',
  FOOD_UPDATED: 'food_updated',
  FOOD_DELETED: 'food_deleted',
  FOOD_CONSUMED: 'food_consumed',
  FOOD_EXPIRED: 'food_expired',
  
  // Recipes
  RECIPE_GENERATED: 'recipe_generated',
  RECIPE_SAVED: 'recipe_saved',
  RECIPE_UPDATED: 'recipe_updated',
  RECIPE_DELETED: 'recipe_deleted',
  RECIPE_RATED: 'recipe_rated',
  RECIPE_VIEWED: 'recipe_viewed',
  RECIPE_FAVORITED: 'recipe_favorited',
  
  // AI chat
  MESSAGE_SENT: 'message_sent',
  AI_RESPONSE_RECEIVED: 'ai_response_received',
  CHAT_CLEARED: 'chat_cleared',
  
  // Notifications
  NOTIFICATION_SENT: 'notification_sent',
  NOTIFICATION_DELIVERED: 'notification_delivered',
  NOTIFICATION_DISMISSED: 'notification_dismissed',
  NOTIFICATION_FAILED: 'notification_failed',
  
  // Shopping
  SHOPPING_LIST_CREATED: 'shopping_list_created',
  SHOPPING_ITEM_ADDED: 'shopping_item_added',
  SHOPPING_ITEM_CHECKED: 'shopping_item_checked',
  SHOPPING_LIST_CLEARED: 'shopping_list_cleared',
  
  // Meal planning
  MEAL_PLANNED: 'meal_planned',
  MEAL_COMPLETED: 'meal_completed',
  MEAL_SKIPPED: 'meal_skipped',
  MEAL_UPDATED: 'meal_updated',
  
  // System events
  DATA_EXPORTED: 'data_exported',
  DATA_IMPORTED: 'data_imported',
  BULK_IMPORT: 'bulk_import',
  CLEANUP_JOB: 'cleanup_job',
  ERROR_OCCURRED: 'error_occurred',
  API_CALL: 'api_call',
  CACHE_CLEARED: 'cache_cleared',
  
  // Admin actions
  ADMIN_USER_CREATED: 'admin_user_created',
  ADMIN_USER_DELETED: 'admin_user_deleted',
  ADMIN_PERMISSION_CHANGED: 'admin_permission_changed',
  
  // Feedback
  FEEDBACK_SUBMITTED: 'feedback_submitted',
  FEEDBACK_RESPONDED: 'feedback_responded',
  FEEDBACK_RESOLVED: 'feedback_resolved',
  
  // Payments
  DONATION_MADE: 'donation_made',
  PAYMENT_FAILED: 'payment_failed',
} as const;

export type ActivityAction = typeof ActivityActions[keyof typeof ActivityActions];

export interface ActivityLogParams {
  userId?: string | null;
  action: ActivityAction | string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
}

export interface ActivityFilters {
  action?: string | string[];
  entity?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class ActivityLogger {
  private static instance: ActivityLogger;
  private logQueue: InsertActivityLog[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 50;
  private readonly BATCH_DELAY_MS = 1000; // 1 second
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private isProcessing = false;

  private constructor() {
    // Start periodic batch processing
    this.startBatchProcessor();
  }

  public static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger();
    }
    return ActivityLogger.instance;
  }

  /**
   * Log an activity asynchronously (non-blocking)
   */
  public async logActivity(params: ActivityLogParams): Promise<void> {
    try {
      const logEntry: InsertActivityLog = {
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        metadata: params.metadata || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        sessionId: params.sessionId || null,
      };

      // Add to queue for batch processing
      this.logQueue.push(logEntry);

      // Process immediately if queue is full
      if (this.logQueue.length >= this.BATCH_SIZE) {
        await this.processBatch();
      }
    } catch (error) {
      console.error('[ActivityLogger] Error queuing activity log:', error);
      // Don't throw - logging should never break the application
    }
  }

  /**
   * Log activity synchronously (blocking) - use sparingly
   */
  public async logActivitySync(params: ActivityLogParams): Promise<void> {
    try {
      const logEntry: InsertActivityLog = {
        userId: params.userId || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        metadata: params.metadata || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
        sessionId: params.sessionId || null,
      };

      await db.insert(activityLogs).values(logEntry);
    } catch (error) {
      console.error('[ActivityLogger] Error logging activity synchronously:', error);
      // Don't throw - logging should never break the application
    }
  }

  /**
   * Get activity logs with optional filters
   */
  public async getActivityLogs(
    userId?: string | null,
    filters?: ActivityFilters
  ): Promise<ActivityLog[]> {
    try {
      let query = db
        .select()
        .from(activityLogs)
        .$dynamic();

      const conditions: any[] = [];

      // User filter
      if (userId) {
        conditions.push(eq(activityLogs.userId, userId));
      }

      // Action filter (single or multiple)
      if (filters?.action) {
        if (Array.isArray(filters.action)) {
          conditions.push(inArray(activityLogs.action, filters.action));
        } else {
          conditions.push(eq(activityLogs.action, filters.action));
        }
      }

      // Entity filters
      if (filters?.entity) {
        conditions.push(eq(activityLogs.entity, filters.entity));
      }
      if (filters?.entityId) {
        conditions.push(eq(activityLogs.entityId, filters.entityId));
      }

      // Date range filters
      if (filters?.startDate) {
        conditions.push(gte(activityLogs.timestamp, filters.startDate));
      }
      if (filters?.endDate) {
        conditions.push(lte(activityLogs.timestamp, filters.endDate));
      }

      // Apply conditions
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Order by timestamp descending (most recent first)
      query = query.orderBy(desc(activityLogs.timestamp));

      // Apply limit and offset
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.offset(filters.offset);
      }

      return await query;
    } catch (error) {
      console.error('[ActivityLogger] Error fetching activity logs:', error);
      throw error;
    }
  }

  /**
   * Get user's activity timeline
   */
  public async getUserTimeline(
    userId: string,
    limit: number = 50
  ): Promise<ActivityLog[]> {
    return this.getActivityLogs(userId, { limit });
  }

  /**
   * Get system events (activities with no user)
   */
  public async getSystemEvents(
    filters?: ActivityFilters
  ): Promise<ActivityLog[]> {
    try {
      let query = db
        .select()
        .from(activityLogs)
        .where(isNull(activityLogs.userId))
        .$dynamic();

      // Apply additional filters if provided
      const conditions: any[] = [isNull(activityLogs.userId)];

      if (filters?.action) {
        if (Array.isArray(filters.action)) {
          conditions.push(inArray(activityLogs.action, filters.action));
        } else {
          conditions.push(eq(activityLogs.action, filters.action));
        }
      }

      if (filters?.startDate) {
        conditions.push(gte(activityLogs.timestamp, filters.startDate));
      }
      if (filters?.endDate) {
        conditions.push(lte(activityLogs.timestamp, filters.endDate));
      }

      query = query.where(and(...conditions))
        .orderBy(desc(activityLogs.timestamp));

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }
      if (filters?.offset) {
        query = query.offset(filters.offset);
      }

      return await query;
    } catch (error) {
      console.error('[ActivityLogger] Error fetching system events:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics for a user or system-wide
   */
  public async getActivityStats(
    userId?: string | null,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    try {
      const conditions: any[] = [];
      
      if (userId) {
        conditions.push(eq(activityLogs.userId, userId));
      }
      if (startDate) {
        conditions.push(gte(activityLogs.timestamp, startDate));
      }
      if (endDate) {
        conditions.push(lte(activityLogs.timestamp, endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get action counts
      const actionCounts = await db
        .select({
          action: activityLogs.action,
          count: sql<number>`count(*)::int`,
        })
        .from(activityLogs)
        .where(whereClause)
        .groupBy(activityLogs.action);

      // Get entity counts
      const entityCounts = await db
        .select({
          entity: activityLogs.entity,
          count: sql<number>`count(*)::int`,
        })
        .from(activityLogs)
        .where(whereClause)
        .groupBy(activityLogs.entity);

      // Get total count
      const totalResult = await db
        .select({
          total: sql<number>`count(*)::int`,
        })
        .from(activityLogs)
        .where(whereClause);

      const total = totalResult[0]?.total || 0;

      return {
        total,
        byAction: actionCounts,
        byEntity: entityCounts,
      };
    } catch (error) {
      console.error('[ActivityLogger] Error fetching activity stats:', error);
      throw error;
    }
  }

  /**
   * Delete old logs based on retention policy
   */
  public async cleanupOldLogs(
    retentionDays: number = 90,
    excludeActions?: string[]
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const conditions: any[] = [
        lte(activityLogs.timestamp, cutoffDate)
      ];

      // Exclude certain important actions from cleanup
      if (excludeActions && excludeActions.length > 0) {
        conditions.push(
          sql`${activityLogs.action} NOT IN (${sql.raw(
            excludeActions.map(a => `'${a}'`).join(',')
          )})`
        );
      }

      const result = await db
        .delete(activityLogs)
        .where(and(...conditions));

      const deletedCount = result.rowCount || 0;

      // Log the cleanup as a system event
      await this.logActivity({
        action: ActivityActions.CLEANUP_JOB,
        entity: 'system',
        metadata: {
          type: 'activity_logs_cleanup',
          retentionDays,
          deletedCount,
          cutoffDate: cutoffDate.toISOString(),
        },
      });

      return deletedCount;
    } catch (error) {
      console.error('[ActivityLogger] Error cleaning up old logs:', error);
      throw error;
    }
  }

  /**
   * Export user's activity logs for GDPR compliance
   */
  public async exportUserLogs(userId: string): Promise<ActivityLog[]> {
    try {
      const logs = await this.getActivityLogs(userId);
      
      // Log the export action
      await this.logActivity({
        userId,
        action: ActivityActions.DATA_EXPORTED,
        entity: 'user',
        entityId: userId,
        metadata: {
          type: 'activity_logs',
          count: logs.length,
        },
      });

      return logs;
    } catch (error) {
      console.error('[ActivityLogger] Error exporting user logs:', error);
      throw error;
    }
  }

  /**
   * Delete user's activity logs for GDPR compliance
   */
  public async deleteUserLogs(userId: string): Promise<number> {
    try {
      const result = await db
        .delete(activityLogs)
        .where(eq(activityLogs.userId, userId));

      return result.rowCount || 0;
    } catch (error) {
      console.error('[ActivityLogger] Error deleting user logs:', error);
      throw error;
    }
  }

  // Private methods for batch processing
  private startBatchProcessor(): void {
    // Process batch periodically
    this.batchTimer = setInterval(() => {
      if (this.logQueue.length > 0 && !this.isProcessing) {
        this.processBatch().catch(error => {
          console.error('[ActivityLogger] Batch processing error:', error);
        });
      }
    }, this.BATCH_DELAY_MS);
  }

  private async processBatch(retryCount: number = 0): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    try {
      // Take up to BATCH_SIZE items from the queue
      const batch = this.logQueue.splice(0, this.BATCH_SIZE);
      
      if (batch.length === 0) {
        return;
      }

      // Insert batch into database
      await db.insert(activityLogs).values(batch);
      
      console.log(`[ActivityLogger] Processed batch of ${batch.length} logs`);
    } catch (error) {
      console.error('[ActivityLogger] Error processing batch:', error);
      
      // Retry logic with exponential backoff
      if (retryCount < this.MAX_RETRY_ATTEMPTS) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`[ActivityLogger] Retrying batch in ${delay}ms (attempt ${retryCount + 1})`);
        
        setTimeout(() => {
          this.processBatch(retryCount + 1).catch(err => {
            console.error('[ActivityLogger] Retry failed:', err);
          });
        }, delay);
      } else {
        console.error('[ActivityLogger] Max retry attempts reached. Discarding batch.');
        // In production, you might want to save these to a file or alternate storage
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Force process any pending logs immediately
   */
  public async flush(): Promise<void> {
    if (this.logQueue.length > 0) {
      await this.processBatch();
    }
  }

  /**
   * Cleanup resources (call on app shutdown)
   */
  public destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    
    // Process any remaining logs
    this.flush().catch(error => {
      console.error('[ActivityLogger] Error flushing logs on destroy:', error);
    });
  }
}

// Export singleton instance
export const activityLogger = ActivityLogger.getInstance();