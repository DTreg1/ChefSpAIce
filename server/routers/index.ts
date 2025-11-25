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
 * AI DOMAIN (/api/v1/ai/...)
 * ---------------------------
 * /ai/generation                           - Content generation services
 * /ai/analysis                             - Content analysis services
 * /ai/vision                               - Computer vision processing
 * /ai/voice                                - Voice processing & transcription
 * /ai/drafts                               - Email/message drafting
 * /ai/excerpts                             - Excerpt generation
 * /ai/recommendations                      - AI-powered recommendations
 * /ai/insights                             - AI-powered insights & analytics
 * /ai/writing                              - Writing assistance & grammar
 * 
 * PLATFORM DOMAIN (/api/v1/...)
 * ------------------------------
 * /analytics                               - Analytics data & reporting
 * /activities                              - Activity logs & audit trail
 * /notifications                           - Notification management
 * /notifications/tokens                    - Push notification tokens
 * /notifications/intelligent               - Smart notification system
 * /batch                                   - Batch operations
 * /data-completion                         - Data quality & completion
 * /feedback                                - User feedback collection
 * 
 * SPECIALIZED SERVICES (/api/v1/...)
 * -----------------------------------
 * /natural-query                           - Natural language query processing
 * /fraud-detection                         - Fraud detection services
 * /scheduling                              - Scheduling & calendar services
 * /images                                  - Image processing & manipulation
 * 
 * HEALTH & STATUS
 * ---------------
 * /health                                  - Health check (no auth required)
 * /api/v1/health                          - Versioned health check
 * /api/v1/info                            - API version & deprecation info
 */

import { Application } from "express";
import { createServer, type Server } from "http";
import { API_CONFIG } from "../config/api.config";
import { setupApiVersionRedirects, addDeprecationHeaders, handleRedirectErrors } from "../middleware/api-version-handler";
import { activityLoggingMiddleware } from "../middleware/activity-logging.middleware";

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
// AI DOMAIN ROUTERS (Consolidated)
// ====================================================================
// Consolidated routers for better organization and reduced redundancy
import contentRouter from "./ai/content.router";       // Merges: generation, drafting, excerpt, writing
import analysisRouter from "./ai/analysis.router";     // Includes: insights, recommendations, natural-query
import mediaRouter from "./ai/media.router";           // Merges: images, vision, voice

// ====================================================================
// PLATFORM DOMAIN ROUTERS
// ====================================================================
import analyticsRouter from "./platform/analytics.router";
import feedbackRouter from "./platform/feedback.router";
import batchRouter from "./platform/batch.router";
import pushTokensRouter from "./platform/push-tokens.router";
import notificationsRouter from "./platform/notifications.router";
import activityLogsRouter from "./platform/activity-logs.router";
import intelligentNotificationsRouter from "./platform/intelligent-notifications.router";
import fraudRouter from "./platform/fraud.router";
import schedulingRouter from "./platform/scheduling.router";

// ====================================================================
// UTILITIES & SEED DATA
// ====================================================================
import { createABTestSeedEndpoint } from "../seeds/seed-ab-tests";
import { createCohortSeedEndpoint } from "../seeds/seed-cohorts";
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
  
  // ====================================================================
  // ADMIN ENDPOINTS
  // ====================================================================
  
  app.use(`${API_PREFIX}/admin`, adminRouter);
  app.use(`${API_PREFIX}/admin/users`, adminRouter);
  app.use(`${API_PREFIX}/admin/experiments`, abTestingRouter);
  app.use(`${API_PREFIX}/admin/cohorts`, cohortsRouter);
  app.use(`${API_PREFIX}/admin/maintenance`, maintenanceRouter);
  app.use(`${API_PREFIX}/admin/tickets`, ticketRoutingRouter);
  app.use(`${API_PREFIX}/admin/pricing`, pricingRouter);
  app.use(`${API_PREFIX}/admin/moderation`, moderationRouter);
  app.use(`${API_PREFIX}/admin/ai-metrics`, aiMetricsRouter);
  
  // Admin seed data endpoints
  app.use(`${API_PREFIX}/admin/seed`, createABTestSeedEndpoint(storage));
  app.use(`${API_PREFIX}/admin/seed`, createCohortSeedEndpoint(storage));
  
  // ====================================================================
  // AI ENDPOINTS (Consolidated Router Structure)
  // ====================================================================
  
  // Consolidated AI Content Router
  // Handles: generation, drafting, excerpts, writing assistance
  app.use(`${API_PREFIX}/ai/content`, contentRouter);
  
  // Consolidated AI Analysis Router
  // Handles: sentiment, trends, predictions, insights, recommendations, natural-query
  app.use(`${API_PREFIX}/ai/analysis`, analysisRouter);
  
  // Consolidated AI Media Router
  // Handles: images, vision (OCR, face detection, alt-text), voice (transcription, commands)
  app.use(`${API_PREFIX}/ai/media`, mediaRouter);
  
  // Backward compatibility routes for old API paths
  // These redirect to the new consolidated endpoints
  app.use(`${API_PREFIX}/ai/generation`, contentRouter);   // Legacy: now /ai/content
  app.use(`${API_PREFIX}/ai/drafts`, contentRouter);       // Legacy: now /ai/content/drafts/*
  app.use(`${API_PREFIX}/ai/writing`, contentRouter);      // Legacy: now /ai/content/writing/*
  app.use(`${API_PREFIX}/ai/vision`, mediaRouter);         // Legacy: now /ai/media/vision/*
  app.use(`${API_PREFIX}/ai/voice`, mediaRouter);          // Legacy: now /ai/media/voice/*
  app.use(`${API_PREFIX}/ai/images`, mediaRouter);         // Legacy: now /ai/media/images/*
  app.use(`${API_PREFIX}/ai/insights`, analysisRouter);    // Legacy: now /ai/analysis/insights/*
  app.use(`${API_PREFIX}/ai/recommendations`, analysisRouter); // Legacy: now /ai/analysis/recommendations/*
  
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
  
  // ====================================================================
  // SPECIALIZED SERVICES
  // ====================================================================
  
  // Natural language query is now part of analysis router at /ai/analysis/query/*
  app.use(`${API_PREFIX}/natural-query`, analysisRouter);  // Legacy: now /ai/analysis/query/*
  app.use(`${API_PREFIX}/fraud-detection`, fraudRouter);
  app.use(`${API_PREFIX}/scheduling`, schedulingRouter);
  // Images are now part of media router at /ai/media/images/*
  app.use(`${API_PREFIX}/images`, mediaRouter);  // Legacy: now /ai/media/images/*
  
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