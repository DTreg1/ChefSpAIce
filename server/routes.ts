/**
 * =============================================================================
 * CHEFSP-AICE API ROUTES
 * =============================================================================
 * 
 * This file defines all the API endpoints for the ChefSpAIce application.
 * It sets up route handlers for:
 * 
 * PUBLIC ROUTES (no auth required):
 * - /api/auth/* - User authentication (login, register, password reset)
 * - /api/auth/social/* - Social login (Google, Apple)
 * - /api/subscriptions/* - Stripe subscription management
 * - /api/feedback - User feedback collection
 * - /api/cooking-terms - Cooking terminology definitions
 * - /api/appliances - Kitchen appliance catalog
 * 
 * ADMIN ROUTES (admin auth required):
 * - /api/admin/subscriptions/* - Subscription management
 * 
 * PROTECTED ROUTES (auth + active subscription required):
 * - /api/suggestions - AI-powered recipe suggestions
 * - /api/recipes - Recipe CRUD and AI generation
 * - /api/nutrition - Nutrition data lookup
 * - /api/user/appliances - User's kitchen equipment
 * - /api/voice - Voice command processing
 * - /api/ai - Image analysis for food recognition
 * - /api/ingredients - Ingredient parsing and management
 * - /api/sync - Cloud sync for local-first data
 * 
 * STANDALONE ENDPOINTS:
 * - POST /api/chat - AI kitchen assistant with function calling
 * - POST /api/shelf-life - Shelf life estimation
 * - GET /api/nutrition/lookup - USDA nutrition data lookup
 * 
 * @module server/routes
 */

import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import { eq } from "drizzle-orm";
import suggestionsRouter from "./routers/user/suggestions.router";
import recipesRouter from "./routers/user/recipes.router";
import nutritionRouter from "./routers/user/nutrition.router";
import cookingTermsRouter from "./routers/user/cooking-terms.router";
import {
  appliancesRouter,
  userAppliancesRouter,
} from "./routers/user/appliances.router";
import voiceRouter from "./routers/platform/voice.router";
import imageAnalysisRouter from "./routers/platform/ai/image-analysis.router";
import receiptAnalysisRouter from "./routers/platform/ai/receipt-analysis.router";
import ingredientsRouter from "./routers/user/ingredients.router";
import authRouter from "./routers/auth.router";
import socialAuthRouter from "./routers/social-auth.router";
import syncRouter from "./routers/sync.router";
import recipeImagesRouter from "./routers/recipeImages.router";
import feedbackRouter from "./routers/feedback.router";
import logoExportRouter from "./routers/logo-export.router";
import subscriptionRouter from "./stripe/subscriptionRouter";
import adminSubscriptionsRouter from "./routers/admin/subscriptions.router";
import adminAnalyticsRouter from "./routers/admin/analytics.router";
import adminDataExportRouter from "./routers/admin/data-export.router";
import revenuecatWebhookRouter from "./routers/revenuecat-webhook.router";
import instacartRouter from "./routers/instacart.router";
import donationsRouter from "./routers/donations.router";
import externalApiRouter from "./routers/external-api.router";
import chatRouter from "./routers/chat.router";
import shelfLifeRouter from "./routers/shelf-life.router";
import dataExportRouter from "./routers/user/data-export.router";
import referralRouter from "./routers/referral.router";
import notificationsRouter from "./routers/notifications.router";
import nutritionLookupRouter from "./routers/nutrition-lookup.router";
import { db } from "./db";
import { users, userSessions } from "../shared/schema";
import { requireAuth } from "./middleware/auth";
import { requireSubscription } from "./middleware/requireSubscription";
import { requireAdmin } from "./middleware/requireAdmin";
import { authLimiter, aiLimiter, generalLimiter } from "./middleware/rateLimiter";
import { requestIdMiddleware, globalErrorHandler, AppError } from "./middleware/errorHandler";
import { successResponse, asyncHandler } from "./lib/apiResponse";
import { logger } from "./lib/logger";
import { hashToken } from "./lib/auth-utils";
import { invalidateSubscriptionCache } from "./lib/subscription-cache";


/**
 * REGISTER ROUTES
 * 
 * Main function that registers all API routes on the Express app.
 * Routes are organized by authentication requirements:
 * 
 * 1. PUBLIC - No authentication needed
 * 2. ADMIN - Requires admin role
 * 3. PROTECTED - Requires auth + active subscription
 * 
 * @param app - Express application instance
 * @returns HTTP server instance
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // =========================================================================
  // REQUEST ID - Attach a unique ID to every request for tracing
  // =========================================================================
  app.use(requestIdMiddleware);

  // =========================================================================
  // HEALTH CHECK - Used by client for network detection
  // =========================================================================
  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json(successResponse({ status: "ok", timestamp: new Date().toISOString() }));
  });
  app.head("/api/health", (_req: Request, res: Response) => {
    res.status(200).end();
  });

  // =========================================================================
  // RATE LIMITING - Applied to all /api/* routes as baseline protection
  // =========================================================================
  app.use("/api", generalLimiter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
  app.use("/api/chat", aiLimiter);
  app.use("/api/suggestions", aiLimiter);
  app.use("/api/recipes/generate", aiLimiter);

  // =========================================================================
  // PUBLIC ROUTES - No authentication required
  // =========================================================================
  app.use("/api/auth", authRouter);           // Login, register, logout
  app.use("/api/auth/social", socialAuthRouter); // Google/Apple OAuth
  app.use("/api/subscriptions", subscriptionRouter); // Stripe webhooks & portal
  app.use("/api/feedback", feedbackRouter);   // User feedback submission
  app.use("/api/cooking-terms", cookingTermsRouter); // Cooking definitions
  app.use("/api/appliances", appliancesRouter); // Kitchen appliance catalog
  app.use("/api/webhooks/revenuecat", revenuecatWebhookRouter); // RevenueCat iOS/Android webhooks
  app.use("/api/logo", logoExportRouter); // Logo export (PNG, SVG, favicon)
  app.use("/api/instacart", instacartRouter); // Instacart grocery shopping integration
  app.use("/api/donations", donationsRouter); // Support donations via Stripe
  app.use("/api/external", externalApiRouter); // External API for Siri Shortcuts integration
  app.use("/api/referral", referralRouter); // Referral system

  // =========================================================================
  // PRE-REGISTRATION ENDPOINT
  // Allows users to sign up from the landing page with just their email.
  // Creates a user account that they can activate later.
  // =========================================================================
  app.post("/api/pre-register", asyncHandler(async (req: Request, res: Response) => {
      const { email, privacyConsent } = req.body;

      if (!email || typeof email !== "string") {
        throw AppError.badRequest("Email is required", "EMAIL_REQUIRED");
      }

      if (privacyConsent !== true) {
        throw AppError.badRequest("You must agree to the privacy policy before signing up", "PRIVACY_CONSENT_REQUIRED");
      }

      const normalizedEmail = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        throw AppError.badRequest("Please enter a valid email address", "INVALID_EMAIL");
      }

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      if (existingUser) {
        return res.json(successResponse(null, "Thanks! We'll notify you when the app is available in the App Store and Google Play."));
      }

      // Create a new pre-registered user
      const now = new Date();
      await db.insert(users).values({
        email: normalizedEmail,
        displayName: normalizedEmail.split("@")[0],
        hasCompletedOnboarding: false,
        isActivated: false,
        preRegistrationSource: "landing",
        preRegisteredAt: now,
        privacyConsentedAt: now,
        subscriptionStatus: "none",
        subscriptionTier: "TRIAL",
      });

      return res.json(successResponse(null, "Thanks! We'll notify you when the app is available in the App Store and Google Play."));
  }));

  // =========================================================================
  // ADMIN ROUTES - Require admin authentication
  // =========================================================================
  app.use("/api/admin/subscriptions", requireAdmin, adminSubscriptionsRouter);
  app.use("/api/admin/analytics", requireAdmin, adminAnalyticsRouter);
  app.use("/api/admin/export-all-data", requireAdmin, adminDataExportRouter);

  // =========================================================================
  // PROTECTED ROUTES - Require auth + active subscription
  // These routes are gated by middleware that checks:
  // 1. User is authenticated (requireAuth)
  // 2. User has active subscription or free trial (requireSubscription)
  // =========================================================================
  app.use("/api/user/export-data", requireAuth, dataExportRouter);
  app.use("/api/notifications", requireAuth, notificationsRouter);

  app.use("/api/suggestions", requireAuth, requireSubscription, suggestionsRouter);
  app.use("/api/recipes", requireAuth, requireSubscription, recipesRouter);
  app.use("/api/nutrition/lookup", requireAuth, nutritionLookupRouter);
  app.use("/api/nutrition", requireAuth, requireSubscription, nutritionRouter);
  app.use("/api/user/appliances", requireAuth, requireSubscription, userAppliancesRouter);
  app.use("/api/voice", requireAuth, requireSubscription, voiceRouter);
  app.use("/api/ai", requireAuth, requireSubscription, imageAnalysisRouter);
  app.use("/api/receipt", requireAuth, requireSubscription, receiptAnalysisRouter);
  app.use("/api/ingredients", requireAuth, requireSubscription, ingredientsRouter);
  app.use("/api/sync", requireAuth, requireSubscription, syncRouter);
  app.use("/api/recipe-images", requireAuth, requireSubscription, recipeImagesRouter);

  // =========================================================================
  // FEATURE ROUTERS - Extracted to dedicated modules
  // =========================================================================
  app.use("/api/chat", requireAuth, requireSubscription, chatRouter);
  app.use("/api/suggestions/shelf-life", requireAuth, requireSubscription, shelfLifeRouter);

  // Development-only endpoint to set user subscription tier for testing
  if (process.env.NODE_ENV !== 'production') {
    logger.info("Registering test endpoints for development mode");

    const requireTestSecret = (req: Request, res: Response, next: NextFunction) => {
      const secret = process.env.TEST_ENDPOINTS_SECRET;
      if (secret && req.header("X-Test-Secret") !== secret) {
        return res.status(403).json({ error: "Invalid or missing X-Test-Secret header" });
      }
      next();
    };

    app.use("/api/test", requireTestSecret);

    // Create a test user and establish session for e2e testing
    app.post("/api/test/create-test-user", asyncHandler(async (req: Request, res: Response) => {
      logger.info("create-test-user endpoint hit");
        const crypto = await import("crypto");
        const bcrypt = await import("bcrypt");
        const testId = crypto.randomBytes(4).toString("hex");
        const email = `test_${testId}@test.chefspaice.com`;
        const plainPassword = crypto.randomBytes(16).toString("base64url");
        const passwordHash = await bcrypt.hash(plainPassword, 12);
        
        // Create the test user
        const [newUser] = await db
          .insert(users)
          .values({
            email,
            password: passwordHash,
            displayName: `Test User ${testId}`,
            subscriptionTier: "PRO",
            subscriptionStatus: "trialing",
            hasCompletedOnboarding: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        
        if (!newUser) {
          throw AppError.internal("Failed to create test user", "TEST_USER_CREATION_FAILED");
        }
        
        // Create a session token
        const rawSessionToken = crypto.randomBytes(32).toString("hex");
        const hashedSessionToken = hashToken(rawSessionToken);
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        
        await db.insert(userSessions).values({
          userId: newUser.id,
          token: hashedSessionToken,
          expiresAt,
          createdAt: new Date(),
        });
        
        // Set the auth cookie
        res.cookie("chefspaice_auth", rawSessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 30 * 24 * 60 * 60 * 1000,
          path: "/",
        });
        
        logger.info("Created test user", { userId: newUser.id });
        
        res.json(successResponse({
          userId: newUser.id,
          email,
          password: plainPassword,
          sessionToken: rawSessionToken,
          tier: "PRO",
        }, "Test user created with PRO trial. Session cookie set."));
    }));
    
    // Version with auth
    app.post("/api/test/set-subscription-tier", requireAuth, asyncHandler(async (req: Request, res: Response) => {
      logger.info("set-subscription-tier endpoint hit");
        const userId = req.userId;
        if (!userId) {
          throw AppError.unauthorized("Not authenticated", "NOT_AUTHENTICATED");
        }

        const { tier, status } = req.body;
        
        if (!tier || !['TRIAL', 'PRO'].includes(tier)) {
          throw AppError.badRequest("Invalid tier. Must be 'TRIAL' or 'PRO'", "INVALID_TIER");
        }

        const validStatuses = ['active', 'trialing', 'canceled', 'expired'];
        const newStatus = status && validStatuses.includes(status) ? status : 'active';

        // Update user's subscription tier directly
        await db
          .update(users)
          .set({
            subscriptionTier: tier,
            subscriptionStatus: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId));

        // Also update subscriptions table if exists
        const { subscriptions } = await import("../shared/schema");
        await db
          .update(subscriptions)
          .set({
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.userId, userId));

        await invalidateSubscriptionCache(userId);
        logger.info("Set user subscription tier", { userId, tier, status: newStatus });
        
        res.json(successResponse({ tier, status: newStatus }, `Subscription updated to ${tier} (${newStatus})`));
    }));

    app.post("/api/test/set-tier-by-email", asyncHandler(async (req: Request, res: Response) => {
      logger.info("set-tier-by-email endpoint hit");
        const { email, tier, status } = req.body;
        
        if (!email) {
          throw AppError.badRequest("Email is required", "EMAIL_REQUIRED");
        }
        
        if (!tier || !['TRIAL', 'PRO'].includes(tier)) {
          throw AppError.badRequest("Invalid tier. Must be 'TRIAL' or 'PRO'", "INVALID_TIER");
        }

        // Find user by email
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user) {
          throw AppError.notFound("User not found", "USER_NOT_FOUND");
        }

        const validStatuses = ['active', 'trialing', 'canceled', 'expired'];
        const newStatus = status && validStatuses.includes(status) ? status : 'active';

        // Update user's subscription tier directly
        await db
          .update(users)
          .set({
            subscriptionTier: tier,
            subscriptionStatus: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(users.id, user.id));

        // Also update subscriptions table if exists
        const { subscriptions } = await import("../shared/schema");
        await db
          .update(subscriptions)
          .set({
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.userId, user.id));

        await invalidateSubscriptionCache(user.id);
        logger.info("Set user subscription tier by email", { userId: user.id, tier, status: newStatus });
        
        res.json(successResponse({ userId: user.id, email, tier, status: newStatus }, `Subscription updated to ${tier} (${newStatus})`));
    }));
  }

  // Serve privacy policy HTML for app store submission
  app.get("/privacy-policy", asyncHandler(async (_req: Request, res: Response) => {
    const privacyPath = require("path").resolve(
      process.cwd(),
      "server",
      "templates",
      "privacy-policy.html"
    );
    res.sendFile(privacyPath);
  }));

  // Serve support page HTML for app store submission
  app.get("/support", asyncHandler(async (_req: Request, res: Response) => {
    const supportPath = require("path").resolve(
      process.cwd(),
      "server",
      "templates",
      "support.html"
    );
    res.sendFile(supportPath);
  }));

  // Serve marketing landing page for app store submission
  app.get("/marketing", asyncHandler(async (_req: Request, res: Response) => {
    const marketingPath = require("path").resolve(
      process.cwd(),
      "server",
      "templates",
      "marketing.html"
    );
    res.sendFile(marketingPath);
  }));

  // Serve feature graphic template for Google Play
  app.get("/feature-graphic", asyncHandler(async (_req: Request, res: Response) => {
    const featurePath = require("path").resolve(
      process.cwd(),
      "server",
      "templates",
      "feature-graphic.html"
    );
    res.sendFile(featurePath);
  }));

  // =========================================================================
  // GLOBAL ERROR HANDLER - Must be registered last
  // =========================================================================
  app.use(globalErrorHandler);

  const httpServer = createServer(app);
  return httpServer;
}
