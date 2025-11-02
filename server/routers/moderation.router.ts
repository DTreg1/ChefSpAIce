import { Router, Request as ExpressRequest, Response as ExpressResponse } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { isAuthenticated } from "../middleware/auth.middleware";
import { validateBody, validateQuery } from "../middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { ModerationService } from "../services/moderation.service";
import type { InsertModerationLog, InsertBlockedContent, InsertModerationAppeal } from "@shared/schema";

const router = Router();
const moderationService = new ModerationService();

// Admin middleware - checks if user has moderation privileges
const isModerator = async (
  req: ExpressRequest<any, any, any, any>,
  res: ExpressResponse,
  next: (...args: any[]) => any
) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Check if user exists and has admin/moderator privileges
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(403).json({ error: "Access denied - User not found" });
    }
    
    // For now, only admins can moderate
    if (!user.isAdmin) {
      return res.status(403).json({ error: "Access denied - Moderator privileges required" });
    }
    
    next();
  } catch (error) {
    console.error("Moderator authorization check failed:", error);
    res.status(500).json({ error: "Authorization check failed" });
  }
};

// ==================== Moderation Check ====================

/**
 * POST /api/moderate/check
 * Check content for violations using AI moderation
 */
const moderationCheckSchema = z.object({
  content: z.string().min(1, "Content is required"),
  contentType: z.enum(["recipe", "comment", "review", "chat", "profile"]),
  contentId: z.string().optional(),
});

router.post(
  "/check",
  isAuthenticated,
  validateBody(moderationCheckSchema),
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { content, contentType, contentId } = req.body;
    
    try {
      // Check content for violations
      const result = await moderationService.checkContent(
        content,
        contentType,
        userId,
        contentId
      );
      
      // Determine if content is blocked or flagged
      const isBlocked = result.action === 'blocked';
      const isFlagged = result.action === 'flagged' || result.action === 'warning';
      
      // Create moderation log
      const logEntry: InsertModerationLog = {
        userId,
        contentType,
        contentId: contentId || '',
        content,
        actionTaken: result.action === 'approved' ? "approved" : result.action,
        severity: result.severity,
        categories: result.categories,
        confidence: result.confidence,
        modelUsed: "tensorflow-toxicity+openai-moderation",
        toxicityScores: result.toxicityScores,
        manualReview: result.requiresManualReview || false,
      };
      
      const log = await storage.createModerationLog(logEntry);
      
      // If content is blocked, create blocked content entry
      if (isBlocked) {
        const blockedEntry: InsertBlockedContent = {
          userId,
          contentType,
          content,
          originalContentId: contentId,
          reason: result.message || "Content violates community guidelines",
          blockedCategories: result.categories,
          toxicityLevel: result.confidence,
          status: "blocked",
          autoBlocked: true,
        };
        
        await storage.createBlockedContent(blockedEntry);
      }
      
      res.json({
        allowed: result.approved,
        blocked: isBlocked,
        flagged: isFlagged,
        message: result.message,
        categories: result.categories,
        severity: result.severity,
        confidence: result.confidence,
        logId: log.id,
        suggestions: result.suggestions,
      });
    } catch (error) {
      console.error("Error checking content for moderation:", error);
      res.status(500).json({ error: "Failed to check content" });
    }
  })
);

// ==================== Moderation Queue ====================

/**
 * GET /api/moderate/queue
 * Get moderation queue (admin/moderator only)
 */
const queueQuerySchema = z.object({
  status: z.enum(["pending_review", "under_review", "resolved", "escalated"]).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  contentType: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

router.get(
  "/queue",
  isAuthenticated,
  isModerator,
  validateQuery(queueQuerySchema),
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { status, severity, contentType, page, limit } = req.query as any;
    
    // Get user to check if admin
    const user = await storage.getUser(userId);
    const isAdmin = user?.isAdmin || false;
    
    // Get moderation queue
    const logs = await storage.getModerationQueue(userId, isAdmin, {
      status,
      severity,
      contentType,
    });
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = logs.slice(startIndex, endIndex);
    
    res.json({
      data: paginatedLogs,
      pagination: {
        page,
        limit,
        total: logs.length,
        totalPages: Math.ceil(logs.length / limit),
      },
    });
  })
);

// ==================== Moderation Action ====================

/**
 * POST /api/moderate/action
 * Take action on moderated content (admin/moderator only)
 */
const moderationActionSchema = z.object({
  logId: z.string(),
  action: z.enum(["approve", "block", "escalate", "dismiss"]),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

router.post(
  "/action",
  isAuthenticated,
  isModerator,
  validateBody(moderationActionSchema),
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
    const moderatorId = (req.user as any)?.id;
    if (!moderatorId) return res.status(401).json({ error: "Unauthorized" });
    
    const { logId, action, reason, notes } = req.body;
    
    try {
      // Update moderation log based on action
      const updates: Partial<InsertModerationLog> = {
        reviewedBy: moderatorId,
        reviewedAt: new Date(),
        reviewNotes: notes,
        manualReview: true,
      };
      
      switch (action) {
        case "approve":
          updates.actionTaken = "approved";
          break;
        case "block":
          updates.actionTaken = "blocked";
          updates.overrideReason = reason || "Content violates community guidelines";
          break;
        case "escalate":
          updates.manualReview = true; // Mark for further review
          break;
        case "dismiss":
          updates.actionTaken = "approved";
          break;
      }
      
      await storage.updateModerationLog(logId, updates);
      
      res.json({
        success: true,
        action,
        logId,
        message: `Content ${action}ed successfully`,
      });
    } catch (error) {
      console.error("Error taking moderation action:", error);
      res.status(500).json({ error: "Failed to process moderation action" });
    }
  })
);

// ==================== Appeals ====================

/**
 * POST /api/moderate/appeal
 * Submit an appeal for blocked content
 */
const appealSubmitSchema = z.object({
  blockedContentId: z.string(),
  reason: z.string().min(10, "Appeal reason must be at least 10 characters"),
  additionalContext: z.string().optional(),
});

router.post(
  "/appeal",
  isAuthenticated,
  validateBody(appealSubmitSchema),
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { blockedContentId, reason, additionalContext } = req.body;
    
    try {
      const appeal: InsertModerationAppeal = {
        blockedContentId,
        contentId: blockedContentId, // Use blockedContentId as contentId for now
        userId,
        appealReason: reason,
        supportingEvidence: additionalContext,
        status: "pending",
        appealType: "false_positive", // Default type
      };
      
      const createdAppeal = await storage.createModerationAppeal(appeal);
      
      res.json({
        success: true,
        appealId: createdAppeal.id,
        message: "Your appeal has been submitted and will be reviewed soon",
      });
    } catch (error) {
      console.error("Error submitting appeal:", error);
      res.status(500).json({ error: "Failed to submit appeal" });
    }
  })
);

/**
 * GET /api/moderate/appeal/:id
 * Get appeal details
 */
router.get(
  "/appeal/:id",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id } = req.params;
    
    try {
      const appeal = await storage.getModerationAppeal(id);
      
      if (!appeal) {
        return res.status(404).json({ error: "Appeal not found" });
      }
      
      // Check if user owns the appeal or is admin
      const user = await storage.getUser(userId);
      if (appeal.userId !== userId && !user?.isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(appeal);
    } catch (error) {
      console.error("Error fetching appeal:", error);
      res.status(500).json({ error: "Failed to fetch appeal" });
    }
  })
);

/**
 * POST /api/moderate/appeal/:id/review
 * Review an appeal (admin/moderator only)
 */
const appealReviewSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reviewNotes: z.string().optional(),
});

router.post(
  "/appeal/:id/review",
  isAuthenticated,
  isModerator,
  validateBody(appealReviewSchema),
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
    const reviewerId = (req.user as any)?.id;
    if (!reviewerId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id } = req.params;
    const { decision, reviewNotes } = req.body;
    
    try {
      const updates: Partial<InsertModerationAppeal> = {
        status: decision,
        decidedBy: reviewerId,
        decidedAt: new Date(),
        decisionReason: reviewNotes,
        decision,
      };
      
      await storage.updateModerationAppeal(id, updates);
      
      // If appeal is approved, restore the blocked content
      if (decision === "approved") {
        const appeal = await storage.getModerationAppeal(id);
        if (appeal && appeal.blockedContentId) {
          await storage.restoreBlockedContent(appeal.blockedContentId, reviewerId);
        }
      }
      
      res.json({
        success: true,
        decision,
        message: `Appeal ${decision}`,
      });
    } catch (error) {
      console.error("Error reviewing appeal:", error);
      res.status(500).json({ error: "Failed to review appeal" });
    }
  })
);

// ==================== Statistics ====================

/**
 * GET /api/moderate/stats
 * Get moderation statistics (admin/moderator only)
 */
const statsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.enum(["day", "week", "month", "year"]).optional(),
});

router.get(
  "/stats",
  isAuthenticated,
  isModerator,
  validateQuery(statsQuerySchema),
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
    const { startDate, endDate, period } = req.query as any;
    
    try {
      // Calculate time range based on period or custom dates
      let timeRange;
      if (startDate && endDate) {
        timeRange = {
          start: new Date(startDate),
          end: new Date(endDate),
        };
      } else if (period) {
        const now = new Date();
        const start = new Date();
        
        switch (period) {
          case "day":
            start.setDate(start.getDate() - 1);
            break;
          case "week":
            start.setDate(start.getDate() - 7);
            break;
          case "month":
            start.setMonth(start.getMonth() - 1);
            break;
          case "year":
            start.setFullYear(start.getFullYear() - 1);
            break;
        }
        
        timeRange = { start, end: now };
      }
      
      const stats = await storage.getModerationStats(timeRange);
      
      res.json({
        ...stats,
        timeRange,
        period,
      });
    } catch (error) {
      console.error("Error fetching moderation stats:", error);
      res.status(500).json({ error: "Failed to fetch moderation statistics" });
    }
  })
);

export default router;