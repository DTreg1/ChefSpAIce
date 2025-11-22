import { Router, Request, Response } from "express";
import { getAuthenticatedUserId, validateBody, sendError, sendSuccess } from "../types/request-helpers";
import { z } from "zod";
import { feedbackStorage } from "../storage/index";
import { insertUserFeedbackSchema, type UserFeedback } from "@shared/schema";
// Use OAuth authentication middleware
import { isAuthenticated } from "../middleware/oauth.middleware";
import { validateQuery, paginationQuerySchema } from "../middleware";

const router = Router();

// Submit feedback
router.post(
  "/feedback",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");
      const validation = insertUserFeedbackSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors
        });
      }

      const feedback = await feedbackStorage.createFeedback(userId, validation.data);
      
      res.json(feedback);
    } catch (error) {
      console.error("Error creating feedback:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  }
);

// Get user's feedback
router.get(
  "/feedback",
  isAuthenticated,
  validateQuery(paginationQuerySchema.extend({
    category: z.string().optional(),
    status: z.string().optional(),
  })),
  async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");
      const { page = 1, limit = 10, category, status } = req.query;
      
      let feedbacks = await feedbackStorage.getUserFeedback(userId, limit * 10); // Get more for filtering
      
      // Apply filters
      if (category) {
        feedbacks = feedbacks.filter((f: UserFeedback) => f.category === category);
      }
      
      if (status) {
        feedbacks = feedbacks.filter((f: UserFeedback) => f.status === status);
      }
      
      // Paginate
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedFeedbacks = feedbacks.slice(startIndex, endIndex);
      
      res.json({
        feedbacks: paginatedFeedbacks,
        pagination: {
          page,
          limit,
          total: feedbacks.length,
          totalPages: Math.ceil(feedbacks.length / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching feedback:", error);
      res.status(500).json({ error: "Failed to fetch feedback" });
    }
  }
);

// Upvote feedback
router.patch(
  "/feedback/:id/upvote",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userId = getAuthenticatedUserId(req);
    if (!userId) return sendError(res, 401, "Unauthorized");
      const feedbackId = req.params.id;
      
      await feedbackStorage.upvoteFeedback(userId, feedbackId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating feedback:", error);
      res.status(500).json({ error: "Failed to update feedback" });
    }
  }
);

export default router;