import { Router, Request, Response } from "express";
import { z } from "zod";
import { isAuthenticated } from "../middleware";
import { storage } from "../storage/index";
import { EmbeddingsService } from "../services/embeddings";
import { asyncHandler } from "../middleware/error.middleware";
import { getAuthenticatedUserId, sendError, sendSuccess } from "../types/request-helpers";

const router = Router();
const embeddingsService = new EmbeddingsService(storage.platform.content);

/**
 * GET /api/content/:id/related
 * Get semantically similar content based on embeddings
 * 
 * Parameters:
 * - id: Content ID to find related items for
 * 
 * Query Parameters:
 * - type: Content type (article, recipe, product, etc.)
 * - limit: Maximum number of results (default: 10, max: 50)
 * 
 * Returns: Array of related content with similarity scores
 */
router.get(
  "/content/:id/related",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const { type = 'article', limit = 10 } = req.query;

    const schema = z.object({
      id: z.string().min(1),
      type: z.string().min(1),
      limit: z.coerce.number().min(1).max(50).default(10)
    });

    try {
      const validated = schema.parse({ id, type, limit });

      const relatedContent = await embeddingsService.findRelatedContent(
        validated.id,
        validated.type,
        userId,
        validated.limit
      );

      res.json({
        success: true,
        contentId: validated.id,
        contentType: validated.type,
        related: relatedContent,
        count: relatedContent.length
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid parameters", 
          details: error.errors 
        });
      }

      console.error("Error fetching related content:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch related content" 
      });
    }
  })
);

/**
 * POST /api/content/embeddings/refresh
 * Refresh embeddings for multiple content items
 * 
 * Body:
 * - contentType: Type of content to refresh embeddings for
 * - contents: Array of content items with id, text, and metadata
 * 
 * Returns: Status of refresh operation
 */
router.post(
  "/content/embeddings/refresh",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const schema = z.object({
      contentType: z.string().min(1),
      contents: z.array(z.object({
        id: z.string().min(1),
        text: z.string().min(1),
        metadata: z.any().optional()
      })).min(1).max(100) // Limit batch size
    });

    try {
      const validated = schema.parse(req.body);

      const result = await embeddingsService.refreshEmbeddings(
        validated.contentType,
        userId,
        validated.contents
      );

      res.json({
        success: true,
        processed: result.processed,
        failed: result.failed,
        message: `Successfully processed ${result.processed} items, ${result.failed} failed`
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request body", 
          details: error.errors 
        });
      }

      console.error("Error refreshing embeddings:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to refresh embeddings" 
      });
    }
  })
);

/**
 * POST /api/content/embeddings/generate
 * Generate embedding for a single piece of content
 * 
 * Body:
 * - contentId: ID of the content
 * - contentType: Type of content
 * - text: Text to generate embedding for
 * - metadata: Optional metadata to store with embedding
 * 
 * Returns: Generated embedding information
 */
router.post(
  "/content/embeddings/generate",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const schema = z.object({
      contentId: z.string().min(1),
      contentType: z.string().min(1),
      text: z.string().min(1),
      metadata: z.any().optional()
    });

    try {
      const validated = schema.parse(req.body);

      const embedding = await embeddingsService.createContentEmbedding(
        validated.contentId,
        validated.contentType,
        validated.text,
        validated.metadata,
        userId
      );

      res.json({
        success: true,
        embedding: {
          id: embedding.id,
          contentId: embedding.contentId,
          contentType: embedding.contentType,
          embeddingType: embedding.embeddingType,
          createdAt: embedding.createdAt,
          updatedAt: embedding.updatedAt
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request body", 
          details: error.errors 
        });
      }

      console.error("Error generating embedding:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to generate embedding" 
      });
    }
  })
);

/**
 * GET /api/recommendations/user/:userId
 * Get personalized content recommendations for a user
 * 
 * Query Parameters:
 * - type: Content type to recommend (default: all)
 * - limit: Maximum number of recommendations (default: 10, max: 50)
 * 
 * Returns: Array of recommended content with relevance scores
 */
router.get(
  "/recommendations/user/:userId",
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const requestingUserId = getAuthenticatedUserId(req);
    if (!requestingUserId) return res.status(401).json({ error: "Unauthorized" });

    const { userId } = req.params;
    const { type = 'article', limit = 10 } = req.query;

    // Ensure users can only get their own recommendations
    if (requestingUserId !== userId) {
      return res.status(403).json({ error: "Forbidden: Can only access your own recommendations" });
    }

    const schema = z.object({
      userId: z.string().min(1),
      type: z.string().min(1),
      limit: z.coerce.number().min(1).max(50).default(10)
    });

    try {
      const validated = schema.parse({ userId, type, limit });

      const recommendations = await embeddingsService.getPersonalizedRecommendations(
        validated.userId,
        validated.type,
        validated.limit
      );

      res.json({
        success: true,
        userId: validated.userId,
        recommendations,
        count: recommendations.length
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid parameters", 
          details: error.errors 
        });
      }

      console.error("Error fetching recommendations:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch recommendations" 
      });
    }
  })
);

/**
 * POST /api/content/search/semantic
 * Search for content using semantic similarity
 * 
 * Body:
 * - query: Search query text
 * - contentType: Type of content to search
 * - limit: Maximum results (default: 10)
 * - threshold: Minimum similarity score (0-1, default: 0.7)
 * 
 * Returns: Array of matching content with similarity scores
 */
router.post(
  "/content/search/semantic",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const schema = z.object({
      query: z.string().min(1),
      contentType: z.string().min(1),
      limit: z.number().min(1).max(50).default(10),
      threshold: z.number().min(0).max(1).default(0.7)
    });

    try {
      const validated = schema.parse(req.body);

      // Generate embedding for the query
      const queryEmbedding = await embeddingsService.generateEmbedding(validated.query);

      // Search for similar content
      const results = await storage.platform.content.searchByEmbedding(
        queryEmbedding,
        validated.contentType,
        validated.limit
      );

      // Filter by threshold and format results
      const filteredResults = results
        .filter(r => r.similarity >= validated.threshold)
        .map(r => ({
          id: r.contentId,
          type: r.contentType,
          title: r.metadata?.title || 'Untitled',
          score: r.similarity,
          metadata: r.metadata
        }));

      res.json({
        success: true,
        query: validated.query,
        results: filteredResults,
        count: filteredResults.length
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid request body", 
          details: error.errors 
        });
      }

      console.error("Error in semantic search:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Semantic search failed" 
      });
    }
  })
);

/**
 * DELETE /api/content/:id/cache
 * Clear cached related content for a specific item
 * 
 * Parameters:
 * - id: Content ID to clear cache for
 * 
 * Query Parameters:
 * - type: Content type
 * 
 * Returns: Success status
 */
router.delete(
  "/content/:id/cache",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;
    const { type = 'article' } = req.query;

    // For now, we'll set an expired cache entry to effectively clear it
    const expiresAt = new Date(0); // Expired date

    await storage.platform.content.cacheRelatedContent({
      contentId: id as string,
      contentType: type as 'recipe' | 'article' | 'product' | 'document' | 'media',
      relatedContent: [],
      expiresAt
    });

    res.json({
      success: true,
      message: `Cache cleared for content ${id}`
    });
  })
);

export default router;