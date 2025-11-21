/**
 * Form Handling Schema
 * 
 * Tables for auto-save, smart completion, validation, and form analytics.
 * Includes ML-based pattern detection and personalized suggestions.
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, index, jsonb, real, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

// ==================== TypeScript Interfaces ====================

/**
 * Auto-save metadata
 * Stores editor state and device information for cross-device sync
 */
export interface AutoSaveData {
  /** Cursor position in the editor (character offset) */
  cursorPosition?: number;
  /** Scroll position (pixels from top) */
  scrollPosition?: number;
  /** Currently selected text */
  selectedText?: string;
  /** Editor-specific state (Draft.js, ProseMirror, etc.) */
  editorState?: any;
  /** Device information for cross-device sync */
  deviceInfo?: {
    browser?: string;
    os?: string;
    screenSize?: string;
  };
}

// ==================== Tables ====================

/**
 * Auto-Save Drafts Table
 * 
 * Stores automatic saves of user content across different document types.
 * Supports version control and conflict resolution.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Owner of the draft
 * - documentId: Unique document identifier
 * - documentType: Type of document (chat, recipe, note, etc.)
 * - content: Saved content
 * - contentHash: Hash for duplicate detection
 * - version: Version number
 * - metadata: Editor state and device info
 * - savedAt: Save timestamp
 * - isAutoSave: Whether it's an auto-save
 * - conflictResolved: Whether conflicts were resolved
 * 
 * Indexes:
 * - userId: For user-specific queries
 * - documentId + userId: For document lookup
 * - savedAt: For temporal queries
 * - documentId + userId + version: Unique constraint
 */
export const autoSaveDrafts = pgTable("auto_save_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  documentId: varchar("document_id").notNull(),
  documentType: text("document_type").$type<"chat" | "recipe" | "note" | "meal_plan" | "shopping_list" | "other">(),
  
  content: text("content").notNull(),
  contentHash: varchar("content_hash"),
  version: integer("version").notNull().default(1),
  
  // Editor state and device information (using AutoSaveData interface)
  metadata: jsonb("metadata").$type<AutoSaveData>(),
  
  savedAt: timestamp("saved_at").notNull().defaultNow(),
  isAutoSave: boolean("is_auto_save").notNull().default(true),
  conflictResolved: boolean("conflict_resolved").default(false),
}, (table) => [
  index("auto_save_drafts_user_id_idx").on(table.userId),
  index("auto_save_drafts_document_idx").on(table.documentId, table.userId),
  index("auto_save_drafts_saved_at_idx").on(table.savedAt),
  uniqueIndex("auto_save_drafts_unique_version_idx").on(table.documentId, table.userId, table.version),
]);

/**
 * Save Patterns Table
 * 
 * Stores user typing patterns for intelligent pause detection.
 * Uses TensorFlow.js to learn optimal save timings per user.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: User whose patterns are tracked
 * - avgPauseDuration: Average pause between typing bursts (ms)
 * - typingSpeed: Average words per minute
 * - saveFrequency: Average saves per minute
 * - sentencePauseDuration: Average pause after sentences (ms)
 * - paragraphPauseDuration: Average pause after paragraphs (ms)
 * - preferredSaveInterval: Preferred save interval (ms)
 * - patternData: Detailed pattern histograms
 * - modelWeights: ML model weights for prediction
 * - lastUpdated: Last update timestamp
 * - samplesCollected: Number of samples collected
 * 
 * Indexes:
 * - userId: Unique index for user lookup
 */
export const savePatterns = pgTable("save_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Basic typing metrics
  avgPauseDuration: real("avg_pause_duration").default(2000), // milliseconds
  typingSpeed: real("typing_speed").default(40), // words per minute
  saveFrequency: real("save_frequency").default(0.5), // saves per minute
  
  // Detailed pause patterns
  sentencePauseDuration: real("sentence_pause_duration").default(2500),
  paragraphPauseDuration: real("paragraph_pause_duration").default(4000),
  preferredSaveInterval: real("preferred_save_interval").default(3000),
  
  // ML model data
  patternData: jsonb("pattern_data").$type<{
    pauseHistogram?: number[];
    keystrokeIntervals?: number[];
    burstLengths?: number[];
    timeOfDayPreferences?: Record<string, number>;
    contentTypePatterns?: Record<string, any>;
  }>(),
  
  modelWeights: jsonb("model_weights").$type<{
    weights?: number[][];
    bias?: number[];
    version?: string;
    accuracy?: number;
  }>(),
  
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  samplesCollected: integer("samples_collected").default(0),
}, (table) => [
  uniqueIndex("save_patterns_user_idx").on(table.userId),
]);

/**
 * Form Completions Table
 * 
 * Stores common form field completions and patterns.
 * Used for intelligent auto-complete suggestions.
 * 
 * Fields:
 * - id: UUID primary key
 * - fieldName: Name of the form field
 * - fieldType: Type of field (email, tel, address, etc.)
 * - commonValues: Most common values with usage counts
 * - patterns: Regex patterns for validation
 * - contextRules: Context-dependent suggestions
 * - globalUsageCount: Total usage count
 * - lastUpdated: Last update timestamp
 * - createdAt: Creation timestamp
 * 
 * Indexes:
 * - fieldName: Unique index for field lookup
 * - lastUpdated: For cache invalidation
 */
export const formCompletions = pgTable("form_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fieldName: text("field_name").notNull(),
  fieldType: text("field_type"), // 'email', 'tel', 'address', 'city', 'state', etc.
  
  commonValues: jsonb("common_values").$type<Array<{
    value: string;
    count: number;
    lastUsed: string; // ISO date
    metadata?: Record<string, any>;
  }>>(),
  
  patterns: jsonb("patterns").$type<Array<{
    regex: string;
    description: string;
    priority: number;
  }>>(),
  
  contextRules: jsonb("context_rules").$type<Array<{
    condition: string; // e.g., "if field:country = 'USA'"
    suggestions: string[];
    priority: number;
  }>>(),
  
  globalUsageCount: integer("global_usage_count").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("form_completions_field_idx").on(table.fieldName),
  index("form_completions_updated_idx").on(table.lastUpdated),
]);

/**
 * User Form History Table
 * 
 * Tracks individual user's form input history for personalized suggestions.
 * Respects privacy settings and allows selective history clearing.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: User whose history is tracked
 * - fieldName: Name of the form field
 * - valuesUsed: Values used with frequency
 * - frequencyMap: Value frequency map
 * - lastSequence: Last form fill sequence
 * - preferences: User's auto-fill preferences
 * - lastUpdated: Last update timestamp
 * - createdAt: Creation timestamp
 * 
 * Indexes:
 * - userId + fieldName: Unique index for user-field lookup
 * - userId: For user-specific queries
 */
export const userFormHistory = pgTable("user_form_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fieldName: text("field_name").notNull(),
  
  valuesUsed: jsonb("values_used").$type<Array<{
    value: string;
    count: number;
    lastUsed: string; // ISO date
    context?: Record<string, any>; // Page, time of day, etc.
  }>>(),
  
  frequencyMap: jsonb("frequency_map").$type<Record<string, number>>(),
  
  lastSequence: jsonb("last_sequence").$type<Array<{
    fieldName: string;
    value: string;
    timestamp: string;
  }>>(),
  
  preferences: jsonb("preferences").$type<{
    autoFillEnabled?: boolean;
    rememberValues?: boolean;
    suggestSimilar?: boolean;
    privacyMode?: boolean;
  }>(),
  
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("user_form_history_user_field_idx").on(table.userId, table.fieldName),
  index("user_form_history_user_idx").on(table.userId),
]);

/**
 * Completion Feedback Table
 * 
 * Tracks user interactions with auto-complete suggestions.
 * Used to improve suggestion accuracy and relevance.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: User who provided feedback
 * - fieldName: Field name
 * - suggestionId: ID of the suggestion
 * - suggestedValue: Value that was suggested
 * - wasSelected: Whether suggestion was selected
 * - finalValue: Final value entered
 * - context: Additional context
 * - responseTime: Time to respond (ms)
 * - confidence: Model confidence score
 * - createdAt: Creation timestamp
 * 
 * Indexes:
 * - userId: For user-specific queries
 * - fieldName: For field-specific analysis
 * - createdAt: For temporal queries
 */
export const completionFeedback = pgTable("completion_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  
  fieldName: text("field_name").notNull(),
  suggestionId: varchar("suggestion_id"),
  suggestedValue: text("suggested_value"),
  wasSelected: boolean("was_selected").notNull(),
  finalValue: text("final_value"),
  
  context: jsonb("context").$type<{
    pageUrl?: string;
    formId?: string;
    otherFields?: Record<string, string>;
    deviceType?: string;
    timestamp?: string;
  }>(),
  
  responseTime: integer("response_time"), // milliseconds
  confidence: real("confidence"), // Model confidence score (0-1)
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("completion_feedback_user_id_idx").on(table.userId),
  index("completion_feedback_field_idx").on(table.fieldName),
  index("completion_feedback_created_idx").on(table.createdAt),
]);

/**
 * Validation Rules Table
 * 
 * Stores smart validation rules for form fields.
 * Includes patterns, formatters, and error messages.
 * 
 * Fields:
 * - id: UUID primary key
 * - fieldType: Type of field (phone, email, zip, etc.)
 * - rules: Validation rules (patterns, formatters, validators)
 * - errorMessages: Custom error messages
 * - suggestions: Auto-correct and format hints
 * - exampleValues: Example valid values
 * - performanceMetrics: Rule performance metrics
 * - isActive: Whether rule is active
 * - priority: Rule priority
 * - createdAt: Creation timestamp
 * - updatedAt: Last update timestamp
 * 
 * Indexes:
 * - fieldType: Unique index for field type lookup
 * - isActive: For filtering active rules
 */
export const validationRules = pgTable("validation_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fieldType: text("field_type").notNull(), // phone, email, zip, ssn, date, etc.
  
  rules: jsonb("rules").$type<{
    patterns: Array<{ regex: string; flags?: string; description?: string }>;
    formatters?: Array<{ from: string; to: string }>;
    validators?: Array<{ type: string; params?: any }>;
    lengthConstraints?: { min?: number; max?: number };
    characterConstraints?: { allowed?: string; forbidden?: string };
  }>().notNull().default({
    patterns: []
  }),
  
  errorMessages: jsonb("error_messages").$type<{
    default?: string;
    tooShort?: string;
    tooLong?: string;
    invalidFormat?: string;
    missing?: string;
    [key: string]: string | undefined;
  }>().notNull().default({
    default: "Please enter a valid value"
  }),
  
  suggestions: jsonb("suggestions").$type<{
    autoCorrect?: Array<{ pattern: string; replacement: string }>;
    formatHints?: string[];
    commonMistakes?: Array<{ mistake: string; correction: string }>;
    quickFixes?: Array<{ label: string; action: string; value?: string }>;
  }>().notNull().default({}),
  
  exampleValues: text("example_values").array(),
  
  aiConfig: jsonb("ai_config").$type<{
    enabled?: boolean;
    modelPreference?: string;
    temperature?: number;
    maxSuggestions?: number;
    contextWindow?: number;
    customPrompts?: Record<string, string>;
  }>(),
  
  performanceMetrics: jsonb("performance_metrics").$type<{
    avgValidationTime?: number;
    successRate?: number;
    falsePositiveRate?: number;
    usageCount?: number;
  }>(),
  
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("validation_rules_field_type_idx").on(table.fieldType),
  index("validation_rules_active_idx").on(table.isActive),
]);

/**
 * Validation Errors Table
 * 
 * Tracks validation errors for pattern analysis.
 * Helps identify common mistakes and improve UX.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: User who encountered the error
 * - fieldName: Field name
 * - fieldType: Field type
 * - errorType: Type of error
 * - originalValue: Value that failed validation
 * - suggestedValue: AI-suggested correction
 * - finalValue: Final value entered
 * - userResolution: How user resolved the error
 * - frequency: How often this error occurs
 * - context: Additional context
 * - createdAt: Creation timestamp
 * 
 * Indexes:
 * - userId: For user-specific queries
 * - fieldType: For field type analysis
 * - errorType: For error pattern analysis
 * - createdAt: For temporal queries
 */
export const validationErrors = pgTable("validation_errors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  
  fieldName: text("field_name").notNull(),
  fieldType: text("field_type").notNull(),
  errorType: text("error_type").notNull(), // format, length, required, custom, ai_suggestion
  
  originalValue: text("original_value"),
  suggestedValue: text("suggested_value"),
  finalValue: text("final_value"),
  userResolution: text("user_resolution"), // accepted_suggestion, manual_correction, ignored, abandoned
  
  frequency: integer("frequency").notNull().default(1),
  
  context: jsonb("context").$type<{
    formId?: string;
    pageUrl?: string;
    otherFields?: Record<string, any>;
    sessionId?: string;
    deviceInfo?: {
      userAgent?: string;
      viewport?: { width: number; height: number };
      locale?: string;
    };
  }>(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("validation_errors_user_id_idx").on(table.userId),
  index("validation_errors_field_type_idx").on(table.fieldType),
  index("validation_errors_error_type_idx").on(table.errorType),
  index("validation_errors_created_idx").on(table.createdAt),
]);

// ==================== Zod Schemas & Type Exports ====================

export const documentTypeSchema = z.enum(["chat", "recipe", "note", "meal_plan", "shopping_list", "other"]);
export const errorTypeSchema = z.enum(["format", "length", "required", "custom", "ai_suggestion"]);
export const userResolutionSchema = z.enum(["accepted_suggestion", "manual_correction", "ignored", "abandoned"]);

// Auto-Save Drafts
export const insertAutoSaveDraftSchema = createInsertSchema(autoSaveDrafts)
  .extend({
    documentType: documentTypeSchema.optional(),
    version: z.number().min(1).default(1),
  });

export type InsertAutoSaveDraft = z.infer<typeof insertAutoSaveDraftSchema>;
export type AutoSaveDraft = typeof autoSaveDrafts.$inferSelect;

// Save Patterns
export const insertSavePatternSchema = createInsertSchema(savePatterns)
  .extend({
    avgPauseDuration: z.number().positive().default(2000),
    typingSpeed: z.number().positive().default(40),
    saveFrequency: z.number().positive().default(0.5),
  });

export type InsertSavePattern = z.infer<typeof insertSavePatternSchema>;
export type SavePattern = typeof savePatterns.$inferSelect;

// Form Completions
export const insertFormCompletionSchema = createInsertSchema(formCompletions)
  .extend({
    globalUsageCount: z.number().nonnegative().default(0),
  });

export type InsertFormCompletion = z.infer<typeof insertFormCompletionSchema>;
export type FormCompletion = typeof formCompletions.$inferSelect;

// User Form History
export const insertUserFormHistorySchema = createInsertSchema(userFormHistory);

export type InsertUserFormHistory = z.infer<typeof insertUserFormHistorySchema>;
export type UserFormHistory = typeof userFormHistory.$inferSelect;

// Completion Feedback
export const insertCompletionFeedbackSchema = createInsertSchema(completionFeedback)
  .extend({
    wasSelected: z.boolean(),
    confidence: z.number().min(0).max(1).optional(),
  });

export type InsertCompletionFeedback = z.infer<typeof insertCompletionFeedbackSchema>;
export type CompletionFeedback = typeof completionFeedback.$inferSelect;

// Validation Rules
export const insertValidationRuleSchema = createInsertSchema(validationRules)
  .extend({
    priority: z.number().default(0),
    isActive: z.boolean().default(true),
  });

export type InsertValidationRule = z.infer<typeof insertValidationRuleSchema>;
export type ValidationRule = typeof validationRules.$inferSelect;

// Validation Errors
export const insertValidationErrorSchema = createInsertSchema(validationErrors)
  .extend({
    errorType: errorTypeSchema,
    userResolution: userResolutionSchema.optional(),
    frequency: z.number().min(1).default(1),
  });

export type InsertValidationError = z.infer<typeof insertValidationErrorSchema>;
export type ValidationError = typeof validationErrors.$inferSelect;