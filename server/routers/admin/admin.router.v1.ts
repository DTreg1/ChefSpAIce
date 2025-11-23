/**
 * RESTful Admin Router v1
 * Implements standardized RESTful endpoints for admin resources
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "../../storage/index";
import { getAuthenticatedUserId, sendError, sendSuccess } from "../../types/request-helpers";
import { isAuthenticated } from "../../middleware/oauth.middleware";
import { validateBody, validateQuery } from "../../middleware";
import { createApiResponse } from "../../config/api.config";
import { apiCache } from "../../utils/ApiCacheService";
import { getCacheStats, invalidateCache, clearAllCache } from "../../utils/usdaCache";

const router = Router();

// ============================================
// ADMIN MIDDLEWARE
// ============================================

/**
 * Admin authorization middleware
 * Checks if authenticated user has admin privileges
 */
const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
      return res.status(401).json(createApiResponse.error("UNAUTHORIZED", "User not authenticated"));
    }
    
    const user = await storage.user.user.getUserById(userId);
    if (!user) {
      return res.status(403).json(createApiResponse.error("FORBIDDEN", "Access denied - User not found"));
    }
    
    if (!user.isAdmin) {
      return res.status(403).json(createApiResponse.error("FORBIDDEN", "Admin privileges required"));
    }
    
    // Store admin status on request for later use
    req.user = { ...req.user, isAdmin: true };
    next();
  } catch (error) {
    console.error("Admin authorization check failed:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Authorization check failed"));
  }
};

// ============================================
// USERS RESOURCE
// ============================================

/**
 * GET /api/v1/admin/users
 * List all users with pagination and filtering
 */
router.get("/admin/users", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "20",
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
      isAdmin: filterAdmin
    } = req.query;
    
    const result = await storage.user.user.getAllUsers(
      Number(page),
      Number(limit),
      sortBy as string,
      sortOrder as string
    );
    
    // Apply additional filters
    let filteredUsers = result.data;
    
    // Search filter
    if (search) {
      const searchStr = String(search).toLowerCase();
      filteredUsers = filteredUsers.filter((user: any) => 
        user.email?.toLowerCase().includes(searchStr) ||
        user.firstName?.toLowerCase().includes(searchStr) ||
        user.lastName?.toLowerCase().includes(searchStr)
      );
    }
    
    // Admin filter
    if (filterAdmin !== undefined) {
      const isAdminFilter = filterAdmin === "true";
      filteredUsers = filteredUsers.filter((user: any) => user.isAdmin === isAdminFilter);
    }
    
    res.json(createApiResponse.paginated(
      filteredUsers,
      Number(page),
      Number(limit),
      result.total
    ));
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch users"));
  }
});

/**
 * GET /api/v1/admin/users/:userId
 * Get specific user details
 */
router.get("/admin/users/:userId", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await storage.user.user.getUserById(userId);
    
    if (!user) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "User not found"));
    }
    
    res.json(createApiResponse.success(user));
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch user"));
  }
});

/**
 * PUT /api/v1/admin/users/:userId
 * Update user details
 */
router.put("/admin/users/:userId", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    // Remove sensitive fields that shouldn't be updated directly
    delete updates.id;
    delete updates.createdAt;
    delete updates.password;
    
    const updatedUser = await storage.user.user.updateUserPreferences(userId, updates);
    res.json(createApiResponse.success(updatedUser, "User updated successfully"));
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to update user"));
  }
});

/**
 * POST /api/v1/admin/users/:userId/admin
 * Grant or revoke admin privileges
 */
router.post("/admin/users/:userId/admin", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { isAdmin: newAdminStatus } = req.body;
    const currentUserId = getAuthenticatedUserId(req);
    
    if (typeof newAdminStatus !== 'boolean') {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "isAdmin must be a boolean value"
      ));
    }
    
    // Prevent self-promotion
    if (userId === currentUserId && newAdminStatus === true) {
      return res.status(403).json(createApiResponse.error(
        "FORBIDDEN",
        "You cannot promote yourself to admin"
      ));
    }
    
    // Check if removing last admin
    if (newAdminStatus === false) {
      const adminCount = await storage.user.user.getAdminCount();
      const targetUser = await storage.user.user.getUserById(userId);
      
      if (targetUser?.isAdmin && adminCount <= 1) {
        return res.status(403).json(createApiResponse.error(
          "FORBIDDEN",
          "Cannot remove the last admin. Please promote another user first."
        ));
      }
    }
    
    const updatedUser = await storage.user.user.updateUserAdminStatus(userId, newAdminStatus);
    
    res.json(createApiResponse.success(
      updatedUser,
      newAdminStatus ? "User promoted to admin successfully" : "User demoted from admin successfully"
    ));
  } catch (error) {
    console.error("Error updating admin status:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to update admin status"));
  }
});

/**
 * DELETE /api/v1/admin/users/:userId
 * Delete user and all associated data
 */
router.delete("/admin/users/:userId", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = getAuthenticatedUserId(req);
    
    // Prevent self-deletion
    if (userId === currentUserId) {
      return res.status(403).json(createApiResponse.error(
        "FORBIDDEN",
        "You cannot delete your own account"
      ));
    }
    
    // Require confirmation
    if (req.body.confirm !== true) {
      return res.status(400).json(createApiResponse.error(
        "CONFIRMATION_REQUIRED",
        "Please confirm deletion by setting confirm: true"
      ));
    }
    
    await storage.user.user.deleteUser(userId);
    
    res.json(createApiResponse.success(null, "User and all associated data deleted successfully"));
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to delete user"));
  }
});

// ============================================
// AB TESTS RESOURCE
// ============================================

/**
 * GET /api/v1/admin/ab-tests
 * List all A/B tests
 */
router.get("/admin/ab-tests", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "20",
      status,
      feature
    } = req.query;
    
    const tests = await storage.admin.experiments.getABTests({
      status: status as string,
      feature: feature as string
    });
    
    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedTests = tests.slice(startIndex, endIndex);
    
    res.json(createApiResponse.paginated(
      paginatedTests,
      pageNum,
      limitNum,
      tests.length
    ));
  } catch (error) {
    console.error("Error fetching A/B tests:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch A/B tests"));
  }
});

/**
 * GET /api/v1/admin/ab-tests/:testId
 * Get specific A/B test details
 */
router.get("/admin/ab-tests/:testId", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const test = await storage.admin.experiments.getABTest(testId);
    
    if (!test) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "A/B test not found"));
    }
    
    res.json(createApiResponse.success(test));
  } catch (error) {
    console.error("Error fetching A/B test:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch A/B test"));
  }
});

/**
 * POST /api/v1/admin/ab-tests
 * Create a new A/B test
 */
router.post("/admin/ab-tests", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const testData = req.body;
    
    if (!testData.name || !testData.hypothesis || !testData.variants) {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "Name, hypothesis, and variants are required"
      ));
    }
    
    const test = await storage.admin.experiments.createABTest({
      ...testData,
      createdBy: getAuthenticatedUserId(req),
      status: 'draft',
      createdAt: new Date()
    });
    
    res.status(201).json(createApiResponse.success(test, "A/B test created successfully"));
  } catch (error) {
    console.error("Error creating A/B test:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to create A/B test"));
  }
});

/**
 * PUT /api/v1/admin/ab-tests/:testId
 * Update an A/B test
 */
router.put("/admin/ab-tests/:testId", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const updates = req.body;
    
    const updatedTest = await storage.admin.experiments.updateABTest(testId, updates);
    
    if (!updatedTest) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "A/B test not found"));
    }
    
    res.json(createApiResponse.success(updatedTest, "A/B test updated successfully"));
  } catch (error) {
    console.error("Error updating A/B test:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to update A/B test"));
  }
});

/**
 * POST /api/v1/admin/ab-tests/:testId/start
 * Start an A/B test
 */
router.post("/admin/ab-tests/:testId/start", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    
    const updatedTest = await storage.admin.experiments.updateABTest(testId, {
      status: 'active',
      startedAt: new Date()
    });
    
    if (!updatedTest) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "A/B test not found"));
    }
    
    res.json(createApiResponse.success(updatedTest, "A/B test started successfully"));
  } catch (error) {
    console.error("Error starting A/B test:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to start A/B test"));
  }
});

/**
 * POST /api/v1/admin/ab-tests/:testId/stop
 * Stop an A/B test
 */
router.post("/admin/ab-tests/:testId/stop", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    
    const updatedTest = await storage.admin.experiments.updateABTest(testId, {
      status: 'completed',
      endedAt: new Date()
    });
    
    if (!updatedTest) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "A/B test not found"));
    }
    
    res.json(createApiResponse.success(updatedTest, "A/B test stopped successfully"));
  } catch (error) {
    console.error("Error stopping A/B test:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to stop A/B test"));
  }
});

// ============================================
// COHORTS RESOURCE
// ============================================

/**
 * GET /api/v1/admin/cohorts
 * List all user cohorts
 */
router.get("/admin/cohorts", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "20",
      active
    } = req.query;
    
    const cohorts = await storage.admin.experiments.getCohorts({
      active: active === "true"
    });
    
    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedCohorts = cohorts.slice(startIndex, endIndex);
    
    res.json(createApiResponse.paginated(
      paginatedCohorts,
      pageNum,
      limitNum,
      cohorts.length
    ));
  } catch (error) {
    console.error("Error fetching cohorts:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch cohorts"));
  }
});

/**
 * GET /api/v1/admin/cohorts/:cohortId
 * Get specific cohort details
 */
router.get("/admin/cohorts/:cohortId", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { cohortId } = req.params;
    const cohort = await storage.admin.experiments.getCohort(cohortId);
    
    if (!cohort) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Cohort not found"));
    }
    
    res.json(createApiResponse.success(cohort));
  } catch (error) {
    console.error("Error fetching cohort:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch cohort"));
  }
});

/**
 * POST /api/v1/admin/cohorts
 * Create a new cohort
 */
router.post("/admin/cohorts", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const cohortData = req.body;
    
    if (!cohortData.name || !cohortData.definition) {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "Name and definition are required"
      ));
    }
    
    const cohort = await storage.admin.experiments.createCohort({
      ...cohortData,
      createdBy: getAuthenticatedUserId(req),
      createdAt: new Date()
    });
    
    res.status(201).json(createApiResponse.success(cohort, "Cohort created successfully"));
  } catch (error) {
    console.error("Error creating cohort:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to create cohort"));
  }
});

/**
 * PUT /api/v1/admin/cohorts/:cohortId
 * Update a cohort
 */
router.put("/admin/cohorts/:cohortId", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { cohortId } = req.params;
    const updates = req.body;
    
    const updatedCohort = await storage.admin.experiments.updateCohort(cohortId, updates);
    
    if (!updatedCohort) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Cohort not found"));
    }
    
    res.json(createApiResponse.success(updatedCohort, "Cohort updated successfully"));
  } catch (error) {
    console.error("Error updating cohort:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to update cohort"));
  }
});

/**
 * DELETE /api/v1/admin/cohorts/:cohortId
 * Delete a cohort
 */
router.delete("/admin/cohorts/:cohortId", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { cohortId } = req.params;
    
    await storage.admin.experiments.deleteCohort(cohortId);
    
    res.json(createApiResponse.success(null, "Cohort deleted successfully"));
  } catch (error) {
    console.error("Error deleting cohort:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to delete cohort"));
  }
});

// ============================================
// PRICING RESOURCE
// ============================================

/**
 * GET /api/v1/admin/pricing
 * Get all pricing plans
 */
router.get("/admin/pricing", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const plans = await storage.admin.pricing.getPricingPlans();
    
    res.json(createApiResponse.success(plans));
  } catch (error) {
    console.error("Error fetching pricing plans:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch pricing plans"));
  }
});

/**
 * GET /api/v1/admin/pricing/:planId
 * Get specific pricing plan
 */
router.get("/admin/pricing/:planId", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const plan = await storage.admin.pricing.getPricingPlan(planId);
    
    if (!plan) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Pricing plan not found"));
    }
    
    res.json(createApiResponse.success(plan));
  } catch (error) {
    console.error("Error fetching pricing plan:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch pricing plan"));
  }
});

/**
 * POST /api/v1/admin/pricing
 * Create a new pricing plan
 */
router.post("/admin/pricing", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const planData = req.body;
    
    if (!planData.name || !planData.price || !planData.features) {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "Name, price, and features are required"
      ));
    }
    
    const plan = await storage.admin.pricing.createPricingPlan(planData);
    
    res.status(201).json(createApiResponse.success(plan, "Pricing plan created successfully"));
  } catch (error) {
    console.error("Error creating pricing plan:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to create pricing plan"));
  }
});

/**
 * PUT /api/v1/admin/pricing/:planId
 * Update a pricing plan
 */
router.put("/admin/pricing/:planId", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const updates = req.body;
    
    const updatedPlan = await storage.admin.pricing.updatePricingPlan(planId, updates);
    
    if (!updatedPlan) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Pricing plan not found"));
    }
    
    res.json(createApiResponse.success(updatedPlan, "Pricing plan updated successfully"));
  } catch (error) {
    console.error("Error updating pricing plan:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to update pricing plan"));
  }
});

/**
 * DELETE /api/v1/admin/pricing/:planId
 * Delete a pricing plan
 */
router.delete("/admin/pricing/:planId", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    
    await storage.admin.pricing.deletePricingPlan(planId);
    
    res.json(createApiResponse.success(null, "Pricing plan deleted successfully"));
  } catch (error) {
    console.error("Error deleting pricing plan:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to delete pricing plan"));
  }
});

// ============================================
// MODERATION RESOURCE
// ============================================

/**
 * GET /api/v1/admin/moderation
 * Get moderation queue
 */
router.get("/admin/moderation", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "20",
      status = "pending",
      type
    } = req.query;
    
    const items = await storage.admin.support.getModerationQueue({
      status: status as string,
      type: type as string
    });
    
    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedItems = items.slice(startIndex, endIndex);
    
    res.json(createApiResponse.paginated(
      paginatedItems,
      pageNum,
      limitNum,
      items.length
    ));
  } catch (error) {
    console.error("Error fetching moderation queue:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch moderation queue"));
  }
});

/**
 * GET /api/v1/admin/moderation/:itemId
 * Get specific moderation item
 */
router.get("/admin/moderation/:itemId", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const item = await storage.admin.support.getModerationItem(itemId);
    
    if (!item) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Moderation item not found"));
    }
    
    res.json(createApiResponse.success(item));
  } catch (error) {
    console.error("Error fetching moderation item:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch moderation item"));
  }
});

/**
 * PUT /api/v1/admin/moderation/:itemId
 * Update moderation status
 */
router.put("/admin/moderation/:itemId", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { itemId } = req.params;
    const { status, action, notes } = req.body;
    
    if (!status || !action) {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "Status and action are required"
      ));
    }
    
    const updatedItem = await storage.admin.support.updateModerationItem(itemId, {
      status,
      action,
      notes,
      moderatedBy: getAuthenticatedUserId(req),
      moderatedAt: new Date()
    });
    
    if (!updatedItem) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Moderation item not found"));
    }
    
    res.json(createApiResponse.success(updatedItem, "Moderation action completed successfully"));
  } catch (error) {
    console.error("Error updating moderation item:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to update moderation item"));
  }
});

// ============================================
// TICKETS RESOURCE
// ============================================

/**
 * GET /api/v1/admin/tickets
 * Get support tickets
 */
router.get("/admin/tickets", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const {
      page = "1",
      limit = "20",
      status,
      priority,
      assignedTo
    } = req.query;
    
    const tickets = await storage.admin.support.getTickets({
      status: status as string,
      priority: priority as string,
      assignedTo: assignedTo as string
    });
    
    // Pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedTickets = tickets.slice(startIndex, endIndex);
    
    res.json(createApiResponse.paginated(
      paginatedTickets,
      pageNum,
      limitNum,
      tickets.length
    ));
  } catch (error) {
    console.error("Error fetching tickets:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch tickets"));
  }
});

/**
 * GET /api/v1/admin/tickets/:ticketId
 * Get specific ticket
 */
router.get("/admin/tickets/:ticketId", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const ticket = await storage.admin.support.getTicket(ticketId);
    
    if (!ticket) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Ticket not found"));
    }
    
    res.json(createApiResponse.success(ticket));
  } catch (error) {
    console.error("Error fetching ticket:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch ticket"));
  }
});

/**
 * PUT /api/v1/admin/tickets/:ticketId
 * Update ticket
 */
router.put("/admin/tickets/:ticketId", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const updates = req.body;
    
    const updatedTicket = await storage.admin.support.updateTicket(ticketId, {
      ...updates,
      lastUpdatedBy: getAuthenticatedUserId(req),
      lastUpdatedAt: new Date()
    });
    
    if (!updatedTicket) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Ticket not found"));
    }
    
    res.json(createApiResponse.success(updatedTicket, "Ticket updated successfully"));
  } catch (error) {
    console.error("Error updating ticket:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to update ticket"));
  }
});

/**
 * POST /api/v1/admin/tickets/:ticketId/assign
 * Assign ticket to admin
 */
router.post("/admin/tickets/:ticketId/assign", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { assignedTo } = req.body;
    
    if (!assignedTo) {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "assignedTo is required"
      ));
    }
    
    const updatedTicket = await storage.admin.support.updateTicket(ticketId, {
      assignedTo,
      assignedAt: new Date(),
      status: 'in_progress'
    });
    
    if (!updatedTicket) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Ticket not found"));
    }
    
    res.json(createApiResponse.success(updatedTicket, "Ticket assigned successfully"));
  } catch (error) {
    console.error("Error assigning ticket:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to assign ticket"));
  }
});

/**
 * POST /api/v1/admin/tickets/:ticketId/resolve
 * Resolve a ticket
 */
router.post("/admin/tickets/:ticketId/resolve", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.params;
    const { resolution } = req.body;
    
    if (!resolution) {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "Resolution details are required"
      ));
    }
    
    const updatedTicket = await storage.admin.support.updateTicket(ticketId, {
      status: 'resolved',
      resolution,
      resolvedBy: getAuthenticatedUserId(req),
      resolvedAt: new Date()
    });
    
    if (!updatedTicket) {
      return res.status(404).json(createApiResponse.error("NOT_FOUND", "Ticket not found"));
    }
    
    res.json(createApiResponse.success(updatedTicket, "Ticket resolved successfully"));
  } catch (error) {
    console.error("Error resolving ticket:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to resolve ticket"));
  }
});

// ============================================
// SYSTEM MANAGEMENT
// ============================================

/**
 * GET /api/v1/admin/system/stats
 * Get system statistics
 */
router.get("/admin/system/stats", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const stats = {
      users: {
        total: await storage.user.user.getUserCount(),
        admins: await storage.user.user.getAdminCount(),
        activeToday: await storage.platform.analytics.getActiveUsersCount('today'),
        activeThisWeek: await storage.platform.analytics.getActiveUsersCount('week'),
        activeThisMonth: await storage.platform.analytics.getActiveUsersCount('month')
      },
      content: {
        recipes: await storage.user.recipes.getRecipeCount(),
        inventoryItems: await storage.user.inventory.getInventoryItemCount(),
        mealPlans: await storage.user.recipes.getMealPlanCount()
      },
      cache: getCacheStats(),
      database: {
        // Add database stats if available
        connections: 'N/A',
        size: 'N/A'
      }
    };
    
    res.json(createApiResponse.success(stats));
  } catch (error) {
    console.error("Error fetching system stats:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to fetch system stats"));
  }
});

/**
 * POST /api/v1/admin/system/cache/clear
 * Clear system cache
 */
router.post("/admin/system/cache/clear", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { type = "all" } = req.body;
    
    if (type === "all") {
      clearAllCache();
      apiCache.clear();
      res.json(createApiResponse.success(null, "All cache cleared successfully"));
    } else if (type === "usda") {
      clearAllCache();
      res.json(createApiResponse.success(null, "USDA cache cleared successfully"));
    } else if (type === "api") {
      apiCache.clear();
      res.json(createApiResponse.success(null, "API cache cleared successfully"));
    } else {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "Invalid cache type. Use 'all', 'usda', or 'api'"
      ));
    }
  } catch (error) {
    console.error("Error clearing cache:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to clear cache"));
  }
});

/**
 * POST /api/v1/admin/system/maintenance
 * Toggle maintenance mode
 */
router.post("/admin/system/maintenance", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const { enabled, message } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json(createApiResponse.error(
        "VALIDATION_ERROR",
        "enabled must be a boolean value"
      ));
    }
    
    // Store maintenance mode in system settings
    await storage.admin.system.setMaintenanceMode(enabled, message);
    
    res.json(createApiResponse.success({
      enabled,
      message
    }, `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`));
  } catch (error) {
    console.error("Error toggling maintenance mode:", error);
    res.status(500).json(createApiResponse.error("INTERNAL_ERROR", "Failed to toggle maintenance mode"));
  }
});

export default router;