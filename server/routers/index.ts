/**
 * Centralized Router Configuration
 * 
 * This file consolidates all API route definitions and provides a single
 * entry point for route registration. Routes are organized by domain:
 * 
 * ROUTE STRUCTURE:
 * ================
 * 
 * /api/v1                                  - API Version 1 Base
 * 
 * USER DOMAIN (/api/v1/...)
 * --------------------------
 * /auth                                    - Authentication & user management
 * /inventory, /food-items                  - Food items, storage, USDA lookup
 * /recipes                                 - Recipe CRUD and generation
 * /meal-plans                              - Meal planning operations
 * /shopping-list                           - Shopping list management
 * /chat, /chats                            - Chat operations (SSE for /chats)
 * /appliances                              - Kitchen appliances management
 * /nutrition                               - Nutrition data and analysis
 * /cooking-terms                           - Cooking terminology reference
 * /autosave                                - Auto-save functionality
 * /autocomplete                            - Autocomplete suggestions
 * /validation                              - Data validation
 * 
 * ADMIN DOMAIN (/api/v1/admin/...)
 * ---------------------------------
 * /admin                                   - Base admin operations
 * /admin/users                             - User management
 * /admin/experiments                       - A/B testing & experiments
 * /admin/cohorts                           - User cohort management
 * /admin/maintenance                       - System maintenance operations
 * /admin/tickets                           - Support ticket routing
 * /admin/pricing                           - Pricing tier management
 * /admin/moderation                        - Content moderation
 * /admin/ai-metrics                        - AI usage metrics & monitoring
 * /admin/seed                              - Seed data endpoints
 * 
 * PLATFORM DOMAIN (/api/v1/...)
 * ------------------------------
 * Core Services:
 * /analytics                               - Analytics data & reporting
 * /activities                              - Activity logs & audit trail
 * /notifications                           - Notification management
 * /notifications/tokens                    - Push notification tokens
 * /notifications/intelligent               - Smart notification system
 * /batch                                   - Batch operations
 * /data-completion                         - Data quality & completion
 * /feedback                                - User feedback collection
 * /fraud-detection                         - Fraud detection services
 * /scheduling                              - Scheduling & calendar services
 * 
 * AI Services (/api/v1/ai/...):
 * /ai/content                              - Content generation, drafting, writing
 * /ai/analysis                             - Sentiment, trends, predictions, insights
 * /ai/media                                - Images, vision, voice processing
 * 
 * HEALTH & STATUS
 * ---------------
 * /health                                  - Health check (no auth required)
 * /api/v1/health                          - Versioned health check
 * /api/v1/info                            - API version & deprecation info
 */

import { Application, Router } from "express";
import { createServer, type Server } from "http";
import { API_CONFIG } from "../config/api.config";
import { setupApiVersionRedirects, addDeprecationHeaders, handleRedirectErrors } from "../middleware/api-version-handler";
import { activityLoggingMiddleware } from "../middleware/activity-logging.middleware";
import { isAuthenticated } from "../middleware/auth.middleware";
import { isAdmin } from "../middleware/rbac.middleware";

// ====================================================================
// USER DOMAIN ROUTERS
// ====================================================================
import authRouter from "./user/oauth.router";
import inventoryRouter from "./user/inventory.router";
import shoppingListRouter from "./user/shopping-list.router";
import recipesRouter from "./user/recipes.router";
import chatRouter from "./user/chat.router";
import mealPlanningRouter from "./user/meal-planning.router";
import appliancesRouter from "./user/appliances.router";
import nutritionRouter from "./user/nutrition.router";
import cookingTermsRouter from "./user/cooking-terms.router";
import autosaveRouter from "./user/autosave.router";
import autocompleteRouter from "./user/autocomplete.router";
import validationRouter from "./user/validation.router";
import profileRouter from "./user/profile.router";

// ====================================================================
// ADMIN DOMAIN ROUTERS
// ====================================================================
import adminRouter from "./admin/admin.router";
import abTestingRouter from "./admin/ab-testing.router";
import cohortsRouter from "./admin/cohorts.router";
import { maintenanceRouter } from "./admin/maintenance.router";
import ticketRoutingRouter from "./admin/ticket-routing.router";
import pricingRouter from "./admin/pricing.router";
import moderationRouter from "./admin/moderation.router";
import aiMetricsRouter from "./admin/ai-metrics.router";

// ====================================================================
// PLATFORM DOMAIN ROUTERS
// ====================================================================
// Core platform services
import analyticsRouter from "./platform/analytics.router";
import feedbackRouter from "./platform/feedback.router";
import batchRouter from "./platform/batch.router";
import pushTokensRouter from "./platform/push-tokens.router";
import notificationsRouter from "./platform/notifications.router";
import activityLogsRouter from "./platform/activity-logs.router";
import intelligentNotificationsRouter from "./platform/intelligent-notifications.router";
import fraudRouter from "./platform/fraud.router";
import schedulingRouter from "./platform/scheduling.router";

// AI services (consolidated under platform)
import contentRouter from "./platform/ai/content.router";       // Merges: generation, drafting, excerpt, writing
import analysisRouter from "./platform/ai/analysis.router";     // Includes: insights, recommendations, natural-query
import mediaRouter from "./platform/ai/media.router";           // Merges: images, vision, voice


// ====================================================================
// UTILITIES & SEED DATA
// ====================================================================
import { createSeedRouter } from "../seeds/index";
import { createDataCompletionRoutes } from "../utils/dataCompletionEndpoints";
import { storage } from "../storage/index";

/**
 * Setup all API routes with proper versioning and organization
 * @param app Express application instance
 */
export function setupRouters(app: Application): void {
  // API versioning configuration
  const API_PREFIX = '/api/v1';
  
  // Setup middleware
  setupApiVersionRedirects(app);
  app.use(addDeprecationHeaders);
  app.use(activityLoggingMiddleware);
  
  // ====================================================================
  // USER ENDPOINTS
  // ====================================================================
  
  // Authentication & User Management
  app.use(`${API_PREFIX}/auth`, authRouter);
  // Legacy auth path for OAuth callbacks (OAuth providers are configured with /api/auth/* URLs)
  app.use('/api/auth', authRouter);
  
  // Core Food & Recipe Management
  app.use(`${API_PREFIX}/inventory`, inventoryRouter);
  app.use(`${API_PREFIX}/inventory/shopping-list`, shoppingListRouter); // Primary shopping list path
  app.use(`${API_PREFIX}/food-items`, inventoryRouter); // Alias for backward compatibility
  app.use(`${API_PREFIX}/recipes`, recipesRouter);
  app.use(`${API_PREFIX}/meal-plans`, mealPlanningRouter);
  app.use(`${API_PREFIX}/shopping-list`, shoppingListRouter); // Legacy shopping list path (backward compatible)
  
  // Chat & Communication
  app.use(`${API_PREFIX}/chat`, chatRouter);
  app.use(`${API_PREFIX}/chats`, chatRouter); // SSE streaming endpoint
  
  // Utility Features
  app.use(`${API_PREFIX}/appliances`, appliancesRouter);
  app.use(`${API_PREFIX}/nutrition`, nutritionRouter);
  app.use(`${API_PREFIX}/cooking-terms`, cookingTermsRouter);
  app.use(`${API_PREFIX}/autosave`, autosaveRouter);
  app.use(`${API_PREFIX}/autocomplete`, autocompleteRouter);
  app.use(`${API_PREFIX}/validation`, validationRouter);
  
  // User Profile
  app.use(`${API_PREFIX}/profile`, profileRouter);
  app.use(`${API_PREFIX}/user/profile`, profileRouter); // Alias for user-prefixed path
  
  // ====================================================================
  // ADMIN ENDPOINTS
  // All admin endpoints require authentication + admin role
  // Note: adminRouter handles /users internally, so we only mount at /admin
  // ====================================================================
  
  app.use(`${API_PREFIX}/admin`, isAuthenticated, isAdmin, adminRouter);
  app.use(`${API_PREFIX}/admin/experiments`, isAuthenticated, isAdmin, abTestingRouter);
  app.use(`${API_PREFIX}/admin/cohorts`, isAuthenticated, isAdmin, cohortsRouter);
  app.use(`${API_PREFIX}/admin/maintenance`, isAuthenticated, isAdmin, maintenanceRouter);
  app.use(`${API_PREFIX}/admin/tickets`, isAuthenticated, isAdmin, ticketRoutingRouter);
  app.use(`${API_PREFIX}/admin/pricing`, isAuthenticated, isAdmin, pricingRouter);
  app.use(`${API_PREFIX}/admin/moderation`, isAuthenticated, isAdmin, moderationRouter);
  app.use(`${API_PREFIX}/admin/ai-metrics`, isAuthenticated, isAdmin, aiMetricsRouter);
  
  // Admin seed data endpoints (combined router to avoid double-mount)
  app.use(`${API_PREFIX}/admin/seed`, isAuthenticated, isAdmin, createSeedRouter(storage));
  
  // ====================================================================
  // PLATFORM ENDPOINTS
  // ====================================================================
  
  // Analytics & Monitoring
  app.use(`${API_PREFIX}/analytics`, analyticsRouter);
  app.use(`${API_PREFIX}/activities`, activityLogsRouter);
  
  // Notifications
  app.use(`${API_PREFIX}/notifications`, notificationsRouter);
  app.use(`${API_PREFIX}/notifications/tokens`, pushTokensRouter);
  app.use(`${API_PREFIX}/notifications/intelligent`, intelligentNotificationsRouter);
  
  // Data Management
  app.use(`${API_PREFIX}/batch`, batchRouter);
  app.use(`${API_PREFIX}/data-completion`, createDataCompletionRoutes(storage));
  app.use(`${API_PREFIX}/feedback`, feedbackRouter);
  
  // Specialized Services
  app.use(`${API_PREFIX}/fraud-detection`, fraudRouter);
  app.use(`${API_PREFIX}/scheduling`, schedulingRouter);
  
  // AI Services (consolidated under platform)
  app.use(`${API_PREFIX}/ai/content`, contentRouter);    // Generation, drafting, excerpts, writing
  app.use(`${API_PREFIX}/ai/analysis`, analysisRouter);  // Sentiment, trends, predictions, insights
  app.use(`${API_PREFIX}/ai/media`, mediaRouter);        // Images, vision, voice processing
  
  // Legacy backward compatibility routes for AI endpoints
  app.use(`${API_PREFIX}/ai/generation`, contentRouter);
  app.use(`${API_PREFIX}/ai/drafts`, contentRouter);
  app.use(`${API_PREFIX}/ai/writing`, contentRouter);
  app.use(`${API_PREFIX}/ai/vision`, mediaRouter);
  app.use(`${API_PREFIX}/ai/voice`, mediaRouter);
  app.use(`${API_PREFIX}/ai/images`, mediaRouter);
  app.use(`${API_PREFIX}/ai/insights`, analysisRouter);
  app.use(`${API_PREFIX}/ai/recommendations`, analysisRouter);
  app.use(`${API_PREFIX}/natural-query`, analysisRouter);
  app.use(`${API_PREFIX}/images`, mediaRouter);
  
  // ====================================================================
  // HEALTH & STATUS ENDPOINTS (No authentication required)
  // ====================================================================
  
  // Health check endpoint - Available at both root and versioned paths
  const healthResponse = (_req: any, res: any) => {
    res.json({
      status: "healthy",
      version: API_CONFIG.VERSION,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  };
  
  app.get('/health', healthResponse);
  app.get(`${API_PREFIX}/health`, healthResponse);
  
  // API information endpoint
  app.get(`${API_PREFIX}/info`, (_req: any, res: any) => {
    res.json({
      version: API_CONFIG.VERSION,
      deprecationDate: API_CONFIG.DEPRECATION_DATE,
      documentation: `${API_PREFIX}/docs`,
      supportedVersions: ['v1'],
      currentVersion: 'v1'
    });
  });
  
  // Legacy health endpoint for backward compatibility
  app.get('/api/health', (_req: any, res: any) => {
    res.setHeader('X-Deprecation-Warning', `This endpoint is deprecated. Use /health or ${API_PREFIX}/health instead`);
    res.json({ 
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  // Error handling for API versioning
  app.use(handleRedirectErrors);
}

/**
 * Create HTTP server with registered routes (legacy support)
 * @deprecated Use setupRouters directly instead
 */
export async function registerModularRoutes(app: Application): Promise<Server> {
  setupRouters(app);
  return createServer(app);
}