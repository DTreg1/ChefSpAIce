import { db } from '../db';
import { 
  userChats,
  type ChatMessage
} from '@shared/schema';
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
import { openai } from '../integrations/openai';
import { cosineSimilarity } from '../utils/vectorMath';

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

      // Get existing embeddings for this content type
      const existingEmbeddings = await db
        .select()
        .from(contentEmbeddings)
        .where(
          eq(contentEmbeddings.contentType, contentType)
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

        const similarity = cosineSimilarity(
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
            contentId2: existing.contentId,
            contentType: contentType as 'recipe' | 'document' | 'article' | 'product' | 'media',
            similarity,
            isConfirmed: null,
            isDismissed: false,
          };

          await db.insert(duplicatePairs).values(duplicatePair);
        }
      }

      // Store the new embedding (if contentId provided)
      if (contentId) {
        await db
          .insert(contentEmbeddings)
          .values({
            contentId,
            contentType,
            embedding,
            embeddingType: 'full',
            metadata: {},
          })
          .onConflictDoNothing();
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
      // Get pending pairs (not confirmed and not dismissed)
      const pending = await db
        .select()
        .from(duplicatePairs)
        .where(
          and(
            eq(duplicatePairs.isConfirmed, false),
            eq(duplicatePairs.isDismissed, false)
          )
        )
        .orderBy(desc(duplicatePairs.similarity))
        .limit(limit);

      // Enrich with content details
      const enrichedPairs = await Promise.all(
        pending.map(async (pair) => {
          let content1Details: any = null;
          let content2Details: any = null;

          if (pair.contentType === 'recipe') {
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
      const isConfirmed = status === 'duplicate';
      const isDismissed = status === 'unique' || status === 'merged';
      
      await db
        .update(duplicatePairs)
        .set({
          isConfirmed,
          isDismissed,
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
      // Note: userId filtering would require adding a userId column to duplicatePairs
      // For now, get all pairs
      const allPairs = await db
        .select()
        .from(duplicatePairs);

      const stats = {
        total: allPairs.length,
        pending: allPairs.filter(p => p.isConfirmed === null && !p.isDismissed).length,
        confirmed: allPairs.filter(p => p.isConfirmed === true).length,
        unique: allPairs.filter(p => p.isDismissed === true).length,
        merged: 0, // Would need a separate merged field
        averageSimilarity: 
          allPairs.reduce((sum, p) => sum + p.similarity, 0) / allPairs.length || 0
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
          embeddingType: 'full',
          metadata,
        })
        .onConflictDoUpdate({
          target: [contentEmbeddings.contentId, contentEmbeddings.contentType],
          set: {
            embedding,
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
      }
      // Note: userChats table is a legacy stub, similarity hash updates for chat are handled separately

      return { success: true, similarityHash };
    } catch (error) {
      console.error('Error updating content embedding:', error);
      throw error;
    }
  }
}