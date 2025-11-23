/**
 * RESTful Analytics & Platform Router v1
 * Implements standardized RESTful endpoints for analytics, notifications, and activities
 */

import { Router, Request, Response } from "express";
import { storage } from "../../storage/index";
import { getAuthenticatedUserId, sendError, sendSuccess } from "../../types/request-helpers";
import { isAuthenticated, adminOnly } from "../../middleware/oauth.middleware";
import { analyticsRateLimit } from "../../middleware";
import { asyncHandler } from "../../middleware/error.middleware";
import { 
  insertWebVitalSchema, 
  insertAnalyticsEventSchema,
  notificationHistory
} from "@shared/schema";
import { createApiResponse } from "../../config/api.config";
import { retryWithBackoff } from "../../utils/retry-handler";
import { ApiError } from "../../utils/apiError";
import { eq, desc, and, isNull } from "drizzle-orm";
import { db } from "../../db";

const router = Router();

// ============================================
// ANALYTICS EVENTS RESOURCE
// ============================================

/**
 * GET /api/v1/analytics/events
 * Get analytics events with filtering
 */
router.get("/analytics/events", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const isAdmin = req.user?.isAdmin || false;
    
    const {
      page = "1",
      limit = "50",
      eventType,
      startDate,
      endDate
    } = req.query;
    
    // Only allow users to see their own events unless they're admin
    const targetUserId = isAdmin && req.query.userId ? req.query.userId as string : userId;
    
    // Get analytics events (this would need to be implemented in storage)
    const events = await storage.platform.analytics.getAnalyticsEvents(
      targetUserId || undefined,
      {
        eventType: eventType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      }
    );
    
    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedEvents = events.slice(startIndex, endIndex);
    
    res.json(createApiResponse.paginated(
      paginatedEvents,
      pageNum,
      limitNum,
      events.length
    ));
  } catch (error) {
    console.error("Error fetching analytics events:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch analytics events"));
  }
});

/**
 * POST /api/v1/analytics/events
 * Record analytics events (batch processing)
 */
router.post("/analytics/events", analyticsRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  const { events } = req.body || {};
  
  if (!events || !Array.isArray(events)) {
    return res.status(400).json(createApiResponse.error(
      "VALIDATION_ERROR",
      "Invalid events format. Expected array of events"
    ));
  }
  
  try {
    const validatedEvents = [];
    const errors = [];
    
    for (let i = 0; i < events.length; i++) {
      try {
        const validated = insertAnalyticsEventSchema.parse({
          ...events[i],
          userId: userId ?? undefined,
        });
        validatedEvents.push(validated);
      } catch (validationError) {
        errors.push({
          index: i,
          error: "Validation failed",
          details: validationError
        });
      }
    }
    
    if (validatedEvents.length === 0) {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "No valid events to process",
        errors
      ));
    }
    
    // Batch insert validated events
    await storage.platform.analytics.recordAnalyticsEventsBatch(validatedEvents);
    
    res.status(201).json(createApiResponse.success({
      processed: validatedEvents.length,
      skipped: events.length - validatedEvents.length,
      errors: errors.length > 0 ? errors : undefined
    }, "Analytics events recorded successfully"));
  } catch (error) {
    console.error("Failed to record analytics events:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to record analytics events"));
  }
}));

/**
 * GET /api/v1/analytics/web-vitals
 * Get web vitals data
 */
router.get("/analytics/web-vitals", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const isAdmin = req.user?.isAdmin || false;
    
    const {
      page = "1",
      limit = "50",
      metric,
      startDate,
      endDate
    } = req.query;
    
    // Only allow users to see their own data unless they're admin
    const targetUserId = isAdmin && req.query.userId ? req.query.userId as string : userId;
    
    const webVitals = await storage.platform.analytics.getWebVitals(
      targetUserId || undefined,
      {
        metric: metric as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      }
    );
    
    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedVitals = webVitals.slice(startIndex, endIndex);
    
    res.json(createApiResponse.paginated(
      paginatedVitals,
      pageNum,
      limitNum,
      webVitals.length
    ));
  } catch (error) {
    console.error("Error fetching web vitals:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch web vitals"));
  }
});

/**
 * POST /api/v1/analytics/web-vitals
 * Record web vitals
 */
router.post("/analytics/web-vitals", analyticsRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  const userAgent = req.headers["user-agent"] || null;
  const url = req.headers["referer"] || req.headers["origin"] || null;
  
  try {
    const validated = insertWebVitalSchema.parse({
      ...req.body,
      userId: userId ?? undefined,
      metricId: req.body.id,
      navigationType: req.body.navigationType || null,
      userAgent,
      url,
    });
    
    await retryWithBackoff(
      async () => {
        await storage.platform.analytics.recordWebVital(validated);
      },
      {
        maxRetries: 3,
        initialDelay: 100
      }
    );
    
    res.status(201).json(createApiResponse.success(null, "Web vital recorded successfully"));
  } catch (validationError) {
    console.warn("Web vital validation error:", validationError);
    res.status(400).json(createApiResponse.error(
      "VALIDATION_ERROR",
      "Invalid web vital data",
      validationError
    ));
  }
}));

// ============================================
// ACTIVITIES RESOURCE
// ============================================

/**
 * GET /api/v1/activities
 * Get user activity logs
 */
router.get("/activities", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
  }
  
  const {
    page = "1",
    limit = "50",
    action,
    entity,
    startDate,
    endDate
  } = req.query;
  
  const filters: any = {};
  if (action) {
    filters.action = Array.isArray(action) ? action : (action as string).split(',');
  }
  if (entity) {
    filters.entity = entity;
  }
  if (startDate) {
    filters.startDate = new Date(startDate as string);
  }
  if (endDate) {
    filters.endDate = new Date(endDate as string);
  }
  
  const result = await storage.platform.analytics.getActivityLogsPaginated(
    userId,
    Number(page),
    Number(limit),
    filters
  );
  
  res.json(createApiResponse.paginated(
    result.data,
    result.page,
    result.limit,
    result.total
  ));
}));

/**
 * GET /api/v1/activities/:id
 * Get a specific activity log
 */
router.get("/activities/:id", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
  }
  
  const activityId = req.params.id;
  
  // Get activity and verify it belongs to user
  const activities = await storage.platform.analytics.getActivityLogsPaginated(userId, 1, 1000);
  const activity = activities.data.find((a: any) => a.id === activityId);
  
  if (!activity) {
    return res.status(404).json(createApiResponse.error("NOT_FOUND", "Activity not found"));
  }
  
  res.json(createApiResponse.success(activity));
}));

/**
 * GET /api/v1/activities/timeline
 * Get user's activity timeline
 */
router.get("/activities/timeline", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
  }
  
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  
  const timeline = await storage.platform.analytics.getUserActivityTimeline(userId, limit);
  
  res.json(createApiResponse.success(timeline, "Activity timeline retrieved successfully"));
}));

/**
 * GET /api/v1/activities/stats
 * Get activity statistics
 */
router.get("/activities/stats", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
  }
  
  const startDate = req.query.startDate 
    ? new Date(req.query.startDate as string) 
    : undefined;
  const endDate = req.query.endDate 
    ? new Date(req.query.endDate as string) 
    : undefined;
  
  const stats = await storage.platform.analytics.getActivityStats(userId, startDate, endDate);
  
  res.json(createApiResponse.success(stats));
}));

/**
 * POST /api/v1/activities
 * Log a new activity
 */
router.post("/activities", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
  }
  
  const { action, entity, entityId, metadata } = req.body;
  
  if (!action || !entity) {
    return res.status(400).json(createApiResponse.error(
      "VALIDATION_ERROR",
      "Action and entity are required fields"
    ));
  }
  
  const activity = await storage.platform.analytics.logActivity({
    userId,
    action,
    entity,
    entityId,
    metadata,
    timestamp: new Date()
  });
  
  res.status(201).json(createApiResponse.success(activity, "Activity logged successfully"));
}));

/**
 * DELETE /api/v1/activities
 * Delete user's activity logs (GDPR compliance)
 */
router.delete("/activities", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
  }
  
  // Require explicit confirmation
  if (req.body.confirm !== true) {
    return res.status(400).json(createApiResponse.error(
      "CONFIRMATION_REQUIRED",
      "Please confirm deletion by setting confirm: true"
    ));
  }
  
  const deletedCount = await storage.platform.analytics.deleteUserActivityLogs(userId);
  
  res.json(createApiResponse.success({
    deletedCount
  }, `Successfully deleted ${deletedCount} activity logs`));
}));

// ============================================
// NOTIFICATIONS RESOURCE
// ============================================

/**
 * GET /api/v1/notifications
 * Get user notifications
 */
router.get("/notifications", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    }
    
    const {
      page = "1",
      limit = "50",
      includeDismissed = "false"
    } = req.query;
    
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    
    let query;
    if (includeDismissed === 'true') {
      query = db
        .select()
        .from(notificationHistory)
        .where(eq(notificationHistory.userId, userId))
        .orderBy(desc(notificationHistory.sentAt))
        .limit(limitNum)
        .offset(offset);
    } else {
      query = db
        .select()
        .from(notificationHistory)
        .where(
          and(
            eq(notificationHistory.userId, userId),
            isNull(notificationHistory.dismissedAt)
          )
        )
        .orderBy(desc(notificationHistory.sentAt))
        .limit(limitNum)
        .offset(offset);
    }
    
    const notifications = await query;
    
    // Get total count for pagination
    const totalQuery = includeDismissed === 'true'
      ? db.select().from(notificationHistory).where(eq(notificationHistory.userId, userId))
      : db.select().from(notificationHistory).where(
          and(
            eq(notificationHistory.userId, userId),
            isNull(notificationHistory.dismissedAt)
          )
        );
    
    const totalResult = await totalQuery;
    const total = totalResult.length;
    
    res.json(createApiResponse.paginated(
      notifications,
      pageNum,
      limitNum,
      total
    ));
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch notifications"));
  }
});

/**
 * GET /api/v1/notifications/:id
 * Get a specific notification
 */
router.get("/notifications/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    }
    
    const { id } = req.params;
    
    const [notification] = await db
      .select()
      .from(notificationHistory)
      .where(
        and(
          eq(notificationHistory.id, id),
          eq(notificationHistory.userId, userId)
        )
      )
      .limit(1);
    
    if (!notification) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Notification not found"));
    }
    
    res.json(createApiResponse.success(notification));
  } catch (error) {
    console.error("Error fetching notification:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch notification"));
  }
});

/**
 * POST /api/v1/notifications
 * Create a notification (admin only)
 */
router.post("/notifications", isAuthenticated, adminOnly, async (req: Request, res: Response) => {
  try {
    const { userId, type, title, message, priority, data } = req.body;
    
    if (!userId || !type || !title || !message) {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "userId, type, title, and message are required"
      ));
    }
    
    const notification = await storage.user.notifications.createNotification({
      userId,
      type,
      title,
      message,
      priority: priority || 'medium',
      data,
      status: 'pending',
      sentAt: new Date()
    });
    
    res.status(201).json(createApiResponse.success(notification, "Notification created successfully"));
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to create notification"));
  }
});

/**
 * PUT /api/v1/notifications/:id
 * Update a notification (mark as read, etc.)
 */
router.put("/notifications/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    }
    
    const { id } = req.params;
    const { status } = req.body;
    
    const updateData: any = {};
    
    if (status === 'opened') {
      updateData.status = 'opened';
      updateData.openedAt = new Date();
    } else if (status === 'interacted') {
      updateData.status = 'interacted';
      updateData.interactedAt = new Date();
    }
    
    const [updated] = await db
      .update(notificationHistory)
      .set(updateData)
      .where(
        and(
          eq(notificationHistory.id, id),
          eq(notificationHistory.userId, userId)
        )
      )
      .returning();
    
    if (!updated) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Notification not found"));
    }
    
    res.json(createApiResponse.success(updated, "Notification updated successfully"));
  } catch (error) {
    console.error("Error updating notification:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to update notification"));
  }
});

/**
 * DELETE /api/v1/notifications/:id
 * Dismiss a notification
 */
router.delete("/notifications/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    }
    
    const { id } = req.params;
    const { dismissedBy = 'user' } = req.body || {};
    
    await storage.user.notifications.dismissNotification(userId, id, dismissedBy);
    
    res.json(createApiResponse.success(null, "Notification dismissed successfully"));
  } catch (error: any) {
    console.error("Error dismissing notification:", error);
    if (error.message === "Notification not found") {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Notification not found"));
    }
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to dismiss notification"));
  }
});

/**
 * GET /api/v1/notifications/unread-count
 * Get unread notification count
 */
router.get("/notifications/unread-count", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    }
    
    const unreadNotifications = await db
      .select()
      .from(notificationHistory)
      .where(
        and(
          eq(notificationHistory.userId, userId),
          eq(notificationHistory.status, 'delivered')
        )
      );
    
    res.json(createApiResponse.success({ count: unreadNotifications.length }));
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch unread count"));
  }
});

/**
 * DELETE /api/v1/notifications
 * Clear all notifications for user
 */
router.delete("/notifications", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    }
    
    // Require explicit confirmation
    if (req.body.confirm !== true) {
      return res.status(400).json(createApiResponse.error(
        "CONFIRMATION_REQUIRED",
        "Please confirm deletion by setting confirm: true"
      ));
    }
    
    await db
      .delete(notificationHistory)
      .where(eq(notificationHistory.userId, userId));
    
    res.json(createApiResponse.success(null, "All notifications cleared successfully"));
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to clear notifications"));
  }
});

// ============================================
// ANALYTICS DASHBOARD
// ============================================

/**
 * GET /api/v1/analytics/dashboard
 * Get aggregated analytics dashboard data
 */
router.get("/analytics/dashboard", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  const isAdmin = req.user?.isAdmin || false;
  
  const { startDate, endDate } = req.query;
  
  // Only admins can see global dashboard
  const targetUserId = isAdmin && !req.query.userId ? undefined : (req.query.userId as string || userId);
  
  const dateRange = {
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined
  };
  
  const dashboardData = await storage.platform.analytics.getDashboardStats(
    targetUserId || undefined,
    dateRange
  );
  
  res.json(createApiResponse.success(dashboardData));
}));

export default router;