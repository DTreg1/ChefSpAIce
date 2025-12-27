import { Router, Request, Response } from "express";
import { db } from "../db";
import { users, userSessions, userSyncData } from "@shared/schema";
import { eq } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function getExpiryDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
}

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { username, password, displayName } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({ error: "Username already exists" });
    }

    const hashedPassword = hashPassword(password);

    const [newUser] = await db
      .insert(users)
      .values({
        username: username.toLowerCase(),
        password: hashedPassword,
        displayName: displayName || username,
      })
      .returning();

    const token = generateToken();
    const expiresAt = getExpiryDate();

    await db.insert(userSessions).values({
      userId: newUser.id,
      token,
      expiresAt,
    });

    await db.insert(userSyncData).values({
      userId: newUser.id,
    });

    res.status(201).json({
      user: {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.displayName,
        createdAt: newUser.createdAt?.toISOString() || new Date().toISOString(),
      },
      token,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase()))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const token = generateToken();
    const expiresAt = getExpiryDate();

    await db.insert(userSessions).values({
      userId: user.id,
      token,
      expiresAt,
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

router.post("/logout", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(200).json({ success: true });
    }

    const token = authHeader.substring(7);
    await db.delete(userSessions).where(eq(userSessions.token, token));

    res.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(200).json({ success: true });
  }
});

router.get("/me", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const token = authHeader.substring(7);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, token))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Session expired" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    res.status(500).json({ error: "Failed to verify authentication" });
  }
});

router.get("/sync", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const token = authHeader.substring(7);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, token))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Session expired" });
    }

    const [syncData] = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId))
      .limit(1);

    if (!syncData) {
      return res.json({ data: null, lastSyncedAt: null });
    }

    res.json({
      data: {
        inventory: syncData.inventory ? JSON.parse(syncData.inventory) : null,
        recipes: syncData.recipes ? JSON.parse(syncData.recipes) : null,
        mealPlans: syncData.mealPlans ? JSON.parse(syncData.mealPlans) : null,
        shoppingList: syncData.shoppingList ? JSON.parse(syncData.shoppingList) : null,
        preferences: syncData.preferences ? JSON.parse(syncData.preferences) : null,
        cookware: syncData.cookware ? JSON.parse(syncData.cookware) : null,
        wasteLog: syncData.wasteLog ? JSON.parse(syncData.wasteLog) : null,
        consumedLog: syncData.consumedLog ? JSON.parse(syncData.consumedLog) : null,
        analytics: syncData.analytics ? JSON.parse(syncData.analytics) : null,
        onboarding: syncData.onboarding ? JSON.parse(syncData.onboarding) : null,
        customLocations: syncData.customLocations ? JSON.parse(syncData.customLocations) : null,
        userProfile: syncData.userProfile ? JSON.parse(syncData.userProfile) : null,
      },
      lastSyncedAt: syncData.lastSyncedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Sync fetch error:", error);
    res.status(500).json({ error: "Failed to fetch sync data" });
  }
});

router.post("/sync", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const token = authHeader.substring(7);

    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.token, token))
      .limit(1);

    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Session expired" });
    }

    const { data } = req.body;

    await db
      .update(userSyncData)
      .set({
        inventory: data.inventory ? JSON.stringify(data.inventory) : null,
        recipes: data.recipes ? JSON.stringify(data.recipes) : null,
        mealPlans: data.mealPlans ? JSON.stringify(data.mealPlans) : null,
        shoppingList: data.shoppingList ? JSON.stringify(data.shoppingList) : null,
        preferences: data.preferences ? JSON.stringify(data.preferences) : null,
        cookware: data.cookware ? JSON.stringify(data.cookware) : null,
        wasteLog: data.wasteLog ? JSON.stringify(data.wasteLog) : null,
        consumedLog: data.consumedLog ? JSON.stringify(data.consumedLog) : null,
        analytics: data.analytics ? JSON.stringify(data.analytics) : null,
        onboarding: data.onboarding ? JSON.stringify(data.onboarding) : null,
        customLocations: data.customLocations ? JSON.stringify(data.customLocations) : null,
        userProfile: data.userProfile ? JSON.stringify(data.userProfile) : null,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSyncData.userId, session.userId));

    res.json({ success: true, syncedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Sync save error:", error);
    res.status(500).json({ error: "Failed to save sync data" });
  }
});

export default router;
