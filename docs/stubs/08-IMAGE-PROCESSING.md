# Image Processing Storage Implementation

**Priority:** Medium  
**File:** `server/storage/domains/ai-ml.storage.ts`  
**Stub Count:** 6 methods

## Current Status

Image processing job and preset methods are stubs because the tables don't exist.

## Methods to Implement

| Method                                  | Description           |
| --------------------------------------- | --------------------- |
| `createImageProcessingJob(job)`         | Create processing job |
| `updateImageProcessingJob(jobId, data)` | Update job status     |
| `getImageProcessingJob(jobId)`          | Get single job        |
| `getImageProcessingJobs(filters)`       | Get jobs with filters |
| `getImagePresets()`                     | Get all presets       |
| `createImagePreset(preset)`             | Create preset         |

---

## Step 1: Create Schema

Copy and paste this prompt:

```
Add two tables to shared/schema/images.ts:

1. imageProcessingJobs table:
   - id: uuid primary key with defaultRandom()
   - userId: text, not null, references users
   - sourceUrl: text, not null - original image URL
   - outputUrl: text, nullable - processed image URL
   - operation: text, not null - 'resize', 'compress', 'thumbnail', 'crop', 'watermark', 'optimize', 'convert'
   - presetId: text, nullable, references imagePresets
   - parameters: jsonb, not null - operation-specific params like {width, height, quality, format}
   - status: text, not null, default 'pending' - 'pending', 'processing', 'completed', 'failed', 'cancelled'
   - progress: integer, default 0 - 0-100 percentage
   - error: text, nullable - error message if failed
   - inputSize: integer, nullable - original file size in bytes
   - outputSize: integer, nullable - processed file size in bytes
   - processingTime: integer, nullable - time in milliseconds
   - startedAt: timestamp, nullable
   - completedAt: timestamp, nullable
   - createdAt: timestamp, default now()
   - updatedAt: timestamp, default now()

2. imagePresets table:
   - id: uuid primary key with defaultRandom()
   - name: text, not null, unique
   - description: text, nullable
   - operations: jsonb, not null - array of operations to apply in order
   - isDefault: boolean, default false
   - isSystem: boolean, default false - true for built-in presets
   - createdBy: text, nullable, references users
   - usageCount: integer, default 0
   - createdAt: timestamp, default now()
   - updatedAt: timestamp, default now()

Create insert schemas and select types. Export all. Run npm run db:push.
```

---

## Step 2: Seed Default Presets

Copy and paste this prompt:

```
Create default image presets for common operations. Add to server/data/image-presets.ts:

const defaultImagePresets = [
  {
    name: 'thumbnail-small',
    description: 'Small thumbnail (150x150)',
    operations: [{ type: 'resize', width: 150, height: 150, fit: 'cover' }],
    isDefault: true,
    isSystem: true
  },
  {
    name: 'thumbnail-medium',
    description: 'Medium thumbnail (300x300)',
    operations: [{ type: 'resize', width: 300, height: 300, fit: 'cover' }],
    isDefault: true,
    isSystem: true
  },
  {
    name: 'recipe-card',
    description: 'Recipe card image (400x300)',
    operations: [
      { type: 'resize', width: 400, height: 300, fit: 'cover' },
      { type: 'optimize', quality: 85 }
    ],
    isDefault: true,
    isSystem: true
  },
  {
    name: 'profile-avatar',
    description: 'Profile avatar (200x200 circle)',
    operations: [
      { type: 'resize', width: 200, height: 200, fit: 'cover' },
      { type: 'optimize', quality: 90 }
    ],
    isDefault: true,
    isSystem: true
  },
  {
    name: 'web-optimized',
    description: 'Web optimized (max 1200px, compressed)',
    operations: [
      { type: 'resize', width: 1200, height: null, fit: 'inside' },
      { type: 'optimize', quality: 80, format: 'webp' }
    ],
    isDefault: true,
    isSystem: true
  },
  {
    name: 'high-quality',
    description: 'High quality (max 2000px, minimal compression)',
    operations: [
      { type: 'resize', width: 2000, height: null, fit: 'inside' },
      { type: 'optimize', quality: 95 }
    ],
    isDefault: false,
    isSystem: true
  }
];

export default defaultImagePresets;

Add a function to seed these on startup if imagePresets table is empty.
```

---

## Step 3: Implement Storage Methods

Copy and paste this prompt:

```
Implement the 6 image processing methods in server/storage/domains/ai-ml.storage.ts:

1. createImageProcessingJob(job: InsertImageProcessingJob): Promise<ImageProcessingJob>
   - Insert the job record
   - Return created job

2. updateImageProcessingJob(jobId: string, data: Partial<ImageProcessingJob>): Promise<ImageProcessingJob>
   - Update job by id
   - Set updatedAt to now()
   - If status changes to 'processing', set startedAt if not set
   - If status changes to 'completed' or 'failed', set completedAt
   - Return updated job

3. getImageProcessingJob(jobId: string): Promise<ImageProcessingJob | undefined>
   - Select single job by id
   - Return job or undefined

4. getImageProcessingJobs(filters?: {
   userId?: string;
   status?: string;
   operation?: string;
   startDate?: Date;
   endDate?: Date;
}): Promise<ImageProcessingJob[]>
   - Build dynamic where clause from filters
   - Order by createdAt DESC
   - Return matching jobs

5. getImagePresets(includeSystemOnly?: boolean): Promise<ImagePreset[]>
   - Select all presets
   - If includeSystemOnly is true, filter by isSystem = true
   - Order by name ASC
   - Return presets

6. createImagePreset(preset: InsertImagePreset): Promise<ImagePreset>
   - Insert preset record
   - Return created preset

Import imageProcessingJobs and imagePresets from @shared/schema/images.
```

---

## Verification

After implementation, test with:

```
Verify image processing storage:
1. Jobs can be created with various operations
2. Job status updates correctly
3. Filters work for job queries
4. Presets are seeded and retrievable
5. Custom presets can be created
6. No TypeScript errors

Run npm run check.
```
