import { Storage } from "./storage";
import { InsertCohort, InsertCohortMetric, InsertCohortInsight } from "@shared/schema";

export async function seedCohorts(storage: Storage) {
  console.log("🎯 Seeding cohort analysis data...");
  
  try {
    // Create January 2025 cohort
    const januaryCohort = await storage.createCohort({
      name: "January 2025 Signups",
      description: "Users who signed up in January 2025",
      definition: {
        signupDateRange: {
          start: "2025-01-01T00:00:00Z",
          end: "2025-01-31T23:59:59Z"
        },
        source: "organic"
      },
      userCount: 150,
      isActive: true,
      createdBy: null
    });
    
    // Create February 2025 cohort
    const februaryCohort = await storage.createCohort({
      name: "February 2025 Signups", 
      description: "Users who signed up in February 2025",
      definition: {
        signupDateRange: {
          start: "2025-02-01T00:00:00Z",
          end: "2025-02-28T23:59:59Z"
        },
        source: "paid_search"
      },
      userCount: 200,
      isActive: true,
      createdBy: null
    });
    
    // Create March 2025 cohort for comparison
    const marchCohort = await storage.createCohort({
      name: "March 2025 Signups",
      description: "Users who signed up in March 2025",
      definition: {
        signupDateRange: {
          start: "2025-03-01T00:00:00Z",
          end: "2025-03-31T23:59:59Z"
        },
        source: "social_media"
      },
      userCount: 175,
      isActive: true,
      createdBy: null
    });
    
    // Add retention metrics for January cohort (showing better retention)
    const januaryMetrics: InsertCohortMetric[] = [
      {
        cohortId: januaryCohort.id,
        metricName: "retention_day_1",
        metricType: "retention",
        period: "day",
        periodDate: "2025-01-02",
        value: 85
      },
      {
        cohortId: januaryCohort.id,
        metricName: "retention_day_7",
        metricType: "retention",
        period: "week",
        periodDate: "2025-01-08",
        value: 72
      },
      {
        cohortId: januaryCohort.id,
        metricName: "retention_day_30",
        metricType: "retention",
        period: "month",
        periodDate: "2025-01-31",
        value: 58
      },
      {
        cohortId: januaryCohort.id,
        metricName: "engagement_score",
        metricType: "engagement",
        period: "month",
        periodDate: "2025-01-31",
        value: 78
      },
      {
        cohortId: januaryCohort.id,
        metricName: "avg_session_time",
        metricType: "behavior",
        period: "month",
        periodDate: "2025-01-31",
        value: 420 // 7 minutes
      },
      {
        cohortId: januaryCohort.id,
        metricName: "conversion_rate",
        metricType: "conversion",
        period: "month",
        periodDate: "2025-01-31",
        value: 12.5
      }
    ];
    
    // Add retention metrics for February cohort (showing lower retention)
    const februaryMetrics: InsertCohortMetric[] = [
      {
        cohortId: februaryCohort.id,
        metricName: "retention_day_1",
        metricType: "retention",
        period: "day",
        periodDate: "2025-02-02",
        value: 65
      },
      {
        cohortId: februaryCohort.id,
        metricName: "retention_day_7",
        metricType: "retention",
        period: "week",
        periodDate: "2025-02-08",
        value: 48
      },
      {
        cohortId: februaryCohort.id,
        metricName: "retention_day_30",
        metricType: "retention",
        period: "month",
        periodDate: "2025-02-28",
        value: 35
      },
      {
        cohortId: februaryCohort.id,
        metricName: "engagement_score",
        metricType: "engagement",
        period: "month",
        periodDate: "2025-02-28",
        value: 52
      },
      {
        cohortId: februaryCohort.id,
        metricName: "avg_session_time",
        metricType: "behavior",
        period: "month",
        periodDate: "2025-02-28",
        value: 240 // 4 minutes
      },
      {
        cohortId: februaryCohort.id,
        metricName: "conversion_rate",
        metricType: "conversion",
        period: "month",
        periodDate: "2025-02-28",
        value: 6.8
      }
    ];
    
    // Add retention metrics for March cohort (moderate retention)
    const marchMetrics: InsertCohortMetric[] = [
      {
        cohortId: marchCohort.id,
        metricName: "retention_day_1",
        metricType: "retention",
        period: "day",
        periodDate: "2025-03-02",
        value: 75
      },
      {
        cohortId: marchCohort.id,
        metricName: "retention_day_7",
        metricType: "retention",
        period: "week",
        periodDate: "2025-03-08",
        value: 60
      },
      {
        cohortId: marchCohort.id,
        metricName: "retention_day_30",
        metricType: "retention",
        period: "month",
        periodDate: "2025-03-31",
        value: 45
      },
      {
        cohortId: marchCohort.id,
        metricName: "engagement_score",
        metricType: "engagement",
        period: "month",
        periodDate: "2025-03-31",
        value: 65
      },
      {
        cohortId: marchCohort.id,
        metricName: "avg_session_time",
        metricType: "behavior",
        period: "month",
        periodDate: "2025-03-31",
        value: 330 // 5.5 minutes
      },
      {
        cohortId: marchCohort.id,
        metricName: "conversion_rate",
        metricType: "conversion",
        period: "month",
        periodDate: "2025-03-31",
        value: 9.2
      }
    ];
    
    // Record all metrics
    await storage.recordCohortMetrics([...januaryMetrics, ...februaryMetrics, ...marchMetrics]);
    
    // Create insights for January cohort
    const januaryInsights: InsertCohortInsight[] = [
      {
        cohortId: januaryCohort.id,
        insight: "January signups show exceptional 50% higher retention than February cohort. The organic acquisition channel appears to attract more engaged users who find genuine value in the product.",
        importance: "high",
        category: "retention",
        status: "active",
        actionRecommended: "Focus marketing efforts on organic channels like SEO and content marketing to replicate January's success",
        confidenceScore: 0.92,
        supportingData: {
          metrics: {
            day7_retention: 72,
            day30_retention: 58,
            engagement_score: 78
          },
          evidence: [
            "72% week-1 retention vs 48% for February",
            "Organic users show 75% longer average session time",
            "Higher engagement scores indicate better product-market fit"
          ]
        }
      },
      {
        cohortId: januaryCohort.id,
        insight: "Users from January cohort demonstrate strong product adoption patterns with 7-minute average sessions, suggesting they're finding value in core features.",
        importance: "medium",
        category: "behavior",
        status: "active",
        actionRecommended: "Interview January users to understand what drove their engagement and document their use cases",
        confidenceScore: 0.85,
        supportingData: {
          metrics: {
            avg_session_time: 420,
            conversion_rate: 12.5
          },
          evidence: [
            "Session times 75% above February cohort",
            "Conversion rate nearly double February's rate"
          ]
        }
      }
    ];
    
    // Create insights for February cohort
    const februaryInsights: InsertCohortInsight[] = [
      {
        cohortId: februaryCohort.id,
        insight: "February cohort shows concerning 35% 30-day retention, indicating potential mismatch between paid ad messaging and actual product value. Early churn risk is critical.",
        importance: "critical",
        category: "risk",
        status: "active",
        actionRecommended: "Immediately review and align paid search ad copy with actual product capabilities. Implement better onboarding for paid acquisition users.",
        confidenceScore: 0.88,
        supportingData: {
          metrics: {
            day1_retention: 65,
            day7_retention: 48,
            day30_retention: 35
          },
          evidence: [
            "20-point drop in Day-1 retention vs January",
            "52% week-over-week churn rate",
            "Paid search users may have different expectations"
          ]
        }
      },
      {
        cohortId: februaryCohort.id,
        insight: "Despite higher acquisition volume (200 users vs 150), February's paid search cohort generates lower overall value due to poor retention and engagement.",
        importance: "high",
        category: "comparison",
        status: "active",
        actionRecommended: "Re-evaluate paid search ROI considering lifetime value, not just acquisition cost. Consider shifting budget to organic channels.",
        confidenceScore: 0.82,
        supportingData: {
          metrics: {
            userCount: 200,
            retention_day_30: 35,
            conversion_rate: 6.8
          },
          evidence: [
            "Only 70 users retained after 30 days despite higher initial numbers",
            "Conversion rate 45% lower than January organic users"
          ]
        }
      }
    ];
    
    // Create insights for March cohort
    const marchInsights: InsertCohortInsight[] = [
      {
        cohortId: marchCohort.id,
        insight: "March's social media acquisition shows moderate performance between January's organic and February's paid search, suggesting potential for optimization.",
        importance: "medium",
        category: "opportunity",
        status: "active",
        actionRecommended: "Test different social media platforms and content types to identify which drive higher-quality users similar to January's organic cohort.",
        confidenceScore: 0.78,
        supportingData: {
          metrics: {
            day7_retention: 60,
            engagement_score: 65,
            conversion_rate: 9.2
          },
          evidence: [
            "25% better retention than paid search",
            "Engagement metrics trending toward organic levels",
            "Room for improvement with targeted content"
          ]
        }
      }
    ];
    
    // Save all insights
    await Promise.all([
      ...januaryInsights.map(insight => storage.createCohortInsight(insight)),
      ...februaryInsights.map(insight => storage.createCohortInsight(insight)),
      ...marchInsights.map(insight => storage.createCohortInsight(insight))
    ]);
    
    console.log("✅ Successfully seeded cohort analysis data:");
    console.log("  - 3 cohorts created (January, February, March 2025)");
    console.log("  - 18 metrics recorded across all cohorts");
    console.log("  - 5 AI-generated insights created");
    console.log("  - Demonstrated 50% higher retention for January vs February");
    
    return {
      cohorts: [januaryCohort, februaryCohort, marchCohort],
      success: true
    };
  } catch (error) {
    console.error("❌ Error seeding cohort data:", error);
    throw error;
  }
}

import { Router } from "express";

// Create endpoint for seeding cohorts
export function createCohortSeedEndpoint(storage: Storage) {
  const router = Router();
  
  router.post("/seed-cohorts", async (req: any, res: any) => {
    try {
      const result = await seedCohorts(storage);
      res.json({
        success: true,
        message: "Cohort analysis data seeded successfully",
        ...result
      });
    } catch (error: any) {
      console.error("Error in seed-cohorts endpoint:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
  
  return router;
}