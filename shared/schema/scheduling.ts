/**
 * Meeting Scheduling Schema
 * 
 * Tables for intelligent meeting scheduling, preference learning, and conflict resolution.
 * Supports timezone-aware scheduling and optimal time suggestions.
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, index, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

// ==================== Tables ====================

/**
 * Scheduling Preferences Table
 * 
 * Stores user preferences for meeting scheduling.
 * Includes working hours, buffer times, and blocked periods.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: User whose preferences these are
 * - preferredTimes: Preferred meeting times by day
 * - timezone: User's timezone
 * - bufferTime: Minutes between meetings
 * - workingHours: Standard working hours
 * - blockedTimes: Recurring blocked periods
 * - meetingPreferences: Meeting type preferences
 * - createdAt: Creation timestamp
 * - updatedAt: Last update timestamp
 * 
 * Indexes:
 * - userId: Unique index for user lookup
 */
export const schedulingPreferences = pgTable("scheduling_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  preferredTimes: jsonb("preferred_times").$type<{
    monday?: Array<{ start: string; end: string; preference: number }>;
    tuesday?: Array<{ start: string; end: string; preference: number }>;
    wednesday?: Array<{ start: string; end: string; preference: number }>;
    thursday?: Array<{ start: string; end: string; preference: number }>;
    friday?: Array<{ start: string; end: string; preference: number }>;
    saturday?: Array<{ start: string; end: string; preference: number }>;
    sunday?: Array<{ start: string; end: string; preference: number }>;
  }>().notNull().default({}),
  timezone: varchar("timezone").notNull().default("America/New_York"),
  bufferTime: integer("buffer_time").notNull().default(15), // Minutes between meetings
  workingHours: jsonb("working_hours").$type<{
    start: string;
    end: string;
    daysOfWeek: number[];
  }>().notNull().default({
    start: "09:00",
    end: "17:00",
    daysOfWeek: [1, 2, 3, 4, 5] // Monday through Friday
  }),
  blockedTimes: jsonb("blocked_times").$type<Array<{
    start: string;
    end: string;
    recurring: boolean;
    daysOfWeek?: number[];
    reason?: string;
  }>>().notNull().default([]),
  meetingPreferences: jsonb("meeting_preferences").$type<{
    preferVideo?: boolean;
    preferMorning?: boolean;
    preferAfternoon?: boolean;
    maxDailyMeetings?: number;
    preferredDuration?: number;
    autoDeclineOutsideHours?: boolean;
  }>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("scheduling_preferences_user_id_idx").on(table.userId),
]);

/**
 * Meeting Suggestions Table
 * 
 * AI-generated optimal meeting time suggestions.
 * Considers all participants' preferences and constraints.
 * 
 * Fields:
 * - id: UUID primary key
 * - meetingId: Unique meeting identifier
 * - suggestedTimes: Array of suggested time slots
 * - confidenceScores: Confidence in suggestions
 * - participants: Array of participant IDs
 * - constraints: Meeting constraints
 * - metadata: Additional metadata
 * - createdAt: Creation timestamp
 * - selectedTime: Time slot that was selected
 * - selectedBy: User who selected the time
 * 
 * Indexes:
 * - meetingId: Unique index for meeting lookup
 * - createdAt: For temporal queries
 */
export const meetingSuggestions = pgTable("meeting_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").notNull().unique(),
  suggestedTimes: jsonb("suggested_times").$type<Array<{
    start: string;
    end: string;
    timezone: string;
    score: number;
    conflicts: Array<{ userId: string; severity: string; description: string }>;
    optimality: { timeZoneFit: number; preferenceMatch: number; scheduleDisruption: number };
  }>>().notNull(),
  confidenceScores: jsonb("confidence_scores").$type<{
    overall: number;
    timeZoneAlignment: number;
    preferenceAlignment: number;
    conflictAvoidance: number;
  }>().notNull(),
  participants: text("participants").array().notNull(),
  constraints: jsonb("constraints").$type<{
    duration: number;
    mustBeWithin?: { start: string; end: string };
    avoidDates?: string[];
    requireAllAttendees: boolean;
    allowWeekends?: boolean;
    preferredTimeOfDay?: string; // morning/afternoon/evening
  }>().notNull(),
  metadata: jsonb("metadata").$type<{
    reason?: string;
    priority?: string;
    meetingType?: string;
    location?: string;
    notes?: string;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  selectedTime: jsonb("selected_time").$type<{
    start: string;
    end: string;
    timezone: string;
  }>(),
  selectedBy: varchar("selected_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => [
  uniqueIndex("meeting_suggestions_meeting_id_idx").on(table.meetingId),
  index("meeting_suggestions_created_at_idx").on(table.createdAt),
]);

/**
 * Scheduling Patterns Table
 * 
 * Learns user's meeting patterns for better suggestions.
 * Tracks frequency, duration, and timing preferences.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: User whose patterns are tracked
 * - commonMeetingTimes: Most common meeting times
 * - meetingFrequency: Meeting frequency statistics
 * - patternType: Type of pattern (daily/weekly/monthly/adhoc)
 * - patternData: Detailed pattern data
 * - accuracyScore: Pattern prediction accuracy
 * - lastAnalyzed: Last analysis timestamp
 * - createdAt: Creation timestamp
 * - updatedAt: Last update timestamp
 * 
 * Indexes:
 * - userId: For user-specific queries
 * - patternType: For pattern type filtering
 */
export const schedulingPatterns = pgTable("scheduling_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  commonMeetingTimes: jsonb("common_meeting_times").$type<Array<{
    dayOfWeek: number;
    timeOfDay: string;
    duration: number;
    frequency: number;
    lastUsed: string;
  }>>().notNull().default([]),
  meetingFrequency: jsonb("meeting_frequency").$type<{
    daily: number;
    weekly: number;
    monthly: number;
    averagePerDay: number;
    peakDays: number[];
    peakHours: number[];
  }>().notNull(),
  patternType: varchar("pattern_type").notNull(), // daily/weekly/monthly/adhoc
  patternData: jsonb("pattern_data").$type<{
    recurringMeetings?: Array<{
      title: string;
      dayOfWeek: number;
      time: string;
      participants: string[];
    }>;
    preferredSequence?: Array<{
      type: string;
      duration: number;
      gap: number;
    }>;
    seasonalVariations?: Record<string, any>;
  }>().default({}),
  accuracyScore: integer("accuracy_score").default(0), // 0-100
  lastAnalyzed: timestamp("last_analyzed").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("scheduling_patterns_user_id_idx").on(table.userId),
  index("scheduling_patterns_pattern_type_idx").on(table.patternType),
]);

/**
 * Meeting Events Table
 * 
 * Stores scheduled meetings and their details.
 * Links to suggestions for tracking acceptance rates.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Meeting organizer
 * - title: Meeting title
 * - description: Meeting description
 * - startTime: Start time
 * - endTime: End time
 * - timezone: Timezone for the meeting
 * - participants: Array of participant emails
 * - location: Meeting location
 * - status: Meeting status (confirmed/tentative/cancelled)
 * - meetingSuggestionId: Link to suggestion used
 * - metadata: Additional meeting data
 * - createdAt: Creation timestamp
 * - updatedAt: Last update timestamp
 * 
 * Indexes:
 * - userId: For user-specific queries
 * - startTime: For time-based queries
 * - status: For status filtering
 */
export const meetingEvents = pgTable("meeting_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  timezone: varchar("timezone").notNull().default("America/New_York"),
  participants: text("participants").array().notNull().default([]),
  location: text("location"),
  status: varchar("status").notNull().default("confirmed"), // confirmed/tentative/cancelled
  meetingSuggestionId: varchar("meeting_suggestion_id").references(() => meetingSuggestions.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").$type<{
    isRecurring?: boolean;
    recurringPattern?: string;
    parentEventId?: string;
    source?: string; // manual/ai-suggested/imported
    importance?: string; // low/medium/high
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("meeting_events_user_id_idx").on(table.userId),
  index("meeting_events_start_time_idx").on(table.startTime),
  index("meeting_events_status_idx").on(table.status),
]);

// ==================== Zod Schemas & Type Exports ====================

export const meetingStatusSchema = z.enum(["confirmed", "tentative", "cancelled"]);
export const patternTypeSchema = z.enum(["daily", "weekly", "monthly", "adhoc"]);
export const importanceSchema = z.enum(["low", "medium", "high"]);
export const timeOfDaySchema = z.enum(["morning", "afternoon", "evening"]);

// Scheduling Preferences
export const insertSchedulingPreferencesSchema = createInsertSchema(schedulingPreferences)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    timezone: z.string().default("America/New_York"),
    bufferTime: z.number().min(0).max(120).default(15),
    workingHours: z.object({
      start: z.string(),
      end: z.string(),
      daysOfWeek: z.array(z.number().min(0).max(6)),
    }).default({
      start: "09:00",
      end: "17:00",
      daysOfWeek: [1, 2, 3, 4, 5]
    }),
  });

export type InsertSchedulingPreferences = z.infer<typeof insertSchedulingPreferencesSchema>;
export type SchedulingPreferences = typeof schedulingPreferences.$inferSelect;

// Meeting Suggestions
export const insertMeetingSuggestionsSchema = createInsertSchema(meetingSuggestions)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    constraints: z.object({
      duration: z.number().positive(),
      mustBeWithin: z.object({
        start: z.string(),
        end: z.string(),
      }).optional(),
      avoidDates: z.array(z.string()).optional(),
      requireAllAttendees: z.boolean(),
      allowWeekends: z.boolean().optional(),
      preferredTimeOfDay: timeOfDaySchema.optional(),
    }),
  });

export type InsertMeetingSuggestions = z.infer<typeof insertMeetingSuggestionsSchema>;
export type MeetingSuggestions = typeof meetingSuggestions.$inferSelect;

// Scheduling Patterns
export const insertSchedulingPatternsSchema = createInsertSchema(schedulingPatterns)
  .omit({
    id: true,
    lastAnalyzed: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    patternType: patternTypeSchema,
    accuracyScore: z.number().min(0).max(100).default(0),
  });

export type InsertSchedulingPatterns = z.infer<typeof insertSchedulingPatternsSchema>;
export type SchedulingPatterns = typeof schedulingPatterns.$inferSelect;

// Meeting Events
export const insertMeetingEventsSchema = createInsertSchema(meetingEvents)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    status: statusSchema.default("confirmed"),
    timezone: z.string().default("America/New_York"),
    participants: z.array(z.string()).default([]),
  });

export type InsertMeetingEvents = z.infer<typeof insertMeetingEventsSchema>;
export type MeetingEvents = typeof meetingEvents.$inferSelect;