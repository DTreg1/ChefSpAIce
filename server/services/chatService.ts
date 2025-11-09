import OpenAI from 'openai';
import { db } from '../db';
import { 
  conversations, 
  messages, 
  conversationContext,
  type InsertMessage,
  type InsertConversation,
  type InsertConversationContext,
  type ConversationWithMetadata
} from '@shared/schema';
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

export class ChatService {
  /**
   * Create or get an existing conversation for a user
   */
  async getOrCreateConversation(userId: string, conversationId?: string): Promise<string> {
    if (conversationId) {
      // Verify conversation exists and belongs to user
      const existing = await db.select()
        .from(conversations)
        .where(and(
          eq(conversations.id, conversationId),
          eq(conversations.userId, userId)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        return conversationId;
      }
    }

    // Create new conversation
    const newConversation: InsertConversation = {
      userId,
      title: 'New Conversation'
    };

    const [created] = await db.insert(conversations)
      .values([newConversation])
      .returning();

    return created.id;
  }

  /**
   * Generate a conversation title from the first message
   */
  async generateConversationTitle(content: string): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-5', // the newest OpenAI model is "gpt-5" which was released August 7, 2025
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
      return title.substring(0, 50); // Limit title length
    } catch (error) {
      console.error('Error generating title:', error);
      return content.substring(0, 30) + '...';
    }
  }

  /**
   * Get conversation context (recent messages + summary)
   */
  async getConversationContext(conversationId: string): Promise<any[]> {
    const contextMessages: any[] = [];

    // Get conversation context summary if exists
    const [context] = await db.select()
      .from(conversationContext)
      .where(eq(conversationContext.conversationId, conversationId))
      .limit(1);

    if (context?.contextSummary) {
      contextMessages.push({
        role: 'system',
        content: `Previous conversation summary: ${context.contextSummary}\nKey facts: ${JSON.stringify(context.keyFacts || [])}`
      });
    }

    // Get recent messages
    const recentMessages = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.timestamp))
      .limit(MAX_CONTEXT_MESSAGES);

    // Add messages in chronological order
    recentMessages.reverse().forEach(msg => {
      contextMessages.push({
        role: msg.role,
        content: msg.content
      });
    });

    return contextMessages;
  }

  /**
   * Update conversation context summary
   */
  async updateContextSummary(conversationId: string): Promise<void> {
    try {
      // Get all messages in conversation
      const allMessages = await db.select()
        .from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.timestamp);

      if (allMessages.length < CONTEXT_SUMMARY_THRESHOLD) {
        return; // Not enough messages to summarize
      }

      // Prepare messages for summarization
      const messagesToSummarize = allMessages.slice(0, -MAX_CONTEXT_MESSAGES)
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');

      // Generate summary
      const summaryResponse = await openai.chat.completions.create({
        model: 'gpt-5', // the newest OpenAI model is "gpt-5" which was released August 7, 2025
        messages: [
          {
            role: 'system',
            content: 'Summarize this conversation, focusing on key topics discussed, user preferences, and important decisions made. Also extract 3-5 key facts as a JSON array with format: [{fact: string, category: string, timestamp: string}]'
          },
          {
            role: 'user',
            content: messagesToSummarize
          }
        ],
        max_completion_tokens: 500,
        response_format: { type: 'json_object' }
      });

      const summaryContent = summaryResponse.choices[0]?.message?.content;
      if (!summaryContent) return;

      const summaryData = JSON.parse(summaryContent);

      // Update or create context
      await db.insert(conversationContext)
        .values({
          conversationId,
          contextSummary: summaryData.summary || '',
          keyFacts: summaryData.keyFacts || [],
          messageCount: allMessages.length
        })
        .onConflictDoUpdate({
          target: conversationContext.conversationId,
          set: {
            contextSummary: summaryData.summary || '',
            keyFacts: summaryData.keyFacts || [],
            lastSummarized: new Date(),
            messageCount: allMessages.length
          }
        });
    } catch (error) {
      console.error('Error updating context summary:', error);
    }
  }

  /**
   * Send a message to the chat assistant
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
    // Get or create conversation
    const activeConversationId = await this.getOrCreateConversation(userId, conversationId);

    // Check if this is the first message in a new conversation
    const messageCount = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, activeConversationId));
    
    const isFirstMessage = messageCount.length === 0;

    // Save user message
    const userMessage: InsertMessage = {
      conversationId: activeConversationId,
      role: 'user',
      content,
      tokensUsed: 0 // Will be updated after API call
    };

    const [savedUserMessage] = await db.insert(messages)
      .values([userMessage])
      .returning();

    // Generate title for new conversations
    if (isFirstMessage) {
      const title = await this.generateConversationTitle(content);
      await db.update(conversations)
        .set({ title, updatedAt: new Date() })
        .where(eq(conversations.id, activeConversationId));
    }

    // Get conversation context
    const contextMessages = await this.getConversationContext(activeConversationId);

    // Call OpenAI API
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-5', // the newest OpenAI model is "gpt-5" which was released August 7, 2025
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...contextMessages,
          { role: 'user', content }
        ],
        max_completion_tokens: 1000,
      });

      const assistantResponse = completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
      const totalTokens = completion.usage?.total_tokens || 0;

      // Save assistant message
      const assistantMessage: InsertMessage = {
        conversationId: activeConversationId,
        role: 'assistant',
        content: assistantResponse,
        tokensUsed: totalTokens
      };

      const [savedAssistantMessage] = await db.insert(messages)
        .values([assistantMessage])
        .returning();

      // Update conversation timestamp
      await db.update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, activeConversationId));

      // Check if we need to update context summary
      const totalMessages = messageCount.length + 2; // User + Assistant messages
      if (totalMessages % CONTEXT_SUMMARY_THRESHOLD === 0) {
        // Update context summary in background
        this.updateContextSummary(activeConversationId).catch(console.error);
      }

      return {
        conversationId: activeConversationId,
        response: assistantResponse,
        messageId: savedAssistantMessage.id
      };
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      
      // Save error message
      const errorMessage: InsertMessage = {
        conversationId: activeConversationId,
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        tokensUsed: 0,
        metadata: { functionCall: `Error: ${String(error)}` }
      };

      const [savedErrorMessage] = await db.insert(messages)
        .values([errorMessage])
        .returning();

      throw error;
    }
  }

  /**
   * Get user's conversations with metadata
   */
  async getUserConversations(userId: string): Promise<ConversationWithMetadata[]> {
    const userConversations = await db.select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));

    const conversationsWithMetadata = await Promise.all(
      userConversations.map(async (conversation) => {
        const conversationMessages = await db.select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.timestamp));

        const lastMessage = conversationMessages.length > 0 
          ? conversationMessages[0].content 
          : null;
        
        const messageCount = conversationMessages.length;

        return {
          ...conversation,
          lastMessage,
          messageCount
        };
      })
    );

    return conversationsWithMetadata;
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(conversationId: string, userId: string) {
    // Verify conversation belongs to user
    const [conversation] = await db.select()
      .from(conversations)
      .where(and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      ))
      .limit(1);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const conversationMessages = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);

    return {
      conversation,
      messages: conversationMessages
    };
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    // Verify conversation belongs to user and delete
    await db.delete(conversations)
      .where(and(
        eq(conversations.id, conversationId),
        eq(conversations.userId, userId)
      ));
  }

  /**
   * Save feedback for a message
   */
  async saveFeedback(
    messageId: string,
    userId: string,
    rating: number,
    comment?: string
  ): Promise<void> {
    // Verify message belongs to user's conversation
    const [message] = await db.select()
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(
        eq(messages.id, messageId),
        eq(conversations.userId, userId)
      ))
      .limit(1);

    if (!message) {
      throw new Error('Message not found');
    }

    // Update message metadata with feedback
    const currentMetadata = message.messages.metadata || {};
    await db.update(messages)
      .set({
        metadata: {
          ...currentMetadata,
          feedback: { rating, comment }
        }
      })
      .where(eq(messages.id, messageId));
  }
}

export const chatService = new ChatService();