import OpenAI from "openai";
import type { ContentEmbedding, InsertContentEmbedding } from "@shared/schema";

// Referenced from: blueprint:javascript_openai
// Initialize OpenAI client with API key
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

/**
 * Embeddings Service
 * 
 * Provides semantic search capabilities using OpenAI's text-embedding-ada-002 model.
 * Converts text to vector embeddings for similarity-based search.
 */

/**
 * Generate embeddings for a given text using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const startTime = Date.now();
    
    // Clean and prepare text (max 8191 tokens for ada-002)
    const cleanedText = text.trim().substring(0, 30000); // Rough limit to stay under token limit
    
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
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