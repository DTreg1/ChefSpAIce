/**
 * Compatibility types for legacy chat functionality
 * These types provide backward compatibility while transitioning to the new conversation system
 */

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

// Legacy userChats table stub - not actually in database
// This is a compatibility shim to prevent import errors
export const userChats = {} as any;