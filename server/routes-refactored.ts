// Refactored routes.ts using modular routers
import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./replitAuth";
import { errorHandler } from "./middleware/error.middleware";

// Import domain-specific routers
import authRouter from "./routers/auth.router";
import analyticsRouter from "./routers/analytics.router";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware (from blueprint:javascript_log_in_with_replit)
  await setupAuth(app);

  // Register domain routers with /api prefix
  app.use("/api", authRouter);
  app.use("/api", analyticsRouter);

  // Note: These routers still need to be created:
  // app.use("/api", inventoryRouter);     // for food-items, storage-locations, appliances
  // app.use("/api", externalApisRouter);  // for fdc, usda, barcodelookup
  // app.use("/api", chatRouter);          // for chat and AI features
  // app.use("/api", recipesRouter);       // for recipes
  // app.use("/api", nutritionRouter);     // for nutrition stats
  // app.use("/api", mealPlansRouter);     // for meal planning
  // app.use("/api", feedbackRouter);      // for feedback
  // app.use("/api", donationsRouter);     // for donations  
  // app.use("/api", cookingTermsRouter);  // for cooking terms
  // app.use("/api", pushNotificationsRouter); // for push notifications

  // Global error handler (should be last)
  app.use(errorHandler);

  // Create HTTP server
  const server = createServer(app);
  return server;
}