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
  
  // ====================================================================
  // USER DOMAIN - Resources accessible by regular users
  // ====================================================================
  
  // Authentication & User Management
  app.use(`${v1Base}/auth`, authRouter);
  
  // Core Resources - Inventory & Food Management
  app.use(`${v1Base}/inventory`, inventoryRouter);       // Food items, storage, USDA lookup
  app.use(`${v1Base}/food-items`, inventoryRouter);       // Alternative path for food items
  
  // Recipe Management
  app.use(`${v1Base}/recipes`, recipesRouter);            // Recipe CRUD and generation
  
  // Meal Planning
  app.use(`${v1Base}/meal-plans`, mealPlanningRouter);    // Meal planning operations
  
  // Shopping Management  
  app.use(`${v1Base}/shopping-list`, mealPlanningRouter); // Single shopping list (backward compat)
  
  // Chat & Conversations
  app.use(`${v1Base}/chat`, chatRouter);                  // Chat operations
  app.use(`${v1Base}/chats`, chatStreamRouter);           // SSE streaming for chats
  
  // Utility Resources
  app.use(`${v1Base}/appliances`, appliancesRouter);      // Kitchen appliances
  app.use(`${v1Base}/nutrition`, nutritionRouter);        // Nutrition data
  app.use(`${v1Base}/cooking-terms`, cookingTermsRouter); // Cooking terminology
  
  // User Features
  app.use(`${v1Base}/autosave`, autosaveRouter);          // Auto-save functionality
  app.use(`${v1Base}/autocomplete`, autocompleteRouter);  // Autocomplete suggestions
  app.use(`${v1Base}/validation`, validationRouter);      // Data validation
  
  // ====================================================================
  // ADMIN DOMAIN - Administrative and management functions
  // ====================================================================
  
  // Core Admin
  app.use(`${v1Base}/admin`, adminRouter);                // Base admin operations
  app.use(`${v1Base}/admin/users`, adminRouter);          // User management
  app.use(`${v1Base}/admin/experiments`, abTestingRouter); // A/B testing & experiments
  app.use(`${v1Base}/admin/cohorts`, cohortsRouter);      // User cohorts
  app.use(`${v1Base}/admin/maintenance`, maintenanceRouter); // System maintenance
  app.use(`${v1Base}/admin/tickets`, ticketRoutingRouter); // Support tickets
  app.use(`${v1Base}/admin/pricing`, pricingRouter);      // Pricing management
  app.use(`${v1Base}/admin/moderation`, moderationRouter); // Content moderation
  app.use(`${v1Base}/admin/ai-metrics`, aiMetricsRouter); // AI usage metrics
  
  // Admin Seed Data
  app.use(`${v1Base}/admin/seed`, createABTestSeedEndpoint(storage));
  app.use(`${v1Base}/admin/seed`, createCohortSeedEndpoint(storage));
  
  // ====================================================================
  // AI DOMAIN - Artificial Intelligence services
  // ====================================================================
  
  // Core AI Services
  app.use(`${v1Base}/ai/generation`, generationRouter);   // Content generation
  app.use(`${v1Base}/ai/analysis`, analysisRouter);       // Content analysis
  app.use(`${v1Base}/ai/vision`, visionRouter);           // Computer vision
  app.use(`${v1Base}/ai/voice`, voiceRouter);             // Voice processing
  
  // Specialized AI Services
  app.use(`${v1Base}/ai/drafts`, emailDraftingRouter);    // Email/message drafting
  app.use(`${v1Base}/ai/excerpts`, createExcerptRouter(storage as any)); // Excerpt generation
  app.use(`${v1Base}/ai/recommendations`, recommendationsRouter); // AI recommendations
  app.use(`${v1Base}/ai/insights`, insightsRouter);      // AI-powered insights
  
  // ====================================================================
  // PLATFORM DOMAIN - Platform-wide services and infrastructure
  // ====================================================================
  
  // Analytics & Monitoring
  app.use(`${v1Base}/analytics`, analyticsRouter);        // Analytics data
  app.use(`${v1Base}/activities`, activityLogsRouter);    // Activity logs
  
  // Notifications
  app.use(`${v1Base}/notifications`, notificationsRouter); // Notification management
  app.use(`${v1Base}/notifications/tokens`, pushTokensRouter); // Push tokens
  app.use(`${v1Base}/notifications/intelligent`, intelligentNotificationsRouter); // Smart notifications
  
  // Data Operations
  app.use(`${v1Base}/batch`, batchRouter);                // Batch operations
  app.use(`${v1Base}/data-completion`, createDataCompletionRoutes(storage)); // Data quality
  
  // User Feedback
  app.use(`${v1Base}/feedback`, feedbackRouter);          // User feedback
  
  // ====================================================================
  // SPECIALIZED SERVICES - Domain-specific functionality
  // ====================================================================
  
  app.use(`${v1Base}/natural-query`, naturalQueryRouter); // Natural language queries
  app.use(`${v1Base}/fraud-detection`, fraudRouter);      // Fraud detection
  app.use(`${v1Base}/scheduling`, schedulingRouter);      // Scheduling services
  app.use(`${v1Base}/images`, imagesRouter);             // Image processing
  
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