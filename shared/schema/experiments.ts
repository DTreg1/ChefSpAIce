/**
 * A/B Testing & Cohort Analysis Schema
 *
 * Tables for managing experiments, cohort tracking, and feature testing.
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  boolean,
  index,
  jsonb,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./auth";

// ==================== TypeScript Interfaces ====================

/**
 * A/B test configuration
 */
export interface TestConfiguration {
  controlGroup: {
    size: number;
    features: Record<string, any>;
  };
  variants: Array<{
    name: string;
    size: number;
    features: Record<string, any>;
  }>;
  targetingCriteria?: Record<string, any>;
}

/**
 * Cohort definition criteria
 */
export interface CohortCriteria {
  userAttributes?: Record<string, any>;
  behaviorPatterns?: Array<{
    event: string;
    frequency: number;
    timeframe: string;
  }>;
  dateRange?: {
    start: string;
    end: string;
  };
}

// ==================== Tables ====================

/**
 * A/B Tests Table
 *
 * Define and manage A/B testing experiments.
 */
export const abTests = pgTable(
  "ab_tests",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    testName: text("test_name").notNull(),
    description: text("description"),
    hypothesis: text("hypothesis"),
    status: text("status").notNull().default("draft"), // 'draft', 'running', 'paused', 'completed'
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    configuration: jsonb("configuration").$type<TestConfiguration>().notNull(),
    targetSampleSize: integer("target_sample_size"),
    currentSampleSize: integer("current_sample_size").default(0),
    createdBy: varchar("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("ab_tests_status_idx").on(table.status),
    index("ab_tests_start_date_idx").on(table.startDate),
  ],
);

/**
 * A/B Test Results Table
 *
 * Track individual user assignments and outcomes.
 */
export const abTestResults = pgTable(
  "ab_test_results",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    testId: varchar("test_id")
      .notNull()
      .references(() => abTests.id, { onDelete: "cascade" }),
    userId: varchar("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    variant: text("variant").notNull(), // 'control' or variant name
    exposedAt: timestamp("exposed_at").notNull().defaultNow(),
    converted: boolean("converted").notNull().default(false),
    convertedAt: timestamp("converted_at"),
    conversionValue: real("conversion_value"),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
  },
  (table) => [
    index("ab_test_results_test_id_idx").on(table.testId),
    index("ab_test_results_user_id_idx").on(table.userId),
    index("ab_test_results_variant_idx").on(table.variant),
  ],
);

/**
 * A/B Test Variant Metrics Table
 *
 * Statistical analysis per variant (conversion rates, p-values, sample sizes).
 * Used for automated statistical calculations and experiment monitoring.
 */
export const abTestVariantMetrics = pgTable(
  "ab_test_variant_metrics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    testId: varchar("test_id")
      .notNull()
      .references(() => abTests.id, { onDelete: "cascade" }),
    variant: text("variant").notNull(),
    sampleSize: integer("sample_size").notNull(),
    conversionRate: real("conversion_rate").notNull(),
    averageValue: real("average_value"),
    standardDeviation: real("standard_deviation"),
    confidence: real("confidence"), // Statistical confidence 0-1
    pValue: real("p_value"),
    isSignificant: boolean("is_significant").notNull().default(false),
    recommendation: text("recommendation"),
    calculatedAt: timestamp("calculated_at").defaultNow(),
  },
  (table) => [
    index("ab_test_variant_metrics_test_id_idx").on(table.testId),
    index("ab_test_variant_metrics_calculated_at_idx").on(table.calculatedAt),
  ],
);

/**
 * A/B Test Insights Table
 *
 * Human-readable or AI-generated insights and discoveries from tests.
 * Used for curated findings and narrative insights.
 */
export const abTestInsights = pgTable(
  "ab_test_insights",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    testId: text("test_id")
      .notNull()
      .references(() => abTests.id, { onDelete: "cascade" }),
    insightType: text("insight_type").notNull(), // 'performance', 'behavioral', 'recommendation', etc.
    title: text("title").notNull(),
    description: text("description").notNull(),
    data: jsonb("data").$type<Record<string, any>>(),
    significance: real("significance"), // nullable
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("ab_test_insights_test_id_idx").on(table.testId),
    index("ab_test_insights_insight_type_idx").on(table.insightType),
    index("ab_test_insights_created_at_idx").on(table.createdAt),
  ],
);

/**
 * Cohorts Table
 *
 * Define user cohorts for analysis.
 */
export const cohorts = pgTable(
  "cohorts",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    cohortName: text("cohort_name").notNull(),
    description: text("description"),
    criteria: jsonb("criteria").$type<CohortCriteria>().notNull(),
    userCount: integer("user_count").default(0),
    isActive: boolean("is_active").notNull().default(true),
    refreshInterval: text("refresh_interval"), // 'daily', 'weekly', 'monthly'
    lastRefreshed: timestamp("last_refreshed"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("cohorts_is_active_idx").on(table.isActive),
    index("cohorts_created_at_idx").on(table.createdAt),
  ],
);

/**
 * Cohort Metrics Table
 *
 * Track metrics for cohort performance.
 */
export const cohortMetrics = pgTable(
  "cohort_metrics",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    cohortId: varchar("cohort_id")
      .notNull()
      .references(() => cohorts.id, { onDelete: "cascade" }),
    metricDate: timestamp("metric_date").notNull(),
    metricName: text("metric_name").notNull(),
    value: real("value").notNull(),
    previousValue: real("previous_value"),
    changePercent: real("change_percent"),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("cohort_metrics_cohort_id_idx").on(table.cohortId),
    index("cohort_metrics_metric_date_idx").on(table.metricDate),
    index("cohort_metrics_metric_name_idx").on(table.metricName),
  ],
);

/**
 * Cohort Insights Table
 *
 * AI-generated insights about cohort behavior.
 */
export const cohortInsights = pgTable(
  "cohort_insights",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    cohortId: varchar("cohort_id")
      .notNull()
      .references(() => cohorts.id, { onDelete: "cascade" }),
    insightType: text("insight_type").notNull(), // 'retention', 'engagement', 'conversion'
    insight: text("insight").notNull(),
    confidence: real("confidence"), // 0-1
    impact: text("impact"), // 'low', 'medium', 'high'
    recommendations: jsonb("recommendations").$type<string[]>(),
    validUntil: timestamp("valid_until"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("cohort_insights_cohort_id_idx").on(table.cohortId),
    index("cohort_insights_insight_type_idx").on(table.insightType),
    index("cohort_insights_created_at_idx").on(table.createdAt),
  ],
);

// ==================== Zod Schemas & Type Exports ====================

export const testStatusSchema = z.enum([
  "draft",
  "running",
  "paused",
  "completed",
  "cancelled",
]);
export const refreshIntervalSchema = z.enum([
  "hourly",
  "daily",
  "weekly",
  "monthly",
]);
export const cohortInsightTypeSchema = z.enum([
  "retention",
  "engagement",
  "conversion",
  "churn",
  "growth",
]);
export const impactLevelSchema = z.enum(["low", "medium", "high", "critical"]);

export const insertAbTestSchema = createInsertSchema(abTests).extend({
  status: testStatusSchema.default("draft"),
  targetSampleSize: z.number().positive().optional(),
  currentSampleSize: z.number().nonnegative().default(0),
  configuration: z.custom<TestConfiguration>(),
});

export type InsertAbTest = z.infer<typeof insertAbTestSchema>;
export type AbTest = typeof abTests.$inferSelect;

export const insertAbTestResultSchema = createInsertSchema(
  abTestResults,
).extend({
  converted: z.boolean().default(false),
  conversionValue: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

export type InsertAbTestResult = z.infer<typeof insertAbTestResultSchema>;
export type AbTestResult = typeof abTestResults.$inferSelect;

// Variant Metrics schemas and types
export const insertAbTestVariantMetricSchema = createInsertSchema(
  abTestVariantMetrics,
).extend({
  sampleSize: z.number().positive(),
  conversionRate: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1).optional(),
  pValue: z.number().min(0).max(1).optional(),
});

export type InsertAbTestVariantMetric = z.infer<
  typeof insertAbTestVariantMetricSchema
>;
export type AbTestVariantMetric = typeof abTestVariantMetrics.$inferSelect;

// Insight schemas and types
export const abTestInsightTypeSchema = z.enum([
  "performance",
  "behavioral",
  "recommendation",
  "anomaly",
  "trend",
  "summary",
]);

export const insertAbTestInsightSchema = createInsertSchema(
  abTestInsights,
).extend({
  insightType: abTestInsightTypeSchema,
  data: z.record(z.any()).optional(),
  significance: z.number().min(0).max(1).optional(),
});

export type InsertAbTestInsight = z.infer<typeof insertAbTestInsightSchema>;
export type AbTestInsight = typeof abTestInsights.$inferSelect;

export const insertCohortSchema = createInsertSchema(cohorts).extend({
  refreshInterval: refreshIntervalSchema.optional(),
  userCount: z.number().nonnegative().default(0),
});

export type InsertCohort = z.infer<typeof insertCohortSchema>;
export type Cohort = typeof cohorts.$inferSelect;

export const insertCohortMetricSchema = createInsertSchema(
  cohortMetrics,
).extend({
  value: z.number(),
  previousValue: z.number().optional(),
  changePercent: z.number().optional(),
});

export type InsertCohortMetric = z.infer<typeof insertCohortMetricSchema>;
export type CohortMetric = typeof cohortMetrics.$inferSelect;

export const insertCohortInsightSchema = createInsertSchema(
  cohortInsights,
).extend({
  insightType: cohortInsightTypeSchema,
  confidence: z.number().min(0).max(1).optional(),
  impact: impactLevelSchema.optional(),
  recommendations: z.array(z.string()).optional(),
});

export type InsertCohortInsight = z.infer<typeof insertCohortInsightSchema>;
export type CohortInsight = typeof cohortInsights.$inferSelect;

// Backward compatibility aliases
export type AbTestConfiguration = TestConfiguration;
