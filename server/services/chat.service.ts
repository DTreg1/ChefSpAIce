/**
 * Chat Service
 * 
 * Handles business logic for AI chat interactions including:
 * - Message persistence (user and assistant messages)
 * - Context building (inventory, chat history)
 * - OpenAI API interactions (streaming and non-streaming)
 * - Cooking term detection in responses
 * 
 * Router layer handles SSE presentation concerns.
 */

import { openai } from "../integrations/openai";
import { storage } from "../storage";
import { termDetector } from "./term-detector.service";
import type { ChatMessage } from "@shared/schema";

const SYSTEM_PROMPT = `You are ChefSpAIce, a helpful cooking assistant. You provide recipe suggestions, cooking tips, and meal planning advice. Be concise but friendly.`;

export interface ChatContext {
  systemPrompt: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}

export interface DetectedTerm {
  term: string;
  termId: string;
  category: string;
  shortDefinition: string;
  difficulty?: string | null;
  start: number;
  end: number;
}

export interface ChatStreamConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
}

class ChatService {
  /**
   * Save a user message to chat history
   */
  async saveUserMessage(userId: string, content: string): Promise<void> {
    await storage.createChatMessage(userId, {
      role: "user",
      content,
    });
  }

  /**
   * Save an assistant message to chat history
   */
  async saveAssistantMessage(userId: string, content: string): Promise<void> {
    await storage.createChatMessage(userId, {
      role: "assistant",
      content,
    });
  }

  /**
   * Build context for chat including inventory and history
   */
  async buildChatContext(
    userId: string,
    includeInventory: boolean = false,
    historyLimit: number = 10
  ): Promise<ChatContext> {
    let inventoryContext = "";
    
    if (includeInventory) {
      const items = await storage.getFoodItems(userId);
      if (items.length > 0) {
        inventoryContext = `\n\nUser's current food inventory:\n${items
          .map((item: any) => `- ${item.name}: ${item.quantity} ${item.unit || ""} (${item.foodCategory || "uncategorized"})`)
          .join("\n")}`;
      }
    }

    const history = await storage.getChatMessages(userId, historyLimit);
    
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}${inventoryContext}`,
      },
      ...history.reverse().map((msg: ChatMessage) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    return {
      systemPrompt: `${SYSTEM_PROMPT}${inventoryContext}`,
      messages,
    };
  }

  /**
   * Create OpenAI chat completion (non-streaming)
   * Returns the full response content
   */
  async createChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    config: ChatStreamConfig = {}
  ): Promise<string> {
    if (!openai) {
      throw new Error('OpenAI not configured');
    }

    const response = await openai.chat.completions.create({
      model: config.model || "gpt-4o-mini",
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens || 500,
      stream: false,
    });

    return response.choices[0]?.message?.content || "";
  }

  /**
   * Create OpenAI chat completion stream
   * Returns an async iterable for streaming chunks
   */
  async createChatStream(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    config: ChatStreamConfig = {}
  ): Promise<AsyncIterable<string>> {
    if (!openai) {
      throw new Error('OpenAI not configured');
    }

    const stream = await openai.chat.completions.create({
      model: config.model || "gpt-4o-mini",
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens || 500,
      stream: true,
    });

    return {
      [Symbol.asyncIterator]: async function* () {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            yield content;
          }
        }
      }
    };
  }

  /**
   * Detect cooking terms in text content
   */
  async detectCookingTerms(content: string): Promise<DetectedTerm[]> {
    try {
      const matches = await termDetector.detectTerms(content, {
        maxMatches: 50,
        contextAware: true
      });

      return matches.map(match => ({
        term: match.originalTerm,
        termId: match.termId,
        category: match.category,
        shortDefinition: match.shortDefinition,
        difficulty: match.difficulty,
        start: match.start,
        end: match.end
      }));
    } catch (error) {
      console.error('[ChatService] Error detecting cooking terms:', error);
      return [];
    }
  }

  /**
   * Generate a conversation title from the first message
   */
  async generateTitle(content: string): Promise<string> {
    if (!openai) {
      return content.substring(0, 30) + '...';
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
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
        max_tokens: 20,
      });

      const title = response.choices[0]?.message?.content?.trim() || 'New Conversation';
      return title.substring(0, 50);
    } catch (error) {
      console.error('[ChatService] Error generating title:', error);
      return content.substring(0, 30) + '...';
    }
  }

  /**
   * Get chat history for a user
   */
  async getChatHistory(userId: string, limit?: number): Promise<ChatMessage[]> {
    return storage.getChatMessages(userId, limit);
  }

  /**
   * Clear chat history for a user
   */
  async clearChatHistory(userId: string): Promise<void> {
    await storage.deleteChatHistory(userId);
  }

  /**
   * High-level method for a complete non-streaming chat exchange
   * Saves user message, generates response, saves assistant message
   */
  async sendMessage(
    userId: string,
    userMessage: string,
    options: { includeInventory?: boolean; historyLimit?: number } = {}
  ): Promise<{
    response: string;
    detectedTerms: DetectedTerm[];
  }> {
    await this.saveUserMessage(userId, userMessage);

    const context = await this.buildChatContext(
      userId,
      options.includeInventory || false,
      options.historyLimit || 10
    );

    const response = await this.createChatCompletion(context.messages);

    await this.saveAssistantMessage(userId, response);

    const detectedTerms = await this.detectCookingTerms(response);

    return {
      response,
      detectedTerms,
    };
  }
}

export const chatService = new ChatService();
