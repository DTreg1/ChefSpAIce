import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { successResponse } from "../../lib/apiResponse";
import { AppError } from "../../middleware/errorHandler";
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

const addApplianceSchema = z.object({
  applianceId: z.number({ required_error: "applianceId is required" }).int().positive(),
  notes: z.string().optional(),
  brand: z.string().optional(),
});

const bulkSyncSchema = z.object({
  applianceIds: z.array(z.number().int().positive()).min(1, "At least one applianceId is required"),
});

userAppliancesRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = addApplianceSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(AppError.badRequest(parsed.error.errors[0]?.message || "Invalid request body", "VALIDATION_ERROR"));
    }
    const userId = req.userId!;
    const { applianceId, notes, brand } = parsed.data;
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
      if (isNaN(applianceId)) {
        return next(AppError.badRequest("Invalid appliance ID", "INVALID_APPLIANCE_ID"));
      }
      await removeUserAppliance(userId, applianceId);
      res.json(successResponse(null, "Appliance removed from kitchen"));
    } catch (error) {
      next(error);
    }
  },
);

userAppliancesRouter.post("/bulk", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = bulkSyncSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(AppError.badRequest(parsed.error.errors[0]?.message || "Invalid request body", "VALIDATION_ERROR"));
    }
    const userId = req.userId!;
    const { applianceIds } = parsed.data;
    const result = await bulkSyncAppliances(userId, applianceIds);
    res.json(successResponse(result, `Synced ${result.total} appliances`));
  } catch (error) {
    next(error);
  }
});
