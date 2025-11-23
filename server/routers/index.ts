import { Router, Request as ExpressRequest, Response as ExpressResponse } from "express";
import { createServer, type Server } from "http";

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
  // Setup activity logging middleware after authentication
  // This ensures we have user context when logging activities
  app.use(activityLoggingMiddleware);
  
  // Register all route modules with their base paths
  app.use("/api/auth", authRouter);
  app.use("/api", inventoryRouter);  // Handles food-items, storage-locations, barcode, fdc
  app.use("/api/data-completion", createDataCompletionRoutes(storage)); // Data quality and completion endpoints
  app.use("/api", recipesRouter);     // Handles chat and recipes
  app.use("/api/chat", chatRouter);   // Handles comprehensive chat with conversation management
  app.use("/api/chat", chatStreamRouter); // Handles streaming chat with SSE
  app.use("/api", mealPlanningRouter); // Handles meal-plans and shopping-list
  app.use("/api", appliancesRouter);  // Handles appliances
  app.use("/api", nutritionRouter);   // Handles nutrition stats and analysis
  app.use("/api", feedbackRouter);    // Handles user feedback
  app.use("/api/admin", adminRouter); // Admin endpoints
  app.use("/api/analytics", analyticsRouter); // Analytics endpoints
  app.use("/api", batchRouter);       // Batch API for optimized requests
  app.use("/api", activityLogsRouter); // Activity logs endpoints
  app.use(pushTokensRouter);          // Push tokens endpoints
  app.use(notificationsRouter);       // Notification tracking and history endpoints
  app.use(cookingTermsRouter);        // Cooking terms endpoints
  // Register consolidated AI routers
  app.use("/api/ai/generation", generationRouter);  // AI Generation: writing, translation, summarization, recipes
  app.use("/api/ai/analysis", analysisRouter);      // AI Analysis: sentiment, trends, predictions, extraction
  app.use("/api/ai/vision", visionRouter);          // AI Vision: OCR, face detection, alt text, image analysis
  app.use("/api/ai/voice", voiceRouter);            // AI Voice: transcription, voice commands
  
  // Legacy routers still in use (not yet consolidated)
  app.use("/api/drafts", emailDraftingRouter);  // Email/Message Drafting endpoints
  app.use("/api/excerpts", createExcerptRouter(storage)); // Excerpt generation endpoints
  app.use("/api", recommendationsRouter);       // Content recommendations endpoints
  app.use("/api/query", naturalQueryRouter);    // Natural language query endpoints
  app.use("/api/moderate", moderationRouter);   // Content moderation endpoints
  app.use("/api", fraudRouter);                 // Fraud detection endpoints
  app.use("/api/notifications", intelligentNotificationsRouter); // Intelligent notifications endpoints
  app.use("/api/autosave", autosaveRouter);     // Auto-save and draft versioning endpoints
  app.use("/api/autocomplete", autocompleteRouter); // Smart form auto-completion endpoints
  app.use("/api/validate", validationRouter);   // Intelligent form validation endpoints
  app.use("/api/insights", insightsRouter);     // AI-powered analytics insights endpoints
  app.use("/api/ab", abTestingRouter);          // A/B testing and optimization endpoints
  app.use("/api/cohorts", cohortsRouter);       // Cohort analysis and segmentation endpoints
  app.use(maintenanceRouter);                   // Predictive maintenance and system health endpoints
  app.use("/api", schedulingRouter);            // Scheduling assistant endpoints
  app.use("/api/routing", ticketRoutingRouter); // Ticket routing and intelligent assignment endpoints
  app.use("/api/pricing", pricingRouter);       // Dynamic pricing optimization with AI and ML endpoints
  app.use("/api/images", imagesRouter);         // AI-powered image enhancement and processing endpoints (legacy - some functions moved to /api/ai/vision)
  
  // Register special endpoints
  const abTestSeedEndpoint = createABTestSeedEndpoint(storage);
  app.use("/api", abTestSeedEndpoint);
  const cohortSeedEndpoint = createCohortSeedEndpoint(storage);
  app.use("/api", cohortSeedEndpoint);
  
  // Health check endpoint
  app.get("/api/health", (_req: any, res: any) => {
    res.json({ 
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Create HTTP server
  return createServer(app);
}