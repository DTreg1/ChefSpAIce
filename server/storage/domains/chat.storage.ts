/**
 * Chat Domain Storage
 * Handles chat messages and AI assistant interactions
 * 
 * EXPORT PATTERN:
 * - Export CLASS (ChatDomainStorage) for dependency injection and testing
 * - Export singleton INSTANCE (chatStorage) for convenience in production code
 * - Facades should instantiate their own instances OR use the shared singleton consistently
 */

import { eq, desc, count } from "drizzle-orm";
import { db } from "../../db";
import {
  chatMessages,
  type ChatMessage,
  type InsertChatMessage
} from "@shared/schema";
import type { IChatStorage } from "../interfaces/IChatStorage";

export class ChatDomainStorage implements IChatStorage {
  async getChatMessages(userId: string, limit: number = 100): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }
  
  async getChatMessagesPaginated(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<{ messages: ChatMessage[]; total: number }> {
    const [messages, totalResult] = await Promise.all([
      db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.userId, userId))
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(chatMessages)
        .where(eq(chatMessages.userId, userId)),
    ]);

    return {
      messages,
      total: totalResult[0]?.count ?? 0,
    };
  }
  
  async createChatMessage(
    userId: string,
    message: Omit<InsertChatMessage, "id" | "userId">,
  ): Promise<ChatMessage> {
    const [created] = await db
      .insert(chatMessages)
      .values({
        userId,
        role: message.role,
        content: message.content,
        metadata: message.metadata,
      })
      .returning();
    
    return created;
  }
  
  async deleteChatHistory(userId: string): Promise<void> {
    await db
      .delete(chatMessages)
      .where(eq(chatMessages.userId, userId));
  }
}

// Export singleton instance for convenience
export const chatStorage = new ChatDomainStorage();
