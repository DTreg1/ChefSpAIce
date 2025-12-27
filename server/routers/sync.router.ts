import { Router, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { userSessions, userSyncData } from "../../shared/schema";

const router = Router();

async function getSessionFromToken(token: string) {
  if (!token) return null;
  
  const sessions = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.token, token));
  
  if (sessions.length === 0) return null;
  
  const session = sessions[0];
  if (new Date(session.expiresAt) < new Date()) {
    return null;
  }
  
  return session;
}

function getAuthToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

router.post("/inventory", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const { operation, data, clientTimestamp } = req.body;

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentInventory: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].inventory) {
      currentInventory = JSON.parse(existingSyncData[0].inventory);
    }

    if (operation === "create") {
      currentInventory.push(data);
    } else if (operation === "update") {
      const index = currentInventory.findIndex(
        (item: unknown) => (item as { id: string }).id === (data as { id: string }).id
      );
      if (index !== -1) {
        currentInventory[index] = data;
      } else {
        currentInventory.push(data);
      }
    } else if (operation === "delete") {
      currentInventory = currentInventory.filter(
        (item: unknown) => (item as { id: string }).id !== (data as { id: string }).id
      );
    }

    if (existingSyncData.length === 0) {
      await db.insert(userSyncData).values({
        userId: session.userId,
        inventory: JSON.stringify(currentInventory),
      });
    } else {
      await db
        .update(userSyncData)
        .set({
          inventory: JSON.stringify(currentInventory),
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSyncData.userId, session.userId));
    }

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation,
      itemId: (data as { id: string }).id,
    });
  } catch (error) {
    console.error("Inventory sync error:", error);
    res.status(500).json({ error: "Failed to sync inventory" });
  }
});

router.put("/inventory", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const { data, clientTimestamp } = req.body;
    
    if (!data || !(data as { id: string }).id) {
      return res.status(400).json({ error: "Invalid data: missing id" });
    }

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentInventory: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].inventory) {
      currentInventory = JSON.parse(existingSyncData[0].inventory);
    }

    const index = currentInventory.findIndex(
      (item: unknown) => (item as { id: string }).id === (data as { id: string }).id
    );
    
    if (index !== -1) {
      const existingItem = currentInventory[index] as { updatedAt?: string };
      const existingTimestamp = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
      const newTimestamp = clientTimestamp ? new Date(clientTimestamp).getTime() : Date.now();
      
      if (newTimestamp >= existingTimestamp) {
        currentInventory[index] = { ...data, updatedAt: clientTimestamp || new Date().toISOString() };
      } else {
        return res.json({
          success: true,
          syncedAt: new Date().toISOString(),
          operation: "skipped",
          reason: "stale_update",
          itemId: (data as { id: string }).id,
        });
      }
    } else {
      currentInventory.push({ ...data, updatedAt: clientTimestamp || new Date().toISOString() });
    }

    await db
      .update(userSyncData)
      .set({
        inventory: JSON.stringify(currentInventory),
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSyncData.userId, session.userId));

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation: "update",
      itemId: (data as { id: string }).id,
    });
  } catch (error) {
    console.error("Inventory update sync error:", error);
    res.status(500).json({ error: "Failed to sync inventory update" });
  }
});

router.delete("/inventory", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const { data } = req.body;

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentInventory: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].inventory) {
      currentInventory = JSON.parse(existingSyncData[0].inventory);
    }

    currentInventory = currentInventory.filter(
      (item: unknown) => (item as { id: string }).id !== (data as { id: string }).id
    );

    await db
      .update(userSyncData)
      .set({
        inventory: JSON.stringify(currentInventory),
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSyncData.userId, session.userId));

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation: "delete",
      itemId: (data as { id: string }).id,
    });
  } catch (error) {
    console.error("Inventory delete sync error:", error);
    res.status(500).json({ error: "Failed to sync inventory deletion" });
  }
});

router.post("/recipes", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const { operation, data } = req.body;

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentRecipes: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].recipes) {
      currentRecipes = JSON.parse(existingSyncData[0].recipes);
    }

    if (operation === "create") {
      currentRecipes.push(data);
    } else if (operation === "update") {
      const index = currentRecipes.findIndex(
        (item: unknown) => (item as { id: string }).id === (data as { id: string }).id
      );
      if (index !== -1) {
        currentRecipes[index] = data;
      } else {
        currentRecipes.push(data);
      }
    } else if (operation === "delete") {
      currentRecipes = currentRecipes.filter(
        (item: unknown) => (item as { id: string }).id !== (data as { id: string }).id
      );
    }

    if (existingSyncData.length === 0) {
      await db.insert(userSyncData).values({
        userId: session.userId,
        recipes: JSON.stringify(currentRecipes),
      });
    } else {
      await db
        .update(userSyncData)
        .set({
          recipes: JSON.stringify(currentRecipes),
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSyncData.userId, session.userId));
    }

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation,
      itemId: (data as { id: string }).id,
    });
  } catch (error) {
    console.error("Recipes sync error:", error);
    res.status(500).json({ error: "Failed to sync recipes" });
  }
});

router.put("/recipes", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const { data, clientTimestamp } = req.body;
    
    if (!data || !(data as { id: string }).id) {
      return res.status(400).json({ error: "Invalid data: missing id" });
    }

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentRecipes: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].recipes) {
      currentRecipes = JSON.parse(existingSyncData[0].recipes);
    }

    const index = currentRecipes.findIndex(
      (item: unknown) => (item as { id: string }).id === (data as { id: string }).id
    );
    
    if (index !== -1) {
      const existingItem = currentRecipes[index] as { updatedAt?: string };
      const existingTimestamp = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
      const newTimestamp = clientTimestamp ? new Date(clientTimestamp).getTime() : Date.now();
      
      if (newTimestamp >= existingTimestamp) {
        currentRecipes[index] = { ...data, updatedAt: clientTimestamp || new Date().toISOString() };
      } else {
        return res.json({
          success: true,
          syncedAt: new Date().toISOString(),
          operation: "skipped",
          reason: "stale_update",
          itemId: (data as { id: string }).id,
        });
      }
    } else {
      currentRecipes.push({ ...data, updatedAt: clientTimestamp || new Date().toISOString() });
    }

    await db
      .update(userSyncData)
      .set({
        recipes: JSON.stringify(currentRecipes),
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSyncData.userId, session.userId));

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation: "update",
      itemId: (data as { id: string }).id,
    });
  } catch (error) {
    console.error("Recipes update sync error:", error);
    res.status(500).json({ error: "Failed to sync recipe update" });
  }
});

router.delete("/recipes", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const { data } = req.body;

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentRecipes: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].recipes) {
      currentRecipes = JSON.parse(existingSyncData[0].recipes);
    }

    currentRecipes = currentRecipes.filter(
      (item: unknown) => (item as { id: string }).id !== (data as { id: string }).id
    );

    await db
      .update(userSyncData)
      .set({
        recipes: JSON.stringify(currentRecipes),
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSyncData.userId, session.userId));

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation: "delete",
      itemId: (data as { id: string }).id,
    });
  } catch (error) {
    console.error("Recipes delete sync error:", error);
    res.status(500).json({ error: "Failed to sync recipe deletion" });
  }
});

router.post("/mealPlans", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const { operation, data } = req.body;

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentMealPlans: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].mealPlans) {
      currentMealPlans = JSON.parse(existingSyncData[0].mealPlans);
    }

    if (operation === "create") {
      currentMealPlans.push(data);
    } else if (operation === "update") {
      const index = currentMealPlans.findIndex(
        (item: unknown) => (item as { id: string }).id === (data as { id: string }).id
      );
      if (index !== -1) {
        currentMealPlans[index] = data;
      } else {
        currentMealPlans.push(data);
      }
    } else if (operation === "delete") {
      currentMealPlans = currentMealPlans.filter(
        (item: unknown) => (item as { id: string }).id !== (data as { id: string }).id
      );
    }

    if (existingSyncData.length === 0) {
      await db.insert(userSyncData).values({
        userId: session.userId,
        mealPlans: JSON.stringify(currentMealPlans),
      });
    } else {
      await db
        .update(userSyncData)
        .set({
          mealPlans: JSON.stringify(currentMealPlans),
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userSyncData.userId, session.userId));
    }

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation,
      itemId: (data as { id: string }).id,
    });
  } catch (error) {
    console.error("Meal plans sync error:", error);
    res.status(500).json({ error: "Failed to sync meal plans" });
  }
});

router.put("/mealPlans", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const { data, clientTimestamp } = req.body;
    
    if (!data || !(data as { id: string }).id) {
      return res.status(400).json({ error: "Invalid data: missing id" });
    }

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentMealPlans: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].mealPlans) {
      currentMealPlans = JSON.parse(existingSyncData[0].mealPlans);
    }

    const index = currentMealPlans.findIndex(
      (item: unknown) => (item as { id: string }).id === (data as { id: string }).id
    );
    
    if (index !== -1) {
      const existingItem = currentMealPlans[index] as { updatedAt?: string };
      const existingTimestamp = existingItem.updatedAt ? new Date(existingItem.updatedAt).getTime() : 0;
      const newTimestamp = clientTimestamp ? new Date(clientTimestamp).getTime() : Date.now();
      
      if (newTimestamp >= existingTimestamp) {
        currentMealPlans[index] = { ...data, updatedAt: clientTimestamp || new Date().toISOString() };
      } else {
        return res.json({
          success: true,
          syncedAt: new Date().toISOString(),
          operation: "skipped",
          reason: "stale_update",
          itemId: (data as { id: string }).id,
        });
      }
    } else {
      currentMealPlans.push({ ...data, updatedAt: clientTimestamp || new Date().toISOString() });
    }

    await db
      .update(userSyncData)
      .set({
        mealPlans: JSON.stringify(currentMealPlans),
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSyncData.userId, session.userId));

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation: "update",
      itemId: (data as { id: string }).id,
    });
  } catch (error) {
    console.error("Meal plans update sync error:", error);
    res.status(500).json({ error: "Failed to sync meal plan update" });
  }
});

router.delete("/mealPlans", async (req: Request, res: Response) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const { data } = req.body;

    const existingSyncData = await db
      .select()
      .from(userSyncData)
      .where(eq(userSyncData.userId, session.userId));

    let currentMealPlans: unknown[] = [];
    if (existingSyncData.length > 0 && existingSyncData[0].mealPlans) {
      currentMealPlans = JSON.parse(existingSyncData[0].mealPlans);
    }

    currentMealPlans = currentMealPlans.filter(
      (item: unknown) => (item as { id: string }).id !== (data as { id: string }).id
    );

    await db
      .update(userSyncData)
      .set({
        mealPlans: JSON.stringify(currentMealPlans),
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSyncData.userId, session.userId));

    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      operation: "delete",
      itemId: (data as { id: string }).id,
    });
  } catch (error) {
    console.error("Meal plans delete sync error:", error);
    res.status(500).json({ error: "Failed to sync meal plan deletion" });
  }
});

export default router;
