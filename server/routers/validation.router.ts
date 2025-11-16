import { Router } from "express";
import { z } from "zod";
import { validationService } from "../services/validation.service";
import { isAuthenticated as requireAuth, adminOnly } from "../middleware/auth.middleware";

const router = Router();

// Validation request schemas
const validateFieldSchema = z.object({
  fieldName: z.string(),
  fieldType: z.string(),
  value: z.string(),
  context: z.object({
    formId: z.string().optional(),
    otherFields: z.record(z.any()).optional(),
    locale: z.string().optional(),
  }).optional(),
});

const validateFormSchema = z.object({
  formId: z.string(),
  fields: z.array(z.object({
    name: z.string(),
    type: z.string(),
    value: z.string(),
    required: z.boolean().optional(),
  })),
  context: z.object({
    pageUrl: z.string().optional(),
    locale: z.string().optional(),
  }).optional(),
});

const learnFromCorrectionSchema = z.object({
  fieldName: z.string(),
  fieldType: z.string(),
  originalValue: z.string(),
  suggestedValue: z.string().optional(),
  finalValue: z.string(),
  userResolution: z.enum(["accepted_suggestion", "manual_correction", "ignored", "abandoned"]),
  context: z.object({
    formId: z.string().optional(),
    pageUrl: z.string().optional(),
    sessionId: z.string().optional(),
  }).optional(),
  resolutionTime: z.number().optional(),
});

const getSuggestionsSchema = z.object({
  fieldType: z.string(),
  currentValue: z.string(),
  errorType: z.string().optional(),
  context: z.object({
    formId: z.string().optional(),
    otherFields: z.record(z.any()).optional(),
  }).optional(),
});

/**
 * POST /api/validate/field
 * Validate a single form field with intelligent suggestions
 */
router.post("/field", async (req, res) => {
  try {
    const data = validateFieldSchema.parse(req.body);
    const userId = (req as any).session?.userId;
    
    const result = await validationService.validateField({
      ...data,
      userId,
    });
    
    res.json(result);
  } catch (error: any) {
    console.error("[Validation] Field validation error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to validate field",
      error: error.message,
    });
  }
});

/**
 * POST /api/validate/form
 * Validate an entire form with field interdependencies
 */
router.post("/form", async (req, res) => {
  try {
    const data = validateFormSchema.parse(req.body);
    const userId = (req as any).session?.userId;
    
    const result = await validationService.validateForm({
      ...data,
      userId,
    });
    
    res.json(result);
  } catch (error: any) {
    console.error("[Validation] Form validation error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to validate form",
      error: error.message,
    });
  }
});

/**
 * GET /api/validate/suggestions
 * Get AI-powered suggestions for fixing validation errors
 */
router.get("/suggestions", async (req, res) => {
  try {
    const params = getSuggestionsSchema.parse(req.query);
    const userId = (req as any).session?.userId;
    
    const suggestions = await validationService.getSuggestions({
      ...params,
      userId,
    });
    
    res.json(suggestions);
  } catch (error: any) {
    console.error("[Validation] Get suggestions error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request parameters",
        errors: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to get suggestions",
      error: error.message,
    });
  }
});

/**
 * POST /api/validate/learn
 * Learn from user corrections to improve future validation
 */
router.post("/learn", async (req, res) => {
  try {
    const data = learnFromCorrectionSchema.parse(req.body);
    const userId = (req as any).session?.userId;
    
    await validationService.learnFromCorrection({
      ...data,
      userId,
    });
    
    res.json({
      success: true,
      message: "Learned from correction",
    });
  } catch (error: any) {
    console.error("[Validation] Learn from correction error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.errors,
      });
    }
    res.status(500).json({
      success: false,
      message: "Failed to learn from correction",
      error: error.message,
    });
  }
});

/**
 * GET /api/validate/rules/:fieldType
 * Get validation rules for a specific field type
 */
router.get("/rules/:fieldType", async (req, res) => {
  try {
    const { fieldType } = req.params;
    
    const rules = await validationService.getRulesForFieldType(fieldType);
    
    res.json({
      success: true,
      rules,
    });
  } catch (error: any) {
    console.error("[Validation] Get rules error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get validation rules",
      error: error.message,
    });
  }
});

/**
 * GET /api/validate/stats
 * Get validation statistics for the current user (requires auth)
 */
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).session?.userId;
    
    const stats = await validationService.getUserValidationStats(userId);
    
    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error("[Validation] Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get validation statistics",
      error: error.message,
    });
  }
});

/**
 * POST /api/validate/rules (Admin only)
 * Create or update validation rules
 */
router.post("/rules", requireAuth, adminOnly, async (req, res) => {
  try {
    const rule = await validationService.createOrUpdateRule(req.body);
    
    res.json({
      success: true,
      rule,
    });
  } catch (error: any) {
    console.error("[Validation] Create rule error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create validation rule",
      error: error.message,
    });
  }
});

export default router;