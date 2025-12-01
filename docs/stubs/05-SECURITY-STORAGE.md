# Security Storage - Privacy Requests Implementation

**Priority:** Medium  
**File:** `server/storage/domains/security.storage.ts`  
**Stub Count:** 3 methods

## Current Status

Privacy request methods are stubs because the table doesn't exist.

## Methods to Implement

| Method | Description |
|--------|-------------|
| `logPrivacyRequest(request)` | Create privacy request |
| `getPrivacyRequests(filters)` | Get requests with filters |
| `processPrivacyRequest(requestId, status, processedBy)` | Update request status |

---

## Step 1: Create Schema

Copy and paste this prompt:

```
Add privacyRequests table to shared/schema/security.ts:

privacyRequests table:
- id: uuid primary key with defaultRandom()
- userId: text, not null, references users
- requestType: text, not null - 'data_export', 'data_deletion', 'account_deletion', 'opt_out_analytics', 'opt_out_marketing', 'access_request', 'rectification'
- status: text, not null, default 'pending' - 'pending', 'in_progress', 'completed', 'denied', 'cancelled'
- description: text, nullable - user's description of request
- dataCategories: text array, nullable - specific data types requested (e.g., ['recipes', 'inventory', 'chat_history'])
- processedBy: text, nullable - admin who processed
- processedAt: timestamp, nullable
- completedAt: timestamp, nullable
- responseNotes: text, nullable - admin notes on resolution
- downloadUrl: text, nullable - for data exports, temporary download link
- downloadExpiresAt: timestamp, nullable
- metadata: jsonb, nullable
- createdAt: timestamp, default now()
- updatedAt: timestamp, default now()

Create insert schema and select type. Export all. Run npm run db:push.
```

---

## Step 2: Implement Storage Methods

Copy and paste this prompt:

```
Implement the 3 privacy request methods in server/storage/domains/security.storage.ts:

1. logPrivacyRequest(request: InsertPrivacyRequest): Promise<PrivacyRequest>
   - Insert the privacy request
   - Return created record

2. getPrivacyRequests(filters?: {
   userId?: string;
   status?: string;
   requestType?: string;
   startDate?: Date;
   endDate?: Date;
}): Promise<PrivacyRequest[]>
   - Build dynamic where clause based on filters
   - Order by createdAt DESC
   - Return matching requests

3. processPrivacyRequest(
   requestId: string,
   status: string,
   processedBy: string,
   responseNotes?: string
): Promise<PrivacyRequest>
   - Update the request with:
     - status
     - processedBy
     - processedAt: new Date()
     - responseNotes if provided
     - completedAt: set to now() if status is 'completed'
     - updatedAt: new Date()
   - Return updated record

Import privacyRequests from @shared/schema/security. Use proper Drizzle patterns.
```

---

## Verification

After implementation, test with:

```
Verify privacy requests:
1. Users can submit privacy requests
2. Admins can view pending requests
3. Processing updates status correctly
4. Filters work for request type and status
5. No TypeScript errors

Run npm run check.
```
