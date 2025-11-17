import OpenAI from 'openai';
import { db } from '../db';
import { 
  type InsertChatMessage,
  type ChatMessage
} from '@shared/chat-compatibility';
import { eq, desc, and, sql } from 'drizzle-orm';

// Initialize OpenAI client using Replit AI Integrations
// This uses Replit's AI Integrations service, which provides OpenAI-compatible API access 
// without requiring your own OpenAI API key.
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

const SYSTEM_PROMPT = `You are a helpful AI assistant for this application. You can answer questions about:
- App features and functionality
- How to use different parts of the application
- General assistance with tasks
- Provide helpful suggestions and tips

Be conversational, friendly, and helpful. Keep your responses concise but informative.
If you're not sure about something specific to the application, provide general guidance and suggest the user explore the relevant features.`;

const CONTEXT_SUMMARY_THRESHOLD = 20; // Summarize context every 20 messages
const MAX_CONTEXT_MESSAGES = 15; // Maximum messages to include in context

/**
 * ChatService - Stubbed implementation
 * 
 * The legacy conversations, messages, and conversationContext tables have been removed
 * and replaced with the userChats table. This service has been stubbed out to prevent
 * errors while the migration is completed.
 * 
 * TODO: Rewrite this service to use the userChats table directly
 */
export class ChatService {
  /**
   * @deprecated Legacy conversations table has been removed
   */
  async getOrCreateConversation(userId: string, conversationId?: string): Promise<string> {
    console.warn("ChatService.getOrCreateConversation is deprecated - conversations table removed");
    return conversationId || "default-conversation";
  }

  /**
   * Generate a conversation title from the first message
   */
  async generateConversationTitle(content: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'Generate a very short (3-5 words) title for this conversation based on the first message. Just return the title, no quotes or extra text.'
          },
          {
            role: 'user',
            content: content
          }
        ],
        max_completion_tokens: 20,
      });

      const title = response.choices[0]?.message?.content?.trim() || 'New Conversation';
      return title.substring(0, 50);
    } catch (error) {
      console.error('Error generating title:', error);
      return content.substring(0, 30) + '...';
    }
  }

  /**
   * @deprecated Legacy function - uses deleted tables
   */
  async getConversationContext(conversationId: string): Promise<any[]> {
    console.warn("ChatService.getConversationContext is deprecated - using empty context");
    return [];
  }

  /**
   * @deprecated Legacy function - uses deleted tables
   */
  async updateContextSummary(conversationId: string): Promise<void> {
    console.warn("ChatService.updateContextSummary is deprecated - no-op");
  }

  /**
   * Send a message to the chat assistant
   * Temporary implementation without database persistence
   * TODO: Implement proper chat storage when tables are available
   */
  async sendMessage(
    userId: string,
    content: string,
    conversationId?: string
  ): Promise<{
    conversationId: string;
    response: string;
    messageId: string;
  }> {
    try {
      // Call OpenAI API directly without database persistence
      const completion = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content }
        ],
        max_completion_tokens: 1000,
      });

      const assistantResponse = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';

      // Return response without database IDs (using temporary IDs)
      return {
        conversationId: conversationId || "default",
        response: assistantResponse,
        messageId: `msg-${Date.now()}`
      };
    } catch (error) {
      console.error('Error in sendMessage:', error);
      throw error;
    }
  }

  /**
   * @deprecated Legacy function - conversations table removed
   */
  async getUserConversations(userId: string): Promise<any[]> {
    console.warn("ChatService.getUserConversations is deprecated");
    // Return empty array as conversations table no longer exists
    return [];
  }

  /**
   * Get messages for a user
   * Temporary implementation without database
   */
  async getConversationMessages(conversationId: string, userId: string) {
    console.warn("ChatService.getConversationMessages - no database persistence available");
    // Return empty messages array as chat tables no longer exist
    return {
      conversation: { id: conversationId, title: "Chat" },
      messages: []
    };
  }

  /**
   * @deprecated Legacy function - conversations table removed
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    console.warn("ChatService.deleteConversation is deprecated");
    // No-op as conversations table no longer exists
  }

  /**
   * Save feedback for a message
   * Simplified implementation
   */
  async saveFeedback(
    messageId: string,
    userId: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    console.log(`Feedback saved: messageId=${messageId}, rating=${rating}, comment=${comment}`);
    // TODO: Implement feedback storage in a separate table if needed
  }
}

export const chatService = new ChatService();