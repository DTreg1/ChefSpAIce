import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../../middleware/auth";
import { successResponse } from "../../lib/apiResponse";
import {
  getAllAppliances,
  getCommonAppliances,
  getUserAppliances,
  addUserAppliance,
  removeUserAppliance,
  bulkSyncAppliances,
  invalidateAppliancesCache,
} from "../../services/applianceService";

export { invalidateAppliancesCache };

export const appliancesRouter = Router();
export const userAppliancesRouter = Router();

userAppliancesRouter.use(requireAuth);

appliancesRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const result = await getAllAppliances(category);
    res.set("Cache-Control", "public, max-age=86400");
    res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

appliancesRouter.get("/common", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getCommonAppliances();
    res.set("Cache-Control", "public, max-age=86400");
    res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

userAppliancesRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const result = await getUserAppliances(userId);
    res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

userAppliancesRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { applianceId, notes, brand } = req.body;
    const result = await addUserAppliance(userId, applianceId, notes, brand);
    res.status(201).json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

userAppliancesRouter.delete(
  "/:applianceId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;
      const applianceId = parseInt(req.params.applianceId, 10);
      await removeUserAppliance(userId, applianceId);
      res.json(successResponse(null, "Appliance removed from kitchen"));
    } catch (error) {
      next(error);
    }
  },
);

userAppliancesRouter.post("/bulk", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { applianceIds } = req.body;
    const result = await bulkSyncAppliances(userId, applianceIds);
    res.json(successResponse(result, `Synced ${result.total} appliances`));
  } catch (error) {
    next(error);
  }
});
