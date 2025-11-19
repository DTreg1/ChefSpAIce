/**
 * Chat Storage Interface
 * Handles chat messages, conversations, and AI assistant interactions
 */

import type {
  ChatMessage,
  InsertChatMessage,
  Conversation,
  InsertConversation,
  Message,
  InsertMessage,
  ConversationContext,
  InsertConversationContext,
} from "@shared/schema";

export interface IChatStorage {
  // Legacy Chat Messages
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
  
  // Conversations
  getConversations(userId: string): Promise<Conversation[]>;
  
  getConversation(
    userId: string,
    conversationId: string,
  ): Promise<Conversation | undefined>;
  
  createConversation(
    userId: string,
    conversation: Omit<InsertConversation, "userId">,
  ): Promise<Conversation>;
  
  updateConversation(
    userId: string,
    conversationId: string,
    updates: Partial<Conversation>,
  ): Promise<void>;
  
  deleteConversation(userId: string, conversationId: string): Promise<void>;
  
  // Messages
  getMessages(
    conversationId: string,
    limit?: number,
    offset?: number,
  ): Promise<Message[]>;
  
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Conversation Context
  getConversationContext(
    conversationId: string,
  ): Promise<ConversationContext | undefined>;
  
  updateConversationContext(
    conversationId: string,
    context: Partial<ConversationContext>,
  ): Promise<void>;
}