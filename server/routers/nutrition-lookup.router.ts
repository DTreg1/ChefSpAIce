import { Router, type Request, type Response, type NextFunction } from "express";
import { lookupNutritionByName, lookupNutritionByFdcId } from "../services/nutritionLookupService";
import { AppError } from "../middleware/errorHandler";
import { successResponse } from "../lib/apiResponse";
import { withCircuitBreaker } from "../lib/circuit-breaker";

const router = Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const name = req.query.name as string | undefined;
    const brand = req.query.brand as string | undefined;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw AppError.badRequest("Query parameter 'name' is required", "NAME_REQUIRED");
    }

    const nutrition = await withCircuitBreaker("usda", () => lookupNutritionByName(name.trim(), brand?.trim()));

    return res.json(
      successResponse({
        found: nutrition !== null,
        nutrition: nutrition || undefined,
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/:fdcId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fdcId = parseInt(req.params.fdcId, 10);
    if (isNaN(fdcId) || fdcId <= 0) {
      throw AppError.badRequest("Invalid fdcId parameter", "INVALID_FDC_ID");
    }

    const nutrition = await withCircuitBreaker("usda", () => lookupNutritionByFdcId(fdcId));

    return res.json(
      successResponse({
        found: nutrition !== null,
        nutrition: nutrition || undefined,
      }),
    );
  } catch (error) {
    next(error);
  }
});

export default router;
