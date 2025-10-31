import { Router, Request as ExpressRequest, Response as ExpressResponse } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { 
  type UserAppliance,
  type UserAppliance as Appliance,
  insertUserApplianceSchema as insertApplianceSchema,
  type ApplianceLibrary
} from "@shared/schema";
// Use OAuth authentication middleware
import { isAuthenticated } from "../auth/oauth";

const router = Router();

// Appliances CRUD
router.get("/appliances", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const category = req.query.category as string | undefined;
    
    let userAppliances;
    if (category) {
      // Filter by category if provided
      userAppliances = await storage.getUserAppliancesByCategory(userId, category);
    } else {
      userAppliances = await storage.getAppliances(userId);
    }
    
    res.json(userAppliances);
  } catch (error) {
    console.error("Error fetching appliances:", error);
    res.status(500).json({ error: "Failed to fetch appliances" });
  }
});

router.post(
  "/appliances",
  isAuthenticated,
  async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
    try {
      const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const validation = insertApplianceSchema.safeParse(req.body as any);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors
        });
      }

      const appliance = await storage.createAppliance(userId, validation.data);
      
      res.json(appliance);
    } catch (error) {
      console.error("Error creating appliance:", error);
      res.status(500).json({ error: "Failed to create appliance" });
    }
  }
);

// Get user's appliance categories with counts
router.get("/appliances/categories", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const categories = await storage.getApplianceCategories(userId);
    res.json(categories);
  } catch (error) {
    console.error("Error fetching appliance categories:", error);
    res.status(500).json({ error: "Failed to fetch appliance categories" });
  }
});

router.get("/appliances/:id", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const applianceId = req.params.id;
    
    const userAppliances = await storage.getAppliances(userId);
    const appliance = userAppliances.find((a: Appliance) => a.id === applianceId);
    
    if (!appliance) {
      return res.status(404).json({ error: "Appliance not found" });
    }
    
    res.json(appliance);
  } catch (error) {
    console.error("Error fetching appliance:", error);
    res.status(500).json({ error: "Failed to fetch appliance" });
  }
});

router.put(
  "/appliances/:id",
  isAuthenticated,
  async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
    try {
      const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
      const applianceId = req.params.id;
      
      // Verify appliance belongs to user
      const userAppliances = await storage.getAppliances(userId);
      const existing = userAppliances.find((a: Appliance) => a.id === applianceId);
      
      if (!existing) {
        return res.status(404).json({ error: "Appliance not found" });
      }
      
      const updated = await storage.updateAppliance(applianceId, userId, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating appliance:", error);
      res.status(500).json({ error: "Failed to update appliance" });
    }
  }
);

router.delete("/appliances/:id", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const applianceId = req.params.id;
    
    // Verify appliance belongs to user
    const userAppliances = await storage.getAppliances(userId);
    const existing = userAppliances.find((a: Appliance) => a.id === applianceId);
    
    if (!existing) {
      return res.status(404).json({ error: "Appliance not found" });
    }
    
    await storage.deleteAppliance(applianceId, userId);
    res.json({ message: "Appliance deleted successfully" });
  } catch (error) {
    console.error("Error deleting appliance:", error);
    res.status(500).json({ error: "Failed to delete appliance" });
  }
});

// Appliance categories - get unique categories from appliance library
router.get("/appliance-categories", async (_req: Request, res: ExpressResponse) => {
  try {
    const library = await storage.getApplianceLibrary();
    // Extract unique categories from the appliance library
    const categoriesMap = new Map<string, { name: string, count: number }>();
    
    library.forEach(item => {
      if (item.category) {
        const existing = categoriesMap.get(item.category);
        if (existing) {
          existing.count++;
        } else {
          categoriesMap.set(item.category, { name: item.category, count: 1 });
        }
      }
    });
    
    // Convert to array and sort by name
    const categories = Array.from(categoriesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    res.json(categories);
  } catch (error) {
    console.error("Error fetching appliance categories:", error);
    res.status(500).json({ error: "Failed to fetch appliance categories" });
  }
});

// ===== NEW APPLIANCE LIBRARY ENDPOINTS =====

// Get all items from appliance library
router.get("/appliance-library", async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    
    let appliances: ApplianceLibrary[];
    if (search) {
      appliances = await storage.searchApplianceLibrary(search);
    } else if (category) {
      appliances = await storage.getApplianceLibraryByCategory(category);
    } else {
      appliances = await storage.getApplianceLibrary();
    }
    
    res.json(appliances);
  } catch (error) {
    console.error("Error fetching appliance library:", error);
    res.status(500).json({ error: "Failed to fetch appliance library" });
  }
});

// Get common appliances (for onboarding)
router.get("/appliance-library/common", async (_req: Request, res: ExpressResponse) => {
  try {
    const commonAppliances = await storage.getCommonAppliances();
    res.json(commonAppliances);
  } catch (error) {
    console.error("Error fetching common appliances:", error);
    res.status(500).json({ error: "Failed to fetch common appliances" });
  }
});

// Get user's appliances from the new system
router.get("/user-appliances", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const category = req.query.category as string | undefined;
    
    let userAppliances;
    if (category) {
      userAppliances = await storage.getUserAppliancesByCategory(userId, category);
    } else {
      userAppliances = await storage.getUserAppliances(userId);
    }
    
    res.json(userAppliances);
  } catch (error) {
    console.error("Error fetching user appliances:", error);
    res.status(500).json({ error: "Failed to fetch user appliances" });
  }
});

// Get user's appliance categories with counts
router.get("/user-appliances/categories", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const categories = await storage.getApplianceCategories(userId);
    res.json(categories);
  } catch (error) {
    console.error("Error fetching user appliance categories:", error);
    res.status(500).json({ error: "Failed to fetch user appliance categories" });
  }
});

// Add appliance to user's collection
router.post("/user-appliances", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const bodySchema = z.object({
      applianceLibraryId: z.string(),
      nickname: z.string().optional(),
      notes: z.string().optional(),
      purchaseDate: z.string().optional(),
      warrantyEndDate: z.string().optional(),
    });
    
    const validation = bodySchema.safeParse(req.body as any);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        details: validation.error.errors
      });
    }
    
    const newUserAppliance = await storage.addUserAppliance(
      userId,
      validation.data.applianceLibraryId,
      {
        nickname: validation.data.nickname,
        notes: validation.data.notes,
        purchaseDate: validation.data.purchaseDate,
        warrantyEndDate: validation.data.warrantyEndDate,
      }
    );
    
    res.json(newUserAppliance);
  } catch (error) {
    console.error("Error adding user appliance:", error);
    res.status(500).json({ error: "Failed to add user appliance" });
  }
});

// Update user's appliance details
router.patch("/user-appliances/:id", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    
    const updateSchema = z.object({
      nickname: z.string().optional(),
      notes: z.string().optional(),
      purchaseDate: z.string().optional(),
      warrantyEndDate: z.string().optional(),
      isActive: z.boolean().optional(),
    });
    
    const validation = updateSchema.safeParse(req.body as any);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        details: validation.error.errors
      });
    }
    
    const updatedAppliance = await storage.updateUserAppliance(
      userId,
      id,
      validation.data
    );
    
    res.json(updatedAppliance);
  } catch (error) {
    console.error("Error updating user appliance:", error);
    res.status(500).json({ error: "Failed to update user appliance" });
  }
});

// Remove appliance from user's collection
router.delete("/user-appliances/:id", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    
    await storage.deleteUserAppliance(userId, id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting user appliance:", error);
    res.status(500).json({ error: "Failed to delete user appliance" });
  }
});

// Batch add/remove appliances (for onboarding or bulk updates)
router.post("/user-appliances/batch", isAuthenticated, async (req: ExpressRequest<any, any, any, any>, res: ExpressResponse) => {
  try {
    const userId = (req.user as any)?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const batchSchema = z.object({
      add: z.array(z.string()).optional(),
      remove: z.array(z.string()).optional(),
    });
    
    const validation = batchSchema.safeParse(req.body as any);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        details: validation.error.errors
      });
    }
    
    const results = {
      added: [] as UserAppliance[],
      removed: [] as string[],
    };
    
    // Add appliances
    if (validation.data.add && validation.data.add.length > 0) {
      for (const applianceLibraryId of validation.data.add) {
        try {
          const added = await storage.addUserAppliance(userId, applianceLibraryId);
          results.added.push(added);
        } catch (error) {
          console.error(`Failed to add appliance ${applianceLibraryId}:`, error);
        }
      }
    }
    
    // Remove appliances
    if (validation.data.remove && validation.data.remove.length > 0) {
      for (const id of validation.data.remove) {
        try {
          await storage.deleteUserAppliance(userId, id);
          results.removed.push(id);
        } catch (error) {
          console.error(`Failed to remove appliance ${id}:`, error);
        }
      }
    }
    
    res.json(results);
  } catch (error) {
    console.error("Error batch updating appliances:", error);
    res.status(500).json({ error: "Failed to batch update appliances" });
  }
});

export default router;