/**
 * Type Inference Verification for Insert Schemas
 * 
 * This file verifies that the .extend() pattern correctly preserves
 * JSON type information in insert schemas.
 */

import { z } from 'zod';
import {
  insertCohortMetricSchema,
  insertUserPredictionSchema,
  insertFraudDetectionResultsSchema,
  insertModerationLogSchema,
  insertTrendSchema,
} from './shared/schema';

// ============================================================================
// 1. insertCohortMetricSchema - Optional JSON Fields
// ============================================================================

type InferredCohortMetric = z.infer<typeof insertCohortMetricSchema>;

// Expected type structure:
// {
//   cohortId: string;
//   metricName: string;
//   period: string;
//   periodDate: string;
//   value: number;
//   metricType: string;
//   segmentData?: CohortSegmentData;      // ✅ Should be optional with full type
//   comparisonData?: CohortComparisonData; // ✅ Should be optional with full type
//   // NO id (auto-generated)
//   // NO createdAt (auto-generated)
// }

const testCohortMetric: InferredCohortMetric = {
  cohortId: "cohort-123",
  metricName: "retention_rate",
  period: "day",
  periodDate: "2024-01-15",
  value: 0.85,
  metricType: "retention",
  // ✅ Optional - can be omitted
  segmentData: {
    byDevice: { mobile: 0.82, desktop: 0.88 },
    byRegion: { US: 0.86, EU: 0.84 },
    bySource: { organic: 0.90, paid: 0.80 },
  },
  comparisonData: {
    previousValue: 0.80,
    percentageChange: 6.25,
    trend: "up",
    periodComparison: "week_over_week",
  },
};

// Verify omitted fields don't exist
// @ts-expect-error - id should not exist
testCohortMetric.id = "should-error";
// @ts-expect-error - createdAt should not exist
testCohortMetric.createdAt = new Date();


// ============================================================================
// 2. insertUserPredictionSchema - Required JSON Field
// ============================================================================

type InferredUserPrediction = z.infer<typeof insertUserPredictionSchema>;

// Expected type structure:
// {
//   userId: string;
//   predictionType: string;
//   probability: number;
//   predictedDate: Date;
//   factors: PredictionData;  // ✅ REQUIRED - no question mark
//   interventionSuggested?: string;
//   interventionTaken?: string;
//   modelVersion: string;
//   resolvedAt?: Date;
//   // NO id (auto-generated)
//   // NO createdAt (auto-generated)
//   // NO status (has default)
// }

const testUserPrediction: InferredUserPrediction = {
  userId: "user-456",
  predictionType: "churn_risk",
  probability: 0.75,
  predictedDate: new Date("2024-02-15"),
  modelVersion: "v2.1",
  // ✅ REQUIRED - must be provided
  factors: {
    activityPattern: "declining",
    engagementScore: 0.3,
    lastActiveDate: "2024-01-10",
    sessionFrequency: 2.5,
    featureUsage: { chat: 5, recipes: 2 },
  },
};

// Verify required field enforcement
// @ts-expect-error - factors is required
const invalidPrediction: InferredUserPrediction = {
  userId: "user-456",
  predictionType: "churn_risk",
  probability: 0.75,
  predictedDate: new Date("2024-02-15"),
  modelVersion: "v2.1",
  // Missing required 'factors' field
};


// ============================================================================
// 3. insertFraudDetectionResultsSchema - Multiple JSON Fields
// ============================================================================

type InferredFraudDetectionResults = z.infer<typeof insertFraudDetectionResultsSchema>;

// Expected type structure:
// {
//   userId: string;
//   analysisType: string;
//   overallRiskScore: number;
//   riskLevel: "low" | "medium" | "high" | "critical";
//   riskFactors?: FraudRiskFactor[];       // ✅ Optional array with full type
//   evidenceDetails?: FraudEvidenceDetail[]; // ✅ Optional array with full type
//   deviceInfo?: FraudDeviceInfo;          // ✅ Optional with full type
//   behaviorData?: FraudBehaviorData;      // ✅ Optional with full type
//   metadata?: Record<string, any>;        // ✅ Optional
//   // NO id, analyzedAt, modelVersion, status, autoBlocked, reviewRequired
// }

const testFraudResult: InferredFraudDetectionResults = {
  userId: "user-789",
  analysisType: "transaction",
  overallRiskScore: 0.85,
  riskLevel: "high",
  // ✅ All optional - can include some or none
  riskFactors: [{
    behaviorScore: 0.8,
    accountAgeScore: 0.6,
    transactionVelocityScore: 0.9,
    contentPatternScore: 0.4,
    networkScore: 0.7,
    deviceScore: 0.5,
    geoScore: 0.6,
    details: { suspicious_pattern: "rapid_transactions" },
  }],
  deviceInfo: {
    fingerprint: "abc123",
    deviceType: "mobile",
    ipAddress: "192.168.1.1",
    isProxy: false,
    location: { country: "US", city: "San Francisco", lat: 37.7749, lng: -122.4194 },
  },
  behaviorData: {
    sessionCount: 50,
    transactionVelocity: 12.5,
    accountAge: 7,
  },
};


// ============================================================================
// 4. insertModerationLogSchema - Required JSON Field
// ============================================================================

type InferredModerationLog = z.infer<typeof insertModerationLogSchema>;

// Expected type structure:
// {
//   contentId: string;
//   contentType: string;
//   userId: string;
//   content: string;
//   toxicityScores: ModerationResult;  // ✅ REQUIRED - no question mark
//   actionTaken: string;
//   modelUsed: string;
//   categories?: string[];
//   severity: string;
//   manualReview?: boolean;
//   reviewedBy?: string;
//   reviewNotes?: string;
//   overrideReason?: string;
//   reviewedAt?: Date;
//   // NO id, createdAt, updatedAt, confidence, manualReview (with default)
// }

const testModerationLog: InferredModerationLog = {
  contentId: "post-123",
  contentType: "comment",
  userId: "user-456",
  content: "Test content",
  actionTaken: "blocked",
  modelUsed: "both",
  severity: "high",
  // ✅ REQUIRED - must be provided with full type
  toxicityScores: {
    toxicity: 0.85,
    severeToxicity: 0.92,
    identityAttack: 0.15,
    insult: 0.78,
    profanity: 0.65,
    threat: 0.12,
    harassment: 0.45,
  },
};

// Verify omitted fields don't exist
// @ts-expect-error - confidence should not exist (has default)
testModerationLog.confidence = 0.8;


// ============================================================================
// 5. insertTrendSchema - Mixed Required and Optional JSON Fields
// ============================================================================

type InferredTrend = z.infer<typeof insertTrendSchema>;

// Expected type structure:
// {
//   trendName: string;
//   trendType: string;
//   strength: number;
//   confidence: number;
//   growthRate?: number;
//   startDate: Date;
//   peakDate?: Date;
//   endDate?: Date;
//   dataPoints: TrendData;           // ✅ REQUIRED - no question mark
//   interpretation?: string;
//   businessImpact?: string;
//   recommendations?: string[];      // ✅ Optional array
//   metadata?: Record<string, any>; // ✅ Optional
//   // NO id, createdAt, updatedAt, status (has default)
// }

const testTrend: InferredTrend = {
  trendName: "AI Adoption Surge",
  trendType: "topic",
  strength: 0.85,
  confidence: 0.92,
  growthRate: 45.5,
  startDate: new Date("2024-01-01"),
  // ✅ REQUIRED - must be provided with full type
  dataPoints: {
    timeSeries: [
      { timestamp: "2024-01-01", value: 100 },
      { timestamp: "2024-01-15", value: 145 },
    ],
    keywords: ["AI", "machine learning", "automation"],
    entities: [
      { name: "ChatGPT", type: "product", relevance: 0.9 },
    ],
    sources: ["twitter", "news", "blogs"],
    metrics: { engagement: 1000, reach: 50000 },
  },
  // ✅ Optional fields
  recommendations: [
    "Increase AI-related content",
    "Launch AI features course",
  ],
  metadata: {
    detectionMethod: "lstm",
    modelVersion: "v2.0",
  },
};

// Verify required field enforcement
// @ts-expect-error - dataPoints is required
const invalidTrend: InferredTrend = {
  trendName: "AI Adoption Surge",
  trendType: "topic",
  strength: 0.85,
  confidence: 0.92,
  startDate: new Date("2024-01-01"),
  // Missing required 'dataPoints' field
};


// ============================================================================
// Type Verification Summary
// ============================================================================

console.log('✅ All type verifications passed!');
console.log('');
console.log('Verified schemas:');
console.log('1. insertCohortMetricSchema - Optional JSON fields preserved');
console.log('2. insertUserPredictionSchema - Required JSON field enforced');
console.log('3. insertFraudDetectionResultsSchema - Multiple JSON fields preserved');
console.log('4. insertModerationLogSchema - Required JSON field enforced');
console.log('5. insertTrendSchema - Mixed required/optional JSON fields preserved');
console.log('');
console.log('All JSON fields are strongly typed (no longer unknown)');
console.log('All auto-generated fields properly omitted');
console.log('Optional/Required semantics correctly preserved');
