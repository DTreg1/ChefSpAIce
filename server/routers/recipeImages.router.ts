import express, { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { uploadRecipeImage, deleteRecipeImage } from "../services/objectStorageService";
import { AppError } from "../middleware/errorHandler";
import { successResponse } from "../lib/apiResponse";

const router = Router();

const uploadSchema = z.object({
  recipeId: z.string(),
  base64Data: z.string(),
  contentType: z.string().optional(),
});

router.post("/upload", express.json({ limit: "10mb" }), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = uploadSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest(
        "Invalid request data",
        "INVALID_REQUEST_DATA"
      ).withDetails({ validationErrors: parseResult.error.errors.map(e => e.message).join(", ") });
    }

    const { recipeId, base64Data, contentType } = parseResult.data;
    
    const { displayUrl, thumbnailUrl } = await uploadRecipeImage(recipeId, base64Data, contentType || "image/jpeg");
    
    res.json(successResponse({
      cloudImageUri: displayUrl,
      thumbnailUri: thumbnailUrl,
      recipeId,
    }));
  } catch (error) {
    next(error);
  }
});

router.delete("/:recipeId", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recipeId } = req.params;
    
    await deleteRecipeImage(recipeId);
    
    res.json(successResponse({
      recipeId,
    }));
  } catch (error) {
    next(error);
  }
});

export default router;
