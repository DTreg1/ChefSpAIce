import { Router, Request, Response } from "express";
import { getAuthenticatedUserId, sendError, sendSuccess } from "../../types/request-helpers";
import { z } from "zod";
import { storage } from "../../storage/index";
// Import authentication and authorization middleware
import { isAuthenticated } from "../../middleware/auth.middleware";
import { isAdmin } from "../../middleware/rbac.middleware";
import { validateBody, validateQuery, paginationQuerySchema } from "../../middleware";
import { apiCache } from "../../utils/ApiCacheService";
import { getCacheStats, invalidateCache, clearAllCache } from "../../utils/usdaCache";

const router = Router();

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
  async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, sortBy = "createdAt", sortOrder = "desc" } = req.query;
      
      const result = await storage.user.user.getAllUsers(
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
      const user = await storage.user.user.getUserById(userId);
      
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
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const updates = req.body;
      
      // Remove sensitive fields that shouldn't be updated directly
      delete updates.id;
      delete updates.createdAt;
      
      const updatedUser = await storage.user.user.updateUserPreferences(userId, updates);
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
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { isAdmin: newAdminStatus  } = req.body || {};
      const currentUserId = getAuthenticatedUserId(req);

      // Prevent users from promoting themselves
      if (userId === currentUserId && newAdminStatus === true) {
        return res.status(403).json({ 
          error: "You cannot promote yourself to admin" 
        });
      }

      // If demoting, check if this is the last admin
      if (newAdminStatus === false) {
        const adminCount = await storage.user.user.getAdminCount();
        const targetUser = await storage.user.user.getUserById(userId);
        
        // If target user is currently an admin and we're demoting them
        if (targetUser?.isAdmin && adminCount <= 1) {
          return res.status(403).json({ 
            error: "Cannot remove the last admin. Please promote another user first." 
          });
        }
      }

      // Update admin status
      const updatedUser = await storage.user.user.updateUserAdminStatus(userId, newAdminStatus);
      
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
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const currentUserId = getAuthenticatedUserId(req);

      // Prevent admins from deleting themselves
      if (userId === currentUserId) {
        return res.status(403).json({ 
          error: "You cannot delete your own account. Please contact another admin." 
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
            error: "Cannot delete the last admin. Please promote another user first." 
          });
        }
      }

      // Delete the user and all their data
      await storage.user.user.deleteUser(userId);
      
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
  }
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
          maxSize: parseInt(process.env.CACHE_MAX_SIZE || '10000'),
          enabled: process.env.CACHE_ENABLED !== 'false',
          defaultTTL: parseInt(process.env.CACHE_DEFAULT_TTL_DAYS || '30'),
        },
      });
    } catch (error) {
      console.error("Error fetching cache stats:", error);
      res.status(500).json({ error: "Failed to fetch cache statistics" });
    }
  }
);

// Invalidate cache by pattern
router.post(
  "/cache/invalidate",
  isAuthenticated,
  isAdmin,
  validateBody(z.object({
    pattern: z.string().min(1),
  })),
  async (req: Request, res: Response) => {
    try {
      const { pattern  } = req.body || {};
      const invalidatedCount = invalidateCache(pattern);
      
      // Log admin action
      await storage.platform.system.logApiUsage(getAuthenticatedUserId(req) || '', {
        apiName: "admin-cache-invalidate",
        endpoint: "/api/admin/cache/invalidate",
        statusCode: 200,
        success: true,
        queryParams: JSON.stringify({ pattern, invalidatedCount }),
      });
      
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
  }
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
      
      // Also clear database cache
      await storage.user.food.clearOldCache(0); // Clear all database cache
      
      // Log admin action
      await storage.platform.system.logApiUsage(getAuthenticatedUserId(req) || '', {
        apiName: "admin-cache-clear",
        endpoint: "/api/admin/cache/clear",
        statusCode: 200,
        success: true,
        queryParams: JSON.stringify({ clearedEntries: statsBeforeClear.size }),
      });
      
      res.json({
        success: true,
        clearedEntries: statsBeforeClear.size,
        message: "Successfully cleared all cache entries",
      });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  }
);

// Warm cache with common searches
router.post(
  "/cache/warm",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      // Import preloadCommonSearches function
      const { preloadCommonSearches } = await import("../utils/usdaCache");
      
      // Start warming in background
      preloadCommonSearches().catch(error => {
        console.error("Cache warming failed:", error);
      });
      
      // Log admin action
      await storage.platform.system.logApiUsage(getAuthenticatedUserId(req) || '', {
        apiName: "admin-cache-warm",
        endpoint: "/api/admin/cache/warm",
        statusCode: 202,
        success: true,
        queryParams: JSON.stringify({ status: "initiated" }),
      });
      
      res.status(202).json({
        success: true,
        status: "warming_initiated",
        message: "Cache warming has been initiated in the background",
      });
    } catch (error) {
      console.error("Error initiating cache warming:", error);
      res.status(500).json({ error: "Failed to initiate cache warming" });
    }
  }
);

// Get specific cache entry details
router.get(
  "/cache/entry/:key",
  isAuthenticated,
  isAdmin,
  async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const entry = apiCache.getEntryInfo(key);
      
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
  }
);

// List all cache keys
router.get(
  "/cache/keys",
  isAuthenticated,
  isAdmin,
  validateQuery(z.object({
    prefix: z.string().optional(),
    limit: z.coerce.number().optional().default(100),
  })),
  async (req: Request, res: Response) => {
    try {
      const { prefix, limit = 100 } = req.query;
      let keys = apiCache.getKeys();
      
      // Filter by prefix if provided
      if (prefix) {
        keys = keys.filter(key => key.startsWith(prefix));
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
  }
);

// Cache metrics endpoint for monitoring
router.get(
  "/cache/metrics",
  isAuthenticated,
  isAdmin,
  async (_req: any, res: ExpressResponse) => {
    try {
      const stats = apiCache.getStats();
      
      // Use the actual properties from getStats()
      const totalRequests = stats.totalHits + stats.totalMisses;
      const hitRatePercent = stats.hitRate * 100;
      const missRatePercent = stats.missRate * 100;
      
      // Calculate memory usage estimate (rough)
      const avgEntrySize = 1024; // Assume 1KB average per entry
      const estimatedMemoryMB = (stats.size * avgEntrySize) / (1024 * 1024);
      
      res.json({
        overview: {
          totalEntries: stats.size,
          maxEntries: stats.maxSize,
          utilizationPercent: ((stats.size / stats.maxSize) * 100).toFixed(2) + '%',
          estimatedMemoryMB: estimatedMemoryMB.toFixed(2),
        },
        performance: {
          totalRequests,
          hits: stats.totalHits,
          misses: stats.totalMisses,
          hitRate: hitRatePercent.toFixed(2) + '%',
          missRate: missRatePercent.toFixed(2) + '%',
          avgAccessTime: stats.avgAccessTime,
          topAccessedKeys: stats.topAccessedKeys,
        },
        lifecycle: {
          totalEvictions: stats.evictions,
          evictionRate: totalRequests > 0 ? ((stats.evictions / totalRequests) * 100).toFixed(2) + '%' : '0%',
          oldestEntry: stats.oldestEntry,
          newestEntry: stats.newestEntry,
        },
        health: {
          isHealthy: hitRatePercent > 50 && stats.size < stats.maxSize * 0.95,
          warnings: [
            hitRatePercent < 30 && 'Low hit rate detected - consider reviewing cache keys',
            stats.size > stats.maxSize * 0.9 && 'Cache approaching maximum size',
            stats.evictions > totalRequests * 0.1 && 'High eviction rate - consider increasing cache size',
          ].filter(Boolean)
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting cache metrics:', error);
      res.status(500).json({ error: 'Failed to retrieve cache metrics' });
    }
  }
);

export default router;