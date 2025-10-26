import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { isAuthenticated } from "../replitAuth";
import { validateBody, validateQuery, paginationQuerySchema } from "../middleware";

const router = Router();

// Admin middleware - checks if user is admin
const isAdmin = async (req: any, res: Response, next: Function) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    // Check if user exists and has admin privileges
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(403).json({ error: "Access denied - User not found" });
    }
    
    // Check admin flag
    if (!user.isAdmin) {
      return res.status(403).json({ error: "Access denied - Admin privileges required" });
    }
    
    next();
  } catch (error) {
    console.error("Admin authorization check failed:", error);
    res.status(500).json({ error: "Authorization check failed" });
  }
};

// Schema for admin users query with whitelisted sort columns
const adminUsersQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
  sortBy: z.enum(["createdAt", "email", "firstName", "lastName", "isAdmin"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// Get all users (admin only) with pagination
router.get(
  "/users",
  isAuthenticated,
  isAdmin,
  validateQuery(adminUsersQuerySchema),
  async (req: any, res: Response) => {
    try {
      const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = req.query;
      
      const result = await storage.getAllUsers(
        Number(page),
        Number(limit),
        sortBy as string,
        sortOrder as string
      );
      
      res.json({
        users: result.data,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
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

// Update user admin status (admin only)
router.patch(
  "/users/:userId/admin",
  isAuthenticated,
  isAdmin,
  validateBody(z.object({
    isAdmin: z.boolean(),
  })),
  async (req: any, res: Response) => {
    try {
      const { userId } = req.params;
      const { isAdmin: newAdminStatus } = req.body;
      const currentUserId = req.user.claims.sub;

      // Prevent users from promoting themselves
      if (userId === currentUserId && newAdminStatus === true) {
        return res.status(403).json({ 
          error: "You cannot promote yourself to admin" 
        });
      }

      // If demoting, check if this is the last admin
      if (newAdminStatus === false) {
        const adminCount = await storage.getAdminCount();
        const targetUser = await storage.getUser(userId);
        
        // If target user is currently an admin and we're demoting them
        if (targetUser?.isAdmin && adminCount <= 1) {
          return res.status(403).json({ 
            error: "Cannot remove the last admin. Please promote another user first." 
          });
        }
      }

      // Update admin status
      const updatedUser = await storage.updateUserAdminStatus(userId, newAdminStatus);
      
      res.json({
        success: true,
        user: updatedUser,
        message: newAdminStatus 
          ? "User promoted to admin successfully" 
          : "User demoted from admin successfully"
      });
    } catch (error) {
      console.error("Error updating admin status:", error);
      res.status(500).json({ error: "Failed to update admin status" });
    }
  }
);

// Delete user data (admin only)
router.delete(
  "/users/:userId",
  isAuthenticated,
  isAdmin,
  async (req: any, res: Response) => {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.claims.sub;

      // Prevent admins from deleting themselves
      if (userId === currentUserId) {
        return res.status(403).json({ 
          error: "You cannot delete your own account. Please contact another admin." 
        });
      }

      // Check if user exists
      const userToDelete = await storage.getUser(userId);
      if (!userToDelete) {
        return res.status(404).json({ error: "User not found" });
      }

      // If deleting an admin, ensure it's not the last admin
      if (userToDelete.isAdmin) {
        const adminCount = await storage.getAdminCount();
        if (adminCount <= 1) {
          return res.status(403).json({ 
            error: "Cannot delete the last admin. Please promote another user first." 
          });
        }
      }

      // Delete the user and all their data
      await storage.deleteUser(userId);
      
      res.json({ 
        success: true,
        message: `User ${userToDelete.email || userId} and all associated data have been permanently deleted.` 
      });
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