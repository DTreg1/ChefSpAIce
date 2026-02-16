import supertest from "supertest";
import {
  createTestApp,
  registerTestUser,
  grantSubscription,
  revokeSubscription,
  cleanupAllTestUsers,
  db,
} from "./testSetup";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { invalidateSubscriptionCache } from "../../lib/subscription-cache";
import type express from "express";

describe("Subscription Flow Integration", () => {
  let app: express.Express;
  let token: string;
  let userId: string;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    app = await createTestApp();
    request = supertest(app);
    const testUser = await registerTestUser(app);
    token = testUser.token;
    userId = testUser.userId;
  });

  afterAll(async () => {
    await cleanupAllTestUsers();
  });

  describe("Feature Gating - Protected Routes", () => {
    describe("User without subscription (non-STANDARD tier, no subscription row)", () => {
      let testUserId: string;
      let testToken: string;

      beforeAll(async () => {
        // Register user with STANDARD tier (default)
        const testUser = await registerTestUser(app);
        testToken = testUser.token;
        testUserId = testUser.userId;

        // Update user to a non-STANDARD tier (this requires subscription)
        await db.update(users).set({
          subscriptionTier: "PRO",
          subscriptionStatus: "none",
        }).where(eq(users.id, testUserId));

        // Remove any existing subscription row
        await revokeSubscription(testUserId);
        await invalidateSubscriptionCache(testUserId);
      });

      it("should return 403 when accessing protected /api/sync/status route without valid subscription", async () => {
        const response = await request
          .get("/api/sync/status")
          .set("Authorization", `Bearer ${testToken}`)
          .expect(403);

        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("errorCode", "SUBSCRIPTION_REQUIRED");
        expect(response.body).toHaveProperty("error");
      });
    });

    describe("User with active subscription", () => {
      let testUserId: string;
      let testToken: string;

      beforeAll(async () => {
        const testUser = await registerTestUser(app);
        testToken = testUser.token;
        testUserId = testUser.userId;

        // Grant subscription to user
        await grantSubscription(testUserId);
        await invalidateSubscriptionCache(testUserId);
      });

      it("should return 200 when accessing protected /api/sync/status route with active subscription", async () => {
        const response = await request
          .get("/api/sync/status")
          .set("Authorization", `Bearer ${testToken}`)
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
      });
    });

    describe("User with FREE tier and no subscription row", () => {
      let testToken: string;

      beforeAll(async () => {
        const testUser = await registerTestUser(app);
        testToken = testUser.token;

        await revokeSubscription(testUser.userId);
        await invalidateSubscriptionCache(testUser.userId);
      });

      it("should return 403 when accessing protected route as FREE tier user without subscription", async () => {
        const response = await request
          .get("/api/sync/status")
          .set("Authorization", `Bearer ${testToken}`)
          .expect(403);

        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("errorCode", "SUBSCRIPTION_REQUIRED");
      });
    });
  });

  describe("Subscription Status Transitions", () => {
    let transitionUserId: string;
    let transitionToken: string;

    beforeAll(async () => {
      const testUser = await registerTestUser(app);
      transitionToken = testUser.token;
      transitionUserId = testUser.userId;

      // Start with PRO tier and no subscription
      await db.update(users).set({
        subscriptionTier: "PRO",
        subscriptionStatus: "none",
      }).where(eq(users.id, transitionUserId));

      await revokeSubscription(transitionUserId);
      await invalidateSubscriptionCache(transitionUserId);
    });

    it("should block access when user has no subscription (PRO tier)", async () => {
      await request
        .get("/api/sync/status")
        .set("Authorization", `Bearer ${transitionToken}`)
        .expect(403);
    });

    it("should grant access after subscription is granted", async () => {
      await grantSubscription(transitionUserId);
      await invalidateSubscriptionCache(transitionUserId);

      const response = await request
        .get("/api/sync/status")
        .set("Authorization", `Bearer ${transitionToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });

    it("should revoke access after subscription is revoked", async () => {
      await revokeSubscription(transitionUserId);
      await invalidateSubscriptionCache(transitionUserId);

      await request
        .get("/api/sync/status")
        .set("Authorization", `Bearer ${transitionToken}`)
        .expect(403);
    });

    it("should grant access again after re-subscribing", async () => {
      await grantSubscription(transitionUserId);
      await invalidateSubscriptionCache(transitionUserId);

      const response = await request
        .get("/api/sync/status")
        .set("Authorization", `Bearer ${transitionToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("Checkout Session Endpoint", () => {
    describe("Authentication validation", () => {
      it("should return 401 when accessing create-checkout-session without Bearer token", async () => {
        const response = await request
          .post("/api/subscriptions/create-checkout-session")
          .send({ priceId: "price_test_123" })
          .expect(401);

        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("errorCode", "AUTHENTICATION_REQUIRED");
      });

      it("should return 401 with malformed Authorization header", async () => {
        const response = await request
          .post("/api/subscriptions/create-checkout-session")
          .set("Authorization", "InvalidFormat token123")
          .send({ priceId: "price_test_123" })
          .expect(401);

        expect(response.body).toHaveProperty("success", false);
      });

      it("should return 401 with invalid Bearer token", async () => {
        const response = await request
          .post("/api/subscriptions/create-checkout-session")
          .set("Authorization", "Bearer invalid_token_that_does_not_exist")
          .send({ priceId: "price_test_123" })
          .expect(401);

        expect(response.body).toHaveProperty("success", false);
      });
    });

    describe("Request validation", () => {
      it("should return 400 when priceId is missing", async () => {
        const response = await request
          .post("/api/subscriptions/create-checkout-session")
          .set("Authorization", `Bearer ${token}`)
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("errorCode", "MISSING_PRICE_ID");
        expect(response.body.error).toContain("priceId");
      });

      it("should return 400 when priceId is empty string", async () => {
        const response = await request
          .post("/api/subscriptions/create-checkout-session")
          .set("Authorization", `Bearer ${token}`)
          .send({ priceId: "" })
          .expect(400);

        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("errorCode", "MISSING_PRICE_ID");
      });

      it("should return 400 when priceId is null", async () => {
        const response = await request
          .post("/api/subscriptions/create-checkout-session")
          .set("Authorization", `Bearer ${token}`)
          .send({ priceId: null })
          .expect(400);

        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("errorCode", "MISSING_PRICE_ID");
      });
    });
  });

  describe("Webhook Simulation - Direct DB Subscription Insert", () => {
    let webhookSimUserId: string;
    let webhookSimToken: string;

    beforeAll(async () => {
      const testUser = await registerTestUser(app);
      webhookSimToken = testUser.token;
      webhookSimUserId = testUser.userId;

      // Start with PRO tier and no subscription
      await db.update(users).set({
        subscriptionTier: "PRO",
        subscriptionStatus: "none",
      }).where(eq(users.id, webhookSimUserId));

      await revokeSubscription(webhookSimUserId);
      await invalidateSubscriptionCache(webhookSimUserId);
    });

    it("should block access before webhook subscription is inserted", async () => {
      await request
        .get("/api/sync/status")
        .set("Authorization", `Bearer ${webhookSimToken}`)
        .expect(403);
    });

    it("should grant access after webhook simulates subscription insertion (direct DB insert)", async () => {
      // Simulate what the webhook does: insert subscription into DB
      await grantSubscription(webhookSimUserId);
      await invalidateSubscriptionCache(webhookSimUserId);

      const response = await request
        .get("/api/sync/status")
        .set("Authorization", `Bearer ${webhookSimToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });

    it("should maintain access after subsequent sync calls", async () => {
      // Call multiple times to ensure subscription status persists
      for (let i = 0; i < 3; i++) {
        const response = await request
          .get("/api/sync/status")
          .set("Authorization", `Bearer ${webhookSimToken}`)
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
      }
    });
  });

  describe("Cache Invalidation", () => {
    let cacheTestUserId: string;
    let cacheTestToken: string;

    beforeAll(async () => {
      const testUser = await registerTestUser(app);
      cacheTestToken = testUser.token;
      cacheTestUserId = testUser.userId;

      // Start with PRO tier and subscription
      await db.update(users).set({
        subscriptionTier: "PRO",
        subscriptionStatus: "active",
      }).where(eq(users.id, cacheTestUserId));

      await grantSubscription(cacheTestUserId);
      await invalidateSubscriptionCache(cacheTestUserId);
    });

    it("should reflect subscription changes immediately after cache invalidation", async () => {
      // Verify access is allowed
      await request
        .get("/api/sync/status")
        .set("Authorization", `Bearer ${cacheTestToken}`)
        .expect(200);

      // Revoke subscription and invalidate cache
      await revokeSubscription(cacheTestUserId);
      await invalidateSubscriptionCache(cacheTestUserId);

      // Verify access is now denied
      await request
        .get("/api/sync/status")
        .set("Authorization", `Bearer ${cacheTestToken}`)
        .expect(403);
    });

    it("should reflect re-subscription changes after cache invalidation", async () => {
      // Grant subscription and invalidate cache
      await grantSubscription(cacheTestUserId);
      await invalidateSubscriptionCache(cacheTestUserId);

      // Verify access is allowed
      const response = await request
        .get("/api/sync/status")
        .set("Authorization", `Bearer ${cacheTestToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("Protected Routes - Missing Authentication", () => {
    it("should return 401 when accessing protected route without Bearer token", async () => {
      const response = await request
        .get("/api/sync/status")
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("errorCode", "AUTHENTICATION_REQUIRED");
    });

    it("should return 401 when accessing protected route with malformed Authorization header", async () => {
      const response = await request
        .get("/api/sync/status")
        .set("Authorization", "InvalidFormat")
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
    });
  });
});
