/**
 * Activity Logs Router
 * 
 * Provides API endpoints for retrieving and managing activity logs.
 * Includes user timelines, admin views, statistics, and data export.
 */

import { Router, Request as ExpressRequest, Response as ExpressResponse } from "express";
import { analyticsStorage } from "../storage/index";
import { isAuthenticated, adminOnly, getAuthenticatedUserId } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { ApiError } from "../apiError";

const router = Router();

/**
 * GET /api/activity-logs
 * 
 * Get current user's activity logs
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 * - action: Filter by action type(s)
 * - entity: Filter by entity type
 * - startDate: Filter by start date
 * - endDate: Filter by end date
 */
router.get(
  "/activity-logs",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      throw new ApiError("User not authenticated", 401);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    
    const filters: any = {};
    if (req.query.action) {
      filters.action = Array.isArray(req.query.action) 
        ? req.query.action 
        : req.query.action.split(',');
    }
    if (req.query.entity) {
      filters.entity = req.query.entity;
    }
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }

    const result = await analyticsStorage.getActivityLogsPaginated(
      userId,
      page,
      limit,
      filters
    );

    res.json(result);
  })
);

/**
 * GET /api/activity-logs/timeline
 * 
 * Get user's activity timeline (simplified view)
 * 
 * Query params:
 * - limit: Number of recent activities (default: 50, max: 100)
 */
router.get(
  "/activity-logs/timeline",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      throw new ApiError("User not authenticated", 401);
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    
    const timeline = await analyticsStorage.getUserActivityTimeline(userId, limit);
    
    res.json({
      data: timeline,
      total: timeline.length
    });
  })
);

/**
 * GET /api/activity-logs/stats
 * 
 * Get activity statistics for current user
 * 
 * Query params:
 * - startDate: Start date for statistics
 * - endDate: End date for statistics
 */
router.get(
  "/activity-logs/stats",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      throw new ApiError("User not authenticated", 401);
    }

    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : undefined;
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string) 
      : undefined;
    
    const stats = await analyticsStorage.getActivityStats(userId, startDate, endDate);
    
    res.json(stats);
  })
);

/**
 * GET /api/activity-logs/export
 * 
 * Export user's activity logs (GDPR compliance)
 * Returns all user's activity logs in JSON format
 */
router.get(
  "/activity-logs/export",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      throw new ApiError("User not authenticated", 401);
    }

    const logs = await analyticsStorage.exportUserActivityLogs(userId);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition', 
      `attachment; filename="activity-logs-${userId}-${Date.now()}.json"`
    );
    
    res.json({
      exportDate: new Date().toISOString(),
      userId,
      totalLogs: logs.length,
      logs
    });
  })
);

// ==================== Admin Endpoints ====================

/**
 * GET /api/admin/activity-logs
 * 
 * Get all activity logs (admin only)
 * 
 * Query params:
 * - userId: Filter by specific user
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 * - action: Filter by action type(s)
 * - entity: Filter by entity type
 * - startDate: Filter by start date
 * - endDate: Filter by end date
 */
router.get(
  "/admin/activity-logs",
  isAuthenticated,
  adminOnly,
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const userId = req.query.userId as string | undefined;
    
    const filters: any = {};
    if (req.query.action) {
      filters.action = Array.isArray(req.query.action) 
        ? req.query.action 
        : (req.query.action as string).split(',');
    }
    if (req.query.entity) {
      filters.entity = req.query.entity;
    }
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }

    const result = await analyticsStorage.getActivityLogsPaginated(
      userId || undefined,
      page,
      limit,
      filters
    );

    res.json(result);
  })
);

/**
 * GET /api/admin/activity-logs/system
 * 
 * Get system events (activities with no user)
 * 
 * Query params:
 * - action: Filter by action type(s)
 * - startDate: Filter by start date
 * - endDate: Filter by end date
 * - limit: Number of events (default: 100)
 */
router.get(
  "/admin/activity-logs/system",
  isAuthenticated,
  adminOnly,
  asyncHandler(async (req, res) => {
    const filters: any = {};
    
    if (req.query.action) {
      filters.action = Array.isArray(req.query.action) 
        ? req.query.action 
        : (req.query.action as string).split(',');
    }
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }
    filters.limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

    const events = await analyticsStorage.getSystemActivityLogs(filters);
    
    res.json({
      data: events,
      total: events.length
    });
  })
);

/**
 * GET /api/admin/activity-logs/stats
 * 
 * Get global activity statistics (admin only)
 * 
 * Query params:
 * - userId: Filter by specific user (optional)
 * - startDate: Start date for statistics
 * - endDate: End date for statistics
 */
router.get(
  "/admin/activity-logs/stats",
  isAuthenticated,
  adminOnly,
  asyncHandler(async (req, res) => {
    const userId = req.query.userId as string | undefined;
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : undefined;
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string) 
      : undefined;
    
    const stats = await analyticsStorage.getActivityStats(
      userId || undefined,
      startDate,
      endDate
    );
    
    res.json(stats);
  })
);

/**
 * POST /api/admin/activity-logs/cleanup
 * 
 * Trigger cleanup of old activity logs (admin only)
 * 
 * Body:
 * - retentionDays: Days to retain logs (default: 90)
 * - excludeActions: Array of action types to exclude from cleanup
 */
router.post(
  "/admin/activity-logs/cleanup",
  isAuthenticated,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { retentionDays = 90, excludeActions = []  } = req.body || {};
    
    // Validate retention days
    if (retentionDays < 7) {
      throw new ApiError("Retention period must be at least 7 days", 400);
    }
    if (retentionDays > 365) {
      throw new ApiError("Retention period cannot exceed 365 days", 400);
    }
    
    const deletedCount = await analyticsStorage.cleanupOldActivityLogs(
      retentionDays,
      excludeActions
    );
    
    res.json({
      success: true,
      message: `Successfully cleaned up ${deletedCount} old activity logs`,
      retentionDays,
      excludeActions,
      deletedCount
    });
  })
);

/**
 * GET /api/admin/activity-logs/user/:userId
 * 
 * Get specific user's activity logs (admin only)
 * 
 * Params:
 * - userId: User ID to fetch logs for
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 50)
 */
router.get(
  "/admin/activity-logs/user/:userId",
  isAuthenticated,
  adminOnly,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    
    const result = await analyticsStorage.getActivityLogsPaginated(
      userId,
      page,
      limit
    );
    
    res.json(result);
  })
);

/**
 * DELETE /api/activity-logs
 * 
 * Delete current user's activity logs (GDPR compliance)
 * This is for user privacy - allows users to delete their own logs
 */
router.delete(
  "/activity-logs",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      throw new ApiError("User not authenticated", 401);
    }

    // Require explicit confirmation
    if (req.body.confirm !== true) {
      throw new ApiError("Please confirm deletion by setting confirm: true", 400);
    }
    
    const deletedCount = await analyticsStorage.deleteUserActivityLogs(userId);
    
    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} activity logs`,
      deletedCount
    });
  })
);

export default router;