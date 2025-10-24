import { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "../replitAuth";

// Import all routers
import authRouter from "./auth.router";
import inventoryRouter from "./inventory.router";
import recipesRouter from "./recipes.router";
import mealPlanningRouter from "./meal-planning.router";
import appliancesRouter from "./appliances.router";
import adminRouter from "./admin.router";
import analyticsRouter from "./analytics.router";
import nutritionRouter from "./nutrition.router";
import feedbackRouter from "./feedback.router";

// Import special endpoints
import { createSeedEndpoint } from "../seed-cooking-terms-endpoint";

export async function registerModularRoutes(app: Express): Promise<Server> {
  // Setup authentication middleware first
  await setupAuth(app);
  
  // Register all route modules with their base paths
  app.use("/api/auth", authRouter);
  app.use("/api", inventoryRouter);  // Handles food-items, storage-locations, barcode, fdc
  app.use("/api", recipesRouter);     // Handles chat and recipes
  app.use("/api", mealPlanningRouter); // Handles meal-plans and shopping-list
  app.use("/api", appliancesRouter);  // Handles appliances
  app.use("/api", nutritionRouter);   // Handles nutrition stats and analysis
  app.use("/api", feedbackRouter);    // Handles user feedback
  app.use("/api/admin", adminRouter); // Admin endpoints
  app.use("/api/analytics", analyticsRouter); // Analytics endpoints
  
  // Register special endpoints
  const seedEndpoint = createSeedEndpoint();
  app.use("/api", seedEndpoint);
  
  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Create HTTP server
  return createServer(app);
}