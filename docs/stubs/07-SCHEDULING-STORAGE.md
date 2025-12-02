# Scheduling Storage Implementation

**Priority:** Medium  
**File:** `server/storage/domains/scheduling.storage.ts`  
**Stub Count:** 8 methods

## Current Status

Meeting schedule methods are stubs. Need to verify if table exists or needs creation.

## Methods to Implement

| Method                                       | Description               |
| -------------------------------------------- | ------------------------- |
| `getMeetingSchedules(userId)`                | Get user's meetings       |
| `getMeetingSchedule(scheduleId)`             | Get single meeting        |
| `createMeetingSchedule(schedule)`            | Create meeting            |
| `updateMeetingSchedule(scheduleId, data)`    | Update meeting            |
| `deleteMeetingSchedule(scheduleId)`          | Delete meeting            |
| `getMeetingsByDateRange(userId, start, end)` | Get meetings in range     |
| `checkConflicts(userId, start, end)`         | Find conflicting meetings |
| `getAvailableSlots(userId, date, duration)`  | Find available time slots |

---

## Step 1: Verify/Create Schema

Copy and paste this prompt:

```
Check shared/schema/scheduling.ts for a meeting schedules table.

If it doesn't exist or is incomplete, ensure it has:

meetingSchedules table:
- id: uuid primary key with defaultRandom()
- userId: text, not null, references users
- title: text, not null
- description: text, nullable
- startTime: timestamp, not null
- endTime: timestamp, not null
- timezone: text, default 'UTC'
- isAllDay: boolean, default false
- isRecurring: boolean, default false
- recurrenceRule: text, nullable - iCal RRULE format like 'FREQ=WEEKLY;BYDAY=MO,WE,FR'
- recurrenceEndDate: date, nullable
- location: text, nullable
- meetingUrl: text, nullable - for virtual meetings
- attendees: jsonb, nullable - array of {userId, email, status}
- reminders: jsonb, nullable - array of {type, minutesBefore}
- status: text, default 'scheduled' - 'scheduled', 'cancelled', 'completed', 'tentative'
- color: text, nullable - for calendar display
- notes: text, nullable
- metadata: jsonb, nullable
- createdAt: timestamp, default now()
- updatedAt: timestamp, default now()

Create insert schema and select type. Run npm run db:push if changes made.
```

---

## Step 2: Implement Core CRUD Methods

Copy and paste this prompt:

```
Implement the first 5 scheduling methods in server/storage/domains/scheduling.storage.ts:

1. getMeetingSchedules(userId: string): Promise<MeetingSchedule[]>
   - Select all meetings for userId
   - Order by startTime ASC
   - Return array

2. getMeetingSchedule(scheduleId: string): Promise<MeetingSchedule | undefined>
   - Select single meeting by id
   - Return meeting or undefined

3. createMeetingSchedule(schedule: InsertMeetingSchedule): Promise<MeetingSchedule>
   - Insert meeting record
   - Return created meeting

4. updateMeetingSchedule(scheduleId: string, data: Partial<MeetingSchedule>): Promise<MeetingSchedule>
   - Update meeting by id
   - Set updatedAt to now()
   - Return updated meeting

5. deleteMeetingSchedule(scheduleId: string): Promise<void>
   - Delete meeting by id

Import meetingSchedules from @shared/schema/scheduling.
```

---

## Step 3: Implement Query Methods

Copy and paste this prompt:

```
Implement the remaining 3 scheduling methods in server/storage/domains/scheduling.storage.ts:

6. getMeetingsByDateRange(userId: string, start: Date, end: Date): Promise<MeetingSchedule[]>
   - Select meetings where:
     - userId matches
     - startTime >= start AND startTime <= end
     - OR endTime >= start AND endTime <= end (meetings spanning the range)
   - Order by startTime ASC

7. checkConflicts(userId: string, start: Date, end: Date, excludeId?: string): Promise<MeetingSchedule[]>
   - Find meetings that overlap with the given time range
   - A conflict exists when:
     - existing.startTime < end AND existing.endTime > start
   - Optionally exclude a specific meeting ID (for updates)
   - Return conflicting meetings

8. getAvailableSlots(userId: string, date: Date, durationMinutes: number): Promise<Array<{start: Date, end: Date}>>
   - Get all meetings for the user on the given date
   - Define working hours (e.g., 9 AM to 5 PM)
   - Calculate available slots between meetings that are >= durationMinutes
   - Return array of available time slots

For getAvailableSlots, implement business logic:
- Sort meetings by start time
- Find gaps between meetings
- Check if gap is large enough for requested duration
- Return valid slots
```

---

## Verification

After implementation, test with:

```
Verify scheduling storage:
1. Meetings can be created and retrieved
2. Date range queries work correctly
3. Conflict detection finds overlapping meetings
4. Available slots calculation is accurate
5. No TypeScript errors

Run npm run check.
```
