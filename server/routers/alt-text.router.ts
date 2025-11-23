/**
 * Alt Text API Router
 * 
 * Handles alt text generation, management, and accessibility reporting.
 */

import { Router } from "express";
import { z } from "zod";
import { isAuthenticated } from "../middleware/oauth.middleware";
import multer from "multer";
import type { DatabaseStorage } from "../storage/index";
import {
  generateAltText,
  batchGenerateAltText,
  analyzeAltTextQuality,
  generateAltTextSuggestions,
  checkIfDecorative
} from "../services/alt-text-generator";
import type { ImageMetadata, AltTextQuality } from "@shared/schema";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed'));
      return;
    }
    cb(null, true);
  }
});

// Request schemas
const generateAltTextSchema = z.object({
  imageUrl: z.string().url(),
  context: z.string().optional(),
  saveToDb: z.boolean().optional().default(true)
});

const bulkGenerateSchema = z.object({
  images: z.array(z.object({
    id: z.string(),
    imageUrl: z.string().url(),
    context: z.string().optional()
  })).max(50) // Limit to 50 images per batch
});

const updateAltTextSchema = z.object({
  altText: z.string(),
  isDecorative: z.boolean().optional(),
  title: z.string().optional()
});

const accessibilityReportSchema = z.object({
  wcagLevel: z.enum(['A', 'AA', 'AAA']).optional(),
  minScore: z.number().min(0).max(100).optional(),
  maxScore: z.number().min(0).max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export function createAltTextRouter(storage: DatabaseStorage): Router {
  const router = Router();

  // All routes require authentication
  router.use(isAuthenticated);

  /**
   * Generate alt text for an image
   * POST /api/images/alt-text
   */
  router.post("/alt-text", async (req, res) => {
    try {
      const userId = req.user!.id;
      const data = generateAltTextSchema.parse(req.body);

      // Check if image metadata already exists
      let imageMetadata = await storage.platform.ai.getImageMetadataByUrl(userId, data.imageUrl);

      // Generate alt text
      const result = await generateAltText(data.imageUrl, data.context);

      if (data.saveToDb) {
        if (!imageMetadata) {
          // Create new image metadata
          imageMetadata = await storage.platform.ai.createImageMetadata(userId, {
            imageUrl: data.imageUrl,
            generatedAlt: result.altText,
            altText: result.altText,
            context: data.context,
            aiModel: "gpt-5-vision",
            generatedAt: new Date(),
            confidence: result.confidence,
            objectsDetected: result.objectsDetected
          });
        } else {
          // Update existing metadata
          imageMetadata = await storage.platform.ai.updateImageMetadata(userId, imageMetadata.id, {
            generatedAlt: result.altText,
            altText: imageMetadata.altText || result.altText, // Don't override user-edited alt text
            aiModel: "gpt-5-vision",
            generatedAt: new Date(),
            confidence: result.confidence,
            objectsDetected: result.objectsDetected
          });
        }

        // Analyze and save quality metrics
        const quality = await analyzeAltTextQuality(
          result.altText,
          data.imageUrl,
          data.context
        );
        
        await storage.platform.ai.upsertAltTextQuality(imageMetadata.id, quality);
      }

      res.json({
        success: true,
        data: {
          imageId: imageMetadata?.id,
          altText: result.altText,
          confidence: result.confidence,
          objectsDetected: result.objectsDetected,
          suggestions: result.suggestions
        }
      });
    } catch (error) {
      console.error("Failed to generate alt text:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate alt text"
      });
    }
  });

  /**
   * Batch process multiple images
   * POST /api/images/bulk-alt
   */
  router.post("/bulk-alt", async (req, res) => {
    try {
      const userId = req.user!.id;
      const data = bulkGenerateSchema.parse(req.body);

      // Generate alt text for all images
      const results = await batchGenerateAltText(
        data.images.map(img => ({
          imageUrl: img.imageUrl,
          context: img.context
        }))
      );

      // Save results to database
      const savedResults = await Promise.all(
        results.map(async (result, index) => {
          const imageData = data.images[index];
          
          if (result.error) {
            return {
              id: imageData.id,
              success: false,
              error: result.error
            };
          }

          try {
            // Check if image exists
            let imageMetadata = await storage.platform.ai.getImageMetadata(userId, imageData.id);
            
            if (!imageMetadata) {
              // Create new
              imageMetadata = await storage.platform.ai.createImageMetadata(userId, {
                imageUrl: result.imageUrl,
                generatedAlt: result.altText,
                altText: result.altText,
                context: imageData.context,
                aiModel: "gpt-5-vision",
                generatedAt: new Date(),
                confidence: result.confidence,
                objectsDetected: result.objectsDetected
              });
            } else {
              // Update existing
              imageMetadata = await storage.platform.ai.updateImageMetadata(userId, imageData.id, {
                generatedAlt: result.altText,
                altText: imageMetadata.altText || result.altText,
                aiModel: "gpt-5-vision",
                generatedAt: new Date(),
                confidence: result.confidence,
                objectsDetected: result.objectsDetected
              });
            }

            // Analyze quality
            const quality = await analyzeAltTextQuality(
              result.altText,
              result.imageUrl,
              imageData.context
            );
            
            await storage.platform.ai.upsertAltTextQuality(imageMetadata.id, quality);

            return {
              id: imageMetadata.id,
              success: true,
              altText: result.altText,
              confidence: result.confidence
            };
          } catch (error) {
            console.error(`Failed to save alt text for image ${imageData.id}:`, error);
            return {
              id: imageData.id,
              success: false,
              error: "Failed to save to database"
            };
          }
        })
      );

      res.json({
        success: true,
        data: {
          processed: savedResults.length,
          successful: savedResults.filter(r => r.success).length,
          failed: savedResults.filter(r => !r.success).length,
          results: savedResults
        }
      });
    } catch (error) {
      console.error("Failed to batch generate alt text:", error);
      res.status(500).json({
        success: false,
        error: "Failed to batch generate alt text"
      });
    }
  });

  /**
   * Update alt text for an image
   * PUT /api/images/:id/alt-text
   */
  router.put("/:id/alt-text", async (req, res) => {
    try {
      const userId = req.user!.id;
      const imageId = req.params.id;
      const data = updateAltTextSchema.parse(req.body);

      // Update image metadata
      const imageMetadata = await storage.platform.ai.updateImageMetadata(userId, imageId, {
        altText: data.altText,
        isDecorative: data.isDecorative,
        title: data.title
      });

      // Re-analyze quality with new alt text
      const quality = await analyzeAltTextQuality(
        data.altText,
        imageMetadata.imageUrl,
        imageMetadata.context || undefined
      );
      
      await storage.platform.ai.upsertAltTextQuality(imageId, quality as Omit<any, 'imageId'>);

      res.json({
        success: true,
        data: {
          imageMetadata,
          quality
        }
      });
    } catch (error) {
      console.error("Failed to update alt text:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update alt text"
      });
    }
  });

  /**
   * Get alt text suggestions for improvement
   * GET /api/images/:id/suggestions
   */
  router.get("/:id/suggestions", async (req, res) => {
    try {
      const userId = req.user!.id;
      const imageId = req.params.id;

      const imageMetadata = await storage.platform.ai.getImageMetadata(userId, imageId);
      if (!imageMetadata) {
        return res.status(404).json({
          success: false,
          error: "Image not found"
        });
      }

      const suggestions = await generateAltTextSuggestions(
        imageMetadata.altText || imageMetadata.generatedAlt || "",
        imageMetadata.imageUrl,
        imageMetadata.context || undefined
      );

      res.json({
        success: true,
        data: {
          currentAltText: imageMetadata.altText,
          suggestions
        }
      });
    } catch (error) {
      console.error("Failed to generate suggestions:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate suggestions"
      });
    }
  });

  /**
   * Check if an image is decorative
   * POST /api/images/check-decorative
   */
  router.post("/check-decorative", async (req, res) => {
    try {
      const { imageUrl, context } = req.body;

      const isDecorative = await checkIfDecorative(imageUrl, context);

      res.json({
        success: true,
        data: {
          isDecorative
        }
      });
    } catch (error) {
      console.error("Failed to check if decorative:", error);
      res.status(500).json({
        success: false,
        error: "Failed to check if image is decorative"
      });
    }
  });

  /**
   * Get accessibility report
   * GET /api/accessibility/report
   */
  router.get("/report", async (req, res) => {
    try {
      const userId = req.user!.id;
      const filters = accessibilityReportSchema.parse(req.query);

      const dateRange = filters.startDate && filters.endDate
        ? {
            start: new Date(filters.startDate),
            end: new Date(filters.endDate)
          }
        : undefined;

      const report = await storage.platform.ai.getAccessibilityReport(userId, {
        wcagLevel: filters.wcagLevel,
        minScore: filters.minScore,
        maxScore: filters.maxScore,
        dateRange
      });

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      console.error("Failed to generate accessibility report:", error);
      res.status(500).json({
        success: false,
        error: "Failed to generate accessibility report"
      });
    }
  });

  /**
   * Get all images with pagination and filters
   * GET /api/images
   */
  router.get("/", async (req, res) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const filters = {
        isDecorative: req.query.isDecorative === 'true' ? true : 
                     req.query.isDecorative === 'false' ? false : undefined,
        hasAltText: req.query.hasAltText === 'true' ? true : 
                   req.query.hasAltText === 'false' ? false : undefined,
        needsImprovement: req.query.needsImprovement === 'true'
      };

      const result = await storage.platform.ai.getImagesPaginated(userId, page, limit, filters);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Failed to get images:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get images"
      });
    }
  });

  /**
   * Get single image metadata
   * GET /api/images/:id
   */
  router.get("/:id", async (req, res) => {
    try {
      const userId = req.user!.id;
      const imageId = req.params.id;

      const imageMetadata = await storage.platform.ai.getImageMetadata(userId, imageId);
      if (!imageMetadata) {
        return res.status(404).json({
          success: false,
          error: "Image not found"
        });
      }

      const quality = await storage.platform.ai.getAltTextQuality(imageId);

      res.json({
        success: true,
        data: {
          image: imageMetadata,
          quality
        }
      });
    } catch (error) {
      console.error("Failed to get image:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get image"
      });
    }
  });

  /**
   * Delete image metadata
   * DELETE /api/images/:id
   */
  router.delete("/:id", async (req, res) => {
    try {
      const userId = req.user!.id;
      const imageId = req.params.id;

      await storage.platform.ai.deleteImageMetadata(userId, imageId);

      res.json({
        success: true,
        message: "Image metadata deleted successfully"
      });
    } catch (error) {
      console.error("Failed to delete image:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete image"
      });
    }
  });

  /**
   * Mark alt text quality as reviewed
   * POST /api/images/:id/review
   */
  router.post("/:id/review", async (req, res) => {
    try {
      const userId = req.user!.id;
      const imageId = req.params.id;
      const { notes } = req.body;

      const quality = await storage.platform.ai.reviewAltTextQuality(imageId, userId, notes);

      res.json({
        success: true,
        data: quality
      });
    } catch (error) {
      console.error("Failed to review alt text quality:", error);
      res.status(500).json({
        success: false,
        error: "Failed to review alt text quality"
      });
    }
  });

  return router;
}