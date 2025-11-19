/**
 * Chat Domain Storage
 * 
 * Handles all chat-related database operations including:
 * - Conversations management
 * - Messages and chat history
 * - AI assistant conversation context
 * - Legacy chat compatibility
 * 
 * This module is extracted from the monolithic storage.ts as part of the
 * domain-driven refactoring to improve maintainability and performance.
 */

import { and, eq, gte, sql, desc, asc } from "drizzle-orm";
import { db } from "../../db";
import {
  conversations,
  messages,
  conversationContext,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type ConversationContext,
  type InsertConversationContext,
  type ChatMessage,
  type InsertChatMessage
} from "@shared/schema";
import type { IChatStorage } from "../interfaces/IChatStorage";

export class ChatDomainStorage implements IChatStorage {
  // ============= Legacy Chat Messages (for backward compatibility) =============
  
  async getChatMessages(userId: string, limit: number = 100): Promise<ChatMessage[]> {
    try {
      // Get the most recent conversation for the user
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt))
        .limit(1);
      
      if (!conversation) {
        return [];
      }
      
      // Get messages from that conversation
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(desc(messages.timestamp))
        .limit(limit);
      
      // Map to ChatMessage format for backward compatibility
      return msgs.map((msg) => ({
        id: msg.id,
        userId: userId,
        role: msg.role,
        content: msg.content,
        similarityHash: null,
        createdAt: (msg.timestamp ?? new Date()).toISOString(),
      }));
    } catch (error) {
      console.error(`Error getting chat messages for user ${userId}:`, error);
      throw new Error("Failed to retrieve chat messages");
    }
  }
  
  async getChatMessagesPaginated(
    userId: string,
    limit: number,
    offset: number
  ): Promise<{ messages: ChatMessage[]; total: number }> {
    try {
      // Get the most recent conversation for the user
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt))
        .limit(1);
      
      if (!conversation) {
        return { messages: [], total: 0 };
      }
      
      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(messages)
        .where(eq(messages.conversationId, conversation.id));
      
      const total = countResult?.count || 0;
      
      // Get paginated messages
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.id))
        .orderBy(desc(messages.timestamp))
        .limit(limit)
        .offset(offset);
      
      // Map to ChatMessage format for backward compatibility
      const chatMessages: ChatMessage[] = msgs.map((msg) => ({
        id: msg.id,
        userId: userId,
        role: msg.role,
        content: msg.content,
        similarityHash: null,
        createdAt: (msg.timestamp ?? new Date()).toISOString(),
      }));
      
      return {
        messages: chatMessages,
        total: total,
      };
    } catch (error) {
      console.error(`Error getting paginated chat messages for user ${userId}:`, error);
      throw new Error("Failed to retrieve paginated chat messages");
    }
  }
  
  async createChatMessage(
    userId: string,
    message: Omit<InsertChatMessage, "id" | "userId">
  ): Promise<ChatMessage> {
    try {
      // Get or create the most recent conversation for the user
      let [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt))
        .limit(1);
      
      if (!conversation) {
        // Create a new conversation if none exists
        [conversation] = await db
          .insert(conversations)
          .values({
            userId: userId,
            title: "Chat Session",
          })
          .returning();
      }
      
      // Create the message in the messages table
      const [newMessage] = await db
        .insert(messages)
        .values({
          conversationId: conversation.id,
          role: message.role,
          content: message.content,
        })
        .returning();
      
      // Map to ChatMessage format for backward compatibility
      return {
        id: newMessage.id,
        userId: userId,
        role: newMessage.role,
        content: newMessage.content,
        similarityHash: null,
        createdAt: (newMessage.timestamp ?? new Date()).toISOString(),
      };
    } catch (error) {
      console.error(`Error creating chat message for user ${userId}:`, error);
      throw new Error("Failed to create chat message");
    }
  }
  
  // ============= Conversations =============
  
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      return await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.updatedAt));
    } catch (error) {
      console.error(`Error getting conversations for user ${userId}:`, error);
      throw new Error("Failed to retrieve conversations");
    }
  }
  
  async getConversation(
    userId: string,
    conversationId: string
  ): Promise<Conversation | undefined> {
    try {
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.userId, userId)
          )
        );
      
      return conversation;
    } catch (error) {
      console.error(`Error getting conversation ${conversationId}:`, error);
      throw new Error("Failed to retrieve conversation");
    }
  }
  
  async createConversation(
    userId: string,
    conversation: Omit<InsertConversation, "userId">
  ): Promise<Conversation> {
    try {
      const [newConversation] = await db
        .insert(conversations)
        .values({
          ...conversation,
          userId,
        })
        .returning();
      
      return newConversation;
    } catch (error) {
      console.error(`Error creating conversation for user ${userId}:`, error);
      throw new Error("Failed to create conversation");
    }
  }
  
  async updateConversation(
    userId: string,
    conversationId: string,
    updates: Partial<Conversation>
  ): Promise<void> {
    try {
      // Remove fields that shouldn't be updated
      const { id, userId: _userId, createdAt, ...safeUpdates } = updates;
      
      await db
        .update(conversations)
        .set({
          ...safeUpdates,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.userId, userId)
          )
        );
    } catch (error) {
      console.error(`Error updating conversation ${conversationId}:`, error);
      throw new Error("Failed to update conversation");
    }
  }
  
  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    try {
      // Delete all messages in the conversation first
      await db
        .delete(messages)
        .where(eq(messages.conversationId, conversationId));
      
      // Delete the conversation context
      await db
        .delete(conversationContext)
        .where(eq(conversationContext.conversationId, conversationId));
      
      // Delete the conversation
      await db
        .delete(conversations)
        .where(
          and(
            eq(conversations.id, conversationId),
            eq(conversations.userId, userId)
          )
        );
    } catch (error) {
      console.error(`Error deleting conversation ${conversationId}:`, error);
      throw new Error("Failed to delete conversation");
    }
  }
  
  // ============= Messages =============
  
  async getMessages(
    conversationId: string,
    limit?: number,
    offset?: number
  ): Promise<Message[]> {
    try {
      // Build the base query
      const baseQuery = db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(asc(messages.timestamp));
      
      // Apply limit and offset if provided
      if (limit !== undefined && offset !== undefined) {
        return await baseQuery.limit(limit).offset(offset);
      } else if (limit !== undefined) {
        return await baseQuery.limit(limit);
      } else {
        return await baseQuery;
      }
    } catch (error) {
      console.error(`Error getting messages for conversation ${conversationId}:`, error);
      throw new Error("Failed to retrieve messages");
    }
  }
  
  async createMessage(message: InsertMessage): Promise<Message> {
    try {
      const [newMessage] = await db
        .insert(messages)
        .values(message)
        .returning();
      
      // Update conversation's updatedAt timestamp
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, message.conversationId));
      
      return newMessage;
    } catch (error) {
      console.error("Error creating message:", error);
      throw new Error("Failed to create message");
    }
  }
  
  // ============= Conversation Context =============
  
  async getConversationContext(
    conversationId: string
  ): Promise<ConversationContext | undefined> {
    try {
      const [context] = await db
        .select()
        .from(conversationContext)
        .where(eq(conversationContext.conversationId, conversationId));
      
      return context;
    } catch (error) {
      console.error(`Error getting context for conversation ${conversationId}:`, error);
      throw new Error("Failed to retrieve conversation context");
    }
  }
  
  async updateConversationContext(
    conversationId: string,
    context: Partial<ConversationContext>
  ): Promise<void> {
    try {
      const existingContext = await this.getConversationContext(conversationId);
      
      if (existingContext) {
        // Update existing context - only update provided fields
        const updateData: any = {};
        
        if (context.contextSummary !== undefined) {
          updateData.contextSummary = context.contextSummary;
        }
        if (context.keyFacts !== undefined) {
          updateData.keyFacts = context.keyFacts;
        }
        if (context.messageCount !== undefined) {
          updateData.messageCount = context.messageCount;
        }
        
        // Always update the lastSummarized timestamp
        updateData.lastSummarized = new Date();
        
        await db
          .update(conversationContext)
          .set(updateData)
          .where(eq(conversationContext.conversationId, conversationId));
      } else {
        // Create new context with default values
        await db
          .insert(conversationContext)
          .values({
            conversationId,
            contextSummary: context.contextSummary || null,
            keyFacts: context.keyFacts || [],
            lastSummarized: new Date(),
            messageCount: context.messageCount || 0,
          });
      }
    } catch (error) {
      console.error(`Error updating context for conversation ${conversationId}:`, error);
      throw new Error("Failed to update conversation context");
    }
  }
}

// Export singleton instance
export const chatStorage = new ChatDomainStorage();