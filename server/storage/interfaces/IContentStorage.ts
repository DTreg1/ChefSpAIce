/**
 * @file server/storage/interfaces/IContentStorage.ts
 * @description Interface for content categorization, tagging, and organization operations
 */

import type {
  Category,
  InsertCategory,
  ContentCategory,
  InsertContentCategory,
  Tag,
  InsertTag,
  ContentTag,
  InsertContentTag,
  ContentEmbedding,
  InsertContentEmbedding,
  DuplicatePair,
  InsertDuplicatePair,
  RelatedContentCache,
  InsertRelatedContentCache,
} from "@shared/schema/content";

export interface IContentStorage {
  // ==================== Categories ====================
  getCategories(parentId?: number | null): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, updates: Partial<Category>): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  getCategoryHierarchy(): Promise<Category[]>;

  // ==================== Content Categories ====================
  getContentCategories(
    contentId: string,
    contentType: string
  ): Promise<ContentCategory[]>;
  assignContentCategory(
    assignment: InsertContentCategory
  ): Promise<ContentCategory>;
  removeContentCategory(
    contentId: string,
    categoryId: number
  ): Promise<void>;
  getContentByCategory(
    categoryId: number,
    contentType?: string,
    limit?: number
  ): Promise<ContentCategory[]>;
  setPrimaryCategory(
    contentId: string,
    categoryId: number
  ): Promise<ContentCategory>;

  // ==================== Tags ====================
  getOrCreateTag(name: string): Promise<Tag>;
  getTrendingTags(limit?: number): Promise<Tag[]>;
  getAllTags(): Promise<Tag[]>;
  getTag(id: number): Promise<Tag | undefined>;
  getTagBySlug(slug: string): Promise<Tag | undefined>;
  searchTags(query: string, limit?: number): Promise<Tag[]>;
  getRelatedTags(tagId: number, limit?: number): Promise<Tag[]>;
  updateTagUsageCount(tagId: number, increment: number): Promise<void>;

  // ==================== Content Tags ====================
  getContentTags(
    contentId: string,
    contentType: string
  ): Promise<Array<ContentTag & { tag: Tag }>>;
  assignContentTag(assignment: InsertContentTag): Promise<ContentTag>;
  removeContentTag(
    contentId: string,
    tagId: number
  ): Promise<void>;
  getContentByTag(
    tagId: number,
    contentType?: string,
    limit?: number
  ): Promise<ContentTag[]>;
  bulkAssignTags(
    contentId: string,
    contentType: string,
    tagNames: string[]
  ): Promise<ContentTag[]>;

  // ==================== Content Embeddings ====================
  upsertContentEmbedding(
    embedding: InsertContentEmbedding
  ): Promise<ContentEmbedding>;
  getContentEmbedding(
    contentId: string,
    contentType: string
  ): Promise<ContentEmbedding | undefined>;
  searchByEmbedding(
    queryEmbedding: number[],
    contentType: string,
    limit?: number
  ): Promise<Array<ContentEmbedding & { similarity: number }>>;
  deleteContentEmbedding(contentId: string, contentType: string): Promise<void>;

  // ==================== Duplicate Detection ====================
  getDuplicates(contentId: string): Promise<DuplicatePair[]>;
  getPendingDuplicates(
    contentType?: string,
    limit?: number
  ): Promise<DuplicatePair[]>;
  createDuplicatePair(pair: InsertDuplicatePair): Promise<DuplicatePair>;
  updateDuplicateStatus(
    pairId: string,
    isConfirmed: boolean | null,
    isDismissed: boolean,
    reviewedBy: string
  ): Promise<DuplicatePair>;
  findPotentialDuplicates(
    contentId: string,
    contentType: string,
    similarityThreshold?: number
  ): Promise<DuplicatePair[]>;

  // ==================== Related Content Cache ====================
  getRelatedContent(
    contentId: string,
    contentType: string
  ): Promise<RelatedContentCache | undefined>;
  cacheRelatedContent(
    cache: InsertRelatedContentCache
  ): Promise<RelatedContentCache>;
  invalidateRelatedContentCache(
    contentId: string,
    contentType: string
  ): Promise<void>;
  cleanExpiredCache(): Promise<number>;

  // ==================== Content Organization Analytics ====================
  getCategoryStats(categoryId: number): Promise<{
    totalContent: number;
    contentByType: Record<string, number>;
    childCategories: number;
  }>;
  getTagStats(tagId: number): Promise<{
    totalContent: number;
    contentByType: Record<string, number>;
    relatedTagCount: number;
  }>;
  getContentOrganization(
    contentId: string,
    contentType: string
  ): Promise<{
    categories: Category[];
    tags: Tag[];
    primaryCategory: Category | null;
  }>;
}
