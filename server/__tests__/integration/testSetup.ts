import express from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "../../routes";
import { globalErrorHandler, requestIdMiddleware } from "../../middleware/errorHandler";
import { db } from "../../db";
import { users, userSessions, userSyncData, userInventoryItems, userSavedRecipes, subscriptions } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import type { Server } from "http";
import supertest from "supertest";

let server: Server;
let app: express.Express;

export async function createTestApp(): Promise<express.Express> {
  if (app) return app;

  app = express();
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());

  server = await registerRoutes(app);
  app.use(globalErrorHandler);

  return app;
}

export function getTestServer() {
  return server;
}

export function getTestApp() {
  return app;
}

const createdUserIds: string[] = [];

export async function registerTestUser(
  appInstance: express.Express,
  overrides: { email?: string; password?: string; displayName?: string } = {}
): Promise<{ token: string; userId: string; email: string }> {
  const uniqueId = Math.random().toString(36).substring(2, 10);
  const email = overrides.email || `test-${uniqueId}@integration.test`;
  const password = overrides.password || "TestPass123!";
  const displayName = overrides.displayName || `TestUser-${uniqueId}`;

  const res = await supertest(appInstance)
    .post("/api/auth/register")
    .send({ email, password, displayName })
    .expect(201);

  const { token, user } = res.body.data;
  createdUserIds.push(user.id);
  return { token, userId: user.id, email };
}

export async function loginTestUser(
  appInstance: express.Express,
  email: string,
  password: string
): Promise<{ token: string; userId: string }> {
  const res = await supertest(appInstance)
    .post("/api/auth/login")
    .send({ email, password })
    .expect(200);

  const { token, user } = res.body.data;
  return { token, userId: user.id };
}

export async function grantSubscription(userId: string): Promise<void> {
  await db.execute(sql`
    UPDATE users 
    SET subscription_tier = 'STANDARD', subscription_status = 'active'
    WHERE id = ${userId}
  `);

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await db.execute(sql`
    INSERT INTO subscriptions (user_id, status, plan_type, current_period_start, current_period_end, stripe_customer_id, stripe_subscription_id)
    VALUES (${userId}, 'active', 'monthly', ${now}, ${periodEnd}, ${'cus_test_' + userId.substring(0, 8)}, ${'sub_test_' + userId.substring(0, 8)})
    ON CONFLICT (user_id) DO UPDATE SET 
      status = 'active',
      plan_type = 'monthly',
      current_period_start = ${now},
      current_period_end = ${periodEnd}
  `);
}

export async function revokeSubscription(userId: string): Promise<void> {
  await db.execute(sql`
    UPDATE users 
    SET subscription_tier = 'FREE', subscription_status = 'none'
    WHERE id = ${userId}
  `);

  await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
}

export async function cleanupTestUser(userId: string): Promise<void> {
  try {
    await db.delete(userInventoryItems).where(eq(userInventoryItems.userId, userId));
    await db.delete(userSavedRecipes).where(eq(userSavedRecipes.userId, userId));
    await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
    await db.delete(userSyncData).where(eq(userSyncData.userId, userId));
    await db.delete(userSessions).where(eq(userSessions.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  } catch (err) {
    console.warn(`Cleanup warning for user ${userId}:`, err);
  }
}

export async function cleanupAllTestUsers(): Promise<void> {
  for (const userId of createdUserIds) {
    await cleanupTestUser(userId);
  }
  createdUserIds.length = 0;
}

export { db };
