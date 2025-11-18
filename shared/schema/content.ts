/**
 * Content & Categorization Schema
 * 
 * Tables for content organization, embeddings, and search optimization.
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, index, jsonb, real, serial, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

// ==================== TypeScript Interfaces ====================

/**
 * Content embedding metadata
 */
export interface EmbeddingMetadata {
  model?: string;
  version?: string;
  dimensions?: number;
  processingTime?: number;
  [key: string]: any;
}

/**
 * Related content cache structure
 */
export interface RelatedContentData {
  contentIds: string[];
  scores: number[];
  algorithm: string;
  parameters?: Record<string, any>;
}

// ==================== Tables ====================

/**
 * Categories Table
 * 
 * Hierarchical category structure for content organization.
 */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  parentId: integer("parent_id"),
  description: text("description"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("categories_slug_idx").on(table.slug),
  index("categories_parent_id_idx").on(table.parentId),
]);

/**
 * Content Categories Table
 * 
 * Many-to-many relationship between content and categories.
 */
export const contentCategories = pgTable("content_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  contentType: text("content_type").notNull(), // 'recipe', 'article', 'product'
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("content_categories_content_idx").on(table.contentId, table.contentType),
  index("content_categories_category_id_idx").on(table.categoryId),
  uniqueIndex("content_categories_unique_idx").on(table.contentId, table.categoryId),
]);

/**
 * Tags Table
 * 
 * Flexible tagging system for content.
 */
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("tags_slug_idx").on(table.slug),
  index("tags_usage_count_idx").on(table.usageCount),
]);

/**
 * Content Tags Table
 * 
 * Many-to-many relationship between content and tags.
 */
export const contentTags = pgTable("content_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  contentType: text("content_type").notNull(), // 'recipe', 'article', 'product'
  tagId: integer("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("content_tags_content_idx").on(table.contentId, table.contentType),
  index("content_tags_tag_id_idx").on(table.tagId),
  uniqueIndex("content_tags_unique_idx").on(table.contentId, table.tagId),
]);

/**
 * Content Embeddings Table
 * 
 * Vector embeddings for semantic search and recommendations.
 */
export const contentEmbeddings = pgTable("content_embeddings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  contentType: text("content_type").notNull(), // 'recipe', 'article', 'product'
  embedding: jsonb("embedding").$type<number[]>().notNull(), // Vector embedding
  embeddingType: text("embedding_type"), // 'title', 'description', 'full'
  metadata: jsonb("metadata").$type<EmbeddingMetadata>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("content_embeddings_content_idx").on(table.contentId, table.contentType),
  index("content_embeddings_type_idx").on(table.embeddingType),
]);

/**
 * Duplicate Pairs Table
 * 
 * Track potential duplicate content for deduplication.
 */
export const duplicatePairs = pgTable("duplicate_pairs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId1: varchar("content_id_1").notNull(),
  contentId2: varchar("content_id_2").notNull(),
  contentType: text("content_type").notNull(),
  similarity: real("similarity").notNull(), // 0-1 similarity score
  isConfirmed: boolean("is_confirmed"),
  isDismissed: boolean("is_dismissed").notNull().default(false),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("duplicate_pairs_content1_idx").on(table.contentId1),
  index("duplicate_pairs_content2_idx").on(table.contentId2),
  index("duplicate_pairs_similarity_idx").on(table.similarity),
]);

/**
 * Related Content Cache Table
 * 
 * Cached related content recommendations.
 */
export const relatedContentCache = pgTable("related_content_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  contentType: text("content_type").notNull(),
  relatedContent: jsonb("related_content").$type<RelatedContentData>().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("related_content_cache_content_idx").on(table.contentId, table.contentType),
  index("related_content_cache_expires_idx").on(table.expiresAt),
]);

// ==================== Zod Schemas & Type Exports ====================

export const contentTypeSchema = z.enum(['recipe', 'article', 'product', 'document', 'media']);
export const embeddingTypeSchema = z.enum(['title', 'description', 'full', 'summary']);

export const insertCategorySchema = createInsertSchema(categories)
  .extend({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    sortOrder: z.number().default(0),
  });

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const insertContentCategorySchema = createInsertSchema(contentCategories)
  .extend({
    contentType: contentTypeSchema,
  });

export type InsertContentCategory = z.infer<typeof insertContentCategorySchema>;
export type ContentCategory = typeof contentCategories.$inferSelect;

export const insertTagSchema = createInsertSchema(tags)
  .extend({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    usageCount: z.number().nonnegative().default(0),
  });

export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;

export const insertContentTagSchema = createInsertSchema(contentTags)
  .extend({
    contentType: contentTypeSchema,
  });

export type InsertContentTag = z.infer<typeof insertContentTagSchema>;
export type ContentTag = typeof contentTags.$inferSelect;

export const insertContentEmbeddingSchema = createInsertSchema(contentEmbeddings)
  .extend({
    contentType: contentTypeSchema,
    embeddingType: embeddingTypeSchema.optional(),
    embedding: z.array(z.number()),
  });

export type InsertContentEmbedding = z.infer<typeof insertContentEmbeddingSchema>;
export type ContentEmbedding = typeof contentEmbeddings.$inferSelect;

export const insertDuplicatePairSchema = createInsertSchema(duplicatePairs)
  .extend({
    contentType: contentTypeSchema,
    similarity: z.number().min(0).max(1),
  });

export type InsertDuplicatePair = z.infer<typeof insertDuplicatePairSchema>;
export type DuplicatePair = typeof duplicatePairs.$inferSelect;

export const insertRelatedContentCacheSchema = createInsertSchema(relatedContentCache)
  .extend({
    contentType: contentTypeSchema,
  });

export type InsertRelatedContentCache = z.infer<typeof insertRelatedContentCacheSchema>;
export type RelatedContentCache = typeof relatedContentCache.$inferSelect;