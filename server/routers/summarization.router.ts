/**
 * Summarization Router
 * 
 * API endpoints for AI-powered text summarization functionality.
 * Supports generating summaries, caching, batch processing, and editing.
 */

import { Router } from "express";
import { storage } from "../storage/index";
import { isAuthenticated } from "../middleware/oauth.middleware";
import { z } from "zod";
import {
  generateSummary,
  batchSummarize,
  formatSummary,
  calculateCompressionRatio
} from "../services/summarization.service";
import crypto from "crypto";

const router = Router();

// Input validation schemas
const summarizeRequestSchema = z.object({
  content: z.string().min(50, "Content must be at least 50 characters"),
  contentId: z.string().optional(),
  type: z.enum(['tldr', 'bullet', 'paragraph']).default('tldr'),
  length: z.number().min(1).max(10).default(2),
  extractKeyPoints: z.boolean().default(false),
  forceRegenerate: z.boolean().default(false) // Skip cache
});

const batchSummarizeRequestSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    content: z.string().min(50),
    type: z.enum(['tldr', 'bullet', 'paragraph']).optional(),
    length: z.number().min(1).max(10).optional(),
    extractKeyPoints: z.boolean().optional()
  })).min(1).max(10) // Limit batch size
});

const updateSummaryRequestSchema = z.object({
  editedText: z.string().optional(),
  summaryType: z.enum(['tldr', 'bullet', 'paragraph']).optional(),
  keyPoints: z.array(z.string()).optional()
});

/**
 * POST /api/summarize
 * Generate a summary of content
 */
router.post("/summarize", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session?.passport?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate request body
    const validatedData = summarizeRequestSchema.parse(req.body);
    const {
      content,
      contentId: providedContentId,
      type,
      length,
      extractKeyPoints,
      forceRegenerate
    } = validatedData;

    // Generate contentId if not provided (hash of content)
    const contentId = providedContentId || crypto
      .createHash('md5')
      .update(content)
      .digest('hex');

    // Check cache if not forcing regeneration
    if (!forceRegenerate) {
      const cached = await storage.platform.ai.getSummary(userId, contentId);
      if (cached && cached.summaryType === type && cached.summaryLength === length) {
        return res.json({
          summary: cached.isEdited ? cached.editedText : cached.summaryText,
          wordCount: cached.wordCount,
          originalWordCount: cached.originalWordCount,
          keyPoints: cached.keyPoints,
          compressionRatio: calculateCompressionRatio(
            cached.originalWordCount || 0,
            cached.wordCount
          ),
          cached: true,
          id: cached.id
        });
      }
    }

    // Generate new summary
    const result = await generateSummary({
      content,
      type,
      length,
      extractKeyPoints
    });

    // Save to database
    const saved = await storage.platform.ai.createSummary(userId, {
      contentId,
      originalContent: content,
      summaryText: result.summary,
      summaryType: type,
      wordCount: result.wordCount,
      originalWordCount: result.originalWordCount,
      summaryLength: length,
      keyPoints: result.keyPoints,
      metadata: result.metadata,
      isEdited: false
    });

    res.json({
      summary: formatSummary(result.summary, type),
      wordCount: result.wordCount,
      originalWordCount: result.originalWordCount,
      keyPoints: result.keyPoints,
      compressionRatio: calculateCompressionRatio(
        result.originalWordCount,
        result.wordCount
      ),
      cached: false,
      id: saved.id
    });
  } catch (error) {
    console.error("[Summarize] Error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid request",
        details: error.errors 
      });
    }
    
    res.status(500).json({ 
      error: "Failed to generate summary",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

/**
 * GET /api/content/:contentId/summary
 * Get cached summary for content
 */
router.get("/content/:contentId/summary", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session?.passport?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { contentId } = req.params;
    const summary = await storage.platform.ai.getSummary(userId, contentId);

    if (!summary) {
      return res.status(404).json({ error: "Summary not found" });
    }

    res.json({
      summary: formatSummary(
        summary.isEdited ? summary.editedText! : summary.summaryText,
        summary.summaryType as 'tldr' | 'bullet' | 'paragraph'
      ),
      type: summary.summaryType,
      wordCount: summary.wordCount,
      originalWordCount: summary.originalWordCount,
      keyPoints: summary.keyPoints,
      compressionRatio: calculateCompressionRatio(
        summary.originalWordCount || 0,
        summary.wordCount
      ),
      isEdited: summary.isEdited,
      id: summary.id,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt
    });
  } catch (error) {
    console.error("[GetSummary] Error:", error);
    res.status(500).json({ error: "Failed to get summary" });
  }
});

/**
 * POST /api/summarize/batch
 * Bulk summarize multiple items
 */
router.post("/summarize/batch", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session?.passport?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate request
    const validatedData = batchSummarizeRequestSchema.parse(req.body);
    const { items } = validatedData;

    // Check for cached summaries first
    const cacheChecks = await Promise.all(
      items.map(async (item) => {
        const contentId = crypto
          .createHash('md5')
          .update(item.content)
          .digest('hex');
        
        const cached = await storage.platform.ai.getSummary(userId, contentId);
        return { item, contentId, cached };
      })
    );

    // Separate cached and uncached items
    const uncached = cacheChecks.filter(c => !c.cached);
    const cached = cacheChecks.filter(c => c.cached);

    // Generate summaries for uncached items
    let newSummaries: Array<any> = [];
    if (uncached.length > 0) {
      newSummaries = await batchSummarize(
        uncached.map(u => ({
          id: u.item.id,
          content: u.item.content,
          options: {
            type: u.item.type,
            length: u.item.length,
            extractKeyPoints: u.item.extractKeyPoints
          }
        }))
      );

      // Save new summaries to database
      await Promise.all(
        newSummaries
          .filter(s => s.result)
          .map(async (s, index) => {
            const { contentId, item } = uncached[index];
            return storage.platform.ai.createSummary(userId, {
              contentId,
              originalContent: item.content,
              summaryText: s.result!.summary,
              summaryType: item.type || 'tldr',
              wordCount: s.result!.wordCount,
              originalWordCount: s.result!.originalWordCount,
              summaryLength: item.length || 2,
              keyPoints: s.result!.keyPoints,
              metadata: s.result!.metadata,
              isEdited: false
            });
          })
      );
    }

    // Combine results
    const results = [
      ...cached.map(c => ({
        id: c.item.id,
        summary: c.cached!.isEdited ? c.cached!.editedText : c.cached!.summaryText,
        type: c.cached!.summaryType,
        wordCount: c.cached!.wordCount,
        originalWordCount: c.cached!.originalWordCount,
        keyPoints: c.cached!.keyPoints,
        cached: true
      })),
      ...newSummaries.map(s => ({
        id: s.id,
        summary: s.result ? formatSummary(s.result.summary, s.result.type || 'tldr') : null,
        type: s.result?.type || 'tldr',
        wordCount: s.result?.wordCount,
        originalWordCount: s.result?.originalWordCount,
        keyPoints: s.result?.keyPoints,
        cached: false,
        error: s.error
      }))
    ];

    res.json({ results });
  } catch (error) {
    console.error("[BatchSummarize] Error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid request",
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: "Failed to batch summarize" });
  }
});

/**
 * PUT /api/summarize/:id
 * Edit/improve a summary
 */
router.put("/summarize/:id", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session?.passport?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const validatedData = updateSummaryRequestSchema.parse(req.body);

    // Update the summary
    const updated = await storage.platform.ai.updateSummary(userId, id, {
      ...validatedData,
      isEdited: !!validatedData.editedText
    });

    res.json({
      summary: formatSummary(
        updated.isEdited ? updated.editedText! : updated.summaryText,
        updated.summaryType as 'tldr' | 'bullet' | 'paragraph'
      ),
      type: updated.summaryType,
      wordCount: updated.wordCount,
      originalWordCount: updated.originalWordCount,
      keyPoints: updated.keyPoints,
      isEdited: updated.isEdited,
      id: updated.id
    });
  } catch (error) {
    console.error("[UpdateSummary] Error:", error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: "Invalid request",
        details: error.errors 
      });
    }
    
    res.status(500).json({ error: "Failed to update summary" });
  }
});

/**
 * GET /api/summaries
 * Get user's summary history
 */
router.get("/summaries", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session?.passport?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const type = req.query.type as 'tldr' | 'bullet' | 'paragraph' | undefined;

    const summaries = type
      ? await storage.platform.ai.getSummariesByType(userId, type)
      : await storage.platform.ai.getSummaries(userId, limit);

    const formattedSummaries = summaries.map(s => ({
      id: s.id,
      contentId: s.contentId,
      summary: formatSummary(
        s.isEdited ? s.editedText! : s.summaryText,
        s.summaryType as 'tldr' | 'bullet' | 'paragraph'
      ),
      type: s.summaryType,
      wordCount: s.wordCount,
      originalWordCount: s.originalWordCount,
      keyPoints: s.keyPoints,
      compressionRatio: calculateCompressionRatio(
        s.originalWordCount || 0,
        s.wordCount
      ),
      isEdited: s.isEdited,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));

    res.json({ summaries: formattedSummaries });
  } catch (error) {
    console.error("[GetSummaries] Error:", error);
    res.status(500).json({ error: "Failed to get summaries" });
  }
});

/**
 * DELETE /api/summarize/:id
 * Delete a summary
 */
router.delete("/summarize/:id", isAuthenticated, async (req, res) => {
  try {
    const userId = req.session?.passport?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    await storage.platform.ai.deleteSummary(userId, id);

    res.json({ success: true });
  } catch (error) {
    console.error("[DeleteSummary] Error:", error);
    res.status(500).json({ error: "Failed to delete summary" });
  }
});

export default router;