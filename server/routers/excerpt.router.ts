/**
 * Excerpt Generation API Router
 * 
 * Handles excerpt generation, A/B testing, performance tracking, and optimization
 * using OpenAI GPT-3.5-turbo for creating compelling preview snippets.
 * 
 * Endpoints:
 * - POST /api/excerpts/generate - Generate multiple excerpt variants
 * - GET /api/excerpts/test - Get A/B test variants for a content
 * - GET /api/excerpts/performance - Track excerpt performance metrics
 * - PUT /api/excerpts/optimize - Optimize based on performance data
 * - GET /api/excerpts/:contentId - Get excerpts for specific content
 * - PUT /api/excerpts/:excerptId/activate - Set active excerpt
 * - DELETE /api/excerpts/:excerptId - Delete an excerpt
 * - POST /api/excerpts/:excerptId/track - Track performance event
 * 
 * @module server/routers/excerpt
 */

import { Router } from 'express';
import type { IStorage } from '../storage/interfaces/IStorage';
import { storage } from "../storage/index";
import { excerptService } from '../services/excerpt.service';
import { insertExcerptSchema } from '@shared/schema';
import { z } from 'zod';

// Request schemas
const generateExcerptSchema = z.object({
  content: z.string().min(50, "Content must be at least 50 characters"),
  contentId: z.string().min(1),
  targetPlatform: z.enum(['twitter', 'linkedin', 'facebook', 'instagram', 'generic']).optional(),
  excerptType: z.enum(['social', 'email', 'card', 'meta', 'summary']).optional(),
  tone: z.enum(['professional', 'casual', 'formal', 'friendly', 'exciting', 'informative']).optional(),
  style: z.enum(['descriptive', 'action-oriented', 'question-based', 'teaser', 'summary']).optional(),
  targetAudience: z.string().optional(),
  callToAction: z.boolean().optional(),
  hashtags: z.boolean().optional(),
  emojis: z.boolean().optional(),
  maxCharacters: z.number().min(20).max(5000).optional(),
  temperature: z.number().min(0).max(1).optional(),
  variantCount: z.number().min(1).max(5).optional(),
});

const optimizeExcerptSchema = z.object({
  excerptId: z.string(),
  targetCTR: z.number().min(0).max(1).optional(),
});

const trackPerformanceSchema = z.object({
  views: z.number().min(0).optional(),
  clicks: z.number().min(0).optional(),
  shares: z.number().min(0).optional(),
  engagements: z.number().min(0).optional(),
  conversions: z.number().min(0).optional(),
  bounces: z.number().min(0).optional(),
  timeOnPage: z.number().min(0).optional(),
  platformMetrics: z.object({
    twitter: z.object({
      impressions: z.number().optional(),
      retweets: z.number().optional(),
      likes: z.number().optional(),
      replies: z.number().optional(),
    }).optional(),
    linkedin: z.object({
      impressions: z.number().optional(),
      reactions: z.number().optional(),
      comments: z.number().optional(),
      reposts: z.number().optional(),
    }).optional(),
    facebook: z.object({
      reach: z.number().optional(),
      reactions: z.number().optional(),
      comments: z.number().optional(),
      shares: z.number().optional(),
    }).optional(),
    email: z.object({
      opens: z.number().optional(),
      clicks: z.number().optional(),
      forwards: z.number().optional(),
    }).optional(),
  }).optional(),
});

export function createExcerptRouter(storage: IStorage): Router {
  const router = Router();

  /**
   * POST /api/excerpts/generate
   * Generate multiple excerpt variants for A/B testing
   */
  router.post('/generate', async (req, res) => {
    try {
      const userId = req.session?.passport?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const validatedData = generateExcerptSchema.parse(req.body);
      
      // Generate excerpts using AI service
      const generatedExcerpts = await excerptService.generateExcerpts({
        content: validatedData.content,
        targetPlatform: validatedData.targetPlatform,
        excerptType: validatedData.excerptType,
        tone: validatedData.tone,
        style: validatedData.style,
        targetAudience: validatedData.targetAudience,
        callToAction: validatedData.callToAction,
        hashtags: validatedData.hashtags,
        emojis: validatedData.emojis,
        maxCharacters: validatedData.maxCharacters,
        temperature: validatedData.temperature,
        variantCount: validatedData.variantCount,
      });

      // Save generated excerpts to database
      const savedExcerpts = [];
      for (const generated of generatedExcerpts) {
        const excerpt = await storage.platform.ai.createExcerpt(userId, {
          contentId: validatedData.contentId,
          originalContent: validatedData.content,
          excerptText: generated.text,
          excerptType: validatedData.excerptType || 'social',
          targetPlatform: validatedData.targetPlatform || 'generic',
          characterCount: generated.characterCount,
          wordCount: generated.wordCount,
          variant: generated.variant,
          generationParams: generated.generationParams,
          socialMetadata: generated.metadata,
          isActive: generated.variant === 'A', // Make variant A active by default
        });
        savedExcerpts.push(excerpt);
      }

      res.json({ 
        success: true, 
        excerpts: savedExcerpts,
        message: `Generated ${savedExcerpts.length} excerpt variants` 
      });
    } catch (error) {
      console.error('Error generating excerpts:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to generate excerpts' });
    }
  });

  /**
   * GET /api/excerpts/test
   * Get A/B test variants for a content
   */
  router.get('/test', async (req, res) => {
    try {
      const userId = req.session?.passport?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { contentId } = req.query;
      if (!contentId || typeof contentId !== 'string') {
        return res.status(400).json({ error: 'Content ID is required' });
      }

      // Get all variants for the content
      const excerpts = await storage.platform.ai.getExcerptsByContent(userId, contentId);
      
      if (excerpts.length === 0) {
        return res.status(404).json({ error: 'No excerpts found for this content' });
      }

      // Return variants sorted by performance (CTR)
      const variants = excerpts.map(excerpt => ({
        id: excerpt.id,
        variant: excerpt.variant,
        text: excerpt.excerptText,
        characterCount: excerpt.characterCount,
        wordCount: excerpt.wordCount,
        ctr: excerpt.clickThroughRate,
        isActive: excerpt.isActive,
        platform: excerpt.targetPlatform,
        type: excerpt.excerptType,
      }));

      res.json({ 
        success: true, 
        variants,
        activeVariant: variants.find(v => v.isActive),
      });
    } catch (error) {
      console.error('Error getting test variants:', error);
      res.status(500).json({ error: 'Failed to get test variants' });
    }
  });

  /**
   * GET /api/excerpts/performance
   * Get performance metrics for excerpts
   */
  router.get('/performance', async (req, res) => {
    try {
      const userId = req.session?.passport?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { excerptId, startDate, endDate } = req.query;
      
      if (!excerptId || typeof excerptId !== 'string') {
        return res.status(400).json({ error: 'Excerpt ID is required' });
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const performance = await storage.platform.ai.getExcerptPerformance(excerptId, start, end);

      // Calculate aggregate metrics
      const totals = performance.reduce((acc, perf) => ({
        views: acc.views + perf.views,
        clicks: acc.clicks + perf.clicks,
        shares: acc.shares + (perf.shares || 0),
        engagements: acc.engagements + (perf.engagements || 0),
        conversions: acc.conversions + (perf.conversions || 0),
        bounces: acc.bounces + (perf.bounces || 0),
      }), {
        views: 0,
        clicks: 0,
        shares: 0,
        engagements: 0,
        conversions: 0,
        bounces: 0,
      });

      const aggregateMetrics = {
        totalViews: totals.views,
        totalClicks: totals.clicks,
        totalShares: totals.shares,
        totalEngagements: totals.engagements,
        totalConversions: totals.conversions,
        totalBounces: totals.bounces,
        averageCTR: totals.views > 0 ? totals.clicks / totals.views : 0,
        averageShareRate: totals.views > 0 ? totals.shares / totals.views : 0,
        averageEngagementRate: totals.views > 0 ? totals.engagements / totals.views : 0,
        conversionRate: totals.views > 0 ? totals.conversions / totals.views : 0,
        bounceRate: totals.views > 0 ? totals.bounces / totals.views : 0,
      };

      res.json({ 
        success: true, 
        daily: performance,
        aggregate: aggregateMetrics,
      });
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      res.status(500).json({ error: 'Failed to get performance metrics' });
    }
  });

  /**
   * PUT /api/excerpts/optimize
   * Optimize excerpt based on performance
   */
  router.put('/optimize', async (req, res) => {
    try {
      const userId = req.session?.passport?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const validatedData = optimizeExcerptSchema.parse(req.body);

      // Get current excerpt
      const excerpts = await storage.platform.ai.getExcerptsByContent(userId, validatedData.excerptId);
      const excerpt = excerpts.find(e => e.id === validatedData.excerptId);
      
      if (!excerpt) {
        return res.status(404).json({ error: 'Excerpt not found' });
      }

      // Get performance data
      const performance = await storage.platform.ai.getExcerptPerformance(validatedData.excerptId);
      if (performance.length === 0) {
        return res.status(400).json({ error: 'No performance data available for optimization' });
      }

      // Calculate aggregate performance
      const totals = performance.reduce((acc, perf) => ({
        views: acc.views + perf.views,
        clicks: acc.clicks + perf.clicks,
        shares: acc.shares + (perf.shares || 0),
        engagements: acc.engagements + (perf.engagements || 0),
      }), { views: 0, clicks: 0, shares: 0, engagements: 0 });

      const performanceData = {
        ctr: totals.views > 0 ? totals.clicks / totals.views : 0,
        shareRate: totals.views > 0 ? totals.shares / totals.views : 0,
        engagementRate: totals.views > 0 ? totals.engagements / totals.views : 0,
      };

      // Generate optimized version
      const optimized = await excerptService.optimizeExcerpt(
        excerpt.excerptText,
        performanceData,
        validatedData.targetCTR || 0.2
      );

      // Save optimized excerpt as new variant
      const optimizedExcerpt = await storage.platform.ai.createExcerpt(userId, {
        contentId: excerpt.contentId,
        originalContent: excerpt.originalContent || '',
        excerptText: optimized.text,
        excerptType: excerpt.excerptType,
        targetPlatform: excerpt.targetPlatform || 'generic',
        characterCount: optimized.characterCount,
        wordCount: optimized.wordCount,
        variant: optimized.variant,
        generationParams: optimized.generationParams,
        socialMetadata: optimized.metadata,
        isActive: false,
      });

      res.json({ 
        success: true, 
        original: excerpt,
        optimized: optimizedExcerpt,
        performanceData,
        message: 'Excerpt optimized based on performance data',
      });
    } catch (error) {
      console.error('Error optimizing excerpt:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to optimize excerpt' });
    }
  });

  /**
   * GET /api/excerpts/:contentId
   * Get all excerpts for a content
   */
  router.get('/:contentId', async (req, res) => {
    try {
      const userId = req.session?.passport?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { contentId } = req.params;
      const excerpts = await storage.platform.ai.getExcerptsByContent(userId, contentId);

      res.json({ 
        success: true, 
        excerpts,
        count: excerpts.length,
      });
    } catch (error) {
      console.error('Error getting excerpts:', error);
      res.status(500).json({ error: 'Failed to get excerpts' });
    }
  });

  /**
   * PUT /api/excerpts/:excerptId/activate
   * Set an excerpt as active
   */
  router.put('/:excerptId/activate', async (req, res) => {
    try {
      const userId = req.session?.passport?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { excerptId } = req.params;
      const { contentId } = req.body;

      if (!contentId) {
        return res.status(400).json({ error: 'Content ID is required' });
      }

      await storage.platform.ai.setActiveExcerpt(userId, contentId, excerptId);

      res.json({ 
        success: true, 
        message: 'Excerpt activated successfully',
      });
    } catch (error) {
      console.error('Error activating excerpt:', error);
      res.status(500).json({ error: 'Failed to activate excerpt' });
    }
  });

  /**
   * DELETE /api/excerpts/:excerptId
   * Delete an excerpt
   */
  router.delete('/:excerptId', async (req, res) => {
    try {
      const userId = req.session?.passport?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { excerptId } = req.params;
      await storage.platform.ai.deleteExcerpt(userId, excerptId);

      res.json({ 
        success: true, 
        message: 'Excerpt deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting excerpt:', error);
      res.status(500).json({ error: 'Failed to delete excerpt' });
    }
  });

  /**
   * POST /api/excerpts/:excerptId/track
   * Track a performance event for an excerpt
   */
  router.post('/:excerptId/track', async (req, res) => {
    try {
      const { excerptId } = req.params;
      const validatedData = trackPerformanceSchema.parse(req.body);

      // Record performance data
      const performance = await storage.platform.ai.recordExcerptPerformance({
        excerptId,
        views: validatedData.views || 0,
        clicks: validatedData.clicks || 0,
        shares: validatedData.shares,
        engagements: validatedData.engagements,
        conversions: validatedData.conversions,
        bounces: validatedData.bounces,
        timeOnPage: validatedData.timeOnPage,
        platformMetrics: validatedData.platformMetrics,
        date: new Date().toISOString().split('T')[0], // Today's date
      });

      res.json({ 
        success: true, 
        performance,
        message: 'Performance tracked successfully',
      });
    } catch (error) {
      console.error('Error tracking performance:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to track performance' });
    }
  });

  return router;
}