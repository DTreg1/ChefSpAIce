/**
 * Face Detection Router
 * 
 * Provides endpoints for AI-powered face detection using TensorFlow.js BlazeFace model:
 * - Detect faces in images with bounding boxes
 * - Blur faces for privacy protection
 * - Crop individual faces for avatar extraction
 * - Count faces in group photos
 * - Manage privacy settings and anonymization
 */

import express from "express";
import multer from "multer";
import { storage } from "../storage";
import { FaceDetectionService } from "../services/faceDetection.service";

const router = express.Router();

// Initialize face detection service
const faceDetectionService = new FaceDetectionService();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed."));
    }
  },
});

/**
 * POST /api/faces/detect
 * Detect faces in an uploaded image
 */
router.post("/detect", upload.single("image"), async (req: any, res: any) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Initialize the model if not already done
    await faceDetectionService.loadModel();

    // Detect faces in the image
    const detections = await faceDetectionService.detectFaces(req.file.buffer);

    // Save detection results to database
    const detectionRecord = await storage.createFaceDetection(userId, {
      imageId: `upload_${Date.now()}`,
      imageUrl: req.body.imageUrl || "",
      detectionCount: detections.length,
      faceData: detections,
      processingTime: 0, // Will be calculated
      isBlurred: false,
    });

    res.json({
      success: true,
      detectionId: detectionRecord.id,
      faceCount: detections.length,
      detections: detections.map((face: any) => ({
        boundingBox: {
          x: face.topLeft[0],
          y: face.topLeft[1],
          width: face.bottomRight[0] - face.topLeft[0],
          height: face.bottomRight[1] - face.topLeft[1],
        },
        probability: face.probability,
        landmarks: face.landmarks || [],
      })),
    });
  } catch (error: any) {
    console.error("Face detection error:", error);
    res.status(500).json({ error: error.message || "Failed to detect faces" });
  }
});

/**
 * POST /api/faces/blur
 * Blur faces in an image for privacy
 */
router.post("/blur", upload.single("image"), async (req: any, res: any) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const blurIntensity = parseInt(req.body.blurIntensity) || 10;
    const excludeIndexes = req.body.excludeIndexes 
      ? JSON.parse(req.body.excludeIndexes) 
      : [];

    // Initialize the model if not already done
    await faceDetectionService.loadModel();

    // Blur faces in the image
    const blurredImage = await faceDetectionService.blurFaces(
      req.file.buffer,
      blurIntensity,
      excludeIndexes
    );

    // Create a data URL for the blurred image
    const base64Image = blurredImage.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    // Save blur operation to database
    const detectionRecord = await storage.createFaceDetection(userId, {
      imageId: `blur_${Date.now()}`,
      imageUrl: req.body.originalImageUrl || "",
      detectionCount: 0, // Will be updated
      faceData: [],
      processingTime: 0,
      isBlurred: true,
      blurIntensity,
    });

    res.json({
      success: true,
      detectionId: detectionRecord.id,
      blurredImageUrl: dataUrl,
      blurIntensity,
      excludedFaces: excludeIndexes,
    });
  } catch (error: any) {
    console.error("Face blur error:", error);
    res.status(500).json({ error: error.message || "Failed to blur faces" });
  }
});

/**
 * POST /api/faces/crop
 * Crop individual faces from a group photo
 */
router.post("/crop", upload.single("image"), async (req: any, res: any) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const faceIndex = req.body.faceIndex !== undefined 
      ? parseInt(req.body.faceIndex) 
      : undefined;
    const padding = parseInt(req.body.padding) || 20;

    // Initialize the model if not already done
    await faceDetectionService.loadModel();

    // Crop faces from the image
    const croppedFaces = await faceDetectionService.cropFaces(
      req.file.buffer,
      faceIndex,
      padding
    );

    // Convert cropped faces to data URLs
    const croppedFaceUrls = croppedFaces.map(face => {
      const base64Image = face.toString('base64');
      return `data:image/png;base64,${base64Image}`;
    });

    // Save crop operation to database
    for (let i = 0; i < croppedFaceUrls.length; i++) {
      await storage.createFaceDetection(userId, {
        imageId: `crop_${Date.now()}_${i}`,
        imageUrl: croppedFaceUrls[i],
        detectionCount: 1,
        faceData: [],
        processingTime: 0,
        isBlurred: false,
      });
    }

    res.json({
      success: true,
      faceCount: croppedFaceUrls.length,
      croppedFaces: croppedFaceUrls.map((url, index) => ({
        index,
        imageUrl: url,
        width: 0, // Will be calculated from actual image
        height: 0,
      })),
    });
  } catch (error: any) {
    console.error("Face crop error:", error);
    res.status(500).json({ error: error.message || "Failed to crop faces" });
  }
});

/**
 * GET /api/faces/count
 * Count faces in an image
 */
router.post("/count", upload.single("image"), async (req: any, res: any) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // Initialize the model if not already done
    await faceDetectionService.loadModel();

    // Count faces in the image
    const count = await faceDetectionService.countFaces(req.file.buffer);

    // Save count operation to database
    const detectionRecord = await storage.createFaceDetection(userId, {
      imageId: `count_${Date.now()}`,
      imageUrl: req.body.imageUrl || "",
      detectionCount: count,
      faceData: [],
      processingTime: 0,
      isBlurred: false,
    });

    res.json({
      success: true,
      detectionId: detectionRecord.id,
      faceCount: count,
      message: count === 0 
        ? "No faces detected" 
        : `${count} face${count > 1 ? 's' : ''} detected`,
    });
  } catch (error: any) {
    console.error("Face count error:", error);
    res.status(500).json({ error: error.message || "Failed to count faces" });
  }
});

/**
 * GET /api/faces/privacy-settings
 * Get user's privacy settings
 */
router.get("/privacy-settings", async (req: any, res: any) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const settings = await storage.getPrivacySettings(userId);

    if (!settings) {
      // Return default settings if none exist
      return res.json({
        autoBlur: false,
        blurIntensity: 10,
        saveOriginals: true,
        sharePermission: "private",
        retentionDays: 30,
      });
    }

    res.json(settings);
  } catch (error: any) {
    console.error("Privacy settings error:", error);
    res.status(500).json({ error: error.message || "Failed to get privacy settings" });
  }
});

/**
 * POST /api/faces/privacy-settings
 * Update user's privacy settings
 */
router.post("/privacy-settings", async (req: any, res: any) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { autoBlur, blurIntensity, saveOriginals, sharePermission, retentionDays } = req.body;

    const settings = await storage.upsertPrivacySettings(userId, {
      autoBlur: autoBlur ?? false,
      blurIntensity: blurIntensity ?? 10,
      saveOriginals: saveOriginals ?? true,
      sharePermission: sharePermission ?? "private",
      retentionDays: retentionDays ?? 30,
    });

    res.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error("Privacy settings error:", error);
    res.status(500).json({ error: error.message || "Failed to update privacy settings" });
  }
});

/**
 * GET /api/faces/history
 * Get user's face detection history
 */
router.get("/history", async (req: any, res: any) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const detections = await storage.getFaceDetections(userId, limit);

    res.json({
      success: true,
      detections: detections.map(d => ({
        id: d.id,
        imageId: d.imageId,
        imageUrl: d.imageUrl,
        faceCount: d.detectionCount,
        isBlurred: d.isBlurred,
        createdAt: d.createdAt,
      })),
      total: detections.length,
    });
  } catch (error: any) {
    console.error("History error:", error);
    res.status(500).json({ error: error.message || "Failed to get history" });
  }
});

/**
 * DELETE /api/faces/history/:id
 * Delete a face detection record
 */
router.delete("/history/:id", async (req: any, res: any) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const detectionId = req.params.id;
    await storage.deleteFaceDetection(userId, detectionId);

    res.json({
      success: true,
      message: "Detection record deleted",
    });
  } catch (error: any) {
    console.error("Delete error:", error);
    res.status(500).json({ error: error.message || "Failed to delete record" });
  }
});

/**
 * POST /api/faces/cleanup
 * Clean up old face detection records based on retention policy
 */
router.post("/cleanup", async (req: any, res: any) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get user's privacy settings
    const settings = await storage.getPrivacySettings(userId);
    const retentionDays = settings?.retentionDays || 30;

    // Clean up old records
    const deletedCount = await storage.cleanupOldFaceDetections(userId, retentionDays);

    res.json({
      success: true,
      deletedCount,
      message: `Cleaned up ${deletedCount} old face detection records`,
    });
  } catch (error: any) {
    console.error("Cleanup error:", error);
    res.status(500).json({ error: error.message || "Failed to cleanup records" });
  }
});

export default router;