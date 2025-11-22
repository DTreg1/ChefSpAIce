/**
 * ML Features API Router
 * 
 * Provides endpoints for all machine learning features:
 * - Semantic search with embeddings
 * - Auto-categorization
 * - Auto-tagging
 * - Duplicate detection
 * - Related content discovery
 * - Natural language queries
 */

import { Router, Request, Response } from "express";
import { z } from "zod";
import { mlService } from "../services/mlService";
import { aiMlStorage } from "../storage/index";
import { isAuthenticated } from "../middleware/oauth.middleware";

const router = Router();

// All ML routes require authentication
router.use(isAuthenticated);

/**
 * POST /api/ml/embeddings/generate
 * Generate embeddings for new content
 */
router.post("/embeddings/generate", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      contentId: z.string(),
      contentType: z.enum(['recipe', 'inventory', 'chat', 'meal_plan']),
      content: z.any(),
      metadata: z.record(z.any()).optional(),
    });

    const { contentId, contentType, content, metadata } = schema.parse(req.body);
    const userId = req.user!.id;

    const embedding = await mlService.createContentEmbedding(
      content,
      contentType,
      contentId,
      userId,
      metadata
    );

    res.json({ success: true, embedding });
  } catch (error) {
    console.error("Error generating embedding:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to generate embedding" 
    });
  }
});

/**
 * POST /api/ml/search/semantic
 * Perform semantic search with query
 */
router.post("/search/semantic", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      query: z.string().min(1),
      contentType: z.enum(['recipe', 'inventory', 'chat', 'meal_plan', 'all']),
      limit: z.number().min(1).max(50).optional().default(10),
    });

    const { query, contentType, limit } = schema.parse(req.body);
    const userId = req.user!.id;

    const results = await mlService.semanticSearch(
      query,
      contentType,
      userId,
      limit
    );

    res.json({ success: true, results });
  } catch (error) {
    console.error("Error performing semantic search:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Search failed" 
    });
  }
});

/**
 * POST /api/ml/search/feedback
 * Track which results users click
 */
router.post("/search/feedback", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      searchLogId: z.string(),
      clickedResultId: z.string(),
      clickedResultType: z.string(),
      clickPosition: z.number(),
      timeToClick: z.number(),
    });

    const { searchLogId, clickedResultId, clickedResultType, clickPosition, timeToClick } = schema.parse(req.body);
    
    // Update search log with clicked result
    const updatedLog = await aiMlStorage.updateSearchLogFeedback(searchLogId, {
      clickedResultId,
      clickedResultType,
      clickPosition,
      timeToClick,
    });
    
    res.json({ success: true, searchLog: updatedLog });
  } catch (error) {
    console.error("Error recording search feedback:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to record feedback" 
    });
  }
});

/**
 * GET /api/ml/categories
 * List all available categories
 */
router.get("/categories", async (req: Request, res: Response) => {
  try {
    const parentId = req.query.parentId as string | undefined;
    const categories = await aiMlStorage.getCategories(parentId);
    
    res.json({ success: true, categories });
  } catch (error) {
    console.error("Error getting categories:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get categories" 
    });
  }
});

/**
 * POST /api/ml/categories
 * Create a new category
 */
router.post("/categories", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      parentId: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      color: z.string().optional(),
      icon: z.string().optional(),
    });

    const categoryData = schema.parse(req.body);
    const category = await aiMlStorage.createCategory(categoryData);
    
    res.json({ success: true, category });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to create category" 
    });
  }
});

/**
 * POST /api/ml/categorize
 * Auto-categorize content
 */
router.post("/categorize", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      contentId: z.string(),
      contentType: z.enum(['recipe', 'inventory', 'chat', 'meal_plan']),
      content: z.any().optional(), // Make content optional
    });

    const { contentId, contentType } = schema.parse(req.body);
    let { content } = schema.parse(req.body);
    const userId = req.user!.id;

    // If content not provided, fetch it
    if (!content) {
      if (contentType === 'recipe') {
        content = await aiMlStorage.getRecipe(contentId, userId);
      } else if (contentType === 'inventory') {
        content = await aiMlStorage.getFoodItem(userId, contentId);
      }
      
      if (!content) {
        return res.status(404).json({
          success: false,
          error: "Content not found"
        });
      }
    }

    // Get available categories
    const categories = await aiMlStorage.getCategories();
    
    if (categories.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "No categories available" 
      });
    }

    // Auto-categorize content
    const { categoryId, confidence } = await mlService.categorizeContent(
      content,
      contentType,
      categories
    );

    // Assign category to content
    const assignment = await aiMlStorage.assignContentCategory({
      contentId,
      contentType,
      categoryId,
      confidenceScore: confidence,
      isManual: false,
      userId,
    });

    res.json({ success: true, assignment, confidence });
  } catch (error) {
    console.error("Error categorizing content:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to categorize content" 
    });
  }
});

/**
 * PUT /api/ml/categorize/:id
 * Manual override of category
 */
router.put("/categorize/:contentId", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      contentType: z.string(),
      categoryId: z.string(),
    });

    const { contentType, categoryId } = schema.parse(req.body);
    const { contentId } = req.params;
    const userId = req.user!.id;

    const assignment = await aiMlStorage.assignContentCategory({
      contentId,
      contentType,
      categoryId,
      confidenceScore: 1.0,
      isManual: true,
      userId,
    });

    res.json({ success: true, assignment });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update category" 
    });
  }
});

/**
 * POST /api/ml/tags/generate
 * Generate tags for content
 */
router.post("/tags/generate", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      contentId: z.string(),
      contentType: z.enum(['recipe', 'inventory', 'chat', 'meal_plan']),
      content: z.any().optional(), // Make content optional
      maxTags: z.number().min(1).max(10).optional().default(5),
    });

    const { contentId, contentType, maxTags } = schema.parse(req.body);
    let { content } = schema.parse(req.body);
    const userId = req.user!.id;

    // If content not provided, fetch it
    if (!content) {
      if (contentType === 'recipe') {
        content = await aiMlStorage.getRecipe(contentId, userId);
      } else if (contentType === 'inventory') {
        content = await aiMlStorage.getFoodItem(userId, contentId);
      }
      
      if (!content) {
        return res.status(404).json({
          success: false,
          error: "Content not found"
        });
      }
    }

    // Generate tags
    const generatedTags = await mlService.generateTags(content, contentType, maxTags);

    // Create or get tags and assign to content
    const tags = [];
    for (const tagInfo of generatedTags) {
      const tag = await aiMlStorage.getOrCreateTag(tagInfo.name);
      tags.push({
        ...tag,
        relevanceScore: tagInfo.relevanceScore,
        source: tagInfo.source
      });
      
      await aiMlStorage.assignContentTag({
        contentId,
        contentType,
        tagId: tag.id,
        relevanceScore: tagInfo.relevanceScore,
        isManual: false,
        userId,
      });
    }

    res.json({ success: true, tags });
  } catch (error) {
    console.error("Error generating tags:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to generate tags" 
    });
  }
});

/**
 * GET /api/ml/tags/trending
 * Get trending tags
 */
router.get("/tags/trending", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const tags = await aiMlStorage.getTrendingTags(limit);
    
    res.json({ success: true, tags });
  } catch (error) {
    console.error("Error getting trending tags:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get trending tags" 
    });
  }
});

/**
 * POST /api/ml/tags/approve
 * Approve/reject suggested tags
 */
router.post("/tags/approve", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      contentId: z.string(),
      contentType: z.string(),
      approvedTags: z.array(z.string()),
      rejectedTags: z.array(z.string()),
    });

    const { contentId, contentType, approvedTags, rejectedTags } = schema.parse(req.body);
    const userId = req.user!.id;

    // Process approved tags
    for (const tagId of approvedTags) {
      await aiMlStorage.updateTagRelevanceScore(contentId, tagId, userId, 1.0);
    }
    
    // Remove rejected tags
    for (const tagId of rejectedTags) {
      await aiMlStorage.removeContentTag(contentId, tagId, userId);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating tags:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to update tags" 
    });
  }
});

/**
 * GET /api/ml/tags/related/:tag
 * Find related tags
 */
router.get("/tags/related/:tagId", async (req: Request, res: Response) => {
  try {
    const { tagId } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;
    
    const relatedTags = await aiMlStorage.getRelatedTags(tagId, limit);
    
    res.json({ success: true, tags: relatedTags });
  } catch (error) {
    console.error("Error getting related tags:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get related tags" 
    });
  }
});

/**
 * GET /api/ml/tags/search
 * Search tags by query
 */
router.get("/tags/search", async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!query) {
      return res.status(400).json({ 
        success: false, 
        error: "Search query is required" 
      });
    }
    
    const tags = await aiMlStorage.searchTags(query, limit);
    
    res.json({ success: true, tags });
  } catch (error) {
    console.error("Error searching tags:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to search tags" 
    });
  }
});

/**
 * GET /api/ml/tags/all
 * Get all tags (optionally filtered by user)
 */
router.get("/tags/all", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userOnly === 'true' ? req.user!.id : undefined;
    const tags = await aiMlStorage.getAllTags(userId);
    
    res.json({ success: true, tags });
  } catch (error) {
    console.error("Error getting all tags:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get tags" 
    });
  }
});

/**
 * GET /api/ml/content/:id/tags
 * Get tags for specific content
 */
router.get("/content/:contentId/tags", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const contentType = req.query.type as string;
    const userId = req.user!.id;
    
    if (!contentType) {
      return res.status(400).json({ 
        success: false, 
        error: "Content type is required" 
      });
    }
    
    const tags = await aiMlStorage.getContentTags(contentId, contentType, userId);
    
    res.json({ success: true, tags });
  } catch (error) {
    console.error("Error getting content tags:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get content tags" 
    });
  }
});

/**
 * DELETE /api/ml/content/:id/tags/:tagId
 * Remove tag from content
 */
router.delete("/content/:contentId/tags/:tagId", async (req: Request, res: Response) => {
  try {
    const { contentId, tagId } = req.params;
    const userId = req.user!.id;
    
    await aiMlStorage.removeContentTag(contentId, tagId, userId);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error removing tag:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to remove tag" 
    });
  }
});

/**
 * POST /api/ml/duplicates/check
 * Check if content is duplicate before saving
 */
router.post("/duplicates/check", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      content: z.any(),
      contentType: z.enum(['recipe', 'inventory', 'chat', 'meal_plan']),
      threshold: z.number().min(0).max(1).optional().default(0.85),
    });

    const { content, contentType, threshold } = schema.parse(req.body);
    const userId = req.user!.id;

    const result = await mlService.checkDuplicate(
      content,
      contentType,
      userId,
      threshold
    );

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error checking duplicates:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to check duplicates" 
    });
  }
});

/**
 * GET /api/ml/duplicates/pending
 * List potential duplicates for review
 */
router.get("/duplicates/pending", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Get all pending duplicate pairs for user
    // This would be implemented in storage layer
    
    res.json({ success: true, duplicates: [] });
  } catch (error) {
    console.error("Error getting pending duplicates:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get pending duplicates" 
    });
  }
});

/**
 * POST /api/ml/duplicates/resolve
 * Mark as duplicate or unique
 */
router.post("/duplicates/resolve", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      pairId: z.string(),
      status: z.enum(['duplicate', 'unique', 'merged']),
    });

    const { pairId, status } = schema.parse(req.body);
    const userId = req.user!.id;

    await aiMlStorage.updateDuplicateStatus(pairId, status, userId);

    res.json({ success: true });
  } catch (error) {
    console.error("Error resolving duplicate:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to resolve duplicate" 
    });
  }
});

/**
 * GET /api/ml/content/:id/related
 * Get related content for an item
 */
router.get("/content/:contentId/related", async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;
    const contentType = req.query.type as string;
    const limit = parseInt(req.query.limit as string) || 5;
    const userId = req.user!.id;

    const related = await mlService.findRelatedContent(
      contentId,
      contentType,
      userId,
      limit
    );

    res.json({ success: true, related });
  } catch (error) {
    console.error("Error getting related content:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get related content" 
    });
  }
});

/**
 * POST /api/ml/content/embeddings/refresh
 * Refresh embeddings for all user content
 */
router.post("/content/embeddings/refresh", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // Run in background
    mlService.updateUserEmbeddings(userId).catch(console.error);

    res.json({ 
      success: true, 
      message: "Embedding refresh started in background" 
    });
  } catch (error) {
    console.error("Error starting embedding refresh:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to start embedding refresh" 
    });
  }
});

/**
 * POST /api/ml/query/natural
 * Convert natural language to SQL
 */
router.post("/query/natural", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      query: z.string().min(1),
      tables: z.array(z.string()).optional(),
    });

    const { query, tables } = schema.parse(req.body);
    const userId = req.user!.id;

    const result = await mlService.naturalLanguageToSQL(
      query,
      userId,
      tables
    );

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error converting query:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to convert query" 
    });
  }
});

/**
 * GET /api/ml/query/history
 * User's query history
 */
router.get("/query/history", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 20;

    const history = await aiMlStorage.getQueryHistory(userId, limit);

    res.json({ success: true, history });
  } catch (error) {
    console.error("Error getting query history:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to get query history" 
    });
  }
});

/**
 * POST /api/ml/query/save
 * Save useful queries
 */
router.post("/query/save", async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      naturalQuery: z.string(),
      generatedSql: z.string(),
      resultCount: z.number().optional(),
    });

    const { naturalQuery, generatedSql, resultCount } = schema.parse(req.body);
    const userId = req.user!.id;

    const log = await aiMlStorage.createQueryLog(userId, {
      naturalQuery,
      generatedSql,
      resultCount,
    });

    res.json({ success: true, log });
  } catch (error) {
    console.error("Error saving query:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to save query" 
    });
  }
});

export default router;