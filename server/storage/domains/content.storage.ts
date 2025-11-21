/**
 * @file server/storage/domains/content.storage.ts
 * @description Content categorization, tagging, and organization storage operations
 * 
 * Domain: Content Organization & Discovery
 * Scope: Categories, tags, embeddings, duplicate detection, related content
 */

import { db } from "../../db";
import { and, eq, desc, asc, sql, gte, lte, or, ne, isNull, type SQL } from "drizzle-orm";
import { createInsertData, createUpdateData, buildMetadata } from "../../types/storage-helpers";
import type { IContentStorage } from "../interfaces/IContentStorage";
import {
  categories,
  contentCategories,
  tags,
  contentTags,
  contentEmbeddings,
  duplicatePairs,
  relatedContentCache,
  type Category,
  type InsertCategory,
  type ContentCategory,
  type InsertContentCategory,
  type Tag,
  type InsertTag,
  type ContentTag,
  type InsertContentTag,
  type ContentEmbedding,
  type InsertContentEmbedding,
  type DuplicatePair,
  type InsertDuplicatePair,
  type RelatedContentCache,
  type InsertRelatedContentCache,
} from "@shared/schema/content";

/**
 * Content Storage
 * 
 * Manages hierarchical categories, flexible tagging, vector embeddings,
 * duplicate detection, and related content recommendations for content organization.
 */
export class ContentStorage implements IContentStorage {
  // ==================== Categories ====================

  async getCategories(parentId?: number | null): Promise<Category[]> {
    const conditions: SQL<unknown>[] = [eq(categories.isActive, true)];

    if (parentId === null) {
      conditions.push(isNull(categories.parentId));
    } else if (parentId !== undefined) {
      conditions.push(eq(categories.parentId, parentId));
    }

    return await db
      .select()
      .from(categories)
      .where(and(...conditions))
      .orderBy(asc(categories.sortOrder), asc(categories.name));
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    return category;
  }

  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, slug))
      .limit(1);
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [result] = await db
      .insert(categories)
      .values(category)
      .returning();
    return result;
  }

  async updateCategory(
    id: number,
    updates: Partial<Category>
  ): Promise<Category> {
    const [result] = await db
      .update(categories)
      .set({
        ...(updates),
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id))
      .returning();
    return result;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getCategoryHierarchy(): Promise<Category[]> {
    // Get all categories ordered by hierarchy
    return await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.parentId), asc(categories.sortOrder), asc(categories.name));
  }

  // ==================== Content Categories ====================

  async getContentCategories(
    contentId: string,
    contentType: string
  ): Promise<ContentCategory[]> {
    return await db
      .select()
      .from(contentCategories)
      .where(
        and(
          eq(contentCategories.contentId, contentId),
          eq(contentCategories.contentType, contentType)
        )
      );
  }

  async assignContentCategory(
    assignment: InsertContentCategory
  ): Promise<ContentCategory> {
    const [result] = await db
      .insert(contentCategories)
      .values(assignment)
      .onConflictDoUpdate({
        target: [
          contentCategories.contentId,
          contentCategories.categoryId,
        ],
        set: {
          isPrimary: assignment.isPrimary,
        },
      })
      .returning();
    return result;
  }

  async removeContentCategory(
    contentId: string,
    categoryId: number
  ): Promise<void> {
    await db
      .delete(contentCategories)
      .where(
        and(
          eq(contentCategories.contentId, contentId),
          eq(contentCategories.categoryId, categoryId)
        )
      );
  }

  async getContentByCategory(
    categoryId: number,
    contentType?: string,
    limit: number = 50
  ): Promise<ContentCategory[]> {
    const conditions: SQL<unknown>[] = [
      eq(contentCategories.categoryId, categoryId),
    ];

    if (contentType) {
      conditions.push(eq(contentCategories.contentType, contentType));
    }

    return await db
      .select()
      .from(contentCategories)
      .where(and(...conditions))
      .limit(limit);
  }

  async setPrimaryCategory(
    contentId: string,
    categoryId: number
  ): Promise<ContentCategory> {
    // First, unset any existing primary category for this content
    await db
      .update(contentCategories)
      .set({ isPrimary: false })
      .where(eq(contentCategories.contentId, contentId));

    // Then set the new primary category
    const [result] = await db
      .update(contentCategories)
      .set({ isPrimary: true })
      .where(
        and(
          eq(contentCategories.contentId, contentId),
          eq(contentCategories.categoryId, categoryId)
        )
      )
      .returning();
    return result;
  }

  // ==================== Tags ====================

  async getOrCreateTag(name: string): Promise<Tag> {
    const normalizedName = name.toLowerCase().trim();
    const slug = normalizedName.replace(/\s+/g, "-");

    // Try to get existing tag
    const [existing] = await db
      .select()
      .from(tags)
      .where(eq(tags.slug, slug))
      .limit(1);

    if (existing) {
      // Increment usage count
      await db
        .update(tags)
        .set({ usageCount: sql`${tags.usageCount} + 1` })
        .where(eq(tags.id, existing.id));
      return existing;
    }

    // Create new tag
    const [newTag] = await db
      .insert(tags)
      .values({
        name: normalizedName,
        slug: slug,
        usageCount: 1,
      })
      .returning();

    return newTag;
  }

  async getTrendingTags(limit: number = 10): Promise<Tag[]> {
    return await db
      .select()
      .from(tags)
      .orderBy(desc(tags.usageCount))
      .limit(limit);
  }

  async getAllTags(): Promise<Tag[]> {
    return await db
      .select()
      .from(tags)
      .orderBy(desc(tags.usageCount));
  }

  async getTag(id: number): Promise<Tag | undefined> {
    const [tag] = await db
      .select()
      .from(tags)
      .where(eq(tags.id, id))
      .limit(1);
    return tag;
  }

  async getTagBySlug(slug: string): Promise<Tag | undefined> {
    const [tag] = await db
      .select()
      .from(tags)
      .where(eq(tags.slug, slug))
      .limit(1);
    return tag;
  }

  async searchTags(query: string, limit: number = 10): Promise<Tag[]> {
    const searchQuery = `%${query.toLowerCase()}%`;
    return await db
      .select()
      .from(tags)
      .where(sql`LOWER(${tags.name}) LIKE ${searchQuery}`)
      .orderBy(desc(tags.usageCount))
      .limit(limit);
  }

  async getRelatedTags(tagId: number, limit: number = 5): Promise<Tag[]> {
    // Find content with this tag
    const contentWithTag = await db
      .select({
        contentId: contentTags.contentId,
        contentType: contentTags.contentType,
      })
      .from(contentTags)
      .where(eq(contentTags.tagId, tagId))
      .limit(10);

    if (contentWithTag.length === 0) {
      return [];
    }

    // Find other tags on the same content
    const relatedTagIds = await db
      .selectDistinct({ tagId: contentTags.tagId })
      .from(contentTags)
      .where(
        and(
          or(
            ...contentWithTag.map((c) =>
              and(
                eq(contentTags.contentId, c.contentId),
                eq(contentTags.contentType, c.contentType)
              )
            )
          ),
          ne(contentTags.tagId, tagId)
        )
      )
      .limit(limit * 2);

    if (relatedTagIds.length === 0) {
      return [];
    }

    // Get tag details
    const relatedTags = await db
      .select()
      .from(tags)
      .where(or(...relatedTagIds.map((r) => eq(tags.id, r.tagId))))
      .orderBy(desc(tags.usageCount))
      .limit(limit);

    return relatedTags;
  }

  async updateTagUsageCount(tagId: number, increment: number): Promise<void> {
    if (increment > 0) {
      await db
        .update(tags)
        .set({ usageCount: sql`${tags.usageCount} + ${increment}` })
        .where(eq(tags.id, tagId));
    } else if (increment < 0) {
      await db
        .update(tags)
        .set({ usageCount: sql`GREATEST(0, ${tags.usageCount} + ${increment})` })
        .where(eq(tags.id, tagId));
    }
  }

  // ==================== Content Tags ====================

  async getContentTags(
    contentId: string,
    contentType: string
  ): Promise<Array<ContentTag & { tag: Tag }>> {
    const results = await db
      .select({
        contentTag: contentTags,
        tag: tags,
      })
      .from(contentTags)
      .innerJoin(tags, eq(contentTags.tagId, tags.id))
      .where(
        and(
          eq(contentTags.contentId, contentId),
          eq(contentTags.contentType, contentType)
        )
      );

    return results.map((r) => ({
      ...r.contentTag,
      tag: r.tag,
    }));
  }

  async assignContentTag(assignment: InsertContentTag): Promise<ContentTag> {
    const [result] = await db
      .insert(contentTags)
      .values(assignment)
      .onConflictDoUpdate({
        target: [contentTags.contentId, contentTags.tagId],
        set: {
          contentType: assignment.contentType,
        },
      })
      .returning();
    return result;
  }

  async removeContentTag(contentId: string, tagId: number): Promise<void> {
    await db
      .delete(contentTags)
      .where(
        and(eq(contentTags.contentId, contentId), eq(contentTags.tagId, tagId))
      );

    // Decrement usage count
    await db
      .update(tags)
      .set({ usageCount: sql`GREATEST(0, ${tags.usageCount} - 1)` })
      .where(eq(tags.id, tagId));
  }

  async getContentByTag(
    tagId: number,
    contentType?: string,
    limit: number = 50
  ): Promise<ContentTag[]> {
    const conditions: SQL<unknown>[] = [eq(contentTags.tagId, tagId)];

    if (contentType) {
      conditions.push(eq(contentTags.contentType, contentType));
    }

    return await db
      .select()
      .from(contentTags)
      .where(and(...conditions))
      .limit(limit);
  }

  async bulkAssignTags(
    contentId: string,
    contentType: string,
    tagNames: string[]
  ): Promise<ContentTag[]> {
    const results: ContentTag[] = [];

    for (const tagName of tagNames) {
      const tag = await this.getOrCreateTag(tagName);
      const contentTag = await this.assignContentTag({
        contentId,
        contentType: contentType,
        tagId: tag.id,
      });
      results.push(contentTag);
    }

    return results;
  }

  // ==================== Content Embeddings ====================

  async upsertContentEmbedding(
    embedding: InsertContentEmbedding
  ): Promise<ContentEmbedding> {
    // Ensure embedding is a regular array for database compatibility
    const embeddingArray: number[] = Array.isArray(embedding.embedding)
      ? Array.from(embedding.embedding as ArrayLike<number>)
      : (embedding.embedding as number[]);

    const [result] = await db
      .insert(contentEmbeddings)
      .values({
        ...embedding,
        embedding: embeddingArray,
      })
      .onConflictDoUpdate({
        target: [
          contentEmbeddings.contentId,
          contentEmbeddings.contentType,
        ],
        set: {
          embedding: embeddingArray,
          embeddingType: embedding.embeddingType,
          metadata: embedding.metadata,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result;
  }

  async getContentEmbedding(
    contentId: string,
    contentType: string
  ): Promise<ContentEmbedding | undefined> {
    const [result] = await db
      .select()
      .from(contentEmbeddings)
      .where(
        and(
          eq(contentEmbeddings.contentId, contentId),
          eq(contentEmbeddings.contentType, contentType)
        )
      )
      .limit(1);
    return result;
  }

  async searchByEmbedding(
    queryEmbedding: number[],
    contentType: string,
    limit: number = 10
  ): Promise<Array<ContentEmbedding & { similarity: number }>> {
    // Calculate cosine similarity in PostgreSQL
    // This is a simplified version - in production you'd use pgvector extension
    const results = await db.execute(sql`
      WITH query_embedding AS (
        SELECT ARRAY[${sql.raw(queryEmbedding.join(","))}]::float8[] as embedding
      )
      SELECT 
        ce.*,
        (
          SELECT SUM(a * b) / (SQRT(SUM(a * a)) * SQRT(SUM(b * b)))
          FROM (
            SELECT 
              unnest(ce.embedding::float8[]) AS a,
              unnest(qe.embedding) AS b
            FROM query_embedding qe
          ) AS dot_product
        ) AS similarity
      FROM ${contentEmbeddings} ce, query_embedding qe
      WHERE ce.content_type = ${contentType}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `);

    return results.rows as Array<ContentEmbedding & { similarity: number }>;
  }

  async deleteContentEmbedding(
    contentId: string,
    contentType: string
  ): Promise<void> {
    await db
      .delete(contentEmbeddings)
      .where(
        and(
          eq(contentEmbeddings.contentId, contentId),
          eq(contentEmbeddings.contentType, contentType)
        )
      );
  }

  // ==================== Duplicate Detection ====================

  async getDuplicates(contentId: string): Promise<DuplicatePair[]> {
    return await db
      .select()
      .from(duplicatePairs)
      .where(
        or(
          eq(duplicatePairs.contentId1, contentId),
          eq(duplicatePairs.contentId2, contentId)
        )
      )
      .orderBy(desc(duplicatePairs.similarity));
  }

  async getPendingDuplicates(
    contentType?: string,
    limit: number = 50
  ): Promise<DuplicatePair[]> {
    const conditions: SQL<unknown>[] = [
      isNull(duplicatePairs.isConfirmed),
      eq(duplicatePairs.isDismissed, false),
    ];

    if (contentType) {
      conditions.push(eq(duplicatePairs.contentType, contentType));
    }

    return await db
      .select()
      .from(duplicatePairs)
      .where(and(...conditions))
      .orderBy(desc(duplicatePairs.similarity))
      .limit(limit);
  }

  async createDuplicatePair(pair: InsertDuplicatePair): Promise<DuplicatePair> {
    const [result] = await db
      .insert(duplicatePairs)
      .values(pair)
      .returning();
    return result;
  }

  async updateDuplicateStatus(
    pairId: string,
    isConfirmed: boolean | null,
    isDismissed: boolean,
    reviewedBy: string
  ): Promise<DuplicatePair> {
    const [result] = await db
      .update(duplicatePairs)
      .set({
        isConfirmed,
        isDismissed,
        reviewedBy,
        reviewedAt: new Date(),
      })
      .where(eq(duplicatePairs.id, pairId))
      .returning();
    return result;
  }

  async findPotentialDuplicates(
    contentId: string,
    contentType: string,
    similarityThreshold: number = 0.85
  ): Promise<DuplicatePair[]> {
    // Get embedding for the content
    const embedding = await this.getContentEmbedding(contentId, contentType);
    
    if (!embedding) {
      return [];
    }

    // Search for similar content
    const similar = await this.searchByEmbedding(
      embedding.embedding,
      contentType,
      20
    );

    // Filter by similarity threshold and exclude self
    const potentialDuplicates = similar.filter(
      (item) =>
        item.contentId !== contentId && item.similarity >= similarityThreshold
    );

    // Create duplicate pairs for high-similarity items
    const pairs: DuplicatePair[] = [];
    for (const item of potentialDuplicates) {
      const [existing] = await db
        .select()
        .from(duplicatePairs)
        .where(
          or(
            and(
              eq(duplicatePairs.contentId1, contentId),
              eq(duplicatePairs.contentId2, item.contentId)
            ),
            and(
              eq(duplicatePairs.contentId1, item.contentId),
              eq(duplicatePairs.contentId2, contentId)
            )
          )
        )
        .limit(1);

      if (!existing) {
        const pair = await this.createDuplicatePair({
          contentId1: contentId,
          contentId2: item.contentId,
          contentType: contentType,
          similarity: item.similarity,
        });
        pairs.push(pair);
      }
    }

    return pairs;
  }

  // ==================== Related Content Cache ====================

  async getRelatedContent(
    contentId: string,
    contentType: string
  ): Promise<RelatedContentCache | undefined> {
    const [result] = await db
      .select()
      .from(relatedContentCache)
      .where(
        and(
          eq(relatedContentCache.contentId, contentId),
          eq(relatedContentCache.contentType, contentType),
          gte(relatedContentCache.expiresAt, new Date())
        )
      )
      .limit(1);
    return result;
  }

  async cacheRelatedContent(
    cache: InsertRelatedContentCache
  ): Promise<RelatedContentCache> {
    // Delete old cache entries for this content
    await db
      .delete(relatedContentCache)
      .where(
        and(
          eq(relatedContentCache.contentId, cache.contentId),
          eq(relatedContentCache.contentType, cache.contentType)
        )
      );

    // Insert new cache entry
    const [result] = await db
      .insert(relatedContentCache)
      .values(cache)
      .returning();

    return result;
  }

  async invalidateRelatedContentCache(
    contentId: string,
    contentType: string
  ): Promise<void> {
    await db
      .delete(relatedContentCache)
      .where(
        and(
          eq(relatedContentCache.contentId, contentId),
          eq(relatedContentCache.contentType, contentType)
        )
      );
  }

  async cleanExpiredCache(): Promise<number> {
    const result = await db
      .delete(relatedContentCache)
      .where(lte(relatedContentCache.expiresAt, new Date()));

    return result.rowCount || 0;
  }

  // ==================== Content Organization Analytics ====================

  async getCategoryStats(categoryId: number): Promise<{
    totalContent: number;
    contentByType: Record<string, number>;
    childCategories: number;
  }> {
    // Get content count
    const contentResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(contentCategories)
      .where(eq(contentCategories.categoryId, categoryId));
    const totalContent = Number(contentResult[0]?.count || 0);

    // Get content by type
    const typeResults = await db
      .select({
        contentType: contentCategories.contentType,
        count: sql<number>`count(*)`,
      })
      .from(contentCategories)
      .where(eq(contentCategories.categoryId, categoryId))
      .groupBy(contentCategories.contentType);

    const contentByType: Record<string, number> = {};
    for (const row of typeResults) {
      contentByType[row.contentType] = Number(row.count);
    }

    // Get child categories count
    const childResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(categories)
      .where(eq(categories.parentId, categoryId));
    const childCategories = Number(childResult[0]?.count || 0);

    return {
      totalContent,
      contentByType,
      childCategories,
    };
  }

  async getTagStats(tagId: number): Promise<{
    totalContent: number;
    contentByType: Record<string, number>;
    relatedTagCount: number;
  }> {
    // Get content count
    const contentResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(contentTags)
      .where(eq(contentTags.tagId, tagId));
    const totalContent = Number(contentResult[0]?.count || 0);

    // Get content by type
    const typeResults = await db
      .select({
        contentType: contentTags.contentType,
        count: sql<number>`count(*)`,
      })
      .from(contentTags)
      .where(eq(contentTags.tagId, tagId))
      .groupBy(contentTags.contentType);

    const contentByType: Record<string, number> = {};
    for (const row of typeResults) {
      contentByType[row.contentType] = Number(row.count);
    }

    // Get related tags count (approximate)
    const relatedTags = await this.getRelatedTags(tagId, 100);
    const relatedTagCount = relatedTags.length;

    return {
      totalContent,
      contentByType,
      relatedTagCount,
    };
  }

  async getContentOrganization(
    contentId: string,
    contentType: string
  ): Promise<{
    categories: Category[];
    tags: Tag[];
    primaryCategory: Category | null;
  }> {
    // Get categories
    const contentCats = await this.getContentCategories(contentId, contentType);
    const categoryIds = contentCats.map((cc) => cc.categoryId);
    
    const categoriesData =
      categoryIds.length > 0
        ? await db
            .select()
            .from(categories)
            .where(or(...categoryIds.map((id) => eq(categories.id, id))))
        : [];

    const primaryCategoryId = contentCats.find((cc) => cc.isPrimary)?.categoryId;
    const primaryCategory = primaryCategoryId
      ? categoriesData.find((c) => c.id === primaryCategoryId) || null
      : null;

    // Get tags
    const contentTagsData = await this.getContentTags(contentId, contentType);
    const tagsData = contentTagsData.map((ct) => ct.tag);

    return {
      categories: categoriesData,
      tags: tagsData,
      primaryCategory,
    };
  }
}
