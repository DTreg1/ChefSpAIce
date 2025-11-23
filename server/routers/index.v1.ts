/**
 * RESTful API Router Configuration v1
 * Implements standardized RESTful endpoints with proper versioning
 */

import { Router, Request as ExpressRequest, Response as ExpressResponse } from "express";
import { createServer, type Server } from "http";
import { API_CONFIG, createApiResponse } from "../config/api.config";
import { backwardCompatibilityMiddleware, requestTransformMiddleware, getDeprecationStats } from "../middleware/backward-compatibility.middleware";

// Import all routers
// User routers
import authRouter from "./user/oauth.router";
import inventoryRouter from "./user/inventory.router";
import inventoryRouterV1 from "./user/inventory.router.v1";
import recipesRouter from "./user/recipes.router";
import recipesRouterV1 from "./user/recipes.router.v1";
import chatRouter from "./user/chat.router";
import chatStreamRouter from "./user/chat.router";
import mealPlanningRouter from "./user/meal-planning.router";
import appliancesRouter from "./user/appliances.router";
import nutritionRouter from "./user/nutrition.router";
import cookingTermsRouter from "./user/cooking-terms.router";
import autosaveRouter from "./user/autosave.router";
import autocompleteRouter from "./user/autocomplete.router";
import validationRouter from "./user/validation.router";

// Admin routers
import adminRouter from "./admin/admin.router";
import abTestingRouter from "./admin/ab-testing.router";
import cohortsRouter from "./admin/cohorts.router";
import { maintenanceRouter } from "./admin/maintenance.router";
import ticketRoutingRouter from "./admin/ticket-routing.router";
import pricingRouter from "./admin/pricing.router";
import moderationRouter from "./admin/moderation.router";
import aiMetricsRouter from "./admin/ai-metrics.router";

// Platform routers
import analyticsRouter from "./platform/analytics.router";
import feedbackRouter from "./platform/feedback.router";
import batchRouter from "./platform/batch.router";
import pushTokensRouter from "./platform/push-tokens.router";
import notificationsRouter from "./platform/notifications.router";
import activityLogsRouter from "./platform/activity-logs.router";
import intelligentNotificationsRouter from "./platform/intelligent-notifications.router";

// Consolidated AI routers
import generationRouter from "./ai/generation.router";
import analysisRouter from "./ai/analysis.router";
import visionRouter from "./ai/vision.router";
import voiceRouter from "./ai/voice.router";

// Additional routers
import emailDraftingRouter from "./email-drafting.router";
import { createExcerptRouter } from "./excerpt.router";
import recommendationsRouter from "./recommendations.router";
import naturalQueryRouter from "./natural-query.router";
import fraudRouter from "./fraud.router";
import insightsRouter from "./insights.router";
import schedulingRouter from "./scheduling.router";
import imagesRouter from "./images.router";
import writingAssistantRouter from "./writing-assistant.router";

// Import special endpoints
import { createABTestSeedEndpoint } from "../seeds/seed-ab-tests";
import { createCohortSeedEndpoint } from "../seeds/seed-cohorts";
import { createDataCompletionRoutes } from "../utils/dataCompletionEndpoints";
import { storage } from "../storage/index";

// Import activity logging middleware
import { activityLoggingMiddleware } from "../middleware/activity-logging.middleware";
import { isAuthenticated } from "../middleware/oauth.middleware";

/**
 * Register all API routes with RESTful versioning
 */
export async function registerModularRoutesV1(app: any): Promise<Server> {
  // Apply backward compatibility middleware first
  app.use(backwardCompatibilityMiddleware);
  app.use(requestTransformMiddleware);
  
  // Setup activity logging middleware after authentication
  app.use(activityLoggingMiddleware);
  
  // Create v1 API router
  const v1Router = Router();
  
  // ============================================
  // AUTHENTICATION & USER MANAGEMENT
  // ============================================
  
  // Authentication endpoints
  v1Router.use("/auth", authRouter); // Handles sessions, OAuth, etc.
  
  // User profile endpoints
  v1Router.get("/users/me", isAuthenticated, async (req: any, res: any) => {
    const user = req.user;
    res.json(createApiResponse.success(user));
  });
  
  // ============================================
  // INVENTORY & FOOD MANAGEMENT
  // ============================================
  
  // Use the new RESTful inventory router
  v1Router.use(inventoryRouterV1);
  
  // ============================================
  // RECIPES & CHAT
  // ============================================
  
  // Use the new RESTful recipes and chat router
  v1Router.use(recipesRouterV1);
  
  // ============================================
  // MEAL PLANNING & SHOPPING
  // ============================================
  
  v1Router.use("/meal-plans", mealPlanningRouter);
  v1Router.use("/shopping-lists", mealPlanningRouter);
  
  // ============================================
  // AI SERVICES (Consolidated)
  // ============================================
  
  const aiV1Router = Router();
  
  // Text processing (formerly generation)
  aiV1Router.use("/text", generationRouter);
  aiV1Router.use("/recipes", generationRouter); // AI recipe generation
  
  // Analysis services
  aiV1Router.use("/analysis", analysisRouter);
  
  // Vision services
  aiV1Router.use("/vision", visionRouter);
  
  // Voice services
  aiV1Router.use("/voice", voiceRouter);
  
  // Specialized AI services
  aiV1Router.use("/drafts", emailDraftingRouter);
  aiV1Router.use("/excerpts", createExcerptRouter(storage));
  aiV1Router.use("/writing", writingAssistantRouter);
  
  v1Router.use("/ai", aiV1Router);
  
  // ============================================
  // ANALYTICS & MONITORING
  // ============================================
  
  v1Router.use("/analytics", analyticsRouter);
  v1Router.use("/activities", activityLogsRouter);
  v1Router.use("/insights", insightsRouter);
  
  // ============================================
  // NOTIFICATIONS
  // ============================================
  
  const notificationV1Router = Router();
  notificationV1Router.use("/tokens", pushTokensRouter);
  notificationV1Router.use("/", notificationsRouter);
  notificationV1Router.use("/intelligent", intelligentNotificationsRouter);
  
  v1Router.use("/notifications", notificationV1Router);
  
  // ============================================
  // ADMIN ENDPOINTS
  // ============================================
  
  const adminV1Router = Router();
  
  adminV1Router.use("/users", adminRouter);
  adminV1Router.use("/ab-tests", abTestingRouter);
  adminV1Router.use("/cohorts", cohortsRouter);
  adminV1Router.use("/maintenance", maintenanceRouter);
  adminV1Router.use("/tickets", ticketRoutingRouter);
  adminV1Router.use("/pricing", pricingRouter);
  adminV1Router.use("/moderation", moderationRouter);
  adminV1Router.use("/ai-metrics", aiMetricsRouter);
  
  // Admin seed endpoints
  adminV1Router.use("/seed/ab-tests", createABTestSeedEndpoint(storage));
  adminV1Router.use("/seed/cohorts", createCohortSeedEndpoint(storage));
  
  v1Router.use("/admin", adminV1Router);
  
  // ============================================
  // UTILITY ENDPOINTS
  // ============================================
  
  v1Router.use("/batch", batchRouter);
  v1Router.use("/recommendations", recommendationsRouter);
  v1Router.use("/natural-query", naturalQueryRouter);
  v1Router.use("/fraud-detection", fraudRouter);
  v1Router.use("/scheduling", schedulingRouter);
  v1Router.use("/data-completion", createDataCompletionRoutes(storage));
  v1Router.use("/appliances", appliancesRouter);
  v1Router.use("/nutrition", nutritionRouter);
  v1Router.use("/cooking-terms", cookingTermsRouter);
  v1Router.use("/feedback", feedbackRouter);
  v1Router.use("/autosave", autosaveRouter);
  v1Router.use("/autocomplete", autocompleteRouter);
  v1Router.use("/validation", validationRouter);
  v1Router.use("/image-processing", imagesRouter);
  
  // ============================================
  // SYSTEM ENDPOINTS
  // ============================================
  
  // API health check
  v1Router.get("/health", (_req: any, res: any) => {
    res.json(createApiResponse.success({
      status: "healthy",
      version: API_CONFIG.VERSION,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }));
  });
  
  // API information
  v1Router.get("/info", (_req: any, res: any) => {
    res.json(createApiResponse.success({
      version: API_CONFIG.VERSION,
      deprecationDate: API_CONFIG.DEPRECATION_DATE,
      documentation: "/api/v1/docs",
    }));
  });
  
  // Deprecation statistics (admin only)
  v1Router.get("/admin/deprecation-stats", isAuthenticated, async (req: any, res: any) => {
    const user = req.user;
    if (!user?.isAdmin) {
      return res.status(403).json(
        createApiResponse.error("FORBIDDEN", "Admin access required")
      );
    }
    
    const stats = getDeprecationStats();
    res.json(createApiResponse.success(stats));
  });
  
  // ============================================
  // MOUNT V1 ROUTER
  // ============================================
  
  // Mount all v1 routes under /api/v1
  app.use(API_CONFIG.VERSIONED_BASE, v1Router);
  
  // ============================================
  // LEGACY COMPATIBILITY ROUTES
  // ============================================
  // These will be handled by backward compatibility middleware
  // and redirected to the appropriate v1 endpoints
  
  // Keep legacy health check for monitoring tools
  app.get("/api/health", (_req: any, res: any) => {
    res.setHeader('X-Deprecation-Warning', 'Use /api/v1/health instead');
    res.json({ 
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
  
  // Create HTTP server
  return createServer(app);
}