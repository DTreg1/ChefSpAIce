import express, { Request, Response } from 'express';
import { z } from 'zod';
import { DuplicateDetectionService } from '../services/duplicate-detection.service';
import { isAuthenticated } from '../middleware/oauth.middleware';
import { db } from '../db';
import { userRecipes } from '../../shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

/**
 * POST /api/duplicates/check
 * Check if content is duplicate before saving
 */
const checkDuplicateSchema = z.object({
  content: z.string(),
  contentType: z.enum(['recipe', 'chat', 'inventory']),
  contentId: z.string().optional(), // For existing content being updated
});

router.post('/check', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validation = checkDuplicateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { content, contentType, contentId } = validation.data;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const result = await DuplicateDetectionService.checkForDuplicates(
      content,
      contentType,
      userId,
      contentId
    );

    res.json({
      isDuplicate: result.isDuplicate,
      duplicates: result.duplicates,
      similarityHash: result.similarityHash,
      threshold: 85, // 85% similarity threshold
    });
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    res.status(500).json({ error: 'Failed to check for duplicates' });
  }
});

/**
 * GET /api/duplicates/pending
 * List potential duplicates for review
 */
router.get('/pending', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const limit = parseInt(req.query.limit as string) || 10;

    const pendingDuplicates = await DuplicateDetectionService.getPendingDuplicates(
      userId,
      limit
    );

    res.json({ duplicates: pendingDuplicates });
  } catch (error) {
    console.error('Error getting pending duplicates:', error);
    res.status(500).json({ error: 'Failed to get pending duplicates' });
  }
});

/**
 * POST /api/duplicates/resolve
 * Mark duplicate pair as duplicate or unique
 */
const resolveDuplicateSchema = z.object({
  duplicatePairId: z.string(),
  status: z.enum(['duplicate', 'unique', 'merged']),
  mergeIntoId: z.string().optional(), // If merging, which content to keep
});

router.post('/resolve', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validation = resolveDuplicateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { duplicatePairId, status, mergeIntoId } = validation.data;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // If merging, handle the merge logic
    if (status === 'merged' && mergeIntoId) {
      // This would be implemented based on specific merge requirements
      // For now, we just mark the status
    }

    await DuplicateDetectionService.resolveDuplicate(
      duplicatePairId,
      status,
      userId
    );

    res.json({ success: true, status });
  } catch (error) {
    console.error('Error resolving duplicate:', error);
    res.status(500).json({ error: 'Failed to resolve duplicate' });
  }
});

/**
 * GET /api/duplicates/stats
 * Get duplicate detection statistics
 */
router.get('/stats', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const stats = await DuplicateDetectionService.getDuplicateStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error getting duplicate stats:', error);
    res.status(500).json({ error: 'Failed to get duplicate statistics' });
  }
});

/**
 * POST /api/duplicates/reindex
 * Reindex content to generate embeddings for existing content
 */
const reindexSchema = z.object({
  contentType: z.enum(['recipe', 'chat', 'inventory']),
  limit: z.number().min(1).max(100).default(10),
});

router.post('/reindex', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validation = reindexSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error });
    }

    const { contentType, limit } = validation.data;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    let reindexed = 0;

    if (contentType === 'recipe') {
      // Get recipes without embeddings
      const recipes = await db
        .select()
        .from(userRecipes)
        .where(eq(userRecipes.userId, userId))
        .limit(limit);

      for (const recipe of recipes) {
        await DuplicateDetectionService.updateContentEmbedding(
          recipe.id,
          'recipe',
          recipe,
          userId
        );
        reindexed++;
      }
    }

    res.json({ 
      success: true, 
      reindexed,
      message: `Successfully reindexed ${reindexed} ${contentType} items` 
    });
  } catch (error) {
    console.error('Error reindexing content:', error);
    res.status(500).json({ error: 'Failed to reindex content' });
  }
});

/**
 * GET /api/duplicates/check-recipe/:recipeId
 * Check if a specific recipe has duplicates
 */
router.get('/check-recipe/:recipeId', isAuthenticated, async (req: ExpressRequest, res: ExpressResponse) => {
  try {
    const { recipeId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Get the recipe
    const recipes = await db
      .select()
      .from(userRecipes)
      .where(eq(userRecipes.id, recipeId))
      .limit(1);

    if (recipes.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const recipe = recipes[0];
    if (recipe.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Prepare content text
    const contentText = `${recipe.title} ${recipe.description || ''} ${recipe.ingredients?.join(' ') || ''} ${recipe.instructions?.join(' ') || ''}`;

    const result = await DuplicateDetectionService.checkForDuplicates(
      contentText,
      'recipe',
      userId,
      recipeId
    );

    res.json({
      recipeId,
      title: recipe.title,
      isDuplicate: result.isDuplicate,
      duplicates: result.duplicates,
      similarityHash: result.similarityHash,
    });
  } catch (error) {
    console.error('Error checking recipe for duplicates:', error);
    res.status(500).json({ error: 'Failed to check recipe for duplicates' });
  }
});

export default router;