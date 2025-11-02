import { Router, Request as ExpressRequest, Response as ExpressResponse } from "express";
import { createServer, type Server } from "http";
// Comment out Replit Auth - replaced with OAuth
// import { setupAuth } from "../replitAuth";
import { setupOAuth } from "../auth/setup-oauth";

// Import all routers
import authRouter from "./auth.router";
import inventoryRouter from "./inventory.router";
import recipesRouter from "./recipes.router";
import chatRouter from "./chat.router";
import chatStreamRouter from "./chat-stream.router";
import mealPlanningRouter from "./meal-planning.router";
import appliancesRouter from "./appliances.router";
import adminRouter from "./admin.router";
import analyticsRouter from "./analytics.router";
import nutritionRouter from "./nutrition.router";
import feedbackRouter from "./feedback.router";
import batchRouter from "./batch.router";
import pushTokensRouter from "./push-tokens.router";
import notificationsRouter from "./notifications.router";
import cookingTermsRouter from "./cooking-terms.router";
import activityLogsRouter from "./activity-logs.router";
import mlRouter from "./mlRouter";
import aiAssistantRouter from "./ai-assistant.router";
import voiceCommandsRouter from "./voice-commands.router";
import emailDraftingRouter from "./email-drafting.router";
import writingAssistantRouter from "./writing.router";
import summarizationRouter from "./summarization.router";
import { createExcerptRouter } from "./excerpt.router";
import duplicatesRouter from "./duplicates.router";
import recommendationsRouter from "./recommendations.router";
import naturalQueryRouter from "./natural-query.router";
import { translationRouter } from "./translation.router";
import { createAltTextRouter } from "./alt-text.router";

// Import special endpoints
import { createSeedEndpoint } from "../seed-cooking-terms-endpoint";
import { storage } from "../storage";

// Import activity logging middleware
import { activityLoggingMiddleware } from "../middleware/activity-logging.middleware";

export async function registerModularRoutes(app: any): Promise<Server> {
  // Setup authentication middleware first
  // Using OAuth instead of Replit Auth
  await setupOAuth(app);
  
  // Setup activity logging middleware after authentication
  // This ensures we have user context when logging activities
  app.use(activityLoggingMiddleware);
  
  // Register all route modules with their base paths
  app.use("/api/auth", authRouter);
  app.use("/api", inventoryRouter);  // Handles food-items, storage-locations, barcode, fdc
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
  app.use("/api/ml", mlRouter);       // ML features endpoints
  app.use("/api/assistant", aiAssistantRouter); // AI Assistant endpoints
  app.use("/api/voice", voiceCommandsRouter);   // Voice Commands endpoints
  app.use("/api/drafts", emailDraftingRouter);  // Email/Message Drafting endpoints
  app.use("/api/writing", writingAssistantRouter); // Writing Assistant endpoints
  app.use("/api", summarizationRouter);         // Summarization endpoints
  app.use("/api/excerpts", createExcerptRouter(storage)); // Excerpt generation endpoints
  app.use("/api/duplicates", duplicatesRouter);  // Duplicate detection endpoints
  app.use("/api", recommendationsRouter);       // Content recommendations endpoints
  app.use("/api/query", naturalQueryRouter);    // Natural language query endpoints
  app.use("/api", translationRouter);           // Translation endpoints
  app.use("/api/images", createAltTextRouter(storage)); // Alt text generation endpoints
  
  // Register special endpoints
  const seedEndpoint = createSeedEndpoint(storage);
  app.use("/api", seedEndpoint);
  
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