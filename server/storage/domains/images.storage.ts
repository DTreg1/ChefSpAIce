/**
 * @file server/storage/domains/images.storage.ts
 * @description Image processing and preset management storage operations
 *
 * Domain: Image Processing
 * Scope: Processing jobs, presets, image operations
 *
 * EXPORT PATTERN:
 * - Export CLASS (ImagesStorage) for dependency injection and testing
 * - Export singleton INSTANCE (imagesStorage) for convenience in production code
 * - Facades should instantiate their own instances OR use the shared singleton consistently
 */

import { db } from "../../db";
import { and, eq, desc, asc, type SQL } from "drizzle-orm";
import {
  imageProcessingJobs,
  imagePresets,
  type ImageProcessingJob,
  type InsertImageProcessingJob,
  type ImagePreset,
  type InsertImagePreset,
} from "@shared/schema/images";

/**
 * Images Storage
 *
 * Manages image processing jobs and presets.
 * Handles job creation, status updates, and preset management.
 */
export class ImagesStorage {
  // ==================== Image Processing Jobs ====================

  async createImageProcessingJob(
    job: InsertImageProcessingJob,
  ): Promise<ImageProcessingJob> {
    const [created] = await db
      .insert(imageProcessingJobs)
      .values(job as typeof imageProcessingJobs.$inferInsert)
      .returning();
    return created;
  }

  async updateImageProcessingJob(
    jobId: string,
    data: Partial<Omit<ImageProcessingJob, "id" | "createdAt">>,
  ): Promise<ImageProcessingJob> {
    const [updated] = await db
      .update(imageProcessingJobs)
      .set(data)
      .where(eq(imageProcessingJobs.id, jobId))
      .returning();
    return updated;
  }

  async getImageProcessingJob(
    jobId: string,
  ): Promise<ImageProcessingJob | undefined> {
    const [job] = await db
      .select()
      .from(imageProcessingJobs)
      .where(eq(imageProcessingJobs.id, jobId))
      .limit(1);
    return job;
  }

  async getImageProcessingJobs(filters?: {
    userId?: string;
    status?: string;
    operation?: string;
  }): Promise<ImageProcessingJob[]> {
    const conditions: SQL<unknown>[] = [];

    if (filters?.userId) {
      conditions.push(eq(imageProcessingJobs.userId, filters.userId));
    }
    if (filters?.status) {
      conditions.push(eq(imageProcessingJobs.status, filters.status));
    }
    if (filters?.operation) {
      conditions.push(eq(imageProcessingJobs.operation, filters.operation));
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(imageProcessingJobs)
        .where(and(...conditions))
        .orderBy(desc(imageProcessingJobs.createdAt));
    }

    return await db
      .select()
      .from(imageProcessingJobs)
      .orderBy(desc(imageProcessingJobs.createdAt));
  }

  // ==================== Image Presets ====================

  async getImagePresets(filters?: {
    isDefault?: boolean;
    userId?: string;
    isPublic?: boolean;
  }): Promise<ImagePreset[]> {
    const conditions: SQL<unknown>[] = [];

    if (filters?.isDefault !== undefined) {
      conditions.push(eq(imagePresets.isDefault, filters.isDefault));
    }
    if (filters?.userId) {
      conditions.push(eq(imagePresets.userId, filters.userId));
    }
    if (filters?.isPublic !== undefined) {
      conditions.push(eq(imagePresets.isPublic, filters.isPublic));
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(imagePresets)
        .where(and(...conditions))
        .orderBy(asc(imagePresets.name));
    }

    return await db.select().from(imagePresets).orderBy(asc(imagePresets.name));
  }

  async getImagePreset(presetId: number): Promise<ImagePreset | undefined> {
    const [preset] = await db
      .select()
      .from(imagePresets)
      .where(eq(imagePresets.id, presetId))
      .limit(1);
    return preset;
  }

  async createImagePreset(preset: InsertImagePreset): Promise<ImagePreset> {
    const [created] = await db
      .insert(imagePresets)
      .values(preset as typeof imagePresets.$inferInsert)
      .returning();
    return created;
  }

  async updateImagePreset(
    presetId: number,
    data: Partial<Omit<ImagePreset, "id" | "createdAt">>,
  ): Promise<ImagePreset> {
    const [updated] = await db
      .update(imagePresets)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(imagePresets.id, presetId))
      .returning();
    return updated;
  }

  async deleteImagePreset(presetId: number): Promise<void> {
    await db.delete(imagePresets).where(eq(imagePresets.id, presetId));
  }
}

// Export singleton instance for convenience
export const imagesStorage = new ImagesStorage();
