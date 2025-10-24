import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { 
  appliances, 
  applianceCategories,
  insertApplianceSchema, 
  type Appliance,
  type ApplianceCategory 
} from "@shared/schema";
import { isAuthenticated } from "../replitAuth";
import { validateBody } from "../middleware";

const router = Router();

// Appliances CRUD
router.get("/appliances", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
    const userAppliances = await storage.getAppliances(userId);
    res.json(userAppliances);
  } catch (error) {
    console.error("Error fetching appliances:", error);
    res.status(500).json({ error: "Failed to fetch appliances" });
  }
});

router.post(
  "/appliances",
  isAuthenticated,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const validation = insertApplianceSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation error",
          details: validation.error.errors
        });
      }

      const appliance = await storage.createAppliance({
        ...validation.data,
        userId,
      });
      
      res.json(appliance);
    } catch (error) {
      console.error("Error creating appliance:", error);
      res.status(500).json({ error: "Failed to create appliance" });
    }
  }
);

router.get("/appliances/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
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
  async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
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

router.delete("/appliances/:id", isAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user.claims.sub;
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

// Appliance categories - public endpoint
router.get("/appliance-categories", async (_req: Request, res: Response) => {
  try {
    const categories = await storage.getApplianceCategories();
    res.json(categories);
  } catch (error) {
    console.error("Error fetching appliance categories:", error);
    res.status(500).json({ error: "Failed to fetch appliance categories" });
  }
});

export default router;