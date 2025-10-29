/**
 * ML Service Layer
 * 
 * Handles all machine learning operations including embeddings, categorization,
 * tagging, duplicate detection, and natural language processing.
 * 
 * Features:
 * - Semantic search using OpenAI embeddings
 * - Auto-categorization with GPT
 * - Auto-tagging using NLP
 * - Duplicate detection with cosine similarity
 * - Related content discovery
 * - Natural language to SQL query
 */

import { openai } from "../openai";
import { storage } from "../storage";
import type { 
  Recipe, 
  UserInventory, 
  ContentEmbedding,
  Tag,
  Category,
} from "@shared/schema";

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}

/**
 * Prepare text for embedding by combining relevant fields
 */
function prepareTextForEmbedding(content: any, contentType: string): string {
  switch (contentType) {
    case 'recipe':
      return [
        content.name,
        content.description,
        content.instructions,
        content.ingredients?.join(' '),
        content.tags?.join(' '),
        content.mealType,
        content.cuisine
      ].filter(Boolean).join(' ');
      
    case 'inventory':
      return [
        content.name,
        content.notes,
        content.foodCategory,
        content.barcode,
      ].filter(Boolean).join(' ');
      
    case 'chat':
      return content.content || '';
      
    case 'meal_plan':
      return [
        content.recipeName,
        content.notes,
      ].filter(Boolean).join(' ');
      
    default:
      return JSON.stringify(content);
  }
}

export class MLService {
  /**
   * Generate embedding for text using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw new Error("Failed to generate embedding");
    }
  }

  /**
   * Create or update embedding for content
   */
  async createContentEmbedding(
    content: any,
    contentType: string,
    contentId: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<ContentEmbedding> {
    const text = prepareTextForEmbedding(content, contentType);
    const embedding = await this.generateEmbedding(text);
    
    return await storage.upsertContentEmbedding({
      contentId,
      contentType,
      embedding,
      embeddingModel: "text-embedding-ada-002",
      contentText: text,
      metadata: metadata || {
        title: content.name || content.title,
        category: content.category || content.foodCategory,
        tags: content.tags,
      },
      userId,
    });
  }

  /**
   * Perform semantic search across content
   */
  async semanticSearch(
    query: string,
    contentType: string,
    userId: string,
    limit: number = 10
  ): Promise<Array<{
    content: any;
    similarity: number;
  }>> {
    const startTime = Date.now();
    
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);
    
    // Search for similar content
    const results = await storage.searchByEmbedding(
      queryEmbedding,
      contentType,
      userId,
      limit
    );
    
    // Log the search
    await storage.createSearchLog({
      query,
      searchType: 'semantic',
      userId,
      resultsCount: results.length,
      searchLatency: Date.now() - startTime,
    });
    
    // Fetch actual content based on type
    const contentResults = await Promise.all(
      results.map(async (result) => {
        let content;
        
        switch (contentType) {
          case 'recipe':
            content = await storage.getRecipe(result.contentId, userId);
            break;
          case 'inventory':
            const items = await storage.getFoodItems(userId);
            content = items.find((i: any) => i.id === result.contentId);
            break;
          default:
            content = { id: result.contentId };
        }
        
        return {
          content,
          similarity: result.similarity,
        };
      })
    );
    
    return contentResults.filter(r => r.content);
  }

  /**
   * Auto-categorize content using GPT
   */
  async categorizeContent(
    content: any,
    contentType: string,
    availableCategories: Category[]
  ): Promise<{
    categoryId: string;
    confidence: number;
  }> {
    const text = prepareTextForEmbedding(content, contentType);
    
    const categoryList = availableCategories
      .map(c => `- ${c.name}: ${c.description || c.keywords?.join(', ')}`)
      .join('\n');
    
    const prompt = `Categorize the following content into one of the provided categories:

Content Type: ${contentType}
Content: ${text}

Available Categories:
${categoryList}

Return only the category name and confidence score (0-1) in JSON format:
{ "category": "Category Name", "confidence": 0.85 }`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a categorization assistant. Respond only with JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 100,
      });
      
      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      const category = availableCategories.find(c => c.name === result.category);
      
      if (category) {
        return {
          categoryId: category.id,
          confidence: result.confidence || 0.7,
        };
      }
      
      throw new Error("Category not found");
    } catch (error) {
      console.error("Error categorizing content:", error);
      throw new Error("Failed to categorize content");
    }
  }

  /**
   * Auto-generate tags for content
   */
  async generateTags(
    content: any,
    contentType: string,
    maxTags: number = 5
  ): Promise<string[]> {
    const text = prepareTextForEmbedding(content, contentType);
    
    const prompt = `Generate ${maxTags} relevant tags for the following ${contentType}:

${text}

Return only tag names as a JSON array of lowercase, hyphenated strings:
["tag-one", "tag-two", "tag-three"]`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a tagging assistant. Generate relevant, specific tags. Respond only with a JSON array."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 100,
      });
      
      const tags = JSON.parse(response.choices[0]?.message?.content || '[]');
      return Array.isArray(tags) ? tags : [];
    } catch (error) {
      console.error("Error generating tags:", error);
      throw new Error("Failed to generate tags");
    }
  }

  /**
   * Check for duplicate content
   */
  async checkDuplicate(
    content: any,
    contentType: string,
    userId: string,
    threshold: number = 0.85
  ): Promise<{
    isDuplicate: boolean;
    duplicates: Array<{
      id: string;
      similarity: number;
    }>;
  }> {
    // Generate embedding for new content
    const text = prepareTextForEmbedding(content, contentType);
    const embedding = await this.generateEmbedding(text);
    
    // Search for similar content
    const results = await storage.searchByEmbedding(
      embedding,
      contentType,
      userId,
      5
    );
    
    // Filter by threshold
    const duplicates = results
      .filter(r => r.similarity >= threshold)
      .map(r => ({
        id: r.contentId,
        similarity: r.similarity,
      }));
    
    return {
      isDuplicate: duplicates.length > 0,
      duplicates,
    };
  }

  /**
   * Find related content using embeddings
   */
  async findRelatedContent(
    contentId: string,
    contentType: string,
    userId: string,
    limit: number = 5
  ): Promise<Array<{
    id: string;
    type: string;
    title: string;
    score: number;
  }>> {
    // Check cache first
    const cached = await storage.getRelatedContent(contentId, contentType, userId);
    if (cached) {
      return cached.relatedItems.slice(0, limit);
    }
    
    // Get content embedding
    const embedding = await storage.getContentEmbedding(contentId, contentType, userId);
    if (!embedding) {
      return [];
    }
    
    // Search for similar content
    const results = await storage.searchByEmbedding(
      embedding.embedding,
      contentType,
      userId,
      limit + 1 // Get one extra to exclude self
    );
    
    // Filter out self and map results
    const relatedItems = results
      .filter(r => r.contentId !== contentId)
      .slice(0, limit)
      .map(r => ({
        id: r.contentId,
        type: contentType,
        title: r.metadata?.title || 'Untitled',
        score: r.similarity,
      }));
    
    // Cache the results
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Cache for 24 hours
    
    await storage.cacheRelatedContent({
      contentId,
      contentType,
      relatedItems,
      userId,
      expiresAt,
    });
    
    return relatedItems;
  }

  /**
   * Convert natural language to SQL query
   */
  async naturalLanguageToSQL(
    query: string,
    userId: string,
    allowedTables: string[] = ['userRecipes', 'userInventory', 'mealPlans']
  ): Promise<{
    sql: string;
    explanation: string;
  }> {
    const tableSchemas = allowedTables.map(table => {
      switch (table) {
        case 'userRecipes':
          return `userRecipes: id, name, description, ingredients, instructions, prepTime, cookTime, servings, mealType, cuisine`;
        case 'userInventory':
          return `userInventory: id, name, quantity, unit, expirationDate, foodCategory`;
        case 'mealPlans':
          return `mealPlans: id, recipeId, recipeName, mealType, date, servings, notes`;
        default:
          return '';
      }
    }).join('\n');
    
    const prompt = `Convert this natural language query to SQL:

Query: "${query}"

Available tables and columns:
${tableSchemas}

All tables have a userId column for filtering by user.
Current userId: ${userId}

Return a safe SELECT query and a brief explanation in JSON format:
{
  "sql": "SELECT ... FROM ... WHERE userId = '${userId}' ...",
  "explanation": "This query will..."
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a SQL query generator. Generate only safe SELECT queries. Never include DROP, DELETE, UPDATE, INSERT, or other modifying operations. Always include userId filtering."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 200,
      });
      
      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      
      // Validate SQL is safe (SELECT only)
      const sql = result.sql || '';
      if (!sql.toLowerCase().startsWith('select') || 
          sql.toLowerCase().includes('drop') ||
          sql.toLowerCase().includes('delete') ||
          sql.toLowerCase().includes('update') ||
          sql.toLowerCase().includes('insert')) {
        throw new Error("Invalid SQL query generated");
      }
      
      // Log the query
      await storage.createQueryLog({
        naturalQuery: query,
        generatedSql: sql,
        userId,
      });
      
      return {
        sql,
        explanation: result.explanation || '',
      };
    } catch (error) {
      console.error("Error converting natural language to SQL:", error);
      throw new Error("Failed to convert query");
    }
  }

  /**
   * Update all embeddings for a user's content
   */
  async updateUserEmbeddings(userId: string): Promise<void> {
    try {
      // Update recipe embeddings
      const recipes = await storage.getRecipes(userId);
      for (const recipe of recipes) {
        await this.createContentEmbedding(recipe, 'recipe', recipe.id, userId);
      }
      
      // Update inventory embeddings
      const inventory = await storage.getFoodItems(userId);
      for (const item of inventory) {
        await this.createContentEmbedding(item, 'inventory', item.id, userId);
      }
      
      console.log(`Updated embeddings for user ${userId}`);
    } catch (error) {
      console.error("Error updating user embeddings:", error);
      throw new Error("Failed to update embeddings");
    }
  }
}

export const mlService = new MLService();