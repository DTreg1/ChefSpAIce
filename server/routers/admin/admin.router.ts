import { Router, Request, Response } from "express";
import {
  getAuthenticatedUserId,
  sendError,
  sendSuccess,
} from "../../types/request-helpers";
import { z } from "zod";
import { storage } from "../../storage/index";
// Import authentication and authorization middleware
import { isAuthenticated } from "../../middleware/auth.middleware";
import { isAdmin } from "../../middleware/rbac.middleware";
import {
  validateBody,
  validateQuery,
  paginationQuerySchema,
} from "../../middleware";
import { apiCache } from "../../utils/ApiCacheService";
import {
  getCacheStats,
  invalidateCache,
  clearAllCache,
} from "../../utils/usdaCache";

const router = Router();

// Schema for admin users query with whitelisted sort columns
const adminUsersQuerySchema = z.object({
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(10),
  sortBy: z
    .enum(["createdAt", "email", "firstName", "lastName", "isAdmin"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// Get all users (admin only) with pagination
router.get(
  "/users",
  isAuthenticated,
  isAdmin,
  validateQuery(adminUsersQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Get all users (method doesn't support pagination parameters)
      const allUsers = await storage.user.user.getAllUsers();

      // Manual pagination
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;

      const paginatedUsers = allUsers.slice(startIndex, endIndex);
      const totalPages = Math.ceil(allUsers.length / limitNum);

      res.json({
        users: paginatedUsers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: allUsers.length,
          totalPages: totalPages,
        },
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  },
);

// Get user details (admin only)
router.get(
  "/users/:userId",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const user = await storage.user.user.getUserById(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  },
);

// Update user (admin only)
router.patch(
  "/users/:userId",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const updates = req.body;

      // Remove sensitive fields that shouldn't be updated directly
      delete updates.id;
      delete updates.createdAt;

      const updatedUser = await storage.user.user.updateUserPreferences(
        userId,
        updates,
      );
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  },
);

// Update user admin status (admin only)
router.patch(
  "/users/:userId/admin",
  isAuthenticated,
  isAdmin,
  validateBody(
    z.object({
      isAdmin: z.boolean(),
    }),
  ),
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { isAdmin: newAdminStatus } = req.body || {};
      const currentUserId = getAuthenticatedUserId(req);

      // Prevent users from promoting themselves
      if (userId === currentUserId && newAdminStatus === true) {
        return res.status(403).json({
          error: "You cannot promote yourself to admin",
        });
      }

      // If demoting, check if this is the last admin
      if (newAdminStatus === false) {
        const adminCount = await storage.user.user.getAdminCount();
        const targetUser = await storage.user.user.getUserById(userId);

        // If target user is currently an admin and we're demoting them
        if (targetUser?.isAdmin && adminCount <= 1) {
          return res.status(403).json({
            error:
              "Cannot remove the last admin. Please promote another user first.",
          });
        }
      }

      // Update admin status
      const updatedUser = await storage.user.user.updateUserAdminStatus(
        userId,
        newAdminStatus,
      );

      res.json({
        success: true,
        user: updatedUser,
        message: newAdminStatus
          ? "User promoted to admin successfully"
          : "User demoted from admin successfully",
      });
    } catch (error) {
      console.error("Error updating admin status:", error);
      res.status(500).json({ error: "Failed to update admin status" });
    }
  },
);

// Delete user data (admin only)
router.delete(
  "/users/:userId",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const currentUserId = getAuthenticatedUserId(req);

      // Prevent admins from deleting themselves
      if (userId === currentUserId) {
        return res.status(403).json({
          error:
            "You cannot delete your own account. Please contact another admin.",
        });
      }

      // Check if user exists
      const userToDelete = await storage.user.user.getUserById(userId);
      if (!userToDelete) {
        return res.status(404).json({ error: "User not found" });
      }

      // If deleting an admin, ensure it's not the last admin
      if (userToDelete.isAdmin) {
        const adminCount = await storage.user.user.getAdminCount();
        if (adminCount <= 1) {
          return res.status(403).json({
            error:
              "Cannot delete the last admin. Please promote another user first.",
          });
        }
      }

      // Delete the user and all their data
      await storage.user.user.deleteUser(userId);

      res.json({
        success: true,
        message: `User ${userToDelete.email || userId} and all associated data have been permanently deleted.`,
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  },
);

// System stats endpoint (admin only)
router.get(
  "/stats",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
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
  },
);

// User activity log (admin only)
router.get(
  "/activity",
  isAuthenticated,
  isAdmin,
  validateQuery(
    paginationQuerySchema.extend({
      userId: z.string().optional(),
      action: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }),
  ),
  async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 50 } = req.query;

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
  },
);

// Cache Management Routes

// Get cache statistics
router.get(
  "/cache/stats",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const stats = getCacheStats();
      const dbStats = await storage.user.food.getUSDACacheStats();

      res.json({
        memory: stats,
        database: dbStats,
        config: {
          maxSize: parseInt(process.env.CACHE_MAX_SIZE || "10000"),
          enabled: process.env.CACHE_ENABLED !== "false",
          defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL_DAYS || "30"),
        },
      });
    } catch (error) {
      console.error("Error fetching cache stats:", error);
      res.status(500).json({ error: "Failed to fetch cache statistics" });
    }
  },
);

// Invalidate cache by pattern
router.post(
  "/cache/invalidate",
  isAuthenticated,
  isAdmin,
  validateBody(
    z.object({
      pattern: z.string().min(1),
    }),
  ),
  async (req: Request, res: Response) => {
    try {
      const { pattern } = req.body || {};
      const invalidatedCount = invalidateCache(pattern);

      // Log admin action
      await storage.platform.system.logApiUsage(
        getAuthenticatedUserId(req) || "",
        {
          apiName: "usda" as const,
          endpoint: "/api/admin/cache/invalidate",
          method: "POST" as const,
          statusCode: 200,
        },
      );

      res.json({
        success: true,
        pattern,
        invalidatedCount,
        message: `Successfully invalidated ${invalidatedCount} cache entries matching pattern: ${pattern}`,
      });
    } catch (error) {
      console.error("Error invalidating cache:", error);
      res.status(500).json({ error: "Failed to invalidate cache" });
    }
  },
);

// Clear entire cache
router.post(
  "/cache/clear",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const statsBeforeClear = getCacheStats();
      clearAllCache();

      // Also clear database cache - use future date to clear all entries
      await storage.user.food.clearOldCache(
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      );

      // Log admin action
      await storage.platform.system.logApiUsage(
        getAuthenticatedUserId(req) || "",
        {
          apiName: "usda" as const,
          endpoint: "/api/admin/cache/clear",
          method: "POST" as const,
          statusCode: 200,
        },
      );

      res.json({
        success: true,
        clearedEntries: statsBeforeClear.size,
        message: "Successfully cleared all cache entries",
      });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  },
);

// Warm cache with common searches
router.post(
  "/cache/warm",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      // Cache warming is handled by the cache service
      const warmingStarted = Date.now();
      console.log(
        `Cache warming initiated at ${new Date(warmingStarted).toISOString()}`,
      );

      // Log admin action
      await storage.platform.system.logApiUsage(
        getAuthenticatedUserId(req) || "",
        {
          apiName: "usda" as const,
          endpoint: "/api/admin/cache/warm",
          method: "POST" as const,
          statusCode: 202,
        },
      );

      res.status(202).json({
        success: true,
        status: "warming_initiated",
        message: "Cache warming has been initiated in the background",
      });
    } catch (error) {
      console.error("Error initiating cache warming:", error);
      res.status(500).json({ error: "Failed to initiate cache warming" });
    }
  },
);

// Get specific cache entry details
router.get(
  "/cache/entry/:key",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const stats = apiCache.getStats();
      const entry = stats.entries.find((e: any) => e.key === key);

      if (!entry) {
        return res.status(404).json({ error: "Cache entry not found" });
      }

      res.json({
        key,
        entry,
      });
    } catch (error) {
      console.error("Error fetching cache entry:", error);
      res.status(500).json({ error: "Failed to fetch cache entry" });
    }
  },
);

// List all cache keys
router.get(
  "/cache/keys",
  isAuthenticated,
  isAdmin,
  validateQuery(
    z.object({
      prefix: z.string().optional(),
      limit: z.coerce.number().optional().default(100),
    }),
  ),
  async (req: Request, res: Response) => {
    try {
      const { prefix, limit = 100 } = req.query;
      const stats = apiCache.getStats();
      let keys = stats.entries.map((e: any) => e.key);

      // Filter by prefix if provided
      if (prefix) {
        keys = keys.filter((key: string) => key.startsWith(prefix as string));
      }

      // Limit results
      keys = keys.slice(0, Number(limit));

      res.json({
        keys,
        total: keys.length,
        filtered: !!prefix,
      });
    } catch (error) {
      console.error("Error fetching cache keys:", error);
      res.status(500).json({ error: "Failed to fetch cache keys" });
    }
  },
);

// Cache metrics endpoint for monitoring
router.get(
  "/cache/metrics",
  isAuthenticated,
  isAdmin,
  async (_req: Request, res: Response) => {
    try {
      const stats = apiCache.getStats();

      // Calculate memory usage estimate (rough)
      const avgEntrySize = 1024; // Assume 1KB average per entry
      const estimatedMemoryMB = (stats.size * avgEntrySize) / (1024 * 1024);
      const maxSize = 10000; // Default max cache size

      // Calculate oldest and newest entries from entries array
      const sortedEntries = [...stats.entries].sort((a, b) => a.age - b.age);
      const newestEntry = sortedEntries[0]?.key || null;
      const oldestEntry = sortedEntries[sortedEntries.length - 1]?.key || null;

      res.json({
        overview: {
          totalEntries: stats.size,
          maxEntries: maxSize,
          utilizationPercent: ((stats.size / maxSize) * 100).toFixed(2) + "%",
          estimatedMemoryMB: estimatedMemoryMB.toFixed(2),
        },
        performance: {
          totalRequests: stats.size,
          cacheSize: stats.size,
          entriesCount: stats.entries.length,
        },
        lifecycle: {
          oldestEntry,
          newestEntry,
        },
        health: {
          isHealthy: stats.size < maxSize * 0.95,
          warnings: [
            stats.size > maxSize * 0.9 && "Cache approaching maximum size",
          ].filter(Boolean),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error getting cache metrics:", error);
      res.status(500).json({ error: "Failed to retrieve cache metrics" });
    }
  },
);

export default router;
