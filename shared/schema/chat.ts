/**
 * Chat Schema
 * 
 * Tables for chat/conversation functionality including AI assistant interactions.
 */

import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, jsonb, uuid, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

/**
 * Chat Messages Table
 * 
 * Stores chat messages between users and the AI assistant.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id
 * - role: Message role ('user' or 'assistant')
 * - content: Message content text
 * - metadata: Optional JSONB for context like recipe references
 * - createdAt: Message creation timestamp
 * 
 * Indexes:
 * - userId: Fast user-specific message queries
 * - createdAt: Efficient chronological ordering
 */
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("chat_messages_user_id_idx").on(table.userId),
  index("chat_messages_created_at_idx").on(table.createdAt),
]);

export const insertChatMessageSchema = createInsertSchema(chatMessages, {
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).nullable().optional(),
}).omit({ id: true, createdAt: true });

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

/**
 * Legacy userChats table stub - referenced by some services but not actually in database
 * This is a compatibility shim to prevent import errors
 */
export const userChats = {};
