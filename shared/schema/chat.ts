/**
 * Compatibility types for legacy chat functionality
 * These types provide backward compatibility while transitioning to the new conversation system
 */

import { z } from "zod";

// Legacy chat message type for backward compatibility
export type ChatMessage = {
  id: string;
  userId: string;
  role: string;
  content: string;
  similarityHash?: string | null;
  createdAt: Date;
};

export type InsertChatMessage = {
  userId?: string;
  role: string;
  content: string;
  similarityHash?: string | null;
};

// Legacy chat message schema for backward compatibility
export const insertChatMessageSchema = z.object({
  userId: z.string().optional(),
  role: z.string(),
  content: z.string(),
  similarityHash: z.string().nullable().optional(),
});

/**
 * Conversation with metadata type
 * Used for displaying conversation lists with message counts and last activity
 */
export type ConversationWithMetadata = {
  id: string;
  userId?: string;
  title?: string | null;
  lastMessage?: string | null;
  messageCount: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

// Legacy userChats table stub - not actually in database
// This is a compatibility shim to prevent import errors
export const userChats = {} as any;