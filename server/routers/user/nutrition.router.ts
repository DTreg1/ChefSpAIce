import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { nutritionCorrections } from "@shared/schema";
import { db } from "../../db";
import { logger } from "../../lib/logger";
import { AppError } from "../../middleware/errorHandler";

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

router.post("/corrections", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = correctionSubmitSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw AppError.badRequest("Invalid submission data", "VALIDATION_ERROR").withDetails({
        errors: parseResult.error.errors.map((e) => e.message).join(", "),
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
    next(error);
  }
});

router.get("/corrections", async (req: Request, res: Response, next: NextFunction) => {
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
    next(error);
  }
});

router.patch("/corrections/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw AppError.badRequest("Invalid correction ID", "INVALID_CORRECTION_ID");
    }

    const { status, reviewNotes } = req.body;

    if (!status || !["pending", "reviewed", "approved", "rejected"].includes(status)) {
      throw AppError.badRequest("Invalid status", "INVALID_STATUS");
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
      throw AppError.notFound("Correction not found", "CORRECTION_NOT_FOUND");
    }

    return res.json({ message: "Correction updated", correction: updated });
  } catch (error) {
    next(error);
  }
});

export default router;
