# Chat Storage Implementation

**Priority:** High  
**File:** `server/storage/domains/chat.storage.ts`  
**Stub Count:** 4 methods

## Current Status

The chat storage has stub methods because the `chat_messages` table doesn't exist in the schema yet.

## Methods to Implement

| Method                                            | Description                             |
| ------------------------------------------------- | --------------------------------------- |
| `getChatMessages(userId, limit)`                  | Fetch user's chat history               |
| `getChatMessagesPaginated(userId, limit, offset)` | Paginated chat history with total count |
| `createChatMessage(userId, message)`              | Save new chat message                   |
| `deleteChatHistory(userId)`                       | Clear user's chat history               |

---

## Step 1: Create Schema

Copy and paste this prompt:

```
Create the chat_messages table in shared/schema/chat.ts. The table should have:

- id: uuid primary key with defaultRandom()
- userId: text, not null, references users table
- role: text, not null - either 'user' or 'assistant'
- content: text, not null - the message content
- metadata: jsonb, nullable - for storing context like recipe IDs, ingredient references
- createdAt: timestamp, default now()

Also create:
1. InsertChatMessage type using createInsertSchema with id and createdAt omitted
2. ChatMessage select type using $inferSelect

Make sure to export the table and types. After creating, run npm run db:push to create the table.
```

---

## Step 2: Implement Storage Methods

Copy and paste this prompt:

```
Now implement the 4 chat storage methods in server/storage/domains/chat.storage.ts:

1. getChatMessages(userId: string, limit: number = 100): Promise<ChatMessage[]>
   - Select from chat_messages where userId matches
   - Order by createdAt DESC
   - Apply limit
   - Return array of messages

2. getChatMessagesPaginated(userId: string, limit: number, offset: number): Promise<{ messages: ChatMessage[]; total: number }>
   - Get total count for userId
   - Get messages with limit and offset, ordered by createdAt DESC
   - Return both messages array and total count

3. createChatMessage(userId: string, message: Omit<InsertChatMessage, "id" | "userId">): Promise<ChatMessage>
   - Insert new message with userId
   - Use .returning() to get the created record
   - Return the created message

4. deleteChatHistory(userId: string): Promise<void>
   - Delete all messages where userId matches

Import the chatMessages table and types from @shared/schema/chat. Use Drizzle's eq, desc, count functions as needed.
```

---

## Verification

After implementation, test with:

```
Run the application and verify:
1. The chat feature can save messages to the database
2. Chat history persists between sessions
3. Users can only see their own messages
4. Delete chat history works correctly

Check for any TypeScript errors with npm run check.
```
