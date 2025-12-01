# Support Storage Implementation

**Priority:** Medium  
**File:** `server/storage/domains/support.storage.ts`  
**Stub Count:** 5 methods

## Current Status

Ticket responses and moderation logs are not implemented because the tables don't exist.

## Methods to Implement

| Method | Description |
|--------|-------------|
| `addTicketResponse(ticketId, response)` | Add response to ticket |
| `getTicketResponses(ticketId)` | Get all responses for ticket |
| `getModerationLogs(filters)` | Get moderation history |
| `getModerationLogById(logId)` | Get single log entry |
| `getUserModerationHistory(userId)` | Get user's moderation history |

---

## Step 1: Create Schema

Copy and paste this prompt:

```
Add two tables to shared/schema/support.ts:

1. ticketResponses table:
   - id: uuid primary key with defaultRandom()
   - ticketId: text, not null, references tickets table
   - userId: text, not null - person responding (user or support agent)
   - content: text, not null
   - isInternal: boolean, default false - true for internal notes not visible to user
   - isFromAgent: boolean, default false - true if from support staff
   - attachments: jsonb, nullable - array of {url, filename, size}
   - createdAt: timestamp, default now()

2. moderationLogs table:
   - id: uuid primary key with defaultRandom()
   - userId: text, not null - user being moderated
   - moderatorId: text, not null - admin performing action
   - action: text, not null - 'warn', 'mute', 'ban', 'unban', 'delete_content', 'hide_content', 'approve_content'
   - reason: text, not null
   - targetType: text, nullable - 'recipe', 'comment', 'review', 'profile'
   - targetId: text, nullable - ID of the content being moderated
   - duration: integer, nullable - for mute/ban, duration in hours
   - expiresAt: timestamp, nullable - when mute/ban expires
   - metadata: jsonb, nullable - additional context
   - createdAt: timestamp, default now()

Create insert schemas and select types. Export all. Run npm run db:push.
```

---

## Step 2: Implement Storage Methods

Copy and paste this prompt:

```
Implement the 5 support storage methods in server/storage/domains/support.storage.ts:

1. addTicketResponse(ticketId: string, response: InsertTicketResponse): Promise<TicketResponse>
   - Insert the response with ticketId
   - Also update the ticket's updatedAt timestamp
   - Return the created response

2. getTicketResponses(ticketId: string): Promise<TicketResponse[]>
   - Select all responses for ticketId
   - Order by createdAt ASC (oldest first for conversation flow)
   - Return array of responses

3. getModerationLogs(filters?: {
   userId?: string;
   moderatorId?: string;
   action?: string;
   startDate?: Date;
   endDate?: Date;
}): Promise<ModerationLog[]>
   - Build dynamic where clause based on provided filters
   - Order by createdAt DESC
   - Return matching logs

4. getModerationLogById(logId: string): Promise<ModerationLog | undefined>
   - Select single log by id
   - Return log or undefined

5. getUserModerationHistory(userId: string): Promise<ModerationLog[]>
   - Select all logs where userId matches
   - Order by createdAt DESC
   - Return user's moderation history

Import tables from @shared/schema/support. Use Drizzle eq, and, gte, lte for filters.
```

---

## Verification

After implementation, test with:

```
Verify support storage:
1. Ticket responses save correctly
2. Responses display in order
3. Moderation logs record actions
4. Filters work correctly
5. No TypeScript errors

Run npm run check.
```
