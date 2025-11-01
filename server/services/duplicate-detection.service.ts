import OpenAI from 'openai';
import { db } from '../db';
import { 
  userChats,
  type ChatMessage
} from '../../shared/chat-compatibility';
import { 
  contentEmbeddings, 
  duplicatePairs, 
  userRecipes,
  type InsertContentEmbedding,
  type InsertDuplicatePair,
  type Recipe
} from '../../shared/schema';
import { eq, and, or, gte, desc } from 'drizzle-orm';
import crypto from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class DuplicateDetectionService {
  private static readonly SIMILARITY_THRESHOLD = 0.85;
  private static readonly EMBEDDING_MODEL = 'text-embedding-ada-002';

  /**
   * Generate embeddings for text content using OpenAI
   */
  private static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: this.EMBEDDING_MODEL,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private static calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Generate a hash for content to quickly identify exact duplicates
   */
  private static generateSimilarityHash(content: string): string {
    const normalizedContent = content.toLowerCase().replace(/\s+/g, ' ').trim();
    return crypto.createHash('md5').update(normalizedContent).digest('hex');
  }

  /**
   * Prepare content text for embedding based on content type
   */
  private static prepareContentText(content: any, contentType: string): string {
    switch (contentType) {
      case 'recipe':
        const recipe = content as Recipe;
        return `${recipe.title} ${recipe.description || ''} ${recipe.ingredients?.join(' ') || ''} ${recipe.instructions?.join(' ') || ''}`;
      
      case 'chat':
        const chat = content as ChatMessage;
        return chat.content;
      
      default:
        return JSON.stringify(content);
    }
  }

  /**
   * Check for duplicate content before saving
   */
  static async checkForDuplicates(
    content: string,
    contentType: string,
    userId: string,
    contentId?: string
  ): Promise<{
    isDuplicate: boolean;
    duplicates: Array<{
      id: string;
      title?: string;
      similarity: number;
      status: string;
    }>;
    similarityHash: string;
  }> {
    try {
      // Generate similarity hash
      const similarityHash = this.generateSimilarityHash(content);

      // First, check for exact duplicates using hash
      let exactDuplicates: any[] = [];
      if (contentType === 'recipe') {
        const conditions = [
          eq(userRecipes.userId, userId),
          eq(userRecipes.similarityHash, similarityHash)
        ];
        
        exactDuplicates = await db
          .select()
          .from(userRecipes)
          .where(and(...conditions))
          .then(results => 
            contentId ? results.filter(r => r.id !== contentId) : results
          );
      }

      if (exactDuplicates.length > 0) {
        return {
          isDuplicate: true,
          duplicates: exactDuplicates.map(d => ({
            id: d.id,
            title: d.title,
            similarity: 1.0,
            status: 'duplicate'
          })),
          similarityHash
        };
      }

      // Generate embedding for the new content
      const embedding = await this.generateEmbedding(content);

      // Get existing embeddings for the user's content
      const existingEmbeddings = await db
        .select()
        .from(contentEmbeddings)
        .where(
          and(
            eq(contentEmbeddings.userId, userId),
            eq(contentEmbeddings.contentType, contentType)
          )
        );

      const potentialDuplicates: Array<{
        id: string;
        title?: string;
        similarity: number;
        status: string;
      }> = [];

      // Calculate similarity with existing content
      for (const existing of existingEmbeddings) {
        if (contentId && existing.contentId === contentId) continue;

        const similarity = this.calculateCosineSimilarity(
          embedding,
          existing.embedding as number[]
        );

        if (similarity >= this.SIMILARITY_THRESHOLD) {
          // Get content details
          let contentDetails: any = null;
          if (contentType === 'recipe') {
            const recipes = await db
              .select()
              .from(userRecipes)
              .where(eq(userRecipes.id, existing.contentId))
              .limit(1);
            contentDetails = recipes[0];
          }

          potentialDuplicates.push({
            id: existing.contentId,
            title: contentDetails?.title || existing.metadata?.title,
            similarity,
            status: 'pending'
          });

          // Store duplicate pair for review
          const duplicatePair: InsertDuplicatePair = {
            contentId1: contentId || 'pending',
            contentType1: contentType,
            contentId2: existing.contentId,
            contentType2: contentType,
            similarityScore: similarity,
            status: 'pending',
            userId
          };

          await db.insert(duplicatePairs).values(duplicatePair);
        }
      }

      // Store the new embedding (if contentId provided)
      if (contentId) {
        const newEmbedding: InsertContentEmbedding = {
          contentId,
          contentType,
          embedding,
          embeddingModel: this.EMBEDDING_MODEL,
          contentText: content,
          metadata: {},
          userId
        };

        await db
          .insert(contentEmbeddings)
          .values(newEmbedding)
          .onConflictDoUpdate({
            target: [contentEmbeddings.contentId, contentEmbeddings.contentType, contentEmbeddings.userId],
            set: {
              embedding,
              contentText: content,
              updatedAt: new Date()
            }
          });
      }

      return {
        isDuplicate: potentialDuplicates.length > 0,
        duplicates: potentialDuplicates,
        similarityHash
      };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      throw error;
    }
  }

  /**
   * Get pending duplicate pairs for review
   */
  static async getPendingDuplicates(userId: string, limit: number = 10) {
    try {
      const pending = await db
        .select()
        .from(duplicatePairs)
        .where(
          and(
            eq(duplicatePairs.userId, userId),
            eq(duplicatePairs.status, 'pending')
          )
        )
        .orderBy(desc(duplicatePairs.similarityScore))
        .limit(limit);

      // Enrich with content details
      const enrichedPairs = await Promise.all(
        pending.map(async (pair) => {
          let content1Details: any = null;
          let content2Details: any = null;

          if (pair.contentType1 === 'recipe') {
            const recipes1 = await db
              .select()
              .from(userRecipes)
              .where(eq(userRecipes.id, pair.contentId1))
              .limit(1);
            content1Details = recipes1[0];

            const recipes2 = await db
              .select()
              .from(userRecipes)
              .where(eq(userRecipes.id, pair.contentId2))
              .limit(1);
            content2Details = recipes2[0];
          }

          return {
            ...pair,
            content1: content1Details,
            content2: content2Details
          };
        })
      );

      return enrichedPairs;
    } catch (error) {
      console.error('Error getting pending duplicates:', error);
      throw error;
    }
  }

  /**
   * Resolve duplicate status
   */
  static async resolveDuplicate(
    duplicatePairId: string,
    status: 'duplicate' | 'unique' | 'merged',
    reviewedBy: string
  ) {
    try {
      await db
        .update(duplicatePairs)
        .set({
          status,
          reviewedBy,
          reviewedAt: new Date()
        })
        .where(eq(duplicatePairs.id, duplicatePairId));

      return { success: true };
    } catch (error) {
      console.error('Error resolving duplicate:', error);
      throw error;
    }
  }

  /**
   * Get duplicate detection statistics
   */
  static async getDuplicateStats(userId: string) {
    try {
      const allPairs = await db
        .select()
        .from(duplicatePairs)
        .where(eq(duplicatePairs.userId, userId));

      const stats = {
        total: allPairs.length,
        pending: allPairs.filter(p => p.status === 'pending').length,
        confirmed: allPairs.filter(p => p.status === 'duplicate').length,
        unique: allPairs.filter(p => p.status === 'unique').length,
        merged: allPairs.filter(p => p.status === 'merged').length,
        averageSimilarity: 
          allPairs.reduce((sum, p) => sum + p.similarityScore, 0) / allPairs.length || 0
      };

      return stats;
    } catch (error) {
      console.error('Error getting duplicate stats:', error);
      throw error;
    }
  }

  /**
   * Update content embedding when content is modified
   */
  static async updateContentEmbedding(
    contentId: string,
    contentType: string,
    content: any,
    userId: string
  ) {
    try {
      const contentText = this.prepareContentText(content, contentType);
      const embedding = await this.generateEmbedding(contentText);
      const similarityHash = this.generateSimilarityHash(contentText);

      // Update embedding
      const metadata = {
        title: content.title,
        category: content.category,
        tags: content.tags
      };
      
      await db
        .insert(contentEmbeddings)
        .values({
          contentId,
          contentType,
          embedding,
          embeddingModel: this.EMBEDDING_MODEL,
          contentText,
          metadata,
          userId
        })
        .onConflictDoUpdate({
          target: [contentEmbeddings.contentId, contentEmbeddings.contentType, contentEmbeddings.userId],
          set: {
            embedding,
            contentText,
            metadata,
            updatedAt: new Date()
          }
        });

      // Update similarity hash in content table
      if (contentType === 'recipe') {
        await db
          .update(userRecipes)
          .set({ similarityHash })
          .where(eq(userRecipes.id, contentId));
      } else if (contentType === 'chat') {
        await db
          .update(userChats)
          .set({ similarityHash })
          .where(eq(userChats.id, contentId));
      }

      return { success: true, similarityHash };
    } catch (error) {
      console.error('Error updating content embedding:', error);
      throw error;
    }
  }
}