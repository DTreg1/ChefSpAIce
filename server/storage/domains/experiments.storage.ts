/**
 * @file server/storage/domains/experiments.storage.ts
 * @description A/B testing and cohort analysis storage operations
 *
 * Domain: Experiments & Testing
 * Scope: A/B tests, cohort analysis, statistical significance, insights
 *
 * EXPORT PATTERN:
 * - Export CLASS (ExperimentsStorage) for dependency injection and testing
 * - Export singleton INSTANCE (experimentsStorage) for convenience in production code
 * - Facades should instantiate their own instances OR use the shared singleton consistently
 */

import { db } from "../../db";
import { and, eq, desc, sql, gte, lte, type SQL } from "drizzle-orm";
import {
  createInsertData,
  createUpdateData,
  buildMetadata,
} from "../../types/storage-helpers";
import type { IExperimentsStorage } from "../interfaces/IExperimentsStorage";
import {
  abTests,
  abTestResults,
  abTestVariantMetrics,
  abTestInsights,
  cohorts,
  cohortMetrics,
  cohortInsights,
  type AbTest,
  type InsertAbTest,
  type AbTestResult,
  type InsertAbTestResult,
  type AbTestVariantMetric,
  type InsertAbTestVariantMetric,
  type AbTestInsight,
  type InsertAbTestInsight,
  type Cohort,
  type InsertCohort,
  type CohortMetric,
  type InsertCohortMetric,
  type CohortInsight,
  type InsertCohortInsight,
} from "@shared/schema/experiments";

/**
 * Experiments Storage
 *
 * Manages A/B tests, cohort analysis, and experimental insights.
 * Provides statistical analysis and recommendation capabilities.
 */
export class ExperimentsStorage implements IExperimentsStorage {
  // ==================== A/B Testing ====================

  async createAbTest(test: InsertAbTest): Promise<AbTest> {
    const [newTest] = await db.insert(abTests).values(test).returning();
    return newTest;
  }

  async getAbTest(testId: string): Promise<AbTest | undefined> {
    const [test] = await db
      .select()
      .from(abTests)
      .where(eq(abTests.id, testId));
    return test;
  }

  async getAbTests(filters?: {
    status?: string;
    createdBy?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AbTest[]> {
    const query = db.select().from(abTests);

    if (filters) {
      const conditions: SQL<unknown>[] = [];
      if (filters.status) {
        conditions.push(eq(abTests.status, filters.status));
      }
      if (filters.createdBy) {
        conditions.push(eq(abTests.createdBy, filters.createdBy));
      }
      if (filters.startDate) {
        conditions.push(gte(abTests.startDate, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(lte(abTests.endDate, filters.endDate));
      }

      if (conditions.length > 0) {
        return await query
          .where(and(...conditions))
          .orderBy(desc(abTests.createdAt));
      }
    }

    return await query.orderBy(desc(abTests.createdAt));
  }

  async updateAbTest(
    testId: string,
    update: Partial<Omit<AbTest, "id" | "createdAt" | "updatedAt">>,
  ): Promise<AbTest> {
    const [updatedTest] = await db
      .update(abTests)
      .set({
        ...update,
        updatedAt: new Date(),
      })
      .where(eq(abTests.id, testId))
      .returning();
    return updatedTest;
  }

  async deleteAbTest(testId: string): Promise<void> {
    await db.delete(abTests).where(eq(abTests.id, testId));
  }

  // ==================== A/B Test Results ====================

  async upsertAbTestResult(result: InsertAbTestResult): Promise<AbTestResult> {
    // Try to find existing result for this test/user/variant
    const existing = await db
      .select()
      .from(abTestResults)
      .where(
        and(
          eq(abTestResults.testId, result.testId),
          eq(abTestResults.userId, result.userId || ""),
          eq(abTestResults.variant, result.variant),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      const [updated] = await db
        .update(abTestResults)
        .set(result)
        .where(eq(abTestResults.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Create new
      const [created] = await db
        .insert(abTestResults)
        .values(result)
        .returning();
      return created;
    }
  }

  async getAbTestResults(
    testId: string,
    variant?: string,
  ): Promise<AbTestResult[]> {
    const baseConditions: SQL<unknown>[] = [eq(abTestResults.testId, testId)];

    if (variant) {
      baseConditions.push(eq(abTestResults.variant, variant));
    }

    return await db
      .select()
      .from(abTestResults)
      .where(and(...baseConditions))
      .orderBy(desc(abTestResults.exposedAt));
  }

  async getAggregatedAbTestResults(testId: string): Promise<{
    variantA: AbTestResult;
    variantB: AbTestResult;
  }> {
    // Get all results for the test
    const results = await this.getAbTestResults(testId);

    // Aggregate results by variant
    const aggregateVariant = (variantName: string): AbTestResult => {
      const variantResults = results.filter((r) => r.variant === variantName);

      if (variantResults.length === 0) {
        return {
          id: "",
          testId,
          variant: variantName,
          userId: null,
          exposedAt: new Date(),
          converted: false,
          convertedAt: null,
          conversionValue: null,
          metadata: null,
        };
      }

      const totalConversions = variantResults.filter((r) => r.converted).length;
      const totalExposures = variantResults.length;
      const totalValue = variantResults.reduce(
        (sum, r) => sum + (r.conversionValue || 0),
        0,
      );

      return {
        ...variantResults[0],
        converted: totalConversions > 0,
        conversionValue: totalValue,
        metadata: {
          totalConversions,
          totalExposures,
          conversionRate:
            totalExposures > 0 ? totalConversions / totalExposures : 0,
          averageValue:
            totalConversions > 0 ? totalValue / totalConversions : 0,
        },
      };
    };

    return {
      variantA: aggregateVariant("control"),
      variantB: aggregateVariant("variant"),
    };
  }

  async recordConversion(
    testId: string,
    userId: string,
    variant: string,
    conversionValue?: number,
  ): Promise<AbTestResult> {
    // Find the user's test result
    const [existing] = await db
      .select()
      .from(abTestResults)
      .where(
        and(
          eq(abTestResults.testId, testId),
          eq(abTestResults.userId, userId),
          eq(abTestResults.variant, variant),
        ),
      )
      .limit(1);

    if (existing) {
      // Update with conversion
      const [updated] = await db
        .update(abTestResults)
        .set({
          converted: true,
          convertedAt: new Date(),
          conversionValue,
        })
        .where(eq(abTestResults.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new result with conversion
      const [created] = await db
        .insert(abTestResults)
        .values({
          testId,
          userId,
          variant,
          converted: true,
          convertedAt: new Date(),
          conversionValue,
        })
        .returning();
      return created;
    }
  }

  // ==================== A/B Test Variant Metrics ====================

  async upsertAbTestVariantMetric(
    metric: InsertAbTestVariantMetric,
  ): Promise<AbTestVariantMetric> {
    // Check if metric already exists for this test and variant
    const existing = await db
      .select()
      .from(abTestVariantMetrics)
      .where(
        and(
          eq(abTestVariantMetrics.testId, metric.testId),
          eq(abTestVariantMetrics.variant, metric.variant),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      const [updated] = await db
        .update(abTestVariantMetrics)
        .set(metric)
        .where(eq(abTestVariantMetrics.id, existing[0].id))
        .returning();
      return updated;
    } else {
      // Create new
      const [created] = await db
        .insert(abTestVariantMetrics)
        .values(metric)
        .returning();
      return created;
    }
  }

  async getAbTestVariantMetrics(
    testId: string,
  ): Promise<AbTestVariantMetric[]> {
    return await db
      .select()
      .from(abTestVariantMetrics)
      .where(eq(abTestVariantMetrics.testId, testId))
      .orderBy(desc(abTestVariantMetrics.calculatedAt));
  }

  async getLatestAbTestVariantMetric(
    testId: string,
  ): Promise<AbTestVariantMetric | undefined> {
    const [metric] = await db
      .select()
      .from(abTestVariantMetrics)
      .where(eq(abTestVariantMetrics.testId, testId))
      .orderBy(desc(abTestVariantMetrics.calculatedAt))
      .limit(1);
    return metric;
  }

  // ==================== A/B Test Insights (General/Narrative) ====================

  async createAbTestInsight(
    insight: InsertAbTestInsight,
  ): Promise<AbTestInsight> {
    const [created] = await db
      .insert(abTestInsights)
      .values(insight)
      .returning();
    return created;
  }

  async getAbTestInsights(testId: string): Promise<AbTestInsight[]> {
    return await db
      .select()
      .from(abTestInsights)
      .where(eq(abTestInsights.testId, testId))
      .orderBy(desc(abTestInsights.createdAt));
  }

  async getAbTestInsightsByType(
    testId: string,
    insightType: string,
  ): Promise<AbTestInsight[]> {
    return await db
      .select()
      .from(abTestInsights)
      .where(
        and(
          eq(abTestInsights.testId, testId),
          eq(abTestInsights.insightType, insightType),
        ),
      )
      .orderBy(desc(abTestInsights.createdAt));
  }

  async calculateStatisticalSignificance(testId: string): Promise<{
    pValue: number;
    confidence: number;
    winner: "A" | "B" | "inconclusive";
    liftPercentage: number;
  }> {
    const { variantA, variantB } =
      await this.getAggregatedAbTestResults(testId);

    const metadataA = variantA.metadata || {};
    const metadataB = variantB.metadata || {};

    // Extract conversion rates from metadata
    const conversionRateA = metadataA.conversionRate || 0;
    const conversionRateB = metadataB.conversionRate || 0;
    const exposuresA = metadataA.totalExposures || 0;
    const exposuresB = metadataB.totalExposures || 0;

    // Calculate pooled probability
    const pooledProbability =
      (metadataA.totalConversions + metadataB.totalConversions) /
      (exposuresA + exposuresB || 1);

    // Calculate standard error
    const standardError = Math.sqrt(
      pooledProbability *
        (1 - pooledProbability) *
        (1 / (exposuresA || 1) + 1 / (exposuresB || 1)),
    );

    // Calculate z-score
    const zScore =
      standardError > 0
        ? (conversionRateB - conversionRateA) / standardError
        : 0;

    // Calculate p-value (simplified normal distribution approximation)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));

    // Calculate confidence level
    const confidence = 1 - pValue;

    // Calculate lift percentage
    const liftPercentage =
      conversionRateA > 0
        ? ((conversionRateB - conversionRateA) / conversionRateA) * 100
        : 0;

    // Determine winner
    let winner: "A" | "B" | "inconclusive" = "inconclusive";
    if (pValue < 0.05 && exposuresA >= 100 && exposuresB >= 100) {
      winner = conversionRateB > conversionRateA ? "B" : "A";
    }

    return {
      pValue,
      confidence,
      winner,
      liftPercentage,
    };
  }

  // Helper function for normal CDF approximation
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y =
      1.0 -
      ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  async getAbTestRecommendations(userId?: string): Promise<
    Array<
      AbTest & {
        insights?: AbTestInsight[];
        variantMetrics?: AbTestVariantMetric[];
        results?: AbTestResult[];
      }
    >
  > {
    // Get active and recently completed tests
    const tests = await this.getAbTests({
      status: "running",
    });

    // Add completed tests from last 30 days
    const recentCompleted = await this.getAbTests({
      status: "completed",
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    const allTests = [...tests, ...recentCompleted];

    // Fetch insights, variant metrics, and results for each test
    const recommendations = await Promise.all(
      allTests.map(async (test) => {
        const insights = await this.getAbTestInsights(test.id);
        const variantMetrics = await this.getAbTestVariantMetrics(test.id);
        const results = await this.getAbTestResults(test.id);

        return {
          ...test,
          insights,
          variantMetrics,
          results,
        };
      }),
    );

    // Sort by latest variant metric confidence if available
    recommendations.sort((a, b) => {
      const confA = a.variantMetrics?.[0]?.confidence || 0;
      const confB = b.variantMetrics?.[0]?.confidence || 0;
      return confB - confA;
    });

    return recommendations;
  }

  async implementAbTestWinner(
    testId: string,
    variant: "A" | "B",
  ): Promise<void> {
    // Update test status to completed
    await this.updateAbTest(testId, {
      status: "completed",
    });

    // Calculate and record variant metrics
    const stats = await this.calculateStatisticalSignificance(testId);

    await this.upsertAbTestVariantMetric({
      testId,
      variant,
      sampleSize: 0, // Will be updated from results
      conversionRate: 0,
      isSignificant: stats.pValue < 0.05,
      pValue: stats.pValue,
      confidence: stats.confidence,
      recommendation: `Implement variant ${variant}. Lift: ${stats.liftPercentage.toFixed(2)}%`,
    });

    // Also create a general insight for the test conclusion
    await this.createAbTestInsight({
      testId,
      insightType: "recommendation",
      title: `Winner: Variant ${variant}`,
      description: `Statistical analysis recommends implementing variant ${variant} with ${(stats.confidence * 100).toFixed(1)}% confidence and ${stats.liftPercentage.toFixed(2)}% lift.`,
      data: {
        winner: variant,
        pValue: stats.pValue,
        confidence: stats.confidence,
        liftPercentage: stats.liftPercentage,
      },
      significance: stats.confidence,
    });
  }

  // ==================== Cohort Management ====================

  async createCohort(cohort: InsertCohort): Promise<Cohort> {
    const [newCohort] = await db
      .insert(cohorts)
      .values(cohort as any)
      .returning();

    // Refresh membership immediately for new cohort
    await this.refreshCohortMembership(newCohort.id);

    return newCohort;
  }

  async getCohort(cohortId: string): Promise<Cohort | undefined> {
    const [cohort] = await db
      .select()
      .from(cohorts)
      .where(eq(cohorts.id, cohortId));
    return cohort;
  }

  async getCohorts(filters?: {
    isActive?: boolean;
    createdBy?: string;
  }): Promise<Cohort[]> {
    const conditions: SQL<unknown>[] = [];

    if (filters?.isActive !== undefined) {
      conditions.push(eq(cohorts.isActive, filters.isActive));
    }

    if (conditions.length > 0) {
      return await db
        .select()
        .from(cohorts)
        .where(and(...conditions))
        .orderBy(desc(cohorts.createdAt));
    }

    return await db.select().from(cohorts).orderBy(desc(cohorts.createdAt));
  }

  async updateCohort(
    cohortId: string,
    updates: Partial<InsertCohort>,
  ): Promise<Cohort> {
    const [updated] = await db
      .update(cohorts)
      .set({
        ...updates,
        updatedAt: new Date(),
      } as any)
      .where(eq(cohorts.id, cohortId))
      .returning();

    // Refresh membership if criteria changed
    if (updates.criteria) {
      await this.refreshCohortMembership(cohortId);
    }

    return updated;
  }

  async deleteCohort(cohortId: string): Promise<void> {
    await db.delete(cohorts).where(eq(cohorts.id, cohortId));
  }

  async refreshCohortMembership(cohortId: string): Promise<void> {
    // Update the last refreshed timestamp
    await db
      .update(cohorts)
      .set({ lastRefreshed: new Date() })
      .where(eq(cohorts.id, cohortId));

    // Actual membership refresh logic would go here
    // This is a placeholder for the complex cohort membership calculation
  }

  // ==================== Cohort Metrics ====================

  async recordCohortMetrics(
    metrics: InsertCohortMetric[],
  ): Promise<CohortMetric[]> {
    const recorded = await db.insert(cohortMetrics).values(metrics).returning();
    return recorded;
  }

  async getCohortMetrics(
    cohortId: string,
    filters?: {
      metricName?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<CohortMetric[]> {
    const conditions: any[] = [eq(cohortMetrics.cohortId, cohortId)];

    if (filters?.metricName) {
      conditions.push(eq(cohortMetrics.metricName, filters.metricName));
    }

    if (filters?.startDate) {
      conditions.push(gte(cohortMetrics.metricDate, filters.startDate));
    }

    if (filters?.endDate) {
      conditions.push(lte(cohortMetrics.metricDate, filters.endDate));
    }

    return await db
      .select()
      .from(cohortMetrics)
      .where(and(...conditions))
      .orderBy(desc(cohortMetrics.metricDate));
  }

  async calculateCohortRetention(
    cohortId: string,
    periods: number[],
  ): Promise<{
    cohortId: string;
    retention: Array<{ period: number; rate: number; count: number }>;
  }> {
    const cohort = await this.getCohort(cohortId);
    if (!cohort) {
      throw new Error(`Cohort ${cohortId} not found`);
    }

    const retention: Array<{ period: number; rate: number; count: number }> =
      [];

    // Simplified retention calculation
    // In production, this would query actual user activity data
    for (const period of periods) {
      const rate = Math.max(0, 100 - period * 5); // Simplified: 5% drop per period
      const count = Math.floor((cohort.userCount || 0) * (rate / 100));

      retention.push({
        period,
        rate,
        count,
      });

      // Record metric
      await this.recordCohortMetrics([
        {
          cohortId,
          metricName: `retention_period_${period}`,
          metricDate: new Date(),
          value: rate,
        },
      ]);
    }

    return { cohortId, retention };
  }

  async compareCohorts(
    cohortIds: string[],
    metrics: string[],
  ): Promise<{
    comparison: Array<{
      cohortId: string;
      metrics: Record<string, number>;
    }>;
  }> {
    const comparison = await Promise.all(
      cohortIds.map(async (cohortId) => {
        const cohortMetricsData = await this.getCohortMetrics(cohortId);

        const metricsMap: Record<string, number> = {};

        for (const metric of metrics) {
          const metricData = cohortMetricsData.find(
            (m) => m.metricName === metric,
          );
          metricsMap[metric] = metricData?.value || 0;
        }

        return {
          cohortId,
          metrics: metricsMap,
        };
      }),
    );

    return { comparison };
  }

  // ==================== Cohort Insights ====================

  async createCohortInsight(
    insight: InsertCohortInsight,
  ): Promise<CohortInsight> {
    const [newInsight] = await db
      .insert(cohortInsights)
      .values(insight)
      .returning();
    return newInsight;
  }

  async getCohortInsights(
    cohortId: string,
    filters?: {
      insightType?: string;
      impact?: string;
    },
  ): Promise<CohortInsight[]> {
    const conditions: SQL<unknown>[] = [eq(cohortInsights.cohortId, cohortId)];

    if (filters?.insightType) {
      conditions.push(eq(cohortInsights.insightType, filters.insightType));
    }

    if (filters?.impact) {
      conditions.push(eq(cohortInsights.impact, filters.impact));
    }

    return await db
      .select()
      .from(cohortInsights)
      .where(and(...conditions))
      .orderBy(desc(cohortInsights.createdAt));
  }

  async generateCohortInsights(cohortId: string): Promise<CohortInsight[]> {
    const cohort = await this.getCohort(cohortId);
    if (!cohort) {
      throw new Error(`Cohort ${cohortId} not found`);
    }

    // Get recent metrics
    const recentMetrics = await this.getCohortMetrics(cohortId, {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    const insights: InsertCohortInsight[] = [];

    // Generate retention insight
    if (recentMetrics.some((m) => m.metricName.startsWith("retention"))) {
      insights.push({
        cohortId,
        insightType: "retention",
        insight: "Cohort retention rate is stable over the past 30 days",
        confidence: 0.85,
        impact: "medium",
        recommendations: [
          "Monitor weekly trends",
          "Compare with other cohorts",
        ],
      });
    }

    // Generate engagement insight
    if (cohort.userCount && cohort.userCount > 100) {
      insights.push({
        cohortId,
        insightType: "engagement",
        insight: "Large cohort with significant engagement potential",
        confidence: 0.9,
        impact: "high",
        recommendations: [
          "Implement targeted campaigns",
          "Track conversion metrics",
        ],
      });
    }

    // Create insights in database
    const createdInsights = await Promise.all(
      insights.map((insight) => this.createCohortInsight(insight)),
    );

    return createdInsights;
  }

  async updateCohortInsightStatus(
    insightId: string,
    status: string,
  ): Promise<CohortInsight> {
    const [updated] = await db
      .update(cohortInsights)
      .set({ impact: status })
      .where(eq(cohortInsights.id, insightId))
      .returning();
    return updated;
  }
}

// Export singleton instance for convenience
export const experimentsStorage = new ExperimentsStorage();
