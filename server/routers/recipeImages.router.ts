import express, { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { uploadRecipeImage, deleteRecipeImage } from "../services/objectStorageService";
import { successResponse } from "../lib/apiResponse";
import { validateBody } from "../middleware/validateBody";

const router = Router();

const uploadSchema = z.object({
  recipeId: z.string(),
  base64Data: z.string(),
  contentType: z.string().optional(),
});

router.post("/upload", express.json({ limit: "10mb" }), validateBody(uploadSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recipeId, base64Data, contentType } = req.body;
    
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
