import { Router, Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validateBody";
import { successResponse } from "../lib/apiResponse";
import { getAuthToken, getSessionFromToken } from "./sync/sync-helpers";
import { getSyncStatus, exportBackup, importBackup, importRequestSchema } from "../services/syncBackupService";
import inventoryRouter from "./sync/inventory-sync";
import recipesRouter from "./sync/recipes-sync";
import mealPlansRouter from "./sync/meal-plans-sync";
import shoppingRouter from "./sync/shopping-sync";
import cookwareRouter from "./sync/cookware-sync";

const router = Router();

router.use("/inventory", inventoryRouter);
router.use("/recipes", recipesRouter);
router.use("/mealPlans", mealPlansRouter);
router.use("/shoppingList", shoppingRouter);
router.use("/cookware", cookwareRouter);

router.get("/status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }

    const result = await getSyncStatus(session.userId);
    res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

router.post("/export", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }

    const backup = await exportBackup(session.userId);

    const date = new Date().toISOString().split("T")[0];
    res.setHeader("Content-Disposition", `attachment; filename="chefspaice-backup-${date}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.json(successResponse(backup));
  } catch (error) {
    next(error);
  }
});

router.post("/import", validateBody(importRequestSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      throw AppError.unauthorized("Unauthorized", "UNAUTHORIZED");
    }

    const session = await getSessionFromToken(token);
    if (!session) {
      throw AppError.unauthorized("Invalid or expired session", "SESSION_EXPIRED");
    }

    const { backup, mode } = req.body;
    const result = await importBackup(session.userId, backup, mode);
    res.json(successResponse(result));
  } catch (error) {
    next(error);
  }
});

export default router;
