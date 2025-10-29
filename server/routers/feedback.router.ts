import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertFeedbackSchema, type Feedback } from "@shared/schema";
import { isAuthenticated } from "../replitAuth";
import { validateBody, validateQuery, paginationQuerySchema } from "../middleware";

const router = Router();

// Submit feedback
router.post(
  "/feedback",
  isAuthenticated,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validation = insertFeedbackSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors
        });
      }

      const feedback = await storage.createFeedback(userId, validation.data);
      
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
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const { page = 1, limit = 10, category, status } = req.query;
      
      let feedbacks = await storage.getUserFeedback(userId, limit * 10); // Get more for filtering
      
      // Apply filters
      if (category) {
        feedbacks = feedbacks.filter((f: Feedback) => f.category === category);
      }
      
      if (status) {
        feedbacks = feedbacks.filter((f: Feedback) => f.status === status);
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
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const feedbackId = req.params.id;
      
      await storage.upvoteFeedback(userId, feedbackId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating feedback:", error);
      res.status(500).json({ error: "Failed to update feedback" });
    }
  }
);

export default router;