/**
 * AI & ML Features Schema
 * 
 * Tables for AI-powered features including conversations, voice commands, content generation,
 * summarization, translation, and writing assistance.
 * 
 * NOTE: The conversations, messages, and conversationContext tables appear to be legacy
 * chat system tables that may need to be removed or migrated.
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, index, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";
import { userRecipes } from "./food";

// ==================== TypeScript Interfaces ====================

/**
 * Voice command metadata
 */
export interface VoiceCommandMetadata {
  language?: string;
  accent?: string;
  audioFormat?: string;
  duration?: number;
  deviceType?: string;
  [key: string]: any;
}

/**
 * Writing session metadata
 */
export interface WritingSessionMetadata {
  wordCount?: number;
  characterCount?: number;
  readingTime?: number;
  language?: string;
  format?: string;
  [key: string]: any;
}

// ==================== Active AI/ML Features ====================
// Note: Legacy chat tables (conversations, messages, conversationContext) have been removed.
// These were replaced by the newer userChats system in food.ts.

/**
 * Voice Commands Table
 * 
 * Voice command processing and transcription.
 */
export const voiceCommands = pgTable("voice_commands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  audioUrl: text("audio_url"),
  transcription: text("transcription").notNull(),
  intent: text("intent"), // Detected intent
  confidence: real("confidence"), // 0-1
  action: text("action"), // Action taken
  result: jsonb("result").$type<Record<string, any>>(),
  metadata: jsonb("metadata").$type<VoiceCommandMetadata>(),
  processingTime: integer("processing_time"), // milliseconds
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("voice_commands_user_id_idx").on(table.userId),
  index("voice_commands_intent_idx").on(table.intent),
  index("voice_commands_created_at_idx").on(table.createdAt),
]);

/**
 * Draft Templates Table
 * 
 * Templates for content generation.
 */
export const draftTemplates = pgTable("draft_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'email', 'document', 'social', 'recipe'
  templateContent: text("template_content").notNull(),
  variables: jsonb("variables").$type<string[]>(), // Placeholders in template
  tone: text("tone"), // 'formal', 'casual', 'professional'
  language: text("language").default('en'),
  isPublic: boolean("is_public").notNull().default(false),
  usageCount: integer("usage_count").default(0),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("draft_templates_category_idx").on(table.category),
  index("draft_templates_is_public_idx").on(table.isPublic),
]);

/**
 * Generated Drafts Table
 * 
 * AI-generated content drafts.
 */
export const generatedDrafts = pgTable("generated_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  templateId: varchar("template_id").references(() => draftTemplates.id, { onDelete: "set null" }),
  prompt: text("prompt").notNull(),
  generatedContent: text("generated_content").notNull(),
  editedContent: text("edited_content"),
  contentType: text("content_type"), // 'text', 'markdown', 'html'
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  tokensUsed: integer("tokens_used"),
  generationTime: integer("generation_time"), // milliseconds
  rating: integer("rating"), // 1-5
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("generated_drafts_user_id_idx").on(table.userId),
  index("generated_drafts_template_id_idx").on(table.templateId),
  index("generated_drafts_created_at_idx").on(table.createdAt),
]);

/**
 * Writing Sessions Table
 * 
 * Track writing assistance sessions.
 */
export const writingSessions = pgTable("writing_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  documentId: varchar("document_id"),
  sessionType: text("session_type").notNull(), // 'new', 'edit', 'review'
  startContent: text("start_content"),
  endContent: text("end_content"),
  metadata: jsonb("metadata").$type<WritingSessionMetadata>(),
  suggestionsAccepted: integer("suggestions_accepted").default(0),
  suggestionsRejected: integer("suggestions_rejected").default(0),
  duration: integer("duration"), // seconds
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
}, (table) => [
  index("writing_sessions_user_id_idx").on(table.userId),
  index("writing_sessions_started_at_idx").on(table.startedAt),
]);

/**
 * Writing Suggestions Table
 * 
 * AI-powered writing suggestions and corrections.
 */
export const writingSuggestions = pgTable("writing_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => writingSessions.id, { onDelete: "cascade" }),
  suggestionType: text("suggestion_type").notNull(), // 'grammar', 'style', 'clarity', 'tone'
  originalText: text("original_text").notNull(),
  suggestedText: text("suggested_text").notNull(),
  reason: text("reason"),
  confidence: real("confidence"), // 0-1
  position: jsonb("position").$type<{ start: number; end: number }>(),
  isAccepted: boolean("is_accepted"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("writing_suggestions_session_id_idx").on(table.sessionId),
  index("writing_suggestions_suggestion_type_idx").on(table.suggestionType),
]);

/**
 * Summaries Table
 * 
 * AI-generated content summaries.
 */
export const summaries = pgTable("summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  sourceType: text("source_type").notNull(), // 'document', 'article', 'recipe', 'conversation'
  sourceId: varchar("source_id"),
  sourceUrl: text("source_url"),
  originalContent: text("original_content").notNull(),
  summary: text("summary").notNull(),
  summaryType: text("summary_type"), // 'brief', 'detailed', 'bullets', 'abstract'
  keyPoints: jsonb("key_points").$type<string[]>(),
  wordCountOriginal: integer("word_count_original"),
  wordCountSummary: integer("word_count_summary"),
  compressionRatio: real("compression_ratio"),
  language: text("language").default('en'),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("summaries_user_id_idx").on(table.userId),
  index("summaries_source_type_idx").on(table.sourceType),
  index("summaries_created_at_idx").on(table.createdAt),
]);

/**
 * Excerpts Table
 * 
 * Key excerpts extracted from content.
 */
export const excerpts = pgTable("excerpts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  summaryId: varchar("summary_id").references(() => summaries.id, { onDelete: "cascade" }),
  excerpt: text("excerpt").notNull(),
  importance: real("importance"), // 0-1
  category: text("category"), // 'quote', 'fact', 'opinion', 'conclusion'
  context: text("context"),
  position: integer("position"), // Order in original
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("excerpts_summary_id_idx").on(table.summaryId),
  index("excerpts_category_idx").on(table.category),
]);

/**
 * Excerpt Performance Table
 * 
 * Track how excerpts perform in different contexts.
 */
export const excerptPerformance = pgTable("excerpt_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  excerptId: varchar("excerpt_id").references(() => excerpts.id, { onDelete: "cascade" }),
  usageContext: text("usage_context"), // 'shared', 'cited', 'highlighted'
  engagementScore: real("engagement_score"), // 0-1
  clickThrough: boolean("click_through"),
  timeViewed: integer("time_viewed"), // seconds
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("excerpt_performance_excerpt_id_idx").on(table.excerptId),
  index("excerpt_performance_created_at_idx").on(table.createdAt),
]);

/**
 * Translations Table
 * 
 * AI-powered translations.
 */
export const translations = pgTable("translations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  sourceLanguage: text("source_language").notNull(),
  targetLanguage: text("target_language").notNull(),
  originalText: text("original_text").notNull(),
  translatedText: text("translated_text").notNull(),
  confidence: real("confidence"), // 0-1
  alternativeTranslations: jsonb("alternative_translations").$type<string[]>(),
  context: text("context"), // Additional context provided
  domain: text("domain"), // 'general', 'technical', 'medical', 'legal'
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("translations_user_id_idx").on(table.userId),
  index("translations_source_language_idx").on(table.sourceLanguage),
  index("translations_target_language_idx").on(table.targetLanguage),
  index("translations_created_at_idx").on(table.createdAt),
]);

/**
 * Language Preferences Table
 * 
 * User language preferences for translations.
 */
export const languagePreferences = pgTable("language_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  primaryLanguage: text("primary_language").notNull(),
  preferredLanguages: jsonb("preferred_languages").$type<string[]>(),
  autoTranslate: boolean("auto_translate").notNull().default(false),
  translationQuality: text("translation_quality"), // 'fast', 'balanced', 'high'
  preserveFormatting: boolean("preserve_formatting").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("language_preferences_user_id_idx").on(table.userId),
]);

// ==================== Zod Schemas & Type Exports ====================

export const roleSchema = z.enum(['user', 'assistant', 'system']);
export const contextTypeSchema = z.enum(['recipe', 'inventory', 'preference', 'history']);
export const intentSchema = z.enum(['search', 'add', 'remove', 'update', 'query', 'command']);
export const templateCategorySchema = z.enum(['email', 'document', 'social', 'recipe', 'letter', 'report']);
export const toneSchema = z.enum(['formal', 'casual', 'professional', 'friendly', 'persuasive']);
export const sessionTypeSchema = z.enum(['new', 'edit', 'review', 'collaborate']);
export const suggestionTypeSchema = z.enum(['grammar', 'style', 'clarity', 'tone', 'vocabulary']);
export const summaryTypeSchema = z.enum(['brief', 'detailed', 'bullets', 'abstract', 'executive']);
export const excerptCategorySchema = z.enum(['quote', 'fact', 'opinion', 'conclusion', 'statistic']);
export const translationQualitySchema = z.enum(['fast', 'balanced', 'high']);

// Note: Legacy chat schemas removed (conversations, messages, conversationContext)

// Active AI/ML feature schemas
export const insertVoiceCommandSchema = createInsertSchema(voiceCommands)
  .extend({
    confidence: z.number().min(0).max(1).optional(),
    processingTime: z.number().positive().optional(),
  });

export type InsertVoiceCommand = z.infer<typeof insertVoiceCommandSchema>;
export type VoiceCommand = typeof voiceCommands.$inferSelect;

export const insertDraftTemplateSchema = createInsertSchema(draftTemplates)
  .extend({
    category: templateCategorySchema,
    tone: toneSchema.optional(),
    language: z.string().length(2).default('en'),
    variables: z.array(z.string()).optional(),
  });

export type InsertDraftTemplate = z.infer<typeof insertDraftTemplateSchema>;
export type DraftTemplate = typeof draftTemplates.$inferSelect;

export const insertGeneratedDraftSchema = createInsertSchema(generatedDrafts)
  .extend({
    rating: z.number().min(1).max(5).optional(),
    tokensUsed: z.number().nonnegative().optional(),
    generationTime: z.number().positive().optional(),
  });

export type InsertGeneratedDraft = z.infer<typeof insertGeneratedDraftSchema>;
export type GeneratedDraft = typeof generatedDrafts.$inferSelect;

export const insertWritingSessionSchema = createInsertSchema(writingSessions)
  .extend({
    sessionType: sessionTypeSchema,
    duration: z.number().positive().optional(),
    suggestionsAccepted: z.number().nonnegative().default(0),
    suggestionsRejected: z.number().nonnegative().default(0),
  });

export type InsertWritingSession = z.infer<typeof insertWritingSessionSchema>;
export type WritingSession = typeof writingSessions.$inferSelect;

export const insertWritingSuggestionSchema = createInsertSchema(writingSuggestions)
  .extend({
    suggestionType: suggestionTypeSchema,
    confidence: z.number().min(0).max(1).optional(),
    position: z.object({
      start: z.number().nonnegative(),
      end: z.number().nonnegative(),
    }).optional(),
  });

export type InsertWritingSuggestion = z.infer<typeof insertWritingSuggestionSchema>;
export type WritingSuggestion = typeof writingSuggestions.$inferSelect;

export const insertSummarySchema = createInsertSchema(summaries)
  .extend({
    summaryType: summaryTypeSchema.optional(),
    keyPoints: z.array(z.string()).optional(),
    compressionRatio: z.number().positive().optional(),
    language: z.string().length(2).default('en'),
    tokensUsed: z.number().nonnegative().optional(),
  });

export type InsertSummary = z.infer<typeof insertSummarySchema>;
export type Summary = typeof summaries.$inferSelect;

export const insertTranslationSchema = createInsertSchema(translations)
  .extend({
    confidence: z.number().min(0).max(1).optional(),
    alternativeTranslations: z.array(z.string()).optional(),
    tokensUsed: z.number().nonnegative().optional(),
  });

export type InsertTranslation = z.infer<typeof insertTranslationSchema>;
export type Translation = typeof translations.$inferSelect;

// Export other types
export type Excerpt = typeof excerpts.$inferSelect;
export type ExcerptPerformance = typeof excerptPerformance.$inferSelect;
export type LanguagePreference = typeof languagePreferences.$inferSelect;