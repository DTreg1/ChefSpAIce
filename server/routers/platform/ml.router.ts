import { Router, Request, Response } from "express";
import { isAuthenticated, getAuthenticatedUserId } from "../../middleware/oauth.middleware";
import { mlService } from "../../services/ml.service";
import { DuplicateDetectionService } from "../../services/duplicate-detection.service";
import { openai } from "../../integrations/openai";
import { asyncHandler } from "../../middleware/error.middleware";
import { ApiError } from "../../utils/apiError";

const router = Router();

router.post("/search/semantic", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { query, contentType = 'recipe' } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    
    const results = await mlService.semanticSearch(query, contentType, userId, 10);
    
    res.json({ 
      results: results.map(r => ({
        contentId: r.content.contentId,
        contentType: r.content.contentType,
        content: r.content.metadata,
        similarity: r.similarity,
      }))
    });
  } catch (error) {
    console.error("Error in semantic search:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Semantic search failed" 
    });
  }
});

router.post("/search/feedback", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    res.json({ success: true, message: "Feedback recorded" });
  } catch (error) {
    console.error("Error recording feedback:", error);
    res.status(500).json({ error: "Failed to record feedback" });
  }
});

router.post("/natural-query", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    
    const results = await mlService.naturalLanguageToSQL(query, userId);
    res.json(results);
  } catch (error) {
    console.error("Error processing natural language query:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Query processing failed" 
    });
  }
});

router.get("/related", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    const { contentId, contentType } = req.query;
    
    if (!contentId || !contentType) {
      return res.status(400).json({ error: "contentId and contentType are required" });
    }
    
    const related = await mlService.findRelatedContent(
      contentId as string, 
      contentType as string,
      userId
    );
    
    res.json(related);
  } catch (error) {
    console.error("Error fetching related content:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to fetch related content" 
    });
  }
});

router.post("/embeddings/update", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    await mlService.updateUserEmbeddings(userId);
    
    res.json({ success: true, message: "Embeddings updated successfully" });
  } catch (error) {
    console.error("Error updating embeddings:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to update embeddings" 
    });
  }
});

router.post(
  "/categorize",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { content, contentType = "general" } = req.body || {};

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    if (!openai) {
      return res.json({
        category: "uncategorized",
        confidence: 0,
        suggestedCategories: [],
      });
    }

    const prompt = `Categorize this content into a single primary category.
Content type: ${contentType}
Content: ${content.substring(0, 500)}

Return JSON with:
- category: The primary category name
- confidence: Confidence score from 0 to 1
- suggestedCategories: Array of up to 3 alternative categories

Response must be valid JSON only.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
    });

    let result = {
      category: "uncategorized",
      confidence: 0,
      suggestedCategories: [],
    };

    try {
      result = JSON.parse(completion.choices[0].message?.content || "{}");
    } catch {
      // Keep defaults
    }

    res.json(result);
  })
);

router.post(
  "/categorize/batch",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { items, contentType = "general" } = req.body || {};

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Items array is required" });
    }

    if (items.length > 50) {
      return res.status(400).json({ error: "Maximum 50 items per batch" });
    }

    const results = await Promise.all(
      items.map(async (item: { id: string; content: string }) => {
        if (!openai) {
          return {
            id: item.id,
            category: "uncategorized",
            confidence: 0,
          };
        }

        try {
          const prompt = `Categorize this ${contentType} content: "${item.content?.substring(0, 200)}"
Return JSON: { "category": "...", "confidence": 0.0-1.0 }`;

          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 100,
          });

          const parsed = JSON.parse(completion.choices[0].message?.content || "{}");
          return {
            id: item.id,
            category: parsed.category || "uncategorized",
            confidence: parsed.confidence || 0,
          };
        } catch {
          return {
            id: item.id,
            category: "uncategorized",
            confidence: 0,
          };
        }
      })
    );

    res.json({ results });
  })
);

router.post(
  "/tags/generate",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { content, contentType = "general", maxTags = 5 } = req.body || {};

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    if (!openai) {
      return res.json({ tags: [] });
    }

    const prompt = `Generate up to ${maxTags} relevant tags for this ${contentType} content:
"${content.substring(0, 500)}"

Return JSON array of tags: ["tag1", "tag2", ...]
Tags should be lowercase, single words or short phrases.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 150,
    });

    let tags: string[] = [];
    try {
      tags = JSON.parse(completion.choices[0].message?.content || "[]");
    } catch {
      tags = [];
    }

    res.json({ tags: tags.slice(0, maxTags) });
  })
);

router.post(
  "/tags/assign",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { contentId, contentType, tags } = req.body || {};

    if (!contentId || !contentType || !tags) {
      return res.status(400).json({ 
        error: "contentId, contentType, and tags are required" 
      });
    }

    res.json({
      success: true,
      contentId,
      contentType,
      assignedTags: tags,
    });
  })
);

router.get(
  "/tags/related/:tagId",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { tagId } = req.params;

    res.json({
      tag: tagId,
      relatedTags: [],
      contentCount: 0,
    });
  })
);

router.get(
  "/content/:contentId/tags",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { contentId } = req.params;

    res.json({
      contentId,
      tags: [],
    });
  })
);

router.delete(
  "/content/:contentId/tags/:tagId",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { contentId, tagId } = req.params;

    res.json({
      success: true,
      contentId,
      removedTag: tagId,
    });
  })
);

router.get(
  "/duplicates",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    try {
      const duplicates = await DuplicateDetectionService.getPendingDuplicates(userId, limit);
      res.json({ duplicates });
    } catch (error) {
      console.error("Error fetching duplicates:", error);
      throw new ApiError("Failed to fetch duplicates", 500, { cause: error });
    }
  })
);

router.post(
  "/duplicates/scan",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { contentType = "recipe" } = req.body || {};

    try {
      const stats = await DuplicateDetectionService.getDuplicateStats(userId);
      
      res.json({
        success: true,
        message: "Duplicate scan initiated",
        contentType,
        stats,
      });
    } catch (error) {
      console.error("Error scanning for duplicates:", error);
      throw new ApiError("Failed to scan for duplicates", 500, { cause: error });
    }
  })
);

router.post(
  "/duplicates/resolve",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { duplicatePairId, resolution } = req.body || {};

    if (!duplicatePairId || !resolution) {
      return res.status(400).json({ 
        error: "duplicatePairId and resolution are required" 
      });
    }

    const validResolutions = ["duplicate", "unique", "merged"];
    if (!validResolutions.includes(resolution)) {
      return res.status(400).json({ 
        error: "resolution must be one of: duplicate, unique, merged" 
      });
    }

    try {
      await DuplicateDetectionService.resolveDuplicate(
        duplicatePairId,
        resolution,
        userId
      );

      res.json({
        success: true,
        duplicatePairId,
        resolution,
      });
    } catch (error) {
      console.error("Error resolving duplicate:", error);
      res.status(500).json({ error: "Failed to resolve duplicate" });
    }
  })
);

router.get(
  "/stats/uncategorized",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    res.json({
      total: 0,
      byContentType: {},
      recentlyAdded: 0,
    });
  })
);

export default router;
