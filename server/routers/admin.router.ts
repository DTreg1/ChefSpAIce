import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { validateBody, validateQuery, paginationQuerySchema } from "../middleware";

const router = Router();

// Admin middleware - checks if user is admin (you might want to implement this)
const isAdmin = async (req: any, res: Response, next: Function) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // For now, just check if user is authenticated
    // In production, you'd check against an admin flag in the database
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // You could add: if (!user.isAdmin) { return res.status(403)... }
    next();
  } catch (error) {
    res.status(500).json({ error: "Authorization check failed" });
  }
};

// Get all users (admin only) with pagination
router.get(
  "/users",
  isAuthenticated,
  isAdmin,
  validateQuery(paginationQuerySchema),
  async (req: any, res: Response) => {
    try {
      const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = req.query;
      
      // In a real implementation, you'd have a storage method for this
      // For now, return empty array as placeholder
      const users: any[] = [];
      
      res.json({
        users,
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  }
);

// Get user details (admin only)
router.get(
  "/users/:userId",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  }
);

// Update user (admin only)
router.patch(
  "/users/:userId",
  isAuthenticated,
  isAdmin,
  async (req: any, res: Response) => {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      // Remove sensitive fields that shouldn't be updated directly
      delete updates.id;
      delete updates.createdAt;
      
      const updatedUser = await storage.updateUserPreferences(userId, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  }
);

// Delete user data (admin only)
router.delete(
  "/users/:userId",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      
      // In a real implementation, you'd cascade delete all user data
      // This is a placeholder - you'd need to implement deleteUser in storage
      res.json({ message: `User ${userId} data deletion scheduled` });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  }
);

// System stats endpoint (admin only)
router.get(
  "/stats",
  isAuthenticated,
  isAdmin,
  async (req: any, res: Response) => {
    try {
      const stats = {
        totalUsers: 0,
        totalFoodItems: 0,
        totalRecipes: 0,
        totalApiCalls: 0,
        activeUsers24h: 0,
        // Add more stats as needed
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  }
);

// User activity log (admin only)
router.get(
  "/activity",
  isAuthenticated,
  isAdmin,
  validateQuery(paginationQuerySchema.extend({
    userId: z.string().optional(),
    action: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })),
  async (req: any, res: Response) => {
    try {
      const { page = 1, limit = 50, userId, action, startDate, endDate } = req.query;
      
      // Placeholder for activity logs
      const activities: any[] = [];
      
      res.json({
        activities,
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      });
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  }
);

export default router;