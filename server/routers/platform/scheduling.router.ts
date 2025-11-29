import { Router, Request, Response } from "express";
import { storage } from "../../storage/index";
import { 
  insertSchedulingPreferencesSchema,
  insertMeetingSuggestionsSchema,
  insertSchedulingPatternsSchema,
  insertMeetingEventsSchema,
  type SchedulingPreferences,
  type MeetingSuggestions,
  type SchedulingPatterns,
  type MeetingEvents
} from "@shared/schema";
import { isAuthenticated } from "../../middleware/oauth.middleware";
import { openai } from "../../integrations/openai";

const router = Router();

// ==================== Scheduling Preferences ====================

// GET /api/schedule/preferences - Get user's scheduling preferences
router.get("/schedule/preferences", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const preferences = await storage.user.scheduling.getSchedulingPreferences(userId);
    
    if (!preferences) {
      // Return default preferences if none exist
      return res.json({
        timezone: "America/New_York",
        bufferTime: 15,
        workingHours: {
          start: "09:00",
          end: "17:00",
          daysOfWeek: [1, 2, 3, 4, 5]
        },
        preferredTimes: {},
        blockedTimes: [],
        meetingPreferences: {
          preferVideo: true,
          maxDailyMeetings: 5,
          preferredDuration: 30,
          avoidBackToBack: true
        }
      });
    }
    
    res.json(preferences);
  } catch (error) {
    console.error("Error fetching scheduling preferences:", error);
    res.status(500).json({ error: "Failed to fetch scheduling preferences" });
  }
});

// PUT /api/schedule/preferences - Update scheduling preferences
router.put("/schedule/preferences", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const validation = insertSchedulingPreferencesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        details: validation.error.errors
      });
    }
    
    const preferences = await storage.user.scheduling.upsertSchedulingPreferences(userId, validation.data);
    res.json(preferences);
  } catch (error) {
    console.error("Error updating scheduling preferences:", error);
    res.status(500).json({ error: "Failed to update scheduling preferences" });
  }
});

// ==================== Meeting Suggestions ====================

// POST /api/schedule/suggest - Suggest meeting times using AI
router.post("/schedule/suggest", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const {
      participants,
      duration = 30,
      mustBeWithin,
      avoidDates,
      requireAllAttendees = true,
      allowWeekends = false,
      preferredTimeOfDay
    } = req.body;
    
    // Include current user in participants list
    const allParticipants = [userId, ...participants];
    
    // Get preferences for all participants
    const allPreferences: SchedulingPreferences[] = [];
    for (const participantId of allParticipants) {
      const prefs = await storage.user.scheduling.getSchedulingPreferences(participantId);
      if (prefs) allPreferences.push(prefs);
    }
    
    // Get existing events for all participants to check conflicts
    const allEvents: MeetingEvents[] = [];
    const now = new Date();
    const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead
    
    for (const participantId of allParticipants) {
      const events = await storage.user.scheduling.getMeetingEvents(participantId, {
        startTime: now,
        endTime: futureDate,
        status: "confirmed"
      });
      allEvents.push(...events);
    }
    
    // Use OpenAI to find optimal meeting times
    const prompt = `Given the following scheduling data, suggest the 3 best meeting times:

Participants: ${participants.length}
Duration: ${duration} minutes
Constraints:
- Must be within: ${mustBeWithin ? JSON.stringify(mustBeWithin) : "Next 30 days"}
- Avoid dates: ${avoidDates ? avoidDates.join(", ") : "None"}
- Allow weekends: ${allowWeekends}
- Preferred time of day: ${preferredTimeOfDay || "Any"}

Participant Preferences:
${allPreferences.map(p => `
  - User: Timezone ${p.timezone}, Buffer ${p.bufferTime}min
  - Working hours: ${p.workingHours.start}-${p.workingHours.end}
  - Preferred times: ${JSON.stringify(p.preferredTimes)}
`).join("\n")}

Existing Events (conflicts to avoid):
${allEvents.map(e => `
  - ${e.title}: ${e.startTime} to ${e.endTime} (${e.timezone})
`).join("\n")}

Please suggest 3 optimal meeting times considering:
1. Time zone differences
2. Participant preferences
3. Avoiding conflicts
4. Minimizing schedule disruption

Return as JSON with format:
{
  "suggestions": [
    {
      "start": "ISO datetime",
      "end": "ISO datetime",
      "timezone": "timezone",
      "score": 0-1,
      "conflicts": [],
      "optimality": {
        "timeZoneFit": 0-1,
        "preferenceMatch": 0-1,
        "scheduleDisruption": 0-1
      }
    }
  ],
  "confidence": {
    "overall": 0-1,
    "timeZoneAlignment": 0-1,
    "preferenceAlignment": 0-1,
    "conflictAvoidance": 0-1
  }
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI scheduling assistant that finds optimal meeting times considering participant preferences, time zones, and existing commitments."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });
    
    const aiResponse = JSON.parse(completion.choices[0].message.content || "{}");
    
    // Create meeting suggestion record
    const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const suggestions = await storage.user.scheduling.createMeetingSuggestions({
      meetingId,
      suggestedTimes: aiResponse.suggestions || [],
      confidenceScores: aiResponse.confidence || {
        overall: 0.5,
        timeZoneAlignment: 0.5,
        preferenceAlignment: 0.5,
        conflictAvoidance: 0.5
      },
      participants,
      constraints: {
        duration,
        mustBeWithin,
        avoidDates,
        requireAllAttendees,
        allowWeekends,
        preferredTimeOfDay
      },
    } as any);
    
    res.json(suggestions);
  } catch (error) {
    console.error("Error suggesting meeting times:", error);
    res.status(500).json({ error: "Failed to suggest meeting times" });
  }
});

// GET /api/schedule/suggestions - Get user's meeting suggestions
router.get("/schedule/suggestions", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { status } = req.query;
    const suggestions = await storage.user.scheduling.getUserMeetingSuggestions(userId, status as string | undefined);
    res.json(suggestions);
  } catch (error) {
    console.error("Error fetching meeting suggestions:", error);
    res.status(500).json({ error: "Failed to fetch meeting suggestions" });
  }
});

// PUT /api/schedule/suggestions/:meetingId - Accept/reject a suggestion
router.put("/schedule/suggestions/:meetingId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { meetingId } = req.params;
    const { status, selectedTime } = req.body;
    
    // Verify the suggestion exists
    const suggestion = await storage.user.scheduling.getMeetingSuggestions(meetingId);
    if (!suggestion) {
      return res.status(404).json({ error: "Meeting suggestion not found" });
    }
    
    const updated = await storage.user.scheduling.updateMeetingSuggestionStatus(meetingId, status, selectedTime);
    
    // If accepted, create actual meeting event
    if (status === "accepted" && selectedTime) {
      await storage.user.scheduling.createMeetingEvent({
        userId,
        title: `Meeting with ${suggestion.participants.length} participants`,
        startTime: new Date(selectedTime.start),
        endTime: new Date(selectedTime.end),
        timezone: selectedTime.timezone,
        participants: suggestion.participants,
        status: "confirmed",
        meetingSuggestionId: suggestion.id,
        metadata: {
          source: "ai-suggested"
        }
      });
    }
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating meeting suggestion:", error);
    res.status(500).json({ error: "Failed to update meeting suggestion" });
  }
});

// ==================== Schedule Optimization ====================

// POST /api/schedule/optimize - Optimize existing schedule
router.post("/schedule/optimize", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { startDate, endDate } = req.body;
    
    // Get user's events in the specified period
    const events = await storage.user.scheduling.getMeetingEvents(userId, {
      startTime: new Date(startDate),
      endTime: new Date(endDate),
      status: "confirmed"
    });
    
    // Get user preferences
    const preferences = await storage.user.scheduling.getSchedulingPreferences(userId);
    
    // Use AI to suggest optimizations
    const prompt = `Analyze this schedule and suggest optimizations:

Schedule:
${events.map(e => `- ${e.title}: ${e.startTime} to ${e.endTime}`).join("\n")}

User Preferences:
- Buffer time: ${preferences?.bufferTime || 15} minutes
- Max daily meetings: ${preferences?.meetingPreferences?.maxDailyMeetings || 5}
- Prefer video: ${preferences?.meetingPreferences?.preferVideo || false}

Suggest optimizations for:
1. Grouping similar meetings
2. Adding appropriate breaks
3. Minimizing context switching
4. Respecting energy levels throughout the day

Return as JSON with format:
{
  "optimizations": [
    {
      "type": "reschedule|group|add_break|cancel",
      "eventId": "id or null",
      "suggestion": "description",
      "newTime": "ISO datetime or null"
    }
  ],
  "insights": ["insight1", "insight2", ...]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a schedule optimization expert that helps improve productivity and well-being."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4
    });
    
    const optimizations = JSON.parse(completion.choices[0].message.content || "{}");
    res.json(optimizations);
  } catch (error) {
    console.error("Error optimizing schedule:", error);
    res.status(500).json({ error: "Failed to optimize schedule" });
  }
});

// ==================== Conflict Detection ====================

// GET /api/schedule/conflicts - Find scheduling conflicts
router.get("/schedule/conflicts", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { startTime, endTime, participants } = req.query;
    
    if (!startTime || !endTime) {
      return res.status(400).json({ error: "Start time and end time are required" });
    }
    
    // Parse participants from query string
    const participantList = participants ? (participants as string).split(',') : [];
    const allParticipants = [userId, ...participantList];
    
    // Get conflicts for all participants
    const allConflicts = await Promise.all(
      allParticipants.map(participantId => 
        storage.user.scheduling.findSchedulingConflicts(
          participantId,
          new Date(startTime as string),
          new Date(endTime as string)
        )
      )
    );
    
    // Flatten and deduplicate conflicts
    const conflicts = allConflicts.flat();
    
    res.json(conflicts);
  } catch (error) {
    console.error("Error finding conflicts:", error);
    res.status(500).json({ error: "Failed to find conflicts" });
  }
});

// ==================== Analytics ====================

// GET /api/schedule/analytics - Get scheduling analytics
router.get("/schedule/analytics", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const analytics = await storage.user.scheduling.analyzeSchedulingPatterns(userId);
    
    // Get additional stats
    const now = new Date();
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const events = await storage.user.scheduling.getMeetingEvents(userId, {
      startTime: lastMonth,
      endTime: now
    });
    
    // Calculate meeting statistics
    const totalMeetings = events.length;
    const totalHours = events.reduce((sum, e) => {
      const duration = (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / (1000 * 60 * 60);
      return sum + duration;
    }, 0);
    
    const avgMeetingDuration = totalMeetings > 0 ? totalHours / totalMeetings : 0;
    
    // Find peak meeting times
    const hourDistribution: Record<number, number> = {};
    events.forEach(e => {
      const hour = new Date(e.startTime).getHours();
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
    });
    
    const peakHour = Object.entries(hourDistribution)
      .sort((a, b) => b[1] - a[1])[0];
    
    res.json({
      ...analytics,
      statistics: {
        totalMeetings,
        totalHours: totalHours.toFixed(1),
        avgMeetingDuration: avgMeetingDuration.toFixed(1),
        peakHour: peakHour ? `${peakHour[0]}:00` : null,
        meetingsPerWeek: (totalMeetings / 4).toFixed(1)
      }
    });
  } catch (error) {
    console.error("Error fetching scheduling analytics:", error);
    res.status(500).json({ error: "Failed to fetch scheduling analytics" });
  }
});

// ==================== Meeting Events ====================

// GET /api/schedule/events - Get user's meeting events
router.get("/schedule/events", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { startTime, endTime, status } = req.query;
    
    const filters: any = {};
    if (startTime) filters.startTime = new Date(startTime as string);
    if (endTime) filters.endTime = new Date(endTime as string);
    if (status) filters.status = status as string;
    
    const events = await storage.user.scheduling.getMeetingEvents(userId, filters);
    res.json(events);
  } catch (error) {
    console.error("Error fetching meeting events:", error);
    res.status(500).json({ error: "Failed to fetch meeting events" });
  }
});

// POST /api/schedule/events - Create a new meeting event
router.post("/schedule/events", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const validation = insertMeetingEventsSchema.safeParse({
      ...req.body,
      userId
    });
    
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        details: validation.error.errors
      });
    }
    
    // Check for conflicts
    const conflicts = await storage.user.scheduling.findSchedulingConflicts(
      userId,
      new Date(validation.data.startTime),
      new Date(validation.data.endTime)
    );
    
    if (conflicts.length > 0) {
      return res.status(409).json({
        error: "Scheduling conflict detected",
        conflicts
      });
    }
    
    const event = await storage.user.scheduling.createMeetingEvent(validation.data);
    res.json(event);
  } catch (error) {
    console.error("Error creating meeting event:", error);
    res.status(500).json({ error: "Failed to create meeting event" });
  }
});

// PUT /api/schedule/events/:id - Update a meeting event
router.put("/schedule/events/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id } = req.params;
    
    // Verify event belongs to user
    const events = await storage.user.scheduling.getMeetingEvents(userId);
    const existing = events.find(e => e.id === id);
    
    if (!existing) {
      return res.status(404).json({ error: "Meeting event not found" });
    }
    
    const updated = await storage.user.scheduling.updateMeetingEvent(id, req.body);
    res.json(updated);
  } catch (error) {
    console.error("Error updating meeting event:", error);
    res.status(500).json({ error: "Failed to update meeting event" });
  }
});

// DELETE /api/schedule/events/:id - Delete a meeting event
router.delete("/schedule/events/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { id } = req.params;
    
    await storage.user.scheduling.deleteMeetingEvent(userId, id);
    res.json({ message: "Meeting event deleted successfully" });
  } catch (error) {
    console.error("Error deleting meeting event:", error);
    res.status(500).json({ error: "Failed to delete meeting event" });
  }
});

export default router;
