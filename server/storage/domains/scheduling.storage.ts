/**
 * @file server/storage/domains/scheduling.storage.ts
 * @description Meeting scheduling and appointment management storage operations
 * 
 * Domain: Scheduling & Calendar
 * Scope: Meeting preferences, AI suggestions, scheduling patterns, calendar events
 */

import { db } from "../../db";
import { and, eq, desc, asc, sql, gte, lte, ne, or, type SQL } from "drizzle-orm";
import type { ISchedulingStorage } from "../interfaces/ISchedulingStorage";
import {
  schedulingPreferences,
  meetingSuggestions,
  schedulingPatterns,
  meetingEvents,
  type SchedulingPreferences,
  type InsertSchedulingPreferences,
  type MeetingSuggestions,
  type InsertMeetingSuggestions,
  type SchedulingPatterns,
  type InsertSchedulingPatterns,
  type MeetingEvents,
  type InsertMeetingEvents,
} from "@shared/schema/scheduling";

/**
 * Scheduling Storage
 * 
 * Manages meeting scheduling, preferences, AI-powered time suggestions,
 * pattern learning, and conflict detection for optimal calendar management.
 */
export class SchedulingStorage implements ISchedulingStorage {
  // ==================== Scheduling Preferences ====================

  async getSchedulingPreferences(
    userId: string
  ): Promise<SchedulingPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(schedulingPreferences)
      .where(eq(schedulingPreferences.userId, userId))
      .limit(1);
    return prefs;
  }

  async upsertSchedulingPreferences(
    userId: string,
    preferences: Omit<InsertSchedulingPreferences, "userId">
  ): Promise<SchedulingPreferences> {
    const existing = await this.getSchedulingPreferences(userId);

    if (existing) {
      const [updated] = await db
        .update(schedulingPreferences)
        .set({
          ...(preferences as any),
          updatedAt: new Date(),
        })
        .where(eq(schedulingPreferences.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(schedulingPreferences)
        .values({
          ...(preferences as any),
          userId,
        })
        .returning();
      return created;
    }
  }

  async deleteSchedulingPreferences(userId: string): Promise<void> {
    await db
      .delete(schedulingPreferences)
      .where(eq(schedulingPreferences.userId, userId));
  }

  // ==================== Meeting Suggestions ====================

  async getMeetingSuggestions(
    meetingId: string
  ): Promise<MeetingSuggestions | undefined> {
    const [suggestions] = await db
      .select()
      .from(meetingSuggestions)
      .where(eq(meetingSuggestions.meetingId, meetingId))
      .limit(1);
    return suggestions;
  }

  async getUserMeetingSuggestions(
    userId: string,
    status?: string
  ): Promise<MeetingSuggestions[]> {
    const conditions: SQL<unknown>[] = [];

    // Note: schema doesn't have createdBy field, using participants array instead
    // Filter suggestions where user is in participants
    conditions.push(sql`${userId} = ANY(${meetingSuggestions.participants})`);

    if (status) {
      // Schema doesn't have status field, filter by whether selectedTime is set
      if (status === "selected") {
        conditions.push(sql`${meetingSuggestions.selectedTime} IS NOT NULL`);
      } else if (status === "pending") {
        conditions.push(sql`${meetingSuggestions.selectedTime} IS NULL`);
      }
    }

    return await db
      .select()
      .from(meetingSuggestions)
      .where(and(...conditions))
      .orderBy(desc(meetingSuggestions.createdAt));
  }

  async createMeetingSuggestions(
    suggestions: InsertMeetingSuggestions
  ): Promise<MeetingSuggestions> {
    const [created] = await db
      .insert(meetingSuggestions)
      .values(suggestions as any)
      .returning();
    return created;
  }

  async updateMeetingSuggestionStatus(
    meetingId: string,
    selectedTime?: any,
    selectedBy?: string
  ): Promise<MeetingSuggestions> {
    const updateData: any = {};

    if (selectedTime) {
      updateData.selectedTime = selectedTime;
    }
    if (selectedBy) {
      updateData.selectedBy = selectedBy;
    }

    const [updated] = await db
      .update(meetingSuggestions)
      .set(updateData)
      .where(eq(meetingSuggestions.meetingId, meetingId))
      .returning();
    return updated;
  }

  async deleteMeetingSuggestions(meetingId: string): Promise<void> {
    await db
      .delete(meetingSuggestions)
      .where(eq(meetingSuggestions.meetingId, meetingId));
  }

  // ==================== Scheduling Patterns ====================

  async getSchedulingPatterns(userId: string): Promise<SchedulingPatterns[]> {
    return await db
      .select()
      .from(schedulingPatterns)
      .where(eq(schedulingPatterns.userId, userId))
      .orderBy(desc(schedulingPatterns.accuracyScore));
  }

  async getSchedulingPatternByType(
    userId: string,
    patternType: string
  ): Promise<SchedulingPatterns | undefined> {
    const [pattern] = await db
      .select()
      .from(schedulingPatterns)
      .where(
        and(
          eq(schedulingPatterns.userId, userId),
          eq(schedulingPatterns.patternType, patternType)
        )
      )
      .limit(1);
    return pattern;
  }

  async upsertSchedulingPattern(
    userId: string,
    pattern: Omit<InsertSchedulingPatterns, "userId">
  ): Promise<SchedulingPatterns> {
    const existing = await db
      .select()
      .from(schedulingPatterns)
      .where(
        and(
          eq(schedulingPatterns.userId, userId),
          eq(schedulingPatterns.patternType, pattern.patternType)
        )
      )
      .limit(1);

    if (existing[0]) {
      const [updated] = await db
        .update(schedulingPatterns)
        .set({
          ...(pattern as any),
          updatedAt: new Date(),
        })
        .where(eq(schedulingPatterns.id, existing[0].id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(schedulingPatterns)
        .values({
          ...(pattern as any),
          userId,
        })
        .returning();
      return created;
    }
  }

  async deleteSchedulingPattern(patternId: string): Promise<void> {
    await db
      .delete(schedulingPatterns)
      .where(eq(schedulingPatterns.id, patternId));
  }

  async analyzeSchedulingPatterns(userId: string): Promise<{
    patterns: SchedulingPatterns[];
    insights: string[];
  }> {
    const patterns = await this.getSchedulingPatterns(userId);
    const events = await this.getMeetingEvents(userId, {
      startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endTime: new Date(),
    });

    const insights: string[] = [];

    // Generate insights based on patterns and events
    if (patterns.length > 0) {
      const highConfidencePatterns = patterns.filter(
        (p) => (p.accuracyScore || 0) > 70
      );
      if (highConfidencePatterns.length > 0) {
        insights.push(
          `You have ${highConfidencePatterns.length} strong scheduling patterns identified.`
        );
      }
    }

    if (events.length > 0) {
      const meetingsPerDay = events.length / 30;
      insights.push(
        `You average ${meetingsPerDay.toFixed(1)} meetings per day.`
      );

      // Find busiest day of week
      const dayCount: Record<number, number> = {};
      events.forEach((e) => {
        const day = new Date(e.startTime).getDay();
        dayCount[day] = (dayCount[day] || 0) + 1;
      });

      const busiestDay = Object.entries(dayCount).sort(
        (a, b) => b[1] - a[1]
      )[0];
      
      if (busiestDay) {
        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        insights.push(
          `Your busiest day is ${dayNames[parseInt(busiestDay[0])]} with ${busiestDay[1]} meetings.`
        );
      }

      // Analyze meeting duration
      const durations = events.map(
        (e) =>
          (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) /
          (1000 * 60)
      );
      const avgDuration =
        durations.reduce((a, b) => a + b, 0) / durations.length;
      insights.push(
        `Your average meeting duration is ${Math.round(avgDuration)} minutes.`
      );
    }

    return { patterns, insights };
  }

  // ==================== Meeting Events ====================

  async getMeetingEvents(
    userId: string,
    filters?: {
      startTime?: Date;
      endTime?: Date;
      status?: string;
    }
  ): Promise<MeetingEvents[]> {
    const conditions: SQL<unknown>[] = [eq(meetingEvents.userId, userId)];

    if (filters?.startTime) {
      conditions.push(gte(meetingEvents.startTime, filters.startTime));
    }
    if (filters?.endTime) {
      conditions.push(lte(meetingEvents.endTime, filters.endTime));
    }
    if (filters?.status) {
      conditions.push(eq(meetingEvents.status, filters.status));
    }

    return await db
      .select()
      .from(meetingEvents)
      .where(and(...conditions))
      .orderBy(asc(meetingEvents.startTime));
  }

  async getMeetingEvent(
    eventId: string,
    userId: string
  ): Promise<MeetingEvents | undefined> {
    const [event] = await db
      .select()
      .from(meetingEvents)
      .where(
        and(eq(meetingEvents.id, eventId), eq(meetingEvents.userId, userId))
      )
      .limit(1);
    return event;
  }

  async createMeetingEvent(event: InsertMeetingEvents): Promise<MeetingEvents> {
    const [created] = await db
      .insert(meetingEvents)
      .values(event as any)
      .returning();
    return created;
  }

  async updateMeetingEvent(
    eventId: string,
    updates: Partial<MeetingEvents>
  ): Promise<MeetingEvents> {
    const [updated] = await db
      .update(meetingEvents)
      .set({
        ...(updates as any),
        updatedAt: new Date(),
      })
      .where(eq(meetingEvents.id, eventId))
      .returning();
    return updated;
  }

  async deleteMeetingEvent(userId: string, eventId: string): Promise<void> {
    await db
      .delete(meetingEvents)
      .where(
        and(eq(meetingEvents.id, eventId), eq(meetingEvents.userId, userId))
      );
  }

  async cancelMeetingEvent(
    eventId: string,
    userId: string
  ): Promise<MeetingEvents> {
    const [updated] = await db
      .update(meetingEvents)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(
        and(eq(meetingEvents.id, eventId), eq(meetingEvents.userId, userId))
      )
      .returning();
    return updated;
  }

  // ==================== Conflict Detection ====================

  async findSchedulingConflicts(
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<MeetingEvents[]> {
    return await db
      .select()
      .from(meetingEvents)
      .where(
        and(
          eq(meetingEvents.userId, userId),
          ne(meetingEvents.status, "cancelled"),
          or(
            // Event starts during the proposed time
            and(
              gte(meetingEvents.startTime, startTime),
              lte(meetingEvents.startTime, endTime)
            ),
            // Event ends during the proposed time
            and(
              gte(meetingEvents.endTime, startTime),
              lte(meetingEvents.endTime, endTime)
            ),
            // Event encompasses the proposed time
            and(
              lte(meetingEvents.startTime, startTime),
              gte(meetingEvents.endTime, endTime)
            )
          )
        )
      );
  }

  async checkAvailability(
    userId: string,
    startTime: Date,
    endTime: Date
  ): Promise<{ available: boolean; conflicts: MeetingEvents[] }> {
    const conflicts = await this.findSchedulingConflicts(
      userId,
      startTime,
      endTime
    );
    return {
      available: conflicts.length === 0,
      conflicts,
    };
  }

  // ==================== Statistics & Analytics ====================

  async getMeetingStats(
    userId: string,
    period: "day" | "week" | "month"
  ): Promise<{
    totalMeetings: number;
    averagePerDay: number;
    busiestDay: string;
    busiestHour: number;
    averageDuration: number;
    participantCount: number;
  }> {
    // Calculate date range based on period
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case "day":
        startDate.setDate(now.getDate() - 1);
        break;
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    const events = await this.getMeetingEvents(userId, {
      startTime: startDate,
      endTime: now,
      status: "confirmed",
    });

    const totalMeetings = events.length;
    const days = period === "day" ? 1 : period === "week" ? 7 : 30;
    const averagePerDay = totalMeetings / days;

    // Find busiest day of week
    const dayCount: Record<number, number> = {};
    const hourCount: Record<number, number> = {};
    let totalParticipants = 0;
    let totalDuration = 0;

    events.forEach((e) => {
      const start = new Date(e.startTime);
      const end = new Date(e.endTime);
      
      const day = start.getDay();
      const hour = start.getHours();
      
      dayCount[day] = (dayCount[day] || 0) + 1;
      hourCount[hour] = (hourCount[hour] || 0) + 1;
      
      totalParticipants += e.participants?.length || 0;
      totalDuration += (end.getTime() - start.getTime()) / (1000 * 60);
    });

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    const busiestDayNum = Object.entries(dayCount).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];
    const busiestDay = busiestDayNum ? dayNames[parseInt(busiestDayNum)] : "N/A";

    const busiestHour = Object.entries(hourCount).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0];

    const averageDuration = totalMeetings > 0 ? totalDuration / totalMeetings : 0;
    const participantCount = totalParticipants;

    return {
      totalMeetings,
      averagePerDay,
      busiestDay,
      busiestHour: busiestHour ? parseInt(busiestHour) : 0,
      averageDuration,
      participantCount,
    };
  }

  async getUpcomingMeetings(
    userId: string,
    limit: number = 10
  ): Promise<MeetingEvents[]> {
    return await db
      .select()
      .from(meetingEvents)
      .where(
        and(
          eq(meetingEvents.userId, userId),
          gte(meetingEvents.startTime, new Date()),
          ne(meetingEvents.status, "cancelled")
        )
      )
      .orderBy(asc(meetingEvents.startTime))
      .limit(limit);
  }
}
