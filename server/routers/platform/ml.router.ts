import { Router, Request, Response } from "express";
import { isAuthenticated, getAuthenticatedUserId } from "../../middleware/oauth.middleware";
import { mlService } from "../../services/ml.service";

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

export default router;
