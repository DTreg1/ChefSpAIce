/**
 * Image Processing Router
 * 
 * Provides endpoints for AI-powered image enhancement including:
 * - Background removal using Remove.bg API
 * - Smart cropping
 * - Quality enhancement
 * - Smart filters
 * - Batch processing
 */

import express from "express";
import multer from "multer";
import sharp from "sharp";
import axios from "axios";
import FormData from "form-data";
import { aiMlStorage, systemStorage } from "../storage/index";
import path from "path";
import fs from "fs/promises";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed."));
    }
  },
});

/**
 * Helper function to save uploaded file temporarily
 */
async function saveUploadedFile(file: Express.Multer.File): Promise<string> {
  const tempDir = "/tmp/image-uploads";
  await fs.mkdir(tempDir, { recursive: true });
  
  const filename = `${Date.now()}-${file.originalname}`;
  const filepath = path.join(tempDir, filename);
  
  await fs.writeFile(filepath, file.buffer);
  return filepath;
}

/**
 * Helper function to process image with Sharp
 */
async function processWithSharp(
  inputPath: string,
  operations: any
): Promise<{ buffer: Buffer; metadata: any }> {
  let image = sharp(inputPath);

  // Auto-enhance quality
  if (operations.qualityEnhancement) {
    image = image
      .normalize() // Enhance contrast
      .sharpen(); // Sharpen details
  }

  // Apply filters
  if (operations.filters && operations.filters.length > 0) {
    for (const filter of operations.filters) {
      switch (filter.type) {
        case "blur":
          image = image.blur(filter.intensity || 5);
          break;
        case "grayscale":
          image = image.grayscale();
          break;
        case "sepia":
          image = image.tint({ r: 112, g: 66, b: 20 });
          break;
        case "brightness":
          image = image.modulate({ brightness: 1 + (filter.intensity || 0) / 100 });
          break;
        case "contrast":
          image = image.linear(filter.intensity / 100 + 1, 0);
          break;
        case "saturation":
          image = image.modulate({ saturation: 1 + (filter.intensity || 0) / 100 });
          break;
      }
    }
  }

  // Apply color adjustments
  if (operations.colorAdjustments) {
    const adj = operations.colorAdjustments;
    if (adj.brightness || adj.saturation || adj.hue) {
      image = image.modulate({
        brightness: adj.brightness ? 1 + adj.brightness / 100 : 1,
        saturation: adj.saturation ? 1 + adj.saturation / 100 : 1,
        hue: adj.hue || 0,
      });
    }
    if (adj.contrast) {
      image = image.linear(adj.contrast / 100 + 1, 0);
    }
    if (adj.gamma) {
      image = image.gamma(adj.gamma);
    }
  }

  // Apply sharpening
  if (operations.sharpening) {
    const sharp = operations.sharpening;
    image = image.sharpen({
      sigma: sharp.radius || 1,
      m1: sharp.amount || 1,
      m2: sharp.threshold || 10,
    });
  }

  // Resize if specified
  if (operations.resize) {
    const { width, height, mode } = operations.resize;
    if (mode === "fit") {
      image = image.resize(width, height, { fit: "inside" });
    } else if (mode === "fill") {
      image = image.resize(width, height, { fit: "fill" });
    } else if (mode === "cover") {
      image = image.resize(width, height, { fit: "cover" });
    }
  }

  // Auto-crop to content
  if (operations.autoCrop) {
    image = image.trim();
  }

  // Format conversion
  const format = operations.format || "jpeg";
  const quality = operations.compression || 85;
  
  if (format === "jpeg" || format === "jpg") {
    image = image.jpeg({ quality });
  } else if (format === "png") {
    image = image.png({ compressionLevel: 9 });
  } else if (format === "webp") {
    image = image.webp({ quality });
  }

  const buffer = await image.toBuffer();
  const metadata = await sharp(buffer).metadata();

  return { buffer, metadata };
}

/**
 * Helper to call Remove.bg API
 */
async function removeBackground(imagePath: string, apiKey: string): Promise<Buffer> {
  const formData = new FormData();
  const imageBuffer = await fs.readFile(imagePath);
  
  formData.append("image_file", imageBuffer, {
    filename: "image.jpg",
    contentType: "image/jpeg",
  });
  formData.append("size", "auto");

  try {
    const response = await axios.post(
      "https://api.remove.bg/v1.0/removebg",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "X-Api-Key": apiKey,
        },
        responseType: "arraybuffer",
      }
    );

    return Buffer.from(response.data);
  } catch (error: any) {
    console.error("Remove.bg API error:", error.response?.data || error.message);
    throw new Error("Failed to remove background");
  }
}

/**
 * POST /api/images/enhance
 * Auto-enhance image with AI
 */
router.post("/enhance", upload.single("image"), async (req: any, res: any) => {
  let job: any;
  try {
  const userId = req.session?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No image file provided" });
  }

  const operations = req.body.operations || {
    qualityEnhancement: true,
    autoCrop: false,
    format: "jpeg",
    compression: 85,
  };

  // Save uploaded file
  const inputPath = await saveUploadedFile(req.file);
  
  // Create processing job
  job = await storage.createImageProcessingJob({
    userId,
    originalUrl: inputPath,
    operations,
    status: "processing",
    originalFileSize: req.file.size,
  });

  const startTime = Date.now();

    // Process image with Sharp
    const { buffer, metadata } = await processWithSharp(inputPath, operations);

    // Save processed image
    const outputPath = inputPath.replace(/\.[^.]+$/, `-enhanced.${operations.format || "jpg"}`);
    await fs.writeFile(outputPath, buffer);

    // Update job with results
    await storage.updateImageProcessingJob(job.id, {
      processedUrl: outputPath,
      processedFileSize: buffer.length,
      processingTime: Date.now() - startTime,
      status: "completed",
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        colorSpace: metadata.space,
        hasTransparency: metadata.hasAlpha,
      },
    });

    // Clean up original file
    await fs.unlink(inputPath).catch(() => {});

    res.json({
      success: true,
      jobId: job.id,
      processedUrl: outputPath,
      processingTime: Date.now() - startTime,
      originalSize: req.file.size,
      processedSize: buffer.length,
      compressionRatio: ((1 - buffer.length / req.file.size) * 100).toFixed(1) + "%",
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      },
    });
  } catch (error: any) {
    console.error("Image processing error:", error);
    // Update job status to failed
    if (job) {
      await storage.updateImageProcessingJob(job.id, {
        status: "failed",
        errorMessage: error.message,
      });
    }
    res.status(500).json({ error: error.message || "Failed to process image" });
  }
});

/**
 * POST /api/images/background
 * Remove background using Remove.bg API
 */
router.post("/background", upload.single("image"), async (req: any, res: any) => {
  let job: any;
  try {
  const userId = req.session?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No image file provided" });
  }

  const apiKey = process.env.REMOVEBG_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: "Remove.bg API key not configured. Please set REMOVEBG_API_KEY environment variable." 
    });
  }

  // Save uploaded file
  const inputPath = await saveUploadedFile(req.file);
  
  // Create processing job
  job = await storage.createImageProcessingJob({
    userId,
    originalUrl: inputPath,
    operations: { backgroundRemoval: true },
    status: "processing",
    originalFileSize: req.file.size,
  });

  const startTime = Date.now();

    // Remove background using Remove.bg API
    const processedBuffer = await removeBackground(inputPath, apiKey);

    // Save processed image
    const outputPath = inputPath.replace(/\.[^.]+$/, "-no-bg.png");
    await fs.writeFile(outputPath, processedBuffer);

    // Get metadata of processed image
    const metadata = await sharp(processedBuffer).metadata();

    // Update job with results
    await storage.updateImageProcessingJob(job.id, {
      processedUrl: outputPath,
      processedFileSize: processedBuffer.length,
      processingTime: Date.now() - startTime,
      status: "completed",
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        hasTransparency: true,
      },
    });

    // Clean up original file
    await fs.unlink(inputPath).catch(() => {});

    res.json({
      success: true,
      jobId: job.id,
      processedUrl: outputPath,
      processingTime: Date.now() - startTime,
      originalSize: req.file.size,
      processedSize: processedBuffer.length,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        hasTransparency: true,
      },
    });
  } catch (error: any) {
    console.error("Image processing error:", error);
    // Update job status to failed
    if (job) {
      await storage.updateImageProcessingJob(job.id, {
        status: "failed",
        errorMessage: error.message,
      });
    }
    res.status(500).json({ error: error.message || "Failed to process image" });
  }
});

/**
 * POST /api/images/crop
 * Smart crop to subject
 */
router.post("/crop", upload.single("image"), async (req: any, res: any) => {
  let job: any;
  try {
  const userId = req.session?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No image file provided" });
  }

  const { x, y, width, height } = req.body;
  
  // Save uploaded file
  const inputPath = await saveUploadedFile(req.file);
  
  // Create processing job
  job = await storage.createImageProcessingJob({
    userId,
    originalUrl: inputPath,
    operations: { autoCrop: true },
    status: "processing",
    originalFileSize: req.file.size,
  });

  const startTime = Date.now();

    let image = sharp(inputPath);

    if (x !== undefined && y !== undefined && width && height) {
      // Manual crop with specified coordinates
      image = image.extract({
        left: parseInt(x),
        top: parseInt(y),
        width: parseInt(width),
        height: parseInt(height),
      });
    } else {
      // Auto-crop to remove empty space
      image = image.trim();
    }

    const buffer = await image.toBuffer();
    const metadata = await sharp(buffer).metadata();

    // Save processed image
    const outputPath = inputPath.replace(/\.[^.]+$/, "-cropped.jpg");
    await fs.writeFile(outputPath, buffer);

    // Update job with results
    await storage.updateImageProcessingJob(job.id, {
      processedUrl: outputPath,
      processedFileSize: buffer.length,
      processingTime: Date.now() - startTime,
      status: "completed",
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      },
    });

    // Clean up original file
    await fs.unlink(inputPath).catch(() => {});

    res.json({
      success: true,
      jobId: job.id,
      processedUrl: outputPath,
      processingTime: Date.now() - startTime,
      originalSize: req.file.size,
      processedSize: buffer.length,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      },
    });
  } catch (error: any) {
    console.error("Image processing error:", error);
    // Update job status to failed
    if (job) {
      await storage.updateImageProcessingJob(job.id, {
        status: "failed",
        errorMessage: error.message,
      });
    }
    res.status(500).json({ error: error.message || "Failed to process image" });
  }
});

/**
 * POST /api/images/batch
 * Batch process multiple images
 */
router.post("/batch", upload.array("images", 10), async (req: any, res: any) => {
  try {
  const userId = req.session?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No image files provided" });
  }

  const operations = req.body.operations || {
    qualityEnhancement: true,
    format: "jpeg",
    compression: 85,
  };

  const results = [];

  for (const file of files) {
    // Save uploaded file
    const inputPath = await saveUploadedFile(file);
    
    // Create processing job
    const job = await storage.createImageProcessingJob({
      userId,
      originalUrl: inputPath,
      operations,
      status: "processing",
      originalFileSize: file.size,
    });

    try {
      const startTime = Date.now();

      // Process image with Sharp
      const { buffer, metadata } = await processWithSharp(inputPath, operations);

      // Save processed image
      const outputPath = inputPath.replace(/\.[^.]+$/, `-processed.${operations.format || "jpg"}`);
      await fs.writeFile(outputPath, buffer);

      // Update job with results
      await storage.updateImageProcessingJob(job.id, {
        processedUrl: outputPath,
        processedFileSize: buffer.length,
        processingTime: Date.now() - startTime,
        status: "completed",
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
        },
      });

      // Clean up original file
      await fs.unlink(inputPath).catch(() => {});

      results.push({
        success: true,
        jobId: job.id,
        originalName: file.originalname,
        processedUrl: outputPath,
        processingTime: Date.now() - startTime,
        originalSize: file.size,
        processedSize: buffer.length,
      });
    } catch (error: any) {
      await storage.updateImageProcessingJob(job.id, {
        status: "failed",
        errorMessage: error.message,
      });

      results.push({
        success: false,
        originalName: file.originalname,
        error: error.message,
      });
    }
  }

  res.json({
    totalFiles: files.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  });
  } catch (error: any) {
    console.error("Batch processing error:", error);
    res.status(500).json({ error: error.message || "Failed to process batch" });
  }
});

/**
 * GET /api/images/presets
 * Get enhancement presets
 */
router.get("/presets", async (req: any, res: any) => {
  try {
  const userId = req.session?.user?.id;
  const { category } = req.query;

  const presets = await storage.getImagePresets(userId, category);

  // Add default system presets if none exist
  if (presets.length === 0) {
    const defaultPresets = [
      {
        userId: null,
        name: "Product Photo",
        description: "Clean white background, enhanced colors, sharp details",
        category: "product" as const,
        isPublic: true,
        operations: {
          backgroundRemoval: true,
          qualityEnhancement: true,
          autoCrop: true,
          format: "jpeg",
          compression: 90,
          colorAdjustments: {
            brightness: 10,
            contrast: 15,
            saturation: 20,
          },
          sharpening: {
            radius: 1,
            amount: 1.5,
            threshold: 5,
          },
        },
      },
      {
        userId: null,
        name: "Portrait Enhancement",
        description: "Soft skin, enhanced colors, background blur",
        category: "portrait" as const,
        isPublic: true,
        operations: {
          qualityEnhancement: true,
          format: "jpeg",
          compression: 85,
          colorAdjustments: {
            brightness: 5,
            contrast: 10,
            saturation: 15,
          },
          filters: [
            { type: "blur", intensity: 2 },
          ],
        },
      },
      {
        userId: null,
        name: "Social Media",
        description: "Optimized for web, vibrant colors, compressed size",
        category: "social_media" as const,
        isPublic: true,
        operations: {
          qualityEnhancement: true,
          resize: {
            width: 1080,
            height: 1080,
            mode: "cover",
          },
          format: "jpeg",
          compression: 75,
          colorAdjustments: {
            brightness: 10,
            contrast: 20,
            saturation: 30,
          },
        },
      },
    ];

    // Create default presets
    for (const preset of defaultPresets) {
      await storage.createImagePreset(preset);
    }

    // Fetch again with defaults
    return res.json(await storage.getImagePresets(userId, category));
  }

  res.json(presets);
  } catch (error: any) {
    console.error("Presets error:", error);
    res.status(500).json({ error: error.message || "Failed to get presets" });
  }
});

/**
 * POST /api/images/presets
 * Create custom preset
 */
router.post("/presets", async (req: any, res: any) => {
  try {
  const userId = req.session?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const { name, description, operations, category, isPublic } = req.body;

  if (!name || !operations) {
    return res.status(400).json({ error: "Name and operations are required" });
  }

  const preset = await storage.createImagePreset({
    userId,
    name,
    description,
    operations,
    category: category || "custom",
    isPublic: isPublic || false,
  });

  res.json(preset);
  } catch (error: any) {
    console.error("Create preset error:", error);
    res.status(500).json({ error: error.message || "Failed to create preset" });
  }
});

/**
 * GET /api/images/jobs
 * Get user's processing jobs
 */
router.get("/jobs", async (req: any, res: any) => {
  try {
  const userId = req.session?.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const { status } = req.query;
  const jobs = await storage.getImageProcessingJobs(userId, status);

  res.json(jobs);
  } catch (error: any) {
    console.error("Get jobs error:", error);
    res.status(500).json({ error: error.message || "Failed to get jobs" });
  }
});

/**
 * GET /api/images/jobs/:id
 * Get specific job details
 */
router.get("/jobs/:id", async (req: any, res: any) => {
  try {
  const { id } = req.params;
  const job = await storage.getImageProcessingJob(id);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  res.json(job);
  } catch (error: any) {
    console.error("Get job error:", error);
    res.status(500).json({ error: error.message || "Failed to get job" });
  }
});

export default router;