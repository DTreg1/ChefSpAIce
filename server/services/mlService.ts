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
import * as natural from "natural";

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
      
      // Convert typed array to regular array for database compatibility
      const embedding = response.data[0].embedding;
      return Array.from(embedding);
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
    
    return await aiMlStorage.upsertContentEmbedding({
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
    const results = await aiMlStorage.searchByEmbedding(
      queryEmbedding,
      contentType,
      userId,
      limit
    );
    
    // Log the search
    await aiMlStorage.createSearchLog({
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
            content = await aiMlStorage.getRecipe(result.contentId, userId);
            break;
          case 'inventory':
            const items = await aiMlStorage.getFoodItems(userId);
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
   * Extract keywords using TensorFlow.js and NLP libraries
   */
  private async extractKeywords(text: string, limit: number = 10): Promise<string[]> {
    // Dynamically import keyword-extractor (CommonJS module)
    const keywordExtractor = await import("keyword-extractor");
    
    // Extract keywords using keyword-extractor
    const extractedKeywords = keywordExtractor.default ? 
      keywordExtractor.default.extract(text, {
        language: "english",
        remove_digits: true,
        return_changed_case: true,
        remove_duplicates: true
      }) :
      (keywordExtractor as any).extract(text, {
        language: "english",
        remove_digits: true,
        return_changed_case: true,
        remove_duplicates: true
      });
    
    // Use TF-IDF for more sophisticated keyword scoring
    const tfidf = new natural.TfIdf();
    tfidf.addDocument(text);
    
    const tfidfKeywords: { term: string; score: number }[] = [];
    tfidf.listTerms(0).forEach((item: any) => {
      if (item.tfidf > 0.1 && item.term.length > 2) {
        tfidfKeywords.push({ term: item.term, score: item.tfidf });
      }
    });
    
    // Combine and deduplicate keywords
    const combinedKeywords = new Set([
      ...extractedKeywords.slice(0, limit),
      ...tfidfKeywords.sort((a, b) => b.score - a.score).slice(0, limit).map(k => k.term)
    ]);
    
    return Array.from(combinedKeywords).slice(0, limit);
  }
  
  /**
   * Identify entities and themes in content
   */
  private identifyEntitiesAndThemes(content: any, contentType: string): string[] {
    const themes: string[] = [];
    
    // Content-type specific theme extraction
    switch (contentType) {
      case 'recipe':
        if (content.mealType) themes.push(content.mealType);
        if (content.cuisine) themes.push(content.cuisine);
        if (content.difficulty) themes.push(content.difficulty);
        if (content.prepTime && content.prepTime < 30) themes.push('quick-meals');
        if (content.ingredients?.some((i: string) => i.toLowerCase().includes('vegan'))) themes.push('vegan');
        if (content.ingredients?.some((i: string) => i.toLowerCase().includes('gluten'))) themes.push('gluten-free');
        break;
        
      case 'article':
        // Extract themes from article metadata
        if (content.category) themes.push(content.category);
        if (content.subject) themes.push(content.subject);
        break;
    }
    
    return themes;
  }

  /**
   * Auto-generate tags for content using NLP and AI
   */
  async generateTags(
    content: any,
    contentType: string,
    maxTags: number = 8
  ): Promise<Array<{
    name: string;
    relevanceScore: number;
    source: 'keyword-extraction' | 'entity-recognition' | 'ai-generated';
  }>> {
    const text = prepareTextForEmbedding(content, contentType);
    const results: Array<{
      name: string;
      relevanceScore: number;
      source: 'keyword-extraction' | 'entity-recognition' | 'ai-generated';
    }> = [];
    
    // Step 1: Extract keywords using TensorFlow.js/Natural
    const keywords = await this.extractKeywords(text, Math.floor(maxTags / 2));
    keywords.forEach(keyword => {
      results.push({
        name: keyword.toLowerCase().replace(/\s+/g, '-'),
        relevanceScore: 0.8,
        source: 'keyword-extraction'
      });
    });
    
    // Step 2: Identify entities and themes
    const themes = this.identifyEntitiesAndThemes(content, contentType);
    themes.forEach(theme => {
      results.push({
        name: theme.toLowerCase().replace(/\s+/g, '-'),
        relevanceScore: 0.9,
        source: 'entity-recognition'
      });
    });
    
    // Step 3: Use GPT-3.5-turbo for additional context-aware tags
    const prompt = `Analyze the following ${contentType} and generate relevant tags that capture its key topics, entities, and themes:

${text}

Consider:
1. Main topics and subjects
2. Key entities (people, places, technologies, concepts)
3. Themes and categories
4. Target audience or use cases
5. Unique characteristics

Return ${Math.max(5, maxTags - results.length)} relevant tags as a JSON array of objects with 'name' (lowercase, hyphenated) and 'relevance' (0-1) fields:
[{"name": "tag-name", "relevance": 0.95}]`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an expert content analyzer specializing in identifying key topics, entities, and themes. Generate specific, relevant tags that would help users discover and categorize this content. Focus on actionable and searchable terms."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.4,
        max_tokens: 200,
      });
      
      const aiTags = JSON.parse(response.choices[0]?.message?.content || '[]');
      if (Array.isArray(aiTags)) {
        aiTags.forEach((tag: any) => {
          if (tag.name && typeof tag.name === 'string') {
            results.push({
              name: tag.name.toLowerCase().replace(/\s+/g, '-'),
              relevanceScore: tag.relevance || 0.7,
              source: 'ai-generated'
            });
          }
        });
      }
    } catch (error) {
      console.error("Error generating AI tags:", error);
      // Continue without AI tags if there's an error
    }
    
    // Deduplicate and sort by relevance
    const uniqueTags = new Map<string, typeof results[0]>();
    results.forEach(tag => {
      const existing = uniqueTags.get(tag.name);
      if (!existing || existing.relevanceScore < tag.relevanceScore) {
        uniqueTags.set(tag.name, tag);
      }
    });
    
    return Array.from(uniqueTags.values())
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxTags);
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
    const results = await aiMlStorage.searchByEmbedding(
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
    const cached = await aiMlStorage.getRelatedContent(contentId, contentType, userId);
    if (cached) {
      return cached.relatedItems.slice(0, limit);
    }
    
    // Get content embedding
    const embedding = await aiMlStorage.getContentEmbedding(contentId, contentType, userId);
    if (!embedding) {
      return [];
    }
    
    // Search for similar content
    const results = await aiMlStorage.searchByEmbedding(
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
    
    await aiMlStorage.cacheRelatedContent({
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
      await aiMlStorage.createQueryLog(userId, {
        naturalQuery: query,
        generatedSql: sql,
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
      const recipes = await aiMlStorage.getRecipes(userId);
      for (const recipe of recipes) {
        await this.createContentEmbedding(recipe, 'recipe', recipe.id, userId);
      }
      
      // Update inventory embeddings
      const inventory = await aiMlStorage.getFoodItems(userId);
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