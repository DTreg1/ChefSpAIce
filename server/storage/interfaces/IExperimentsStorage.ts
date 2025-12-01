/**
 * @file server/storage/interfaces/IExperimentsStorage.ts
 * @description Interface for A/B testing and cohort analysis operations
 */

import type {
  AbTest,
  InsertAbTest,
  AbTestResult,
  InsertAbTestResult,
  AbTestVariantMetric,
  InsertAbTestVariantMetric,
  AbTestInsight,
  InsertAbTestInsight,
  Cohort,
  InsertCohort,
  CohortMetric,
  InsertCohortMetric,
  CohortInsight,
  InsertCohortInsight,
} from "@shared/schema/experiments";

export interface IExperimentsStorage {
  // ==================== A/B Testing ====================
  createAbTest(test: InsertAbTest): Promise<AbTest>;
  getAbTest(testId: string): Promise<AbTest | undefined>;
  getAbTests(filters?: {
    status?: string;
    createdBy?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AbTest[]>;
  updateAbTest(
    testId: string,
    update: Partial<Omit<AbTest, "id" | "createdAt" | "updatedAt">>
  ): Promise<AbTest>;
  deleteAbTest(testId: string): Promise<void>;

  // ==================== A/B Test Results ====================
  upsertAbTestResult(result: InsertAbTestResult): Promise<AbTestResult>;
  getAbTestResults(testId: string, variant?: string): Promise<AbTestResult[]>;
  getAggregatedAbTestResults(testId: string): Promise<{
    variantA: AbTestResult;
    variantB: AbTestResult;
  }>;
  recordConversion(
    testId: string,
    userId: string,
    variant: string,
    conversionValue?: number
  ): Promise<AbTestResult>;

  // ==================== A/B Test Variant Metrics ====================
  upsertAbTestVariantMetric(metric: InsertAbTestVariantMetric): Promise<AbTestVariantMetric>;
  getAbTestVariantMetrics(testId: string): Promise<AbTestVariantMetric[]>;
  getLatestAbTestVariantMetric(testId: string): Promise<AbTestVariantMetric | undefined>;

  // ==================== A/B Test Insights (General/Narrative) ====================
  createAbTestInsight(insight: InsertAbTestInsight): Promise<AbTestInsight>;
  getAbTestInsights(testId: string): Promise<AbTestInsight[]>;
  getAbTestInsightsByType(testId: string, insightType: string): Promise<AbTestInsight[]>;
  calculateStatisticalSignificance(testId: string): Promise<{
    pValue: number;
    confidence: number;
    winner: "A" | "B" | "inconclusive";
    liftPercentage: number;
  }>;
  getAbTestRecommendations(userId?: string): Promise<
    Array<
      AbTest & {
        insights?: AbTestInsight[];
        variantMetrics?: AbTestVariantMetric[];
        results?: AbTestResult[];
      }
    >
  >;
  implementAbTestWinner(testId: string, variant: "A" | "B"): Promise<void>;

  // ==================== Cohort Management ====================
  createCohort(cohort: InsertCohort): Promise<Cohort>;
  getCohort(cohortId: string): Promise<Cohort | undefined>;
  getCohorts(filters?: {
    isActive?: boolean;
    createdBy?: string;
  }): Promise<Cohort[]>;
  updateCohort(cohortId: string, updates: Partial<InsertCohort>): Promise<Cohort>;
  deleteCohort(cohortId: string): Promise<void>;
  refreshCohortMembership(cohortId: string): Promise<void>;

  // ==================== Cohort Metrics ====================
  recordCohortMetrics(metrics: InsertCohortMetric[]): Promise<CohortMetric[]>;
  getCohortMetrics(
    cohortId: string,
    filters?: {
      metricName?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<CohortMetric[]>;
  calculateCohortRetention(
    cohortId: string,
    periods: number[]
  ): Promise<{
    cohortId: string;
    retention: Array<{ period: number; rate: number; count: number }>;
  }>;
  compareCohorts(
    cohortIds: string[],
    metrics: string[]
  ): Promise<{
    comparison: Array<{
      cohortId: string;
      metrics: Record<string, number>;
    }>;
  }>;

  // ==================== Cohort Insights ====================
  createCohortInsight(insight: InsertCohortInsight): Promise<CohortInsight>;
  getCohortInsights(
    cohortId: string,
    filters?: {
      insightType?: string;
      impact?: string;
    }
  ): Promise<CohortInsight[]>;
  generateCohortInsights(cohortId: string): Promise<CohortInsight[]>;
  updateCohortInsightStatus(
    insightId: string,
    status: string
  ): Promise<CohortInsight>;
}
