/**
 * Transcription Services Schema
 * 
 * Tables for audio transcription and transcript editing.
 * Supports multi-speaker detection and segment-level editing.
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, index, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

// ==================== Tables ====================

/**
 * Transcriptions Table
 * 
 * Stores audio transcriptions and their metadata.
 * Supports segment-level timestamps for precise editing.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Owner of the transcription
 * - audioUrl: URL to the audio file
 * - transcript: Full transcribed text
 * - duration: Audio duration in seconds
 * - language: Language of the audio (ISO code)
 * - segments: Array of timed segments with speaker detection
 * - metadata: Additional transcription metadata
 * - status: Processing status
 * - createdAt: Creation timestamp
 * - updatedAt: Last update timestamp
 * 
 * Indexes:
 * - userId: For user-specific queries
 * - status: For status filtering
 * - createdAt: For temporal queries
 */
export const transcriptions = pgTable("transcriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  audioUrl: text("audio_url").notNull(),
  transcript: text("transcript").notNull(),
  duration: real("duration").notNull(), // Duration in seconds
  language: text("language").notNull().default('en'),
  segments: jsonb("segments").$type<Array<{
    id: string;
    start: number; // Start time in seconds
    end: number; // End time in seconds
    text: string;
    confidence?: number;
    speaker?: string; // For multi-speaker detection (future feature)
  }>>().notNull().default([]),
  metadata: jsonb("metadata").$type<{
    modelVersion?: string; // Whisper model used
    audioFormat?: string;
    sampleRate?: number;
    bitrate?: number;
    processingTime?: number;
    errorDetails?: string;
    title?: string; // User-provided title
    description?: string; // User-provided description
    tags?: string[]; // User-defined tags
  }>(),
  status: text("status", {
    enum: ["processing", "completed", "failed"]
  }).notNull().default("processing"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("transcriptions_user_id_idx").on(table.userId),
  index("transcriptions_status_idx").on(table.status),
  index("transcriptions_created_at_idx").on(table.createdAt),
]);

/**
 * Transcript Edits Table
 * 
 * Tracks user edits to transcriptions for accuracy improvement.
 * Helps train and improve transcription models over time.
 * 
 * Fields:
 * - id: UUID primary key
 * - transcriptionId: Reference to parent transcription
 * - userId: User who made the edit
 * - originalSegment: Text before editing
 * - editedSegment: Text after editing
 * - timestamp: Position in audio (seconds)
 * - editType: Type of edit made
 * - confidence: Confidence level of the edit
 * - createdAt: When the edit was made
 * - updatedAt: Last update timestamp
 * 
 * Indexes:
 * - transcriptionId: For transcription-specific queries
 * - userId: For user-specific queries
 * - createdAt: For temporal queries
 */
export const transcriptEdits = pgTable("transcript_edits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transcriptionId: varchar("transcription_id").notNull().references(() => transcriptions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  originalSegment: text("original_segment").notNull(),
  editedSegment: text("edited_segment").notNull(),
  timestamp: real("timestamp").notNull(), // Position in audio (seconds)
  editType: text("edit_type", {
    enum: ["spelling", "punctuation", "speaker", "content", "other"]
  }).notNull().default("other"),
  confidence: real("confidence").notNull().default(100),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("transcript_edits_transcription_id_idx").on(table.transcriptionId),
  index("transcript_edits_user_id_idx").on(table.userId),
  index("transcript_edits_created_at_idx").on(table.createdAt),
]);

// ==================== Zod Schemas & Type Exports ====================

export const transcriptionStatusSchema = z.enum(["processing", "completed", "failed"]);
export const editTypeSchema = z.enum(["spelling", "punctuation", "speaker", "content", "other"]);

// Transcriptions
export const insertTranscriptionSchema = createInsertSchema(transcriptions)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    status: transcriptionStatusSchema.default("processing"),
    duration: z.number().positive(),
    language: z.string().default('en'),
    segments: z.array(z.object({
      id: z.string(),
      start: z.number().nonnegative(),
      end: z.number().positive(),
      text: z.string(),
      confidence: z.number().min(0).max(1).optional(),
      speaker: z.string().optional(),
    })).default([]),
  });

export type InsertTranscription = z.infer<typeof insertTranscriptionSchema>;
export type Transcription = typeof transcriptions.$inferSelect;

// Transcript Edits
export const insertTranscriptEditSchema = createInsertSchema(transcriptEdits)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    editType: editTypeSchema.default("other"),
    confidence: z.number().min(0).max(100).default(100),
    timestamp: z.number().nonnegative(),
  });

export type InsertTranscriptEdit = z.infer<typeof insertTranscriptEditSchema>;
export type TranscriptEdit = typeof transcriptEdits.$inferSelect;