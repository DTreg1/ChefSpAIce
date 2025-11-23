import { Router, Request as ExpressRequest, Response as ExpressResponse } from "express";
import { createServer, type Server } from "http";
import { API_CONFIG } from "../config/api.config";
import { backwardCompatibilityMiddleware, requestTransformMiddleware } from "../middleware/backward-compatibility.middleware";

// Import all routers
// User routers
import authRouter from "./user/oauth.router";
import inventoryRouter from "./user/inventory.router";
import recipesRouter from "./user/recipes.router";
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

// Legacy AI/ML routers (to be removed after migration verification)
// import mlRouter from "./mlRouter";
// import aiAssistantRouter from "./ai-assistant.router";
// import voiceCommandsRouter from "./voice-commands.router";
import emailDraftingRouter from "./email-drafting.router";
// import writingAssistantRouter from "./writing.router";
// import summarizationRouter from "./summarization.router";
import { createExcerptRouter } from "./excerpt.router";
import recommendationsRouter from "./recommendations.router";
import naturalQueryRouter from "./natural-query.router";
// import { translationRouter } from "./translation.router";
// import { createAltTextRouter } from "./alt-text.router";
import fraudRouter from "./fraud.router";
// import sentimentRouter from "./sentiment.router";
import insightsRouter from "./insights.router";
// import predictionsRouter from "./predictions.router";
// import trendsRouter from "./trends.router";
import schedulingRouter from "./scheduling.router";
// import extractionRouter from "./extraction.router";
import imagesRouter from "./images.router";
// import faceDetectionRouter from "./face-detection.router";
// import ocrRouter from "./ocr.router";
// import transcriptionsRouter from "./transcriptions.router";

// Import special endpoints
import { createABTestSeedEndpoint } from "../seeds/seed-ab-tests";
import { createCohortSeedEndpoint } from "../seeds/seed-cohorts";
import { createDataCompletionRoutes } from "../utils/dataCompletionEndpoints";
import { storage } from "../storage/index";

// Import activity logging middleware
import { activityLoggingMiddleware } from "../middleware/activity-logging.middleware";

export async function registerModularRoutes(app: any): Promise<Server> {
  // Apply backward compatibility middleware first
  app.use(backwardCompatibilityMiddleware);
  app.use(requestTransformMiddleware);
  
  // Setup activity logging middleware after authentication
  // This ensures we have user context when logging activities
  app.use(activityLoggingMiddleware);
  
  // API v1 Base Path
  const v1Base = API_CONFIG.VERSIONED_BASE; // "/api/v1"
  
  // Register all route modules with RESTful v1 paths
  // Authentication & User Management
  app.use(`${v1Base}/auth`, authRouter);
  
  // Inventory & Food Management
  app.use(`${v1Base}`, inventoryRouter);  // Maps to /api/v1/inventories, /api/v1/food-items, etc.
  
  // Recipes & Chat
  app.use(`${v1Base}`, recipesRouter);    // Maps to /api/v1/recipes
  app.use(`${v1Base}/chats`, chatRouter); // Maps to /api/v1/chats
  app.use(`${v1Base}/chats`, chatStreamRouter); // SSE streaming for chats
  
  // Meal Planning & Shopping
  app.use(`${v1Base}`, mealPlanningRouter); // Maps to /api/v1/meal-plans, /api/v1/shopping-lists
  
  // Utility Resources
  app.use(`${v1Base}`, appliancesRouter);  // Maps to /api/v1/appliances
  app.use(`${v1Base}`, nutritionRouter);   // Maps to /api/v1/nutrition
  app.use(`${v1Base}/feedback`, feedbackRouter); // Maps to /api/v1/feedback
  app.use(`${v1Base}/cooking-terms`, cookingTermsRouter); // Maps to /api/v1/cooking-terms
  
  // Admin Resources
  app.use(`${v1Base}/admin`, adminRouter);
  
  // Analytics & Monitoring
  app.use(`${v1Base}/analytics`, analyticsRouter);
  app.use(`${v1Base}/activities`, activityLogsRouter);
  
  // Batch Operations
  app.use(`${v1Base}`, batchRouter);
  
  // Notifications
  app.use(`${v1Base}/notifications`, pushTokensRouter);
  app.use(`${v1Base}/notifications`, notificationsRouter);
  
  // Data Quality
  app.use(`${v1Base}/data-completion`, createDataCompletionRoutes(storage));
  
  // AI Services
  app.use(`${v1Base}/ai/text`, generationRouter);     // Text processing (formerly generation)
  app.use(`${v1Base}/ai/analysis`, analysisRouter);   // AI Analysis
  app.use(`${v1Base}/ai/vision`, visionRouter);       // AI Vision
  app.use(`${v1Base}/ai/voice`, voiceRouter);         // AI Voice
  app.use(`${v1Base}/ai/drafts`, emailDraftingRouter); // Email/Message Drafting
  app.use(`${v1Base}/ai/excerpts`, createExcerptRouter(storage)); // Excerpt generation
  
  // Additional Services
  app.use(`${v1Base}/recommendations`, recommendationsRouter);
  app.use(`${v1Base}/natural-query`, naturalQueryRouter);
  app.use(`${v1Base}/fraud-detection`, fraudRouter);
  app.use(`${v1Base}/scheduling`, schedulingRouter);
  app.use(`${v1Base}/image-processing`, imagesRouter);
  
  // Advanced Features
  app.use(`${v1Base}/notifications/intelligent`, intelligentNotificationsRouter);
  app.use(`${v1Base}/autosave`, autosaveRouter);
  app.use(`${v1Base}/autocomplete`, autocompleteRouter);
  app.use(`${v1Base}/validation`, validationRouter);
  app.use(`${v1Base}/insights`, insightsRouter);
  
  // Admin - Advanced Features
  app.use(`${v1Base}/admin/ab-tests`, abTestingRouter);
  app.use(`${v1Base}/admin/cohorts`, cohortsRouter);
  app.use(`${v1Base}/admin/maintenance`, maintenanceRouter);
  app.use(`${v1Base}/admin/tickets`, ticketRoutingRouter);
  app.use(`${v1Base}/admin/pricing`, pricingRouter);
  app.use(`${v1Base}/admin/moderation`, moderationRouter);
  
  // Special endpoints
  app.use(`${v1Base}/admin/seed`, createABTestSeedEndpoint(storage));
  app.use(`${v1Base}/admin/seed`, createCohortSeedEndpoint(storage));
  
  // API Health & Info endpoints
  app.get(`${v1Base}/health`, (_req: any, res: any) => {
    res.json({
      status: "healthy",
      version: API_CONFIG.VERSION,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });
  
  app.get(`${v1Base}/info`, (_req: any, res: any) => {
    res.json({
      version: API_CONFIG.VERSION,
      deprecationDate: API_CONFIG.DEPRECATION_DATE,
      documentation: `${v1Base}/docs`,
    });
  });
  
  // Legacy health check (for monitoring tools)
  app.get("/api/health", (_req: any, res: any) => {
    res.setHeader('X-Deprecation-Warning', `Use ${v1Base}/health instead`);
    res.json({ 
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Create HTTP server
  return createServer(app);
}