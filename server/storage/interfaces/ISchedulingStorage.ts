/**
 * @file server/storage/interfaces/ISchedulingStorage.ts
 * @description Interface for meeting scheduling and appointment management operations
 */

import type {
  SchedulingPreferences,
  InsertSchedulingPreferences,
  MeetingSuggestions,
  InsertMeetingSuggestions,
  SchedulingPatterns,
  InsertSchedulingPatterns,
  MeetingEvents,
  InsertMeetingEvents,
} from "@shared/schema/scheduling";

export interface ISchedulingStorage {
  // ==================== Scheduling Preferences ====================
  getSchedulingPreferences(
    userId: string
  ): Promise<SchedulingPreferences | undefined>;
  upsertSchedulingPreferences(
    userId: string,
    preferences: Omit<InsertSchedulingPreferences, "userId">
  ): Promise<SchedulingPreferences>;
  deleteSchedulingPreferences(userId: string): Promise<void>;

  // ==================== Meeting Suggestions ====================
  getMeetingSuggestions(
    meetingId: string
  ): Promise<MeetingSuggestions | undefined>;
  getUserMeetingSuggestions(
    userId: string,
    status?: string
  ): Promise<MeetingSuggestions[]>;
  createMeetingSuggestions(
    suggestions: InsertMeetingSuggestions
  ): Promise<MeetingSuggestions>;
  updateMeetingSuggestionStatus(
    meetingId: string,
    selectedTime?: any,
    selectedBy?: string
  ): Promise<MeetingSuggestions>;
  deleteMeetingSuggestions(meetingId: string): Promise<void>;

  // ==================== Scheduling Patterns ====================
  getSchedulingPatterns(userId: string): Promise<SchedulingPatterns[]>;
  getSchedulingPatternByType(
    userId: string,
    patternType: string
  ): Promise<SchedulingPatterns | undefined>;
  upsertSchedulingPattern(
    userId: string,
    pattern: Omit<InsertSchedulingPatterns, "userId">
  ): Promise<SchedulingPatterns>;
  deleteSchedulingPattern(patternId: string): Promise<void>;
  analyzeSchedulingPatterns(userId: string): Promise<{
    patterns: SchedulingPatterns[];
    insights: string[];
  }>;

  // ==================== Meeting Events ====================
  getMeetingEvents(
    userId: string,
    filters?: {
      startTime?: Date;
      endTime?: Date;
      status?: string;
    }
  ): Promise<MeetingEvents[]>;
  getMeetingEvent(
    eventId: string,
    userId: string
  ): Promise<MeetingEvents | undefined>;
  createMeetingEvent(event: InsertMeetingEvents): Promise<MeetingEvents>;
  updateMeetingEvent(
    eventId: string,
    updates: Partial<MeetingEvents>
  ): Promise<MeetingEvents>;
  deleteMeetingEvent(userId: string, eventId: string): Promise<void>;
  cancelMeetingEvent(eventId: string, userId: string): Promise<MeetingEvents>;

  // ==================== Conflict Detection ====================
  findSchedulingConflicts(
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<MeetingEvents[]>;
  checkAvailability(
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<{ available: boolean; conflicts: MeetingEvents[] }>;

  // ==================== Statistics & Analytics ====================
  getMeetingStats(
    userId: string,
    period: "day" | "week" | "month"
  ): Promise<{
    totalMeetings: number;
    averagePerDay: number;
    busiestDay: string;
    busiestHour: number;
    averageDuration: number;
    participantCount: number;
  }>;
  getUpcomingMeetings(
    userId: string,
    limit?: number
  ): Promise<MeetingEvents[]>;
}
