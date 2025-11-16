/**
 * Data Extraction API Routes
 * 
 * Provides endpoints for extracting structured data from unstructured text
 * using OpenAI GPT models with structured output.
 */

import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { isAuthenticated } from "../middleware/auth.middleware";
import { asyncHandler } from "../middleware/error.middleware";
import { Request as ExpressRequest } from "express";
import OpenAI from "openai";
import { insertExtractionTemplateSchema, insertExtractedDataSchema } from "@shared/schema";
import pLimit from "p-limit";
import pRetry from "p-retry";

const router = Router();

// Initialize OpenAI client using Replit AI Integrations
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// Helper function to check if error is rate limit
function isRateLimitError(error: any): boolean {
  const errorMsg = error?.message || String(error);
  return (
    errorMsg.includes("429") ||
    errorMsg.includes("RATELIMIT_EXCEEDED") ||
    errorMsg.toLowerCase().includes("quota") ||
    errorMsg.toLowerCase().includes("rate limit")
  );
}

// Request validation schemas
const extractDataSchema = z.object({
  text: z.string().min(1, "Text is required"),
  templateId: z.string().optional(),
  customSchema: z.object({
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['string', 'number', 'date', 'boolean', 'array', 'object']),
      description: z.string(),
      required: z.boolean().optional(),
      examples: z.array(z.string()).optional(),
    }))
  }).optional(),
  sourceId: z.string().optional(),
  sourceType: z.enum(['email', 'document', 'message', 'web', 'api']).default('message'),
});

const batchExtractSchema = z.object({
  texts: z.array(z.string()).min(1).max(100),
  templateId: z.string(),
  sourceType: z.enum(['email', 'document', 'message', 'web', 'api']).default('message'),
});

const correctExtractionSchema = z.object({
  extractionId: z.string(),
  corrections: z.record(z.any()),
  validatedBy: z.string().optional(),
});

/**
 * Extract structured data using OpenAI with structured output
 */
async function extractStructuredData(
  text: string,
  schema: any,
  systemPrompt?: string,
  config?: any
): Promise<{ data: any; confidence: number; metadata: any }> {
  const startTime = Date.now();
  
  // Build the system prompt
  const prompt = systemPrompt || `You are an expert data extraction assistant. 
Extract structured information from the provided text according to the specified schema.
Be precise and accurate. If a field cannot be determined from the text, leave it empty or null.
Focus on extracting factual information present in the text.`;

  // Build the extraction prompt with schema
  const userPrompt = `Extract the following information from this text:
${JSON.stringify(schema.fields.map((f: any) => ({
  field: f.name,
  type: f.type,
  description: f.description,
  required: f.required,
  examples: f.examples
})), null, 2)}

Text to analyze:
${text}

Return the extracted data as a valid JSON object with confidence scores for each field.`;

  try {
    const response = await pRetry(
      async () => {
        try {
          const completion = await openai.chat.completions.create({
            model: config?.model || "gpt-3.5-turbo", // Using gpt-3.5-turbo as specified
            messages: [
              { role: "system", content: prompt },
              { role: "user", content: userPrompt }
            ],
            temperature: config?.temperature || 0.3,
            max_tokens: config?.maxTokens || 2000,
            response_format: { type: "json_object" },
          });

          const content = completion.choices[0]?.message?.content;
          if (!content) {
            throw new Error("No response from OpenAI");
          }

          // Parse the response
          const result = JSON.parse(content);
          
          // Calculate overall confidence based on field completeness
          const fields = schema.fields;
          let filledFields = 0;
          let totalRequired = 0;
          const fieldConfidence: Record<string, number> = {};

          for (const field of fields) {
            if (field.required) totalRequired++;
            
            const value = result[field.name];
            if (value !== null && value !== undefined && value !== '') {
              filledFields++;
              // Higher confidence for required fields that are filled
              fieldConfidence[field.name] = field.required ? 0.95 : 0.85;
            } else {
              // Lower confidence for missing fields
              fieldConfidence[field.name] = field.required ? 0.3 : 0.5;
            }
          }

          const overallConfidence = totalRequired > 0 
            ? (filledFields / fields.length) * 0.8 + (Object.keys(result).length > 0 ? 0.2 : 0)
            : filledFields / fields.length;

          return {
            data: result,
            confidence: Math.min(overallConfidence, 0.99),
            metadata: {
              processingTime: Date.now() - startTime,
              modelUsed: config?.model || "gpt-3.5-turbo",
              tokenCount: completion.usage?.total_tokens || 0,
              fieldConfidence
            }
          };
        } catch (error: any) {
          if (isRateLimitError(error)) {
            throw error; // Rethrow to trigger retry
          }
          throw new pRetry.AbortError(error as Error); // Don't retry non-rate-limit errors
        }
      },
      {
        retries: config?.maxRetries || 2,
        minTimeout: 2000,
        maxTimeout: 10000,
        factor: 2,
      }
    );

    return response;
  } catch (error) {
    console.error("Extraction error:", error);
    throw error;
  }
}

/**
 * POST /api/extract/template
 * Create a new extraction template
 */
router.post(
  "/template",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate request
    const validation = insertExtractionTemplateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    try {
      const template = await storage.createExtractionTemplate({
        ...validation.data,
        createdBy: userId,
      });

      res.json({
        success: true,
        template,
      });
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({
        error: "Failed to create template",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/extract/templates
 * Get all active extraction templates
 */
router.get(
  "/templates",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    try {
      const templates = await storage.getExtractionTemplates();
      
      res.json({
        success: true,
        templates,
      });
    } catch (error) {
      console.error("Error getting templates:", error);
      res.status(500).json({
        error: "Failed to get templates",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/extract/template/:id
 * Get a specific extraction template
 */
router.get(
  "/template/:id",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const templateId = req.params.id;
    
    try {
      const template = await storage.getExtractionTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      
      res.json({
        success: true,
        template,
      });
    } catch (error) {
      console.error("Error getting template:", error);
      res.status(500).json({
        error: "Failed to get template",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * PUT /api/extract/template/:id
 * Update an extraction template
 */
router.put(
  "/template/:id",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const templateId = req.params.id;
    
    try {
      const template = await storage.updateExtractionTemplate(templateId, req.body);
      
      res.json({
        success: true,
        template,
      });
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({
        error: "Failed to update template",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * DELETE /api/extract/template/:id
 * Delete (deactivate) an extraction template
 */
router.delete(
  "/template/:id",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const templateId = req.params.id;
    
    try {
      await storage.deleteExtractionTemplate(templateId);
      
      res.json({
        success: true,
        message: "Template deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({
        error: "Failed to delete template",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * POST /api/extract/data
 * Extract structured data from text
 */
router.post(
  "/data",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate request
    const validation = extractDataSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { text, templateId, customSchema, sourceId, sourceType } = validation.data;

    try {
      let schema: any;
      let systemPrompt: string | undefined;
      let extractionConfig: any = {};

      // Get template or use custom schema
      if (templateId) {
        const template = await storage.getExtractionTemplate(templateId);
        if (!template) {
          return res.status(404).json({ error: "Template not found" });
        }
        schema = template.schema;
        systemPrompt = template.systemPrompt || undefined;
        extractionConfig = template.extractionConfig || {};
      } else if (customSchema) {
        schema = customSchema;
      } else {
        return res.status(400).json({ 
          error: "Either templateId or customSchema must be provided" 
        });
      }

      // Extract structured data
      const extraction = await extractStructuredData(
        text,
        schema,
        systemPrompt,
        extractionConfig
      );

      // Save extraction result
      const extractedData = await storage.createExtractedData({
        sourceId: sourceId || `source_${Date.now()}`,
        sourceType,
        templateId: templateId || null,
        inputText: text,
        extractedFields: extraction.data,
        confidence: extraction.confidence,
        fieldConfidence: extraction.metadata.fieldConfidence,
        validationStatus: extraction.confidence >= (extractionConfig.confidenceThreshold || 0.85) 
          ? 'validated' 
          : 'pending',
        metadata: {
          ...extraction.metadata,
          userId,
        },
      });

      res.json({
        success: true,
        extraction: extractedData,
      });
    } catch (error) {
      console.error("Extraction error:", error);
      res.status(500).json({
        error: "Failed to extract data",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * POST /api/extract/batch
 * Batch extraction for multiple texts
 */
router.post(
  "/batch",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate request
    const validation = batchExtractSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { texts, templateId, sourceType } = validation.data;
    const batchId = `batch_${Date.now()}`;

    try {
      // Get template
      const template = await storage.getExtractionTemplate(templateId);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Process texts concurrently with rate limiting
      const limit = pLimit(2); // Process 2 texts concurrently
      
      const extractionPromises = texts.map((text, index) =>
        limit(async () => {
          try {
            const extraction = await extractStructuredData(
              text,
              template.schema,
              template.systemPrompt || undefined,
              template.extractionConfig || {}
            );

            return {
              sourceId: `${batchId}_${index}`,
              sourceType,
              templateId,
              inputText: text,
              extractedFields: extraction.data,
              confidence: extraction.confidence,
              fieldConfidence: extraction.metadata.fieldConfidence,
              validationStatus: extraction.confidence >= (template.extractionConfig?.confidenceThreshold || 0.85)
                ? 'validated'
                : 'pending',
              metadata: {
                ...extraction.metadata,
                batchId,
                userId,
              },
            };
          } catch (error) {
            console.error(`Failed to extract from text ${index}:`, error);
            return null;
          }
        })
      );

      const extractionResults = await Promise.all(extractionPromises);
      const validResults = extractionResults.filter(r => r !== null) as any[];

      // Batch save extraction results
      const savedExtractions = await storage.batchCreateExtractedData(validResults);

      res.json({
        success: true,
        batchId,
        total: texts.length,
        processed: savedExtractions.length,
        failed: texts.length - savedExtractions.length,
        extractions: savedExtractions,
      });
    } catch (error) {
      console.error("Batch extraction error:", error);
      res.status(500).json({
        error: "Failed to process batch extraction",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/extract/verify/:id
 * Get extraction for verification
 */
router.get(
  "/verify/:id",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const extractionId = req.params.id;
    
    try {
      const extraction = await storage.getExtractedData(extractionId);
      
      if (!extraction) {
        return res.status(404).json({ error: "Extraction not found" });
      }

      // Get template if available
      let template = null;
      if (extraction.templateId) {
        template = await storage.getExtractionTemplate(extraction.templateId);
      }
      
      res.json({
        success: true,
        extraction,
        template,
      });
    } catch (error) {
      console.error("Error getting extraction:", error);
      res.status(500).json({
        error: "Failed to get extraction",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * POST /api/extract/correct
 * Submit corrections for extracted data
 */
router.post(
  "/correct",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate request
    const validation = correctExtractionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: validation.error.errors,
      });
    }

    const { extractionId, corrections } = validation.data;

    try {
      // Update extraction with corrections
      const updatedExtraction = await storage.updateExtractedData(extractionId, {
        corrections,
        validationStatus: 'corrected',
        validatedBy: userId,
      });

      res.json({
        success: true,
        extraction: updatedExtraction,
      });
    } catch (error) {
      console.error("Error correcting extraction:", error);
      res.status(500).json({
        error: "Failed to correct extraction",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/extract/history
 * Get extraction history with pagination
 */
router.get(
  "/history",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    const { page = 1, limit = 20, templateId, validationStatus } = req.query;
    
    try {
      const paginatedData = await storage.getExtractedDataPaginated({
        page: Number(page),
        limit: Number(limit),
        templateId: templateId as string,
        validationStatus: validationStatus as string,
      });
      
      res.json({
        success: true,
        ...paginatedData,
      });
    } catch (error) {
      console.error("Error getting extraction history:", error);
      res.status(500).json({
        error: "Failed to get extraction history",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

/**
 * GET /api/extract/stats
 * Get extraction statistics
 */
router.get(
  "/stats",
  isAuthenticated,
  asyncHandler(async (req: ExpressRequest<any, any, any, any>, res) => {
    try {
      const stats = await storage.getExtractionStats();
      
      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error("Error getting extraction stats:", error);
      res.status(500).json({
        error: "Failed to get extraction statistics",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  })
);

export default router;