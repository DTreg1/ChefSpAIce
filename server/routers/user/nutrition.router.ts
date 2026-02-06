import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { nutritionCorrections } from "@shared/schema";
import { db } from "../../db";
import { logger } from "../../lib/logger";

const router = Router();

const correctionSubmitSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  barcode: z.string().optional(),
  brand: z.string().optional(),
  originalSource: z.string().optional(),
  originalSourceId: z.string().optional(),
  originalNutrition: z.string().optional(),
  correctedNutrition: z.string().optional(),
  imageUrl: z.string().optional(),
  notes: z.string().optional(),
});

router.post("/corrections", async (req: Request, res: Response) => {
  try {
    const parseResult = correctionSubmitSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: "Invalid submission data",
        details: parseResult.error.errors.map((e) => e.message).join(", "),
      });
    }

    const data = parseResult.data;
    const userId = (req as any).userId || null;

    const [correction] = await db
      .insert(nutritionCorrections)
      .values({
        userId,
        productName: data.productName,
        barcode: data.barcode || null,
        brand: data.brand || null,
        originalSource: data.originalSource || null,
        originalSourceId: data.originalSourceId || null,
        originalNutrition: data.originalNutrition || null,
        correctedNutrition: data.correctedNutrition || null,
        imageUrl: data.imageUrl || null,
        notes: data.notes || null,
        status: "pending",
      })
      .returning();

    logger.info("Nutrition correction submitted", { productName: data.productName });

    return res.status(201).json({
      message: "Correction submitted successfully",
      id: correction.id,
    });
  } catch (error) {
    logger.error("Error submitting nutrition correction", { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ error: "Failed to submit correction" });
  }
});

router.get("/corrections", async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 100);
    const offset = parseInt((req.query.offset as string) || "0", 10);

    const baseQuery = db.select().from(nutritionCorrections);
    
    const corrections = status
      ? await baseQuery
          .where(eq(nutritionCorrections.status, status))
          .orderBy(desc(nutritionCorrections.createdAt))
          .limit(limit)
          .offset(offset)
      : await baseQuery
          .orderBy(desc(nutritionCorrections.createdAt))
          .limit(limit)
          .offset(offset);

    return res.json({
      corrections,
      count: corrections.length,
      limit,
      offset,
    });
  } catch (error) {
    logger.error("Error fetching nutrition corrections", { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ error: "Failed to fetch corrections" });
  }
});

router.patch("/corrections/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid correction ID" });
    }

    const { status, reviewNotes } = req.body;

    if (!status || !["pending", "reviewed", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const [updated] = await db
      .update(nutritionCorrections)
      .set({
        status,
        reviewNotes: reviewNotes || null,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(nutritionCorrections.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Correction not found" });
    }

    return res.json({ message: "Correction updated", correction: updated });
  } catch (error) {
    logger.error("Error updating nutrition correction", { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ error: "Failed to update correction" });
  }
});

export default router;
