import { z } from 'zod';

// External API Response Schemas
export const usdaNutritionSchema = z.object({
  calories: z.number().min(0).default(0),
  protein: z.number().min(0).default(0),
  carbs: z.number().min(0).default(0),
  fat: z.number().min(0).default(0),
  fiber: z.number().min(0).optional(),
  sugar: z.number().min(0).optional(),
  sodium: z.number().min(0).optional(),
  servingSize: z.string().default("100"),
  servingUnit: z.string().default("g"),
});

export const usdaFoodItemSchema = z.object({
  fdcId: z.number(),
  description: z.string(),
  dataType: z.string(),
  brandOwner: z.string().optional(),
  gtinUpc: z.string().optional(),
  ingredients: z.string().optional(),
  foodCategory: z.string().optional(),
  servingSize: z.number().optional(),
  servingSizeUnit: z.string().optional(),
  nutrition: usdaNutritionSchema.optional(),
});

export const barcodeLookupProductSchema = z.object({
  barcode_number: z.string().optional(),
  title: z.string().optional(),
  brand: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  images: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
});

// Request validation schemas with enhanced security
export const searchQuerySchema = z.object({
  query: z.string()
    .min(1, "Query is required")
    .max(200, "Query too long")
    .transform(val => val.trim())
    .refine(val => !/<|>|script/i.test(val), "Invalid characters in query"),
  pageSize: z.coerce.number().min(1).max(100).default(25),
  pageNumber: z.coerce.number().min(1).default(1),
  dataType: z.union([
    z.string().transform(val => val.split(',').map(t => t.trim()).filter(Boolean)),
    z.array(z.string())
  ]).optional(),
  sortBy: z.enum(['dataType.keyword', 'lowercaseDescription.keyword', 'fdcId', 'publishedDate']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  brandOwner: z.union([
    z.string().transform(val => [val]),
    z.array(z.string())
  ]).optional(),
});

export const barcodeQuerySchema = z.object({
  barcode: z.string()
    .min(1, "Barcode is required")
    .max(50, "Barcode too long")
    .regex(/^[a-zA-Z0-9-]+$/, "Invalid barcode format"),
});

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((date) => {
    const d = new Date(date);
    return !isNaN(d.getTime());
  }, "Invalid date");

export const feedbackContentSchema = z.string()
  .min(10, "Feedback must be at least 10 characters")
  .max(5000, "Feedback too long")
  .transform(val => val.trim())
  .refine(val => !/<script|javascript:|on\w+=/i.test(val), "Invalid content detected");

export const imageUploadSchema = z.object({
  imageURL: z.string()
    .min(1, "Image URL is required")
    .max(500, "URL too long")
    .refine(val => !val.includes('..'), "Invalid path traversal detected"),
});

// Helper function to validate and sanitize external API responses
export function validateExternalApiResponse<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  fallback?: T
): T | null {
  try {
    return schema.parse(data);
  } catch (error) {
    console.error('External API response validation failed:', error);
    return fallback ?? null;
  }
}