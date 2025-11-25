/**
 * Consolidated AI Media Router
 * 
 * Unified router for all AI media processing services including:
 * - Image processing (enhancement, background removal, cropping)
 * - Vision services (OCR, face detection, alt-text generation)
 * - Voice/audio services (transcription, voice commands)
 * 
 * Base path: /api/ai/media
 * 
 * Sub-routes:
 * - /images/* - Image processing
 * - /vision/* - OCR, face detection, alt-text
 * - /voice/* - Audio transcription and voice commands
 * 
 * @module server/routers/ai/media.router
 */

import { Router, Request, Response } from "express";
import { isAuthenticated, getAuthenticatedUserId } from "../../middleware/auth.middleware";
import { storage } from "../../storage/index";
import { z } from "zod";
import multer from "multer";
import sharp from "sharp";
import axios from "axios";
import FormData from "form-data";
import Tesseract from "tesseract.js";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";
import os from "os";
import { getOpenAIClient } from "../../config/openai-config";
import { faceDetectionService } from "../../services/faceDetection.service";
import { generateAltText, analyzeAltTextQuality, generateAltTextSuggestions } from "../../services/alt-text-generator";
import { rateLimiters } from "../../middleware/rate-limit.middleware";
import { circuitBreakers, executeWithBreaker } from "../../middleware/circuit-breaker.middleware";
import {
  AIError,
  handleOpenAIError,
  createErrorResponse,
} from "../../utils/ai-error-handler";
import { getCircuitBreaker } from "../../utils/circuit-breaker";

const router = Router();

const openai = getOpenAIClient();

const openaiVisionBreaker = circuitBreakers.openaiVision;
const openaiVoiceBreaker = getCircuitBreaker("openai-voice");

// ==================== MULTER CONFIGURATIONS ====================

const imageUpload = multer({
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/tiff",
      "image/bmp",
      "application/pdf"
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images and PDF files are allowed."));
    }
  },
});

const audioUpload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "audio/webm",
      "audio/mp4",
      "audio/m4a",
      "audio/flac",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only audio files are allowed."));
    }
  },
});

// ==================== VALIDATION SCHEMAS ====================

const generateAltTextSchema = z.object({
  imageUrl: z.string().url(),
  context: z.string().optional(),
  saveToDb: z.boolean().optional().default(true)
});

const bulkAltTextSchema = z.object({
  images: z.array(z.object({
    id: z.string().optional(),
    url: z.string().url(),
    context: z.string().optional()
  })).min(1).max(10)
});

const updateAltTextSchema = z.object({
  altText: z.string(),
  isDecorative: z.boolean().optional(),
  title: z.string().optional()
});

const faceBlurSchema = z.object({
  blurIntensity: z.number().min(1).max(20).default(10),
  excludeIndexes: z.array(z.number()).optional(),
});

const transcribeSchema = z.object({
  language: z.string().optional(),
  prompt: z.string().optional(),
  title: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
});

const voiceCommandSchema = z.object({
  command: z.string().min(1).max(500),
  context: z.object({
    currentPage: z.string().optional(),
    selectedItems: z.array(z.string()).optional(),
    userPreferences: z.record(z.any()).optional(),
  }).optional(),
});

const editTranscriptSchema = z.object({
  editedTranscript: z.string(),
  editReason: z.string().optional(),
});

const exportFormatSchema = z.enum(['txt', 'srt', 'vtt', 'json']);

// Supported OCR languages
const SUPPORTED_LANGUAGES = [
  { code: "eng", name: "English" },
  { code: "spa", name: "Spanish" },
  { code: "fra", name: "French" },
  { code: "deu", name: "German" },
  { code: "ita", name: "Italian" },
  { code: "por", name: "Portuguese" },
  { code: "rus", name: "Russian" },
  { code: "jpn", name: "Japanese" },
  { code: "chi_sim", name: "Chinese (Simplified)" },
  { code: "chi_tra", name: "Chinese (Traditional)" },
  { code: "kor", name: "Korean" },
  { code: "ara", name: "Arabic" },
  { code: "hin", name: "Hindi" },
];

// ==================== HELPER FUNCTIONS ====================

function determineEditType(editReason?: string): "spelling" | "punctuation" | "speaker" | "content" | "other" {
  if (!editReason) return "content";
  
  const lowerReason = editReason.toLowerCase();
  if (lowerReason.includes("spell") || lowerReason.includes("typo")) return "spelling";
  if (lowerReason.includes("punctuat") || lowerReason.includes("comma") || lowerReason.includes("period")) return "punctuation";
  if (lowerReason.includes("speaker") || lowerReason.includes("attribution")) return "speaker";
  if (lowerReason.includes("content") || lowerReason.includes("meaning") || lowerReason.includes("correction")) return "content";
  
  return "other";
}

async function saveUploadedFile(file: Express.Multer.File): Promise<string> {
  const tempDir = "/tmp/image-uploads";
  await fs.mkdir(tempDir, { recursive: true });
  
  const filename = `${Date.now()}-${file.originalname}`;
  const filepath = path.join(tempDir, filename);
  
  await fs.writeFile(filepath, file.buffer);
  return filepath;
}

async function processWithSharp(
  inputPath: string,
  operations: any
): Promise<{ buffer: Buffer; metadata: any }> {
  let image = sharp(inputPath);

  if (operations.qualityEnhancement) {
    image = image
      .normalize()
      .sharpen();
  }

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

  if (operations.sharpening) {
    const sharpOpts = operations.sharpening;
    image = image.sharpen({
      sigma: sharpOpts.radius || 1,
      m1: sharpOpts.amount || 1,
      m2: sharpOpts.threshold || 10,
    });
  }

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

  if (operations.autoCrop) {
    image = image.trim();
  }

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

async function extractTextFromImage(imageBuffer: Buffer, language: string) {
  try {
    const result = await Tesseract.recognize(imageBuffer, language, {
      logger: (m) => console.log(m.status),
    });
    
    return {
      text: result.data.text,
      confidence: result.data.confidence,
      boundingBoxes: ((result.data as any).words || []).map((word: any) => ({
        text: word.text,
        bbox: word.bbox,
        confidence: word.confidence,
      })),
    };
  } catch (error) {
    console.error("OCR error:", error);
    throw new Error("Failed to extract text from image");
  }
}

function parseReceiptData(text: string) {
  const lines = text.split('\n').filter(line => line.trim());
  const receipt: any = {
    items: [],
    total: null,
    date: null,
    merchant: null,
  };
  
  lines.forEach(line => {
    if (/total|amount|due/i.test(line)) {
      const match = line.match(/[\d,]+\.?\d*/);
      if (match) {
        receipt.total = parseFloat(match[0].replace(',', ''));
      }
    }
    
    const dateMatch = line.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
    if (dateMatch) {
      receipt.date = dateMatch[0];
    }
    
    const itemMatch = line.match(/^(.+?)\s+([\d,]+\.?\d*)$/);
    if (itemMatch && !(/total|tax|subtotal/i.test(itemMatch[1]))) {
      receipt.items.push({
        name: itemMatch[1].trim(),
        price: parseFloat(itemMatch[2].replace(',', '')),
      });
    }
  });
  
  if (lines.length > 0) {
    receipt.merchant = lines[0];
  }
  
  return receipt;
}

async function interpretVoiceCommand(
  command: string,
  context?: any
): Promise<any> {
  if (!openai) {
    throw new Error("OpenAI not configured");
  }

  const prompt = `Interpret this voice command for a kitchen management app:

Command: "${command}"
${context ? `Context: ${JSON.stringify(context)}` : ''}

Determine the user's intent and provide:
1. Action type (e.g., add_item, search_recipe, set_timer, create_list, etc.)
2. Parameters for the action
3. Confidence level (0-1)
4. Alternative interpretations if ambiguous

Common actions:
- Add items to inventory/shopping list
- Search for recipes
- Set cooking timers
- Create meal plans
- Ask cooking questions

Format as JSON with fields: action, parameters, confidence, alternatives.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  return JSON.parse(completion.choices[0]?.message?.content || "{}");
}

function formatTranscript(transcript: string, format: string, metadata?: any): string {
  switch (format) {
    case 'txt':
      return transcript;
      
    case 'srt':
      const lines = transcript.split('. ');
      return lines.map((line, index) => 
        `${index + 1}\n00:00:${String(index * 5).padStart(2, '0')},000 --> 00:00:${String((index + 1) * 5).padStart(2, '0')},000\n${line.trim()}\n`
      ).join('\n');
      
    case 'vtt':
      const vttLines = transcript.split('. ');
      return `WEBVTT\n\n` + vttLines.map((line, index) => 
        `00:00:${String(index * 5).padStart(2, '0')}.000 --> 00:00:${String((index + 1) * 5).padStart(2, '0')}.000\n${line.trim()}\n`
      ).join('\n');
      
    case 'json':
      return JSON.stringify({
        transcript,
        metadata,
        segments: transcript.split('. ').map((line, index) => ({
          text: line.trim(),
          start: index * 5,
          end: (index + 1) * 5,
        })),
      }, null, 2);
      
    default:
      return transcript;
  }
}

function checkOpenAIConfiguration(res: Response): boolean {
  if (!openai) {
    res.status(503).json({ 
      error: "AI service not configured",
      message: "OpenAI API key is required for this feature."
    });
    return false;
  }
  return true;
}

// ==================== IMAGE PROCESSING ENDPOINTS ====================

/**
 * POST /api/ai/media/images/enhance
 * Auto-enhance image with AI
 */
router.post("/images/enhance", imageUpload.single("image"), async (req: any, res: any) => {
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

    const inputPath = await saveUploadedFile(req.file);
    
    job = await storage.createImageProcessingJob({
      userId,
      originalUrl: inputPath,
      operations,
      status: "processing",
      originalFileSize: req.file.size,
    });

    const startTime = Date.now();

    const { buffer, metadata } = await processWithSharp(inputPath, operations);

    const outputPath = inputPath.replace(/\.[^.]+$/, `-enhanced.${operations.format || "jpg"}`);
    await fs.writeFile(outputPath, buffer);

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
 * POST /api/ai/media/images/background
 * Remove background using Remove.bg API
 */
router.post("/images/background", imageUpload.single("image"), async (req: any, res: any) => {
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

    const inputPath = await saveUploadedFile(req.file);
    
    job = await storage.createImageProcessingJob({
      userId,
      originalUrl: inputPath,
      operations: { backgroundRemoval: true },
      status: "processing",
      originalFileSize: req.file.size,
    });

    const startTime = Date.now();

    const processedBuffer = await removeBackground(inputPath, apiKey);

    const outputPath = inputPath.replace(/\.[^.]+$/, "-no-bg.png");
    await fs.writeFile(outputPath, processedBuffer);

    const metadata = await sharp(processedBuffer).metadata();

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
 * POST /api/ai/media/images/crop
 * Smart crop to subject
 */
router.post("/images/crop", imageUpload.single("image"), async (req: any, res: any) => {
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
    
    const inputPath = await saveUploadedFile(req.file);
    
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
      image = image.extract({
        left: parseInt(x),
        top: parseInt(y),
        width: parseInt(width),
        height: parseInt(height),
      });
    } else {
      image = image.trim();
    }

    const buffer = await image.toBuffer();
    const metadata = await sharp(buffer).metadata();

    const outputPath = inputPath.replace(/\.[^.]+$/, "-cropped.jpg");
    await fs.writeFile(outputPath, buffer);

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
 * POST /api/ai/media/images/batch
 * Batch process multiple images
 */
router.post("/images/batch", imageUpload.array("images", 10), async (req: any, res: any) => {
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
      const inputPath = await saveUploadedFile(file);
      
      const job = await storage.createImageProcessingJob({
        userId,
        originalUrl: inputPath,
        operations,
        status: "processing",
        originalFileSize: file.size,
      });

      try {
        const startTime = Date.now();

        const { buffer, metadata } = await processWithSharp(inputPath, operations);

        const outputPath = inputPath.replace(/\.[^.]+$/, `-processed.${operations.format || "jpg"}`);
        await fs.writeFile(outputPath, buffer);

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
 * GET /api/ai/media/images/presets
 * Get enhancement presets
 */
router.get("/images/presets", async (req: any, res: any) => {
  try {
    const userId = req.session?.user?.id;
    const { category } = req.query;

    const presets = await storage.getImagePresets(userId, category);

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

      for (const preset of defaultPresets) {
        await storage.createImagePreset(preset);
      }

      return res.json(await storage.getImagePresets(userId, category));
    }

    res.json(presets);
  } catch (error: any) {
    console.error("Presets error:", error);
    res.status(500).json({ error: error.message || "Failed to get presets" });
  }
});

/**
 * POST /api/ai/media/images/presets
 * Create custom preset
 */
router.post("/images/presets", isAuthenticated, async (req: any, res: any) => {
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
 * GET /api/ai/media/images/jobs
 * Get user's processing jobs
 */
router.get("/images/jobs", isAuthenticated, async (req: any, res: any) => {
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
 * GET /api/ai/media/images/jobs/:id
 * Get specific job details
 */
router.get("/images/jobs/:id", async (req: any, res: any) => {
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

// ==================== VISION/OCR ENDPOINTS ====================

/**
 * POST /api/ai/media/vision/ocr/extract
 * Extract text from an image or PDF
 */
router.post("/vision/ocr/extract", isAuthenticated, imageUpload.single("image"), rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    
    const { language = "eng", parseReceipt = false } = req.body;
    const imageId = `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const startTime = Date.now();
    
    const extractionResult = await extractTextFromImage(req.file.buffer, language);
    const processingTime = Date.now() - startTime;
    
    let structuredData = null;
    if (parseReceipt === "true" || parseReceipt === true) {
      structuredData = parseReceiptData(extractionResult.text);
    }
    
    const ocrResult = await storage.platform.ai.createOcrResult(userId, {
      imageId,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      extractedText: extractionResult.text,
      confidence: extractionResult.confidence,
      language,
      processingTime,
      boundingBoxes: extractionResult.boundingBoxes,
      metadata: {
        ocrEngine: "tesseract.js",
        engineVersion: "4.0.0",
        structuredData,
      },
    });
    
    res.json({
      success: true,
      resultId: ocrResult.id,
      imageId,
      text: extractionResult.text,
      confidence: extractionResult.confidence,
      language,
      processingTime,
      boundingBoxes: extractionResult.boundingBoxes,
      structuredData,
    });
  } catch (error: any) {
    console.error("OCR extraction error:", error);
    res.status(500).json({ error: error.message || "Failed to extract text" });
  }
});

/**
 * GET /api/ai/media/vision/ocr/results
 * Get user's OCR result history
 */
router.get("/vision/ocr/results", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { limit = 10, offset = 0 } = req.query;
    
    const results = await storage.platform.ai.getUserOcrResults(
      userId,
      parseInt(limit as string),
      parseInt(offset as string)
    );
    
    res.json({
      success: true,
      results,
      metadata: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    console.error("Error fetching OCR results:", error);
    res.status(500).json({ error: "Failed to fetch OCR results" });
  }
});

/**
 * GET /api/ai/media/vision/ocr/languages
 * Get supported OCR languages
 */
router.get("/vision/ocr/languages", async (req: Request, res: Response) => {
  res.json({
    success: true,
    languages: SUPPORTED_LANGUAGES,
  });
});

// ==================== FACE DETECTION ENDPOINTS ====================

/**
 * POST /api/ai/media/vision/faces/detect
 * Detect faces in an image
 */
router.post("/vision/faces/detect", isAuthenticated, imageUpload.single("image"), rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    
    const { returnCoordinates = true, minConfidence = 0.5 } = req.body;
    
    const detectionResult = await faceDetectionService.detectFaces(req.file.buffer);
    
    const filteredFaces = detectionResult.faces.filter(
      (face: any) => face.confidence >= minConfidence
    );
    
    const detectionRecord = await storage.platform.ai.createFaceDetection(userId, {
      imageId: `face_${Date.now()}`,
      imageUrl: req.body.imageUrl || "",
      facesDetected: filteredFaces.length,
      faceCoordinates: returnCoordinates ? filteredFaces : [],
      processingType: "detect_only",
      metadata: {
        modelVersion: "blazeface",
        minConfidence,
      }
    });
    
    res.json({
      success: true,
      detectionId: detectionRecord.id,
      faceCount: filteredFaces.length,
      detections: returnCoordinates ? filteredFaces.map((face: any) => ({
        boundingBox: {
          x: face.x * detectionResult.imageWidth,
          y: face.y * detectionResult.imageHeight,
          width: face.width * detectionResult.imageWidth,
          height: face.height * detectionResult.imageHeight,
        },
        probability: face.confidence,
        landmarks: face.landmarks || [],
      })) : undefined,
    });
  } catch (error: any) {
    console.error("Face detection error:", error);
    res.status(500).json({ error: error.message || "Failed to detect faces" });
  }
});

/**
 * POST /api/ai/media/vision/faces/blur
 * Blur faces in an image for privacy
 */
router.post("/vision/faces/blur", isAuthenticated, imageUpload.single("image"), rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    
    const validation = faceBlurSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { blurIntensity, excludeIndexes = [] } = validation.data;
    
    const detectionResult = await faceDetectionService.detectFaces(req.file.buffer);
    
    const facesToBlur = detectionResult.faces.filter(
      (_: any, index: number) => !excludeIndexes.includes(index)
    );
    
    const blurredImage = await faceDetectionService.blurFaces(
      req.file.buffer,
      facesToBlur,
      blurIntensity
    );
    
    const base64Image = blurredImage.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;
    
    const detectionRecord = await storage.platform.ai.createFaceDetection(userId, {
      imageId: `blur_${Date.now()}`,
      imageUrl: req.body.originalImageUrl || "",
      facesDetected: facesToBlur.length,
      faceCoordinates: facesToBlur,
      processedImageUrl: dataUrl,
      processingType: "blur",
      metadata: {
        blurIntensity,
        excludedFaces: excludeIndexes,
        modelVersion: "blazeface"
      }
    });
    
    res.json({
      success: true,
      detectionId: detectionRecord.id,
      processedImage: dataUrl,
      facesBlurred: facesToBlur.length,
    });
  } catch (error: any) {
    console.error("Face blur error:", error);
    res.status(500).json({ error: error.message || "Failed to blur faces" });
  }
});

/**
 * GET /api/ai/media/vision/faces/privacy-settings
 * Get user's privacy settings
 */
router.get("/vision/faces/privacy-settings", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const settings = await storage.platform.ai.getPrivacySettings(userId);
    
    if (!settings) {
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
 * POST /api/ai/media/vision/faces/privacy-settings
 * Update user's privacy settings
 */
router.post("/vision/faces/privacy-settings", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { autoBlurFaces, blurIntensity, consentToProcessing, privacyMode, dataRetentionDays } = req.body;
    
    const settings = await storage.platform.ai.upsertPrivacySettings(userId, {
      autoBlurFaces: autoBlurFaces ?? false,
      blurIntensity: blurIntensity ?? 10,
      consentToProcessing: consentToProcessing ?? false,
      privacyMode: privacyMode ?? "balanced",
      dataRetentionDays: dataRetentionDays ?? 30,
    });
    
    res.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    console.error("Privacy settings update error:", error);
    res.status(500).json({ error: error.message || "Failed to update privacy settings" });
  }
});

// ==================== ALT TEXT ENDPOINTS ====================

/**
 * POST /api/ai/media/vision/alt-text
 * Generate alt text for an image
 */
router.post("/vision/alt-text", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const validation = generateAltTextSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { imageUrl, context, saveToDb } = validation.data;
    
    let imageMetadata = await storage.platform.ai.getImageMetadataByUrl(userId, imageUrl);
    
    const result = await generateAltText(imageUrl, context);
    
    if (saveToDb) {
      if (!imageMetadata) {
        imageMetadata = await storage.platform.ai.createImageMetadata(userId, {
          imageUrl,
          generatedAlt: result.altText,
          altText: result.altText,
          context,
          aiModel: "gpt-4o-vision",
          generatedAt: new Date(),
          confidence: result.confidence,
          objectsDetected: result.objectsDetected
        });
      } else {
        imageMetadata = await storage.platform.ai.updateImageMetadata(userId, imageMetadata.id, {
          generatedAlt: result.altText,
          altText: imageMetadata.altText || result.altText,
          aiModel: "gpt-4o-vision",
          generatedAt: new Date(),
          confidence: result.confidence,
          objectsDetected: result.objectsDetected
        });
      }
      
      const quality = await analyzeAltTextQuality(
        result.altText,
        imageUrl,
        context
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
    const aiError = handleOpenAIError(error as Error);
    res.status(aiError.statusCode).json(createErrorResponse(aiError));
  }
});

/**
 * POST /api/ai/media/vision/alt-text/bulk
 * Batch process multiple images for alt text
 */
router.post("/vision/alt-text/bulk", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const validation = bulkAltTextSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { images } = validation.data;
    const results = [];
    const errors = [];
    
    for (const image of images) {
      try {
        const result = await generateAltText(image.url, image.context);
        
        const imageMetadata = await storage.platform.ai.createImageMetadata(userId, {
          imageUrl: image.url,
          generatedAlt: result.altText,
          altText: result.altText,
          context: image.context,
          aiModel: "gpt-4o-vision",
          generatedAt: new Date(),
          confidence: result.confidence,
          objectsDetected: result.objectsDetected
        });
        
        results.push({
          imageId: imageMetadata.id,
          url: image.url,
          altText: result.altText,
          confidence: result.confidence,
          status: 'success'
        });
      } catch (error: any) {
        errors.push({
          url: image.url,
          error: error.message || 'Failed to generate alt text',
          status: 'failed'
        });
      }
    }
    
    res.json({
      success: true,
      processed: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error("Bulk alt text generation error:", error);
    const aiError = handleOpenAIError(error as Error);
    res.status(aiError.statusCode).json(createErrorResponse(aiError));
  }
});

/**
 * PUT /api/ai/media/vision/alt-text/:id
 * Update alt text for an image
 */
router.put("/vision/alt-text/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const imageId = req.params.id;
    const validation = updateAltTextSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { altText, isDecorative, title } = validation.data;
    
    const imageMetadata = await storage.platform.ai.updateImageMetadata(userId, imageId, {
      altText,
      isDecorative,
      title
    });
    
    const quality = await analyzeAltTextQuality(
      altText,
      imageMetadata.imageUrl,
      imageMetadata.context || undefined
    );
    
    await storage.platform.ai.upsertAltTextQuality(imageId, quality);
    
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
 * GET /api/ai/media/vision/alt-text/:id/suggestions
 * Get alt text suggestions for improvement
 */
router.get("/vision/alt-text/:id/suggestions", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
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
    const aiError = handleOpenAIError(error as Error);
    res.status(aiError.statusCode).json(createErrorResponse(aiError));
  }
});

// ==================== VOICE/AUDIO ENDPOINTS ====================

/**
 * POST /api/ai/media/voice/transcribe
 * Transcribe an uploaded audio file using OpenAI Whisper
 */
router.post("/voice/transcribe", isAuthenticated, audioUpload.single("audio"), rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!checkOpenAIConfiguration(res)) return;
    
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }
    
    const validation = transcribeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { language, prompt, title, temperature = 0 } = validation.data;
    
    const audioFile = fsSync.createReadStream(req.file.path) as any;
    audioFile.name = req.file.originalname;
    
    try {
      const transcription = await openaiVoiceBreaker.execute(async () => {
        return await openai!.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
          language: language || undefined,
          prompt: prompt || undefined,
          response_format: "verbose_json",
          temperature,
        });
      });
      
      fsSync.unlinkSync(req.file.path);
      
      const savedTranscription = await storage.platform.ai.createTranscription(userId, {
        audioUrl: `/uploads/audio/${req.file.filename}`,
        transcript: transcription.text,
        language: transcription.language || language || "en",
        duration: transcription.duration || 0,
        status: "completed",
        segments: transcription.segments?.map((seg: any, idx: number) => ({
          id: `seg_${idx}`,
          start: seg.start || 0,
          end: seg.end || 0,
          text: seg.text || '',
          confidence: seg.confidence,
          speaker: seg.speaker,
        })) || [],
        metadata: {
          title: title || `Transcription from ${new Date().toLocaleDateString()}`,
          audioFormat: req.file.mimetype,
          processingTime: Date.now() - (req.body.startTime || Date.now()),
        },
      });
      
      res.json({
        success: true,
        transcription: {
          id: savedTranscription.id,
          text: transcription.text,
          language: transcription.language,
          duration: transcription.duration,
          segments: transcription.segments,
        },
      });
    } catch (apiError: any) {
      if (fsSync.existsSync(req.file.path)) {
        fsSync.unlinkSync(req.file.path);
      }
      
      console.error("OpenAI API error:", apiError);
      const aiError = handleOpenAIError(apiError);
      res.status(aiError.statusCode).json(createErrorResponse(aiError));
    }
  } catch (error: any) {
    console.error("Error processing transcription:", error);
    res.status(500).json({ 
      error: "Failed to process transcription",
      details: error.message,
    });
  }
});

/**
 * GET /api/ai/media/voice/transcriptions
 * Get all transcriptions for the authenticated user
 */
router.get("/voice/transcriptions", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { page = 1, limit = 10, status } = req.query;
    
    const result = await storage.platform.ai.getTranscriptionsPaginated(
      userId,
      parseInt(page as string),
      parseInt(limit as string),
      status as "processing" | "completed" | "failed" | undefined
    );
    
    res.json(result);
  } catch (error) {
    console.error("Error getting transcriptions:", error);
    res.status(500).json({ error: "Failed to get transcriptions" });
  }
});

/**
 * GET /api/ai/media/voice/transcriptions/:id
 * Get a specific transcription
 */
router.get("/voice/transcriptions/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const transcription = await storage.platform.ai.getTranscription(userId, req.params.id);
    
    if (!transcription) {
      return res.status(404).json({ error: "Transcription not found" });
    }
    
    res.json(transcription);
  } catch (error) {
    console.error("Error getting transcription:", error);
    res.status(500).json({ error: "Failed to get transcription" });
  }
});

/**
 * PUT /api/ai/media/voice/transcriptions/:id/edit
 * Edit and correct a transcription
 */
router.put("/voice/transcriptions/:id/edit", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const validation = editTranscriptSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { editedTranscript, editReason } = validation.data;
    
    const original = await storage.platform.ai.getTranscription(userId, req.params.id);
    if (!original) {
      return res.status(404).json({ error: "Transcription not found" });
    }
    
    const editType = determineEditType(editReason);
    
    await storage.platform.ai.createTranscriptEdit({
      transcriptionId: req.params.id,
      userId,
      originalSegment: original.transcript,
      editedSegment: editedTranscript,
      timestamp: 0,
      editType,
      confidence: 100,
    });
    
    const updated = await storage.platform.ai.updateTranscription(userId, req.params.id, {
      transcript: editedTranscript,
      metadata: {
        ...original.metadata,
        lastEditedAt: new Date().toISOString(),
        editReason,
      },
    });
    
    res.json({
      success: true,
      transcription: updated,
    });
  } catch (error) {
    console.error("Error editing transcription:", error);
    res.status(500).json({ error: "Failed to edit transcription" });
  }
});

/**
 * GET /api/ai/media/voice/transcriptions/:id/export
 * Export transcription in various formats
 */
router.get("/voice/transcriptions/:id/export", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const format = exportFormatSchema.parse(req.query.format || 'txt');
    
    const transcription = await storage.platform.ai.getTranscription(userId, req.params.id);
    if (!transcription) {
      return res.status(404).json({ error: "Transcription not found" });
    }
    
    const formatted = formatTranscript(
      transcription.transcript,
      format,
      transcription.metadata
    );
    
    const mimeTypes = {
      txt: 'text/plain',
      srt: 'application/x-subrip',
      vtt: 'text/vtt',
      json: 'application/json',
    };
    
    res.setHeader('Content-Type', mimeTypes[format]);
    res.setHeader('Content-Disposition', `attachment; filename="transcription-${req.params.id}.${format}"`);
    res.send(formatted);
  } catch (error) {
    console.error("Error exporting transcription:", error);
    res.status(500).json({ error: "Failed to export transcription" });
  }
});

/**
 * DELETE /api/ai/media/voice/transcriptions/:id
 * Delete a transcription
 */
router.delete("/voice/transcriptions/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    await storage.platform.ai.deleteTranscription(userId, req.params.id);
    
    res.json({
      success: true,
      message: "Transcription deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting transcription:", error);
    res.status(500).json({ error: "Failed to delete transcription" });
  }
});

/**
 * GET /api/ai/media/voice/transcriptions/search
 * Search transcriptions by text content
 */
router.get("/voice/transcriptions/search", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { q, limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: "Search query is required" });
    }
    
    const allTranscriptions = await storage.platform.ai.getTranscriptions(
      userId, 
      undefined,
      parseInt(limit as string)
    );
    const results = allTranscriptions.filter(t => 
      t.transcript?.toLowerCase().includes((q as string).toLowerCase())
    );
    
    res.json(results);
  } catch (error) {
    console.error("Error searching transcriptions:", error);
    res.status(500).json({ error: "Failed to search transcriptions" });
  }
});

// ==================== VOICE COMMAND ENDPOINTS ====================

/**
 * POST /api/ai/media/voice/commands/process
 * Process a text-based voice command
 */
router.post("/voice/commands/process", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const validation = voiceCommandSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { command, context } = validation.data;
    
    const interpretation = await interpretVoiceCommand(command, context);
    
    const commandRecord = await storage.platform.ai.createVoiceCommand({
      userId,
      transcription: command,
      intent: interpretation.action,
      confidence: interpretation.confidence,
      action: interpretation.action,
      result: interpretation.parameters as Record<string, any>,
      metadata: { originalCommand: command },
    });
    
    let executionResult = null;
    
    if (interpretation.confidence > 0.5) {
      switch (interpretation.action) {
        case 'add_item':
          if (interpretation.parameters?.items) {
            for (const item of interpretation.parameters.items) {
              await storage.user.inventory.createFoodItem({
                userId,
                name: item,
                quantity: interpretation.parameters.quantity || "1",
                unit: interpretation.parameters.unit || "item",
                storageLocationId: interpretation.parameters.location || "default",
                foodCategory: interpretation.parameters.category || "other",
              });
            }
            executionResult = {
              success: true,
              message: `Added ${interpretation.parameters.items.join(', ')} to inventory`,
            };
          }
          break;
          
        case 'search_recipe':
          const recipes = await storage.user.recipes.searchRecipes(
            userId,
            interpretation.parameters?.query || command
          );
          executionResult = {
            success: true,
            recipes: recipes.slice(0, 3),
          };
          break;
          
        case 'set_timer':
          executionResult = {
            success: true,
            message: `Timer set for ${interpretation.parameters?.duration} ${interpretation.parameters?.unit}`,
            timer: {
              duration: interpretation.parameters?.duration,
              unit: interpretation.parameters?.unit,
              label: interpretation.parameters?.label,
            },
          };
          break;
          
        default:
          executionResult = {
            success: false,
            message: "I understood your command but couldn't execute it",
            suggestion: interpretation.alternatives?.[0],
          };
      }
    } else {
      executionResult = {
        success: false,
        message: "I'm not sure what you meant. Could you try rephrasing?",
        alternatives: interpretation.alternatives,
      };
    }
    
    res.json({
      success: true,
      commandId: commandRecord.id,
      interpretation,
      result: executionResult,
    });
  } catch (error) {
    console.error("Error processing voice command:", error);
    const aiError = handleOpenAIError(error as Error);
    res.status(aiError.statusCode).json(createErrorResponse(aiError));
  }
});

/**
 * GET /api/ai/media/voice/commands
 * Get available voice commands
 */
router.get("/voice/commands", async (req: Request, res: Response) => {
  res.json({
    success: true,
    commands: [
      {
        category: "Inventory",
        examples: [
          "Add milk to my shopping list",
          "I bought eggs and bread",
          "What's in my fridge?",
          "Remove expired items",
        ],
      },
      {
        category: "Recipes",
        examples: [
          "Find recipes with chicken",
          "Show me vegetarian dinner ideas",
          "What can I make with pasta and tomatoes?",
          "Save this recipe",
        ],
      },
      {
        category: "Cooking",
        examples: [
          "Set a timer for 10 minutes",
          "Convert 2 cups to milliliters",
          "What temperature for roasting chicken?",
          "How long to boil eggs?",
        ],
      },
      {
        category: "Meal Planning",
        examples: [
          "Plan meals for this week",
          "Add pasta night to Thursday",
          "Generate shopping list for meal plan",
          "What's for dinner tonight?",
        ],
      },
    ],
  });
});

/**
 * GET /api/ai/media/voice/commands/history
 * Get user's voice command history
 */
router.get("/voice/commands/history", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { limit = 20 } = req.query;
    
    const history = await storage.platform.ai.getVoiceCommands(
      userId,
      undefined,
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("Error getting command history:", error);
    res.status(500).json({ error: "Failed to get command history" });
  }
});

/**
 * GET /api/ai/media/voice/stats
 * Get voice service usage statistics
 */
router.get("/voice/stats", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const transcriptionsData = await storage.platform.ai.getTranscriptions(userId, undefined, 1000);
    const commands = await storage.platform.ai.getVoiceCommands(userId, undefined, 1000);
    
    const totalTranscriptions = transcriptionsData?.length || 0;
    const totalDuration = transcriptionsData?.reduce((sum: number, t: any) => sum + (t.duration || 0), 0) || 0;
    const totalCommands = commands.length;
    const successfulCommands = commands.filter((c: any) => c.success).length;
    
    res.json({
      success: true,
      stats: {
        transcriptions: {
          total: totalTranscriptions,
          totalDurationSeconds: totalDuration,
          averageDurationSeconds: totalTranscriptions > 0 ? totalDuration / totalTranscriptions : 0,
        },
        commands: {
          total: totalCommands,
          successful: successfulCommands,
          successRate: totalCommands > 0 ? (successfulCommands / totalCommands * 100).toFixed(1) : 0,
        },
      },
    });
  } catch (error) {
    console.error("Error getting voice stats:", error);
    res.status(500).json({ error: "Failed to get voice statistics" });
  }
});

export default router;
