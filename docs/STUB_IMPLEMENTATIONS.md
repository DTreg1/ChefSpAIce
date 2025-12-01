# Stub Method Implementation Guide

This document provides step-by-step prompts to implement all remaining stub methods in the ChefSpAIce storage layer. Each section contains copyable prompts that can be entered into the AI chat.

## Overview of Remaining Stubs

| Domain | Count | Priority | Description |
|--------|-------|----------|-------------|
| [Chat Storage](#1-chat-storage) | 4 | High | Chat message persistence |
| [Food Storage - Appliances](#2-food-storage---appliances) | 15 | Medium | Kitchen appliance management |
| [Food Storage - Cache](#3-food-storage---cache) | 2 | Low | USDA API cache management |
| [Support Storage](#4-support-storage) | 5 | Medium | Ticket responses & moderation |
| [Security Storage](#5-security-storage) | 3 | Medium | Privacy request handling |
| [Experiments Storage](#6-experiments-storage) | 1 | Low | A/B test insights |
| [Scheduling Storage](#7-scheduling-storage) | 8 | Medium | Meeting schedules |
| [Image Processing](#8-image-processing-storage) | 6 | Medium | Image processing jobs |

**Total: 44 stub methods**

---

## 1. Chat Storage

**File:** `server/storage/domains/chat.storage.ts`

**Methods to implement:**
- `getChatMessages(userId, limit)`
- `getChatMessagesPaginated(userId, limit, offset)`
- `createChatMessage(userId, message)`
- `deleteChatHistory(userId)`

**Prerequisites:** Requires `chat_messages` table in schema

### Prompt 1.1: Create Chat Messages Schema

```
Create the chat_messages table in the database schema. Add it to shared/schema/chat.ts with the following fields:
- id (uuid, primary key)
- userId (text, foreign key to users)
- role (text - 'user' or 'assistant')
- content (text)
- metadata (jsonb, nullable) - for storing context like recipe references
- createdAt (timestamp)

Include the insert schema and types. Then run db:push to create the table.
```

### Prompt 1.2: Implement Chat Storage Methods

```
Implement the 4 chat storage stub methods in server/storage/domains/chat.storage.ts:

1. getChatMessages(userId, limit) - Fetch messages ordered by createdAt desc
2. getChatMessagesPaginated(userId, limit, offset) - Paginated with total count
3. createChatMessage(userId, message) - Insert new message
4. deleteChatHistory(userId) - Delete all messages for user

Use Drizzle ORM with proper typing. Import the new chat_messages table from the schema.
```

---

## 2. Food Storage - Appliances

**File:** `server/storage/domains/food.storage.ts`

**Methods to implement:**
- `getAppliances()`
- `getUserAppliances(userId)`
- `getUserAppliancesByCategory(userId, category)`
- `createAppliance(appliance)`
- `updateAppliance(id, data)`
- `deleteAppliance(id)`
- `getApplianceCategories()`
- `getApplianceLibrary()`
- `getApplianceLibraryByCategory(category)`
- `searchApplianceLibrary(query)`
- `addUserAppliance(userId, applianceId)`
- `updateUserAppliance(userId, applianceId, data)`
- `deleteUserAppliance(userId, applianceId)`

**Prerequisites:** Requires appliances tables in schema

### Prompt 2.1: Create Appliances Schema

```
Create the appliances schema in shared/schema/food.ts with two tables:

1. appliance_library - Master list of known appliances:
   - id (uuid)
   - name (text)
   - category (text) - e.g., 'cooking', 'refrigeration', 'prep', 'small'
   - description (text, nullable)
   - imageUrl (text, nullable)
   - defaultSettings (jsonb, nullable)
   - createdAt (timestamp)

2. user_appliances - User's owned appliances:
   - id (uuid)
   - userId (text, foreign key)
   - applianceId (text, foreign key to appliance_library, nullable for custom)
   - customName (text, nullable) - for custom appliances
   - category (text)
   - brand (text, nullable)
   - model (text, nullable)
   - settings (jsonb, nullable)
   - notes (text, nullable)
   - createdAt (timestamp)
   - updatedAt (timestamp)

Include insert schemas and types. Run db:push after.
```

### Prompt 2.2: Implement Appliance Storage Methods

```
Implement all 15 appliance stub methods in server/storage/domains/food.storage.ts:

Library methods:
1. getAppliances() - Get all from appliance_library
2. getApplianceCategories() - Get distinct categories
3. getApplianceLibrary() - Alias for getAppliances
4. getApplianceLibraryByCategory(category) - Filter by category
5. searchApplianceLibrary(query) - Search by name/description

User appliance methods:
6. getUserAppliances(userId) - Get user's appliances with library join
7. getUserAppliancesByCategory(userId, category) - Filter by category
8. createAppliance(appliance) - Add to appliance_library (admin)
9. updateAppliance(id, data) - Update library appliance (admin)
10. deleteAppliance(id) - Delete from library (admin)
11. addUserAppliance(userId, applianceId) - Link user to library appliance
12. updateUserAppliance(userId, applianceId, data) - Update user's appliance settings
13. deleteUserAppliance(userId, applianceId) - Remove from user's list

Use Drizzle ORM with proper imports from the new schema tables.
```

---

## 3. Food Storage - Cache

**File:** `server/storage/domains/food.storage.ts`

**Methods to implement:**
- `getUSDACacheStats()`
- `clearOldCache(olderThan)`

### Prompt 3.1: Create USDA Cache Schema (if needed)

```
Check if a usda_cache table exists in the schema. If not, create one in shared/schema/food.ts:

- id (uuid)
- fdcId (text, unique) - USDA FDC ID
- data (jsonb) - Cached nutrition data
- createdAt (timestamp)
- expiresAt (timestamp)

Include insert schema and types. Run db:push after.
```

### Prompt 3.2: Implement Cache Methods

```
Implement the 2 USDA cache stub methods in server/storage/domains/food.storage.ts:

1. getUSDACacheStats() - Return object with:
   - totalEntries: count of all cache entries
   - expiredEntries: count where expiresAt < now
   - oldestEntry: earliest createdAt
   - newestEntry: latest createdAt
   - totalSize: approximate size in bytes (if possible)

2. clearOldCache(olderThan: Date) - Delete entries where createdAt < olderThan, return count deleted

Use Drizzle ORM count and aggregation functions.
```

---

## 4. Support Storage

**File:** `server/storage/domains/support.storage.ts`

**Methods to implement:**
- `addTicketResponse(ticketId, response)`
- `getTicketResponses(ticketId)`
- `getModerationLogs(filters)`
- `getModerationLogById(logId)`
- `getUserModerationHistory(userId)`

**Prerequisites:** Requires ticket_responses and moderation_logs tables

### Prompt 4.1: Create Support Tables Schema

```
Add two new tables to shared/schema/support.ts:

1. ticket_responses:
   - id (uuid)
   - ticketId (text, foreign key to tickets)
   - userId (text) - responder (user or agent)
   - content (text)
   - isInternal (boolean, default false) - internal notes vs public response
   - attachments (jsonb, nullable)
   - createdAt (timestamp)

2. moderation_logs:
   - id (uuid)
   - userId (text) - user being moderated
   - moderatorId (text) - admin performing action
   - action (text) - 'warn', 'mute', 'ban', 'unban', 'delete_content'
   - reason (text)
   - targetType (text, nullable) - 'comment', 'recipe', 'review'
   - targetId (text, nullable)
   - metadata (jsonb, nullable)
   - createdAt (timestamp)

Include insert schemas and types. Run db:push after.
```

### Prompt 4.2: Implement Support Storage Methods

```
Implement the 5 support stub methods in server/storage/domains/support.storage.ts:

1. addTicketResponse(ticketId, response) - Insert response, return created record
2. getTicketResponses(ticketId) - Get all responses ordered by createdAt
3. getModerationLogs(filters) - Filter by userId, moderatorId, action, date range
4. getModerationLogById(logId) - Get single log entry
5. getUserModerationHistory(userId) - Get all moderation actions for a user

Use Drizzle ORM with proper imports from the new schema tables.
```

---

## 5. Security Storage

**File:** `server/storage/domains/security.storage.ts`

**Methods to implement:**
- `logPrivacyRequest(request)`
- `getPrivacyRequests(filters)`
- `processPrivacyRequest(requestId, status, processedBy)`

**Prerequisites:** Requires privacy_requests table

### Prompt 5.1: Create Privacy Requests Schema

```
Add privacy_requests table to shared/schema/security.ts:

- id (uuid)
- userId (text, foreign key to users)
- requestType (text) - 'data_export', 'data_deletion', 'opt_out', 'access_request'
- status (text, default 'pending') - 'pending', 'processing', 'completed', 'denied'
- details (jsonb, nullable) - specific data categories or reasons
- processedBy (text, nullable) - admin who processed
- processedAt (timestamp, nullable)
- completionNotes (text, nullable)
- createdAt (timestamp)
- updatedAt (timestamp)

Include insert schema and types. Run db:push after.
```

### Prompt 5.2: Implement Security Storage Methods

```
Implement the 3 privacy request stub methods in server/storage/domains/security.storage.ts:

1. logPrivacyRequest(request) - Create new privacy request record
2. getPrivacyRequests(filters) - Filter by userId, status, requestType, date range
3. processPrivacyRequest(requestId, status, processedBy) - Update status, set processedAt and processedBy

Use Drizzle ORM with proper typing and imports.
```

---

## 6. Experiments Storage

**File:** `server/storage/domains/experiments.storage.ts`

**Methods to implement:**
- `createAbTestInsight(insight)`

### Prompt 6.1: Verify AbTestInsight Schema

```
Check if ab_test_insights table exists in shared/schema/experiments.ts. Verify it has:
- id (uuid)
- testId (text, foreign key to ab_tests)
- insightType (text)
- title (text)
- description (text)
- data (jsonb)
- significance (real, nullable)
- createdAt (timestamp)

If missing, add it and run db:push.
```

### Prompt 6.2: Implement createAbTestInsight

```
Implement the createAbTestInsight method in server/storage/domains/experiments.storage.ts:

createAbTestInsight(insight: InsertAbTestInsight): Promise<AbTestInsight>
- Insert the insight record
- Return the created insight

The insight should contain analysis results like statistical significance, winner determination, or anomaly detection.
```

---

## 7. Scheduling Storage

**File:** `server/storage/domains/scheduling.storage.ts` (may need to create)

**Methods to implement:**
- `getMeetingSchedules(userId)`
- `getMeetingSchedule(scheduleId)`
- `createMeetingSchedule(schedule)`
- `updateMeetingSchedule(scheduleId, data)`
- `deleteMeetingSchedule(scheduleId)`
- `getMeetingsByDateRange(userId, start, end)`
- `checkConflicts(userId, start, end)`
- `getAvailableSlots(userId, date, duration)`

**Prerequisites:** Requires meeting_schedules table

### Prompt 7.1: Create Scheduling Schema

```
Create shared/schema/scheduling.ts with meeting_schedules table (if not exists):

- id (uuid)
- userId (text, foreign key)
- title (text)
- description (text, nullable)
- startTime (timestamp)
- endTime (timestamp)
- isRecurring (boolean, default false)
- recurrenceRule (text, nullable) - iCal RRULE format
- location (text, nullable)
- attendees (jsonb, nullable) - array of user IDs or emails
- reminders (jsonb, nullable) - reminder settings
- status (text, default 'scheduled') - 'scheduled', 'cancelled', 'completed'
- metadata (jsonb, nullable)
- createdAt (timestamp)
- updatedAt (timestamp)

Include insert schema and types. Run db:push after.
```

### Prompt 7.2: Implement Scheduling Storage Methods

```
Implement all 8 scheduling stub methods in server/storage/domains/scheduling.storage.ts:

1. getMeetingSchedules(userId) - Get all meetings for user
2. getMeetingSchedule(scheduleId) - Get single meeting
3. createMeetingSchedule(schedule) - Create new meeting
4. updateMeetingSchedule(scheduleId, data) - Update meeting
5. deleteMeetingSchedule(scheduleId) - Delete meeting
6. getMeetingsByDateRange(userId, start, end) - Filter by date range
7. checkConflicts(userId, start, end) - Return conflicting meetings
8. getAvailableSlots(userId, date, duration) - Calculate open time slots

Use Drizzle ORM. For getAvailableSlots, implement logic to find gaps between existing meetings.
```

---

## 8. Image Processing Storage

**File:** `server/storage/domains/images.storage.ts` (may need to create or add to ai-ml.storage.ts)

**Methods to implement:**
- `createImageProcessingJob(job)`
- `updateImageProcessingJob(jobId, data)`
- `getImageProcessingJob(jobId)`
- `getImageProcessingJobs(filters)`
- `getImagePresets()`
- `createImagePreset(preset)`

**Prerequisites:** Requires image_processing_jobs and image_presets tables

### Prompt 8.1: Create Image Processing Schema

```
Add to shared/schema/images.ts:

1. image_processing_jobs:
   - id (uuid)
   - userId (text, foreign key)
   - imageUrl (text) - source image
   - outputUrl (text, nullable) - processed result
   - operation (text) - 'resize', 'compress', 'thumbnail', 'watermark', 'optimize'
   - presetId (text, nullable, foreign key)
   - parameters (jsonb) - operation-specific params
   - status (text, default 'pending') - 'pending', 'processing', 'completed', 'failed'
   - error (text, nullable)
   - progress (integer, default 0) - 0-100
   - startedAt (timestamp, nullable)
   - completedAt (timestamp, nullable)
   - createdAt (timestamp)

2. image_presets:
   - id (uuid)
   - name (text)
   - description (text, nullable)
   - operations (jsonb) - array of operations to apply
   - isDefault (boolean, default false)
   - createdBy (text, nullable)
   - createdAt (timestamp)
   - updatedAt (timestamp)

Include insert schemas and types. Run db:push after.
```

### Prompt 8.2: Implement Image Processing Storage Methods

```
Implement the 6 image processing stub methods in server/storage/domains/ai-ml.storage.ts (or create images.storage.ts):

1. createImageProcessingJob(job) - Create new processing job
2. updateImageProcessingJob(jobId, data) - Update job status/progress
3. getImageProcessingJob(jobId) - Get single job
4. getImageProcessingJobs(filters) - Filter by userId, status, operation
5. getImagePresets() - Get all presets (optionally filter by isDefault)
6. createImagePreset(preset) - Create new preset

Use Drizzle ORM with proper imports from the new schema tables.
```

---

## Individual Implementation Guides

For detailed step-by-step instructions, see the individual files in `docs/stubs/`:

| # | File | Methods |
|---|------|---------|
| 1 | [01-CHAT-STORAGE.md](stubs/01-CHAT-STORAGE.md) | 4 |
| 2 | [02-FOOD-APPLIANCES.md](stubs/02-FOOD-APPLIANCES.md) | 15 |
| 3 | [03-FOOD-CACHE.md](stubs/03-FOOD-CACHE.md) | 2 |
| 4 | [04-SUPPORT-STORAGE.md](stubs/04-SUPPORT-STORAGE.md) | 5 |
| 5 | [05-SECURITY-STORAGE.md](stubs/05-SECURITY-STORAGE.md) | 3 |
| 6 | [06-EXPERIMENTS-STORAGE.md](stubs/06-EXPERIMENTS-STORAGE.md) | 1 |
| 7 | [07-SCHEDULING-STORAGE.md](stubs/07-SCHEDULING-STORAGE.md) | 8 |
| 8 | [08-IMAGE-PROCESSING.md](stubs/08-IMAGE-PROCESSING.md) | 6 |

---

## Quick Reference: All Prompts in Order

For a complete implementation, run these prompts in sequence:

1. **Chat:** Prompt 1.1 → Prompt 1.2
2. **Appliances:** Prompt 2.1 → Prompt 2.2 → Prompt 2.3
3. **Cache:** Prompt 3.1 → Prompt 3.2
4. **Support:** Prompt 4.1 → Prompt 4.2
5. **Security:** Prompt 5.1 → Prompt 5.2
6. **Experiments:** Prompt 6.1 → Prompt 6.2
7. **Scheduling:** Prompt 7.1 → Prompt 7.2 → Prompt 7.3
8. **Image Processing:** Prompt 8.1 → Prompt 8.2 → Prompt 8.3

**Estimated time:** 2-3 hours for full implementation

---

## Post-Implementation Checklist

After implementing all stubs:

- [ ] Run `npm run db:push` to apply all schema changes
- [ ] Run `npm run check` to verify TypeScript types
- [ ] Update `replit.md` storage layer status
- [ ] Run E2E tests to verify no regressions
- [ ] Remove console.warn stub messages from StorageRoot.ts
