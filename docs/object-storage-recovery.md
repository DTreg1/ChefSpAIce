# Object Storage Recovery Procedure

## What Is Stored in Object Storage

Replit Object Storage holds **recipe images** for ChefSpAIce. These are AI-generated or user-uploaded images associated with saved recipes.

### Storage Layout

All images live under the `public/recipe-images/` prefix in the default bucket:

| File Pattern | Description |
|---|---|
| `public/recipe-images/{recipeId}.webp` | Full-size display image (processed to WebP) |
| `public/recipe-images/{recipeId}-thumb.webp` | Thumbnail image |
| `public/recipe-images/{recipeId}.jpg` | Legacy JPEG format (older uploads) |

The `recipeId` corresponds to the `item_id` column in the `user_saved_recipes` table. The public URL is constructed as:

```
https://storage.googleapis.com/{bucketId}/public/recipe-images/{recipeId}.webp
```

The `cloudImageUri` column on `user_saved_recipes` stores the full public URL for each recipe's image.

### Inventory Item Images

Inventory items have an `image_uri` column but these store **local device URIs** (client-side photos), not object storage paths. They are not affected by object storage loss.

---

## Risk Assessment

Replit Object Storage does **not** offer built-in point-in-time recovery, versioning, or cross-region replication. If the bucket contents are lost (accidental deletion, service incident), the image files are gone.

However, the **impact is limited**:

- Recipe metadata (title, ingredients, instructions, nutrition) lives in PostgreSQL and is unaffected.
- Images are decorative — the app remains fully functional without them.
- AI-generated images can be re-created on demand.

---

## Recovery Options

### Option A: Accept Re-Generation (Current Approach — Recommended)

If object storage is lost, recipe images can be regenerated via the existing AI image generation pipeline. This is the simplest approach and requires no additional infrastructure.

**Recovery steps after object storage loss:**

1. Identify affected recipes by querying for non-null `cloudImageUri` values:
   ```sql
   SELECT id, user_id, item_id, title, cloud_image_uri
   FROM user_saved_recipes
   WHERE cloud_image_uri IS NOT NULL;
   ```

2. Clear stale image URLs so the app stops trying to load broken links:
   ```sql
   UPDATE user_saved_recipes
   SET cloud_image_uri = NULL
   WHERE cloud_image_uri IS NOT NULL;
   ```

3. Users will see placeholder/fallback images and can trigger re-generation individually through the recipe detail screen.

4. Optionally, run a bulk re-generation script that calls the AI image endpoint for each affected recipe using its title and description as the prompt.

**Pros:** Zero ongoing cost, no maintenance, no backup infrastructure.
**Cons:** Re-generation costs OpenAI API credits. Users see missing images until regenerated.

---

### Option B: Periodic Image Manifest Export

Export a manifest of all object storage keys alongside regular database backups. This doesn't back up the actual image bytes, but provides an audit trail for what existed.

**Implementation:**

Create a scheduled job or manual script that lists all keys in the bucket and writes them to the database or a file:

```typescript
import { Client } from "@replit/object-storage";

async function exportImageManifest(): Promise<string[]> {
  const client = new Client();
  const result = await client.list("public/recipe-images/");
  if (!result.ok) {
    throw new Error(`Failed to list objects: ${result.error.message}`);
  }
  return result.value.map(obj => obj.name);
}
```

Cross-reference against `user_saved_recipes.cloud_image_uri` to identify which recipes had images. This helps scope recovery efforts but does not restore the images themselves.

**Pros:** Cheap, lightweight, helps assess blast radius.
**Cons:** Does not actually back up image data.

---

### Option C: Secondary Storage Backup (Full Redundancy)

Copy recipe images to a secondary storage location (e.g., an external S3-compatible bucket or a different Replit Object Storage bucket).

**Implementation sketch:**

```typescript
import { Client } from "@replit/object-storage";

async function backupRecipeImages(destinationClient: ExternalStorageClient) {
  const client = new Client();
  const listResult = await client.list("public/recipe-images/");
  if (!listResult.ok) return;

  for (const obj of listResult.value) {
    const downloadResult = await client.downloadAsBytes(obj.name);
    if (downloadResult.ok) {
      await destinationClient.upload(obj.name, downloadResult.value);
    }
  }
}
```

Run weekly or after each image upload. Requires an external storage account and API credentials.

**Pros:** Full image recovery without AI regeneration costs.
**Cons:** Ongoing storage costs, additional API credentials to manage, added complexity.

---

## Recommendation

**Use Option A** (accept re-generation) unless the volume of recipe images becomes large enough that regeneration costs are a concern. The images are supplementary content — not critical user data — and the AI can reproduce them.

If monitoring shows that users frequently rely on recipe images (e.g., for meal prep reference), consider adding Option B (manifest export) as a lightweight middle ground to track what was lost.

---

## Related Database Backup

PostgreSQL data (recipes, inventory, user accounts) is backed up through Replit's built-in checkpoint system and Neon's managed PostgreSQL infrastructure. Database recovery is handled separately from object storage and is not covered in this document.
