import { openai } from "../openai";
import type { ContentEmbedding, InsertContentEmbedding, RelatedContentCache, InsertRelatedContentCache } from "@shared/schema";
import type { IContentStorage } from '../storage/interfaces/IContentStorage';

/**
 * Embeddings Service
 * 
 * Provides semantic search and content recommendation capabilities using OpenAI's embeddings.
 * Uses the text-embedding-ada-002 model to generate 1536-dimensional vectors.
 */

// Model configuration
const EMBEDDING_MODEL = 'text-embedding-ada-002'; // Required model per specifications
const EMBEDDING_DIMENSIONS = 1536; // Dimensions for text-embedding-ada-002
const MAX_TEXT_LENGTH = 8000; // Max text length to avoid token limits

/**
 * Service class for managing content embeddings and recommendations
 */
export class EmbeddingsService {
  constructor(private storage: IContentStorage) {}

  /**
   * Generate embedding for text content
   * @param text - The text to generate embedding for
   * @returns The embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const startTime = Date.now();
      
      // Clean and prepare text
      const cleanedText = text.trim().substring(0, MAX_TEXT_LENGTH);
      
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: cleanedText,
      });

      const duration = Date.now() - startTime;
      console.log(`Generated embedding in ${duration}ms for text length: ${cleanedText.length}`);
      
      return response.data[0].embedding;
    } catch (error) {
      console.error("Failed to generate embedding:", error);
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create or update embedding for content
   * @param contentId - ID of the content
   * @param contentType - Type of content 
   * @param contentText - Text content to embed
   * @param metadata - Additional metadata
   * @param userId - User ID
   */
  async createContentEmbedding(
    contentId: string,
    contentType: string,
    contentText: string,
    metadata: any,
    userId: string
  ): Promise<ContentEmbedding> {
    const embedding = await this.generateEmbedding(contentText);

    const embeddingData: InsertContentEmbedding = {
      contentId,
      contentType: contentType as 'recipe' | 'article' | 'product' | 'document' | 'media',
      embedding,
      embeddingType: 'full',
      metadata,
    };

    return await this.storage.upsertContentEmbedding(embeddingData);
  }

  /**
   * Find related content based on embedding similarity with caching
   * @param contentId - ID of the source content
   * @param contentType - Type of content to search for
   * @param userId - User ID
   * @param limit - Maximum number of results
   * @returns Array of related content with similarity scores
   */
  async findRelatedContent(
    contentId: string,
    contentType: string,
    userId: string,
    limit: number = 10
  ): Promise<Array<{ id: string; type: string; title: string; score: number; metadata?: any }>> {
    // Check cache first
    const cached = await this.storage.getRelatedContent(contentId, contentType);
    
    if (cached && new Date(cached.expiresAt) > new Date()) {
      console.log(`Using cached related content for ${contentId}`);
      return cached.relatedContent as any;
    }

    // Get the embedding for the source content
    const sourceEmbedding = await this.storage.getContentEmbedding(contentId, contentType);
    
    if (!sourceEmbedding) {
      throw new Error('Source content embedding not found');
    }

    // Search for similar embeddings
    const results = await this.storage.searchByEmbedding(
      sourceEmbedding.embedding,
      contentType,
      limit + 1 // Get one extra to exclude the source content
    );

    // Filter out the source content and format results
    const relatedItems = results
      .filter(result => result.contentId !== contentId)
      .slice(0, limit)
      .map(result => ({
        id: result.contentId,
        type: result.contentType,
        title: result.metadata?.title || 'Untitled',
        score: result.similarity,
        metadata: result.metadata
      }));

    // Cache the results for 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.storage.cacheRelatedContent({
      contentId,
      contentType: contentType as 'recipe' | 'article' | 'product' | 'document' | 'media',
      relatedContent: relatedItems as any,
      expiresAt,
    });

    return relatedItems;
  }

  /**
   * Get personalized recommendations for a user
   * @param userId - User ID
   * @param contentType - Type of content to recommend
   * @param limit - Maximum number of recommendations
   * @returns Array of recommended content with scores
   */
  async getPersonalizedRecommendations(
    userId: string,
    contentType: string,
    limit: number = 10
  ): Promise<Array<{ id: string; type: string; title: string; score: number; metadata?: any }>> {
    // For personalized recommendations, we can aggregate user's recent interactions
    // and find content similar to their interests
    // This is a placeholder implementation that returns recent content
    
    const recentEmbeddings = await this.storage.searchByEmbedding(
      new Array(EMBEDDING_DIMENSIONS).fill(0).map(() => Math.random() * 0.1),
      contentType,
      limit
    );

    return recentEmbeddings.map(result => ({
      id: result.contentId,
      type: result.contentType,
      title: result.metadata?.title || 'Untitled',
      score: result.similarity,
      metadata: result.metadata
    }));
  }

  /**
   * Refresh embeddings for multiple content items
   * @param contentType - Type of content to refresh
   * @param userId - User ID
   * @param contents - Array of content items
   */
  async refreshEmbeddings(
    contentType: string,
    userId: string,
    contents: Array<{ id: string; text: string; metadata?: any }>
  ): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (content) => {
          try {
            await this.createContentEmbedding(
              content.id,
              contentType,
              content.text,
              content.metadata,
              userId
            );
            processed++;
          } catch (error) {
            console.error(`Failed to refresh embedding for ${content.id}:`, error);
            failed++;
          }
        })
      );

      // Small delay between batches to avoid rate limits
      if (i + batchSize < contents.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { processed, failed };
  }
}

// Export standalone functions for backward compatibility
export async function generateEmbedding(text: string): Promise<number[]> {
  const service = new EmbeddingsService(null as any);
  return service.generateEmbedding(text);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same dimensions");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Find similar embeddings based on a query vector
 */
export function findSimilarEmbeddings(
  queryEmbedding: number[],
  embeddings: ContentEmbedding[],
  threshold: number = 0.7,
  limit: number = 10
): Array<ContentEmbedding & { score: number }> {
  const results = embeddings
    .map(embedding => ({
      ...embedding,
      score: cosineSimilarity(queryEmbedding, embedding.embedding as number[])
    }))
    .filter(result => result.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return results;
}

/**
 * Prepare text for embedding based on content type
 */
export function prepareTextForEmbedding(
  contentType: string,
  content: any
): string {
  switch (contentType) {
    case 'recipe':
      return `Recipe: ${content.title || content.name}. 
        Ingredients: ${content.ingredients?.join(', ') || ''}. 
        Instructions: ${content.instructions || content.steps?.join(' ') || ''}. 
        Tags: ${content.tags?.join(', ') || ''}`;
    
    case 'inventory':
      return `Food item: ${content.name}. 
        Category: ${content.foodCategory || content.category}. 
        Location: ${content.storageLocation || ''}. 
        Notes: ${content.notes || ''}`;
    
    case 'chat':
      return `${content.message || content.text}`;
    
    case 'meal_plan':
      return `Meal: ${content.mealType || ''}. 
        Recipe: ${content.recipeName || content.title || ''}. 
        Date: ${content.date || ''}`;
    
    case 'custom':
    default:
      return typeof content === 'string' 
        ? content 
        : JSON.stringify(content);
  }
}

/**
 * Batch generate embeddings for multiple texts
 */
export async function batchGenerateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  try {
    // OpenAI supports batch embedding generation
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: texts.map(text => text.trim().substring(0, 30000)),
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error("Failed to generate batch embeddings:", error);
    throw new Error(`Batch embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Semantic search helper - combines query embedding and similarity search
 */
export async function semanticSearch(
  query: string,
  embeddings: ContentEmbedding[],
  options: {
    threshold?: number;
    limit?: number;
    contentTypes?: string[];
  } = {}
): Promise<Array<ContentEmbedding & { score: number }>> {
  const { threshold = 0.7, limit = 10, contentTypes } = options;
  
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);
  
  // Filter embeddings by content type if specified
  let filteredEmbeddings = embeddings;
  if (contentTypes && contentTypes.length > 0) {
    filteredEmbeddings = embeddings.filter(e => 
      contentTypes.includes(e.contentType)
    );
  }
  
  // Find similar embeddings
  return findSimilarEmbeddings(
    queryEmbedding, 
    filteredEmbeddings, 
    threshold, 
    limit
  );
}

/**
 * Check if content needs re-embedding based on changes
 */
export function needsReEmbedding(
  existingContent: string,
  newContent: string,
  threshold: number = 0.2
): boolean {
  // Simple check: if content length changed significantly
  const lengthDiff = Math.abs(existingContent.length - newContent.length) / existingContent.length;
  
  if (lengthDiff > threshold) {
    return true;
  }
  
  // Check if substantial text changed (simple approach)
  if (existingContent === newContent) {
    return false;
  }
  
  // For more sophisticated change detection, you could use:
  // - Levenshtein distance
  // - Token-based comparison
  // - Hash comparison
  
  return true;
}