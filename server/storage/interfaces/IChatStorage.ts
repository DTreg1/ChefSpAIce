/**
 * Chat Storage Interface
 * Handles chat messages and AI assistant interactions
 * 
 * Note: Conversation-based methods were removed as those tables don't exist in the schema.
 * For chat history, use ChatMessage-based methods below.
 */

import type {
  ChatMessage,
  InsertChatMessage,
} from "@shared/schema";

export interface IChatStorage {
  // Chat Messages
  getChatMessages(userId: string, limit?: number): Promise<ChatMessage[]>;
  
  getChatMessagesPaginated(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{ messages: ChatMessage[]; total: number }>;
  
  createChatMessage(
    userId: string,
    message: Omit<InsertChatMessage, "id" | "userId">,
  ): Promise<ChatMessage>;
  
  deleteChatHistory(userId: string): Promise<void>;
}