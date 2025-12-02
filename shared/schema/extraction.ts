/**
 * Data Extraction Schema
 *
 * Tables for structured data extraction from unstructured content.
 * Supports template-based extraction with validation and confidence scoring.
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  index,
  jsonb,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== Tables ====================

/**
 * Extraction Templates Table
 *
 * Defines templates for extracting structured data from text.
 * Uses AI to map unstructured content to defined schemas.
 *
 * Fields:
 * - id: UUID primary key
 * - name: Template name
 * - description: Template description
 * - schema: JSON schema defining extraction fields
 * - exampleText: Example input text
 * - systemPrompt: Custom prompt for extraction model
 * - extractionConfig: Model configuration
 * - isActive: Whether template is active
 * - createdBy: Creator user ID
 * - usageCount: Number of times used
 * - createdAt: Creation timestamp
 * - updatedAt: Last update timestamp
 *
 * Indexes:
 * - name: For name-based lookup
 * - isActive: For filtering active templates
 * - createdBy: For user-specific templates
 */
export const extractionTemplates = pgTable(
  "extraction_templates",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    description: text("description"),
    schema: jsonb("schema")
      .$type<{
        fields: Array<{
          name: string;
          type: "string" | "number" | "date" | "boolean" | "array" | "object";
          description: string;
          required?: boolean;
          validation?: any;
          examples?: string[];
        }>;
        outputFormat?: "json" | "table" | "csv";
      }>()
      .notNull(),
    exampleText: text("example_text"),
    systemPrompt: text("system_prompt"),
    extractionConfig: jsonb("extraction_config")
      .$type<{
        model?: string;
        temperature?: number;
        maxRetries?: number;
        confidenceThreshold?: number;
        enableStructuredOutput?: boolean;
      }>()
      .default({
        model: "gpt-3.5-turbo",
        temperature: 0.3,
        maxRetries: 2,
        confidenceThreshold: 0.85,
        enableStructuredOutput: true,
      }),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: varchar("created_by"),
    usageCount: integer("usage_count").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("extraction_templates_name_idx").on(table.name),
    index("extraction_templates_is_active_idx").on(table.isActive),
    index("extraction_templates_created_by_idx").on(table.createdBy),
  ],
);

/**
 * Extracted Data Table
 *
 * Stores extracted structured data from various sources.
 * Includes validation status and confidence scores.
 *
 * Fields:
 * - id: UUID primary key
 * - sourceId: ID of the source content
 * - sourceType: Type of source (email, document, etc.)
 * - templateId: Template used for extraction
 * - inputText: Original text input
 * - extractedFields: Extracted data as JSON
 * - confidence: Overall confidence score (0-1)
 * - fieldConfidence: Per-field confidence scores
 * - validationStatus: Current validation status
 * - validationErrors: List of validation errors
 * - corrections: Manual corrections applied
 * - metadata: Additional metadata
 * - extractedAt: Extraction timestamp
 * - validatedAt: Validation timestamp
 * - validatedBy: Validator user ID
 *
 * Indexes:
 * - sourceId: For source lookup
 * - templateId: For template-based queries
 * - validationStatus: For status filtering
 * - extractedAt: For temporal queries
 */
export const extractedData = pgTable(
  "extracted_data",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    sourceId: varchar("source_id"),
    sourceType: varchar("source_type").notNull(), // email, document, message, web, api
    templateId: varchar("template_id").references(
      () => extractionTemplates.id,
      { onDelete: "set null" },
    ),
    inputText: text("input_text").notNull(),
    extractedFields: jsonb("extracted_fields")
      .$type<Record<string, any>>()
      .notNull(),
    confidence: real("confidence").notNull().default(0), // 0-1 confidence score
    fieldConfidence: jsonb("field_confidence").$type<Record<string, number>>(),
    validationStatus: varchar("validation_status").notNull().default("pending"), // pending, validated, corrected, rejected
    validationErrors: jsonb("validation_errors").$type<string[]>(),
    corrections: jsonb("corrections").$type<Record<string, any>>(),
    metadata: jsonb("metadata").$type<{
      processingTime?: number;
      modelUsed?: string;
      tokenCount?: number;
      retryCount?: number;
      batchId?: string;
      tags?: string[];
    }>(),
    extractedAt: timestamp("extracted_at").defaultNow(),
    validatedAt: timestamp("validated_at"),
    validatedBy: varchar("validated_by"),
  },
  (table) => [
    index("extracted_data_source_id_idx").on(table.sourceId),
    index("extracted_data_template_id_idx").on(table.templateId),
    index("extracted_data_validation_status_idx").on(table.validationStatus),
    index("extracted_data_extracted_at_idx").on(table.extractedAt),
  ],
);

// ==================== Zod Schemas & Type Exports ====================

export const fieldTypeSchema = z.enum([
  "string",
  "number",
  "date",
  "boolean",
  "array",
  "object",
]);
export const outputFormatSchema = z.enum(["json", "table", "csv"]);
export const validationStatusSchema = z.enum([
  "pending",
  "validated",
  "corrected",
  "rejected",
]);
export const sourceTypeSchema = z.enum([
  "email",
  "document",
  "message",
  "web",
  "api",
]);

// Extraction Templates
export const insertExtractionTemplateSchema = createInsertSchema(
  extractionTemplates,
).extend({
  schema: z.object({
    fields: z.array(
      z.object({
        name: z.string(),
        type: fieldTypeSchema,
        description: z.string(),
        required: z.boolean().optional(),
        validation: z.any().optional(),
        examples: z.array(z.string()).optional(),
      }),
    ),
    outputFormat: outputFormatSchema.optional(),
  }),
  extractionConfig: z
    .object({
      model: z.string().default("gpt-3.5-turbo"),
      temperature: z.number().min(0).max(2).default(0.3),
      maxRetries: z.number().min(0).max(5).default(2),
      confidenceThreshold: z.number().min(0).max(1).default(0.85),
      enableStructuredOutput: z.boolean().default(true),
    })
    .default({
      model: "gpt-3.5-turbo",
      temperature: 0.3,
      maxRetries: 2,
      confidenceThreshold: 0.85,
      enableStructuredOutput: true,
    }),
});

export type InsertExtractionTemplate = z.infer<
  typeof insertExtractionTemplateSchema
>;
export type ExtractionTemplate = typeof extractionTemplates.$inferSelect;

// Extracted Data
export const insertExtractedDataSchema = createInsertSchema(
  extractedData,
).extend({
  sourceType: sourceTypeSchema,
  validationStatus: validationStatusSchema.default("pending"),
  confidence: z.number().min(0).max(1).default(0),
});

export type InsertExtractedData = z.infer<typeof insertExtractedDataSchema>;
export type ExtractedData = typeof extractedData.$inferSelect;
