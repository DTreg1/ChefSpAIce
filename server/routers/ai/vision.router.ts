/**
 * AI Vision Router
 * 
 * Consolidated router for all AI vision/image services including:
 * - OCR (Optical Character Recognition)
 * - Face detection and privacy features
 * - Alt text generation for accessibility
 * - Image analysis and enhancement
 * 
 * Base path: /api/ai/vision
 */

import { Router, Request, Response } from "express";
import { isAuthenticated, getAuthenticatedUserId } from "../../middleware/auth.middleware";
import { storage } from "../../storage/index";
import { z } from "zod";
import multer from "multer";
import Tesseract from "tesseract.js";
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

const router = Router();

// Initialize OpenAI client
const openai = getOpenAIClient();

// Use centralized circuit breaker
const openaiBreaker = circuitBreakers.openaiVision;

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
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

const ocrExtractionSchema = z.object({
  language: z.string().default("eng"),
  enhanceImage: z.boolean().default(false),
  parseReceipt: z.boolean().default(false),
});

const faceDetectionSchema = z.object({
  returnCoordinates: z.boolean().default(true),
  minConfidence: z.number().min(0).max(1).default(0.5),
});

const faceBlurSchema = z.object({
  blurIntensity: z.number().min(1).max(20).default(10),
  excludeIndexes: z.array(z.number()).optional(),
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Extract text from an image using Tesseract.js
 */
async function extractTextFromImage(imageBuffer: Buffer, language: string) {
  try {
    const result = await Tesseract.recognize(imageBuffer, language, {
      logger: (m) => console.log(m.status),
    });
    
    return {
      text: result.data.text,
      confidence: result.data.confidence,
      boundingBoxes: result.data.words.map(word => ({
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

/**
 * Parse receipt data from extracted text
 */
function parseReceiptData(text: string) {
  const lines = text.split('\n').filter(line => line.trim());
  const receipt: any = {
    items: [],
    total: null,
    date: null,
    merchant: null,
  };
  
  // Simple pattern matching for receipt parsing
  lines.forEach(line => {
    // Look for total
    if (/total|amount|due/i.test(line)) {
      const match = line.match(/[\d,]+\.?\d*/);
      if (match) {
        receipt.total = parseFloat(match[0].replace(',', ''));
      }
    }
    
    // Look for date patterns
    const dateMatch = line.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
    if (dateMatch) {
      receipt.date = dateMatch[0];
    }
    
    // Look for items with prices
    const itemMatch = line.match(/^(.+?)\s+([\d,]+\.?\d*)$/);
    if (itemMatch && !(/total|tax|subtotal/i.test(itemMatch[1]))) {
      receipt.items.push({
        name: itemMatch[1].trim(),
        price: parseFloat(itemMatch[2].replace(',', '')),
      });
    }
  });
  
  // First non-empty line often contains merchant name
  if (lines.length > 0) {
    receipt.merchant = lines[0];
  }
  
  return receipt;
}

// ==================== OCR ENDPOINTS ====================

/**
 * POST /api/ai/vision/ocr/extract
 * Extract text from an image or PDF
 */
router.post("/ocr/extract", isAuthenticated, upload.single("image"), rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    
    const { language = "eng", parseReceipt = false } = req.body;
    const imageId = `ocr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const startTime = Date.now();
    
    // Extract text from image
    const extractionResult = await extractTextFromImage(req.file.buffer, language);
    const processingTime = Date.now() - startTime;
    
    // Parse structured data if it looks like a receipt
    let structuredData = null;
    if (parseReceipt === "true" || parseReceipt === true) {
      structuredData = parseReceiptData(extractionResult.text);
    }
    
    // Save OCR result to database
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
 * GET /api/ai/vision/ocr/results
 * Get user's OCR result history
 */
router.get("/ocr/results", isAuthenticated, async (req: Request, res: Response) => {
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
 * GET /api/ai/vision/ocr/languages
 * Get supported OCR languages
 */
router.get("/ocr/languages", async (req: Request, res: Response) => {
  res.json({
    success: true,
    languages: SUPPORTED_LANGUAGES,
  });
});

// ==================== FACE DETECTION ENDPOINTS ====================

/**
 * POST /api/ai/vision/faces/detect
 * Detect faces in an image
 */
router.post("/faces/detect", isAuthenticated, upload.single("image"), rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    
    const { returnCoordinates = true, minConfidence = 0.5 } = req.body;
    
    // Detect faces in the image
    const detectionResult = await faceDetectionService.detectFaces(req.file.buffer);
    
    // Filter by confidence threshold
    const filteredFaces = detectionResult.faces.filter(
      (face: any) => face.confidence >= minConfidence
    );
    
    // Save detection to database
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
 * POST /api/ai/vision/faces/blur
 * Blur faces in an image for privacy
 */
router.post("/faces/blur", isAuthenticated, upload.single("image"), rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
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
    
    // First detect faces to get their coordinates
    const detectionResult = await faceDetectionService.detectFaces(req.file.buffer);
    
    // Filter faces to exclude
    const facesToBlur = detectionResult.faces.filter(
      (_: any, index: number) => !excludeIndexes.includes(index)
    );
    
    // Blur faces in the image
    const blurredImage = await faceDetectionService.blurFaces(
      req.file.buffer,
      facesToBlur,
      blurIntensity
    );
    
    // Create a data URL for the blurred image
    const base64Image = blurredImage.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;
    
    // Save blur operation to database
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
 * GET /api/ai/vision/faces/privacy-settings
 * Get user's privacy settings
 */
router.get("/faces/privacy-settings", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const settings = await storage.platform.ai.getPrivacySettings(userId);
    
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
 * POST /api/ai/vision/faces/privacy-settings
 * Update user's privacy settings
 */
router.post("/faces/privacy-settings", isAuthenticated, async (req: Request, res: Response) => {
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

// ==================== ALT TEXT GENERATION ENDPOINTS ====================

/**
 * POST /api/ai/vision/alt-text
 * Generate alt text for an image
 */
router.post("/alt-text", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const validation = generateAltTextSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { imageUrl, context, saveToDb } = validation.data;
    
    // Check if image metadata already exists
    let imageMetadata = await storage.platform.ai.getImageMetadataByUrl(userId, imageUrl);
    
    // Generate alt text
    const result = await generateAltText(imageUrl, context);
    
    if (saveToDb) {
      if (!imageMetadata) {
        // Create new image metadata
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
        // Update existing metadata
        imageMetadata = await storage.platform.ai.updateImageMetadata(userId, imageMetadata.id, {
          generatedAlt: result.altText,
          altText: imageMetadata.altText || result.altText, // Don't override user-edited alt text
          aiModel: "gpt-4o-vision",
          generatedAt: new Date(),
          confidence: result.confidence,
          objectsDetected: result.objectsDetected
        });
      }
      
      // Analyze and save quality metrics
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
    const errorResponse = handleOpenAIError(error as Error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
});

/**
 * POST /api/ai/vision/alt-text/bulk
 * Batch process multiple images for alt text
 */
router.post("/alt-text/bulk", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
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
        
        // Save to database
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
    const errorResponse = handleOpenAIError(error as Error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
});

/**
 * PUT /api/ai/vision/alt-text/:id
 * Update alt text for an image
 */
router.put("/alt-text/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const imageId = req.params.id;
    const validation = updateAltTextSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.flatten() });
    }
    
    const { altText, isDecorative, title } = validation.data;
    
    // Update image metadata
    const imageMetadata = await storage.platform.ai.updateImageMetadata(userId, imageId, {
      altText,
      isDecorative,
      title
    });
    
    // Re-analyze quality with new alt text
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
 * GET /api/ai/vision/alt-text/:id/suggestions
 * Get alt text suggestions for improvement
 */
router.get("/alt-text/:id/suggestions", isAuthenticated, async (req: Request, res: Response) => {
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
    const errorResponse = handleOpenAIError(error as Error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
});

/**
 * POST /api/ai/vision/alt-text/check-decorative
 * Check if an image is decorative
 */
router.post("/alt-text/check-decorative", isAuthenticated, rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const { imageUrl, context } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: "Image URL is required" });
    }
    
    if (!openai) {
      return res.status(503).json({ 
        error: "AI service not configured",
        message: "OpenAI API key is required for this feature."
      });
    }
    
    const prompt = `Analyze this image and determine if it is purely decorative (adds no meaningful content to the page).

Image URL: ${imageUrl}
${context ? `Context: ${context}` : ''}

A decorative image is one that:
- Is used purely for visual design
- Doesn't convey important information
- Could be removed without losing meaning
- Examples: borders, spacers, background patterns

Respond with JSON: { "isDecorative": boolean, "reason": "explanation" }`;
    
    const completion = await openaiBreaker.execute(async () => {
      return await openai!.chat.completions.create({
        model: "gpt-4o-vision-preview",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }],
        max_tokens: 200,
        response_format: { type: "json_object" }
      });
    });
    
    const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Failed to check decorative status:", error);
    const errorResponse = handleOpenAIError(error as Error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
});

/**
 * GET /api/ai/vision/alt-text/report
 * Generate accessibility report
 */
router.get("/alt-text/report", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { includeDetails = false } = req.query;
    
    // Get all user images
    const images = await storage.platform.ai.getUserImages(userId);
    
    // Get quality metrics for all images
    const qualityMetrics = await Promise.all(
      images.map(img => storage.platform.ai.getAltTextQuality(img.id))
    );
    
    const stats = {
      totalImages: images.length,
      withAltText: images.filter(img => img.altText || img.generatedAlt).length,
      withoutAltText: images.filter(img => !img.altText && !img.generatedAlt).length,
      decorative: images.filter(img => img.isDecorative).length,
      reviewed: images.filter(img => img.reviewStatus === 'reviewed').length,
      averageQualityScore: qualityMetrics
        .filter(q => q)
        .reduce((sum, q) => sum + (q?.overallScore || 0), 0) / qualityMetrics.filter(q => q).length || 0,
    };
    
    const issues = [];
    
    images.forEach((img, index) => {
      const quality = qualityMetrics[index];
      
      if (!img.altText && !img.generatedAlt && !img.isDecorative) {
        issues.push({
          imageId: img.id,
          issue: 'missing_alt_text',
          severity: 'high',
          imageUrl: includeDetails ? img.imageUrl : undefined
        });
      }
      
      if (quality && quality.overallScore < 60) {
        issues.push({
          imageId: img.id,
          issue: 'low_quality_alt_text',
          severity: 'medium',
          score: quality.overallScore,
          imageUrl: includeDetails ? img.imageUrl : undefined
        });
      }
    });
    
    res.json({
      success: true,
      data: {
        stats,
        issues,
        recommendations: [
          stats.withoutAltText > 0 && "Add alt text to all non-decorative images",
          stats.averageQualityScore < 70 && "Improve alt text quality by making descriptions more specific",
          stats.reviewed < stats.totalImages * 0.5 && "Review more alt text for accuracy"
        ].filter(Boolean),
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Failed to generate accessibility report:", error);
    res.status(500).json({
      success: false,
      error: "Failed to generate accessibility report"
    });
  }
});

// Note: Alt-text management endpoints removed as storage methods don't exist
// These would need to be implemented in storage layer first
// The core alt-text generation and quality check endpoints remain functional

// ==================== IMAGE ANALYSIS ENDPOINTS ====================

/**
 * POST /api/ai/vision/analyze
 * Analyze image content and extract information
 */
router.post("/analyze", isAuthenticated, upload.single("image"), rateLimiters.openai.middleware(), async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    if (!openai) {
      return res.status(503).json({ 
        error: "AI service not configured",
        message: "OpenAI API key is required for this feature."
      });
    }
    
    const { imageUrl, analysisType = "general", context } = req.body;
    
    if (!imageUrl && !req.file) {
      return res.status(400).json({ error: "Image URL or file is required" });
    }
    
    const actualImageUrl = imageUrl || `data:image/jpeg;base64,${req.file?.buffer.toString('base64')}`;
    
    let prompt = "";
    
    switch (analysisType) {
      case 'food':
        prompt = `Analyze this food image and provide:
1. Main dish or food item name
2. Ingredients you can identify
3. Estimated calories per serving
4. Cuisine type
5. Dietary tags (vegan, gluten-free, etc.)

Format as JSON.`;
        break;
        
      case 'recipe':
        prompt = `Analyze this food image and suggest a recipe:
1. Dish name
2. Estimated ingredients needed
3. Basic cooking steps
4. Prep and cook time estimates
5. Difficulty level

Format as JSON.`;
        break;
        
      case 'objects':
        prompt = `Identify all objects in this image:
1. List all visible objects
2. Count of each object type
3. Primary object/focus
4. Scene description
5. Any text visible

Format as JSON.`;
        break;
        
      default:
        prompt = `Analyze this image and provide:
1. Main subject/content
2. Scene description
3. Key objects or elements
4. Colors and composition
5. Any text or labels visible
${context ? `Context: ${context}` : ''}

Format as JSON.`;
    }
    
    const completion = await openaiBreaker.execute(async () => {
      return await openai!.chat.completions.create({
        model: "gpt-4o-vision-preview",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: actualImageUrl } }
          ]
        }],
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });
    });
    
    const analysis = JSON.parse(completion.choices[0]?.message?.content || "{}");
    
    res.json({
      success: true,
      analysis,
      metadata: {
        analysisType,
        timestamp: new Date().toISOString(),
        model: "gpt-4o-vision"
      }
    });
  } catch (error) {
    console.error("Image analysis error:", error);
    const errorResponse = handleOpenAIError(error as Error);
    res.status(errorResponse.status).json(errorResponse.body);
  }
});

/**
 * GET /api/ai/vision/stats
 * Get vision service usage statistics
 */
router.get("/stats", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    // Get usage stats
    const ocrCount = await storage.platform.ai.getOcrResultCount(userId);
    const faceDetectionCount = await storage.platform.ai.getFaceDetectionCount(userId);
    const altTextCount = await storage.platform.ai.getImageMetadataCount(userId);
    
    res.json({
      success: true,
      stats: {
        ocrProcessed: ocrCount,
        facesDetected: faceDetectionCount,
        altTextGenerated: altTextCount,
      },
      endpoints: {
        ocr: "/api/ai/vision/ocr/*",
        faceDetection: "/api/ai/vision/faces/*",
        altText: "/api/ai/vision/alt-text/*",
        analysis: "/api/ai/vision/analyze",
      },
      metadata: {
        userId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error getting vision stats:", error);
    res.status(500).json({
      error: "Failed to get vision statistics",
    });
  }
});

export default router;