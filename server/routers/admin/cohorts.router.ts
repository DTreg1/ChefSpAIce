import { Router } from "express";
import { storage } from "../../storage/index";
import { asyncHandler } from "../../middleware/error.middleware";
import { getAuthenticatedUserId, isAuthenticated } from "../../middleware/oauth.middleware";
import { insertCohortSchema, insertCohortInsightSchema } from "@shared/schema";
import OpenAI from "openai";

const router = Router();

// Initialize OpenAI client using Replit AI Integrations
// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

// Create a new cohort
router.post("/", isAuthenticated, asyncHandler(async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  const cohortData = insertCohortSchema.parse({
    ...req.body,
    createdBy: userId,
  });
  
  const cohort = await storage.admin.experiments.createCohort(cohortData);
  
  res.json({ success: true, cohort });
}));

// Get all cohorts
router.get("/", asyncHandler(async (req, res) => {
  const { isActive, createdBy } = req.query;
  
  const cohorts = await storage.admin.experiments.getCohorts({
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    createdBy: createdBy as string | undefined,
  });
  
  res.json({ success: true, cohorts });
}));

// Get a specific cohort
router.get("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const cohort = await storage.admin.experiments.getCohort(id);
  
  if (!cohort) {
    return res.status(404).json({ error: "Cohort not found" });
  }
  
  res.json({ success: true, cohort });
}));

// Update a cohort
router.patch("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const cohort = await storage.admin.experiments.updateCohort(id, req.body);
  
  res.json({ success: true, cohort });
}));

// Delete a cohort
router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await storage.admin.experiments.deleteCohort(id);
  
  res.json({ success: true });
}));

// Analyze cohort behavior
router.post("/:id/analyze", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.body;
  
  const cohort = await storage.admin.experiments.getCohort(id);
  
  if (!cohort) {
    return res.status(404).json({ error: "Cohort not found" });
  }
  
  // Get metrics for the cohort
  const metrics = await storage.admin.experiments.getCohortMetrics(id, {
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
  });
  
  // Calculate retention rates
  const retention = await storage.admin.experiments.calculateCohortRetention(id, [1, 7, 30]);
  
  // Get AI insights
  const insights = await storage.admin.experiments.getCohortInsights(id);
  
  res.json({
    success: true,
    analysis: {
      cohort,
      metrics,
      retention,
      insights,
    },
  });
}));

// Compare cohorts
router.post("/compare", asyncHandler(async (req, res) => {
  const { cohortIds, metrics = ['retention_day_7', 'engagement_score'] } = req.body;
  
  if (!cohortIds || !Array.isArray(cohortIds) || cohortIds.length < 2) {
    return res.status(400).json({ error: "At least two cohort IDs are required" });
  }
  
  const comparison = await storage.admin.experiments.compareCohorts(cohortIds, metrics);
  
  res.json({ success: true, comparison });
}));

// Calculate retention for a cohort
router.post("/:id/retention", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { periods = [1, 7, 14, 30, 60, 90] } = req.body;
  
  const retention = await storage.admin.experiments.calculateCohortRetention(id, periods);
  
  res.json({ success: true, retention });
}));

// Generate AI insights for a cohort
router.post("/:id/insights", asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const cohort = await storage.admin.experiments.getCohort(id);
  
  if (!cohort) {
    return res.status(404).json({ error: "Cohort not found" });
  }
  
  // Get cohort metrics for context
  const metrics = await storage.admin.experiments.getCohortMetrics(id, {
    metricType: 'retention',
  });
  
  const retention = await storage.admin.experiments.calculateCohortRetention(id, [1, 7, 30]);
  
  // Get comparison with other cohorts for context
  const allCohorts = await storage.admin.experiments.getCohorts({ isActive: true });
  const otherCohortIds = allCohorts
    .filter(c => c.id !== id)
    .slice(0, 2)
    .map(c => c.id);
  
  let comparisonContext = '';
  if (otherCohortIds.length > 0) {
    const comparison = await storage.admin.experiments.compareCohorts(
      [id, ...otherCohortIds],
      ['retention_day_7']
    );
    comparisonContext = JSON.stringify(comparison);
  }
  
  try {
    // Generate insights using OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025
      messages: [
        {
          role: "system",
          content: `You are a data analyst specializing in cohort analysis and user behavior. 
          Analyze the provided cohort data and generate actionable insights.
          Focus on retention patterns, behavioral differences, and business recommendations.
          Be specific about numbers and percentages.`
        },
        {
          role: "user",
          content: `Analyze this cohort and provide insights:
          
          Cohort Name: ${cohort.name}
          Definition: ${JSON.stringify(cohort.definition)}
          User Count: ${cohort.userCount}
          
          Retention Data: ${JSON.stringify(retention)}
          
          ${comparisonContext ? `Comparison with other cohorts: ${comparisonContext}` : ''}
          
          Please provide:
          1. Key retention insights
          2. Behavioral patterns
          3. Comparison with other cohorts (if applicable)
          4. Actionable recommendations
          5. Risk factors or opportunities`
        }
      ],
      max_completion_tokens: 1000,
      temperature: 0.7,
    });
    
    const aiInsights = response.choices[0]?.message?.content || "";
    
    // Parse the AI response to extract structured insights
    const insightLines = aiInsights.split('\n').filter(line => line.trim());
    const insights = [];
    
    // Extract key findings
    const keyFindings = insightLines
      .filter(line => line.includes('retention') || line.includes('%'))
      .slice(0, 3);
    
    // Create structured insights
    if (retention.retention[0]?.rate > 50) {
      insights.push({
        cohortId: id,
        insight: `Strong initial retention at ${retention.retention[0].rate.toFixed(1)}% on Day 1`,
        importance: 'high' as const,
        category: 'retention' as const,
        actionRecommended: 'Continue engagement strategies that are working',
        confidenceScore: 0.85,
        supportingData: {
          metrics: { day1_retention: retention.retention[0].rate },
          evidence: keyFindings,
        },
      });
    }
    
    if (retention.retention.length > 1) {
      const day7Rate = retention.retention.find(r => r.period === 7)?.rate || 0;
      const day30Rate = retention.retention.find(r => r.period === 30)?.rate || 0;
      
      if (day7Rate < 30) {
        insights.push({
          cohortId: id,
          insight: `Low 7-day retention at ${day7Rate.toFixed(1)}% indicates early churn risk`,
          importance: 'critical' as const,
          category: 'risk' as const,
          actionRecommended: 'Implement immediate re-engagement campaigns and onboarding improvements',
          confidenceScore: 0.9,
          supportingData: {
            metrics: { day7_retention: day7Rate },
            evidence: [`Week 1 retention below 30% threshold`],
          },
        });
      }
      
      if (day30Rate > 20 && cohort.definition.source) {
        insights.push({
          cohortId: id,
          insight: `${cohort.definition.source} source shows ${day30Rate.toFixed(1)}% 30-day retention`,
          importance: 'medium' as const,
          category: 'comparison' as const,
          actionRecommended: `Analyze ${cohort.definition.source} acquisition channel for best practices`,
          confidenceScore: 0.75,
          supportingData: {
            metrics: { day30_retention: day30Rate, source: cohort.definition.source },
            evidence: [`Source-specific retention pattern identified`],
          },
        });
      }
    }
    
    // Add general AI insight
    insights.push({
      cohortId: id,
      insight: aiInsights.substring(0, 500), // Take first 500 chars of AI response
      importance: 'medium' as const,
      category: 'behavior' as const,
      actionRecommended: 'Review detailed analysis for strategic decisions',
      confidenceScore: 0.7,
      supportingData: {
        metrics: { userCount: cohort.userCount },
        evidence: keyFindings,
      },
      generatedBy: 'gpt-5',
    });
    
    // Save insights to database
    const savedInsights = await Promise.all(
      insights.map(insight => 
        storage.admin.experiments.createCohortInsight(insertCohortInsightSchema.parse(insight))
      )
    );
    
    res.json({ success: true, insights: savedInsights });
  } catch (error) {
    console.error("Error generating AI insights:", error);
    res.status(500).json({ error: "Failed to generate insights" });
  }
}));

// Get insights for a cohort
router.get("/:id/insights", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, importance, category } = req.query;
  
  const insights = await storage.admin.experiments.getCohortInsights(id, {
    status: status as string | undefined,
    importance: importance as string | undefined,
    category: category as string | undefined,
  });
  
  res.json({ success: true, insights });
}));

// Update insight status
router.patch("/insights/:insightId/status", asyncHandler(async (req, res) => {
  const { insightId } = req.params;
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }
  
  const insight = await storage.admin.experiments.updateCohortInsightStatus(insightId, status);
  
  res.json({ success: true, insight });
}));

// Refresh cohort membership
router.post("/:id/refresh", asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const result = await storage.admin.experiments.refreshCohortMembership(id);
  
  res.json({ success: true, ...result });
}));

// Get cohort members
router.get("/:id/members", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 100, offset = 0 } = req.query;
  
  const result = await storage.admin.experiments.getCohortMembers(
    id,
    Number(limit),
    Number(offset)
  );
  
  res.json({ success: true, ...result });
}));

export default router;