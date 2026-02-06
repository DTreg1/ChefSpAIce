import express, { Router, Request, Response } from "express";
import { z } from "zod";
import { uploadRecipeImage, deleteRecipeImage } from "../services/objectStorageService";

const router = Router();

const uploadSchema = z.object({
  recipeId: z.string(),
  base64Data: z.string(),
  contentType: z.string().optional(),
});

// 10 MB limit for image uploads — base64-encoded images are ~33% larger than
// the raw file, so 10 MB JSON allows roughly 7.5 MB of actual image data.
// This overrides the global 1 MB express.json() limit for this route only.
router.post("/upload", express.json({ limit: "10mb" }), async (req: Request, res: Response) => {
  try {
    const parseResult = uploadSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: parseResult.error.errors.map(e => e.message).join(", "),
      });
    }

    const { recipeId, base64Data, contentType } = parseResult.data;
    
    const cloudUrl = await uploadRecipeImage(recipeId, base64Data, contentType || "image/jpeg");
    
    res.json({
      success: true,
      cloudImageUri: cloudUrl,
      recipeId,
    });
  } catch (error) {
    console.error("[RecipeImages] Upload error:", error);
    res.status(500).json({ error: "Failed to upload recipe image" });
  }
});

router.delete("/:recipeId", async (req: Request, res: Response) => {
  try {
    const { recipeId } = req.params;
    
    await deleteRecipeImage(recipeId);
    
    res.json({
      success: true,
      recipeId,
    });
  } catch (error) {
    console.error("[RecipeImages] Delete error:", error);
    res.status(500).json({ error: "Failed to delete recipe image" });
  }
});

export default router;
