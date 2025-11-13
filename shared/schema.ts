/**
 * Database Schema & TypeScript Types
 * 
 * Defines all database tables and type-safe schemas using Drizzle ORM.
 * Shared between client and server for full-stack type safety.
 * 
 * Core Architecture:
 * - All user data tables foreign-key to users.id for data isolation
 * - Cascading deletes ensure clean data removal when user accounts are deleted
 * - JSONB columns for flexible nested data (nutrition, preferences, metadata)
 * - Comprehensive indexing for query performance
 * - Zod schemas for runtime validation and type inference
 * 
 * Primary Tables:
 * - sessions: Auth session storage (Replit OIDC)
 * - users: Core user accounts with merged preferences
 * - userStorage: User-defined storage locations (fridge, pantry, etc.)
 * - userInventory: Food items in user's possession
 * - userRecipes: User-created and AI-generated recipes
 * - mealPlans: Planned meals by date
 * - userShopping: Shopping list items
 * - userChats: Conversation history with AI assistant
 * 
 * Support Tables:
 * - pushTokens: Device tokens for push notifications
 * - notificationHistory: Delivered notification tracking
 * - userAppliances: Kitchen appliances linked to library
 * - apiUsageLogs: External API call tracking
 * - fdcCache: USDA FoodData Central response cache
 * - userFeedback: User feedback and issue tracking
 * - donations: Stripe payment tracking
 * - webVitals: Core Web Vitals performance metrics
 * - analyticsEvents: User interaction tracking
 * - userSessions: Session analytics
 * 
 * Reference Data:
 * - onboardingInventory: Pre-populated items for quick start
 * - cookingTerms: Interactive cooking knowledge bank
 * - applianceLibrary: Master catalog of appliances/cookware
 * 
 * Type Generation:
 * - Insert types: Created from Zod schemas with validation (e.g., InsertRecipe)
 * - Select types: Inferred from table definitions (e.g., Recipe)
 * - Omitted fields: id, createdAt, updatedAt (auto-generated)
 * 
 * Relationships & Cascading:
 * - users → userInventory: CASCADE (delete inventory when user deleted)
 * - users → userRecipes: CASCADE (delete recipes when user deleted)
 * - users → mealPlans: CASCADE (delete meal plans when user deleted)
 * - users → userShopping: CASCADE (delete shopping items when user deleted)
 * - users → userChats: CASCADE (delete chat history when user deleted)
 * - users → userStorage: CASCADE (delete storage locations when user deleted)
 * - users → pushTokens: CASCADE (delete push tokens when user deleted)
 * - users → notificationHistory: CASCADE (delete notifications when user deleted)
 * - users → userAppliances: CASCADE (delete appliances when user deleted)
 * - users → apiUsageLogs: CASCADE (delete API logs when user deleted)
 * - users → donations: SET NULL (preserve donation records)
 * - users → userFeedback: SET NULL (preserve feedback for analytics)
 * - userRecipes → mealPlans: CASCADE (delete meal plans when recipe deleted)
 * - userRecipes → userShopping: SET NULL (preserve shopping items)
 * - applianceLibrary → userAppliances: SET NULL (preserve appliance if library item removed)
 * - pushTokens → notificationHistory: SET NULL (preserve history if token removed)
 * 
 * Database Indexes:
 * - Primary keys: All tables have UUID or serial primary keys
 * - Foreign keys: Indexed for join performance
 * - Query optimization: Indexes on frequently filtered columns (date, status, userId, etc.)
 * - Unique constraints: email, session tokens, user+name combinations
 * - Composite indexes: user+date lookups, user+token combinations
 * 
 * Migration Strategy:
 * - Use `npm run db:push` to sync schema changes
 * - Use `npm run db:push --force` if data-loss warnings occur
 * - NEVER manually write SQL migrations
 * - Always preserve existing ID column types (serial vs varchar UUID)
 */

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, index, jsonb, real, uniqueIndex, date, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==================== TypeScript Interfaces for JSON Columns ====================

// -------------------- Common/Shared Interfaces --------------------

/**
 * Generic time-series data point
 * Reusable for any time-series data visualization
 */
export interface TimeSeriesPoint {
  /** Date/timestamp in ISO format */
  date: string;
  /** Numeric value for this point */
  value: number;
  /** Optional label or category for this point */
  label?: string;
}

/**
 * Common metadata fields used across multiple entities
 * Provides consistent structure for tags, descriptions, and custom data
 */
export interface MetadataBase {
  /** Description or notes */
  description?: string;
  /** Tags for categorization and filtering */
  tags?: string[];
  /** Custom fields with dynamic keys */
  customFields?: Record<string, any>;
}

/**
 * Confidence or probability score with classification
 * Used for ML models, predictions, and statistical analysis
 */
export interface ConfidenceScore {
  /** Numeric score (typically 0-1) */
  score: number;
  /** Confidence level classification */
  level?: 'low' | 'medium' | 'high' | 'very_high';
  /** Optional threshold that was used */
  threshold?: number;
}

/**
 * Generic segment breakdown structure
 * Provides counts or metrics broken down by segment
 */
export interface SegmentBreakdown<T = number> {
  /** Segment identifier or name */
  segment: string;
  /** Value for this segment (count, percentage, score, etc.) */
  value: T;
  /** Percentage of total (0-100) */
  percentage?: number;
}

// -------------------- Sentiment Analysis Interfaces --------------------

/**
 * Main sentiment analysis data structure
 */
export interface SentimentData {
  /** Overall sentiment score from -1 (very negative) to 1 (very positive) */
  overallScore: number;
  /** Sentiment polarity classification */
  polarity: 'positive' | 'negative' | 'neutral';
  /** Subjectivity score from 0 (objective) to 1 (subjective) */
  subjectivity: number;
  /** Document-level sentiment metrics */
  documentScore?: number;
  /** Aspect-based sentiment scores */
  aspectScores?: Record<string, number>;
}

/**
 * Emotion detection scores
 */
export interface EmotionScores {
  joy?: number;
  sadness?: number;
  anger?: number;
  fear?: number;
  surprise?: number;
  disgust?: number;
  [emotion: string]: number | undefined;
}

/**
 * Key phrase extraction result
 * Represents important phrases identified in analyzed content
 */
export interface KeyPhrase {
  /** The extracted phrase text */
  phrase: string;
  /** Relevance score (0-1, higher = more relevant) */
  relevance: number;
  /** Position in the original text (character offset) */
  position?: number;
  /** Sentiment associated with this phrase */
  sentiment?: 'positive' | 'negative' | 'neutral';
}

/**
 * Contextual factors affecting sentiment analysis
 * Environmental and situational context that influences sentiment interpretation
 */
export interface ContextFactor {
  /** Type of context (e.g., 'temporal', 'cultural', 'situational', 'demographic') */
  type: string;
  /** Description of the context factor */
  description: string;
  /** Impact weight on overall sentiment (0-1) */
  weight: number;
  /** Whether this factor increases or decreases sentiment intensity */
  effect?: 'amplify' | 'dampen' | 'neutral';
}

// -------------------- Content Moderation Interfaces --------------------

/**
 * Content moderation toxicity scores
 * Combines TensorFlow.js and OpenAI moderation scores
 * Maps to moderationLogs.toxicityScores JSONB column
 */
export interface ModerationResult {
  /** General toxicity score (0-1, higher = more toxic) */
  toxicity?: number;
  /** Severe toxicity score (0-1) */
  severeToxicity?: number;
  /** Identity-based attack score (0-1) */
  identityAttack?: number;
  /** Insult score (0-1) */
  insult?: number;
  /** Profanity score (0-1) */
  profanity?: number;
  /** Threat score (0-1) */
  threat?: number;
  /** Sexually explicit content score (0-1) */
  sexuallyExplicit?: number;
  /** Obscene content score (0-1) */
  obscene?: number;
  /** Harassment score (0-1) - OpenAI specific */
  harassment?: number;
  /** Threatening harassment score (0-1) - OpenAI specific */
  harassmentThreatening?: number;
  /** Hate speech score (0-1) - OpenAI specific */
  hate?: number;
  /** Threatening hate speech score (0-1) - OpenAI specific */
  hateThreatening?: number;
  /** Self-harm content score (0-1) - OpenAI specific */
  selfHarm?: number;
  /** Self-harm intent score (0-1) - OpenAI specific */
  selfHarmIntent?: number;
  /** Self-harm instruction score (0-1) - OpenAI specific */
  selfHarmInstruction?: number;
  /** Sexual content score (0-1) - OpenAI specific */
  sexual?: number;
  /** Sexual content involving minors score (0-1) - OpenAI specific */
  sexualMinors?: number;
  /** Violence score (0-1) - OpenAI specific */
  violence?: number;
  /** Graphic violence score (0-1) - OpenAI specific */
  violenceGraphic?: number;
}

/**
 * Specific violation categories detected
 * Used for detailed moderation reporting
 * Array of category strings from moderationLogs.categories
 */
export type ModerationCategory = 
  | 'profanity' 
  | 'harassment' 
  | 'hate_speech' 
  | 'sexual' 
  | 'violence' 
  | 'self_harm' 
  | 'spam' 
  | 'misinformation'
  | 'identity_attack'
  | 'threat';

/**
 * Additional context about blocked content
 * Provides context for moderation decisions
 * Maps to blockedContent.metadata JSONB column
 */
export interface ModerationMetadata {
  /** Original location where content was posted */
  originalLocation?: string;
  /** User IDs of target users (for directed harassment) */
  targetUsers?: string[];
  /** Additional context about the content */
  context?: string;
  /** Number of previous violations by this user */
  previousViolations?: number;
}

// -------------------- Fraud Detection Interfaces --------------------

/**
 * Individual fraud risk factor with score and weight
 * Used to break down overall fraud risk into component factors
 * Maps to fraudScores.factors JSONB column
 */
export interface FraudRiskFactor {
  /** Behavior pattern analysis score (0-1, higher = more suspicious) */
  behaviorScore: number;
  /** Account age risk score (0-1, newer accounts = higher risk) */
  accountAgeScore: number;
  /** Transaction velocity risk score (0-1, rapid transactions = higher risk) */
  transactionVelocityScore: number;
  /** Content pattern analysis score (0-1, spam/bot-like = higher risk) */
  contentPatternScore: number;
  /** Network reputation score (0-1, bad IP/proxy = higher risk) */
  networkScore: number;
  /** Device fingerprint analysis score (0-1, suspicious device = higher risk) */
  deviceScore: number;
  /** Geographic anomaly score (0-1, unusual location = higher risk) */
  geoScore: number;
  /** Additional detailed scoring information */
  details: Record<string, any>;
}

/**
 * Evidence supporting fraud detection
 * Documents suspicious activities and related information
 * Maps to suspiciousActivities.details JSONB column
 */
export interface FraudEvidenceDetail {
  /** Human-readable description of the suspicious activity */
  description: string;
  /** Array of evidence items supporting the fraud detection */
  evidence: string[];
  /** Related activity IDs for correlation */
  relatedActivities?: string[];
  /** IP address of the suspicious activity */
  ipAddress?: string;
  /** User agent string from the request */
  userAgent?: string;
  /** Geographic location information */
  location?: {
    lat: number;
    lng: number;
    country: string;
  };
  /** Additional metadata about the evidence */
  metadata?: Record<string, any>;
}

/**
 * Device fingerprint and network information for fraud detection
 * Tracks device characteristics and network context
 * Maps to fraudDetectionResults.deviceInfo JSONB column
 */
export interface FraudDeviceInfo {
  /** Unique device fingerprint hash */
  fingerprint?: string;
  /** Device type (mobile, desktop, tablet, etc.) */
  deviceType?: string;
  /** Operating system information */
  os?: string;
  /** Browser information */
  browser?: string;
  /** Screen resolution */
  screenResolution?: string;
  /** Timezone offset */
  timezone?: string;
  /** Language preferences */
  language?: string;
  /** IP address */
  ipAddress?: string;
  /** ISP (Internet Service Provider) */
  isp?: string;
  /** VPN/Proxy detection flag */
  isProxy?: boolean;
  /** TOR network detection flag */
  isTor?: boolean;
  /** Geographic location data */
  location?: {
    country?: string;
    region?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };
  /** Additional device metadata */
  metadata?: Record<string, any>;
}

/**
 * User behavior patterns and activity data for fraud analysis
 * Tracks behavioral metrics and activity timelines
 * Maps to fraudDetectionResults.behaviorData JSONB column
 */
export interface FraudBehaviorData {
  /** Session count in the analyzed period */
  sessionCount?: number;
  /** Average session duration (seconds) */
  avgSessionDuration?: number;
  /** Transaction count in the analyzed period */
  transactionCount?: number;
  /** Transaction velocity (transactions per hour) */
  transactionVelocity?: number;
  /** Content posting frequency (posts per hour) */
  postingFrequency?: number;
  /** Failed login attempts */
  failedLoginAttempts?: number;
  /** Account creation date (ISO string) */
  accountCreatedAt?: string;
  /** Days since account creation */
  accountAge?: number;
  /** Activity time distribution (by hour of day) */
  activityTimeDistribution?: Record<string, number>;
  /** Device switching frequency (unique devices used) */
  deviceSwitchCount?: number;
  /** Location switching frequency (unique locations) */
  locationSwitchCount?: number;
  /** Content similarity score (0-1, for spam detection) */
  contentSimilarity?: number;
  /** User interaction patterns */
  interactionPatterns?: {
    clickRate?: number;
    scrollDepth?: number;
    formSubmissionRate?: number;
    timeToFirstAction?: number;
  };
  /** Historical behavior baseline for comparison */
  historicalBaseline?: Record<string, any>;
  /** Additional behavioral metadata */
  metadata?: Record<string, any>;
}

// -------------------- Chat & Communication Interfaces --------------------

/**
 * Message metadata for chat messages
 * Includes function calls, citations, sentiment, and user feedback
 * Maps to messages.metadata JSONB column
 */
export interface ChatMessageMetadata {
  /** Function or tool call made during this message */
  functionCall?: string;
  /** Array of cited sources (URLs, document IDs, etc.) */
  citedSources?: string[];
  /** Sentiment of the message ('positive' | 'negative' | 'neutral') */
  sentiment?: string;
  /** User feedback on the message */
  feedback?: {
    rating: number;
    comment?: string;
  };
}

/**
 * Draft content structure for auto-saved documents
 * Used within autoSaveDrafts table
 */
export interface DraftContent {
  /** The actual text content of the draft */
  content: string;
  /** Hash of content for change detection */
  contentHash?: string;
  /** Version number of this draft */
  version: number;
  /** Document identifier */
  documentId: string;
  /** Type of document being edited */
  documentType: 'chat' | 'recipe' | 'note' | 'meal_plan' | 'shopping_list' | 'other';
}

/**
 * Auto-save editor state and device information
 * Preserves editor context for seamless restoration
 * Maps to autoSaveDrafts.metadata JSONB column
 */
export interface AutoSaveData {
  /** Cursor position in the editor (character offset) */
  cursorPosition?: number;
  /** Scroll position (pixels from top) */
  scrollPosition?: number;
  /** Currently selected text */
  selectedText?: string;
  /** Editor-specific state (Draft.js, ProseMirror, etc.) */
  editorState?: any;
  /** Device information for cross-device sync */
  deviceInfo?: {
    browser?: string;
    os?: string;
    screenSize?: string;
  };
}

/**
 * Typing pattern data for intelligent auto-save
 * Machine learning features for personalized save timing
 * Maps to savePatterns.patternData JSONB column
 */
export interface TypingPatternData {
  /** Histogram of pause durations between keystrokes */
  pauseHistogram?: number[];
  /** Array of keystroke intervals (milliseconds) */
  keystrokeIntervals?: number[];
  /** Array of typing burst lengths (characters per burst) */
  burstLengths?: number[];
  /** Time-of-day preferences for editing sessions */
  timeOfDayPreferences?: Record<string, number>;
  /** Patterns by content type (e.g., code vs prose) */
  contentTypePatterns?: Record<string, any>;
}

// -------------------- Analytics & Insights Interfaces --------------------

/**
 * Analytics insight metric data with trends and comparisons
 * Contains time series data and statistical analysis
 * Maps to analyticsInsights.metricData JSONB column
 */
export interface AnalyticsInsightData {
  /** Current value of the metric */
  currentValue?: number;
  /** Previous period value for comparison */
  previousValue?: number;
  /** Percentage change from previous period */
  percentageChange?: number;
  /** Time series data points for visualization */
  dataPoints?: TimeSeriesPoint[];
  /** Average value over the period */
  average?: number;
  /** Minimum value in the period */
  min?: number;
  /** Maximum value in the period */
  max?: number;
  /** Trend direction */
  trend?: 'up' | 'down' | 'stable';
}

/**
 * User behavior prediction data and features
 * Machine learning features for churn prediction, engagement, etc.
 * Maps to userPredictions.factors JSONB column
 */
export interface PredictionData {
  /** User's activity pattern classification */
  activityPattern?: string;
  /** Engagement score (0-1 or 0-100) */
  engagementScore?: number;
  /** Last time user was active (ISO date string) */
  lastActiveDate?: string;
  /** Feature usage statistics by feature name */
  featureUsage?: Record<string, number>;
  /** Session frequency (sessions per time period) */
  sessionFrequency?: number;
  /** Content interaction metrics */
  contentInteraction?: Record<string, any>;
  /** Historical behavior patterns for comparison */
  historicalBehavior?: any[];
}

/**
 * Trend detection data with time series and entities
 * Comprehensive trend analysis including keywords, entities, and sentiment
 * Maps to trends.dataPoints JSONB column
 */
export interface TrendData {
  /** Time series data for trend visualization */
  timeSeries?: TimeSeriesPoint[];
  /** Keywords associated with the trend */
  keywords?: string[];
  /** Named entities extracted from trend data */
  entities?: Array<{ 
    name: string; 
    type: string; 
    relevance: number; 
  }>;
  /** Data sources contributing to the trend */
  sources?: string[];
  /** Additional metrics related to the trend */
  metrics?: Record<string, any>;
  /** Volume data over time */
  volumeData?: Array<{ 
    date: string; 
    count: number; 
  }>;
  /** Sentiment distribution over time */
  sentimentData?: Array<{ 
    date: string; 
    positive: number; 
    negative: number; 
    neutral: number; 
  }>;
}

// -------------------- A/B Testing Interfaces --------------------

/**
 * A/B test configuration and metadata
 * Defines test setup, hypothesis, and requirements
 * Maps to abTests.metadata JSONB column
 */
export interface AbTestConfiguration extends Partial<MetadataBase> {
  /** Hypothesis being tested (e.g., "Blue button increases conversions by 15%") */
  hypothesis?: string;
  /** Feature area being tested (e.g., "checkout", "onboarding", "pricing") */
  featureArea?: string;
  /** Minimum sample size required for statistical validity */
  minimumSampleSize?: number;
  /** Confidence level threshold (typically 0.95 for 95% confidence) */
  confidenceLevel?: number;
  /** Type of A/B test being conducted */
  testType?: 'split' | 'multivariate' | 'redirect';
}

/**
 * Performance metrics for A/B test variants
 * Includes segment breakdowns and custom metrics
 * Maps to abTestResults.metadata JSONB column
 */
export interface AbTestMetrics {
  /** Metrics broken down by device type (e.g., {mobile: 150, desktop: 320}) */
  deviceBreakdown?: Record<string, number>;
  /** Metrics broken down by geographic location (e.g., {US: 250, UK: 120}) */
  geoBreakdown?: Record<string, number>;
  /** Metrics broken down by referrer source (e.g., {google: 200, direct: 150}) */
  referrerBreakdown?: Record<string, number>;
  /** Custom metrics specific to the test (e.g., {time_to_action: 45.2}) */
  customMetrics?: Record<string, number>;
  /** Segment-level results for deeper analysis */
  segments?: Record<string, any>;
}

/**
 * AI-generated analysis and insights for A/B test
 * Provides actionable recommendations based on results
 * Maps to abTestInsights.insights JSONB column
 */
export interface AbTestInsights {
  /** Key findings from the test (e.g., ["Variant B increased conversions by 23%"]) */
  keyFindings?: string[];
  /** Insights broken down by user segments */
  segmentInsights?: Record<string, string>;
  /** Best practices and recommendations for implementation */
  bestPractices?: string[];
  /** Suggested next steps based on test outcome */
  nextSteps?: string[];
  /** Warnings or caveats about the results */
  warnings?: string[];
  /** Lessons learned that can inform future tests */
  learnings?: string[];
}

/**
 * Statistical analysis data for A/B test
 * Contains detailed statistical calculations and metrics
 * Maps to abTestInsights.statisticalAnalysis JSONB column
 */
export interface AbTestStatisticalAnalysis {
  /** Sample size for variant A (control) */
  sampleSizeA?: number;
  /** Sample size for variant B (treatment) */
  sampleSizeB?: number;
  /** Conversion rate for variant A (0-1) */
  conversionRateA?: number;
  /** Conversion rate for variant B (0-1) */
  conversionRateB?: number;
  /** Standard error for variant A */
  standardErrorA?: number;
  /** Standard error for variant B */
  standardErrorB?: number;
  /** Z-score for significance testing */
  zScore?: number;
  /** Confidence interval for the difference */
  confidenceInterval?: {
    lower: number;
    upper: number;
  };
  /** Minimum detectable effect size */
  minimumDetectableEffect?: number;
  /** Statistical power of the test (0-1) */
  power?: number;
}

/**
 * Segment-level test results
 * Provides granular breakdown of performance by different user segments
 * Used within AbTestMetrics.segments
 */
export interface AbTestSegmentResults {
  /** Segment name or identifier */
  segmentName: string;
  /** Number of users in this segment */
  userCount: number;
  /** Conversion rate for this segment (0-1) */
  conversionRate: number;
  /** Statistical significance for this segment (0-1) */
  significance?: number;
  /** Percentage of total traffic in this segment (0-100) */
  trafficPercentage?: number;
  /** Revenue generated by this segment */
  revenue?: number;
  /** Engagement score for this segment */
  engagementScore?: number;
  /** Additional segment-specific metrics */
  customMetrics?: Record<string, number>;
}

/**
 * Helper type for common segment breakdown pattern
 * Maps segment names to their values
 */
export type SegmentBreakdownMap<T = number> = Record<string, T>;

// -------------------- Cohort Analysis Interfaces --------------------

/**
 * Cohort definition criteria
 * Defines how users are grouped into a cohort
 * Maps to cohorts.definition JSONB column
 */
export interface CohortDefinition {
  /** Date range for user signup filtering */
  signupDateRange?: {
    start: string;
    end: string;
  };
  /** User attribute filters (e.g., plan type, location, source) */
  userAttributes?: Record<string, any>;
  /** Behavioral patterns and criteria for cohort membership */
  behaviorCriteria?: {
    /** List of required events (e.g., ['login', 'purchase', 'share']) */
    events?: string[];
    /** Minimum number of sessions required */
    minSessionCount?: number;
    /** Minimum engagement score threshold */
    minEngagementScore?: number;
    /** Custom metrics for advanced filtering */
    customMetrics?: Record<string, any>;
  };
  /** Custom SQL conditions for complex filtering */
  customQueries?: string[];
  /** Acquisition source (e.g., 'product_hunt', 'organic', 'paid_ads') */
  source?: string;
}

/**
 * Descriptive metadata about the cohort
 * Provides context and visualization hints
 * Maps to cohorts.metadata JSONB column
 */
export interface CohortMetadata extends MetadataBase {
  /** Hex color code for UI visualization (e.g., '#4F46E5') */
  color?: string;
  /** Icon identifier for UI display */
  icon?: string;
  /** Business context explaining why this cohort matters */
  businessContext?: string;
  /** Hypothesis being tested with this cohort */
  hypothesis?: string;
}

/**
 * Period-over-period comparison metrics
 * Tracks changes in cohort metrics over time
 * Maps to cohortMetrics.comparisonData JSONB column
 */
export interface CohortComparisonData {
  /** Metric value from the previous period */
  previousPeriod?: number;
  /** Percentage change from previous period (-100 to +100+) */
  percentageChange?: number;
  /** Trend direction classification */
  trend?: 'increasing' | 'decreasing' | 'stable';
  /** Statistical significance score (0-1, higher = more significant) */
  significance?: number;
}

/**
 * Segment breakdown with user counts and percentages
 * Provides granular analysis of cohort composition
 * Maps to cohortMetrics.segmentData JSONB column
 */
export interface CohortSegmentData {
  /** Breakdown by device type (e.g., {mobile: 150, desktop: 320, tablet: 30}) */
  byDevice?: Record<string, number>;
  /** Breakdown by acquisition source (e.g., {organic: 200, paid: 150, referral: 150}) */
  bySource?: Record<string, number>;
  /** Breakdown by feature usage (e.g., {feature_a: 350, feature_b: 200}) */
  byFeature?: Record<string, number>;
  /** Breakdown by user attribute (e.g., {premium: 100, free: 400}) */
  byUserAttribute?: Record<string, number>;
  /** Custom segment breakdowns with dynamic keys */
  custom?: Record<string, any>;
}

// -------------------- Predictive Maintenance Interfaces --------------------

/**
 * System metric metadata and context
 * Additional information about system performance metrics
 * Maps to systemMetrics.metadata JSONB column
 */
export interface MaintenanceMetrics extends Partial<MetadataBase> {
  /** Unit of measurement for the metric (ms, %, MB, etc.) */
  unit?: string;
  /** Source system or component that generated the metric */
  source?: string;
  /** Additional context about the metric */
  context?: Record<string, any>;
}

/**
 * Predictive maintenance features and patterns
 * Machine learning features for failure prediction
 * Maps to maintenancePredictions.features JSONB column
 */
export interface MaintenanceFeatures {
  /** Trend slope indicating degradation rate */
  trendSlope?: number;
  /** Seasonality patterns (day-of-week, time-of-day) */
  seasonality?: Record<string, number>;
  /** Number of recent anomalies detected */
  recentAnomalies?: number;
  /** Historical pattern data for comparison */
  historicalPatterns?: any[];
}

/**
 * Maintenance performance comparison metrics
 * Before/after metrics for evaluating maintenance impact
 * Maps to maintenanceHistory.performanceMetrics JSONB column
 */
export interface MaintenancePerformanceMetrics {
  /** Performance metrics before maintenance */
  before?: Record<string, number>;
  /** Performance metrics after maintenance */
  after?: Record<string, number>;
  /** Percentage improvement from maintenance */
  improvement?: number;
}

/**
 * Maintenance cost breakdown
 * Tracks the full cost of maintenance activities
 * Maps to maintenanceHistory.cost JSONB column
 */
export interface MaintenanceCost {
  /** Labor hours spent on maintenance */
  laborHours?: number;
  /** Direct resource costs (parts, licenses, etc.) */
  resourceCost?: number;
  /** Opportunity cost from downtime */
  opportunityCost?: number;
}

// ==================== End of TypeScript Interfaces ====================

// ==================== Zod Validation Schemas for JSON Columns ====================

// -------------------- Common/Shared Schemas --------------------

/**
 * Zod schema for TimeSeriesPoint interface
 * Reusable schema for any time-series data visualization
 */
export const timeSeriesPointSchema = z.object({
  date: z.string().describe("Date/timestamp in ISO format"),
  value: z.number().describe("Numeric value for this point"),
  label: z.string().optional().describe("Optional label or category for this point"),
});

/**
 * Zod schema for MetadataBase interface
 * Provides consistent structure for tags, descriptions, and custom data
 */
export const metadataBaseSchema = z.object({
  description: z.string().optional().describe("Description or notes"),
  tags: z.array(z.string()).optional().describe("Tags for categorization and filtering"),
  customFields: z.record(z.string(), z.any()).optional().describe("Custom fields with dynamic keys"),
});

/**
 * Zod schema for ConfidenceScore interface
 * Used for ML models, predictions, and statistical analysis
 */
export const confidenceScoreSchema = z.object({
  score: z.number().describe("Numeric score (typically 0-1)"),
  level: z.enum(['low', 'medium', 'high', 'very_high']).optional().describe("Confidence level classification"),
  threshold: z.number().optional().describe("Optional threshold that was used"),
});

/**
 * Zod schema for SegmentBreakdown interface
 * Generic segment breakdown structure with counts or metrics by segment
 */
export const segmentBreakdownSchema = z.object({
  segment: z.string().describe("Segment identifier or name"),
  value: z.number().describe("Value for this segment (count, percentage, score, etc.)"),
  percentage: z.number().min(0).max(100).optional().describe("Percentage of total (0-100)"),
});

/**
 * SCHEMA COMPOSITION EXAMPLES
 * 
 * The common schemas above can be composed into larger schemas using:
 * - .extend() - Adds new fields to an existing schema
 * - .merge() - Combines two schemas together
 * 
 * Example 1: Using .extend() to add fields to metadataBaseSchema
 * 
 *   export const customMetadataSchema = metadataBaseSchema.extend({
 *     color: z.string().optional(),
 *     icon: z.string().optional(),
 *   });
 * 
 * Example 2: Using .merge() to combine schemas
 * 
 *   const baseSchema = z.object({
 *     id: z.string(),
 *     createdAt: z.string(),
 *   });
 * 
 *   export const enrichedSchema = baseSchema.merge(metadataBaseSchema);
 *   // Result: { id, createdAt, description?, tags?, customFields? }
 * 
 * Example 3: Using timeSeriesPointSchema in arrays
 * 
 *   export const chartDataSchema = z.object({
 *     title: z.string(),
 *     data: z.array(timeSeriesPointSchema),
 *   });
 * 
 * Example 4: Combining confidence scores with results
 * 
 *   export const aiPredictionSchema = z.object({
 *     prediction: z.string(),
 *     confidence: confidenceScoreSchema,
 *   });
 * 
 * Real examples in this file:
 * - abTestConfigurationSchema uses metadataBaseSchema.extend()
 * - cohortMetadataSchema uses metadataBaseSchema.extend()
 * - maintenanceMetricsSchema uses metadataBaseSchema.extend()
 * - analyticsInsightDataSchema uses z.array(timeSeriesPointSchema)
 * - trendDataSchema uses z.array(timeSeriesPointSchema)
 */

// -------------------- Sentiment Analysis Schemas --------------------

/**
 * Zod schema for SentimentData interface
 * Validates main sentiment analysis data structure
 */
export const sentimentDataSchema = z.object({
  overallScore: z.number().min(-1).max(1).describe("Overall sentiment score from -1 (very negative) to 1 (very positive)"),
  polarity: z.enum(['positive', 'negative', 'neutral']).describe("Sentiment polarity classification"),
  subjectivity: z.number().min(0).max(1).describe("Subjectivity score from 0 (objective) to 1 (subjective)"),
  documentScore: z.number().optional().describe("Document-level sentiment metrics"),
  aspectScores: z.record(z.string(), z.number()).optional().describe("Aspect-based sentiment scores"),
});

/**
 * Zod schema for EmotionScores interface
 * Validates emotion detection scores
 */
export const emotionScoresSchema = z.object({
  joy: z.number().optional(),
  sadness: z.number().optional(),
  anger: z.number().optional(),
  fear: z.number().optional(),
  surprise: z.number().optional(),
  disgust: z.number().optional(),
}).catchall(z.number()).describe("Emotion detection scores with optional custom emotions");

/**
 * Zod schema for KeyPhrase interface
 * Validates key phrase extraction results
 */
export const keyPhraseSchema = z.object({
  phrase: z.string().describe("The extracted phrase text"),
  relevance: z.number().min(0).max(1).describe("Relevance score (0-1, higher = more relevant)"),
  position: z.number().int().nonnegative().optional().describe("Position in the original text (character offset)"),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional().describe("Sentiment associated with this phrase"),
});

/**
 * Zod schema for ContextFactor interface
 * Validates contextual factors affecting sentiment analysis
 */
export const contextFactorSchema = z.object({
  type: z.string().describe("Type of context (e.g., 'temporal', 'cultural', 'situational', 'demographic')"),
  description: z.string().describe("Description of the context factor"),
  weight: z.number().min(0).max(1).describe("Impact weight on overall sentiment (0-1)"),
  effect: z.enum(['amplify', 'dampen', 'neutral']).optional().describe("Whether this factor increases or decreases sentiment intensity"),
});

// -------------------- Content Moderation Schemas --------------------

/**
 * Zod schema for ModerationResult interface
 * Validates content moderation toxicity scores from TensorFlow.js and OpenAI
 */
export const moderationResultSchema = z.object({
  toxicity: z.number().min(0).max(1).optional().describe("General toxicity score (0-1, higher = more toxic)"),
  severeToxicity: z.number().min(0).max(1).optional().describe("Severe toxicity score (0-1)"),
  identityAttack: z.number().min(0).max(1).optional().describe("Identity-based attack score (0-1)"),
  insult: z.number().min(0).max(1).optional().describe("Insult score (0-1)"),
  profanity: z.number().min(0).max(1).optional().describe("Profanity score (0-1)"),
  threat: z.number().min(0).max(1).optional().describe("Threat score (0-1)"),
  sexuallyExplicit: z.number().min(0).max(1).optional().describe("Sexually explicit content score (0-1)"),
  obscene: z.number().min(0).max(1).optional().describe("Obscene content score (0-1)"),
  harassment: z.number().min(0).max(1).optional().describe("Harassment score (0-1) - OpenAI specific"),
  harassmentThreatening: z.number().min(0).max(1).optional().describe("Threatening harassment score (0-1) - OpenAI specific"),
  hate: z.number().min(0).max(1).optional().describe("Hate speech score (0-1) - OpenAI specific"),
  hateThreatening: z.number().min(0).max(1).optional().describe("Threatening hate speech score (0-1) - OpenAI specific"),
  selfHarm: z.number().min(0).max(1).optional().describe("Self-harm content score (0-1) - OpenAI specific"),
  selfHarmIntent: z.number().min(0).max(1).optional().describe("Self-harm intent score (0-1) - OpenAI specific"),
  selfHarmInstruction: z.number().min(0).max(1).optional().describe("Self-harm instruction score (0-1) - OpenAI specific"),
  sexual: z.number().min(0).max(1).optional().describe("Sexual content score (0-1) - OpenAI specific"),
  sexualMinors: z.number().min(0).max(1).optional().describe("Sexual content involving minors score (0-1) - OpenAI specific"),
  violence: z.number().min(0).max(1).optional().describe("Violence score (0-1) - OpenAI specific"),
  violenceGraphic: z.number().min(0).max(1).optional().describe("Graphic violence score (0-1) - OpenAI specific"),
});

/**
 * Zod schema for ModerationCategory type
 * Validates specific violation categories detected
 */
export const moderationCategorySchema = z.enum([
  'profanity',
  'harassment',
  'hate_speech',
  'sexual',
  'violence',
  'self_harm',
  'spam',
  'misinformation',
  'identity_attack',
  'threat',
]).describe("Specific violation category detected");

/**
 * Zod schema for ModerationMetadata interface
 * Validates additional context about blocked content
 */
export const moderationMetadataSchema = z.object({
  originalLocation: z.string().optional().describe("Original location where content was posted"),
  targetUsers: z.array(z.string()).optional().describe("User IDs of target users (for directed harassment)"),
  context: z.string().optional().describe("Additional context about the content"),
  previousViolations: z.number().int().nonnegative().optional().describe("Number of previous violations by this user"),
});

// -------------------- Fraud Detection Schemas --------------------

/**
 * Zod schema for FraudRiskFactor interface
 * Validates individual fraud risk factors with scores and weights
 */
export const fraudRiskFactorSchema = z.object({
  behaviorScore: z.number().min(0).max(1).describe("Behavior pattern analysis score (0-1, higher = more suspicious)"),
  accountAgeScore: z.number().min(0).max(1).describe("Account age risk score (0-1, newer accounts = higher risk)"),
  transactionVelocityScore: z.number().min(0).max(1).describe("Transaction velocity risk score (0-1, rapid transactions = higher risk)"),
  contentPatternScore: z.number().min(0).max(1).describe("Content pattern analysis score (0-1, spam/bot-like = higher risk)"),
  networkScore: z.number().min(0).max(1).describe("Network reputation score (0-1, bad IP/proxy = higher risk)"),
  deviceScore: z.number().min(0).max(1).describe("Device fingerprint analysis score (0-1, suspicious device = higher risk)"),
  geoScore: z.number().min(0).max(1).describe("Geographic anomaly score (0-1, unusual location = higher risk)"),
  details: z.record(z.string(), z.any()).describe("Additional detailed scoring information"),
});

/**
 * Zod schema for FraudEvidenceDetail interface
 * Validates evidence supporting fraud detection
 */
export const fraudEvidenceDetailSchema = z.object({
  description: z.string().describe("Human-readable description of the suspicious activity"),
  evidence: z.array(z.string()).describe("Array of evidence items supporting the fraud detection"),
  relatedActivities: z.array(z.string()).optional().describe("Related activity IDs for correlation"),
  ipAddress: z.string().optional().describe("IP address of the suspicious activity"),
  userAgent: z.string().optional().describe("User agent string from the request"),
  location: z.object({
    lat: z.number().describe("Latitude coordinate"),
    lng: z.number().describe("Longitude coordinate"),
    country: z.string().describe("Country code or name"),
  }).optional().describe("Geographic location information"),
  metadata: z.record(z.string(), z.any()).optional().describe("Additional metadata about the evidence"),
});

/**
 * Zod schema for FraudDeviceInfo interface
 * Validates device fingerprint and network information for fraud detection
 */
export const fraudDeviceInfoSchema = z.object({
  fingerprint: z.string().optional().describe("Unique device fingerprint hash"),
  deviceType: z.string().optional().describe("Device type (mobile, desktop, tablet, etc.)"),
  os: z.string().optional().describe("Operating system information"),
  browser: z.string().optional().describe("Browser information"),
  screenResolution: z.string().optional().describe("Screen resolution"),
  timezone: z.string().optional().describe("Timezone offset"),
  language: z.string().optional().describe("Language preferences"),
  ipAddress: z.string().optional().describe("IP address"),
  isp: z.string().optional().describe("ISP (Internet Service Provider)"),
  isProxy: z.boolean().optional().describe("VPN/Proxy detection flag"),
  isTor: z.boolean().optional().describe("TOR network detection flag"),
  location: z.object({
    country: z.string().optional().describe("Country name or code"),
    region: z.string().optional().describe("Region or state"),
    city: z.string().optional().describe("City name"),
    lat: z.number().optional().describe("Latitude coordinate"),
    lng: z.number().optional().describe("Longitude coordinate"),
  }).passthrough().optional().describe("Geographic location data"),
  metadata: z.record(z.string(), z.any()).optional().describe("Additional device metadata"),
}).passthrough();

/**
 * Zod schema for FraudBehaviorData interface
 * Validates user behavior patterns and activity data for fraud analysis
 */
export const fraudBehaviorDataSchema = z.object({
  sessionCount: z.number().int().nonnegative().optional().describe("Session count in the analyzed period"),
  avgSessionDuration: z.number().nonnegative().optional().describe("Average session duration in seconds"),
  transactionCount: z.number().int().nonnegative().optional().describe("Transaction count in the analyzed period"),
  transactionVelocity: z.number().nonnegative().optional().describe("Transaction velocity (transactions per hour)"),
  postingFrequency: z.number().nonnegative().optional().describe("Content posting frequency (posts per hour)"),
  failedLoginAttempts: z.number().int().nonnegative().optional().describe("Failed login attempts"),
  accountCreatedAt: z.string().optional().describe("Account creation date (ISO string)"),
  accountAge: z.number().int().nonnegative().optional().describe("Days since account creation"),
  activityTimeDistribution: z.record(z.string(), z.number()).optional().describe("Activity time distribution (by hour of day)"),
  deviceSwitchCount: z.number().int().nonnegative().optional().describe("Device switching frequency (unique devices used)"),
  locationSwitchCount: z.number().int().nonnegative().optional().describe("Location switching frequency (unique locations)"),
  contentSimilarity: z.number().min(0).max(1).optional().describe("Content similarity score (0-1, for spam detection)"),
  interactionPatterns: z.object({
    clickRate: z.number().optional().describe("Click rate metric"),
    scrollDepth: z.number().optional().describe("Scroll depth metric"),
    formSubmissionRate: z.number().optional().describe("Form submission rate"),
    timeToFirstAction: z.number().optional().describe("Time to first action in seconds"),
  }).optional().describe("User interaction patterns"),
  historicalBaseline: z.record(z.string(), z.any()).optional().describe("Historical behavior baseline for comparison"),
  metadata: z.record(z.string(), z.any()).optional().describe("Additional behavioral metadata"),
});

// -------------------- Sentiment Metrics & Alerts Schemas --------------------

/**
 * Zod schema for sentiment metrics categories
 * Validates category breakdown with sentiment scores and issues
 */
export const sentimentCategorySchema = z.object({
  sentiment: z.number(),
  count: z.number().int().nonnegative(),
  issues: z.array(z.string()),
});

/**
 * Zod schema for pain points
 * Validates pain point data with impact and frequency
 */
export const painPointSchema = z.object({
  category: z.string(),
  issue: z.string(),
  impact: z.number(),
  frequency: z.number(),
});

/**
 * Zod schema for sentiment alert metadata
 * Validates alert-specific metadata
 */
export const sentimentAlertMetadataSchema = z.object({
  previousValue: z.number().optional(),
  percentageChange: z.number().optional(),
  affectedUsers: z.number().int().nonnegative().optional(),
  relatedIssues: z.array(z.string()).optional(),
  suggestedActions: z.array(z.string()).optional(),
});

/**
 * Zod schema for top issues/praises in sentiment segments
 * Validates issue or praise data with counts and sentiment
 */
export const sentimentIssueSchema = z.object({
  issue: z.string(),
  count: z.number().int().nonnegative(),
  sentiment: z.number(),
});

export const sentimentPraiseSchema = z.object({
  praise: z.string(),
  count: z.number().int().nonnegative(),
  sentiment: z.number(),
});

// -------------------- Notification Schemas --------------------

/**
 * Zod schema for notification types configuration
 * Validates notification preferences by type
 */
export const notificationTypesSchema = z.object({
  expiringFood: z.object({
    enabled: z.boolean(),
    weight: z.number(),
    urgencyThreshold: z.number(),
  }),
  recipeSuggestions: z.object({
    enabled: z.boolean(),
    weight: z.number(),
    maxPerDay: z.number(),
  }),
  mealReminders: z.object({
    enabled: z.boolean(),
    weight: z.number(),
    leadTime: z.number(),
  }),
  shoppingReminders: z.object({
    enabled: z.boolean(),
    weight: z.number(),
  }),
  nutritionInsights: z.object({
    enabled: z.boolean(),
    weight: z.number(),
    frequency: z.string(),
  }),
  systemUpdates: z.object({
    enabled: z.boolean(),
    weight: z.number(),
  }),
});

/**
 * Zod schema for quiet hours configuration
 * Validates quiet hours periods when notifications are suppressed
 */
export const quietHoursSchema = z.object({
  enabled: z.boolean(),
  periods: z.array(z.object({
    start: z.string().describe("Start time (HH:mm format)"),
    end: z.string().describe("End time (HH:mm format)"),
    days: z.array(z.number()).describe("Days of week (0=Sunday, 6=Saturday)"),
  })),
});

/**
 * Zod schema for notification features used in ML scoring
 * Validates feature data for notification relevance scoring
 */
export const notificationFeaturesSchema = z.object({
  dayOfWeek: z.number(),
  hourOfDay: z.number(),
  timeSinceLastOpen: z.number(),
  recentEngagementRate: z.number(),
  notificationType: z.string(),
  contentLength: z.number(),
  hasActionItems: z.boolean(),
  userContext: z.any(),
});

/**
 * Zod schema for push token device info
 * Validates device metadata for push notifications
 */
export const pushTokenDeviceInfoSchema = z.object({
  deviceId: z.string().optional(),
  deviceModel: z.string().optional(),
  osVersion: z.string().optional(),
  appVersion: z.string().optional(),
}).passthrough();

/**
 * Zod schema for notification feedback device info
 * Validates device info for notification engagement tracking
 */
export const notificationFeedbackDeviceInfoSchema = z.object({
  platform: z.string(),
  deviceType: z.string(),
  appVersion: z.string().optional(),
}).passthrough();

// -------------------- Analytics & Insights Schemas --------------------

/**
 * Zod schema for prediction accuracy model feedback
 */
export const predictionAccuracyModelFeedbackSchema = z.object({
  expectedFeatures: z.record(z.any()).optional(),
  actualFeatures: z.record(z.any()).optional(),
  featureDrift: z.record(z.number()).optional(),
  confidenceCalibration: z.number().optional(),
});

/**
 * Zod schema for trend alert conditions
 */
export const trendAlertConditionsSchema = z.object({
  minGrowthRate: z.number().optional(),
  minConfidence: z.number().optional(),
  keywords: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  timeWindow: z.object({
    value: z.number(),
    unit: z.string(),
  }).optional(),
  trendTypes: z.array(z.string()).optional(),
});

// -------------------- Content & Search Schemas --------------------

/**
 * Zod schema for content embedding metadata
 */
export const contentEmbeddingMetadataSchema = z.object({
  title: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
});

/**
 * Zod schema for related content items
 */
export const relatedContentItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  score: z.number(),
});

/**
 * Zod schema for query log metadata
 */
export const queryLogMetadataSchema = z.object({
  model: z.string().optional(),
  confidence: z.number().optional(),
  temperature: z.number().optional(),
  tokensUsed: z.number().int().nonnegative().optional(),
  explanations: z.array(z.string()).optional(),
});

// -------------------- Writing & Drafts Schemas --------------------

/**
 * Zod schema for draft template metadata
 */
export const draftTemplateMetadataSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().optional(),
  tokensUsed: z.number().int().nonnegative().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Zod schema for summary metadata
 */
export const summaryMetadataSchema = z.object({
  model: z.string().optional(),
  temperature: z.number().optional(),
  tokensUsed: z.number().int().nonnegative().optional(),
  processingTime: z.number().nonnegative().optional(),
});

// -------------------- Chat & Communication Schemas --------------------

/**
 * Zod schema for conversation context key facts
 */
export const conversationKeyFactSchema = z.object({
  fact: z.string(),
  category: z.string(),
  timestamp: z.string(),
});

/**
 * Zod schema for ChatMessageMetadata interface
 * Validates message metadata for chat messages
 */
export const chatMessageMetadataSchema = z.object({
  functionCall: z.string().optional().describe("Function or tool call made during this message"),
  citedSources: z.array(z.string()).optional().describe("Array of cited sources (URLs, document IDs, etc.)"),
  sentiment: z.string().optional().describe("Sentiment of the message ('positive' | 'negative' | 'neutral')"),
  feedback: z.object({
    rating: z.number().describe("User rating for the message"),
    comment: z.string().optional().describe("Optional comment on the message"),
  }).optional().describe("User feedback on the message"),
});

/**
 * Zod schema for DraftContent interface
 * Validates draft content structure for auto-saved documents
 */
export const draftContentSchema = z.object({
  content: z.string().describe("The actual text content of the draft"),
  contentHash: z.string().optional().describe("Hash of content for change detection"),
  version: z.number().int().positive().describe("Version number of this draft"),
  documentId: z.string().describe("Document identifier"),
  documentType: z.enum(['chat', 'recipe', 'note', 'meal_plan', 'shopping_list', 'other']).describe("Type of document being edited"),
});

/**
 * Zod schema for AutoSaveData interface
 * Validates auto-save editor state and device information
 */
export const autoSaveDataSchema = z.object({
  cursorPosition: z.number().int().nonnegative().optional().describe("Cursor position in the editor (character offset)"),
  scrollPosition: z.number().nonnegative().optional().describe("Scroll position (pixels from top)"),
  selectedText: z.string().optional().describe("Currently selected text"),
  editorState: z.any().optional().describe("Editor-specific state (Draft.js, ProseMirror, etc.)"),
  deviceInfo: z.object({
    browser: z.string().optional().describe("Browser name"),
    os: z.string().optional().describe("Operating system"),
    screenSize: z.string().optional().describe("Screen dimensions"),
  }).optional().describe("Device information for cross-device sync"),
});

/**
 * Zod schema for TypingPatternData interface
 * Validates typing pattern data for intelligent auto-save
 */
export const typingPatternDataSchema = z.object({
  pauseHistogram: z.array(z.number()).optional().describe("Histogram of pause durations between keystrokes"),
  keystrokeIntervals: z.array(z.number()).optional().describe("Array of keystroke intervals (milliseconds)"),
  burstLengths: z.array(z.number()).optional().describe("Array of typing burst lengths (characters per burst)"),
  timeOfDayPreferences: z.record(z.string(), z.number()).optional().describe("Time-of-day preferences for editing sessions"),
  contentTypePatterns: z.record(z.string(), z.any()).optional().describe("Patterns by content type (e.g., code vs prose)"),
});

// -------------------- Analytics & Insights Schemas --------------------

/**
 * Zod schema for AnalyticsInsightData interface
 * Validates analytics insight metric data with trends and comparisons
 */
export const analyticsInsightDataSchema = z.object({
  currentValue: z.number().optional().describe("Current value of the metric"),
  previousValue: z.number().optional().describe("Previous period value for comparison"),
  percentageChange: z.number().optional().describe("Percentage change from previous period"),
  dataPoints: z.array(timeSeriesPointSchema).optional().describe("Time series data points for visualization"),
  average: z.number().optional().describe("Average value over the period"),
  min: z.number().optional().describe("Minimum value in the period"),
  max: z.number().optional().describe("Maximum value in the period"),
  trend: z.enum(['up', 'down', 'stable']).optional().describe("Trend direction"),
});

/**
 * Zod schema for PredictionData interface
 * Validates user behavior prediction data and features
 */
export const predictionDataSchema = z.object({
  activityPattern: z.string().optional().describe("User's activity pattern classification"),
  engagementScore: z.number().optional().describe("Engagement score (0-1 or 0-100)"),
  lastActiveDate: z.string().optional().describe("Last time user was active (ISO date string)"),
  featureUsage: z.record(z.string(), z.number()).optional().describe("Feature usage statistics by feature name"),
  sessionFrequency: z.number().optional().describe("Session frequency (sessions per time period)"),
  contentInteraction: z.record(z.string(), z.any()).optional().describe("Content interaction metrics"),
  historicalBehavior: z.array(z.any()).optional().describe("Historical behavior patterns for comparison"),
});

/**
 * Zod schema for TrendData interface
 * Validates trend detection data with time series and entities
 */
export const trendDataSchema = z.object({
  timeSeries: z.array(timeSeriesPointSchema).optional().describe("Time series data for trend visualization"),
  keywords: z.array(z.string()).optional().describe("Keywords associated with the trend"),
  entities: z.array(z.object({
    name: z.string().describe("Entity name"),
    type: z.string().describe("Entity type"),
    relevance: z.number().describe("Relevance score"),
  })).optional().describe("Named entities extracted from trend data"),
  sources: z.array(z.string()).optional().describe("Data sources contributing to the trend"),
  metrics: z.record(z.string(), z.any()).optional().describe("Additional metrics related to the trend"),
  volumeData: z.array(z.object({
    date: z.string().describe("Date in ISO format"),
    count: z.number().int().nonnegative().describe("Volume count"),
  })).optional().describe("Volume data over time"),
  sentimentData: z.array(z.object({
    date: z.string().describe("Date in ISO format"),
    positive: z.number().describe("Positive sentiment count or score"),
    negative: z.number().describe("Negative sentiment count or score"),
    neutral: z.number().describe("Neutral sentiment count or score"),
  })).optional().describe("Sentiment distribution over time"),
});

// -------------------- A/B Testing Schemas --------------------

/**
 * Zod schema for AbTestConfiguration interface
 * Validates A/B test configuration and metadata
 * Extends metadataBaseSchema (description, tags, customFields)
 */
export const abTestConfigurationSchema = metadataBaseSchema.extend({
  hypothesis: z.string().optional().describe("Hypothesis being tested (e.g., 'Blue button increases conversions by 15%')"),
  featureArea: z.string().optional().describe("Feature area being tested (e.g., 'checkout', 'onboarding', 'pricing')"),
  minimumSampleSize: z.number().int().positive().optional().describe("Minimum sample size required for statistical validity"),
  confidenceLevel: z.number().min(0).max(1).optional().describe("Confidence level threshold (typically 0.95 for 95% confidence)"),
  testType: z.enum(['split', 'multivariate', 'redirect']).optional().describe("Type of A/B test being conducted"),
});

/**
 * Zod schema for AbTestMetrics interface
 * Validates performance metrics for A/B test variants
 */
export const abTestMetricsSchema = z.object({
  deviceBreakdown: z.record(z.string(), z.number()).optional().describe("Metrics broken down by device type (e.g., {mobile: 150, desktop: 320})"),
  geoBreakdown: z.record(z.string(), z.number()).optional().describe("Metrics broken down by geographic location (e.g., {US: 250, UK: 120})"),
  referrerBreakdown: z.record(z.string(), z.number()).optional().describe("Metrics broken down by referrer source (e.g., {google: 200, direct: 150})"),
  customMetrics: z.record(z.string(), z.number()).optional().describe("Custom metrics specific to the test (e.g., {time_to_action: 45.2})"),
  segments: z.record(z.string(), z.any()).optional().describe("Segment-level results for deeper analysis"),
});

/**
 * Zod schema for AbTestInsights interface
 * Validates AI-generated analysis and insights for A/B test
 */
export const abTestInsightsSchema = z.object({
  keyFindings: z.array(z.string()).optional().describe("Key findings from the test (e.g., ['Variant B increased conversions by 23%'])"),
  segmentInsights: z.record(z.string(), z.string()).optional().describe("Insights broken down by user segments"),
  bestPractices: z.array(z.string()).optional().describe("Best practices and recommendations for implementation"),
  nextSteps: z.array(z.string()).optional().describe("Suggested next steps based on test outcome"),
  warnings: z.array(z.string()).optional().describe("Warnings or caveats about the results"),
  learnings: z.array(z.string()).optional().describe("Lessons learned that can inform future tests"),
});

/**
 * Zod schema for AbTestStatisticalAnalysis interface
 * Validates statistical analysis data for A/B test
 */
export const abTestStatisticalAnalysisSchema = z.object({
  sampleSizeA: z.number().int().nonnegative().optional().describe("Sample size for variant A (control)"),
  sampleSizeB: z.number().int().nonnegative().optional().describe("Sample size for variant B (treatment)"),
  conversionRateA: z.number().min(0).max(1).optional().describe("Conversion rate for variant A (0-1)"),
  conversionRateB: z.number().min(0).max(1).optional().describe("Conversion rate for variant B (0-1)"),
  standardErrorA: z.number().nonnegative().optional().describe("Standard error for variant A"),
  standardErrorB: z.number().nonnegative().optional().describe("Standard error for variant B"),
  zScore: z.number().optional().describe("Z-score for significance testing"),
  confidenceInterval: z.object({
    lower: z.number().describe("Lower bound of confidence interval"),
    upper: z.number().describe("Upper bound of confidence interval"),
  }).optional().describe("Confidence interval for the difference"),
  minimumDetectableEffect: z.number().optional().describe("Minimum detectable effect size"),
  power: z.number().min(0).max(1).optional().describe("Statistical power of the test (0-1)"),
});

/**
 * Zod schema for AbTestSegmentResults interface
 * Validates segment-level test results
 */
export const abTestSegmentResultsSchema = z.object({
  segmentName: z.string().describe("Segment name or identifier"),
  userCount: z.number().int().nonnegative().describe("Number of users in this segment"),
  conversionRate: z.number().min(0).max(1).describe("Conversion rate for this segment (0-1)"),
  significance: z.number().min(0).max(1).optional().describe("Statistical significance for this segment (0-1)"),
  trafficPercentage: z.number().min(0).max(100).optional().describe("Percentage of total traffic in this segment (0-100)"),
  revenue: z.number().nonnegative().optional().describe("Revenue generated by this segment"),
  engagementScore: z.number().nonnegative().optional().describe("Engagement score for this segment"),
  customMetrics: z.record(z.string(), z.number()).optional().describe("Additional segment-specific metrics"),
});

// -------------------- Cohort Analysis Schemas --------------------

/**
 * Zod schema for CohortDefinition interface
 * Validates cohort definition criteria and filtering rules
 */
export const cohortDefinitionSchema = z.object({
  signupDateRange: z.object({
    start: z.string().describe("Start date for user signup filtering (ISO string)"),
    end: z.string().describe("End date for user signup filtering (ISO string)"),
  }).optional().describe("Date range for user signup filtering"),
  userAttributes: z.record(z.string(), z.any()).optional().describe("User attribute filters (e.g., plan type, location, source)"),
  behaviorCriteria: z.object({
    events: z.array(z.string()).optional().describe("List of required events (e.g., ['login', 'purchase', 'share'])"),
    minSessionCount: z.number().int().nonnegative().optional().describe("Minimum number of sessions required"),
    minEngagementScore: z.number().nonnegative().optional().describe("Minimum engagement score threshold"),
    customMetrics: z.record(z.string(), z.any()).optional().describe("Custom metrics for advanced filtering"),
  }).optional().describe("Behavioral patterns and criteria for cohort membership"),
  customQueries: z.array(z.string()).optional().describe("Custom SQL conditions for complex filtering"),
  source: z.string().optional().describe("Acquisition source (e.g., 'product_hunt', 'organic', 'paid_ads')"),
});

/**
 * Zod schema for CohortMetadata interface
 * Validates descriptive metadata about the cohort
 * Extends metadataBaseSchema (description, tags, customFields)
 */
export const cohortMetadataSchema = metadataBaseSchema.extend({
  color: z.string().optional().describe("Hex color code for UI visualization (e.g., '#4F46E5')"),
  icon: z.string().optional().describe("Icon identifier for UI display"),
  businessContext: z.string().optional().describe("Business context explaining why this cohort matters"),
  hypothesis: z.string().optional().describe("Hypothesis being tested with this cohort"),
});

/**
 * Zod schema for CohortComparisonData interface
 * Validates period-over-period comparison metrics
 */
export const cohortComparisonDataSchema = z.object({
  previousPeriod: z.number().optional().describe("Metric value from the previous period"),
  percentageChange: z.number().optional().describe("Percentage change from previous period (-100 to +100+)"),
  trend: z.enum(['increasing', 'decreasing', 'stable']).optional().describe("Trend direction classification"),
  significance: z.number().min(0).max(1).optional().describe("Statistical significance score (0-1, higher = more significant)"),
});

/**
 * Zod schema for CohortSegmentData interface
 * Validates segment breakdown with user counts and percentages
 */
export const cohortSegmentDataSchema = z.object({
  byDevice: z.record(z.string(), z.number()).optional().describe("Breakdown by device type (e.g., {mobile: 150, desktop: 320, tablet: 30})"),
  bySource: z.record(z.string(), z.number()).optional().describe("Breakdown by acquisition source (e.g., {organic: 200, paid: 150, referral: 150})"),
  byFeature: z.record(z.string(), z.number()).optional().describe("Breakdown by feature usage (e.g., {feature_a: 350, feature_b: 200})"),
  byUserAttribute: z.record(z.string(), z.number()).optional().describe("Breakdown by user attribute (e.g., {premium: 100, free: 400})"),
  custom: z.record(z.string(), z.any()).optional().describe("Custom segment breakdowns with dynamic keys"),
});

// -------------------- Predictive Maintenance Schemas --------------------

/**
 * Zod schema for MaintenanceMetrics interface
 * Validates system metric metadata and context
 * Extends metadataBaseSchema (description, tags, customFields)
 */
export const maintenanceMetricsSchema = metadataBaseSchema.extend({
  unit: z.string().optional().describe("Unit of measurement for the metric (ms, %, MB, etc.)"),
  source: z.string().optional().describe("Source system or component that generated the metric"),
  context: z.record(z.string(), z.any()).optional().describe("Additional context about the metric"),
});

/**
 * Zod schema for MaintenanceFeatures interface
 * Validates predictive maintenance features and patterns
 */
export const maintenanceFeaturesSchema = z.object({
  trendSlope: z.number().optional().describe("Trend slope indicating degradation rate"),
  seasonality: z.record(z.string(), z.number()).optional().describe("Seasonality patterns (day-of-week, time-of-day)"),
  recentAnomalies: z.number().int().nonnegative().optional().describe("Number of recent anomalies detected"),
  historicalPatterns: z.array(z.any()).optional().describe("Historical pattern data for comparison"),
});

/**
 * Zod schema for MaintenancePerformanceMetrics interface
 * Validates maintenance performance comparison metrics
 */
export const maintenancePerformanceMetricsSchema = z.object({
  before: z.record(z.string(), z.number()).optional().describe("Performance metrics before maintenance"),
  after: z.record(z.string(), z.number()).optional().describe("Performance metrics after maintenance"),
  improvement: z.number().optional().describe("Percentage improvement from maintenance"),
});

/**
 * Zod schema for MaintenanceCost interface
 * Validates maintenance cost breakdown
 */
export const maintenanceCostSchema = z.object({
  laborHours: z.number().nonnegative().optional().describe("Labor hours spent on maintenance"),
  resourceCost: z.number().nonnegative().optional().describe("Direct resource costs (parts, licenses, etc.)"),
  opportunityCost: z.number().nonnegative().optional().describe("Opportunity cost from downtime"),
});

// ==================== End of Zod Validation Schemas ====================

/**
 * Sessions Table
 * 
 * Stores server-side session data for Replit Auth OIDC.
 * Required by connect-pg-simple for express-session storage.
 * 
 * Fields:
 * - sid: Session ID (primary key from session cookie)
 * - sess: Session data as JSONB (user info, auth state)
 * - expire: Expiration timestamp for automatic cleanup
 * 
 * Usage:
 * - Automatically managed by express-session middleware
 * - Sessions expire based on cookie maxAge configuration
 * - Cleanup occurs via PostgreSQL cron or manual cleanup
 * 
 * Security:
 * - Cookie-based session IDs (httpOnly, secure in production)
 * - No sensitive data stored client-side
 * - Automatic expiration prevents stale sessions
 * 
 * Indexes:
 * - IDX_session_expire: Enables efficient expired session cleanup
 * 
 * Referenced from: blueprint:javascript_log_in_with_replit
 */
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").$type<Record<string, any>>().notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

/**
 * Users Table
 * 
 * Core user accounts mapped from Replit Auth OIDC claims.
 * Merged with user preferences for optimized queries (denormalized).
 * 
 * Authentication Fields:
 * - id: UUID primary key (maps to OIDC 'sub' claim)
 * - email: User's email from OIDC (unique constraint)
 * - firstName: User's first name from OIDC
 * - lastName: User's last name from OIDC
 * - profileImageUrl: Avatar URL from OIDC provider
 * 
 * Dietary Preferences:
 * - dietaryRestrictions: Array of restrictions (vegetarian, vegan, gluten-free, etc.)
 * - allergens: Array of allergens to avoid (peanuts, shellfish, dairy, etc.)
 * - foodsToAvoid: Custom foods user wants to avoid
 * - favoriteCategories: Preferred food categories for suggestions
 * 
 * User Settings:
 * - householdSize: Number of people cooking for (default: 2)
 * - cookingSkillLevel: beginner|intermediate|advanced (default: beginner)
 * - preferredUnits: imperial|metric (default: imperial)
 * - expirationAlertDays: Days before expiration to alert (default: 3)
 * - storageAreasEnabled: Active storage location types
 * - hasCompletedOnboarding: Onboarding flow completion status
 * 
 * Notification Preferences:
 * - notificationsEnabled: Master notification toggle (default: false)
 * - notifyExpiringFood: Alert for expiring ingredients (default: true)
 * - notifyRecipeSuggestions: AI recipe suggestions (default: false)
 * - notifyMealReminders: Meal planning reminders (default: true)
 * - notificationTime: Daily notification time (HH:mm format, default: 09:00)
 * 
 * Admin & Metadata:
 * - isAdmin: Admin role flag for privileged operations
 * - createdAt: Account creation timestamp
 * - updatedAt: Last profile update timestamp
 * 
 * Business Rules:
 * - Email must be unique across all users
 * - Default preferences applied on account creation
 * - Preferences influence AI recipe generation
 * - Notification settings control push notification delivery
 * 
 * Indexes:
 * - email: Unique index for authentication lookups
 * 
 * Referenced from: blueprint:javascript_log_in_with_replit
 */
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  
  // OAuth provider information
  primaryProvider: varchar("primary_provider"), // 'google', 'github', 'twitter', 'apple', 'email', 'replit'
  primaryProviderId: varchar("primary_provider_id"), // Provider's unique user ID
  
  // Preferences (previously in userPreferences table)
  dietaryRestrictions: text("dietary_restrictions").array(),
  allergens: text("allergens").array(),
  favoriteCategories: text("favorite_categories").array(),
  expirationAlertDays: integer("expiration_alert_days").notNull().default(3),
  storageAreasEnabled: text("storage_areas_enabled").array(),
  householdSize: integer("household_size").notNull().default(2),
  cookingSkillLevel: text("cooking_skill_level").notNull().default('beginner'),
  preferredUnits: text("preferred_units").notNull().default('imperial'),
  foodsToAvoid: text("foods_to_avoid").array(),
  hasCompletedOnboarding: boolean("has_completed_onboarding").notNull().default(false),
  
  // Notification preferences
  notificationsEnabled: boolean("notifications_enabled").notNull().default(false),
  notifyExpiringFood: boolean("notify_expiring_food").notNull().default(true),
  notifyRecipeSuggestions: boolean("notify_recipe_suggestions").notNull().default(false),
  notifyMealReminders: boolean("notify_meal_reminders").notNull().default(true),
  notificationTime: text("notification_time").default("09:00"), // Time of day for daily notifications
  
  // Admin role
  isAdmin: boolean("is_admin").notNull().default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

/**
 * Auth Providers Table
 * 
 * Tracks all authentication methods linked to a user account.
 * Allows users to sign in with multiple OAuth providers.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - provider: OAuth provider name (google, github, twitter, apple, email)
 * - providerId: Provider's unique user ID
 * - providerEmail: Email from the provider (may differ from primary email)
 * - accessToken: OAuth access token (encrypted in production)
 * - refreshToken: OAuth refresh token for token renewal
 * - tokenExpiry: Access token expiration timestamp
 * - isPrimary: Flag for primary authentication method
 * - metadata: Additional provider-specific data as JSONB
 * - createdAt: When the provider was linked
 * - updatedAt: Last authentication with this provider
 * 
 * Business Rules:
 * - Each user can have multiple auth providers
 * - Only one provider can be marked as primary
 * - Provider + providerId combination must be unique
 * - Tokens should be encrypted before storage in production
 * 
 * Indexes:
 * - userId: Fast user-specific queries
 * - provider + providerId: Unique constraint for provider accounts
 */
export const authProviders = pgTable("auth_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider").notNull(), // 'google', 'github', 'twitter', 'apple', 'email'
  providerId: varchar("provider_id").notNull(),
  providerEmail: varchar("provider_email"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  isPrimary: boolean("is_primary").default(false),
  metadata: jsonb("metadata").$type<Record<string, any>>(), // Provider-specific additional data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("auth_providers_user_id_idx").on(table.userId),
  uniqueIndex("auth_providers_provider_id_idx").on(table.provider, table.providerId),
]);

export const insertAuthProviderSchema = createInsertSchema(authProviders)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    metadata: z.record(z.any()).optional(),
  });

export type InsertAuthProvider = z.infer<typeof insertAuthProviderSchema>;
export type AuthProvider = typeof authProviders.$inferSelect;

/**
 * User Storage Locations Table
 * 
 * User-defined storage areas for organizing food inventory.
 * Supports custom locations beyond default Fridge/Pantry/Freezer.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - name: Storage location name (e.g., "Wine Cellar", "Garage Freezer")
 * - icon: Icon name for UI display (lucide-react icon names)
 * - isDefault: Flag for system-provided default locations
 * - isActive: Soft delete flag for hiding without removing
 * - sortOrder: Display order in UI (user-customizable)
 * - createdAt: Creation timestamp
 * - updatedAt: Last modification timestamp
 * 
 * Default Locations:
 * - Refrigerator (isDefault: true, icon: "refrigerator")
 * - Freezer (isDefault: true, icon: "snowflake")
 * - Pantry (isDefault: true, icon: "warehouse")
 * - Counter (isDefault: true, icon: "layout-grid")
 * 
 * Custom Locations Examples:
 * - Wine Cellar, Garage Freezer, Root Cellar, Spice Rack
 * 
 * Business Rules:
 * - Users can add unlimited custom storage locations
 * - Each user+name combination must be unique
 * - Default locations created during user onboarding
 * - Soft delete (isActive: false) preserves historical data
 * - SortOrder determines display sequence in UI
 * 
 * Indexes:
 * - user_storage_user_id_idx: Fast user-specific queries
 * - user_storage_user_name_idx: Unique constraint on userId + name
 * 
 * Relationships:
 * - users → userStorage: CASCADE (delete locations when user deleted)
 * - userStorage ← userInventory: Referenced by storageLocationId
 */
export const userStorage = pgTable("user_storage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g., "Refrigerator", "Pantry", "Wine Cellar"
  icon: text("icon").notNull().default("package"), // Icon name for display
  isDefault: boolean("is_default").notNull().default(false), // If it's a default area like Fridge/Pantry
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_storage_user_id_idx").on(table.userId),
  uniqueIndex("user_storage_user_name_idx").on(table.userId, table.name),
]);

export const insertUserStorageSchema = createInsertSchema(userStorage).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserStorage = z.infer<typeof insertUserStorageSchema>;
export type UserStorage = typeof userStorage.$inferSelect;
// For backward compatibility
export type StorageLocation = UserStorage;

/**
 * Push Notification Tokens Table
 * 
 * Stores device tokens for push notifications across platforms.
 * Enables multi-device notification delivery per user.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - token: Device-specific push token from OS
 * - platform: 'ios' | 'android' | 'web'
 * - isActive: Token validity flag (deactivated on errors)
 * - deviceInfo: JSONB with device metadata
 *   - deviceId: Unique device identifier
 *   - deviceModel: Device hardware model
 *   - osVersion: Operating system version
 *   - appVersion: Application version
 * - createdAt: Token registration timestamp
 * - updatedAt: Last token refresh timestamp
 * 
 * Token Lifecycle:
 * 1. Device registers → creates token record
 * 2. Token validated on notification send
 * 3. Failed delivery → isActive set to false
 * 4. Token refresh → updates existing record
 * 5. User logout → token deleted or deactivated
 * 
 * Business Rules:
 * - One user can have multiple active tokens (multiple devices)
 * - Unique constraint on userId + token combination
 * - Inactive tokens not used for notification delivery
 * - Device info helps debugging notification issues
 * 
 * Indexes:
 * - push_tokens_user_id_idx: User's devices lookup
 * - push_tokens_user_token_idx: Unique constraint, duplicate detection
 * 
 * Relationships:
 * - users → pushTokens: CASCADE (delete tokens when user deleted)
 * - pushTokens ← notificationHistory: Referenced by pushTokenId
 */
export const pushTokens = pgTable("push_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  platform: text("platform").notNull(), // 'ios', 'android', 'web'
  isActive: boolean("is_active").notNull().default(true),
  deviceInfo: jsonb("device_info").$type<{
    deviceId?: string;
    deviceModel?: string;
    osVersion?: string;
    appVersion?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("push_tokens_user_token_idx").on(table.userId, table.token),
  index("push_tokens_user_id_idx").on(table.userId),
]);

/**
 * Insert schema for pushTokens table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertPushTokenSchema = createInsertSchema(pushTokens)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    deviceInfo: pushTokenDeviceInfoSchema.optional(),
  });

export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;
export type PushToken = typeof pushTokens.$inferSelect;

/**
 * Notification History Table
 * 
 * Tracks all delivered push notifications and their engagement.
 * Provides analytics for notification effectiveness.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - type: Notification category
 *   - 'expiring-food': Ingredient expiration alerts
 *   - 'recipe-suggestion': AI-generated recipe ideas
 *   - 'meal-reminder': Upcoming meal reminders
 *   - 'test': Test notifications for debugging
 * - title: Notification title shown to user
 * - body: Notification message body
 * - data: JSONB with notification-specific data
 *   - recipeId: For recipe suggestions
 *   - ingredientIds: For expiring food alerts
 *   - mealPlanId: For meal reminders
 * - status: Delivery lifecycle
 *   - 'sent': Dispatched to push service
 *   - 'delivered': Confirmed device delivery
 *   - 'opened': User tapped notification
 *   - 'dismissed': User dismissed without opening
 *   - 'failed': Delivery failure
 * - platform: 'ios' | 'android' | 'web'
 * - pushTokenId: Foreign key to pushTokens.id (SET NULL on token delete)
 * - sentAt: When notification was sent (default: now)
 * - deliveredAt: When device received notification
 * - openedAt: When user tapped notification
 * - dismissedAt: When user dismissed notification
 * 
 * Engagement Tracking:
 * - Open rate: openedAt / sentAt count
 * - Dismiss rate: dismissedAt / sentAt count
 * - Delivery success: deliveredAt / sentAt count
 * - Time to open: openedAt - sentAt
 * 
 * Business Rules:
 * - All notifications logged regardless of delivery outcome
 * - Status transitions: sent → delivered → (opened | dismissed)
 * - Failed deliveries mark pushToken as inactive
 * - History preserved even if user/token deleted
 * 
 * Indexes:
 * - notification_history_user_id_idx: User's notification history
 * - notification_history_type_idx: Filter by notification type
 * - notification_history_status_idx: Filter by delivery status
 * - notification_history_sent_at_idx: Time-based queries
 * 
 * Relationships:
 * - users → notificationHistory: CASCADE
 * - pushTokens → notificationHistory: SET NULL
 */
export const notificationHistory = pgTable("notification_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'expiring-food', 'recipe-suggestion', 'meal-reminder', 'test'
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data").$type<any>(),
  status: text("status").notNull().default('sent'), // 'sent', 'delivered', 'opened', 'dismissed', 'failed'
  platform: text("platform").notNull(), // 'ios', 'android', 'web'
  pushTokenId: varchar("push_token_id").references(() => pushTokens.id, { onDelete: "set null" }),
  sentAt: timestamp("sent_at").notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  dismissedAt: timestamp("dismissed_at"),
  dismissedBy: varchar("dismissed_by"), // device/client identifier that dismissed the notification
}, (table) => [
  index("notification_history_user_id_idx").on(table.userId),
  index("notification_history_type_idx").on(table.type),
  index("notification_history_status_idx").on(table.status),
  index("notification_history_sent_at_idx").on(table.sentAt),
]);

/**
 * Intelligent Notification Preferences
 * Stores user-specific notification preferences and patterns for ML optimization.
 * 
 * Fields:
 * - userId: Foreign key to users.id
 * - notificationTypes: JSONB with type-specific preferences and weights
 * - quietHours: User's do-not-disturb periods
 * - frequencyLimit: Max notifications per 24h period
 * - enableSmartTiming: Whether to use ML for timing optimization
 * - enableRelevanceScoring: Whether to use AI for content scoring
 * - preferredChannels: Ordered list of notification channels
 * 
 * Business Rules:
 * - Default frequency limit: 10 notifications/day
 * - Quiet hours override all non-urgent notifications
 * - Smart timing learns from user engagement patterns
 */
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  notificationTypes: jsonb("notification_types").$type<{
    expiringFood: { enabled: boolean; weight: number; urgencyThreshold: number };
    recipeSuggestions: { enabled: boolean; weight: number; maxPerDay: number };
    mealReminders: { enabled: boolean; weight: number; leadTime: number };
    shoppingReminders: { enabled: boolean; weight: number };
    nutritionInsights: { enabled: boolean; weight: number; frequency: string };
    systemUpdates: { enabled: boolean; weight: number };
  }>().notNull().default({
    expiringFood: { enabled: true, weight: 1.0, urgencyThreshold: 2 },
    recipeSuggestions: { enabled: false, weight: 0.5, maxPerDay: 2 },
    mealReminders: { enabled: true, weight: 0.8, leadTime: 30 },
    shoppingReminders: { enabled: false, weight: 0.6 },
    nutritionInsights: { enabled: false, weight: 0.4, frequency: "weekly" },
    systemUpdates: { enabled: false, weight: 0.3 }
  }),
  quietHours: jsonb("quiet_hours").$type<{
    enabled: boolean;
    periods: Array<{ start: string; end: string; days: number[] }>;
  }>().notNull().default({
    enabled: false,
    periods: []
  }),
  frequencyLimit: integer("frequency_limit").notNull().default(10),
  enableSmartTiming: boolean("enable_smart_timing").notNull().default(true),
  enableRelevanceScoring: boolean("enable_relevance_scoring").notNull().default(true),
  preferredChannels: text().array().notNull().default(['push', 'in-app']),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, (table) => [
  index("notification_preferences_user_id_idx").on(table.userId),
  index("notification_preferences_updated_idx").on(table.updatedAt)
]);

/**
 * Notification Scores
 * Stores ML-generated relevance scores and optimal delivery times for notifications.
 * 
 * Fields:
 * - notificationId: Foreign key to notificationHistory
 * - userId: Foreign key to users.id
 * - relevanceScore: AI-computed relevance (0-1)
 * - optimalTime: ML-predicted best delivery time
 * - urgencyLevel: Computed urgency (0-5)
 * - features: Feature vector used for scoring
 * - actualSentAt: When notification was actually sent
 * - holdUntil: Computed delivery time respecting constraints
 * 
 * Business Rules:
 * - Scores > 0.7 considered high relevance
 * - Urgent notifications (level >= 4) bypass timing optimization
 * - Features stored for model retraining
 */
export const notificationScores = pgTable("notification_scores", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  notificationId: varchar("notification_id").references(() => notificationHistory.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  relevanceScore: real("relevance_score").notNull().default(0.5),
  optimalTime: timestamp("optimal_time"),
  urgencyLevel: integer("urgency_level").notNull().default(2),
  features: jsonb("features").$type<{
    dayOfWeek: number;
    hourOfDay: number;
    timeSinceLastOpen: number;
    recentEngagementRate: number;
    notificationType: string;
    contentLength: number;
    hasActionItems: boolean;
    userContext: any;
  }>(),
  actualSentAt: timestamp("actual_sent_at"),
  holdUntil: timestamp("hold_until"),
  modelVersion: text("model_version"),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("notification_scores_user_id_idx").on(table.userId),
  index("notification_scores_notification_id_idx").on(table.notificationId),
  index("notification_scores_hold_until_idx").on(table.holdUntil),
  index("notification_scores_relevance_idx").on(table.relevanceScore)
]);

/**
 * Notification Feedback
 * Tracks user interactions with notifications for ML model training.
 * 
 * Fields:
 * - notificationId: Foreign key to notificationHistory
 * - userId: Foreign key to users.id
 * - action: User's action (clicked, dismissed, disabled)
 * - actionAt: When action occurred
 * - engagementTime: Time spent after clicking (ms)
 * - followupAction: What user did after clicking
 * - sentiment: Inferred sentiment from action
 * 
 * Business Rules:
 * - Feedback triggers model retraining
 * - Disabled notifications reduce type weight
 * - Click-through improves relevance scoring
 */
export const notificationFeedback = pgTable("notification_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  notificationId: varchar("notification_id").notNull().references(() => notificationHistory.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(), // 'clicked', 'dismissed', 'disabled', 'snoozed'
  actionAt: timestamp("action_at").notNull().defaultNow(),
  engagementTime: integer("engagement_time"), // milliseconds spent after clicking
  followupAction: text("followup_action"), // 'viewed', 'interacted', 'completed', 'abandoned'
  sentiment: real("sentiment").default(0), // -1 (negative) to 1 (positive)
  deviceInfo: jsonb("device_info").$type<{
    platform: string;
    deviceType: string;
    appVersion?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [
  index("notification_feedback_user_id_idx").on(table.userId),
  index("notification_feedback_notification_id_idx").on(table.notificationId),
  index("notification_feedback_action_idx").on(table.action),
  index("notification_feedback_action_at_idx").on(table.actionAt),
  uniqueIndex("notification_feedback_unique_idx").on(table.notificationId, table.userId)
]);

/**
 * Insert schema for notificationPreferences table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    notificationTypes: notificationTypesSchema.optional(),
    quietHours: quietHoursSchema.optional(),
  });

export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;

/**
 * Insert schema for notificationScores table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertNotificationScoresSchema = createInsertSchema(notificationScores)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    features: notificationFeaturesSchema.optional(),
  });

export type InsertNotificationScores = z.infer<typeof insertNotificationScoresSchema>;
export type NotificationScores = typeof notificationScores.$inferSelect;

/**
 * Insert schema for notificationFeedback table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertNotificationFeedbackSchema = createInsertSchema(notificationFeedback)
  .omit({
    id: true,
    actionAt: true,
    createdAt: true,
  })
  .extend({
    deviceInfo: notificationFeedbackDeviceInfoSchema.optional(),
  });

export type InsertNotificationFeedback = z.infer<typeof insertNotificationFeedbackSchema>;
export type NotificationFeedback = typeof notificationFeedback.$inferSelect;

/**
 * Insert schema for notificationHistory table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertNotificationHistorySchema = createInsertSchema(notificationHistory)
  .omit({
    id: true,
    sentAt: true,
  })
  .extend({
    data: z.any().optional(),
  });

export type InsertNotificationHistory = z.infer<typeof insertNotificationHistorySchema>;
export type NotificationHistory = typeof notificationHistory.$inferSelect;

/**
 * User Appliances Table
 * 
 * User's kitchen appliances linked to master appliance library.
 * Supports both library items and fully custom appliances.
 * 
 * Fields:
 * - id: UUID primary key
 * - name: Display name for this appliance instance
 * - type: Appliance category override
 * - userId: Foreign key to users.id (CASCADE delete)
 * - applianceLibraryId: Foreign key to applianceLibrary.id (SET NULL)
 * 
 * Library-Linked Fields (when applianceLibraryId set):
 * - Inherits: category, capabilities, description from library
 * - Custom overrides below take precedence
 * 
 * Custom Appliance Fields (when applianceLibraryId null):
 * - customBrand: Manufacturer name
 * - customModel: Model number/name
 * - customCapabilities: Array of capabilities (bake, broil, air fry, etc.)
 * - customCapacity: Size specification (5qt, 9x13", etc.)
 * - customServingSize: Typical serving capacity
 * 
 * User Metadata:
 * - nickname: User-assigned nickname ("My Air Fryer")
 * - purchaseDate: When appliance was acquired
 * - warrantyEndDate: Warranty expiration for tracking
 * - notes: User notes (settings, maintenance, etc.)
 * - imageUrl: User-uploaded photo or library image
 * - isActive: Soft delete for appliances no longer owned
 * - createdAt: When added to user's kitchen
 * - updatedAt: Last modification timestamp
 * 
 * Use Cases:
 * - Recipe filtering: Show only recipes compatible with owned appliances
 * - Equipment suggestions: Recommend appliances for desired recipes
 * - Warranty tracking: Alert when warranties expire
 * - Recipe adaptation: Adjust instructions based on appliance capabilities
 * 
 * Business Rules:
 * - Can link to library OR be fully custom (not both)
 * - Library link preserved even if library item deleted (SET NULL)
 * - Custom fields ignored when library-linked
 * - Soft delete preserves historical recipe compatibility
 * 
 * Indexes:
 * - user_appliances_user_id_idx: User's appliance list
 * - user_appliances_appliance_library_id_idx: Library item usage tracking
 * 
 * Relationships:
 * - users → userAppliances: CASCADE
 * - applianceLibrary → userAppliances: SET NULL
 * - userAppliances ← userRecipes.neededEquipment: Referenced in recipe requirements
 */
export const userAppliances = pgTable("user_appliances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  applianceLibraryId: varchar("appliance_library_id").references(() => applianceLibrary.id, { onDelete: "set null" }),
  customBrand: text("custom_brand"),
  customModel: text("custom_model"),
  customCapabilities: text("custom_capabilities").array(),
  customCapacity: text("custom_capacity"),
  customServingSize: text("custom_serving_size"),
  nickname: text("nickname"),
  purchaseDate: text("purchase_date"),
  warrantyEndDate: text("warranty_end_date"),
  notes: text("notes"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("user_appliances_user_id_idx").on(table.userId),
  index("user_appliances_appliance_library_id_idx").on(table.applianceLibraryId),
]);

export const insertUserApplianceSchema = createInsertSchema(userAppliances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserAppliance = z.infer<typeof insertUserApplianceSchema>;
export type UserAppliance = typeof userAppliances.$inferSelect;

/**
 * User Inventory Table
 * 
 * Food items currently in user's possession across storage locations.
 * Enhanced with USDA nutrition data and barcode integration.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - name: Food item name (user-editable)
 * - quantity: Amount as text ("2", "1.5", "half")
 * - unit: Measurement unit (cups, lbs, pieces, oz, ml, etc.)
 * - storageLocationId: Foreign key to userStorage.id
 * - expirationDate: When food expires (YYYY-MM-DD format, optional)
 * - foodCategory: Mapped USDA category (Dairy, Produce, Meat, Grains, Other)
 * 
 * Enhanced Data:
 * - imageUrl: Product photo (from barcode lookup or user upload)
 * - barcode: UPC/EAN barcode number if scanned
 * - notes: User notes (brand, variety, storage tips)
 * - nutrition: JSON string with NutritionInfo interface
 * - usdaData: Full USDA FoodData Central response (JSONB)
 * - barcodeData: Full barcode lookup API response (JSONB)
 * - servingSize: Serving size from USDA (e.g., "1 cup")
 * - servingSizeUnit: Unit for serving size
 * - weightInGrams: Numeric weight for nutrition calculations
 * 
 * Metadata:
 * - createdAt: When item was added to inventory
 * - updatedAt: Last modification timestamp
 * 
 * Data Sources:
 * 1. Manual Entry: User types name, quantity, unit
 * 2. Barcode Scan: Lookup via barcode API, populate all fields
 * 3. USDA Search: Search FoodData Central, link by fdcId
 * 4. Onboarding: Pre-populated from onboardingInventory table
 * 
 * Business Rules:
 * - Expiration alerts trigger when expirationDate - N days <= today
 * - Alert threshold N from users.expirationAlertDays (default: 3)
 * - Nutrition scaled by weightInGrams vs USDA serving size
 * - Categories used for recipe matching and analytics
 * - Storage location determines shelf life defaults
 * - Barcode data cached in barcodeData for offline access
 * 
 * Nutrition Calculations:
 * - If weightInGrams and servingSize both present:
 *   actualNutrition = (weightInGrams / servingSizeInGrams) * usdaNutrition
 * - Used for meal planning nutrition totals
 * 
 * Expiration Logic:
 * - expirationDate null: No expiration tracking
 * - expirationDate < today: Expired (red alert)
 * - expirationDate < today + alertDays: Expiring soon (yellow warning)
 * - expirationDate >= today + alertDays: Fresh (green)
 * 
 * Indexes:
 * - user_inventory_user_id_idx: User's inventory list
 * - user_inventory_expiration_date_idx: Expiration alert queries
 * - user_inventory_storage_location_idx: Group by storage area
 * - user_inventory_food_category_idx: Filter by category
 * 
 * Relationships:
 * - users → userInventory: CASCADE
 * - userStorage → userInventory: Referenced by storageLocationId
 * - userInventory ← userRecipes: Matched against recipe ingredients
 */
export const userInventory = pgTable("user_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit").notNull(),
  expirationDate: text("expiration_date"),
  storageLocationId: varchar("storage_location_id").notNull(),
  foodCategory: text("food_category"), // Mapped USDA category
  imageUrl: text("image_url"),
  barcode: text("barcode"),
  notes: text("notes"),
  nutrition: text("nutrition"), // JSON string for nutrition data
  usdaData: jsonb("usda_data").$type<any>(), // Full USDA FoodData Central data
  barcodeData: jsonb("barcode_data").$type<any>(), // Full barcode lookup data
  servingSize: text("serving_size"),
  servingSizeUnit: text("serving_size_unit"),
  weightInGrams: real("weight_in_grams"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_inventory_user_id_idx").on(table.userId),
  index("user_inventory_expiration_date_idx").on(table.expirationDate),
  index("user_inventory_storage_location_idx").on(table.storageLocationId),
  index("user_inventory_food_category_idx").on(table.foodCategory),
]);

/**
 * Insert schema for userInventory table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertUserInventorySchema = createInsertSchema(userInventory)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    usdaData: z.any().optional(),
    barcodeData: z.any().optional(),
  });

export type InsertUserInventory = z.infer<typeof insertUserInventorySchema>;
export type UserInventory = typeof userInventory.$inferSelect;

/**
 * User Recipes Table
 * 
 * User-saved recipes from manual entry, AI generation, or imports.
 * Core feature for meal planning and inventory management.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - title: Recipe name
 * - description: Brief recipe overview
 * - ingredients: Array of ingredient strings ("2 cups flour", "1 lb chicken")
 * - instructions: Array of step-by-step instructions
 * - servings: Number of servings (default: 4)
 * 
 * Inventory Matching:
 * - usedIngredients: Array of ingredients user currently has (matched from inventory)
 * - missingIngredients: Array of ingredients user needs to buy
 * - Updated when inventory changes or recipe viewed
 * 
 * Recipe Metadata:
 * - prepTime: Preparation time ("15 min", "1 hour")
 * - cookTime: Cooking time ("30 min", "2 hours")
 * - totalTime: Total time (prep + cook)
 * - difficulty: 'easy' | 'medium' | 'hard' (default: medium)
 * - cuisine: Cuisine type (Italian, Mexican, Asian, etc.)
 * - tags: Array of searchable tags (quick, healthy, vegetarian, etc.)
 * 
 * Source Tracking:
 * - source: Recipe origin
 *   - 'manual': User-created from scratch
 *   - 'ai_generated': Created by OpenAI based on inventory
 *   - 'imported': Imported from external source
 * - aiPrompt: If AI-generated, stores the prompt used (for regeneration)
 * 
 * Dietary Information:
 * - dietaryInfo: Array of dietary labels (vegetarian, vegan, gluten-free, etc.)
 * - Used for filtering recipes by user preferences
 * 
 * Equipment Requirements:
 * - neededEquipment: Array of required appliances/cookware
 *   - Example: ["oven", "stand mixer", "9x13 baking pan"]
 *   - Used for recipe filtering based on userAppliances
 * 
 * Nutrition:
 * - nutrition: JSONB with NutritionInfo per serving
 *   - Calculated from ingredient USDA data
 *   - Aggregated to recipe level
 *   - Scaled based on servings
 * 
 * User Engagement:
 * - rating: User rating (1-5 stars, optional)
 * - notes: User notes (modifications, results, tips)
 * - isFavorite: Quick-access flag for favorite recipes
 * - imageUrl: Recipe photo (AI-generated, uploaded, or imported)
 * 
 * Timestamps:
 * - createdAt: When recipe was saved
 * - updatedAt: Last modification timestamp
 * 
 * Business Rules:
 * - Ingredient matching runs when recipe viewed or inventory changes
 * - Missing ingredients can be added to shopping list
 * - Recipes with all ingredients highlighted as "Ready to Cook"
 * - Favorite recipes appear in quick-access list
 * - AI-generated recipes can be regenerated with same prompt
 * 
 * Recipe Matching Algorithm:
 * 1. Parse ingredient strings (quantity, unit, name)
 * 2. Fuzzy match against user inventory names
 * 3. Split into usedIngredients vs missingIngredients
 * 4. Calculate match percentage (used / total)
 * 5. Suggest recipes with high match percentage
 * 
 * Indexes:
 * - user_recipes_user_id_idx: User's recipe collection
 * - user_recipes_is_favorite_idx: Quick favorite recipe access
 * - user_recipes_created_at_idx: Chronological sorting
 * 
 * Relationships:
 * - users → userRecipes: CASCADE
 * - userRecipes ← mealPlans: Referenced by recipeId
 * - userRecipes ← userShopping: Referenced by recipeId
 */
export const userRecipes = pgTable("user_recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  ingredients: text("ingredients").array().notNull(),
  instructions: text("instructions").array().notNull(),
  usedIngredients: text("used_ingredients").array().notNull().default([]),
  missingIngredients: text("missing_ingredients").array(),
  prepTime: text("prep_time"),
  cookTime: text("cook_time"),
  totalTime: text("total_time"),
  servings: integer("servings").notNull().default(4),
  difficulty: text("difficulty").default("medium"),
  cuisine: text("cuisine"),
  category: text("category"), // Recipe category for ML categorization
  dietaryInfo: jsonb("dietary_info").$type<string[]>(),
  imageUrl: text("image_url"),
  source: text("source"), // 'manual', 'ai_generated', 'imported'
  aiPrompt: text("ai_prompt"), // If AI generated, store the prompt
  rating: integer("rating"), // 1-5 rating
  notes: text("notes"),
  nutrition: jsonb("nutrition").$type<any>(),
  tags: jsonb("tags").$type<string[]>(),
  neededEquipment: jsonb("needed_equipment").$type<string[]>(), // Required appliances, cookware, bakeware
  isFavorite: boolean("is_favorite").notNull().default(false),
  similarityHash: text("similarity_hash"), // Hash for duplicate detection using embeddings
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("user_recipes_user_id_idx").on(table.userId),
  index("user_recipes_is_favorite_idx").on(table.isFavorite),
  index("user_recipes_created_at_idx").on(table.createdAt),
]);

/**
 * Insert schema for userRecipes table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertRecipeSchema = createInsertSchema(userRecipes)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    dietaryInfo: z.array(z.string()).optional(),
    nutrition: z.any().optional(),
    tags: z.array(z.string()).optional(),
    neededEquipment: z.array(z.string()).optional(),
  });

export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type Recipe = typeof userRecipes.$inferSelect;

/**
 * Meal Plans Table
 * 
 * User's planned meals organized by date and meal type.
 * Links recipes to specific meals for scheduling and preparation.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - recipeId: Foreign key to userRecipes.id (CASCADE delete)
 * - date: Meal date (YYYY-MM-DD format)
 * - mealType: Meal category
 *   - 'breakfast': Morning meal
 *   - 'lunch': Midday meal
 *   - 'dinner': Evening meal
 *   - 'snack': Snacks or desserts
 * - servings: Number of servings to prepare (default: 1)
 * - notes: Meal-specific notes (timing, prep ahead, modifications)
 * - isCompleted: Meal preparation/consumption status
 * - createdAt: When meal was planned
 * 
 * Meal Planning Flow:
 * 1. User selects recipe and date
 * 2. Choose mealType and servings
 * 3. Recipe added to calendar
 * 4. Missing ingredients added to shopping list
 * 5. Mark isCompleted when meal prepared
 * 
 * Calendar Features:
 * - Week view: Show all meals for 7 days
 * - Day view: Detailed meal schedule for single day
 * - Month view: High-level meal planning overview
 * - Drag-and-drop: Move meals between dates/mealTypes
 * 
 * Shopping List Integration:
 * - When meal planned → missing ingredients → shopping list
 * - Batch shopping list for entire week
 * - Check off items as purchased
 * 
 * Business Rules:
 * - One recipe can be planned multiple times (different dates/meals)
 * - Servings adjustable per meal plan instance
 * - Recipe nutrition scaled by servings for daily totals
 * - Completed meals affect inventory (optional feature)
 * - Deleting recipe deletes associated meal plans (CASCADE)
 * 
 * Nutrition Tracking:
 * - Aggregate nutrition by date
 * - Daily totals from planned meals
 * - Scaled by servings per meal
 * - Used for dietary goal tracking
 * 
 * Indexes:
 * - meal_plans_user_id_idx: User's meal plans
 * - meal_plans_recipe_id_idx: Recipe usage tracking
 * - meal_plans_date_idx: Calendar date queries
 * - meal_plans_meal_type_idx: Filter by meal category
 * 
 * Relationships:
 * - users → mealPlans: CASCADE
 * - userRecipes → mealPlans: CASCADE
 * 
 * Usage Example:
 * ```typescript
 * // Get week's meal plan
 * const weekMeals = await db
 *   .select()
 *   .from(mealPlans)
 *   .where(
 *     and(
 *       eq(mealPlans.userId, userId),
 *       gte(mealPlans.date, startDate),
 *       lte(mealPlans.date, endDate)
 *     )
 *   )
 *   .orderBy(mealPlans.date, mealPlans.mealType);
 * ```
 */
export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recipeId: varchar("recipe_id").notNull().references(() => userRecipes.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD format
  mealType: text("meal_type").notNull(), // 'breakfast', 'lunch', 'dinner', 'snack'
  servings: integer("servings").notNull().default(1),
  notes: text("notes"),
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("meal_plans_user_id_idx").on(table.userId),
  index("meal_plans_recipe_id_idx").on(table.recipeId),
  index("meal_plans_date_idx").on(table.date),
  index("meal_plans_meal_type_idx").on(table.mealType),
]);

export const insertMealPlanSchema = createInsertSchema(mealPlans).omit({
  id: true,
  createdAt: true,
});

export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;

/**
 * API Usage Logs Table
 * 
 * Tracks external API calls for cost monitoring and analytics.
 * Helps identify usage patterns and optimize API consumption.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - apiName: API service identifier
 *   - 'openai': ChatGPT API calls
 *   - 'barcode_lookup': Barcode product lookup
 *   - 'usda': USDA FoodData Central
 *   - 'stripe': Payment processing
 *   - Others as integrated
 * - endpoint: Specific API endpoint called
 * - queryParams: Query string or request parameters
 * - statusCode: HTTP response status code (200, 404, 500, etc.)
 * - success: Boolean success flag (true for 2xx responses)
 * - timestamp: When API call was made
 * 
 * Analytics Use Cases:
 * - Cost Tracking: Count API calls by user for billing
 * - Error Monitoring: Track failed API calls (success: false)
 * - Usage Patterns: Popular endpoints and features
 * - Rate Limiting: Identify users exceeding quotas
 * - Performance: Slow endpoints needing caching
 * 
 * Cost Optimization:
 * - Identify cacheable API calls
 * - Detect duplicate requests
 * - Find opportunities for batching
 * - Track most expensive users
 * 
 * Business Rules:
 * - All external API calls logged (success or failure)
 * - Logs retained for analytics period (e.g., 90 days)
 * - User-specific logs deleted with user account (CASCADE)
 * - Status codes guide error handling improvements
 * 
 * Indexes:
 * - api_usage_logs_user_id_idx: User's API usage
 * - api_usage_logs_api_name_idx: Filter by API service
 * - api_usage_logs_timestamp_idx: Time-based queries
 * - api_usage_logs_success_idx: Error rate analysis
 * 
 * Relationships:
 * - users → apiUsageLogs: CASCADE
 * 
 * Example Queries:
 * ```typescript
 * // Monthly OpenAI API usage by user
 * const usage = await db
 *   .select({
 *     userId: apiUsageLogs.userId,
 *     count: sql<number>`count(*)`,
 *   })
 *   .from(apiUsageLogs)
 *   .where(
 *     and(
 *       eq(apiUsageLogs.apiName, 'openai'),
 *       gte(apiUsageLogs.timestamp, startOfMonth)
 *     )
 *   )
 *   .groupBy(apiUsageLogs.userId);
 * ```
 */
export const apiUsageLogs = pgTable("api_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  apiName: text("api_name").notNull(), // 'openai', 'barcode_lookup', 'usda', 'stripe', etc.
  endpoint: text("endpoint").notNull(),
  queryParams: text("query_params"),
  statusCode: integer("status_code").notNull(),
  success: boolean("success").notNull(),
  timestamp: timestamp("timestamp").notNull(),
}, (table) => [
  index("api_usage_logs_user_id_idx").on(table.userId),
  index("api_usage_logs_api_name_idx").on(table.apiName),
  index("api_usage_logs_timestamp_idx").on(table.timestamp),
  index("api_usage_logs_success_idx").on(table.success),
]);

export const insertApiUsageLogSchema = createInsertSchema(apiUsageLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertApiUsageLog = z.infer<typeof insertApiUsageLogSchema>;
export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;

/**
 * FDC Cache Table
 * 
 * Caches USDA FoodData Central API responses.
 * Reduces API calls and improves performance for food lookups.
 * 
 * Fields:
 * - id: Primary key (custom format, not auto-generated)
 * - fdcId: USDA FDC ID (unique food identifier)
 * - dataType: Food data type (Branded, SR Legacy, Survey, Foundation)
 * - description: Food description/name
 * - brandOwner: Brand/manufacturer name (for branded foods)
 * - brandName: Brand name (for branded foods)
 * - ingredients: Ingredient list text
 * - servingSize: Serving size value (numeric)
 * - servingSizeUnit: Serving size unit (g, ml, oz, etc.)
 * - nutrients: JSONB with nutrient array from USDA
 * - fullData: Complete USDA API response (JSONB)
 * - cachedAt: When response was cached
 * - lastAccessed: Last time cache entry was used
 * 
 * Cache Strategy:
 * - Cache USDA search results for 30 days
 * - Update lastAccessed on each use
 * - LRU eviction for old, unused entries
 * - Invalidate on USDA data updates (manual)
 * 
 * Performance Benefits:
 * - Instant food lookups (no API latency)
 * - Reduced USDA API quota consumption
 * - Offline food data access
 * - Consistent nutrition data across app
 * 
 * Data Structure:
 * - nutrients: Array of {nutrientId, nutrientName, value, unitName}
 * - fullData: Complete USDA response for advanced features
 * - Serves both quick lookups and detailed nutrition
 * 
 * Business Rules:
 * - Cache populated on USDA API calls
 * - Cache checked before making API request
 * - lastAccessed updated on cache hit
 * - Stale entries (>30 days, low access) purged periodically
 * 
 * Indexes:
 * - fdc_cache_description_idx: Text search on food names
 * - fdc_cache_brand_owner_idx: Filter by brand
 * 
 * Cache Invalidation:
 * - Time-based: Entries older than 30 days
 * - Manual: Admin can clear/refresh cache
 * - Selective: Individual fdcId updates
 * 
 * Usage Example:
 * ```typescript
 * // Check cache before API call
 * let foodData = await db
 *   .select()
 *   .from(fdcCache)
 *   .where(eq(fdcCache.fdcId, fdcId))
 *   .limit(1);
 * 
 * if (!foodData.length) {
 *   // Cache miss - call USDA API
 *   foodData = await fetchFromUSDA(fdcId);
 *   await db.insert(fdcCache).values(foodData);
 * } else {
 *   // Cache hit - update lastAccessed
 *   await db
 *     .update(fdcCache)
 *     .set({ lastAccessed: new Date() })
 *     .where(eq(fdcCache.id, foodData[0].id));
 * }
 * ```
 */
export const fdcCache = pgTable("fdc_cache", {
  id: varchar("id").primaryKey(),  // Changed to match database
  fdcId: text("fdc_id").notNull(),
  dataType: text("data_type"), // Nullable to match database
  description: text("description").notNull(),
  brandOwner: text("brand_owner"),
  brandName: text("brand_name"),
  ingredients: text("ingredients"),
  servingSize: real("serving_size"),
  servingSizeUnit: text("serving_size_unit"),
  nutrients: jsonb("nutrients").$type<any>(),  // Changed from foodNutrients to match database
  fullData: jsonb("full_data").$type<any>(),  // Nullable to match database
  cachedAt: timestamp("cached_at").notNull(),
  lastAccessed: timestamp("last_accessed").notNull(),  // Added to match database
}, (table) => [
  index("fdc_cache_description_idx").on(table.description),
  index("fdc_cache_brand_owner_idx").on(table.brandOwner),
]);

/**
 * Insert schema for fdcCache table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertFdcCacheSchema = createInsertSchema(fdcCache)
  .omit({
    id: true,
    cachedAt: true,
    lastAccessed: true,
  })
  .extend({
    nutrients: z.any().optional(),
    fullData: z.any().optional(),
  });

export type InsertFdcCache = z.infer<typeof insertFdcCacheSchema>;
export type FdcCache = typeof fdcCache.$inferSelect;


/**
 * User Shopping List Table
 * 
 * Items user needs to purchase at grocery store.
 * Integrated with recipes and inventory management.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - ingredient: Item name/description
 * - quantity: Amount to purchase (optional, text)
 * - unit: Measurement unit (optional)
 * - recipeId: Foreign key to userRecipes.id (SET NULL if recipe deleted)
 * - fdcId: USDA FoodData Central ID for nutrition lookup
 * - isChecked: Purchase completion status
 * - createdAt: When item was added to list
 * 
 * Item Sources:
 * 1. Recipe Missing Ingredients: Auto-added from recipe.missingIngredients
 * 2. Meal Plan: Batch-add missing ingredients for weekly meals
 * 3. Manual Entry: User directly adds items
 * 4. AI Suggestions: Chatbot recommends based on preferences
 * 
 * Shopping Workflow:
 * 1. User views recipe or creates meal plan
 * 2. Missing ingredients added to shopping list
 * 3. User views consolidated shopping list
 * 4. Check items off as purchased (isChecked: true)
 * 5. Checked items can be added to inventory
 * 6. Completed items cleared or archived
 * 
 * Recipe Integration:
 * - recipeId links item to source recipe
 * - Null recipeId for manually added items
 * - Deleting recipe preserves shopping items (SET NULL)
 * - Recipe link enables "Shop for this recipe" feature
 * 
 * Smart Features:
 * - Duplicate detection: Combine similar items
 * - Quantity aggregation: Sum quantities for same ingredient
 * - Category grouping: Organize by store department
 * - Store layout: Sort by aisle (future feature)
 * 
 * Business Rules:
 * - Multiple recipes can contribute same ingredient
 * - Checked items not automatically deleted (user choice)
 * - fdcId enables nutrition tracking for purchased items
 * - Quantity/unit optional for generic items ("bread", "milk")
 * 
 * Indexes:
 * - user_shopping_list_items_user_id_idx: User's shopping list
 * - user_shopping_list_items_is_checked_idx: Filter active vs completed
 * - user_shopping_list_items_recipe_id_idx: Recipe-specific items
 * 
 * Relationships:
 * - users → userShopping: CASCADE
 * - userRecipes → userShopping: SET NULL
 * - fdcCache ← userShopping: Referenced by fdcId
 * 
 * Usage Example:
 * ```typescript
 * // Add recipe missing ingredients to shopping list
 * for (const ingredient of recipe.missingIngredients) {
 *   await db.insert(userShopping).values({
 *     userId,
 *     ingredient,
 *     recipeId: recipe.id,
 *     isChecked: false,
 *     createdAt: new Date(),
 *   });
 * }
 * ```
 */
export const userShopping = pgTable("user_shopping", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ingredient: text("ingredient").notNull(),  // Changed from 'name' to match database
  quantity: text("quantity"),
  unit: text("unit"),
  recipeId: varchar("recipe_id").references(() => userRecipes.id, { onDelete: "set null" }), // If from a recipe
  isChecked: boolean("is_checked").notNull().default(false),
  createdAt: timestamp("created_at").notNull(),
  fdcId: text("fdc_id"), // Added to match database
}, (table) => [
  index("user_shopping_list_items_user_id_idx").on(table.userId),
  index("user_shopping_list_items_is_checked_idx").on(table.isChecked),
  index("user_shopping_list_items_recipe_id_idx").on(table.recipeId),
]);

export const insertShoppingListItemSchema = createInsertSchema(userShopping).omit({
  id: true,
  createdAt: true,
});

export type InsertShoppingListItem = z.infer<typeof insertShoppingListItemSchema>;
export type ShoppingListItem = typeof userShopping.$inferSelect;

/**
 * Nutrition Info Interface
 * 
 * TypeScript interface for nutrition data structure.
 * Used throughout app for consistent nutrition representation.
 * 
 * Macronutrients (g):
 * - calories: Energy (kcal)
 * - protein: Protein (g)
 * - carbs: Total carbohydrates (g)
 * - fat: Total fat (g)
 * - fiber: Dietary fiber (g)
 * - sugar: Sugars (g)
 * 
 * Fats (g):
 * - saturatedFat: Saturated fatty acids
 * - transFat: Trans fatty acids
 * - cholesterol: Cholesterol (mg)
 * 
 * Minerals (mg):
 * - sodium: Sodium
 * - calcium: Calcium
 * - iron: Iron
 * - potassium: Potassium
 * - phosphorus: Phosphorus
 * - magnesium: Magnesium
 * - zinc: Zinc
 * - selenium: Selenium (µg)
 * - copper: Copper
 * - manganese: Manganese
 * 
 * Vitamins:
 * - vitaminA: Vitamin A (µg RAE)
 * - vitaminC: Vitamin C (mg)
 * - vitaminD: Vitamin D (µg)
 * - vitaminE: Vitamin E (mg)
 * - vitaminK: Vitamin K (µg)
 * - thiamin: Vitamin B1 (mg)
 * - riboflavin: Vitamin B2 (mg)
 * - niacin: Vitamin B3 (mg)
 * - vitaminB6: Vitamin B6 (mg)
 * - folate: Folate (µg DFE)
 * - vitaminB12: Vitamin B12 (µg)
 * - pantothenicAcid: Vitamin B5 (mg)
 * 
 * Serving Info:
 * - servingSize: Serving size amount
 * - servingUnit: Serving size unit
 * 
 * Data Sources:
 * - USDA FoodData Central API
 * - Barcode lookup APIs
 * - User manual entry
 * - Calculated from ingredients
 * 
 * Usage:
 * - userInventory.nutrition: JSON string, parse to NutritionInfo
 * - userRecipes.nutrition: Aggregated from ingredients
 * - Displayed in nutrition labels
 * - Used for dietary goal tracking
 * 
 * All fields optional to handle partial nutrition data.
 */
export interface NutritionInfo {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize?: string;
  servingUnit?: string;
  saturatedFat?: number;
  transFat?: number;
  cholesterol?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  vitaminA?: number;
  vitaminC?: number;
  vitaminD?: number;
  vitaminE?: number;
  vitaminK?: number;
  thiamin?: number;
  riboflavin?: number;
  niacin?: number;
  vitaminB6?: number;
  folate?: number;
  vitaminB12?: number;
  pantothenicAcid?: number;
  phosphorus?: number;
  magnesium?: number;
  zinc?: number;
  selenium?: number;
  copper?: number;
  manganese?: number;
}

/**
 * USDA FoodData Central Types
 * 
 * TypeScript interfaces for USDA FoodData Central API responses.
 * Provides type safety for food search and nutrition data.
 * 
 * USDAFoodItem:
 * Core food item from USDA database.
 * 
 * Fields:
 * - fdcId: Unique USDA food identifier
 * - description: Food name/description
 * - dataType: Food data source
 *   - 'Branded': Commercial products with UPC
 *   - 'SR Legacy': USDA Standard Reference
 *   - 'Survey (FNDDS)': Food and Nutrient Database for Dietary Studies
 *   - 'Foundation': Foundational foods with detailed nutrient data
 * - gtinUpc: UPC barcode (for branded foods)
 * - brandOwner: Manufacturer/brand owner
 * - brandName: Brand name
 * - ingredients: Ingredient list text
 * - marketCountry: Country where food is sold
 * - foodCategory: USDA food category
 * - packageWeight: Package size description
 * - servingSize: Numeric serving size
 * - servingSizeUnit: Serving size unit
 * - foodNutrients: Array of nutrient values
 *   - nutrientId: USDA nutrient ID
 *   - nutrientName: Nutrient name (Protein, Calcium, etc.)
 *   - nutrientNumber: USDA nutrient number (standardized)
 *   - unitName: Unit (g, mg, µg, kcal)
 *   - value: Nutrient amount
 * - nutrition: Transformed nutrition data (app-specific format)
 * - score: Search relevance score
 * - allHighlightFields: Search match highlights
 * 
 * USDASearchResponse:
 * API response for food search queries.
 * 
 * Fields:
 * - totalHits: Total matching foods
 * - currentPage: Current page number
 * - totalPages: Total pages available
 * - pageList: Available page numbers
 * - foodSearchCriteria: Search parameters used
 *   - query: Search query string
 *   - pageNumber: Requested page
 *   - pageSize: Results per page
 *   - dataType: Filter by food data types
 * - foods: Array of USDAFoodItem results
 * - aggregations: Search result statistics
 *   - dataType: Count by data type
 *   - nutrients: Count by nutrient availability
 * 
 * Usage:
 * - Type safety for USDA API integration
 * - Food search result parsing
 * - Nutrition data extraction
 * - Cache type definitions
 */
export interface USDAFoodItem {
  fdcId: number;
  description: string;
  dataType?: string;
  gtinUpc?: string;
  brandOwner?: string;
  brandName?: string;
  ingredients?: string;
  marketCountry?: string;
  foodCategory?: string;
  allHighlightFields?: string;
  score?: number;
  packageWeight?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: Array<{
    nutrientId: number;
    nutrientName: string;
    nutrientNumber?: string;
    unitName: string;
    value: number;
  }>;
  nutrition?: any; // Computed/transformed nutrition data for compatibility
  finalFoodInputFoods?: Array<any>;
  foodMeasures?: Array<any>;
  foodAttributes?: Array<any>;
  foodAttributeTypes?: Array<any>;
  foodVersionIds?: Array<any>;
}

export interface USDASearchResponse {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  pageList: number[];
  foodSearchCriteria: {
    query: string;
    generalSearchInput?: string;
    pageNumber: number;
    numberOfResults?: number;
    pageSize?: number;
    requireAllWords?: boolean;
    dataType?: string[];
  };
  foods: USDAFoodItem[];
  aggregations?: {
    dataType?: Record<string, number>;
    nutrients?: Record<string, number>;
  };
}

/**
 * User Feedback Table
 * 
 * Comprehensive user feedback and issue tracking system.
 * Supports bug reports, feature requests, and user suggestions.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (SET NULL - allow anonymous)
 * - userEmail: Email for anonymous feedback follow-up
 * 
 * Feedback Content:
 * - type: Feedback category
 *   - 'bug': Something broken or not working
 *   - 'feature_request': New feature suggestion
 *   - 'improvement': Enhancement to existing feature
 *   - 'praise': Positive feedback
 *   - 'other': General feedback
 * - category: Feature area (ui, performance, functionality, content, api, etc.)
 * - subject: Brief title/summary
 * - description: Detailed feedback text
 * 
 * Context Metadata:
 * - url: Page URL where feedback submitted
 * - userAgent: Browser/device information
 * - appVersion: Application version number
 * 
 * Classification:
 * - sentiment: Feedback tone
 *   - 'positive': Happy, satisfied users
 *   - 'negative': Frustrated, unhappy users
 *   - 'neutral': Informational feedback
 * - priority: Urgency level
 *   - 'low': Nice to have, minor issues
 *   - 'medium': Should address soon
 *   - 'high': Important, affects many users
 *   - 'critical': Urgent, blocking functionality
 * 
 * Status Tracking:
 * - status: Feedback lifecycle state
 *   - 'pending': New, not yet reviewed
 *   - 'in_review': Team reviewing feedback
 *   - 'in_progress': Work started
 *   - 'resolved': Issue fixed or request implemented
 *   - 'closed': Resolved and verified
 *   - 'wont_fix': Declined or out of scope
 * - resolution: Resolution notes/explanation
 * - resolvedAt: When feedback was resolved
 * 
 * Engagement (JSONB Arrays):
 * - upvotes: Array of {userId, createdAt}
 *   - Users can upvote feedback to show support
 *   - Used for prioritization (popular requests)
 *   - One upvote per user
 * - responses: Array of {responderId, response, action, createdAt}
 *   - Admin/team responses to feedback
 *   - Communication thread
 *   - Action items documented
 * 
 * Additional Data:
 * - attachments: Array of file URLs (screenshots, videos, logs)
 * - tags: Array of string tags for categorization
 * 
 * Timestamps:
 * - createdAt: When feedback was submitted
 * - updatedAt: Last modification timestamp
 * - resolvedAt: When status changed to resolved
 * 
 * Business Rules:
 * - Anonymous feedback allowed (userId can be null)
 * - Email required for anonymous feedback follow-up
 * - Authenticated users auto-fill email from profile
 * - Upvotes stored as JSONB array (no separate table)
 * - Responses stored as JSONB array (no separate table)
 * - Priority auto-assigned based on type and sentiment
 * - Status workflow enforced (pending → in_review → in_progress → resolved)
 * 
 * Workflow:
 * 1. User submits feedback → status: 'pending'
 * 2. Admin reviews → status: 'in_review', assigns priority
 * 3. Work begins → status: 'in_progress'
 * 4. Fix deployed → status: 'resolved', resolution notes added
 * 5. User notified → status: 'closed'
 * 
 * Analytics:
 * - Most upvoted requests (prioritization)
 * - Sentiment trends (user satisfaction)
 * - Response time metrics (avg time to resolution)
 * - Category distribution (problem areas)
 * - Resolution rate (closed / total)
 * 
 * Indexes:
 * - user_feedback_user_id_idx: User's feedback history
 * - user_feedback_type_idx: Filter by feedback type
 * - user_feedback_status_idx: Filter by status
 * - user_feedback_priority_idx: Sort by priority
 * - user_feedback_created_at_idx: Chronological sorting
 * 
 * Relationships:
 * - users → userFeedback: SET NULL (preserve feedback after user deletion)
 */
export const userFeedback = pgTable("user_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Allow anonymous feedback
  userEmail: text("user_email"), // For anonymous feedback
  
  // Feedback content
  type: text("type").notNull(), // 'bug', 'feature_request', 'improvement', 'praise', 'other'
  category: text("category"), // 'ui', 'performance', 'functionality', 'content', 'api', etc.
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  
  // Metadata
  url: text("url"), // Page where feedback was submitted
  userAgent: text("user_agent"),
  appVersion: text("app_version"),
  
  // Sentiment and priority
  sentiment: text("sentiment"), // 'positive', 'negative', 'neutral'
  priority: text("priority"), // 'low', 'medium', 'high', 'critical'
  
  // Status tracking
  status: text("status").notNull().default('pending'), // 'pending', 'in_review', 'in_progress', 'resolved', 'closed', 'wont_fix'
  resolution: text("resolution"),
  
  // Engagement tracking - Now as JSONB arrays to avoid separate tables
  upvotes: jsonb("upvotes").$type<Array<{userId: string; createdAt: string}>>().default([]),
  responses: jsonb("responses").$type<Array<{
    responderId: string;
    response: string;
    action?: string;
    createdAt: string;
  }>>().default([]),
  
  // Additional data
  attachments: jsonb("attachments").$type<string[]>(), // URLs to uploaded files
  tags: jsonb("tags").$type<string[]>(),
  
  // Timestamps
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => [
  index("user_feedback_user_id_idx").on(table.userId),
  index("user_feedback_type_idx").on(table.type),
  index("user_feedback_status_idx").on(table.status),
  index("user_feedback_priority_idx").on(table.priority),
  index("user_feedback_created_at_idx").on(table.createdAt),
]);

export const insertFeedbackSchema = createInsertSchema(userFeedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  upvotes: true,
  responses: true,
}).extend({
  type: z.enum(['bug', 'feature_request', 'improvement', 'praise', 'other']),
  sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['pending', 'in_review', 'in_progress', 'resolved', 'closed', 'wont_fix']).default('pending'),
});

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof userFeedback.$inferSelect & {
  // Add computed/optional fields that may be present in API responses
  content?: string; // Alias for description for backward compatibility
  rating?: number | null; // Optional rating field
  upvoteCount?: number; // Computed from upvotes array length
  estimatedTurnaround?: string | null; // Optional ETA for completion
};

// Feedback Upvotes and Responses - MERGED INTO feedback TABLE AS JSONB ARRAYS
// Types preserved for backward compatibility during migration
export type FeedbackUpvote = {
  userId: string;
  createdAt: string;
};

export type FeedbackResponse = {
  responderId: string;
  response: string;
  action?: string;
  createdAt: string;
};

// Feedback Analytics Aggregations (for dashboard)
export type FeedbackAnalytics = {
  totalFeedback: number;
  averageRating: number | null;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  typeDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  recentTrends: {
    date: string;
    count: number;
    averageSentiment: number;
  }[];
  topIssues: {
    category: string;
    count: number;
    priority: string;
  }[];
};

/**
 * Donations Table
 * 
 * Tracks Stripe donation payments from users.
 * Supports one-time and recurring donations.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (SET NULL - preserve anonymous donations)
 * - stripePaymentIntentId: Stripe Payment Intent ID (unique)
 * - amount: Donation amount in cents (e.g., 1000 = $10.00)
 * - currency: Currency code (usd, eur, gbp, etc.)
 * - status: Payment status
 *   - 'succeeded': Payment completed
 *   - 'pending': Processing
 *   - 'failed': Payment failed
 *   - 'refunded': Donation refunded
 * - donorEmail: Email for receipt (from Stripe or user profile)
 * - donorName: Donor name (from Stripe or user profile)
 * - message: Optional message from donor
 * - isRecurring: Flag for subscription vs one-time
 * - stripeSubscriptionId: Subscription ID for recurring donations
 * - createdAt: When donation was made
 * - updatedAt: Last status update
 * 
 * Payment Flow:
 * 1. User initiates donation
 * 2. Stripe checkout session created
 * 3. User completes payment on Stripe
 * 4. Webhook received → create donation record
 * 5. Status updated based on payment outcome
 * 6. Receipt emailed to donor
 * 
 * Recurring Donations:
 * - isRecurring: true
 * - stripeSubscriptionId: Links to Stripe subscription
 * - Multiple donation records (one per charge)
 * - Webhooks create new record each billing cycle
 * 
 * Business Rules:
 * - Anonymous donations allowed (userId can be null)
 * - Amounts stored in cents (no floating point issues)
 * - Stripe IDs must be unique (prevent duplicate records)
 * - Email required for receipt delivery
 * - Refunds update status but preserve record
 * - Subscription cancellation stops future donations
 * 
 * Tax Receipts:
 * - donorEmail: Receipt delivery
 * - donorName: Tax receipt name
 * - amount + currency: Receipt amount
 * - createdAt: Receipt date
 * - Generated for status: 'succeeded'
 * 
 * Indexes:
 * - donations_user_id_idx: User's donation history
 * - donations_stripe_payment_intent_id_idx: Unique Stripe ID
 * - donations_status_idx: Filter by payment status
 * - donations_created_at_idx: Chronological sorting
 * 
 * Relationships:
 * - users → donations: SET NULL (preserve donation records)
 * 
 * Referenced from: blueprint:javascript_stripe
 */
export const donations = pgTable("donations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Optional - allow anonymous donations
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull().unique(),
  amount: integer("amount").notNull(), // Amount in cents
  currency: text("currency").notNull().default('usd'),
  status: text("status").notNull(), // 'succeeded', 'pending', 'failed', 'refunded'
  donorEmail: text("donor_email"),
  donorName: text("donor_name"),
  message: text("message"), // Optional message from donor
  isRecurring: boolean("is_recurring").notNull().default(false),
  stripeSubscriptionId: text("stripe_subscription_id"), // For recurring donations
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("donations_user_id_idx").on(table.userId),
  index("donations_stripe_payment_intent_id_idx").on(table.stripePaymentIntentId),
  index("donations_status_idx").on(table.status),
  index("donations_created_at_idx").on(table.createdAt),
]);

export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donations.$inferSelect;

/**
 * Web Vitals Table
 * 
 * Core Web Vitals performance metrics tracking.
 * Monitors real user performance for optimization insights.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (SET NULL - track anonymous users)
 * - sessionId: Browser session identifier
 * - name: Web Vital metric name
 *   - 'LCP': Largest Contentful Paint (loading performance)
 *   - 'FID': First Input Delay (interactivity)
 *   - 'CLS': Cumulative Layout Shift (visual stability)
 *   - 'FCP': First Contentful Paint (initial rendering)
 *   - 'TTFB': Time to First Byte (server response)
 *   - 'INP': Interaction to Next Paint (responsiveness)
 * - value: Metric value (milliseconds or score)
 * - delta: Change from previous navigation
 * - metricId: Unique metric instance ID
 * - rating: Performance rating
 *   - 'good': Meets performance threshold
 *   - 'needs-improvement': Below optimal
 *   - 'poor': Performance issue
 * - navigationType: Navigation type (navigate, reload, back_forward)
 * - url: Page URL where metric measured
 * - createdAt: When metric was captured
 * 
 * Core Web Vitals Thresholds:
 * 
 * LCP (Largest Contentful Paint):
 * - Good: ≤ 2.5s
 * - Needs Improvement: 2.5s - 4.0s
 * - Poor: > 4.0s
 * 
 * FID (First Input Delay):
 * - Good: ≤ 100ms
 * - Needs Improvement: 100ms - 300ms
 * - Poor: > 300ms
 * 
 * CLS (Cumulative Layout Shift):
 * - Good: ≤ 0.1
 * - Needs Improvement: 0.1 - 0.25
 * - Poor: > 0.25
 * 
 * FCP (First Contentful Paint):
 * - Good: ≤ 1.8s
 * - Needs Improvement: 1.8s - 3.0s
 * - Poor: > 3.0s
 * 
 * TTFB (Time to First Byte):
 * - Good: ≤ 800ms
 * - Needs Improvement: 800ms - 1800ms
 * - Poor: > 1800ms
 * 
 * INP (Interaction to Next Paint):
 * - Good: ≤ 200ms
 * - Needs Improvement: 200ms - 500ms
 * - Poor: > 500ms
 * 
 * Performance Monitoring:
 * - Real user metrics (RUM)
 * - Aggregated by page, device, user
 * - Identify slow pages
 * - Track performance over time
 * - User experience optimization
 * 
 * Business Rules:
 * - Metrics captured on page load and interaction
 * - Anonymous users tracked (userId null)
 * - SessionId groups metrics by visit
 * - Rating auto-assigned based on thresholds
 * - Used for performance dashboards
 * 
 * Analytics:
 * - 75th percentile values (Core Web Vitals standard)
 * - Performance trends over time
 * - Slow pages identification
 * - Device/browser comparisons
 * - Regression detection
 * 
 * Indexes:
 * - web_vitals_user_id_idx: User-specific performance
 * - web_vitals_name_idx: Filter by metric type
 * - web_vitals_created_at_idx: Time series analysis
 * - web_vitals_rating_idx: Filter by performance rating
 * 
 * Relationships:
 * - users → webVitals: SET NULL (preserve metrics)
 * 
 * Data Collection:
 * - web-vitals library (Google)
 * - Automatic instrumentation
 * - Sent to backend on visibility change
 * - Batched for efficiency
 */
export const webVitals = pgTable("web_vitals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionId: text("session_id").notNull(),
  
  // Event details
  name: text("name").notNull(), // 'LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP'
  value: real("value").notNull(),
  delta: real("delta").notNull(),
  metricId: text("metric_id").notNull(),
  rating: text("rating").notNull(), // 'good', 'needs-improvement', 'poor'
  navigationType: text("navigation_type"),
  url: text("url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("web_vitals_user_id_idx").on(table.userId),
  index("web_vitals_name_idx").on(table.name),
  index("web_vitals_created_at_idx").on(table.createdAt),
  index("web_vitals_rating_idx").on(table.rating),
]);

export const insertWebVitalSchema = createInsertSchema(webVitals).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.enum(['LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'INP']),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  value: z.number(),
  delta: z.number(),
  metricId: z.string(),
});

export type InsertWebVital = z.infer<typeof insertWebVitalSchema>;
export type WebVital = typeof webVitals.$inferSelect;

/**
 * Content Embeddings Table
 * 
 * Stores vector embeddings for semantic search and similarity matching.
 * Enables ML-powered content discovery across recipes, inventory, and chats.
 * 
 * Fields:
 * - id: UUID primary key
 * - contentId: ID of the content (recipe, ingredient, chat message)
 * - contentType: Type of content (recipe, inventory, chat, meal_plan)
 * - embedding: Vector embedding as JSONB array (1536 dimensions for ada-002)
 * - embeddingModel: Model used (text-embedding-ada-002)
 * - contentText: Original text that was embedded
 * - metadata: Additional context (title, category, tags)
 * - userId: Foreign key to users.id (CASCADE delete)
 * - createdAt: Embedding creation timestamp
 * - updatedAt: Last update timestamp
 * 
 * Business Rules:
 * - One embedding per content item
 * - Regenerate on content update
 * - Used for semantic search and similarity
 * 
 * Indexes:
 * - content_embeddings_user_id_idx: User's embeddings
 * - content_embeddings_content_idx: Unique per content item
 */
export const contentEmbeddings = pgTable("content_embeddings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  contentType: text("content_type").notNull(), // 'recipe', 'inventory', 'chat', 'meal_plan'
  embedding: jsonb("embedding").notNull().$type<number[]>(), // Vector array
  embeddingModel: text("embedding_model").notNull().default('text-embedding-ada-002'),
  contentText: text("content_text").notNull(),
  metadata: jsonb("metadata").$type<{
    title?: string;
    category?: string;
    tags?: string[];
    description?: string;
  }>(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("content_embeddings_user_id_idx").on(table.userId),
  uniqueIndex("content_embeddings_content_idx").on(table.contentId, table.contentType, table.userId),
]);

/**
 * Insert schema for contentEmbeddings table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertContentEmbeddingSchema = createInsertSchema(contentEmbeddings)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    embedding: z.array(z.number()),
    metadata: contentEmbeddingMetadataSchema.optional(),
  });

export type InsertContentEmbedding = z.infer<typeof insertContentEmbeddingSchema>;
export type ContentEmbedding = typeof contentEmbeddings.$inferSelect;

/**
 * Search Logs Table
 * 
 * Tracks search queries and user interactions for analytics.
 * 
 * Fields:
 * - id: UUID primary key
 * - query: Original search query text
 * - searchType: 'semantic' | 'keyword' | 'natural_language'
 * - userId: Foreign key to users.id (CASCADE delete)
 * - resultsCount: Number of results returned
 * - clickedResultId: ID of result user clicked (if any)
 * - clickedResultType: Type of clicked result
 * - searchLatency: Time to execute search in ms
 * - timestamp: When search was performed
 * 
 * Analytics:
 * - Click-through rate by query type
 * - Popular search terms
 * - Search performance metrics
 */
export const searchLogs = pgTable("search_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  query: text("query").notNull(),
  searchType: text("search_type").notNull().default('semantic'),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  resultsCount: integer("results_count").notNull(),
  clickedResultId: varchar("clicked_result_id"),
  clickedResultType: text("clicked_result_type"),
  clickPosition: integer("click_position"), // Position of the clicked result in the list
  timeToClick: integer("time_to_click"), // Time in milliseconds from search to click
  searchLatency: integer("search_latency"), // milliseconds
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  index("search_logs_user_id_idx").on(table.userId),
  index("search_logs_timestamp_idx").on(table.timestamp),
]);

export const insertSearchLogSchema = createInsertSchema(searchLogs).omit({
  id: true,
  timestamp: true,
});

export type InsertSearchLog = z.infer<typeof insertSearchLogSchema>;
export type SearchLog = typeof searchLogs.$inferSelect;

/**
 * Categories Table
 * 
 * Hierarchical categories for content organization.
 * Supports both manual and AI-powered categorization.
 * 
 * Fields:
 * - id: UUID primary key
 * - name: Category name (e.g., "Italian", "Breakfast", "Vegan")
 * - description: Category description
 * - parentId: Parent category for hierarchy (self-referential)
 * - keywords: Keywords for classification
 * - color: UI color for category badges
 * - icon: Icon name for display
 * - sortOrder: Display order
 * - isActive: Soft delete flag
 * - createdAt: Creation timestamp
 * 
 * Hierarchy Example:
 * - Cuisine > Italian > Pasta
 * - Diet > Vegan > Raw
 * - Meal > Breakfast > Quick
 */
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  parentId: varchar("parent_id"),
  keywords: text("keywords").array(),
  color: text("color").default('#3B82F6'),
  icon: text("icon").default('folder'),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("categories_parent_id_idx").on(table.parentId),
  uniqueIndex("categories_name_idx").on(table.name),
]);

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

/**
 * Content Categories Table
 * 
 * Many-to-many relationship between content and categories.
 * Tracks both manual and AI assignments with confidence scores.
 * 
 * Fields:
 * - id: UUID primary key
 * - contentId: ID of categorized content
 * - contentType: Type of content
 * - categoryId: Foreign key to categories.id
 * - confidenceScore: AI confidence (0-1)
 * - isManual: Whether manually assigned
 * - userId: Who categorized it
 * - createdAt: Assignment timestamp
 */
export const contentCategories = pgTable("content_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  contentType: text("content_type").notNull(),
  categoryId: varchar("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
  confidenceScore: real("confidence_score").default(1.0),
  isManual: boolean("is_manual").default(false),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("content_categories_content_idx").on(table.contentId, table.contentType),
  index("content_categories_category_idx").on(table.categoryId),
  index("content_categories_user_idx").on(table.userId),
  uniqueIndex("content_categories_unique_idx").on(table.contentId, table.contentType, table.categoryId, table.userId),
]);

export const insertContentCategorySchema = createInsertSchema(contentCategories).omit({
  id: true,
  createdAt: true,
});

export type InsertContentCategory = z.infer<typeof insertContentCategorySchema>;
export type ContentCategory = typeof contentCategories.$inferSelect;

/**
 * Tags Table
 * 
 * Flexible tagging system for all content types.
 * Generated automatically via NLP or added manually.
 * 
 * Fields:
 * - id: UUID primary key
 * - name: Tag name (lowercase, no spaces)
 * - slug: URL-friendly version
 * - usageCount: Times used across content
 * - createdAt: First use timestamp
 * 
 * Examples:
 * - quick-meals, gluten-free, budget-friendly
 * - summer-recipes, kid-approved, meal-prep
 */
export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  usageCount: integer("usage_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("tags_name_idx").on(table.name),
  uniqueIndex("tags_slug_idx").on(table.slug),
]);

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
});

export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;

/**
 * Content Tags Table
 * 
 * Many-to-many relationship between content and tags.
 * 
 * Fields:
 * - id: UUID primary key
 * - contentId: Tagged content ID
 * - contentType: Type of content
 * - tagId: Foreign key to tags.id
 * - relevanceScore: AI-assigned relevance (0-1)
 * - isManual: Manual vs auto-generated
 * - userId: Who added the tag
 * - createdAt: Tag assignment timestamp
 */
export const contentTags = pgTable("content_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  contentType: text("content_type").notNull(),
  tagId: varchar("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
  relevanceScore: real("relevance_score").default(1.0),
  isManual: boolean("is_manual").default(false),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("content_tags_content_idx").on(table.contentId, table.contentType),
  index("content_tags_tag_idx").on(table.tagId),
  index("content_tags_user_idx").on(table.userId),
  uniqueIndex("content_tags_unique_idx").on(table.contentId, table.contentType, table.tagId, table.userId),
]);

export const insertContentTagSchema = createInsertSchema(contentTags).omit({
  id: true,
  createdAt: true,
});

export type InsertContentTag = z.infer<typeof insertContentTagSchema>;
export type ContentTag = typeof contentTags.$inferSelect;

/**
 * Duplicate Pairs Table
 * 
 * Tracks potential duplicate content for deduplication.
 * 
 * Fields:
 * - id: UUID primary key
 * - contentId1: First content item
 * - contentType1: Type of first item
 * - contentId2: Second content item
 * - contentType2: Type of second item
 * - similarityScore: Cosine similarity (0-1)
 * - status: 'pending' | 'duplicate' | 'unique' | 'merged'
 * - reviewedBy: User who reviewed
 * - reviewedAt: Review timestamp
 * - userId: Owner of content
 * - createdAt: Detection timestamp
 */
export const duplicatePairs = pgTable("duplicate_pairs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId1: varchar("content_id_1").notNull(),
  contentType1: text("content_type_1").notNull(),
  contentId2: varchar("content_id_2").notNull(),
  contentType2: text("content_type_2").notNull(),
  similarityScore: real("similarity_score").notNull(),
  status: text("status").notNull().default('pending'),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("duplicate_pairs_user_idx").on(table.userId),
  index("duplicate_pairs_status_idx").on(table.status),
  index("duplicate_pairs_score_idx").on(table.similarityScore),
]);

export const insertDuplicatePairSchema = createInsertSchema(duplicatePairs).omit({
  id: true,
  createdAt: true,
});

export type InsertDuplicatePair = z.infer<typeof insertDuplicatePairSchema>;
export type DuplicatePair = typeof duplicatePairs.$inferSelect;

/**
 * Related Content Cache Table
 * 
 * Caches related content recommendations for performance.
 * 
 * Fields:
 * - id: UUID primary key
 * - contentId: Source content ID
 * - contentType: Type of content
 * - relatedItems: Array of related content with scores
 * - userId: Content owner
 * - expiresAt: Cache expiration
 * - createdAt: Cache creation
 */
export const relatedContentCache = pgTable("related_content_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  contentType: text("content_type").notNull(),
  relatedItems: jsonb("related_items").notNull().$type<Array<{
    id: string;
    type: string;
    title: string;
    score: number;
  }>>(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("related_content_cache_content_idx").on(table.contentId, table.contentType),
  index("related_content_cache_user_idx").on(table.userId),
  index("related_content_cache_expires_idx").on(table.expiresAt),
]);

/**
 * Insert schema for relatedContentCache table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertRelatedContentCacheSchema = createInsertSchema(relatedContentCache)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    relatedItems: z.array(relatedContentItemSchema),
  });

export type InsertRelatedContentCache = z.infer<typeof insertRelatedContentCacheSchema>;
export type RelatedContentCache = typeof relatedContentCache.$inferSelect;

/**
 * Natural Query Logs Table
 * 
 * Logs natural language queries and their SQL translations.
 * Tracks query performance and provides audit trail.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - naturalQuery: User's question in plain English
 * - generatedSql: Translated SQL query
 * - resultCount: Number of results returned
 * - executionTime: Query execution time in ms
 * - error: Error message if failed
 * - userId: Who ran the query
 * - createdAt: Query timestamp
 * 
 * Additional Fields:
 * - queryType: Type of SQL operation (SELECT, INSERT, UPDATE, DELETE)
 * - tablesAccessed: Array of table names accessed in query
 * - isSuccessful: Whether query executed without errors
 * - metadata: JSONB for additional data (model used, confidence score, etc.)
 * - isSaved: Flag if user saved this as a useful query
 * - savedName: User-given name for saved queries
 */
export const queryLogs = pgTable("query_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  naturalQuery: text("natural_query").notNull(),
  generatedSql: text("generated_sql"),
  resultCount: integer("result_count").default(0),
  executionTime: integer("execution_time"), // milliseconds
  error: text("error"),
  queryType: varchar("query_type", { length: 20 }).default('SELECT'),
  tablesAccessed: text("tables_accessed").array(),
  isSuccessful: boolean("is_successful").notNull().default(true),
  metadata: jsonb("metadata").$type<{
    model?: string;
    confidence?: number;
    temperature?: number;
    tokensUsed?: number;
    explanations?: string[];
  }>(),
  isSaved: boolean("is_saved").notNull().default(false),
  savedName: varchar("saved_name", { length: 255 }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("query_logs_user_idx").on(table.userId),
  index("query_logs_created_idx").on(table.createdAt),
  index("query_logs_is_saved_idx").on(table.isSaved),
]);

/**
 * Insert schema for queryLogs table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertQueryLogSchema = createInsertSchema(queryLogs)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    metadata: queryLogMetadataSchema.optional(),
  });

export type InsertQueryLog = z.infer<typeof insertQueryLogSchema>;
export type QueryLog = typeof queryLogs.$inferSelect;

/**
 * Analytics Events Table
 * 
 * Tracks user interactions and behaviors throughout the application.
 * Provides insights for feature usage, UX optimization, and funnel analysis.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (SET NULL - track anonymous)
 * - sessionId: Browser session identifier (groups events)
 * 
 * Event Classification:
 * - eventType: High-level event category
 *   - 'page_view': Page navigation
 *   - 'feature_use': Feature interaction
 *   - 'button_click': Button/CTA clicks
 *   - 'form_submit': Form submissions
 *   - 'error': Error occurrences
 * - eventCategory: Feature area
 *   - 'navigation', 'inventory', 'recipe', 'chat', 'meal_plan', etc.
 * - eventAction: Specific action taken
 *   - 'add_ingredient', 'generate_recipe', 'save_meal_plan', etc.
 * - eventLabel: Additional context (optional)
 * - eventValue: Numeric value (optional, e.g., quantity, count)
 * 
 * Page Context:
 * - pageUrl: Current page URL
 * - referrer: Previous page URL
 * - timeOnPage: Seconds spent before event (optional)
 * 
 * Device Context:
 * - userAgent: Full browser user agent string
 * - deviceType: 'mobile' | 'tablet' | 'desktop'
 * - browser: Browser name (Chrome, Firefox, Safari, etc.)
 * - os: Operating system (Windows, macOS, iOS, Android, etc.)
 * - screenResolution: Screen dimensions (e.g., "1920x1080")
 * - viewport: Browser viewport dimensions (e.g., "1440x900")
 * 
 * Feature-Specific Data:
 * - properties: JSONB object with event-specific data
 *   - Example: { recipeId: '123', ingredientCount: 5 }
 *   - Flexible schema per event type
 *   - Enables deep analysis without schema changes
 * 
 * Timing:
 * - timestamp: When event occurred
 * - timeOnPage: Time spent on page before event
 * 
 * Example Events:
 * 
 * ```typescript
 * // Recipe generation
 * {
 *   eventType: 'feature_use',
 *   eventCategory: 'recipe',
 *   eventAction: 'generate_ai_recipe',
 *   eventLabel: 'chat',
 *   properties: {
 *     ingredientCount: 5,
 *     missingCount: 2,
 *     generationTime: 3.2
 *   }
 * }
 * 
 * // Inventory add
 * {
 *   eventType: 'feature_use',
 *   eventCategory: 'inventory',
 *   eventAction: 'add_item',
 *   eventLabel: 'barcode_scan',
 *   properties: {
 *     storageLocation: 'refrigerator',
 *     hasNutrition: true
 *   }
 * }
 * 
 * // Error tracking
 * {
 *   eventType: 'error',
 *   eventCategory: 'api',
 *   eventAction: 'api_failure',
 *   eventLabel: 'openai_timeout',
 *   properties: {
 *     endpoint: '/api/chat',
 *     statusCode: 504,
 *     errorMessage: 'Gateway timeout'
 *   }
 * }
 * ```
 * 
 * Analytics Use Cases:
 * - Feature usage tracking (most/least used features)
 * - Funnel analysis (user journey completion rates)
 * - Error monitoring (error frequency, patterns)
 * - Performance insights (feature load times)
 * - Device analytics (mobile vs desktop usage)
 * - User segmentation (power users vs casual)
 * - A/B testing (feature variant performance)
 * 
 * Business Rules:
 * - All user interactions tracked
 * - Anonymous users tracked (userId null)
 * - SessionId groups events by visit
 * - Properties schema varies by event
 * - Timestamps in UTC
 * - Retention: 90 days default
 * 
 * Privacy:
 * - No PII in event properties
 * - User-specific data isolated by userId
 * - Anonymous events for logged-out users
 * - Compliant with analytics best practices
 * 
 * Indexes:
 * - analytics_events_user_id_idx: User-specific events
 * - analytics_events_session_id_idx: Session analytics
 * - analytics_events_event_type_idx: Filter by event type
 * - analytics_events_event_category_idx: Feature area analysis
 * - analytics_events_timestamp_idx: Time series queries
 * 
 * Relationships:
 * - users → analyticsEvents: SET NULL
 */
export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  sessionId: text("session_id").notNull(),
  
  // Event details
  eventType: text("event_type").notNull(), // 'page_view', 'feature_use', 'button_click', 'form_submit', 'error', etc.
  eventCategory: text("event_category").notNull(), // 'navigation', 'inventory', 'recipe', 'chat', 'meal_plan', etc.
  eventAction: text("event_action").notNull(), // Specific action taken
  eventLabel: text("event_label"), // Additional context
  eventValue: real("event_value"), // Numeric value if applicable
  
  // Context
  pageUrl: text("page_url"),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  deviceType: text("device_type"), // 'mobile', 'tablet', 'desktop'
  browser: text("browser"),
  os: text("os"),
  screenResolution: text("screen_resolution"),
  viewport: text("viewport"),
  
  // Feature-specific data
  properties: jsonb("properties").$type<Record<string, any>>(), // Flexible properties for specific events
  
  // Timing
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  timeOnPage: integer("time_on_page"), // Seconds spent on page before event
  
}, (table) => [
  index("analytics_events_user_id_idx").on(table.userId),
  index("analytics_events_session_id_idx").on(table.sessionId),
  index("analytics_events_event_type_idx").on(table.eventType),
  index("analytics_events_event_category_idx").on(table.eventCategory),
  index("analytics_events_timestamp_idx").on(table.timestamp),
]);

/**
 * Insert schema for analyticsEvents table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents)
  .omit({
    id: true,
    timestamp: true,
  })
  .extend({
    eventType: z.string(),
    eventCategory: z.string(),
    eventAction: z.string(),
    sessionId: z.string(),
    properties: z.record(z.any()).optional(),
  });

export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;

/**
 * User Sessions Table
 * 
 * Tracks user session metadata for analytics and engagement metrics.
 * Provides session-level insights beyond individual events.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - sessionId: Unique session identifier (NOT the auth session)
 * - userId: Foreign key to users.id (SET NULL - track anonymous)
 * 
 * Session Duration:
 * - startTime: Session start timestamp
 * - endTime: Session end timestamp (updated on exit)
 * - duration: Total session length in seconds
 * - pageViews: Number of pages viewed in session
 * - events: Number of analytics events in session
 * 
 * Entry/Exit:
 * - entryPage: First page of session (landing page)
 * - exitPage: Last page before session end
 * - referrer: External referrer URL
 * - utmSource: UTM campaign source (e.g., 'google', 'facebook')
 * - utmMedium: UTM campaign medium (e.g., 'cpc', 'email')
 * - utmCampaign: UTM campaign name
 * 
 * Device Context:
 * - userAgent: Full browser user agent
 * - deviceType: 'mobile' | 'tablet' | 'desktop'
 * - browser: Browser name
 * - os: Operating system
 * - country: User's country (from IP geolocation)
 * - region: State/province
 * - city: City
 * 
 * Engagement Metrics:
 * - bounced: Boolean indicating single-page session
 *   - true: Only viewed one page (entryPage === exitPage)
 *   - false: Multiple pages viewed
 * - goalCompletions: Array of completed goal IDs
 *   - Example: ['signup', 'first_recipe', 'donation']
 *   - Tracks conversion events per session
 * 
 * Session Lifecycle:
 * 1. User visits site → create session record
 * 2. Page views/events → increment counters
 * 3. User navigates → update exitPage
 * 4. Session ends → set endTime, duration, bounced
 * 5. Goal completed → append to goalCompletions
 * 
 * Session Timeout:
 * - Standard: 30 minutes of inactivity
 * - New session after timeout
 * - Same user can have multiple sessions
 * 
 * Bounce Rate Calculation:
 * - bounced: true if only 1 page view AND duration < 10s
 * - Indicates low engagement
 * - Used for landing page optimization
 * 
 * Analytics Use Cases:
 * - Session duration trends
 * - Bounce rate by landing page
 * - Traffic source effectiveness (UTM analysis)
 * - Goal completion rates
 * - Device/browser preferences
 * - Geographic distribution
 * - User retention (session frequency)
 * 
 * Business Rules:
 * - One sessionId per browser session
 * - Anonymous sessions tracked (userId null)
 * - Geographic data from IP (privacy-friendly)
 * - UTM parameters from URL query string
 * - endTime updated on page visibility change
 * - Duration calculated: endTime - startTime
 * 
 * Indexes:
 * - user_sessions_session_id_idx: Unique session lookup
 * - user_sessions_user_id_idx: User's session history
 * - user_sessions_start_time_idx: Time series analysis
 * 
 * Relationships:
 * - users → userSessions: SET NULL
 * - userSessions ← analyticsEvents: Referenced by sessionId
 */
export const userSessions = pgTable("user_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull().unique(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  
  // Session details
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // Total session duration in seconds
  pageViews: integer("page_views").notNull().default(0),
  events: integer("events").notNull().default(0),
  
  // Entry/Exit
  entryPage: text("entry_page"),
  exitPage: text("exit_page"),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  
  // Device info
  userAgent: text("user_agent"),
  deviceType: text("device_type"),
  browser: text("browser"),
  os: text("os"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  
  // Engagement metrics
  bounced: boolean("bounced").notNull().default(false),
  goalCompletions: jsonb("goal_completions").$type<string[]>(), // List of completed goals
  
}, (table) => [
  index("user_sessions_session_id_idx").on(table.sessionId),
  index("user_sessions_user_id_idx").on(table.userId),
  index("user_sessions_start_time_idx").on(table.startTime),
]);

/**
 * Insert schema for userSessions table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertUserSessionSchema = createInsertSchema(userSessions)
  .omit({
    id: true,
    startTime: true,
  })
  .extend({
    goalCompletions: z.array(z.string()).optional(),
  });

export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserSession = typeof userSessions.$inferSelect;

/**
 * Onboarding Inventory Table
 * 
 * Pre-populated food items with USDA data for quick onboarding.
 * Enables users to quickly stock their pantry during setup.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - displayName: User-friendly name (unique, e.g., "Whole Milk")
 * - upc: UPC barcode if available (for barcode matching)
 * - fdcId: USDA FDC ID (for nutrition lookup)
 * 
 * Basic Item Data:
 * - description: Detailed USDA description
 * - quantity: Default quantity for onboarding (e.g., "1", "2")
 * - unit: Default unit (gallon, lb, dozen, etc.)
 * - storage: Default storage location
 *   - 'Pantry', 'Refrigerator', 'Freezer', 'Counter'
 * - expirationDays: Default shelf life (days after addition)
 * - category: Original category from mapping
 * - foodCategory: Normalized to 5 major groups
 *   - 'Dairy', 'Produce', 'Meat', 'Grains', 'Other'
 * 
 * USDA Enriched Data:
 * - nutrition: JSONB with NutritionInfo
 * - usdaData: Complete USDA FoodData Central response
 * - brandOwner: Manufacturer (for branded foods)
 * - ingredients: Ingredient list text
 * - servingSize: USDA serving size (e.g., "1 cup")
 * - servingSizeUnit: Unit for serving (g, ml, oz, etc.)
 * 
 * Image Data:
 * - imageUrl: Product photo
 * - barcodeLookupData: Full barcode API response
 * 
 * Metadata:
 * - lastUpdated: When data was last refreshed
 * - dataSource: How data was obtained
 *   - 'usda_upc': USDA lookup by UPC
 *   - 'usda_fdc': USDA lookup by FDC ID
 *   - 'usda_search': USDA text search
 *   - 'manual': Manually curated
 * 
 * Onboarding Flow:
 * 1. User starts onboarding
 * 2. Show common food items from this table
 * 3. User selects items they have
 * 4. Selected items → copied to userInventory
 * 5. Quantities/expiration dates editable
 * 6. User proceeds to create account
 * 
 * Item Selection Categories:
 * - Dairy: Milk, Eggs, Cheese, Yogurt, Butter
 * - Produce: Apples, Bananas, Carrots, Lettuce, Tomatoes
 * - Meat: Chicken Breast, Ground Beef, Bacon, Salmon
 * - Grains: Bread, Rice, Pasta, Flour, Oats
 * - Pantry: Salt, Pepper, Olive Oil, Sugar, Garlic
 * 
 * Business Rules:
 * - DisplayName must be unique (single canonical item)
 * - Pre-populated with ~50-100 common items
 * - USDA data periodically refreshed
 * - Default quantities/storage based on typical use
 * - Expiration days based on storage location
 * - Images from barcode lookup or manual upload
 * 
 * Data Quality:
 * - All items have USDA nutrition data
 * - Verified UPC codes where available
 * - Accurate default storage locations
 * - Realistic expiration estimates
 * - High-quality product photos
 * 
 * Maintenance:
 * - Quarterly USDA data refresh
 * - Add seasonal items
 * - Update based on user feedback
 * - Remove discontinued products
 * 
 * Indexes:
 * - onboarding_inventory_display_name_idx: Unique item lookup
 * - onboarding_inventory_upc_idx: Barcode matching
 * - onboarding_inventory_fdc_id_idx: USDA data linking
 * - onboarding_inventory_category_idx: Category filtering
 * - onboarding_inventory_food_category_idx: Major group filtering
 * 
 * Usage Example:
 * ```typescript
 * // Get all dairy items for onboarding
 * const dairyItems = await db
 *   .select()
 *   .from(onboardingInventory)
 *   .where(eq(onboardingInventory.foodCategory, 'Dairy'));
 * 
 * // Copy selected items to user inventory
 * for (const item of selectedItems) {
 *   await db.insert(userInventory).values({
 *     userId,
 *     name: item.displayName,
 *     quantity: item.quantity,
 *     unit: item.unit,
 *     storageLocationId: userStorageMap[item.storage],
 *     expirationDate: calculateExpiration(item.expirationDays),
 *     foodCategory: item.foodCategory,
 *     nutrition: item.nutrition,
 *     // ... other fields
 *   });
 * }
 * ```
 */
export const onboardingInventory = pgTable("onboarding_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Identifier fields
  displayName: text("display_name").notNull().unique(), // Unique name for the item
  upc: text("upc"), // UPC barcode if available
  fdcId: varchar("fdc_id"), // FDC ID from USDA
  
  // Basic item data
  description: text("description"), // Detailed description from USDA or predefined
  quantity: text("quantity").notNull(), // Default quantity for onboarding
  unit: text("unit").notNull(), // Default unit
  storage: text("storage").notNull(), // Default storage location (Pantry, Fridge, Freezer, etc.)
  expirationDays: integer("expiration_days").notNull(), // Default shelf life in days
  category: text("category"), // Original category from our mapping
  foodCategory: text("food_category"), // Normalized to 5 major groups
  
  // USDA enriched data
  nutrition: jsonb("nutrition").$type<any>(), // Nutrition data from USDA
  usdaData: jsonb("usda_data").$type<any>(), // Full USDA data object
  brandOwner: text("brand_owner"),
  ingredients: text("ingredients"),
  servingSize: text("serving_size"),
  servingSizeUnit: text("serving_size_unit"),
  
  // Image data
  imageUrl: text("image_url"),
  barcodeLookupData: jsonb("barcode_lookup_data").$type<any>(),
  
  // Metadata
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  dataSource: text("data_source"), // 'usda_upc', 'usda_fdc', 'usda_search', 'manual'
}, (table) => [
  index("onboarding_inventory_display_name_idx").on(table.displayName),
  index("onboarding_inventory_upc_idx").on(table.upc),
  index("onboarding_inventory_fdc_id_idx").on(table.fdcId),
  index("onboarding_inventory_category_idx").on(table.category),
  index("onboarding_inventory_food_category_idx").on(table.foodCategory),
]);

export const insertOnboardingInventorySchema = createInsertSchema(onboardingInventory).omit({
  id: true,
  lastUpdated: true,
});

export type InsertOnboardingInventory = z.infer<typeof insertOnboardingInventorySchema>;
export type OnboardingInventory = typeof onboardingInventory.$inferSelect;

/**
 * Cooking Terms Table
 * 
 * Interactive cooking knowledge bank with techniques and terminology.
 * Provides contextual help during recipe viewing and cooking.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - term: Cooking term or technique name (unique)
 *   - Examples: "julienne", "sauté", "blanch", "deglaze"
 * - category: Term classification
 *   - 'knife_skills': Cutting techniques
 *   - 'cooking_methods': Heat-based techniques
 *   - 'prep_techniques': Preparation methods
 *   - 'baking_terms': Baking-specific
 *   - 'equipment': Tool and appliance terms
 * 
 * Definitions:
 * - shortDefinition: Brief tooltip text (1-2 sentences)
 *   - Displayed inline in recipes
 *   - Quick reference without leaving page
 * - longDefinition: Detailed explanation with steps
 *   - Expandable full description
 *   - Step-by-step instructions
 *   - When and why to use technique
 * - example: Usage example in context
 *   - Sample recipe instruction
 *   - Demonstrates proper application
 * 
 * Additional Information:
 * - difficulty: Skill level required
 *   - 'beginner': Basic techniques (chopping, stirring)
 *   - 'intermediate': Moderate skills (sautéing, folding)
 *   - 'advanced': Complex techniques (tempering, flambé)
 * - timeEstimate: How long technique takes
 *   - Examples: "2-3 minutes", "15-20 seconds", "1 hour"
 * - tools: Array of required tools/equipment
 *   - Example: ["chef's knife", "cutting board", "bowl"]
 * - tips: Array of pro tips and common mistakes
 *   - Helpful hints for success
 *   - What to avoid
 *   - Quality indicators
 * - relatedTerms: Array of related techniques
 *   - Cross-references for learning
 *   - Technique progressions
 * 
 * Media:
 * - imageUrl: Illustration or photo demonstrating technique
 * - videoUrl: Video tutorial link (YouTube, Vimeo, etc.)
 * 
 * Search & Matching:
 * - searchTerms: Alternative names/spellings
 *   - Example: ["sauté", "saute", "pan-fry"]
 *   - Enables flexible recipe instruction matching
 *   - Supports international variations
 * 
 * Metadata:
 * - createdAt: When term was added
 * - updatedAt: Last modification timestamp
 * 
 * Recipe Integration:
 * - Terms auto-detected in recipe instructions
 * - Hover over term → show shortDefinition tooltip
 * - Click term → expand longDefinition modal
 * - Links to related terms for learning progression
 * 
 * Example Term Entry:
 * ```typescript
 * {
 *   term: "julienne",
 *   category: "knife_skills",
 *   shortDefinition: "Cut food into thin, matchstick-shaped strips",
 *   longDefinition: "A French cutting technique that creates uniform thin strips...",
 *   example: "Julienne the carrots into 1/8-inch matchsticks for the salad",
 *   difficulty: "intermediate",
 *   timeEstimate: "5-7 minutes",
 *   tools: ["chef's knife", "cutting board", "ruler (optional)"],
 *   tips: [
 *     "Keep fingers curled inward for safety",
 *     "Use a sharp knife for clean cuts",
 *     "Cut vegetables into 2-inch sections first"
 *   ],
 *   relatedTerms: ["dice", "brunoise", "chiffonade", "mince"],
 *   imageUrl: "/images/techniques/julienne.jpg",
 *   videoUrl: "https://youtube.com/watch?v=..."
 * }
 * ```
 * 
 * Learning Features:
 * - Progressive difficulty (beginner → advanced)
 * - Related terms for skill building
 * - Video tutorials for visual learning
 * - Time estimates for planning
 * - Common mistakes prevention
 * 
 * Business Rules:
 * - Term names must be unique
 * - ShortDefinition under 150 characters
 * - All terms have category and difficulty
 * - Search terms enable fuzzy matching
 * - Media links validated on insert
 * 
 * Content Curation:
 * - Curated by culinary experts
 * - Verified techniques and definitions
 * - Professional photography/video
 * - Regular content updates
 * 
 * Indexes:
 * - cooking_terms_term_idx: Fast term lookup
 * - cooking_terms_category_idx: Browse by category
 * 
 * Usage Example:
 * ```typescript
 * // Auto-link terms in recipe instructions
 * function highlightCookingTerms(instruction: string) {
 *   const terms = await db.select().from(cookingTerms);
 *   
 *   for (const term of terms) {
 *     const pattern = new RegExp(
 *       `\\b(${[term.term, ...term.searchTerms].join('|')})\\b`,
 *       'gi'
 *     );
 *     
 *     instruction = instruction.replace(pattern, (match) =>
 *       `<Tooltip content="${term.shortDefinition}">
 *         <span class="cooking-term">${match}</span>
 *       </Tooltip>`
 *     );
 *   }
 *   
 *   return instruction;
 * }
 * ```
 */
export const cookingTerms = pgTable("cooking_terms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Term details
  term: text("term").notNull().unique(), // e.g., "julienne", "sauté", "blanch"
  category: text("category").notNull(), // "knife_skills", "cooking_methods", "prep_techniques"
  
  // Definitions
  shortDefinition: text("short_definition").notNull(), // Brief tooltip definition (1-2 sentences)
  longDefinition: text("long_definition").notNull(), // Detailed explanation with steps
  example: text("example"), // Example usage of the term
  
  // Additional information
  difficulty: text("difficulty"), // "beginner", "intermediate", "advanced"
  timeEstimate: text("time_estimate"), // e.g., "2-3 minutes"
  tools: text("tools").array(), // Tools needed for this technique
  tips: text("tips").array(), // Pro tips and common mistakes
  relatedTerms: text("related_terms").array(), // Related techniques to learn
  
  // Media
  imageUrl: text("image_url"), // Optional illustration
  videoUrl: text("video_url"), // Optional video tutorial link
  
  // Metadata
  searchTerms: text("search_terms").array(), // Alternative names/spellings for matching
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("cooking_terms_term_idx").on(table.term),
  index("cooking_terms_category_idx").on(table.category),
]);

export const insertCookingTermSchema = createInsertSchema(cookingTerms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCookingTerm = z.infer<typeof insertCookingTermSchema>;
export type CookingTerm = typeof cookingTerms.$inferSelect;

/**
 * Appliance Library Table
 * 
 * Master catalog of all available appliances, cookware, and bakeware.
 * Reference data for userAppliances table.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - name: Appliance/item name
 *   - Examples: "Stand Mixer", "9x13 Baking Pan", "Chef's Knife"
 * - category: High-level classification
 *   - 'appliance': Electric/gas appliances
 *   - 'cookware': Pots, pans, skillets
 *   - 'bakeware': Baking dishes, sheets, molds
 *   - 'utensil': Tools and gadgets
 * - subcategory: Detailed classification
 *   - Appliances: 'oven', 'stovetop', 'mixer', 'blender', 'air_fryer'
 *   - Cookware: 'pan', 'pot', 'wok', 'griddle'
 *   - Bakeware: 'sheet', 'cake_pan', 'muffin_tin', 'loaf_pan'
 *   - Utensils: 'knife', 'spatula', 'whisk', 'thermometer'
 * 
 * Product Details:
 * - brand: Manufacturer name (optional)
 *   - Examples: "KitchenAid", "Le Creuset", "Cuisinart"
 * - model: Specific model number/name (optional)
 * - description: Detailed description and features
 * - sizeOrCapacity: Dimensions or volume
 *   - Pans: '12-inch', '9x13 inches'
 *   - Pots: '5-quart', '8-liter'
 *   - Appliances: 'Countertop', 'Full-size'
 * - material: Construction material
 *   - Examples: 'stainless steel', 'cast iron', 'ceramic', 'aluminum'
 * 
 * Appliance Capabilities:
 * - capabilities: Array of functions (for appliances)
 *   - Examples: ['bake', 'broil', 'toast', 'air fry', 'convection']
 *   - Used for recipe equipment matching
 *   - Determines recipe compatibility
 * 
 * Common Items:
 * - isCommon: Flag for standard kitchen items
 *   - true: Items most people have (pot, pan, knife, etc.)
 *   - false: Specialty items (pasta maker, sous vide, etc.)
 *   - Used for recipe filtering (show recipes using common equipment)
 * 
 * Media & Search:
 * - imageUrl: Product photo or illustration
 * - searchTerms: Alternative names for flexible search
 *   - Examples: ["stand mixer", "mixer", "kitchen mixer", "electric mixer"]
 * 
 * Metadata:
 * - createdAt: When item was added to library
 * - updatedAt: Last modification timestamp
 * 
 * Example Library Entries:
 * 
 * ```typescript
 * // Appliance
 * {
 *   name: "Stand Mixer",
 *   category: "appliance",
 *   subcategory: "mixer",
 *   brand: "KitchenAid",
 *   model: "Classic Series",
 *   description: "5-quart stand mixer with multiple attachments",
 *   capabilities: ["mix", "knead", "whip", "beat"],
 *   sizeOrCapacity: "5-quart",
 *   isCommon: false,
 *   searchTerms: ["stand mixer", "kitchen mixer", "electric mixer"]
 * }
 * 
 * // Cookware
 * {
 *   name: "12-inch Cast Iron Skillet",
 *   category: "cookware",
 *   subcategory: "pan",
 *   brand: "Lodge",
 *   description: "Pre-seasoned cast iron skillet for stovetop and oven",
 *   sizeOrCapacity: "12-inch",
 *   material: "cast iron",
 *   isCommon: true,
 *   searchTerms: ["skillet", "frying pan", "cast iron pan"]
 * }
 * 
 * // Bakeware
 * {
 *   name: "9x13 Baking Pan",
 *   category: "bakeware",
 *   subcategory: "cake_pan",
 *   description: "Standard rectangular baking pan for cakes and casseroles",
 *   sizeOrCapacity: "9x13 inches",
 *   material: "aluminum",
 *   isCommon: true,
 *   searchTerms: ["baking pan", "cake pan", "casserole dish", "9x13"]
 * }
 * ```
 * 
 * Recipe Integration:
 * - Recipes specify neededEquipment array
 * - Match against library items or userAppliances
 * - Filter recipes by available equipment
 * - Suggest equipment for recipes
 * 
 * User Workflow:
 * 1. User views appliance library
 * 2. Selects items they own
 * 3. Creates userAppliance records (linked via applianceLibraryId)
 * 4. Recipes filtered by owned equipment
 * 5. Equipment suggestions for unavailable recipes
 * 
 * Business Rules:
 * - Library curated by admin/staff
 * - Common items prioritized in UI
 * - Search terms enable flexible matching
 * - Capabilities required for appliances
 * - Images recommended for all items
 * 
 * Content Curation:
 * - Comprehensive coverage (100+ items)
 * - Accurate capabilities and dimensions
 * - Quality product photos
 * - Regular additions for new equipment
 * - User requests tracked for additions
 * 
 * Indexes:
 * - appliance_library_category_idx: Browse by category
 * - appliance_library_subcategory_idx: Filter by subcategory
 * - appliance_library_is_common_idx: Common items first
 * 
 * Relationships:
 * - applianceLibrary ← userAppliances: Referenced by applianceLibraryId
 * - applianceLibrary ← userRecipes.neededEquipment: String matching
 */
export const applianceLibrary = pgTable("appliance_library", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(), // 'appliance', 'cookware', 'bakeware', 'utensil'
  subcategory: text("subcategory"), // 'oven', 'stovetop', 'pans', 'knives', etc.
  brand: text("brand"), // Optional brand for specific items
  model: text("model"), // Optional model
  description: text("description"),
  capabilities: text("capabilities").array(), // ['bake', 'broil', 'toast', 'air fry'] for appliances
  sizeOrCapacity: text("size_or_capacity"), // '9x13"' for pans, '5qt' for pots
  material: text("material"), // 'stainless steel', 'cast iron', 'ceramic'
  isCommon: boolean("is_common").notNull().default(false), // Common items most people have
  imageUrl: text("image_url"),
  searchTerms: text("search_terms").array(), // Alternative names for searching
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("appliance_library_category_idx").on(table.category),
  index("appliance_library_subcategory_idx").on(table.subcategory),
  index("appliance_library_is_common_idx").on(table.isCommon),
]);

export const insertApplianceLibrarySchema = createInsertSchema(applianceLibrary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertApplianceLibrary = z.infer<typeof insertApplianceLibrarySchema>;
export type ApplianceLibrary = typeof applianceLibrary.$inferSelect;

/**
 * Conversations Table (Task 7 - AI Chat Assistant)
 * 
 * Manages AI chat conversations with context tracking.
 * Each conversation is a separate thread of messages.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - title: Conversation title (auto-generated or user-defined)
 * - createdAt: When conversation started
 * - updatedAt: Last activity in conversation
 * 
 * Business Rules:
 * - Title auto-generated from first message if not provided
 * - Updated timestamp refreshed on new messages
 * - Conversations ordered by updatedAt for recency
 * 
 * Indexes:
 * - conversations_user_id_idx: User's conversation list
 * - conversations_updated_at_idx: Recent conversations first
 * 
 * Relationships:
 * - users → conversations: CASCADE
 * - conversations ← messages: Referenced by conversationId
 * - conversations ← conversationContext: One-to-one context
 */
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New Conversation"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("conversations_user_id_idx").on(table.userId),
  index("conversations_updated_at_idx").on(table.updatedAt),
]);

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type ConversationWithMetadata = Conversation & {
  lastMessage: string | null;
  messageCount: number;
};

/**
 * Messages Table (Task 7 - AI Chat Assistant)
 * 
 * Individual messages within conversations.
 * Tracks token usage for cost monitoring.
 * 
 * Fields:
 * - id: UUID primary key
 * - conversationId: Foreign key to conversations.id (CASCADE delete)
 * - role: Message sender ('user' | 'assistant' | 'system')
 * - content: Message text content
 * - tokensUsed: OpenAI tokens consumed (for cost tracking)
 * - timestamp: When message was sent
 * 
 * Token Tracking:
 * - User messages: Input tokens
 * - Assistant messages: Completion tokens
 * - Used for billing and rate limiting
 * 
 * Indexes:
 * - messages_conversation_id_idx: Messages in conversation
 * - messages_timestamp_idx: Chronological ordering
 * 
 * Relationships:
 * - conversations → messages: CASCADE
 */
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  tokensUsed: integer("tokens_used").default(0),
  timestamp: timestamp("timestamp").defaultNow(),
  
  // Message metadata (using ChatMessageMetadata interface)
  metadata: jsonb("metadata").$type<ChatMessageMetadata>(),
}, (table) => [
  index("messages_conversation_id_idx").on(table.conversationId),
  index("messages_timestamp_idx").on(table.timestamp),
]);

/**
 * Insert schema for messages table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertMessageSchema = createInsertSchema(messages)
  .omit({
    id: true,
    timestamp: true,
    tokensUsed: true,
  })
  .extend({
    metadata: chatMessageMetadataSchema.optional(),
  });

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

/**
 * Conversation Context Table (Task 7 - AI Chat Assistant)
 * 
 * Stores summarized context and key facts for conversations.
 * Enables efficient context management for long conversations.
 * 
 * Fields:
 * - conversationId: Foreign key to conversations.id (PRIMARY KEY)
 * - contextSummary: AI-generated summary of conversation
 * - keyFacts: JSONB array of important facts extracted
 * - updatedAt: When context was last updated
 * 
 * Context Management:
 * - Summary regenerated periodically (every N messages)
 * - Key facts extracted for quick reference
 * - Reduces token usage for context window
 * 
 * Relationships:
 * - conversations → conversationContext: ONE-TO-ONE
 */
export const conversationContext = pgTable("conversation_context", {
  conversationId: varchar("conversation_id").primaryKey().references(() => conversations.id, { onDelete: "cascade" }),
  contextSummary: text("context_summary"),
  keyFacts: jsonb("key_facts").$type<Array<{
    fact: string;
    category: string;
    timestamp: string;
  }>>().default([]),
  lastSummarized: timestamp("last_summarized").defaultNow(),
  messageCount: integer("message_count").default(0),
});

/**
 * Insert schema for conversationContext table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertConversationContextSchema = createInsertSchema(conversationContext)
  .omit({
    lastSummarized: true,
  })
  .extend({
    keyFacts: z.array(conversationKeyFactSchema),
  });

export type InsertConversationContext = z.infer<typeof insertConversationContextSchema>;
export type ConversationContext = typeof conversationContext.$inferSelect;

/**
 * Voice Commands Table (Task 8 - Voice Commands)
 * 
 * Tracks voice command usage and success rates.
 * Enables voice-controlled app navigation.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - transcript: Speech-to-text result
 * - commandType: Interpreted command category
 * - actionTaken: What action was executed
 * - success: Whether command executed successfully
 * - timestamp: When command was issued
 * 
 * Command Types:
 * - navigation: "Show me X page"
 * - action: "Add X to cart"
 * - query: "What is X?"
 * - settings: "Change X setting"
 * 
 * Analytics:
 * - Success rate by command type
 * - Most common voice commands
 * - Failed command patterns for improvement
 * 
 * Indexes:
 * - voice_commands_user_id_idx: User's command history
 * - voice_commands_timestamp_idx: Recent commands
 * - voice_commands_success_idx: Success/failure analysis
 * 
 * Relationships:
 * - users → voiceCommands: CASCADE
 */
export const voiceCommands = pgTable("voice_commands", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  transcript: text("transcript").notNull(),
  commandType: text("command_type"),
  actionTaken: text("action_taken"),
  success: boolean("success").notNull().default(false),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => [
  index("voice_commands_user_id_idx").on(table.userId),
  index("voice_commands_timestamp_idx").on(table.timestamp),
  index("voice_commands_success_idx").on(table.success),
]);

export const insertVoiceCommandSchema = createInsertSchema(voiceCommands).omit({
  id: true,
  timestamp: true,
});

export type InsertVoiceCommand = z.infer<typeof insertVoiceCommandSchema>;
export type VoiceCommand = typeof voiceCommands.$inferSelect;

/**
 * Draft Templates Table (Task 9 - Smart Email/Message Drafting)
 * 
 * Reusable templates for message drafting.
 * Tracks usage for popularity metrics.
 * 
 * Fields:
 * - id: UUID primary key
 * - contextType: Type of message context
 * - templatePrompt: Template for AI generation
 * - usageCount: Times template has been used
 * - isActive: Flag to enable/disable templates
 * - createdAt: When template was created
 * - updatedAt: Last modification timestamp
 * 
 * Context Types:
 * - email: Professional email responses
 * - message: Instant messages or chat
 * - comment: Social media or forum comments  
 * - customer_complaint: Response to complaints
 * - inquiry: Response to questions
 * - follow_up: Follow-up messages
 * - thank_you: Thank you messages
 * - apology: Apology messages
 * - general: General purpose responses
 * 
 * Indexes:
 * - draft_templates_context_type_idx: Filter by type
 * - draft_templates_usage_count_idx: Popular templates
 */
export const draftTemplates = pgTable("draft_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contextType: text("context_type").notNull(),
  templatePrompt: text("template_prompt").notNull(),
  usageCount: integer("usage_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("draft_templates_context_type_idx").on(table.contextType),
  index("draft_templates_usage_count_idx").on(table.usageCount),
]);

export const insertDraftTemplateSchema = createInsertSchema(draftTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDraftTemplate = z.infer<typeof insertDraftTemplateSchema>;
export type DraftTemplate = typeof draftTemplates.$inferSelect;

/**
 * Generated Drafts Table (Task 9 - Smart Email/Message Drafting)
 * 
 * AI-generated message drafts with tracking.
 * Records which drafts were selected and edited.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - originalMessageId: ID of message being responded to
 * - originalMessage: The message content being responded to
 * - draftContent: Generated draft text
 * - selected: Whether user selected this draft
 * - edited: Whether user edited before sending
 * - editedContent: The edited version of the draft (if edited)
 * - tone: Tone of the draft (formal, casual, friendly, apologetic, solution-focused, empathetic)
 * - contextType: Type of content being drafted ('email', 'message', 'comment')
 * - metadata: Additional generation metadata (model, temperature, etc.)
 * - createdAt: When draft was generated
 * - updatedAt: Last modification timestamp
 * 
 * Analytics:
 * - Selection rate by tone
 * - Edit frequency (quality metric)
 * - Most effective draft styles
 * 
 * Indexes:
 * - generated_drafts_user_id_idx: User's draft history
 * - generated_drafts_selected_idx: Selected drafts analysis
 * - generated_drafts_original_message_id_idx: Group drafts by original message
 * 
 * Relationships:
 * - users → generatedDrafts: CASCADE
 */
export const generatedDrafts = pgTable("generated_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  originalMessageId: text("original_message_id"),
  originalMessage: text("original_message"),
  draftContent: text("draft_content").notNull(),
  selected: boolean("selected").notNull().default(false),
  edited: boolean("edited").notNull().default(false),
  editedContent: text("edited_content"),
  tone: text("tone"), // 'formal', 'casual', 'friendly', 'apologetic', 'solution-focused', 'empathetic'
  contextType: text("context_type"), // 'email', 'message', 'comment'
  
  // Generation metadata (flexible structure)
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("generated_drafts_user_id_idx").on(table.userId),
  index("generated_drafts_selected_idx").on(table.selected),
  index("generated_drafts_original_message_id_idx").on(table.originalMessageId),
]);

export const insertGeneratedDraftSchema = createInsertSchema(generatedDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGeneratedDraft = z.infer<typeof insertGeneratedDraftSchema>;
export type GeneratedDraft = typeof generatedDrafts.$inferSelect;

/**
 * Writing Sessions Table (Task 10 - Writing Assistant)
 * 
 * Tracks writing improvement sessions.
 * Stores original and improved versions.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - documentId: Optional document identifier
 * - originalText: User's original text
 * - improvedText: AI-improved version
 * - improvementsApplied: JSONB array of applied improvements
 * - createdAt: When session started
 * 
 * Improvement Types:
 * - grammar: Grammar corrections
 * - spelling: Spelling fixes
 * - style: Style improvements
 * - tone: Tone adjustments
 * - clarity: Clarity enhancements
 * 
 * Indexes:
 * - writing_sessions_user_id_idx: User's writing history
 * - writing_sessions_document_id_idx: Document-specific sessions
 * 
 * Relationships:
 * - users → writingSessions: CASCADE
 * - writingSessions ← writingSuggestions: Referenced by sessionId
 */
export const writingSessions = pgTable("writing_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  documentId: text("document_id"),
  originalText: text("original_text").notNull(),
  improvedText: text("improved_text"),
  improvementsApplied: jsonb("improvements_applied").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("writing_sessions_user_id_idx").on(table.userId),
  index("writing_sessions_document_id_idx").on(table.documentId),
]);

/**
 * Insert schema for writingSessions table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertWritingSessionSchema = createInsertSchema(writingSessions, {
  improvementsApplied: z.array(z.string()).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertWritingSession = z.infer<typeof insertWritingSessionSchema>;
export type WritingSession = typeof writingSessions.$inferSelect;

/**
 * Writing Suggestions Table (Task 10 - Writing Assistant)
 * 
 * Individual suggestions within writing sessions.
 * Tracks acceptance rate for quality metrics.
 * 
 * Fields:
 * - id: UUID primary key
 * - sessionId: Foreign key to writingSessions.id (CASCADE delete)
 * - suggestionType: Type of suggestion
 * - originalSnippet: Original text snippet
 * - suggestedSnippet: Suggested replacement
 * - accepted: Whether user accepted suggestion
 * - reason: Explanation for the suggestion
 * - createdAt: When suggestion was made
 * 
 * Suggestion Types:
 * - grammar: Grammar correction
 * - spelling: Spelling correction
 * - style: Style improvement
 * - tone: Tone adjustment
 * - clarity: Clarity improvement
 * - conciseness: Make more concise
 * - vocabulary: Better word choice
 * 
 * Analytics:
 * - Acceptance rate by type
 * - Most common corrections
 * - User writing patterns
 * 
 * Indexes:
 * - writing_suggestions_session_id_idx: Suggestions for session
 * - writing_suggestions_type_idx: Filter by suggestion type
 * - writing_suggestions_accepted_idx: Acceptance analysis
 * 
 * Relationships:
 * - writingSessions → writingSuggestions: CASCADE
 */
export const writingSuggestions = pgTable("writing_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => writingSessions.id, { onDelete: "cascade" }),
  suggestionType: text("suggestion_type").notNull(),
  originalSnippet: text("original_snippet").notNull(),
  suggestedSnippet: text("suggested_snippet").notNull(),
  accepted: boolean("accepted").notNull().default(false),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("writing_suggestions_session_id_idx").on(table.sessionId),
  index("writing_suggestions_type_idx").on(table.suggestionType),
  index("writing_suggestions_accepted_idx").on(table.accepted),
]);

export const insertWritingSuggestionSchema = createInsertSchema(writingSuggestions).omit({
  id: true,
  createdAt: true,
});

export type InsertWritingSuggestion = z.infer<typeof insertWritingSuggestionSchema>;
export type WritingSuggestion = typeof writingSuggestions.$inferSelect;

/**
 * Activity Logs Table
 * 
 * Comprehensive audit trail for all user actions and system events.
 * Tracks every significant activity for analytics, debugging, and compliance.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (nullable for system events)
 * - action: Type of action performed
 *   - User actions: 'login', 'logout', 'signup', 'settings_changed'
 *   - Food inventory: 'food_added', 'food_updated', 'food_deleted', 'food_consumed'
 *   - Recipes: 'recipe_generated', 'recipe_saved', 'recipe_deleted', 'recipe_rated', 'recipe_viewed'
 *   - AI chat: 'message_sent', 'ai_response_received'
 *   - Notifications: 'notification_sent', 'notification_dismissed'
 *   - Shopping: 'shopping_list_created', 'item_checked_off'
 *   - Meal planning: 'meal_planned', 'meal_completed'
 *   - System: 'data_exported', 'bulk_import', 'cleanup_job', 'error_occurred'
 * - entity: What was affected (e.g., 'food_item', 'recipe', 'user', 'meal_plan')
 * - entityId: ID of the affected entity (nullable for actions without specific entity)
 * 
 * Context & Metadata:
 * - metadata: JSONB field for additional context
 *   - Can include: previous values, new values, error details, user input, etc.
 *   - Example: { oldName: "Milk", newName: "Whole Milk", location: "fridge" }
 * - ipAddress: User's IP address for security auditing (nullable)
 * - userAgent: Browser/device information (nullable)
 * - sessionId: Links to user session for grouping activities (nullable)
 * - timestamp: When the action occurred
 * 
 * Privacy & Security:
 * - Sensitive data (passwords, tokens) never logged in metadata
 * - IP addresses stored for security but can be anonymized
 * - User agent helps detect automated/suspicious activity
 * - GDPR compliant with data deletion on user request
 * 
 * Performance Optimizations:
 * - Asynchronous logging (doesn't block requests)
 * - Batch inserts for high-volume events
 * - Retention policy for automatic cleanup (90 days default)
 * - Archival for important events before deletion
 * 
 * Query Patterns:
 * - User timeline: Filter by userId + timestamp DESC
 * - Action audit: Filter by action type
 * - Entity history: Filter by entity + entityId
 * - System events: WHERE userId IS NULL
 * - Security audit: Filter by IP address or suspicious patterns
 * 
 * Business Rules:
 * - Critical actions always logged (auth, deletions, admin actions)
 * - Read operations optionally logged (configurable)
 * - System events have null userId
 * - Errors logged with full context in metadata
 * - Retention: 90 days default, configurable per action type
 * 
 * Analytics Use Cases:
 * - User engagement metrics (actions per day/week)
 * - Feature usage tracking (which features are popular)
 * - Error tracking and debugging
 * - Security audit trail
 * - Compliance reporting
 * - Performance monitoring (via metadata.duration)
 * 
 * Example Log Entries:
 * 
 * ```typescript
 * // Food item added
 * {
 *   userId: "user123",
 *   action: "food_added",
 *   entity: "food_item",
 *   entityId: "food456",
 *   metadata: {
 *     name: "Organic Milk",
 *     location: "fridge",
 *     expirationDate: "2024-01-15",
 *     quantity: 1
 *   },
 *   ipAddress: "192.168.1.1",
 *   userAgent: "Mozilla/5.0...",
 *   sessionId: "session789",
 *   timestamp: "2024-01-05T10:30:00Z"
 * }
 * 
 * // Recipe generated
 * {
 *   userId: "user123",
 *   action: "recipe_generated",
 *   entity: "recipe",
 *   entityId: "recipe789",
 *   metadata: {
 *     title: "Chicken Stir Fry",
 *     source: "ai_generated",
 *     ingredientsUsed: 5,
 *     prompt: "Quick dinner with chicken and vegetables"
 *   },
 *   timestamp: "2024-01-05T18:45:00Z"
 * }
 * 
 * // System event
 * {
 *   userId: null,
 *   action: "cleanup_job",
 *   entity: "system",
 *   metadata: {
 *     type: "expired_logs",
 *     deletedCount: 1523,
 *     duration: 450,
 *     status: "success"
 *   },
 *   timestamp: "2024-01-05T02:00:00Z"
 * }
 * ```
 * 
 * Indexes:
 * - activity_logs_user_id_idx: User-specific queries
 * - activity_logs_action_idx: Filter by action type
 * - activity_logs_timestamp_idx: Time-based queries
 * - activity_logs_entity_entity_id_idx: Entity history lookup
 * 
 * Relationships:
 * - users → activityLogs: SET NULL (preserve logs if user deleted)
 * 
 * Implementation Notes:
 * - Use ActivityLogger service for logging (handles async, batching)
 * - Middleware auto-logs API requests
 * - Manual logging for business logic events
 * - Background job for retention/archival
 */
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }), // Nullable for system events
  action: varchar("action", { length: 100 }).notNull(), // Type of action performed
  entity: varchar("entity", { length: 50 }).notNull(), // What was affected
  entityId: varchar("entity_id"), // ID of affected entity (nullable)
  metadata: jsonb("metadata").$type<Record<string, any>>(), // Additional context data
  ipAddress: varchar("ip_address", { length: 45 }), // Support IPv6
  userAgent: text("user_agent"), // Browser/device info
  sessionId: varchar("session_id"), // Session identifier
  timestamp: timestamp("timestamp").notNull().defaultNow(), // When action occurred
}, (table) => [
  index("activity_logs_user_id_idx").on(table.userId),
  index("activity_logs_action_idx").on(table.action),
  index("activity_logs_timestamp_idx").on(table.timestamp),
  index("activity_logs_entity_entity_id_idx").on(table.entity, table.entityId),
]);

/**
 * Insert schema for activityLogs table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertActivityLogSchema = createInsertSchema(activityLogs)
  .omit({
    id: true,
    timestamp: true,
  })
  .extend({
    metadata: z.record(z.any()).optional(),
  });

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

/**
 * Summaries Table
 * 
 * Stores AI-generated summaries of long content, articles, or documents.
 * Supports multiple summary formats and caching for performance.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - contentId: Unique identifier for the original content
 * - originalContent: The full text that was summarized (for reference)
 * - summaryText: The generated summary text
 * - summaryType: Format of summary ('tldr', 'bullet', 'paragraph')
 * - wordCount: Number of words in the summary
 * - originalWordCount: Number of words in the original content
 * 
 * Additional Fields:
 * - summaryLength: User preference for summary length (1-3 sentences or bullet count)
 * - keyPoints: Array of extracted key points from the content
 * - metadata: JSONB for additional data (model used, temperature, etc.)
 * - isEdited: Flag indicating if user manually edited the summary
 * - editedText: User-edited version of the summary (if edited)
 * - createdAt: When summary was generated
 * - updatedAt: Last modification timestamp
 * 
 * Summary Types:
 * - 'tldr': 2-3 sentence ultra-concise summary
 * - 'bullet': Bullet point format with key takeaways
 * - 'paragraph': Single paragraph summary (3-5 sentences)
 * 
 * Business Rules:
 * - Cache summaries to avoid redundant API calls
 * - Allow users to edit/improve generated summaries
 * - Track word count reduction for analytics
 * - Support batch summarization for multiple items
 * 
 * Indexes:
 * - summaries_user_id_idx: User's summaries lookup
 * - summaries_content_id_idx: Fast content-based retrieval
 * - summaries_user_content_idx: Unique constraint on userId + contentId
 * 
 * Relationships:
 * - users → summaries: CASCADE (delete summaries when user deleted)
 */
export const summaries = pgTable("summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentId: varchar("content_id").notNull(), // Unique identifier for the content
  originalContent: text("original_content"), // Store the original text for reference
  summaryText: text("summary_text").notNull(), // The generated summary
  summaryType: varchar("summary_type", { length: 20 }).notNull().default('tldr'), // 'tldr', 'bullet', 'paragraph'
  wordCount: integer("word_count").notNull(), // Word count of the summary
  originalWordCount: integer("original_word_count"), // Word count of original content
  summaryLength: integer("summary_length").default(2), // 1-3 for sentences, or bullet count
  keyPoints: text("key_points").array(), // Extracted key points
  metadata: jsonb("metadata").$type<{
    model?: string;
    temperature?: number;
    tokensUsed?: number;
    processingTime?: number;
  }>(), // Additional metadata about generation
  isEdited: boolean("is_edited").notNull().default(false), // Has user edited this summary
  editedText: text("edited_text"), // User-edited version if edited
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("summaries_user_id_idx").on(table.userId),
  index("summaries_content_id_idx").on(table.contentId),
  uniqueIndex("summaries_user_content_idx").on(table.userId, table.contentId),
]);

/**
 * Insert schema for summaries table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertSummarySchema = createInsertSchema(summaries)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    metadata: summaryMetadataSchema.optional(),
  });

export type InsertSummary = z.infer<typeof insertSummarySchema>;
export type Summary = typeof summaries.$inferSelect;

/**
 * Excerpts Table
 * 
 * Stores compelling preview snippets for content, optimized for sharing
 * and preview cards across different platforms.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - contentId: Unique identifier for the source content
 * - originalContent: The full original text (for reference)
 * - excerptText: The generated excerpt/snippet
 * - excerptType: Type of excerpt (social, email, card, meta)
 * - targetPlatform: Platform optimization (twitter, linkedin, facebook, generic)
 * - characterCount: Length of the excerpt
 * - clickThroughRate: Calculated CTR (clicks/views)
 * - isActive: Whether this excerpt is currently in use
 * - variant: A/B test variant identifier (A, B, C, etc.)
 * 
 * Metadata:
 * - generationParams: JSON with generation parameters (tone, style, etc.)
 * - socialMetadata: Open Graph and Twitter Card metadata
 * - createdAt: When the excerpt was created
 * - updatedAt: Last modification timestamp
 * 
 * Business Rules:
 * - Multiple excerpts can exist for same contentId (A/B testing)
 * - CTR automatically calculated from performance data
 * - Platform-specific character limits enforced
 * - Best performing excerpt marked as isActive
 * 
 * Indexes:
 * - excerpts_user_id_idx: User's excerpts lookup
 * - excerpts_content_id_idx: Fast content-based retrieval
 * - excerpts_active_idx: Quick active excerpt lookup
 * 
 * Relationships:
 * - users → excerpts: CASCADE (delete excerpts when user deleted)
 * - excerpts → excerpt_performance: CASCADE
 */
export const excerpts = pgTable("excerpts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contentId: varchar("content_id").notNull(),
  originalContent: text("original_content"),
  excerptText: text("excerpt_text").notNull(),
  excerptType: varchar("excerpt_type", { length: 20 }).notNull().default('social'), // 'social', 'email', 'card', 'meta', 'summary'
  targetPlatform: varchar("target_platform", { length: 20 }).default('generic'), // 'twitter', 'linkedin', 'facebook', 'instagram', 'generic'
  characterCount: integer("character_count").notNull(),
  wordCount: integer("word_count"),
  clickThroughRate: real("click_through_rate").default(0), // Calculated from performance data
  isActive: boolean("is_active").notNull().default(false),
  variant: varchar("variant", { length: 10 }).default('A'), // For A/B testing
  generationParams: jsonb("generation_params").$type<{
    tone?: string;
    style?: string;
    targetAudience?: string;
    callToAction?: boolean;
    hashtags?: boolean;
    emojis?: boolean;
    temperature?: number;
    model?: string;
  }>(),
  socialMetadata: jsonb("social_metadata").$type<{
    title?: string;
    description?: string;
    imageUrl?: string;
    twitterCard?: 'summary' | 'summary_large_image';
    ogType?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("excerpts_user_id_idx").on(table.userId),
  index("excerpts_content_id_idx").on(table.contentId),
  index("excerpts_active_idx").on(table.isActive, table.contentId),
]);

export const insertExcerptSchema = createInsertSchema(excerpts)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    generationParams: z.object({
      tone: z.string().optional(),
      style: z.string().optional(),
      targetAudience: z.string().optional(),
      callToAction: z.boolean().optional(),
      hashtags: z.boolean().optional(),
      emojis: z.boolean().optional(),
      temperature: z.number().optional(),
      model: z.string().optional(),
    }).optional(),
    socialMetadata: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      imageUrl: z.string().optional(),
      twitterCard: z.enum(['summary', 'summary_large_image']).optional(),
      ogType: z.string().optional(),
    }).optional(),
  });

export type InsertExcerpt = z.infer<typeof insertExcerptSchema>;
export type Excerpt = typeof excerpts.$inferSelect;

/**
 * Excerpt Performance Table
 * 
 * Tracks performance metrics for each excerpt to optimize for engagement.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - excerptId: Foreign key to excerpts.id (CASCADE delete)
 * - date: Date of the metrics (for daily tracking)
 * - views: Number of times the excerpt was displayed
 * - clicks: Number of clicks on the excerpt
 * - shares: Number of times shared on social media
 * - engagements: Total interactions (likes, comments, etc.)
 * 
 * Platform-Specific Metrics:
 * - platformMetrics: JSON with platform-specific data
 * 
 * Calculated Fields:
 * - ctr: Click-through rate (clicks/views)
 * - shareRate: Share rate (shares/views)
 * - engagementRate: Engagement rate (engagements/views)
 * 
 * Business Rules:
 * - One record per excerpt per day
 * - Metrics aggregated daily
 * - Used to calculate overall excerpt CTR
 * - Drives A/B testing decisions
 * 
 * Indexes:
 * - excerpt_performance_excerpt_id_idx: Excerpt's performance lookup
 * - excerpt_performance_date_idx: Date-based queries
 * 
 * Relationships:
 * - excerpts → excerpt_performance: CASCADE
 */
export const excerptPerformance = pgTable("excerpt_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  excerptId: varchar("excerpt_id").notNull().references(() => excerpts.id, { onDelete: "cascade" }),
  date: date("date").notNull().defaultNow(),
  views: integer("views").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  shares: integer("shares").notNull().default(0),
  engagements: integer("engagements").default(0), // likes, comments, reactions
  conversions: integer("conversions").default(0), // goal completions
  bounces: integer("bounces").default(0), // immediate exits
  timeOnPage: real("time_on_page"), // average time in seconds
  platformMetrics: jsonb("platform_metrics").$type<{
    twitter?: { impressions?: number; retweets?: number; likes?: number; replies?: number };
    linkedin?: { impressions?: number; reactions?: number; comments?: number; reposts?: number };
    facebook?: { reach?: number; reactions?: number; comments?: number; shares?: number };
    email?: { opens?: number; clicks?: number; forwards?: number };
  }>(),
  ctr: real("ctr"), // Calculated: clicks/views
  shareRate: real("share_rate"), // Calculated: shares/views
  engagementRate: real("engagement_rate"), // Calculated: engagements/views
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("excerpt_performance_excerpt_id_idx").on(table.excerptId),
  index("excerpt_performance_date_idx").on(table.date),
  uniqueIndex("excerpt_performance_unique_idx").on(table.excerptId, table.date),
]);

export const insertExcerptPerformanceSchema = createInsertSchema(excerptPerformance)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
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

export type InsertExcerptPerformance = z.infer<typeof insertExcerptPerformanceSchema>;
export type ExcerptPerformance = typeof excerptPerformance.$inferSelect;

/**
 * Translations Table
 * 
 * Stores translated content with context-aware translations using AI.
 * Supports multiple languages and verification status.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - contentId: Identifier for the content being translated
 * - languageCode: ISO 639-1 language code (e.g., 'es', 'fr', 'de')
 * - translatedText: The translated content
 * - isVerified: Whether translation has been reviewed/verified
 * - translatorId: User ID of who verified the translation
 * 
 * Metadata:
 * - originalText: Original text before translation (for reference)
 * - contentType: Type of content (post, recipe, message, etc.)
 * - translationMetadata: JSON with translation details
 *   - model: AI model used for translation
 *   - confidence: Translation confidence score
 *   - context: Additional context provided for translation
 *   - preservedFormatting: Formatting preservation details
 * 
 * Business Rules:
 * - Each content+language combination should be unique
 * - Verified translations preferred over unverified
 * - Context-aware translations maintain meaning not just words
 * - Formatting preserved in translation (bold, links, etc.)
 * 
 * Indexes:
 * - translations_content_id_idx: Fast content lookup
 * - translations_language_code_idx: Language filtering
 * - translations_unique_idx: Unique content+language combinations
 * 
 * Relationships:
 * - users → translations (translator): SET NULL on user delete
 */
export const translations = pgTable("translations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  languageCode: varchar("language_code", { length: 10 }).notNull(),
  translatedText: text("translated_text").notNull(),
  originalText: text("original_text"),
  contentType: varchar("content_type", { length: 50 }), // 'post', 'recipe', 'message', etc.
  isVerified: boolean("is_verified").notNull().default(false),
  translatorId: varchar("translator_id").references(() => users.id, { onDelete: "set null" }),
  translationMetadata: jsonb("translation_metadata").$type<{
    model?: string;
    confidence?: number;
    context?: string;
    preservedFormatting?: any;
    sourceLanguage?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("translations_content_id_idx").on(table.contentId),
  index("translations_language_code_idx").on(table.languageCode),
  uniqueIndex("translations_unique_idx").on(table.contentId, table.languageCode),
]);

export const insertTranslationSchema = createInsertSchema(translations)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    translationMetadata: z.object({
      model: z.string().optional(),
      confidence: z.number().optional(),
      context: z.string().optional(),
      preservedFormatting: z.any().optional(),
      sourceLanguage: z.string().optional(),
    }).optional(),
  });

export type InsertTranslation = z.infer<typeof insertTranslationSchema>;
export type Translation = typeof translations.$inferSelect;

/**
 * Language Preferences Table
 * 
 * User-specific language preferences and auto-translation settings.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - preferredLanguages: Array of ISO language codes in preference order
 * - autoTranslate: Whether to automatically translate content
 * 
 * Settings:
 * - nativeLanguage: User's primary language
 * - showOriginalText: Display original text alongside translation
 * - translationQuality: Preferred quality level (fast/balanced/high)
 * - excludedContentTypes: Content types to exclude from auto-translation
 * 
 * Business Rules:
 * - Each user has one language preference record
 * - First language in preferredLanguages is primary
 * - Auto-translate respects user's notification preferences
 * - Quality setting affects translation speed vs accuracy
 * 
 * Indexes:
 * - language_preferences_user_id_idx: Unique user lookup
 * 
 * Relationships:
 * - users → languagePreferences: CASCADE delete
 */
export const languagePreferences = pgTable("language_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  preferredLanguages: text("preferred_languages").array().notNull().default(sql`ARRAY['en']::text[]`),
  autoTranslate: boolean("auto_translate").notNull().default(true),
  nativeLanguage: varchar("native_language", { length: 10 }).default('en'),
  showOriginalText: boolean("show_original_text").notNull().default(false),
  translationQuality: varchar("translation_quality", { length: 20 }).notNull().default('balanced'), // 'fast', 'balanced', 'high'
  excludedContentTypes: text("excluded_content_types").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("language_preferences_user_id_idx").on(table.userId),
]);

export const insertLanguagePreferenceSchema = createInsertSchema(languagePreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLanguagePreference = z.infer<typeof insertLanguagePreferenceSchema>;
export type LanguagePreference = typeof languagePreferences.$inferSelect;

/**
 * Image Metadata Table
 * 
 * Stores metadata for uploaded images including alt text for accessibility and SEO.
 * Tracks both user-provided and AI-generated alternative text.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - imageUrl: URL of the stored image (object storage or external)
 * - altText: Final alt text used for the image
 * - generatedAlt: AI-generated alt text suggestion
 * - title: Image title for additional context
 * - isDecorative: Flag for purely decorative images (no alt text needed)
 * 
 * Metadata:
 * - fileName: Original uploaded file name
 * - mimeType: MIME type of the image (image/jpeg, image/png, etc.)
 * - fileSize: Size in bytes
 * - dimensions: Image width and height
 * - uploadedAt: When the image was uploaded
 * 
 * AI Generation:
 * - aiModel: Model used for alt text generation (e.g., 'gpt-4-vision')
 * - generatedAt: When alt text was generated
 * - confidence: AI confidence score for generated text
 * - objectsDetected: Array of detected objects/entities
 * 
 * Business Rules:
 * - Alt text required for non-decorative images
 * - Generated alt text can be edited by user
 * - Decorative images have empty alt attribute
 * - Track generation model for quality improvements
 * 
 * Indexes:
 * - image_metadata_user_id_idx: User's images
 * - image_metadata_url_idx: Fast lookup by URL
 * - image_metadata_uploaded_at_idx: Chronological queries
 * 
 * Relationships:
 * - users → imageMetadata: CASCADE delete
 * - imageMetadata ← altTextQuality: Quality assessment reference
 */
export const imageMetadata = pgTable("image_metadata", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  altText: text("alt_text"),
  generatedAlt: text("generated_alt"),
  title: text("title"),
  isDecorative: boolean("is_decorative").notNull().default(false),
  
  // File metadata
  fileName: text("file_name"),
  mimeType: varchar("mime_type", { length: 50 }),
  fileSize: integer("file_size"),
  dimensions: jsonb("dimensions").$type<{
    width?: number;
    height?: number;
  }>(),
  
  // AI generation metadata
  aiModel: varchar("ai_model", { length: 50 }),
  generatedAt: timestamp("generated_at"),
  confidence: real("confidence"),
  objectsDetected: text("objects_detected").array(),
  
  // Additional metadata
  context: text("context"), // Page/section where image is used
  language: varchar("language", { length: 10 }).default('en'),
  
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("image_metadata_user_id_idx").on(table.userId),
  index("image_metadata_url_idx").on(table.imageUrl),
  index("image_metadata_uploaded_at_idx").on(table.uploadedAt),
]);

/**
 * Insert schema for imageMetadata table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertImageMetadataSchema = createInsertSchema(imageMetadata)
  .omit({
    id: true,
    uploadedAt: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    dimensions: z.object({
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
    }).optional(),
  });

export type InsertImageMetadata = z.infer<typeof insertImageMetadataSchema>;
export type ImageMetadata = typeof imageMetadata.$inferSelect;

/**
 * Alt Text Quality Table
 * 
 * Tracks quality metrics and accessibility scores for image alt text.
 * Used for reporting and identifying images needing improvement.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - imageId: Foreign key to imageMetadata.id (CASCADE delete)
 * - qualityScore: Overall quality score (0-100)
 * - accessibilityScore: WCAG compliance score (0-100)
 * 
 * Quality Metrics:
 * - lengthScore: Appropriate length (not too short/long)
 * - descriptiveScore: How well it describes the image
 * - contextScore: Relevance to surrounding content
 * - keywordScore: SEO keyword inclusion
 * 
 * Accessibility Metrics:
 * - screenReaderScore: How well it works with screen readers
 * - wcagLevel: WCAG compliance level ('A', 'AA', 'AAA', null)
 * - hasColorDescription: Includes color info when relevant
 * - hasTextDescription: Describes text in image
 * 
 * Feedback:
 * - userFeedback: User-provided quality feedback
 * - manuallyReviewed: Human review flag
 * - reviewedBy: User who reviewed (admin/moderator)
 * - reviewNotes: Review comments
 * 
 * Analysis:
 * - issues: Array of identified issues
 * - suggestions: Array of improvement suggestions
 * - lastAnalyzedAt: When quality was last assessed
 * 
 * Business Rules:
 * - Quality scores updated when alt text changes
 * - Low scores trigger improvement suggestions
 * - Track manual reviews for training data
 * - Aggregate scores for accessibility reports
 * 
 * Indexes:
 * - alt_text_quality_image_id_idx: Unique image quality record
 * - alt_text_quality_score_idx: Find low-quality alt text
 * - alt_text_quality_wcag_idx: WCAG compliance filtering
 * 
 * Relationships:
 * - imageMetadata → altTextQuality: CASCADE delete
 * - users → altTextQuality (reviewedBy): SET NULL
 */
export const altTextQuality = pgTable("alt_text_quality", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  imageId: varchar("image_id").notNull().unique().references(() => imageMetadata.id, { onDelete: "cascade" }),
  
  // Overall scores
  qualityScore: integer("quality_score").notNull().default(0),
  accessibilityScore: integer("accessibility_score").notNull().default(0),
  
  // Quality metrics (0-100 each)
  lengthScore: integer("length_score"),
  descriptiveScore: integer("descriptive_score"),
  contextScore: integer("context_score"),
  keywordScore: integer("keyword_score"),
  
  // Accessibility metrics
  screenReaderScore: integer("screen_reader_score"),
  wcagLevel: varchar("wcag_level", { length: 3 }), // 'A', 'AA', 'AAA'
  hasColorDescription: boolean("has_color_description").default(false),
  hasTextDescription: boolean("has_text_description").default(false),
  
  // Manual review
  userFeedback: text("user_feedback"),
  manuallyReviewed: boolean("manually_reviewed").notNull().default(false),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewNotes: text("review_notes"),
  
  // Analysis results
  issues: text("issues").array(),
  suggestions: text("suggestions").array(),
  metadata: jsonb("metadata").$type<{
    wordCount?: number;
    readabilityScore?: number;
    sentimentScore?: number;
    technicalTerms?: string[];
  }>(),
  
  lastAnalyzedAt: timestamp("last_analyzed_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("alt_text_quality_image_id_idx").on(table.imageId),
  index("alt_text_quality_score_idx").on(table.qualityScore),
  index("alt_text_quality_wcag_idx").on(table.wcagLevel),
]);

export const insertAltTextQualitySchema = createInsertSchema(altTextQuality).omit({
  id: true,
  lastAnalyzedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAltTextQuality = z.infer<typeof insertAltTextQualitySchema>;
export type AltTextQuality = typeof altTextQuality.$inferSelect;

/**
 * Moderation Logs Table
 * 
 * Tracks all content moderation activities and decisions.
 * Records toxicity scores, actions taken, and moderator reviews.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - contentId: ID of the content being moderated (recipe, chat, etc.)
 * - contentType: Type of content (chat, recipe, comment, etc.)
 * - userId: Foreign key to users.id (CASCADE delete) - user who created content
 * - content: The actual text/content that was moderated
 * - toxicityScores: JSONB with detailed toxicity analysis
 * - actionTaken: Moderation action (approved, blocked, flagged, warning)
 * - reviewedBy: User ID of moderator who reviewed (if manual review)
 * 
 * Analysis Fields:
 * - modelUsed: AI model used for analysis (tensorflow, openai, both)
 * - confidence: Confidence score of the moderation decision (0-1)
 * - categories: Array of detected violation categories
 * - severity: Overall severity level (low, medium, high, critical)
 * 
 * Review Fields:
 * - manualReview: Whether content was manually reviewed
 * - reviewNotes: Notes from manual review
 * - overrideReason: Reason for overriding automatic decision
 * - reviewedAt: Timestamp of manual review
 * 
 * Business Rules:
 * - All moderated content must be logged
 * - Toxicity scores include multiple dimensions (toxicity, threat, insult, etc.)
 * - Manual reviews can override automatic decisions
 * - Content can be re-evaluated if user edits
 * 
 * Indexes:
 * - moderation_logs_user_id_idx: User's moderation history
 * - moderation_logs_content_id_idx: Content lookup
 * - moderation_logs_action_idx: Filter by action taken
 * - moderation_logs_severity_idx: Find high-severity content
 * - moderation_logs_created_at_idx: Chronological queries
 * 
 * Relationships:
 * - users → moderationLogs: CASCADE delete
 * - users → moderationLogs (reviewedBy): SET NULL
 */
export const moderationLogs = pgTable("moderation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  contentType: varchar("content_type", { length: 50 }).notNull(), // 'chat', 'recipe', 'comment', 'feedback'
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  
  // Toxicity analysis (using ModerationResult interface)
  toxicityScores: jsonb("toxicity_scores").$type<ModerationResult>().notNull(),
  
  // Moderation decision
  actionTaken: varchar("action_taken", { length: 20 }).notNull(), // 'approved', 'blocked', 'flagged', 'warning'
  modelUsed: varchar("model_used", { length: 50 }).notNull(), // 'tensorflow', 'openai', 'both'
  confidence: real("confidence").notNull().default(0),
  categories: text("categories").array(),
  severity: varchar("severity", { length: 20 }).notNull(), // 'low', 'medium', 'high', 'critical'
  
  // Manual review
  manualReview: boolean("manual_review").notNull().default(false),
  reviewedBy: varchar("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewNotes: text("review_notes"),
  overrideReason: text("override_reason"),
  reviewedAt: timestamp("reviewed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("moderation_logs_user_id_idx").on(table.userId),
  index("moderation_logs_content_id_idx").on(table.contentId),
  index("moderation_logs_action_idx").on(table.actionTaken),
  index("moderation_logs_severity_idx").on(table.severity),
  index("moderation_logs_created_at_idx").on(table.createdAt),
]);

/**
 * Insert schema for moderationLogs table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertModerationLogSchema = createInsertSchema(moderationLogs, {
  toxicityScores: moderationResultSchema,
  actionTaken: z.enum(["approved", "blocked", "flagged", "warning"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  confidence: true,
  manualReview: true,
});

export type InsertModerationLog = z.infer<typeof insertModerationLogSchema>;
export type ModerationLog = typeof moderationLogs.$inferSelect;

/**
 * Blocked Content Table
 * 
 * Stores content that was blocked by moderation system.
 * Preserves blocked content for review and appeals.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - content: The blocked content text
 * - originalContentId: ID of the original content (if applicable)
 * - contentType: Type of content that was blocked
 * - reason: Reason for blocking (profanity, harassment, spam, etc.)
 * - userId: Foreign key to users.id (CASCADE delete)
 * 
 * Blocking Details:
 * - blockedCategories: Specific violation categories detected
 * - toxicityLevel: Overall toxicity score that triggered block
 * - metadata: Additional context about the block
 * - autoBlocked: Whether blocked automatically or manually
 * 
 * Resolution:
 * - status: Current status (blocked, appealed, restored, deleted)
 * - appealId: Foreign key to moderation_appeals if appealed
 * - restoredAt: When content was restored (if applicable)
 * - restoredBy: Who restored the content
 * 
 * Business Rules:
 * - Blocked content preserved for 30 days minimum
 * - Users can view their own blocked content
 * - Admins can review all blocked content
 * - Restored content returns to original location
 * 
 * Indexes:
 * - blocked_content_user_id_idx: User's blocked content
 * - blocked_content_status_idx: Filter by status
 * - blocked_content_timestamp_idx: Chronological queries
 * 
 * Relationships:
 * - users → blockedContent: CASCADE delete
 * - moderationAppeals → blockedContent: Referenced by appealId
 */
export const blockedContent = pgTable("blocked_content", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  originalContentId: varchar("original_content_id"),
  contentType: varchar("content_type", { length: 50 }).notNull(),
  reason: text("reason").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Blocking details
  blockedCategories: text("blocked_categories").array(),
  toxicityLevel: real("toxicity_level"),
  
  // Additional context about the block (using ModerationMetadata interface)
  metadata: jsonb("metadata").$type<ModerationMetadata>(),
  
  autoBlocked: boolean("auto_blocked").notNull().default(true),
  
  // Resolution
  status: varchar("status", { length: 20 }).notNull().default('blocked'), // 'blocked', 'appealed', 'restored', 'deleted'
  appealId: varchar("appeal_id"),
  restoredAt: timestamp("restored_at"),
  restoredBy: varchar("restored_by").references(() => users.id, { onDelete: "set null" }),
  
  timestamp: timestamp("timestamp").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("blocked_content_user_id_idx").on(table.userId),
  index("blocked_content_status_idx").on(table.status),
  index("blocked_content_timestamp_idx").on(table.timestamp),
]);

/**
 * Insert schema for blockedContent table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertBlockedContentSchema = createInsertSchema(blockedContent, {
  metadata: z.object({
    originalLocation: z.string().optional(),
    targetUsers: z.array(z.string()).optional(),
    context: z.string().optional(),
    previousViolations: z.number().int().nonnegative().optional(),
  }).optional(),
}).omit({
  id: true,
  timestamp: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBlockedContent = z.infer<typeof insertBlockedContentSchema>;
export type BlockedContent = typeof blockedContent.$inferSelect;

/**
 * Moderation Appeals Table
 * 
 * Manages user appeals against moderation decisions.
 * Tracks appeal process from submission to resolution.
 * 
 * Core Fields:
 * - id: UUID primary key
 * - contentId: ID of the content being appealed
 * - blockedContentId: Foreign key to blocked_content.id
 * - userId: Foreign key to users.id (user who filed appeal)
 * - appealReason: User's explanation for appeal
 * - status: Appeal status (pending, reviewing, approved, rejected, withdrawn)
 * 
 * Appeal Details:
 * - appealType: Type of appeal (false_positive, context_needed, etc.)
 * - supportingEvidence: Additional evidence provided by user
 * - originalAction: The moderation action being appealed
 * - originalSeverity: Severity level of original decision
 * 
 * Review Process:
 * - assignedTo: Moderator assigned to review
 * - reviewStartedAt: When review began
 * - decision: Final decision on appeal
 * - decisionReason: Explanation of decision
 * - decidedBy: Moderator who made decision
 * - decidedAt: When decision was made
 * 
 * Outcome:
 * - actionTaken: Action taken after appeal (content_restored, warning_removed, etc.)
 * - userNotified: Whether user was notified of decision
 * - notifiedAt: When notification sent
 * 
 * Business Rules:
 * - Users can appeal within 30 days of moderation
 * - Each content can have one active appeal
 * - Appeals must be reviewed within 72 hours
 * - Approved appeals restore content and clear violations
 * 
 * Indexes:
 * - moderation_appeals_user_id_idx: User's appeals
 * - moderation_appeals_content_id_idx: Content appeal lookup
 * - moderation_appeals_status_idx: Filter by status
 * - moderation_appeals_assigned_idx: Moderator workload
 * 
 * Relationships:
 * - users → moderationAppeals: CASCADE delete
 * - users → moderationAppeals (assignedTo, decidedBy): SET NULL
 * - blockedContent → moderationAppeals: Referenced
 */
export const moderationAppeals = pgTable("moderation_appeals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  blockedContentId: varchar("blocked_content_id").references(() => blockedContent.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  appealReason: text("appeal_reason").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'), // 'pending', 'reviewing', 'approved', 'rejected', 'withdrawn'
  
  // Appeal details
  appealType: varchar("appeal_type", { length: 50 }), // 'false_positive', 'context_needed', 'technical_error', 'other'
  supportingEvidence: text("supporting_evidence"),
  originalAction: varchar("original_action", { length: 20 }),
  originalSeverity: varchar("original_severity", { length: 20 }),
  
  // Review process
  assignedTo: varchar("assigned_to").references(() => users.id, { onDelete: "set null" }),
  reviewStartedAt: timestamp("review_started_at"),
  decision: varchar("decision", { length: 20 }), // 'approved', 'rejected', 'partially_approved'
  decisionReason: text("decision_reason"),
  decidedBy: varchar("decided_by").references(() => users.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at"),
  
  // Outcome
  actionTaken: text("action_taken"),
  userNotified: boolean("user_notified").notNull().default(false),
  notifiedAt: timestamp("notified_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("moderation_appeals_user_id_idx").on(table.userId),
  index("moderation_appeals_content_id_idx").on(table.contentId),
  index("moderation_appeals_status_idx").on(table.status),
  index("moderation_appeals_assigned_idx").on(table.assignedTo),
]);

export const insertModerationAppealSchema = createInsertSchema(moderationAppeals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertModerationAppeal = z.infer<typeof insertModerationAppealSchema>;
export type ModerationAppeal = typeof moderationAppeals.$inferSelect;

// ============================================================================
// Fraud Detection Tables
// ============================================================================

/**
 * Fraud scores table
 * Stores real-time fraud risk scores for users based on behavior analysis
 */
export const fraudScores = pgTable("fraud_scores", {
  id: varchar("id", { length: 50 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 50 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Risk score (0.0 = safe, 1.0 = definite fraud)
  score: real("score").notNull(),
  
  // Detailed scoring factors (using FraudRiskFactor interface)
  factors: jsonb("factors").notNull().$type<FraudRiskFactor>(),
  
  modelVersion: varchar("model_version", { length: 20 }).notNull().default("v1.0"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("fraud_scores_user_id_idx").on(table.userId),
  index("fraud_scores_timestamp_idx").on(table.timestamp),
  index("fraud_scores_score_idx").on(table.score)
]);

/**
 * Suspicious activities table
 * Logs detected suspicious activities and patterns
 */
export const suspiciousActivities = pgTable("suspicious_activities", {
  id: varchar("id", { length: 50 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 50 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Type of suspicious activity
  activityType: varchar("activity_type", { length: 50 }).notNull(), 
  // Types: 'rapid_transactions', 'unusual_pattern', 'fake_profile', 'bot_behavior', 'account_takeover'
  
  // Detailed information about the activity (using FraudEvidenceDetail interface)
  details: jsonb("details").notNull().$type<FraudEvidenceDetail>(),
  
  riskLevel: varchar("risk_level", { length: 20 }).notNull().$type<"low" | "medium" | "high" | "critical">(),
  status: varchar("status", { length: 20 })
    .notNull()
    .default("pending")
    .$type<"pending" | "reviewing" | "confirmed" | "dismissed" | "escalated">(),
  
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  autoBlocked: boolean("auto_blocked").notNull().default(false)
}, (table) => [
  index("suspicious_activities_user_id_idx").on(table.userId),
  index("suspicious_activities_type_idx").on(table.activityType),
  index("suspicious_activities_risk_idx").on(table.riskLevel),
  index("suspicious_activities_status_idx").on(table.status),
  index("suspicious_activities_detected_idx").on(table.detectedAt)
]);

/**
 * Fraud reviews table
 * Manual review decisions for suspected fraud cases
 */
export const fraudReviews = pgTable("fraud_reviews", {
  id: varchar("id", { length: 50 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 50 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reviewerId: varchar("reviewer_id", { length: 50 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Link to specific suspicious activity
  activityId: varchar("activity_id", { length: 50 })
    .references(() => suspiciousActivities.id, { onDelete: "cascade" }),
  
  // Review decision
  decision: varchar("decision", { length: 20 })
    .notNull()
    .$type<"cleared" | "flagged" | "banned" | "restricted" | "monitor">(),
  
  notes: text("notes"),
  
  // Restrictions applied (if any)
  restrictions: jsonb("restrictions").$type<{
    canPost?: boolean;
    canMessage?: boolean;
    canTransaction?: boolean;
    dailyLimit?: number;
    requiresVerification?: boolean;
  }>(),
  
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true })
}, (table) => [
  index("fraud_reviews_user_id_idx").on(table.userId),
  index("fraud_reviews_reviewer_id_idx").on(table.reviewerId),
  index("fraud_reviews_activity_id_idx").on(table.activityId),
  index("fraud_reviews_decision_idx").on(table.decision),
  index("fraud_reviews_reviewed_at_idx").on(table.reviewedAt)
]);

/**
 * Fraud Detection Results Table
 * 
 * Comprehensive fraud detection analysis results combining risk scoring,
 * evidence collection, device fingerprinting, and behavioral analysis.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - analysisType: Type of fraud analysis performed
 *   - 'account_creation': New account signup analysis
 *   - 'transaction': Transaction-based fraud detection
 *   - 'content_posting': Content spam/bot detection
 *   - 'account_takeover': Suspicious login/access patterns
 *   - 'behavioral': Behavioral pattern analysis
 * - overallRiskScore: Overall fraud risk score (0.0-1.0)
 * - riskLevel: Risk classification (low, medium, high, critical)
 * - riskFactors: Array of detailed risk factor breakdowns (FraudRiskFactor[])
 *   - Behavior, account age, velocity, content, network, device, geo scores
 * - evidenceDetails: Array of evidence supporting fraud detection (FraudEvidenceDetail[])
 *   - Descriptions, evidence items, related activities, network info
 * - deviceInfo: Device fingerprint and network information (FraudDeviceInfo)
 *   - Fingerprint, device type, OS, browser, IP, ISP, proxy/VPN detection
 * - behaviorData: User behavior patterns and metrics (FraudBehaviorData)
 *   - Session metrics, transaction velocity, activity patterns, baselines
 * - status: Detection result status
 *   - 'pending': Awaiting review
 *   - 'cleared': No fraud detected
 *   - 'flagged': Requires manual review
 *   - 'blocked': Automatically blocked
 *   - 'reviewed': Manually reviewed
 * - autoBlocked: Whether the system automatically blocked the activity
 * - reviewRequired: Whether manual review is required
 * - modelVersion: Version of the fraud detection model used
 * - metadata: Additional analysis metadata
 * - analyzedAt: Timestamp of when analysis was performed
 * - reviewedAt: Timestamp of manual review (if applicable)
 * 
 * Use Cases:
 * - Real-time fraud detection during user actions
 * - Batch analysis of historical user behavior
 * - Account security monitoring
 * - Transaction fraud prevention
 * - Bot and spam detection
 * - Account takeover prevention
 * 
 * Business Rules:
 * - Auto-block if overallRiskScore > 0.85 (critical risk)
 * - Require review if overallRiskScore > 0.70 (high risk)
 * - Monitor if overallRiskScore > 0.50 (medium risk)
 * - Clear if overallRiskScore < 0.30 (low risk)
 * - Retain results for audit trail and ML model training
 * 
 * Indexes:
 * - fraud_detection_results_user_id_idx: User's fraud history
 * - fraud_detection_results_risk_score_idx: Risk score filtering
 * - fraud_detection_results_risk_level_idx: Risk level filtering
 * - fraud_detection_results_status_idx: Status filtering
 * - fraud_detection_results_analyzed_at_idx: Time-based queries
 * 
 * Relationships:
 * - users → fraudDetectionResults: CASCADE
 */
export const fraudDetectionResults = pgTable("fraud_detection_results", {
  id: varchar("id", { length: 50 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 50 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Analysis metadata
  analysisType: varchar("analysis_type", { length: 50 })
    .notNull()
    .$type<"account_creation" | "transaction" | "content_posting" | "account_takeover" | "behavioral">(),
  
  // Overall risk assessment
  overallRiskScore: real("overall_risk_score").notNull(), // 0.0 = safe, 1.0 = definite fraud
  riskLevel: varchar("risk_level", { length: 20 })
    .notNull()
    .$type<"low" | "medium" | "high" | "critical">(),
  
  // Detailed risk factors array (using FraudRiskFactor[] interface)
  riskFactors: jsonb("risk_factors").$type<FraudRiskFactor[]>(),
  
  // Evidence supporting the detection (using FraudEvidenceDetail[] interface)
  evidenceDetails: jsonb("evidence_details").$type<FraudEvidenceDetail[]>(),
  
  // Device and network information (using FraudDeviceInfo interface)
  deviceInfo: jsonb("device_info").$type<FraudDeviceInfo>(),
  
  // Behavioral analysis data (using FraudBehaviorData interface)
  behaviorData: jsonb("behavior_data").$type<FraudBehaviorData>(),
  
  // Status and review
  status: varchar("status", { length: 20 })
    .notNull()
    .default("pending")
    .$type<"pending" | "cleared" | "flagged" | "blocked" | "reviewed">(),
  autoBlocked: boolean("auto_blocked").notNull().default(false),
  reviewRequired: boolean("review_required").notNull().default(false),
  
  // Metadata
  modelVersion: varchar("model_version", { length: 20 }).notNull().default("v1.0"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  // Timestamps
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
}, (table) => [
  index("fraud_detection_results_user_id_idx").on(table.userId),
  index("fraud_detection_results_risk_score_idx").on(table.overallRiskScore),
  index("fraud_detection_results_risk_level_idx").on(table.riskLevel),
  index("fraud_detection_results_status_idx").on(table.status),
  index("fraud_detection_results_analyzed_at_idx").on(table.analyzedAt),
]);

// ==================== Schema Types for Fraud Detection ====================

/**
 * Zod schema for fraud review restrictions
 * Validates restriction settings applied to flagged users
 */
const fraudReviewRestrictionsSchema = z.object({
  canPost: z.boolean().optional(),
  canMessage: z.boolean().optional(),
  canTransaction: z.boolean().optional(),
  dailyLimit: z.number().int().nonnegative().optional(),
  requiresVerification: z.boolean().optional(),
});

/**
 * Insert schema for fraudScores table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertFraudScoreSchema = createInsertSchema(fraudScores)
  .omit({
    id: true,
    timestamp: true,
    modelVersion: true,
  })
  .extend({
    factors: fraudRiskFactorSchema,
  });

/**
 * Insert schema for suspiciousActivities table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertSuspiciousActivitySchema = createInsertSchema(suspiciousActivities, {
  details: fraudEvidenceDetailSchema,
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
}).omit({
  id: true,
  detectedAt: true,
  status: true,
  autoBlocked: true,
});

/**
 * Insert schema for fraudReviews table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertFraudReviewSchema = createInsertSchema(fraudReviews, {
  decision: z.enum(["cleared", "flagged", "banned", "restricted", "monitor"]),
  restrictions: fraudReviewRestrictionsSchema.optional(),
}).omit({
  id: true,
  reviewedAt: true,
});

/**
 * Insert schema for fraudDetectionResults table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertFraudDetectionResultsSchema = createInsertSchema(fraudDetectionResults)
  .omit({
    id: true,
    analyzedAt: true,
    modelVersion: true,
    status: true,
    autoBlocked: true,
    reviewRequired: true,
  })
  .extend({
    riskFactors: z.array(fraudRiskFactorSchema).optional(),
    evidenceDetails: z.array(fraudEvidenceDetailSchema).optional(),
    deviceInfo: fraudDeviceInfoSchema.optional(),
    behaviorData: fraudBehaviorDataSchema.optional(),
    metadata: z.record(z.any()).optional(),
  });

export type InsertFraudScore = z.infer<typeof insertFraudScoreSchema>;
export type FraudScore = typeof fraudScores.$inferSelect;

export type InsertSuspiciousActivity = z.infer<typeof insertSuspiciousActivitySchema>;
export type SuspiciousActivity = typeof suspiciousActivities.$inferSelect;

export type InsertFraudReview = z.infer<typeof insertFraudReviewSchema>;
export type FraudReview = typeof fraudReviews.$inferSelect;

export type InsertFraudDetectionResults = z.infer<typeof insertFraudDetectionResultsSchema>;
export type FraudDetectionResults = typeof fraudDetectionResults.$inferSelect;

// ============================================================================
// Sentiment Analysis Tables
// ============================================================================

/**
 * Sentiment Metrics Table
 * 
 * Stores aggregated sentiment metrics for dashboard overview.
 * Pre-calculated metrics for specific time periods.
 * 
 * Fields:
 * - id: UUID primary key
 * - period: Time period for the metrics (e.g., "2024-01-15", "2024-W03")
 * - avgSentiment: Average sentiment score for the period (-1 to 1)
 * - totalItems: Total number of items analyzed in the period
 * - alertTriggered: Whether an alert was triggered for this period
 * - periodType: Type of period (day, week, month)
 * - percentageChange: Percentage change from previous period
 * - categories: Breakdown by category/feature
 * - painPoints: Identified pain points in this period
 * - metadata: Additional metrics data
 * - createdAt: When metrics were calculated
 * 
 * Business Rules:
 * - Calculated automatically every hour
 * - Triggers alert if sentiment drops > 15%
 * - Retains historical data for trend analysis
 * 
 * Indexes:
 * - sentiment_metrics_period_idx: Period-based queries
 * - sentiment_metrics_alert_idx: Alert status filtering
 */
export const sentimentMetrics = pgTable("sentiment_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  period: text("period").notNull(),
  avgSentiment: real("avg_sentiment").notNull(),
  totalItems: integer("total_items").notNull(),
  alertTriggered: boolean("alert_triggered").notNull().default(false),
  periodType: text("period_type").notNull().$type<"day" | "week" | "month">(),
  percentageChange: real("percentage_change"),
  categories: jsonb("categories").$type<Record<string, {
    sentiment: number;
    count: number;
    issues: string[];
  }>>(),
  painPoints: jsonb("pain_points").$type<Array<{
    category: string;
    issue: string;
    impact: number;
    frequency: number;
  }>>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("sentiment_metrics_period_idx").on(table.period),
  index("sentiment_metrics_alert_idx").on(table.alertTriggered),
  uniqueIndex("sentiment_metrics_unique_idx").on(table.period, table.periodType),
]);

/**
 * Sentiment Alerts Table
 * 
 * Configuration and history of sentiment-based alerts.
 * Tracks thresholds and triggered alerts.
 * 
 * Fields:
 * - id: UUID primary key
 * - alertType: Type of alert (drop, spike, sustained_negative, etc.)
 * - threshold: Threshold value that triggers the alert
 * - currentValue: Current value that triggered the alert
 * - triggeredAt: When the alert was triggered
 * - status: Alert status (active, acknowledged, resolved)
 * - severity: Alert severity level (low, medium, high, critical)
 * - affectedCategory: Category/feature affected (optional)
 * - message: Alert message for display
 * - notificationSent: Whether notification was sent
 * - acknowledgedBy: User who acknowledged the alert
 * - acknowledgedAt: When alert was acknowledged
 * - resolvedAt: When alert was resolved
 * - metadata: Additional alert context
 * 
 * Alert Types:
 * - sentiment_drop: Significant drop in sentiment
 * - sustained_negative: Prolonged negative sentiment
 * - volume_spike: Unusual volume of feedback
 * - category_issue: Specific category problem
 * 
 * Business Rules:
 * - Active alerts shown in dashboard
 * - Critical alerts trigger immediate notifications
 * - Auto-resolve after sentiment improves
 * 
 * Indexes:
 * - sentiment_alerts_status_idx: Active alert queries
 * - sentiment_alerts_type_idx: Filter by alert type
 * - sentiment_alerts_triggered_idx: Time-based queries
 */
export const sentimentAlerts = pgTable("sentiment_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alertType: text("alert_type").notNull().$type<"sentiment_drop" | "sustained_negative" | "volume_spike" | "category_issue">(),
  threshold: real("threshold").notNull(),
  currentValue: real("current_value").notNull(),
  triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
  status: text("status").notNull().default("active").$type<"active" | "acknowledged" | "resolved">(),
  severity: text("severity").notNull().$type<"low" | "medium" | "high" | "critical">(),
  affectedCategory: text("affected_category"),
  message: text("message").notNull(),
  notificationSent: boolean("notification_sent").notNull().default(false),
  acknowledgedBy: varchar("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  metadata: jsonb("metadata").$type<{
    previousValue?: number;
    percentageChange?: number;
    affectedUsers?: number;
    relatedIssues?: string[];
    suggestedActions?: string[];
  }>(),
}, (table) => [
  index("sentiment_alerts_status_idx").on(table.status),
  index("sentiment_alerts_type_idx").on(table.alertType),
  index("sentiment_alerts_triggered_idx").on(table.triggeredAt),
]);

/**
 * Sentiment Segments Table
 * 
 * Sentiment analysis broken down by segments/categories.
 * Enables detailed analysis of specific areas.
 * 
 * Fields:
 * - id: UUID primary key
 * - segmentName: Name of the segment (e.g., "login", "checkout", "support")
 * - period: Time period for the segment analysis
 * - sentimentScore: Average sentiment score for this segment
 * - periodType: Type of period (day, week, month)
 * - sampleSize: Number of items analyzed
 * - positiveCount: Number of positive sentiments
 * - negativeCount: Number of negative sentiments
 * - neutralCount: Number of neutral sentiments
 * - topIssues: Most common issues in this segment
 * - topPraises: Most common positive feedback
 * - trendDirection: Trend direction (up, down, stable)
 * - comparisonToPrevious: Change from previous period
 * - metadata: Additional segment data
 * - createdAt: When segment analysis was created
 * 
 * Business Rules:
 * - Updated hourly for active segments
 * - Identifies segment-specific issues
 * - Enables targeted improvements
 * 
 * Indexes:
 * - sentiment_segments_name_idx: Segment name queries
 * - sentiment_segments_period_idx: Period-based queries
 * - sentiment_segments_score_idx: Score-based filtering
 */
export const sentimentSegments = pgTable("sentiment_segments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  segmentName: text("segment_name").notNull(),
  period: text("period").notNull(),
  sentimentScore: real("sentiment_score").notNull(),
  periodType: text("period_type").notNull().$type<"day" | "week" | "month">(),
  sampleSize: integer("sample_size").notNull(),
  positiveCount: integer("positive_count").notNull(),
  negativeCount: integer("negative_count").notNull(),
  neutralCount: integer("neutral_count").notNull(),
  topIssues: jsonb("top_issues").$type<Array<{
    issue: string;
    count: number;
    sentiment: number;
  }>>(),
  topPraises: jsonb("top_praises").$type<Array<{
    praise: string;
    count: number;
    sentiment: number;
  }>>(),
  trendDirection: text("trend_direction").$type<"up" | "down" | "stable">(),
  comparisonToPrevious: real("comparison_to_previous"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("sentiment_segments_name_idx").on(table.segmentName),
  index("sentiment_segments_period_idx").on(table.period),
  index("sentiment_segments_score_idx").on(table.sentimentScore),
  uniqueIndex("sentiment_segments_unique_idx").on(table.segmentName, table.period, table.periodType),
]);

// Schema types for sentiment dashboard
/**
 * Insert schema for sentimentMetrics table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertSentimentMetricsSchema = createInsertSchema(sentimentMetrics, {
  periodType: z.enum(["day", "week", "month"]),
  categories: z.record(z.string(), sentimentCategorySchema).optional(),
  painPoints: z.array(painPointSchema).optional(),
  metadata: z.record(z.any()).optional(),
}).omit({
  id: true,
  createdAt: true,
});

/**
 * Insert schema for sentimentAlerts table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertSentimentAlertsSchema = createInsertSchema(sentimentAlerts, {
  alertType: z.enum(["sentiment_drop", "sustained_negative", "volume_spike", "category_issue"]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  metadata: sentimentAlertMetadataSchema.optional(),
}).omit({
  id: true,
  triggeredAt: true,
  status: true,
  notificationSent: true,
});

/**
 * Insert schema for sentimentSegments table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertSentimentSegmentsSchema = createInsertSchema(sentimentSegments, {
  periodType: z.enum(["day", "week", "month"]),
  trendDirection: z.enum(["up", "down", "stable"]).optional(),
  topIssues: z.array(sentimentIssueSchema).optional(),
  topPraises: z.array(sentimentPraiseSchema).optional(),
  metadata: z.record(z.any()).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertSentimentMetrics = z.infer<typeof insertSentimentMetricsSchema>;
export type SentimentMetrics = typeof sentimentMetrics.$inferSelect;

export type InsertSentimentAlerts = z.infer<typeof insertSentimentAlertsSchema>;
export type SentimentAlerts = typeof sentimentAlerts.$inferSelect;

export type InsertSentimentSegments = z.infer<typeof insertSentimentSegmentsSchema>;
export type SentimentSegments = typeof sentimentSegments.$inferSelect;

/**
 * Sentiment Results Table
 * 
 * Stores comprehensive sentiment analysis results for user-generated content using AI.
 * Combines TensorFlow.js for basic sentiment and OpenAI for nuanced emotion detection.
 * Includes key phrase extraction and contextual factors for enhanced analysis.
 * 
 * Fields:
 * - id: UUID primary key
 * - contentId: Unique identifier for the analyzed content
 * - userId: Foreign key to users.id (CASCADE delete)
 * - contentType: Type of content analyzed (review, comment, feedback, etc.)
 * - content: The actual text analyzed
 * - sentiment: Overall sentiment classification
 *   - 'positive': Positive emotional tone
 *   - 'negative': Negative emotional tone  
 *   - 'neutral': Neither positive nor negative
 *   - 'mixed': Contains both positive and negative elements
 * - confidence: Confidence score for sentiment (0.0 to 1.0)
 * - sentimentData: Comprehensive sentiment analysis data (SentimentData interface)
 *   - overallScore: Overall sentiment score from -1 to 1
 *   - polarity: Sentiment classification
 *   - subjectivity: Subjectivity score (0-1)
 *   - documentScore: Document-level metrics
 *   - aspectScores: Aspect-based sentiment scores
 * - emotionScores: Emotion detection scores (EmotionScores interface)
 *   - joy, sadness, anger, fear, surprise, disgust
 *   - Extensible for additional emotions
 * - keyPhrases: Extracted key phrases with relevance scores (KeyPhrase[] interface)
 *   - phrase: The extracted phrase text
 *   - relevance: Relevance score (0-1)
 *   - position: Character offset in text
 *   - sentiment: Phrase-level sentiment
 * - contextFactors: Contextual factors affecting sentiment (ContextFactor[] interface)
 *   - type: Context type (temporal, cultural, etc.)
 *   - description: Factor description
 *   - weight: Impact weight (0-1)
 *   - effect: How it affects sentiment
 * - topics: Array of identified topics/themes in the content
 * - keywords: Array of significant keywords extracted
 * - aspectSentiments: JSONB with aspect-based sentiment analysis
 *   - e.g., {delivery: "negative", quality: "positive", price: "neutral"}
 * - modelVersion: Version of the analysis model used
 * - metadata: Additional analysis metadata
 * - analyzedAt: Timestamp of when analysis was performed
 * 
 * Use Cases:
 * - Customer feedback analysis
 * - Review sentiment tracking
 * - User mood monitoring
 * - Content moderation support
 * - Product/service improvement insights
 * 
 * Business Rules:
 * - Each content piece analyzed once (unique contentId)
 * - Reanalysis creates new record with same contentId
 * - Confidence threshold of 0.6 for reliable classification
 * - Mixed sentiment when positive and negative both > 0.3
 * 
 * Indexes:
 * - sentiment_results_user_id_idx: User's sentiment history
 * - sentiment_results_content_id_idx: Lookup by content
 * - sentiment_results_sentiment_idx: Filter by sentiment
 * - sentiment_results_analyzed_at_idx: Time-based queries
 * 
 * Relationships:
 * - users → sentimentResults: CASCADE
 */
export const sentimentResults = pgTable("sentiment_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentId: varchar("content_id").notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  contentType: text("content_type"), // 'review', 'comment', 'feedback', 'chat', etc.
  content: text("content").notNull(),
  
  // Core sentiment
  sentiment: text("sentiment").notNull().$type<"positive" | "negative" | "neutral" | "mixed">(),
  confidence: real("confidence").notNull(),
  
  // Comprehensive sentiment analysis (using SentimentData interface)
  sentimentData: jsonb("sentiment_data").$type<SentimentData>(),
  
  // Emotion detection (using EmotionScores interface)
  emotionScores: jsonb("emotion_scores").$type<EmotionScores>(),
  
  // Key phrase extraction (using KeyPhrase[] interface)
  keyPhrases: jsonb("key_phrases").$type<KeyPhrase[]>(),
  
  // Contextual factors (using ContextFactor[] interface)
  contextFactors: jsonb("context_factors").$type<ContextFactor[]>(),
  
  // Content analysis
  topics: text("topics").array(),
  keywords: text("keywords").array(),
  
  // Aspect-based sentiment (e.g., for product reviews)
  aspectSentiments: jsonb("aspect_sentiments").$type<Record<string, string>>(),
  
  // Metadata
  modelVersion: text("model_version").notNull().default("v1.0"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  analyzedAt: timestamp("analyzed_at").notNull().defaultNow(),
}, (table) => [
  index("sentiment_results_user_id_idx").on(table.userId),
  index("sentiment_results_content_id_idx").on(table.contentId),
  index("sentiment_results_sentiment_idx").on(table.sentiment),
  index("sentiment_results_analyzed_at_idx").on(table.analyzedAt),
]);

/**
 * Sentiment Trends Table
 * 
 * Aggregated sentiment statistics over time periods.
 * Pre-computed trends for dashboard visualization.
 * 
 * Fields:
 * - id: UUID primary key  
 * - userId: Foreign key to users.id (NULL for global trends)
 * - timePeriod: Period identifier (e.g., "2024-01", "2024-W01", "2024-Q1")
 * - periodType: Type of period aggregation
 *   - 'hour': Hourly aggregation
 *   - 'day': Daily aggregation
 *   - 'week': Weekly aggregation
 *   - 'month': Monthly aggregation
 *   - 'quarter': Quarterly aggregation
 *   - 'year': Yearly aggregation
 * - avgSentiment: Average sentiment score (-1 to 1)
 * - totalAnalyzed: Total items analyzed in period
 * - sentimentCounts: Count by sentiment type
 *   - positive: Number of positive items
 *   - negative: Number of negative items
 *   - neutral: Number of neutral items
 *   - mixed: Number of mixed sentiment items
 * - dominantEmotions: Top emotions for the period
 * - topTopics: Most discussed topics
 * - contentTypes: Breakdown by content type
 * - metadata: Additional trend data
 * - createdAt: When trend was calculated
 * 
 * Aggregation Strategy:
 * - Calculate hourly for last 24 hours
 * - Calculate daily for last 30 days
 * - Calculate weekly for last 12 weeks
 * - Calculate monthly for all time
 * - Run aggregation job every hour
 * 
 * Business Rules:
 * - Global trends have userId = NULL
 * - User trends specific to userId
 * - Recalculate on new analysis
 * - Retain for historical comparison
 * 
 * Indexes:
 * - sentiment_trends_user_id_idx: User-specific trends
 * - sentiment_trends_period_idx: Time period lookup
 * - sentiment_trends_type_idx: Filter by period type
 * 
 * Relationships:
 * - users → sentimentTrends: CASCADE (for user trends)
 */
export const sentimentTrends = pgTable("sentiment_trends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // NULL for global
  
  timePeriod: text("time_period").notNull(), // "2024-01", "2024-W01", etc.
  periodType: text("period_type").notNull().$type<"hour" | "day" | "week" | "month" | "quarter" | "year">(),
  
  // Aggregated metrics
  avgSentiment: real("avg_sentiment").notNull(), // -1 (negative) to 1 (positive)
  totalAnalyzed: integer("total_analyzed").notNull(),
  
  sentimentCounts: jsonb("sentiment_counts").notNull().$type<{
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  }>(),
  
  // Top insights
  dominantEmotions: jsonb("dominant_emotions").$type<Array<{
    emotion: string;
    count: number;
    avgIntensity: number;
  }>>(),
  
  topTopics: text("top_topics").array(),
  
  // Breakdown by content type
  contentTypes: jsonb("content_types").$type<Record<string, {
    count: number;
    avgSentiment: number;
  }>>(),
  
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("sentiment_trends_user_id_idx").on(table.userId),
  index("sentiment_trends_period_idx").on(table.timePeriod),
  index("sentiment_trends_type_idx").on(table.periodType),
  uniqueIndex("sentiment_trends_unique_idx").on(table.userId, table.timePeriod, table.periodType),
]);

// ==================== Schema Types for Sentiment Analysis ====================

/**
 * Insert schema for sentimentResults table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertSentimentResultsSchema = createInsertSchema(sentimentResults, {
  sentiment: z.enum(["positive", "negative", "neutral", "mixed"]),
  sentimentData: sentimentDataSchema.optional(),
  emotionScores: emotionScoresSchema.optional(),
  keyPhrases: z.array(keyPhraseSchema).optional(),
  contextFactors: z.array(contextFactorSchema).optional(),
  aspectSentiments: z.record(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
}).omit({
  id: true,
  analyzedAt: true,
  modelVersion: true,
});

/**
 * Insert schema for sentimentTrends table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertSentimentTrendSchema = createInsertSchema(sentimentTrends, {
  periodType: z.enum(["hour", "day", "week", "month", "quarter", "year"]),
  sentimentCounts: z.record(z.number()).optional(),
  dominantEmotions: z.array(z.object({
    emotion: z.string(),
    count: z.number().int().nonnegative(),
    avgIntensity: z.number(),
  })).optional(),
  contentTypes: z.record(z.object({
    count: z.number().int().nonnegative(),
    avgSentiment: z.number(),
  })).optional(),
  metadata: z.record(z.any()).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertSentimentResults = z.infer<typeof insertSentimentResultsSchema>;
export type SentimentResults = typeof sentimentResults.$inferSelect;

export type InsertSentimentTrend = z.infer<typeof insertSentimentTrendSchema>;
export type SentimentTrend = typeof sentimentTrends.$inferSelect;

// Backward compatibility aliases
export const sentimentAnalysis = sentimentResults;
export type SentimentAnalysis = SentimentResults;
export type InsertSentimentAnalysis = InsertSentimentResults;
export const insertSentimentAnalysisSchema = insertSentimentResultsSchema;

/**
 * Auto-Save Drafts Table
 * 
 * Stores draft versions of user content with intelligent auto-save.
 * Maintains version history for recovery and undo functionality.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id
 * - documentId: Unique identifier for the document being edited
 * - documentType: Type of content (chat, recipe, note, etc.)
 * - content: The actual content being saved
 * - contentHash: Hash of content for duplicate detection
 * - version: Version number for this draft
 * - metadata: Additional context (cursor position, scroll position, etc.)
 * - savedAt: Timestamp when draft was saved
 * - isAutoSave: Whether this was an automatic save
 * - conflictResolved: Whether conflicts were resolved in this version
 * 
 * Business Rules:
 * - Keep last 10 versions per document
 * - Auto-delete drafts older than 30 days
 * - Detect and merge conflicting edits
 * - Skip saving if content hash unchanged
 * 
 * Indexes:
 * - auto_save_drafts_user_id_idx: User's drafts
 * - auto_save_drafts_document_idx: Document versions
 * - auto_save_drafts_saved_at_idx: Time-based cleanup
 * 
 * Relationships:
 * - users → autoSaveDrafts: CASCADE
 */
export const autoSaveDrafts = pgTable("auto_save_drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  documentId: varchar("document_id").notNull(),
  documentType: text("document_type").$type<"chat" | "recipe" | "note" | "meal_plan" | "shopping_list" | "other">(),
  
  content: text("content").notNull(),
  contentHash: varchar("content_hash"),
  version: integer("version").notNull().default(1),
  
  // Editor state and device information (using AutoSaveData interface)
  metadata: jsonb("metadata").$type<AutoSaveData>(),
  
  savedAt: timestamp("saved_at").notNull().defaultNow(),
  isAutoSave: boolean("is_auto_save").notNull().default(true),
  conflictResolved: boolean("conflict_resolved").default(false),
}, (table) => [
  index("auto_save_drafts_user_id_idx").on(table.userId),
  index("auto_save_drafts_document_idx").on(table.documentId, table.userId),
  index("auto_save_drafts_saved_at_idx").on(table.savedAt),
  uniqueIndex("auto_save_drafts_unique_version_idx").on(table.documentId, table.userId, table.version),
]);

/**
 * Save Patterns Table
 * 
 * Stores user typing patterns for intelligent pause detection.
 * Uses TensorFlow.js to learn optimal save timings per user.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id
 * - avgPauseDuration: Average pause between typing bursts (ms)
 * - typingSpeed: Average words per minute
 * - saveFrequency: Average saves per session
 * - sentencePauseDuration: Average pause after sentences (ms)
 * - paragraphPauseDuration: Average pause after paragraphs (ms)
 * - preferredSaveInterval: Learned optimal save interval (ms)
 * - patternData: Raw typing pattern data for ML model
 * - modelWeights: TensorFlow.js model weights
 * - lastAnalyzed: When patterns were last analyzed
 * - totalSessions: Total editing sessions analyzed
 * 
 * ML Features:
 * - Keystroke timing patterns
 * - Pause duration clustering
 * - Natural break detection
 * - Personalized thresholds
 * 
 * Business Rules:
 * - Update patterns every 10 saves
 * - Minimum 5 sessions before personalization
 * - Fall back to defaults for new users
 * - Respect manual save as training signal
 * 
 * Indexes:
 * - save_patterns_user_id_idx: User pattern lookup
 * - save_patterns_analyzed_idx: Pattern update scheduling
 * 
 * Relationships:
 * - users → savePatterns: CASCADE
 */
export const savePatterns = pgTable("save_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Basic typing metrics
  avgPauseDuration: real("avg_pause_duration").default(2000), // milliseconds
  typingSpeed: real("typing_speed").default(40), // words per minute
  saveFrequency: real("save_frequency").default(0.5), // saves per minute
  
  // Detailed pause patterns
  sentencePauseDuration: real("sentence_pause_duration").default(2500),
  paragraphPauseDuration: real("paragraph_pause_duration").default(4000),
  preferredSaveInterval: real("preferred_save_interval").default(3000),
  
  // ML model data
  patternData: jsonb("pattern_data").$type<{
    pauseHistogram?: number[];
    keystrokeIntervals?: number[];
    burstLengths?: number[];
    timeOfDayPreferences?: Record<string, number>;
    contentTypePatterns?: Record<string, any>;
  }>(),
  
  modelWeights: jsonb("model_weights").$type<{
    weights?: number[][];
    bias?: number[];
    version?: string;
  }>(),
  
  // Metadata
  lastAnalyzed: timestamp("last_analyzed").defaultNow(),
  totalSessions: integer("total_sessions").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("save_patterns_user_idx").on(table.userId),
  index("save_patterns_analyzed_idx").on(table.lastAnalyzed),
]);

// ==================== Insert Schemas for Auto-Save ====================

/**
 * Insert schema for autoSaveDrafts table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertAutoSaveDraftSchema = createInsertSchema(autoSaveDrafts)
  .omit({
    id: true,
    savedAt: true,
    version: true,
    isAutoSave: true,
    conflictResolved: true,
  })
  .extend({
    metadata: autoSaveDataSchema.optional(),
  });

export const insertSavePatternSchema = createInsertSchema(savePatterns)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastAnalyzed: true,
  })
  .extend({
    patternData: z.object({
      pauseHistogram: z.array(z.number()).optional(),
      keystrokeIntervals: z.array(z.number()).optional(),
      burstLengths: z.array(z.number()).optional(),
      timeOfDayPreferences: z.record(z.number()).optional(),
      contentTypePatterns: z.record(z.any()).optional(),
    }).optional(),
    modelWeights: z.object({
      weights: z.array(z.array(z.number())).optional(),
      bias: z.array(z.number()).optional(),
      version: z.string().optional(),
    }).optional(),
  });

export type InsertAutoSaveDraft = z.infer<typeof insertAutoSaveDraftSchema>;
export type AutoSaveDraft = typeof autoSaveDrafts.$inferSelect;

export type InsertSavePattern = z.infer<typeof insertSavePatternSchema>;
export type SavePattern = typeof savePatterns.$inferSelect;

/**
 * Form Completions Table
 * 
 * Stores common values and patterns for form fields across all users.
 * Used to provide intelligent suggestions based on aggregated data.
 * 
 * Fields:
 * - id: UUID primary key
 * - fieldName: Name/identifier of the form field (email, city, etc.)
 * - fieldType: HTML input type or semantic type
 * - commonValues: Array of common values with usage counts
 * - patterns: Regex patterns that match valid inputs
 * - contextRules: Rules for context-aware suggestions
 * - globalUsageCount: Total times this field has been filled
 * - lastUpdated: When the statistics were last updated
 * 
 * Business Rules:
 * - Update statistics hourly or after 100 new inputs
 * - Keep top 100 most common values per field
 * - Privacy: Never store personally identifiable values globally
 * - Use for fields like: country, state, city, language, timezone
 * 
 * Indexes:
 * - form_completions_field_idx: Field name lookup
 * - form_completions_updated_idx: Update scheduling
 * 
 * Relationships:
 * - None (global data, not user-specific)
 */
export const formCompletions = pgTable("form_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fieldName: text("field_name").notNull(),
  fieldType: text("field_type"), // 'email', 'tel', 'address', 'city', 'state', etc.
  
  commonValues: jsonb("common_values").$type<Array<{
    value: string;
    count: number;
    lastUsed: string; // ISO date
    metadata?: Record<string, any>;
  }>>(),
  
  patterns: jsonb("patterns").$type<Array<{
    regex: string;
    description: string;
    priority: number;
  }>>(),
  
  contextRules: jsonb("context_rules").$type<Array<{
    condition: string; // e.g., "if field:country = 'USA'"
    suggestions: string[];
    priority: number;
  }>>(),
  
  globalUsageCount: integer("global_usage_count").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("form_completions_field_idx").on(table.fieldName),
  index("form_completions_updated_idx").on(table.lastUpdated),
]);

/**
 * User Form History Table
 * 
 * Tracks individual user's form input history for personalized suggestions.
 * Learns user preferences and patterns over time.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id
 * - fieldName: Name/identifier of the form field
 * - valuesUsed: History of values entered by this user
 * - frequencyMap: Map of value to usage frequency
 * - lastSequence: Last sequence of form fills (for pattern detection)
 * - preferences: User's form preferences (auto-fill settings)
 * - updatedAt: Last update timestamp
 * 
 * ML Features:
 * - Value frequency analysis
 * - Sequential pattern detection
 * - Time-based patterns (e.g., different addresses for work/home)
 * - Cross-field correlations
 * 
 * Business Rules:
 * - Limit to 50 values per field per user
 * - Auto-expire values not used in 90 days
 * - Encrypt sensitive fields (SSN, credit card)
 * - User can clear history anytime
 * 
 * Indexes:
 * - user_form_history_user_idx: User lookup
 * - user_form_history_field_idx: Field lookup
 * - user_form_history_updated_idx: Cleanup scheduling
 * 
 * Relationships:
 * - users → userFormHistory: CASCADE
 */
export const userFormHistory = pgTable("user_form_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  fieldName: text("field_name").notNull(),
  
  valuesUsed: jsonb("values_used").$type<Array<{
    value: string;
    count: number;
    lastUsed: string; // ISO date
    context?: Record<string, any>; // Page, time of day, etc.
  }>>(),
  
  frequencyMap: jsonb("frequency_map").$type<Record<string, number>>(),
  
  lastSequence: jsonb("last_sequence").$type<Array<{
    fieldName: string;
    value: string;
    timestamp: string;
  }>>(),
  
  preferences: jsonb("preferences").$type<{
    autoFillEnabled?: boolean;
    rememberValues?: boolean;
    suggestSimilar?: boolean;
    privacyMode?: boolean;
  }>(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("user_form_history_unique_idx").on(table.userId, table.fieldName),
  index("user_form_history_user_idx").on(table.userId),
  index("user_form_history_field_idx").on(table.fieldName),
  index("user_form_history_updated_idx").on(table.updatedAt),
]);

/**
 * Completion Feedback Table
 * 
 * Tracks whether auto-completion suggestions were accepted or modified.
 * Used to improve ML model accuracy and suggestion relevance.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (optional for anonymous)
 * - fieldName: Field that received suggestion
 * - suggestionId: ID of the suggestion shown
 * - suggestedValue: The value that was suggested
 * - wasSelected: Whether user selected the suggestion
 * - finalValue: What the user ultimately entered
 * - context: Context when suggestion was made
 * - responseTime: Time taken to accept/reject (ms)
 * - createdAt: When feedback was recorded
 * 
 * ML Training:
 * - Positive examples: wasSelected = true
 * - Negative examples: wasSelected = false
 * - Correction examples: wasSelected = false with finalValue
 * - Used to retrain suggestion models
 * 
 * Business Rules:
 * - Anonymous feedback allowed (userId can be null)
 * - Batch process for model retraining daily
 * - Aggregate statistics for A/B testing
 * - Clean up after 30 days
 * 
 * Indexes:
 * - completion_feedback_user_idx: User feedback history
 * - completion_feedback_field_idx: Field performance
 * - completion_feedback_created_idx: Cleanup scheduling
 * 
 * Relationships:
 * - users → completionFeedback: SET NULL (preserve anonymous feedback)
 */
export const completionFeedback = pgTable("completion_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  
  fieldName: text("field_name").notNull(),
  suggestionId: varchar("suggestion_id"),
  suggestedValue: text("suggested_value"),
  wasSelected: boolean("was_selected").notNull(),
  finalValue: text("final_value"),
  
  context: jsonb("context").$type<{
    pageUrl?: string;
    formId?: string;
    otherFields?: Record<string, string>;
    deviceType?: string;
    timestamp?: string;
  }>(),
  
  responseTime: integer("response_time"), // milliseconds
  confidence: real("confidence"), // Model confidence score (0-1)
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("completion_feedback_user_idx").on(table.userId),
  index("completion_feedback_field_idx").on(table.fieldName),
  index("completion_feedback_created_idx").on(table.createdAt),
]);

// Schema types for form completions

/**
 * Insert schema for formCompletions table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertFormCompletionSchema = createInsertSchema(formCompletions)
  .omit({
    id: true,
    createdAt: true,
    lastUpdated: true,
  })
  .extend({
    commonValues: z.array(z.object({
      value: z.string(),
      count: z.number().int().nonnegative(),
      lastUsed: z.string(),
      metadata: z.record(z.any()).optional(),
    })).optional(),
    patterns: z.array(z.object({
      regex: z.string(),
      description: z.string(),
      priority: z.number().int(),
    })).optional(),
    contextRules: z.array(z.object({
      condition: z.string(),
      suggestions: z.array(z.string()),
      priority: z.number().int(),
    })).optional(),
  });

/**
 * Insert schema for userFormHistory table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertUserFormHistorySchema = createInsertSchema(userFormHistory)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    valuesUsed: z.array(z.object({
      value: z.string(),
      count: z.number().int().nonnegative(),
      lastUsed: z.string(),
      context: z.record(z.any()).optional(),
    })).optional(),
    frequencyMap: z.record(z.number()).optional(),
    lastSequence: z.array(z.object({
      fieldName: z.string(),
      value: z.string(),
      timestamp: z.string(),
    })).optional(),
    preferences: z.object({
      autoFillEnabled: z.boolean().optional(),
      rememberValues: z.boolean().optional(),
      suggestSimilar: z.boolean().optional(),
      privacyMode: z.boolean().optional(),
    }).optional(),
  });

/**
 * Insert schema for completionFeedback table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertCompletionFeedbackSchema = createInsertSchema(completionFeedback)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    context: z.object({
      pageUrl: z.string().optional(),
      formId: z.string().optional(),
      otherFields: z.record(z.string()).optional(),
      deviceType: z.string().optional(),
      timestamp: z.string().optional(),
    }).optional(),
  });

export type InsertFormCompletion = z.infer<typeof insertFormCompletionSchema>;
export type FormCompletion = typeof formCompletions.$inferSelect;

export type InsertUserFormHistory = z.infer<typeof insertUserFormHistorySchema>;
export type UserFormHistory = typeof userFormHistory.$inferSelect;

export type InsertCompletionFeedback = z.infer<typeof insertCompletionFeedbackSchema>;
export type CompletionFeedback = typeof completionFeedback.$inferSelect;

/**
 * Validation Rules Table
 * 
 * Stores intelligent validation rules and patterns for form fields.
 * Combines regex patterns with AI-powered suggestions for better UX.
 * 
 * Fields:
 * - id: UUID primary key
 * - fieldType: Type of field (phone, email, zip, ssn, date, etc.)
 * - rules: JSONB with validation logic
 *   - patterns: Array of regex patterns
 *   - formatters: Formatting rules
 *   - validators: Custom validation functions
 *   - lengthConstraints: Min/max length
 *   - characterConstraints: Allowed character sets
 * - errorMessages: JSONB with contextual error messages
 *   - default: Default error message
 *   - tooShort: When input is too short
 *   - tooLong: When input is too long
 *   - invalidFormat: When format doesn't match
 *   - missing: When required field is empty
 * - suggestions: JSONB with fix suggestions
 *   - autoCorrect: Automatic corrections
 *   - formatHints: Format examples
 *   - commonMistakes: Common error patterns
 *   - quickFixes: One-click fixes
 * - aiConfig: JSONB with AI configuration
 *   - useAI: Whether to use AI for this field type
 *   - model: Which OpenAI model to use
 *   - temperature: AI creativity level
 *   - maxSuggestions: Max number of AI suggestions
 * - priority: Validation priority (higher = check first)
 * - isActive: Whether this rule is currently active
 * - createdAt: Rule creation timestamp
 * - updatedAt: Last rule update timestamp
 * 
 * Business Rules:
 * - Multiple rules can exist for same fieldType (priority determines order)
 * - AI suggestions complement regex validation
 * - Rules can be deactivated without deletion
 * - System learns from user corrections
 * 
 * Indexes:
 * - validation_rules_field_type_idx: Quick lookup by field type
 * - validation_rules_active_priority_idx: Active rules in priority order
 */
export const validationRules = pgTable("validation_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fieldType: text("field_type").notNull(), // phone, email, zip, ssn, date, etc.
  
  rules: jsonb("rules").$type<{
    patterns: Array<{ regex: string; flags?: string; description?: string }>;
    formatters?: Array<{ from: string; to: string }>;
    validators?: Array<{ type: string; params?: any }>;
    lengthConstraints?: { min?: number; max?: number };
    characterConstraints?: { allowed?: string; forbidden?: string };
  }>().notNull().default({
    patterns: []
  }),
  
  errorMessages: jsonb("error_messages").$type<{
    default?: string;
    tooShort?: string;
    tooLong?: string;
    invalidFormat?: string;
    missing?: string;
    [key: string]: string | undefined;
  }>().notNull().default({
    default: "Please enter a valid value"
  }),
  
  suggestions: jsonb("suggestions").$type<{
    autoCorrect?: Array<{ pattern: string; replacement: string }>;
    formatHints?: string[];
    commonMistakes?: Array<{ mistake: string; correction: string }>;
    quickFixes?: Array<{ label: string; action: string; value?: string }>;
  }>().notNull().default({
    formatHints: []
  }),
  
  aiConfig: jsonb("ai_config").$type<{
    useAI?: boolean;
    model?: string;
    temperature?: number;
    maxSuggestions?: number;
    contextFields?: string[];
  }>().notNull().default({
    useAI: true,
    model: "gpt-3.5-turbo",
    temperature: 0.3,
    maxSuggestions: 3
  }),
  
  priority: integer("priority").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("validation_rules_field_type_idx").on(table.fieldType),
  index("validation_rules_active_priority_idx").on(table.isActive, table.priority),
]);

/**
 * Validation Errors Table
 * 
 * Tracks validation errors and user corrections for ML improvement.
 * Learns from patterns to provide better suggestions over time.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (SET NULL for anonymous tracking)
 * - fieldName: Name of the form field
 * - fieldType: Type of field (from validationRules)
 * - errorType: Type of error encountered
 *   - format: Format validation failed
 *   - length: Length constraints violated
 *   - required: Required field empty
 *   - custom: Custom validation failed
 *   - ai_suggestion: AI suggestion not accepted
 * - originalValue: What the user originally entered
 * - suggestedValue: What the system suggested
 * - finalValue: What the user ultimately used
 * - userResolution: How the user resolved the error
 *   - accepted_suggestion: Used system suggestion
 *   - manual_correction: Fixed it themselves
 *   - ignored: Proceeded without fixing
 *   - abandoned: Left the form
 * - frequency: How often this error occurs (for this user)
 * - context: JSONB with additional context
 *   - formId: Which form this occurred on
 *   - pageUrl: Page where error occurred
 *   - otherFields: Values of related fields
 *   - sessionId: Session identifier
 *   - deviceInfo: Device/browser info
 * - aiSuggestions: JSONB with AI-generated suggestions
 *   - suggestions: Array of suggestions provided
 *   - selectedIndex: Which suggestion was selected (-1 if none)
 *   - confidence: AI confidence scores
 *   - reasoning: AI reasoning for suggestions
 * - resolutionTime: Time taken to resolve error (ms)
 * - createdAt: When error occurred
 * 
 * Business Rules:
 * - Errors tracked even for anonymous users
 * - Used to train and improve validation rules
 * - Aggregated for pattern analysis
 * - Privacy-compliant data retention (auto-cleanup after 90 days)
 * 
 * Indexes:
 * - validation_errors_user_field_idx: User's error history
 * - validation_errors_field_type_idx: Field type analysis
 * - validation_errors_error_type_idx: Error type distribution
 * - validation_errors_created_idx: Time-based queries and cleanup
 */
export const validationErrors = pgTable("validation_errors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  
  fieldName: text("field_name").notNull(),
  fieldType: text("field_type").notNull(),
  errorType: text("error_type").notNull(), // format, length, required, custom, ai_suggestion
  
  originalValue: text("original_value"),
  suggestedValue: text("suggested_value"),
  finalValue: text("final_value"),
  userResolution: text("user_resolution"), // accepted_suggestion, manual_correction, ignored, abandoned
  
  frequency: integer("frequency").notNull().default(1),
  
  context: jsonb("context").$type<{
    formId?: string;
    pageUrl?: string;
    otherFields?: Record<string, any>;
    sessionId?: string;
    deviceInfo?: {
      userAgent?: string;
      viewport?: { width: number; height: number };
      locale?: string;
    };
  }>(),
  
  aiSuggestions: jsonb("ai_suggestions").$type<{
    suggestions?: Array<{
      value: string;
      confidence: number;
      reasoning?: string;
    }>;
    selectedIndex?: number;
    model?: string;
    processingTime?: number;
  }>(),
  
  resolutionTime: integer("resolution_time"), // milliseconds
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("validation_errors_user_field_idx").on(table.userId, table.fieldName),
  index("validation_errors_field_type_idx").on(table.fieldType),
  index("validation_errors_error_type_idx").on(table.errorType),
  index("validation_errors_created_idx").on(table.createdAt),
]);

// Schema types for validation system

/**
 * Insert schema for validationRules table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertValidationRuleSchema = createInsertSchema(validationRules)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    rules: z.object({
      patterns: z.array(z.object({
        regex: z.string(),
        flags: z.string().optional(),
        description: z.string().optional(),
      })),
      formatters: z.array(z.object({
        from: z.string(),
        to: z.string(),
      })).optional(),
      validators: z.array(z.object({
        type: z.string(),
        params: z.any().optional(),
      })).optional(),
      lengthConstraints: z.object({
        min: z.number().int().nonnegative().optional(),
        max: z.number().int().positive().optional(),
      }).optional(),
      characterConstraints: z.object({
        allowed: z.string().optional(),
        forbidden: z.string().optional(),
      }).optional(),
    }),
    errorMessages: z.object({
      default: z.string().optional(),
      tooShort: z.string().optional(),
      tooLong: z.string().optional(),
      invalidFormat: z.string().optional(),
      missing: z.string().optional(),
    }).catchall(z.string()),
    suggestions: z.object({
      autoCorrect: z.array(z.object({
        pattern: z.string(),
        replacement: z.string(),
      })).optional(),
      formatHints: z.array(z.string()).optional(),
      commonMistakes: z.array(z.object({
        mistake: z.string(),
        correction: z.string(),
      })).optional(),
      quickFixes: z.array(z.object({
        label: z.string(),
        action: z.string(),
        value: z.string().optional(),
      })).optional(),
    }),
    aiConfig: z.object({
      useAI: z.boolean().optional(),
      model: z.string().optional(),
      temperature: z.number().optional(),
      maxSuggestions: z.number().int().positive().optional(),
      contextFields: z.array(z.string()).optional(),
    }),
  });

/**
 * Insert schema for validationErrors table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertValidationErrorSchema = createInsertSchema(validationErrors)
  .omit({
    id: true,
    createdAt: true,
  })
  .extend({
    context: z.object({
      formId: z.string().optional(),
      pageUrl: z.string().optional(),
      otherFields: z.record(z.any()).optional(),
      sessionId: z.string().optional(),
      deviceInfo: z.object({
        userAgent: z.string().optional(),
        viewport: z.object({
          width: z.number().int().positive(),
          height: z.number().int().positive(),
        }).optional(),
        locale: z.string().optional(),
      }).optional(),
    }).optional(),
    aiSuggestions: z.object({
      suggestions: z.array(z.object({
        value: z.string(),
        confidence: z.number(),
        reasoning: z.string().optional(),
      })).optional(),
      selectedIndex: z.number().int().nonnegative().optional(),
      model: z.string().optional(),
      processingTime: z.number().int().nonnegative().optional(),
    }).optional(),
  });

export type InsertValidationRule = z.infer<typeof insertValidationRuleSchema>;
export type ValidationRule = typeof validationRules.$inferSelect;

export type InsertValidationError = z.infer<typeof insertValidationErrorSchema>;
export type ValidationError = typeof validationErrors.$inferSelect;

/**
 * Analytics Insights Table
 * 
 * Stores AI-generated explanations of data trends, patterns, and anomalies.
 * Provides plain-language interpretations for non-technical users.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - metricName: Name of the metric being analyzed (e.g., "traffic", "revenue", "user_engagement")
 * - insightText: Plain-language explanation of the trend/pattern/anomaly
 * - importance: Priority level (1-5, where 5 is most important)
 * - period: Time period of analysis (e.g., "daily", "weekly", "monthly")
 * - metricData: JSONB with actual data points and statistics
 * - aiContext: JSONB with AI reasoning and confidence scores
 * - category: Type of insight (e.g., "trend", "anomaly", "prediction", "comparison")
 * - isRead: Whether user has viewed this insight
 * - createdAt: When insight was generated
 * 
 * Business Rules:
 * - Insights generated via OpenAI GPT-4 based on data analysis
 * - Importance determines notification priority
 * - Unread insights shown prominently in dashboard
 * - Historical insights preserved for trend analysis
 * 
 * Indexes:
 * - analytics_insights_user_id_idx: User's insights lookup
 * - analytics_insights_importance_idx: Priority-based queries
 * - analytics_insights_created_idx: Time-based filtering
 */
export const analyticsInsights = pgTable("analytics_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  metricName: text("metric_name").notNull(),
  insightText: text("insight_text").notNull(),
  importance: integer("importance").notNull().default(3), // 1-5 scale
  period: text("period").notNull(), // "daily", "weekly", "monthly", "custom"
  
  // Metric data with trends and comparisons (using AnalyticsInsightData interface)
  metricData: jsonb("metric_data").$type<AnalyticsInsightData>(),
  
  // AI reasoning and context (flexible structure)
  aiContext: jsonb("ai_context").$type<Record<string, any>>(),
  
  category: text("category").notNull().default("trend"), // "trend", "anomaly", "prediction", "comparison"
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("analytics_insights_user_id_idx").on(table.userId),
  index("analytics_insights_importance_idx").on(table.importance),
  index("analytics_insights_created_idx").on(table.createdAt),
]);

/**
 * Insight Feedback Table
 * 
 * Tracks user feedback on generated insights for quality improvement.
 * Helps train and refine AI interpretation accuracy.
 * 
 * Fields:
 * - id: UUID primary key
 * - insightId: Foreign key to analyticsInsights.id (CASCADE delete)
 * - userId: Foreign key to users.id (CASCADE delete)
 * - helpfulScore: Rating 1-5 on how helpful the insight was
 * - comments: User's feedback text
 * - wasActionable: Whether user could take action based on insight
 * - resultOutcome: What happened after acting on the insight
 * - createdAt: When feedback was submitted
 * 
 * Business Rules:
 * - One feedback per user per insight
 * - Feedback used to improve AI model prompts
 * - Low scores trigger manual review
 * - High scores promote similar insights
 * 
 * Indexes:
 * - insight_feedback_insight_id_idx: Insight's feedback lookup
 * - insight_feedback_user_insight_idx: Unique constraint
 */
export const insightFeedback = pgTable("insight_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  insightId: varchar("insight_id").notNull().references(() => analyticsInsights.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  helpfulScore: integer("helpful_score").notNull(), // 1-5 rating
  comments: text("comments"),
  wasActionable: boolean("was_actionable"),
  resultOutcome: text("result_outcome"), // "positive", "negative", "neutral", "not_applied"
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("insight_feedback_insight_id_idx").on(table.insightId),
  uniqueIndex("insight_feedback_user_insight_idx").on(table.userId, table.insightId),
]);

// Insert schemas and types for analytics
/**
 * Insert schema for analyticsInsights table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertAnalyticsInsightSchema = createInsertSchema(analyticsInsights)
  .omit({
    id: true,
    createdAt: true,
    importance: true,
    category: true,
    isRead: true,
  })
  .extend({
    metricData: analyticsInsightDataSchema.optional(),
    aiContext: z.record(z.any()).optional(),
  });

export const insertInsightFeedbackSchema = createInsertSchema(insightFeedback).omit({
  id: true,
  createdAt: true,
});

export type InsertAnalyticsInsight = z.infer<typeof insertAnalyticsInsightSchema>;
export type AnalyticsInsight = typeof analyticsInsights.$inferSelect;

export type InsertInsightFeedback = z.infer<typeof insertInsightFeedbackSchema>;
export type InsightFeedback = typeof insightFeedback.$inferSelect;

/**
 * User Predictions Table
 * 
 * Stores AI-generated predictions about user behavior, churn risk, and future actions.
 * Enables proactive interventions and personalized retention strategies.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - predictionType: Type of prediction
 *   - 'churn_risk': User likely to stop using the app
 *   - 'next_action': Predicted next user action
 *   - 'engagement_level': Future engagement prediction
 *   - 'upgrade_likelihood': Probability of upgrading to paid plan
 *   - 'feature_adoption': Likely to adopt specific features
 * - probability: Confidence score (0-1) for the prediction
 * - predictedDate: When the predicted event will occur
 * - factors: JSONB with contributing factors
 *   - activityPattern: Recent activity analysis
 *   - engagementScore: Current engagement level
 *   - lastActiveDate: Last meaningful interaction
 *   - featureUsage: Feature adoption patterns
 *   - sessionFrequency: Session patterns
 *   - contentInteraction: Content engagement metrics
 * - interventionSuggested: Recommended intervention type
 * - interventionTaken: Action actually taken
 * - status: Prediction lifecycle
 *   - 'pending': Awaiting predicted date
 *   - 'correct': Prediction was accurate
 *   - 'incorrect': Prediction was wrong
 *   - 'intervened': Intervention changed outcome
 * - modelVersion: ML model version used
 * - createdAt: Prediction generation timestamp
 * - resolvedAt: When prediction outcome was determined
 * 
 * Business Rules:
 * - Predictions above 0.8 probability trigger automatic interventions
 * - Churn predictions > 0.7 generate retention campaigns
 * - Daily batch processing for new predictions
 * - 30-day prediction window for most types
 * 
 * Indexes:
 * - user_predictions_user_id_idx: User's predictions
 * - user_predictions_type_idx: Filter by prediction type
 * - user_predictions_probability_idx: High-confidence predictions
 * - user_predictions_status_idx: Active vs resolved predictions
 * - user_predictions_predicted_date_idx: Time-based queries
 */
export const userPredictions = pgTable("user_predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  predictionType: text("prediction_type").notNull(), // 'churn_risk', 'next_action', 'engagement_level', etc.
  probability: real("probability").notNull(), // 0-1 confidence score
  predictedDate: timestamp("predicted_date").notNull(),
  
  // Prediction factors and features (using PredictionData interface)
  factors: jsonb("factors").$type<PredictionData>().notNull(),
  
  interventionSuggested: text("intervention_suggested"), // 'email_campaign', 'in_app_message', 'special_offer', etc.
  interventionTaken: text("intervention_taken"),
  status: text("status").notNull().default('pending'), // 'pending', 'correct', 'incorrect', 'intervened'
  modelVersion: text("model_version").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
}, (table) => [
  index("user_predictions_user_id_idx").on(table.userId),
  index("user_predictions_type_idx").on(table.predictionType),
  index("user_predictions_probability_idx").on(table.probability),
  index("user_predictions_status_idx").on(table.status),
  index("user_predictions_predicted_date_idx").on(table.predictedDate),
]);

/**
 * Prediction Accuracy Table
 * 
 * Tracks the accuracy of predictions to improve ML models over time.
 * Provides metrics for model performance and refinement.
 * 
 * Fields:
 * - id: UUID primary key
 * - predictionId: Foreign key to userPredictions.id (CASCADE delete)
 * - actualOutcome: What actually happened
 *   - 'churned': User stopped using the app
 *   - 'retained': User continued engagement
 *   - 'upgraded': User upgraded plan
 *   - 'action_taken': Predicted action occurred
 *   - 'action_not_taken': Predicted action didn't occur
 * - accuracyScore: Calculated accuracy (0-1)
 * - outcomeDate: When actual outcome occurred
 * - interventionImpact: Impact of intervention
 *   - 'positive': Intervention improved outcome
 *   - 'negative': Intervention worsened outcome
 *   - 'neutral': No significant impact
 *   - 'not_applicable': No intervention taken
 * - feedbackNotes: Additional context about outcome
 * - modelFeedback: Data for model improvement
 * - createdAt: Record creation timestamp
 * 
 * Business Rules:
 * - Accuracy tracked 30 days after prediction
 * - Scores below 0.6 trigger model retraining
 * - Monthly accuracy reports generated
 * - Intervention impact analyzed for ROI
 * 
 * Indexes:
 * - prediction_accuracy_prediction_id_idx: Unique prediction lookup
 * - prediction_accuracy_score_idx: Performance queries
 * - prediction_accuracy_outcome_date_idx: Time-based analysis
 */
export const predictionAccuracy = pgTable("prediction_accuracy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  predictionId: varchar("prediction_id").notNull().unique().references(() => userPredictions.id, { onDelete: "cascade" }),
  actualOutcome: text("actual_outcome").notNull(),
  accuracyScore: real("accuracy_score").notNull(), // 0-1
  outcomeDate: timestamp("outcome_date").notNull(),
  interventionImpact: text("intervention_impact"), // 'positive', 'negative', 'neutral', 'not_applicable'
  feedbackNotes: text("feedback_notes"),
  modelFeedback: jsonb("model_feedback").$type<{
    expectedFeatures?: Record<string, any>;
    actualFeatures?: Record<string, any>;
    featureDrift?: Record<string, number>;
    confidenceCalibration?: number;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("prediction_accuracy_prediction_id_idx").on(table.predictionId),
  index("prediction_accuracy_score_idx").on(table.accuracyScore),
  index("prediction_accuracy_outcome_date_idx").on(table.outcomeDate),
]);

// Insert schemas and types for predictions
/**
 * Insert schema for userPredictions table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertUserPredictionSchema = createInsertSchema(userPredictions, {
  factors: predictionDataSchema,
}).omit({
  id: true,
  createdAt: true,
  status: true,
});

/**
 * Insert schema for predictionAccuracy table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertPredictionAccuracySchema = createInsertSchema(predictionAccuracy, {
  modelFeedback: predictionAccuracyModelFeedbackSchema.optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertUserPrediction = z.infer<typeof insertUserPredictionSchema>;
export type UserPrediction = typeof userPredictions.$inferSelect;

export type InsertPredictionAccuracy = z.infer<typeof insertPredictionAccuracySchema>;
export type PredictionAccuracy = typeof predictionAccuracy.$inferSelect;

/**
 * Trends Table
 * 
 * Stores detected trends, patterns, and emerging behaviors from data analysis.
 * Uses TensorFlow.js for time series analysis and OpenAI for interpretation.
 * 
 * Fields:
 * - id: UUID primary key
 * - trendName: Descriptive name of the trend (e.g., "Sustainable Packaging Interest")
 * - trendType: Category of trend
 *   - 'topic': Emerging discussion topics
 *   - 'behavior': User behavior patterns
 *   - 'product': Product-related trends
 *   - 'sentiment': Sentiment shifts
 *   - 'usage': Platform usage patterns
 *   - 'seasonal': Seasonal patterns
 * - strength: Trend strength score (0-1)
 * - confidence: Detection confidence (0-1)
 * - growthRate: Percentage growth rate
 * - startDate: When the trend began
 * - peakDate: When the trend reached its peak
 * - endDate: When the trend ended (null if ongoing)
 * - status: Current trend status
 *   - 'emerging': Just detected, growing
 *   - 'active': Currently significant
 *   - 'peaking': At or near peak
 *   - 'declining': Losing momentum
 *   - 'ended': No longer active
 * - dataPoints: JSONB with trend data
 *   - timeSeries: Array of {date, value} points
 *   - keywords: Associated keywords/topics
 *   - entities: Named entities involved
 *   - sources: Data sources contributing to trend
 *   - metrics: Key performance metrics
 * - interpretation: AI-generated explanation of the trend
 * - businessImpact: Predicted business impact assessment
 * - recommendations: AI-suggested actions based on trend
 * - metadata: Additional trend metadata
 *   - detectionMethod: Algorithm used for detection
 *   - modelVersion: TensorFlow model version
 *   - dataWindow: Time window analyzed
 *   - sampleSize: Number of data points analyzed
 * - createdAt: When trend was first detected
 * - updatedAt: Last trend update
 * 
 * Business Rules:
 * - Trends with strength > 0.7 considered significant
 * - Emerging trends trigger immediate alerts
 * - Daily trend analysis and updates
 * - Historical trends preserved for pattern learning
 * 
 * Indexes:
 * - trends_status_idx: Active trend queries
 * - trends_type_idx: Filter by trend type
 * - trends_strength_idx: High-impact trends
 * - trends_start_date_idx: Time-based queries
 * - trends_peak_date_idx: Peak trend analysis
 */
export const trends = pgTable("trends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trendName: text("trend_name").notNull(),
  trendType: text("trend_type").notNull(), // 'topic', 'behavior', 'product', 'sentiment', 'usage', 'seasonal'
  strength: real("strength").notNull(), // 0-1 trend strength
  confidence: real("confidence").notNull(), // 0-1 detection confidence
  growthRate: real("growth_rate"), // Percentage growth
  startDate: timestamp("start_date").notNull(),
  peakDate: timestamp("peak_date"),
  endDate: timestamp("end_date"),
  status: text("status").notNull().default('emerging'), // 'emerging', 'active', 'peaking', 'declining', 'ended'
  
  // Trend data with time series and analysis (using TrendData interface)
  dataPoints: jsonb("data_points").$type<TrendData>().notNull(),
  
  interpretation: text("interpretation"), // AI-generated explanation
  businessImpact: text("business_impact"), // Impact assessment
  recommendations: jsonb("recommendations").$type<string[]>(), // AI recommendations
  
  // Trend metadata (flexible structure)
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("trends_status_idx").on(table.status),
  index("trends_type_idx").on(table.trendType),
  index("trends_strength_idx").on(table.strength),
  index("trends_start_date_idx").on(table.startDate),
  index("trends_peak_date_idx").on(table.peakDate),
]);

/**
 * Trend Alerts Table
 * 
 * Manages alert configurations and notifications for trend detection.
 * Enables users to subscribe to specific trend patterns and thresholds.
 * 
 * Fields:
 * - id: UUID primary key
 * - trendId: Foreign key to trends.id (CASCADE delete)
 * - userId: Foreign key to users.id (CASCADE delete) - null for system-wide alerts
 * - alertType: Type of alert
 *   - 'threshold': Triggered when trend strength exceeds threshold
 *   - 'emergence': New trend detected
 *   - 'acceleration': Rapid growth detected
 *   - 'peak': Trend reaching peak
 *   - 'decline': Trend declining
 *   - 'anomaly': Unusual pattern detected
 * - threshold: Numeric threshold for triggering (0-1)
 * - conditions: JSONB with alert conditions
 *   - minGrowthRate: Minimum growth rate to trigger
 *   - minConfidence: Minimum confidence level
 *   - keywords: Keywords that must be present
 *   - categories: Trend categories to monitor
 *   - timeWindow: Time window for detection
 * - priority: Alert priority level
 *   - 'low': Informational alerts
 *   - 'medium': Notable trends
 *   - 'high': Significant business impact
 *   - 'critical': Immediate action required
 * - isActive: Whether alert is currently active
 * - triggeredAt: When alert was triggered
 * - acknowledgedAt: When alert was acknowledged
 * - notifiedUsers: Array of user IDs notified
 * - notificationChannels: Channels used for notification
 *   - 'email': Email notification
 *   - 'push': Push notification
 *   - 'in-app': In-app notification
 *   - 'webhook': External webhook
 * - alertMessage: Generated alert message
 * - actionTaken: Actions taken in response to alert
 * - metadata: Additional alert metadata
 *   - triggerValue: Value that triggered the alert
 *   - comparisonData: Historical comparison data
 *   - relatedAlerts: Related alert IDs
 * - createdAt: Alert configuration creation
 * - updatedAt: Last alert update
 * 
 * Business Rules:
 * - Critical alerts sent immediately via all channels
 * - User-specific alerts respect notification preferences
 * - Duplicate alerts suppressed within 24-hour window
 * - Historical alerts preserved for analytics
 * 
 * Indexes:
 * - trend_alerts_trend_id_idx: Alerts for specific trend
 * - trend_alerts_user_id_idx: User's alert subscriptions
 * - trend_alerts_type_idx: Filter by alert type
 * - trend_alerts_priority_idx: High-priority alerts
 * - trend_alerts_triggered_at_idx: Recent alerts
 * - trend_alerts_active_idx: Active alert configurations
 */
export const trendAlerts = pgTable("trend_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  trendId: varchar("trend_id").references(() => trends.id, { onDelete: "cascade" }),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }), // null for system-wide
  alertType: text("alert_type").notNull(), // 'threshold', 'emergence', 'acceleration', 'peak', 'decline', 'anomaly'
  threshold: real("threshold"), // 0-1 threshold value
  conditions: jsonb("conditions").$type<{
    minGrowthRate?: number;
    minConfidence?: number;
    keywords?: string[];
    categories?: string[];
    timeWindow?: { value: number; unit: string };
    trendTypes?: string[];
  }>(),
  priority: text("priority").notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
  isActive: boolean("is_active").notNull().default(true),
  triggeredAt: timestamp("triggered_at"),
  acknowledgedAt: timestamp("acknowledged_at"),
  notifiedUsers: text("notified_users").array(), // Array of user IDs
  notificationChannels: text("notification_channels").array().notNull().default(['in-app']),
  alertMessage: text("alert_message"),
  actionTaken: text("action_taken"),
  metadata: jsonb("metadata").$type<{
    triggerValue?: number;
    comparisonData?: Record<string, any>;
    relatedAlerts?: string[];
    suppressUntil?: string;
    escalationLevel?: number;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("trend_alerts_trend_id_idx").on(table.trendId),
  index("trend_alerts_user_id_idx").on(table.userId),
  index("trend_alerts_type_idx").on(table.alertType),
  index("trend_alerts_priority_idx").on(table.priority),
  index("trend_alerts_triggered_at_idx").on(table.triggeredAt),
  index("trend_alerts_active_idx").on(table.isActive),
]);

// Insert schemas and types for trends
/**
 * Insert schema for trends table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertTrendSchema = createInsertSchema(trends, {
  dataPoints: trendDataSchema,
  recommendations: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});

/**
 * Insert schema for trendAlerts table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertTrendAlertSchema = createInsertSchema(trendAlerts, {
  alertType: z.enum(["threshold", "emergence", "acceleration", "peak", "decline", "anomaly"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  conditions: trendAlertConditionsSchema.optional(),
  metadata: z.record(z.any()).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTrend = z.infer<typeof insertTrendSchema>;
export type Trend = typeof trends.$inferSelect;

export type InsertTrendAlert = z.infer<typeof insertTrendAlertSchema>;
export type TrendAlert = typeof trendAlerts.$inferSelect;

/**
 * A/B Tests Table
 * 
 * Stores configuration for A/B split tests to optimize features and conversion rates.
 * Enables controlled experiments with statistical significance tracking.
 * 
 * Fields:
 * - id: UUID primary key
 * - name: Test name for identification
 * - variantA: Control variant description
 * - variantB: Test variant description
 * - startDate: When test begins
 * - endDate: When test ends
 * - status: 'draft', 'active', 'completed', 'paused'
 * - targetAudience: Percentage of users to include
 * - successMetric: Primary metric to optimize (conversion, revenue, engagement)
 * - metadata: Additional test configuration and context
 * - createdBy: User who created the test
 * - createdAt: Test creation timestamp
 * - updatedAt: Last modification timestamp
 * 
 * Business Rules:
 * - Only one active test per feature area at a time
 * - Minimum sample size required for statistical significance
 * - Tests auto-pause if anomalies detected
 * - Historical tests preserved for learning
 * 
 * Indexes:
 * - ab_tests_status_idx: Filter by test status
 * - ab_tests_dates_idx: Active test lookups
 * - ab_tests_created_by_idx: User's created tests
 */
export const abTests = pgTable("ab_tests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  variantA: text("variant_a").notNull(),
  variantB: text("variant_b").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default('draft'), // 'draft', 'active', 'completed', 'paused'
  targetAudience: real("target_audience").notNull().default(0.5), // Percentage as decimal
  successMetric: text("success_metric").notNull().default('conversion'), // 'conversion', 'revenue', 'engagement'
  
  // A/B test configuration (using AbTestConfiguration interface)
  metadata: jsonb("metadata").$type<AbTestConfiguration>(),
  
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("ab_tests_status_idx").on(table.status),
  index("ab_tests_dates_idx").on(table.startDate, table.endDate),
  index("ab_tests_created_by_idx").on(table.createdBy),
]);

/**
 * A/B Test Results Table
 * 
 * Stores aggregated performance metrics for each test variant.
 * Updated periodically to track test progress and outcomes.
 * 
 * Fields:
 * - id: UUID primary key
 * - testId: Foreign key to abTests.id
 * - variant: 'A' (control) or 'B' (test)
 * - conversions: Number of successful conversions
 * - visitors: Total number of visitors exposed
 * - revenue: Total revenue generated (if applicable)
 * - engagementScore: Average engagement metric
 * - bounceRate: Percentage of single-action sessions
 * - avgSessionDuration: Average time spent (seconds)
 * - sampleSize: Current sample size
 * - metadata: Additional metrics and segmentation
 * - periodStart: Start of measurement period
 * - periodEnd: End of measurement period
 * - createdAt: Result record creation
 * - updatedAt: Last metrics update
 * 
 * Business Rules:
 * - Results aggregated hourly for active tests
 * - Separate records for each measurement period
 * - Statistical calculations based on cumulative data
 * - Confidence intervals computed on read
 * 
 * Indexes:
 * - ab_test_results_test_id_idx: Results for specific test
 * - ab_test_results_variant_idx: Variant comparison
 * - ab_test_results_period_idx: Time-based analysis
 */
export const abTestResults = pgTable("ab_test_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").notNull().references(() => abTests.id, { onDelete: "cascade" }),
  variant: text("variant").notNull(), // 'A' or 'B'
  conversions: integer("conversions").notNull().default(0),
  visitors: integer("visitors").notNull().default(0),
  revenue: real("revenue").notNull().default(0),
  engagementScore: real("engagement_score"),
  bounceRate: real("bounce_rate"),
  avgSessionDuration: real("avg_session_duration"),
  sampleSize: integer("sample_size").notNull().default(0),
  
  // Performance metrics with segment breakdowns (using AbTestMetrics interface)
  metadata: jsonb("metadata").$type<AbTestMetrics>(),
  
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("ab_test_results_test_id_idx").on(table.testId),
  index("ab_test_results_variant_idx").on(table.variant),
  index("ab_test_results_period_idx").on(table.periodStart, table.periodEnd),
]);

/**
 * A/B Test Insights Table
 * 
 * Stores AI-generated analysis and recommendations for test outcomes.
 * Provides plain-language interpretation of statistical results.
 * 
 * Fields:
 * - id: UUID primary key
 * - testId: Foreign key to abTests.id
 * - winner: Winning variant ('A', 'B', or 'inconclusive')
 * - confidence: Statistical confidence level (0-1)
 * - pValue: Statistical p-value from significance test
 * - liftPercentage: Percentage improvement of winner
 * - recommendation: Action recommendation ('implement', 'continue', 'stop', 'iterate')
 * - explanation: Plain-language explanation of results
 * - insights: Detailed AI analysis and observations
 * - statisticalAnalysis: Raw statistical calculations
 * - generatedBy: AI model used for interpretation
 * - createdAt: Insight generation timestamp
 * - updatedAt: Last insight update
 * 
 * Business Rules:
 * - Insights generated when significance reached or test ends
 * - Confidence threshold of 0.95 for winner declaration
 * - P-value < 0.05 for statistical significance
 * - AI interpretation includes context and best practices
 * 
 * Indexes:
 * - ab_test_insights_test_id_idx: Insights for specific test
 * - ab_test_insights_winner_idx: Filter by winning variant
 * - ab_test_insights_confidence_idx: High-confidence results
 */
export const abTestInsights = pgTable("ab_test_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  testId: varchar("test_id").notNull().references(() => abTests.id, { onDelete: "cascade" }),
  winner: text("winner"), // 'A', 'B', or 'inconclusive'
  confidence: real("confidence").notNull(), // 0-1 confidence level
  pValue: real("p_value"),
  liftPercentage: real("lift_percentage"),
  recommendation: text("recommendation").notNull(), // 'implement', 'continue', 'stop', 'iterate'
  explanation: text("explanation").notNull(),
  
  // AI-generated insights and recommendations (using AbTestInsights interface)
  insights: jsonb("insights").$type<AbTestInsights>(),
  
  // Statistical analysis data (using AbTestStatisticalAnalysis interface)
  statisticalAnalysis: jsonb("statistical_analysis").$type<AbTestStatisticalAnalysis>(),
  
  generatedBy: text("generated_by").notNull().default('gpt-3.5-turbo'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("ab_test_insights_test_id_idx").on(table.testId),
  index("ab_test_insights_winner_idx").on(table.winner),
  index("ab_test_insights_confidence_idx").on(table.confidence),
]);

// ==================== Insert Schemas for A/B Testing ====================

/**
 * Insert schema for abTests table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertAbTestSchema = createInsertSchema(abTests, {
  metadata: abTestConfigurationSchema.optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  targetAudience: true,
  successMetric: true,
});

/**
 * Insert schema for abTestResults table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertAbTestResultSchema = createInsertSchema(abTestResults, {
  variant: z.enum(["A", "B"]),
  metadata: abTestMetricsSchema.optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  conversions: true,
  visitors: true,
  revenue: true,
  sampleSize: true,
});

/**
 * Insert schema for abTestInsights table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertAbTestInsightSchema = createInsertSchema(abTestInsights, {
  winner: z.enum(["A", "B", "inconclusive"]).optional(),
  recommendation: z.enum(["implement", "continue", "stop", "iterate"]),
  insights: abTestInsightsSchema.optional(),
  statisticalAnalysis: abTestStatisticalAnalysisSchema.optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  generatedBy: true,
});

export type InsertAbTest = z.infer<typeof insertAbTestSchema>;
export type AbTest = typeof abTests.$inferSelect;

export type InsertAbTestResult = z.infer<typeof insertAbTestResultSchema>;
export type AbTestResult = typeof abTestResults.$inferSelect;

export type InsertAbTestInsight = z.infer<typeof insertAbTestInsightSchema>;
export type AbTestInsight = typeof abTestInsights.$inferSelect;

/**
 * Cohorts Table
 * 
 * Stores user cohort definitions for behavioral analysis and segmentation.
 * Enables tracking of user groups over time to identify patterns and insights.
 * 
 * Fields:
 * - id: UUID primary key
 * - name: Cohort name for identification
 * - definition: JSONB with cohort definition criteria
 *   - signupDateRange: Date range for user signup
 *   - userAttributes: User attribute filters
 *   - behaviorCriteria: Behavioral patterns to match
 *   - customQueries: Custom SQL conditions
 * - userCount: Number of users in the cohort
 * - isActive: Whether cohort is actively tracked
 * - refreshFrequency: How often to recalculate ('hourly', 'daily', 'weekly', 'manual')
 * - lastRefreshed: Last time cohort was recalculated
 * - metadata: Additional cohort metadata
 * - createdBy: User who created the cohort
 * - createdAt: Cohort creation timestamp
 * - updatedAt: Last modification timestamp
 * 
 * Business Rules:
 * - Cohort definitions are immutable once created
 * - User count updated based on refresh frequency
 * - Historical cohort data preserved for trend analysis
 * - Cohorts can overlap (users can belong to multiple cohorts)
 * 
 * Indexes:
 * - cohorts_name_idx: Unique cohort names
 * - cohorts_active_idx: Filter active cohorts
 * - cohorts_created_by_idx: User's created cohorts
 */
export const cohorts = pgTable("cohorts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  
  // Cohort definition criteria (using CohortDefinition interface)
  definition: jsonb("definition").notNull().$type<CohortDefinition>(),
  
  userCount: integer("user_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  refreshFrequency: text("refresh_frequency").notNull().default('daily'), // 'hourly', 'daily', 'weekly', 'manual'
  lastRefreshed: timestamp("last_refreshed"),
  
  // Cohort metadata (using CohortMetadata interface)
  metadata: jsonb("metadata").$type<CohortMetadata>(),
  
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("cohorts_name_idx").on(table.name),
  index("cohorts_active_idx").on(table.isActive),
  index("cohorts_created_by_idx").on(table.createdBy),
  index("cohorts_last_refreshed_idx").on(table.lastRefreshed),
]);

/**
 * Cohort Metrics Table
 * 
 * Stores time-series metrics for each cohort to track behavior over time.
 * Enables retention analysis, engagement tracking, and trend identification.
 * 
 * Fields:
 * - id: UUID primary key
 * - cohortId: Foreign key to cohorts.id
 * - metricName: Name of the metric being tracked
 * - period: Time period for the metric ('day', 'week', 'month')
 * - periodDate: Date of the measurement period
 * - value: Numeric metric value
 * - metricType: Type of metric ('retention', 'engagement', 'conversion', 'revenue', 'custom')
 * - segmentData: JSONB with segmented metric breakdowns
 * - comparisonData: JSONB with period-over-period comparisons
 * - createdAt: Metric record creation
 * 
 * Common Metrics:
 * - Retention rate (Day 1, Day 7, Day 30)
 * - Average session duration
 * - Events per user
 * - Conversion rate
 * - Revenue per user
 * - Feature adoption rate
 * 
 * Business Rules:
 * - Metrics calculated according to cohort refresh frequency
 * - Historical metrics preserved for trend analysis
 * - Aggregations computed at read time for flexible analysis
 * 
 * Indexes:
 * - cohort_metrics_cohort_id_idx: Metrics for specific cohort
 * - cohort_metrics_metric_name_idx: Filter by metric type
 * - cohort_metrics_period_date_idx: Time-based queries
 */
export const cohortMetrics = pgTable("cohort_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cohortId: varchar("cohort_id").notNull().references(() => cohorts.id, { onDelete: "cascade" }),
  metricName: text("metric_name").notNull(),
  period: text("period").notNull(), // 'day', 'week', 'month'
  periodDate: date("period_date").notNull(),
  value: real("value").notNull(),
  metricType: text("metric_type").notNull(), // 'retention', 'engagement', 'conversion', 'revenue', 'custom'
  
  // Segment breakdown data (using CohortSegmentData interface)
  segmentData: jsonb("segment_data").$type<CohortSegmentData>(),
  
  // Period-over-period comparison (using CohortComparisonData interface)
  comparisonData: jsonb("comparison_data").$type<CohortComparisonData>(),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("cohort_metrics_cohort_id_idx").on(table.cohortId),
  index("cohort_metrics_metric_name_idx").on(table.metricName),
  index("cohort_metrics_period_date_idx").on(table.periodDate),
  index("cohort_metrics_type_idx").on(table.metricType),
  uniqueIndex("cohort_metrics_unique_idx").on(table.cohortId, table.metricName, table.period, table.periodDate),
]);

/**
 * Cohort Insights Table
 * 
 * Stores AI-generated insights and recommendations for cohorts.
 * Provides actionable intelligence based on cohort behavior patterns.
 * 
 * Fields:
 * - id: UUID primary key
 * - cohortId: Foreign key to cohorts.id
 * - insight: AI-generated insight text
 * - importance: Importance level ('low', 'medium', 'high', 'critical')
 * - category: Insight category for grouping
 * - actionRecommended: Specific action to take based on insight
 * - confidenceScore: AI confidence in the insight (0-1)
 * - supportingData: JSONB with data backing the insight
 * - relatedCohorts: Array of related cohort IDs for comparison
 * - status: Insight status ('new', 'reviewed', 'actioned', 'dismissed')
 * - generatedBy: AI model used for insight generation
 * - validUntil: When insight expires or needs refresh
 * - createdAt: Insight generation timestamp
 * - updatedAt: Last insight update
 * 
 * Insight Categories:
 * - 'retention': User retention patterns
 * - 'behavior': Behavioral changes
 * - 'opportunity': Growth opportunities
 * - 'risk': Potential risks or churn indicators
 * - 'comparison': Cross-cohort comparisons
 * - 'trend': Emerging trends
 * 
 * Business Rules:
 * - Critical insights trigger immediate notifications
 * - Insights expire based on data freshness
 * - Similar insights deduplicated within time window
 * - Historical insights preserved for learning
 * 
 * Indexes:
 * - cohort_insights_cohort_id_idx: Insights for specific cohort
 * - cohort_insights_importance_idx: High-importance insights
 * - cohort_insights_status_idx: Filter by insight status
 * - cohort_insights_category_idx: Group by category
 */
export const cohortInsights = pgTable("cohort_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cohortId: varchar("cohort_id").notNull().references(() => cohorts.id, { onDelete: "cascade" }),
  insight: text("insight").notNull(),
  importance: text("importance").notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
  category: text("category").notNull(), // 'retention', 'behavior', 'opportunity', 'risk', 'comparison', 'trend'
  actionRecommended: text("action_recommended"),
  confidenceScore: real("confidence_score").notNull().default(0.5), // 0-1
  supportingData: jsonb("supporting_data").$type<{
    metrics?: Record<string, any>;
    comparisons?: Record<string, any>;
    trends?: Array<{ date: string; value: number }>;
    segments?: Record<string, any>;
    evidence?: string[];
  }>(),
  relatedCohorts: text("related_cohorts").array(),
  status: text("status").notNull().default('new'), // 'new', 'reviewed', 'actioned', 'dismissed'
  generatedBy: text("generated_by").notNull().default('gpt-5'),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("cohort_insights_cohort_id_idx").on(table.cohortId),
  index("cohort_insights_importance_idx").on(table.importance),
  index("cohort_insights_status_idx").on(table.status),
  index("cohort_insights_category_idx").on(table.category),
  index("cohort_insights_created_at_idx").on(table.createdAt),
]);

// ==================== Schema Types for Cohort Analysis ====================

/**
 * Zod schema for cohort insight supporting data
 * Validates evidence and metrics backing AI-generated insights
 */
const cohortInsightSupportingDataSchema = z.object({
  metrics: z.record(z.any()).optional(),
  comparisons: z.record(z.any()).optional(),
  trends: z.array(z.object({
    date: z.string(),
    value: z.number(),
  })).optional(),
  segments: z.record(z.any()).optional(),
  evidence: z.array(z.string()).optional(),
});

/**
 * Insert schema for cohorts table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertCohortSchema = createInsertSchema(cohorts, {
  definition: cohortDefinitionSchema,
  metadata: cohortMetadataSchema.optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Insert schema for cohortMetrics table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertCohortMetricSchema = createInsertSchema(cohortMetrics, {
  segmentData: cohortSegmentDataSchema.optional(),
  comparisonData: cohortComparisonDataSchema.optional(),
}).omit({
  id: true,
  createdAt: true,
});

/**
 * Insert schema for cohortInsights table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertCohortInsightSchema = createInsertSchema(cohortInsights, {
  supportingData: cohortInsightSupportingDataSchema.optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  importance: true,
  confidenceScore: true,
  status: true,
  generatedBy: true,
});

export type InsertCohort = z.infer<typeof insertCohortSchema>;
export type Cohort = typeof cohorts.$inferSelect;

export type InsertCohortMetric = z.infer<typeof insertCohortMetricSchema>;
export type CohortMetric = typeof cohortMetrics.$inferSelect;

export type InsertCohortInsight = z.infer<typeof insertCohortInsightSchema>;
export type CohortInsight = typeof cohortInsights.$inferSelect;

/**
 * Predictive Maintenance System Tables
 * 
 * Implements time-series anomaly detection and predictive analytics
 * for system component health monitoring and failure prediction.
 */

/**
 * System Metrics Table
 * 
 * Stores time-series performance metrics for system components.
 * Used as input data for LSTM autoencoder anomaly detection.
 * 
 * Fields:
 * - id: UUID primary key
 * - component: System component name (database, server, cache, api, storage)
 * - metricName: Metric identifier (query_time, cpu_usage, memory_usage, etc.)
 * - value: Numeric metric value
 * - timestamp: When metric was recorded
 * - metadata: Additional context as JSONB
 * - anomalyScore: Real-time anomaly detection score (0-1)
 * - createdAt: Record creation timestamp
 * 
 * Business Rules:
 * - Metrics ingested continuously from system monitoring
 * - Anomaly scores computed by LSTM autoencoder
 * - Data retention: 90 days of raw metrics
 * - Aggregated hourly/daily summaries preserved longer
 * 
 * Indexes:
 * - Component + timestamp for time-series queries
 * - Metric name for specific metric analysis
 * - Anomaly score for alerting thresholds
 */
export const systemMetrics = pgTable("system_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  component: text("component").notNull(), // 'database', 'server', 'cache', 'api', 'storage'
  metricName: text("metric_name").notNull(), // 'query_time', 'cpu_usage', 'memory_usage', 'error_rate'
  value: real("value").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  
  // System metric metadata and context (using MaintenanceMetrics interface)
  metadata: jsonb("metadata").$type<MaintenanceMetrics>(),
  
  anomalyScore: real("anomaly_score"), // 0-1 score from LSTM autoencoder
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("system_metrics_component_timestamp_idx").on(table.component, table.timestamp),
  index("system_metrics_metric_name_idx").on(table.metricName),
  index("system_metrics_anomaly_score_idx").on(table.anomalyScore),
  index("system_metrics_timestamp_idx").on(table.timestamp),
]);

/**
 * Maintenance Predictions Table
 * 
 * Stores ML-generated predictions for component failures and maintenance needs.
 * Output from LSTM time-series forecasting model.
 * 
 * Fields:
 * - id: UUID primary key
 * - component: System component requiring maintenance
 * - predictedIssue: Type of predicted failure/issue
 * - probability: Confidence of prediction (0-1)
 * - recommendedDate: Suggested maintenance date
 * - urgencyLevel: Priority classification
 * - estimatedDowntime: Expected downtime in minutes
 * - preventiveActions: JSONB array of recommended actions
 * - modelVersion: ML model version for traceability
 * - features: Input features used for prediction
 * - status: Prediction lifecycle status
 * - createdAt: Prediction generation timestamp
 * - updatedAt: Last status update
 * 
 * Business Rules:
 * - Predictions regenerated daily or on significant metric changes
 * - High probability (>0.7) triggers immediate alerts
 * - Recommended dates optimize for low-traffic periods
 * - Historical predictions preserved for model evaluation
 * 
 * Indexes:
 * - Component for component-specific views
 * - Recommended date for maintenance scheduling
 * - Status for active predictions
 * - Probability for high-confidence alerts
 */
export const maintenancePredictions = pgTable("maintenance_predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  component: text("component").notNull(),
  predictedIssue: text("predicted_issue").notNull(), // 'performance_degradation', 'disk_full', 'memory_leak', 'index_fragmentation'
  probability: real("probability").notNull(), // 0-1 confidence score
  recommendedDate: timestamp("recommended_date").notNull(),
  urgencyLevel: text("urgency_level").notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
  estimatedDowntime: integer("estimated_downtime"), // minutes
  preventiveActions: jsonb("preventive_actions").$type<string[]>(),
  modelVersion: text("model_version").notNull().default('v1.0.0'),
  
  // ML features for failure prediction (using MaintenanceFeatures interface)
  features: jsonb("features").$type<MaintenanceFeatures>(),
  
  status: text("status").notNull().default('active'), // 'active', 'scheduled', 'completed', 'dismissed'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("maintenance_predictions_component_idx").on(table.component),
  index("maintenance_predictions_recommended_date_idx").on(table.recommendedDate),
  index("maintenance_predictions_status_idx").on(table.status),
  index("maintenance_predictions_probability_idx").on(table.probability),
  index("maintenance_predictions_urgency_idx").on(table.urgencyLevel),
]);

/**
 * Maintenance History Table
 * 
 * Tracks completed maintenance activities and their outcomes.
 * Used for model training and performance evaluation.
 * 
 * Fields:
 * - id: UUID primary key
 * - component: System component maintained
 * - issue: Actual issue addressed
 * - predictedIssue: What was predicted (for accuracy tracking)
 * - predictionId: Link to original prediction
 * - resolvedAt: When maintenance was completed
 * - downtimeMinutes: Actual downtime incurred
 * - performedActions: Actions taken during maintenance
 * - outcome: Result of maintenance
 * - performanceMetrics: Before/after performance comparison
 * - cost: Estimated cost/impact metrics
 * - notes: Additional maintenance notes
 * - createdAt: Record creation timestamp
 * 
 * Business Rules:
 * - Records created after maintenance completion
 * - Links to predictions for accuracy tracking
 * - Performance metrics validate maintenance effectiveness
 * - Historical data improves future predictions
 * 
 * Indexes:
 * - Component for maintenance history queries
 * - Resolved date for temporal analysis
 * - Prediction ID for accuracy tracking
 */
export const maintenanceHistory = pgTable("maintenance_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  component: text("component").notNull(),
  issue: text("issue").notNull(),
  predictedIssue: text("predicted_issue"), // For comparing with predictions
  predictionId: varchar("prediction_id").references(() => maintenancePredictions.id, { onDelete: "set null" }),
  resolvedAt: timestamp("resolved_at").notNull(),
  downtimeMinutes: integer("downtime_minutes").notNull(),
  performedActions: jsonb("performed_actions").$type<string[]>(),
  outcome: text("outcome").notNull(), // 'successful', 'partial', 'failed'
  
  // Before/after performance comparison (using MaintenancePerformanceMetrics interface)
  performanceMetrics: jsonb("performance_metrics").$type<MaintenancePerformanceMetrics>(),
  
  // Cost breakdown (using MaintenanceCost interface)
  cost: jsonb("cost").$type<MaintenanceCost>(),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("maintenance_history_component_idx").on(table.component),
  index("maintenance_history_resolved_at_idx").on(table.resolvedAt),
  index("maintenance_history_prediction_id_idx").on(table.predictionId),
]);

// ==================== Insert Schemas for Predictive Maintenance ====================

/**
 * Insert schema for systemMetrics table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertSystemMetricSchema = createInsertSchema(systemMetrics, {
  metadata: maintenanceMetricsSchema.optional(),
}).omit({
  id: true,
  createdAt: true,
});

/**
 * Insert schema for maintenancePredictions table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertMaintenancePredictionSchema = createInsertSchema(maintenancePredictions, {
  urgencyLevel: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["active", "scheduled", "completed", "dismissed"]),
  preventiveActions: z.array(z.string()).optional(),
  features: maintenanceFeaturesSchema.optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Insert schema for maintenanceHistory table
 * Uses .extend() to preserve JSON type information for JSONB columns
 */
export const insertMaintenanceHistorySchema = createInsertSchema(maintenanceHistory, {
  outcome: z.enum(["successful", "partial", "failed"]),
  performedActions: z.array(z.string()).optional(),
  performanceMetrics: maintenancePerformanceMetricsSchema.optional(),
  cost: maintenanceCostSchema.optional(),
}).omit({
  id: true,
  createdAt: true,
});

export type InsertSystemMetric = z.infer<typeof insertSystemMetricSchema>;
export type SystemMetric = typeof systemMetrics.$inferSelect;

export type InsertMaintenancePrediction = z.infer<typeof insertMaintenancePredictionSchema>;
export type MaintenancePrediction = typeof maintenancePredictions.$inferSelect;

export type InsertMaintenanceHistory = z.infer<typeof insertMaintenanceHistorySchema>;
export type MaintenanceHistory = typeof maintenanceHistory.$inferSelect;

/**
 * Scheduling Preferences Table
 * 
 * Stores user-specific scheduling preferences and availability patterns.
 * Enables AI to find optimal meeting times based on personal constraints.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - preferredTimes: JSONB with preferred meeting slots
 * - timezone: User's timezone (IANA format)
 * - bufferTime: Minutes between meetings
 * - workingHours: Standard working hours per day
 * - blockedTimes: Times that should never be scheduled
 * - meetingPreferences: Preferences for different meeting types
 * - createdAt: Creation timestamp
 * - updatedAt: Last modification timestamp
 * 
 * Business Rules:
 * - Default buffer time: 15 minutes
 * - Timezone required for cross-timezone scheduling
 * - Preferences influence AI scheduling suggestions
 */
export const schedulingPreferences = pgTable("scheduling_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  preferredTimes: jsonb("preferred_times").$type<{
    monday?: Array<{ start: string; end: string; preference: number }>;
    tuesday?: Array<{ start: string; end: string; preference: number }>;
    wednesday?: Array<{ start: string; end: string; preference: number }>;
    thursday?: Array<{ start: string; end: string; preference: number }>;
    friday?: Array<{ start: string; end: string; preference: number }>;
    saturday?: Array<{ start: string; end: string; preference: number }>;
    sunday?: Array<{ start: string; end: string; preference: number }>;
  }>().notNull().default({}),
  timezone: varchar("timezone").notNull().default("America/New_York"),
  bufferTime: integer("buffer_time").notNull().default(15), // Minutes between meetings
  workingHours: jsonb("working_hours").$type<{
    start: string;
    end: string;
    daysOfWeek: number[];
  }>().notNull().default({
    start: "09:00",
    end: "17:00",
    daysOfWeek: [1, 2, 3, 4, 5] // Monday through Friday
  }),
  blockedTimes: jsonb("blocked_times").$type<Array<{
    start: string;
    end: string;
    recurring: boolean;
    daysOfWeek?: number[];
    reason?: string;
  }>>().notNull().default([]),
  meetingPreferences: jsonb("meeting_preferences").$type<{
    preferInPerson?: boolean;
    preferVideo?: boolean;
    maxDailyMeetings?: number;
    preferredDuration?: number;
    avoidBackToBack?: boolean;
  }>().notNull().default({
    preferVideo: true,
    maxDailyMeetings: 5,
    preferredDuration: 30,
    avoidBackToBack: true
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("scheduling_preferences_user_id_idx").on(table.userId),
]);

export const insertSchedulingPreferencesSchema = createInsertSchema(schedulingPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSchedulingPreferences = z.infer<typeof insertSchedulingPreferencesSchema>;
export type SchedulingPreferences = typeof schedulingPreferences.$inferSelect;

/**
 * Meeting Suggestions Table
 * 
 * Stores AI-generated optimal meeting times with confidence scores.
 * Tracks suggestions for multi-participant meetings.
 * 
 * Fields:
 * - id: UUID primary key
 * - meetingId: Unique meeting identifier
 * - suggestedTimes: Array of suggested time slots with scores
 * - confidenceScores: AI confidence for each suggestion
 * - participants: List of participant user IDs
 * - constraints: Meeting-specific constraints
 * - optimizationFactors: Factors considered in optimization
 * - status: Suggestion status (pending/accepted/rejected)
 * - createdBy: User who initiated the meeting
 * - createdAt: Creation timestamp
 * - updatedAt: Last modification timestamp
 * 
 * Business Rules:
 * - Multiple suggestions per meeting for flexibility
 * - Confidence scores help users pick best option
 * - Constraints honored by AI algorithm
 */
export const meetingSuggestions = pgTable("meeting_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").notNull().unique(),
  suggestedTimes: jsonb("suggested_times").$type<Array<{
    start: string;
    end: string;
    timezone: string;
    score: number;
    conflicts: Array<{ userId: string; severity: string; description: string }>;
    optimality: { timeZoneFit: number; preferenceMatch: number; scheduleDisruption: number };
  }>>().notNull(),
  confidenceScores: jsonb("confidence_scores").$type<{
    overall: number;
    timeZoneAlignment: number;
    preferenceAlignment: number;
    conflictAvoidance: number;
  }>().notNull(),
  participants: text("participants").array().notNull(),
  constraints: jsonb("constraints").$type<{
    duration: number;
    mustBeWithin?: { start: string; end: string };
    avoidDates?: string[];
    requireAllAttendees: boolean;
    allowWeekends?: boolean;
    preferredTimeOfDay?: string; // morning/afternoon/evening
  }>().notNull(),
  optimizationFactors: jsonb("optimization_factors").$type<{
    weightTimeZone: number;
    weightPreferences: number;
    weightMinimalDisruption: number;
    weightAvoidConflicts: number;
  }>().notNull().default({
    weightTimeZone: 0.3,
    weightPreferences: 0.3,
    weightMinimalDisruption: 0.2,
    weightAvoidConflicts: 0.2
  }),
  status: varchar("status").notNull().default("pending"), // pending/accepted/rejected/expired
  selectedTime: jsonb("selected_time").$type<{
    start: string;
    end: string;
    timezone: string;
  }>(),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("meeting_suggestions_meeting_id_idx").on(table.meetingId),
  index("meeting_suggestions_created_by_idx").on(table.createdBy),
  index("meeting_suggestions_status_idx").on(table.status),
]);

export const insertMeetingSuggestionsSchema = createInsertSchema(meetingSuggestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMeetingSuggestions = z.infer<typeof insertMeetingSuggestionsSchema>;
export type MeetingSuggestions = typeof meetingSuggestions.$inferSelect;

/**
 * Scheduling Patterns Table
 * 
 * Stores learned patterns from user's scheduling history.
 * Used by AI to improve future suggestions.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - commonMeetingTimes: Frequently used meeting slots
 * - meetingFrequency: How often user schedules meetings
 * - patternType: Type of pattern (daily/weekly/monthly)
 * - patternData: Detailed pattern information
 * - confidence: Pattern confidence based on history
 * - lastOccurrence: When pattern was last observed
 * - createdAt: Creation timestamp
 * - updatedAt: Last modification timestamp
 * 
 * Business Rules:
 * - Patterns extracted from historical data
 * - Higher confidence patterns weighted more
 * - Auto-updated as new meetings scheduled
 */
export const schedulingPatterns = pgTable("scheduling_patterns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  commonMeetingTimes: jsonb("common_meeting_times").$type<Array<{
    dayOfWeek: number;
    timeOfDay: string;
    duration: number;
    frequency: number;
    lastUsed: string;
  }>>().notNull().default([]),
  meetingFrequency: jsonb("meeting_frequency").$type<{
    daily: number;
    weekly: number;
    monthly: number;
    averagePerDay: number;
    peakDays: number[];
    peakHours: number[];
  }>().notNull(),
  patternType: varchar("pattern_type").notNull(), // daily/weekly/monthly/adhoc
  patternData: jsonb("pattern_data").$type<{
    recurringMeetings?: Array<{
      title: string;
      dayOfWeek: number;
      time: string;
      participants: string[];
    }>;
    typicalDuration?: { [key: string]: number };
    preferredGaps?: number;
    batchingPreference?: boolean;
  }>().notNull().default({}),
  confidence: real("confidence").notNull().default(0.5), // 0-1 confidence score
  lastOccurrence: timestamp("last_occurrence"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("scheduling_patterns_user_id_idx").on(table.userId),
  index("scheduling_patterns_type_idx").on(table.patternType),
]);

export const insertSchedulingPatternsSchema = createInsertSchema(schedulingPatterns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSchedulingPatterns = z.infer<typeof insertSchedulingPatternsSchema>;
export type SchedulingPatterns = typeof schedulingPatterns.$inferSelect;

/**
 * Meeting Events Table
 * 
 * Stores actual scheduled meetings and calendar events.
 * Tracks both proposed and confirmed meetings.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Owner of the meeting
 * - title: Meeting title
 * - description: Meeting description
 * - startTime: Meeting start time
 * - endTime: Meeting end time
 * - timezone: Meeting timezone
 * - participants: Array of participant user IDs
 * - location: Meeting location or video link
 * - status: confirmed/tentative/cancelled
 * - meetingSuggestionId: Link to AI suggestion if applicable
 * - createdAt: Creation timestamp
 * - updatedAt: Last modification timestamp
 */
export const meetingEvents = pgTable("meeting_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  timezone: varchar("timezone").notNull().default("America/New_York"),
  participants: text("participants").array().notNull().default([]),
  location: text("location"),
  status: varchar("status").notNull().default("confirmed"), // confirmed/tentative/cancelled
  meetingSuggestionId: varchar("meeting_suggestion_id").references(() => meetingSuggestions.id, { onDelete: "set null" }),
  metadata: jsonb("metadata").$type<{
    isRecurring?: boolean;
    recurringPattern?: string;
    parentEventId?: string;
    source?: string; // manual/ai-suggested/imported
    importance?: string; // low/medium/high
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("meeting_events_user_id_idx").on(table.userId),
  index("meeting_events_start_time_idx").on(table.startTime),
  index("meeting_events_status_idx").on(table.status),
]);

export const insertMeetingEventsSchema = createInsertSchema(meetingEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMeetingEvents = z.infer<typeof insertMeetingEventsSchema>;
export type MeetingEvents = typeof meetingEvents.$inferSelect;

/**
 * Support Tickets Table
 * 
 * Stores customer support tickets with content and metadata for intelligent routing.
 * 
 * Fields:
 * - id: UUID primary key
 * - title: Ticket title/subject
 * - description: Full ticket description
 * - category: Initial category (technical/billing/feature/bug/other)
 * - priority: low/medium/high/urgent
 * - status: open/assigned/in_progress/resolved/closed
 * - submittedBy: User email or identifier
 * - assignedTo: Currently assigned team/person
 * - metadata: Additional context (source, channel, etc.)
 * - createdAt: Ticket creation timestamp
 * - updatedAt: Last modification timestamp
 */
export const tickets = pgTable("tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull().default("other"),
  priority: varchar("priority").notNull().default("medium"),
  status: varchar("status").notNull().default("open"),
  submittedBy: varchar("submitted_by").notNull(),
  assignedTo: varchar("assigned_to"),
  metadata: jsonb("metadata").$type<{
    source?: string;
    channel?: string;
    customFields?: Record<string, any>;
    tags?: string[];
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("tickets_status_idx").on(table.status),
  index("tickets_assigned_to_idx").on(table.assignedTo),
  index("tickets_priority_idx").on(table.priority),
]);

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

/**
 * Routing Rules Table
 * 
 * Stores configurable rules for automatic ticket routing.
 * Rules are evaluated in priority order to determine assignment.
 * 
 * Fields:
 * - id: UUID primary key
 * - name: Rule name for identification
 * - condition: JSONB containing rule conditions
 *   - keywords: Array of keywords to match
 *   - categories: Applicable categories
 *   - priorities: Applicable priority levels
 *   - patterns: Regex patterns for content matching
 * - assigned_to: Team/person to assign when rule matches
 * - priority: Rule evaluation priority (lower = higher priority)
 * - isActive: Whether rule is currently active
 * - confidence_threshold: Minimum confidence score to apply rule
 * - metadata: Additional rule configuration
 * - createdAt: Rule creation timestamp
 * - updatedAt: Last modification timestamp
 * 
 * Business Rules:
 * - Rules evaluated in priority order (ascending)
 * - First matching rule with sufficient confidence wins
 * - Inactive rules are skipped during evaluation
 */
export const routingRules = pgTable("routing_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  condition: jsonb("condition").$type<{
    keywords?: string[];
    categories?: string[];
    priorities?: string[];
    patterns?: string[];
    departments?: string[];
    products?: string[];
  }>().notNull(),
  assigned_to: varchar("assigned_to").notNull(),
  priority: integer("priority").notNull().default(100),
  isActive: boolean("is_active").notNull().default(true),
  confidence_threshold: real("confidence_threshold").notNull().default(0.7),
  metadata: jsonb("metadata").$type<{
    description?: string;
    escalation_path?: string[];
    sla_minutes?: number;
    auto_escalate?: boolean;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("routing_rules_priority_idx").on(table.priority),
  index("routing_rules_is_active_idx").on(table.isActive),
]);

export const insertRoutingRuleSchema = createInsertSchema(routingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRoutingRule = z.infer<typeof insertRoutingRuleSchema>;
export type RoutingRule = typeof routingRules.$inferSelect;

/**
 * Ticket Routing Table
 * 
 * Tracks routing history and AI decisions for each ticket.
 * Provides audit trail and performance metrics.
 * 
 * Fields:
 * - id: UUID primary key
 * - ticket_id: Foreign key to tickets.id
 * - routed_to: Team/person assignment
 * - routed_from: Previous assignment (for escalations)
 * - routing_method: manual/rule/ai
 * - confidence_score: AI confidence in routing decision (0-1)
 * - routing_reason: Explanation for routing decision
 * - rule_id: If rule-based, which rule was applied
 * - ai_analysis: AI's analysis of the ticket
 * - is_escalation: Whether this is an escalation
 * - metadata: Additional routing context
 * - createdAt: Routing timestamp
 * 
 * Business Rules:
 * - Each ticket can have multiple routing records (history)
 * - Latest routing record represents current assignment
 * - Confidence scores help evaluate routing quality
 */
export const ticketRouting = pgTable("ticket_routing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticket_id: varchar("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  routed_to: varchar("routed_to").notNull(),
  routed_from: varchar("routed_from"),
  routing_method: varchar("routing_method").notNull().default("manual"), // manual/rule/ai
  confidence_score: real("confidence_score").notNull().default(1.0),
  routing_reason: text("routing_reason").notNull(),
  rule_id: varchar("rule_id").references(() => routingRules.id, { onDelete: "set null" }),
  ai_analysis: jsonb("ai_analysis").$type<{
    detected_intent?: string;
    detected_category?: string;
    detected_urgency?: string;
    key_phrases?: string[];
    sentiment?: string;
    technical_indicators?: string[];
  }>(),
  is_escalation: boolean("is_escalation").notNull().default(false),
  metadata: jsonb("metadata").$type<{
    processing_time_ms?: number;
    ai_model?: string;
    fallback_applied?: boolean;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ticket_routing_ticket_id_idx").on(table.ticket_id),
  index("ticket_routing_routed_to_idx").on(table.routed_to),
  index("ticket_routing_created_at_idx").on(table.createdAt),
]);

export const insertTicketRoutingSchema = createInsertSchema(ticketRouting).omit({
  id: true,
  createdAt: true,
});

export type InsertTicketRouting = z.infer<typeof insertTicketRoutingSchema>;
export type TicketRouting = typeof ticketRouting.$inferSelect;

/**
 * Agent Expertise Table
 * 
 * Stores agent/team skills and capacity for intelligent workload balancing.
 * 
 * Fields:
 * - id: UUID primary key
 * - agent_id: Unique identifier for agent/team
 * - name: Agent/team display name
 * - email: Contact email
 * - skills: JSONB array of expertise areas
 *   - skill: Skill name (e.g., "API", "Billing", "Database")
 *   - level: Expertise level (1-5)
 *   - categories: Related ticket categories
 * - availability: Current availability status
 * - current_load: Number of active tickets
 * - max_capacity: Maximum concurrent tickets
 * - avg_resolution_time: Average ticket resolution time in minutes
 * - specializations: Specific product/feature expertise
 * - languages: Supported languages for customer communication
 * - timezone: Agent's timezone for shift management
 * - metadata: Additional agent configuration
 * - createdAt: Agent profile creation
 * - updatedAt: Last profile update
 * 
 * Business Rules:
 * - Workload balancing considers current_load vs max_capacity
 * - Skills matching influences routing confidence
 * - Availability status affects routing eligibility
 */
export const agentExpertise = pgTable("agent_expertise", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agent_id: varchar("agent_id").notNull().unique(),
  name: text("name").notNull(),
  email: varchar("email"),
  skills: jsonb("skills").$type<Array<{
    skill: string;
    level: number; // 1-5
    categories: string[];
  }>>().notNull().default([]),
  availability: varchar("availability").notNull().default("available"), // available/busy/offline
  current_load: integer("current_load").notNull().default(0),
  max_capacity: integer("max_capacity").notNull().default(10),
  avg_resolution_time: integer("avg_resolution_time"), // in minutes
  specializations: text("specializations").array().default([]),
  languages: text("languages").array().default(["English"]),
  timezone: varchar("timezone").default("America/New_York"),
  metadata: jsonb("metadata").$type<{
    team?: string;
    department?: string;
    shift_hours?: { start: string; end: string };
    escalation_contact?: boolean;
    auto_assign_enabled?: boolean;
  }>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("agent_expertise_agent_id_idx").on(table.agent_id),
  index("agent_expertise_availability_idx").on(table.availability),
]);

export const insertAgentExpertiseSchema = createInsertSchema(agentExpertise).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAgentExpertise = z.infer<typeof insertAgentExpertiseSchema>;
export type AgentExpertise = typeof agentExpertise.$inferSelect;

/**
 * Extraction Templates Table
 * 
 * Stores predefined schemas for structured data extraction from unstructured text.
 * Enables reusable extraction patterns for common document types.
 * 
 * Fields:
 * - id: UUID primary key
 * - name: Template name (e.g., "Order Email", "Invoice", "Resume")
 * - description: Detailed description of what this template extracts
 * - schema: JSONB schema definition for extraction
 *   - fields: Array of field definitions
 *     - name: Field name (e.g., "customerName", "orderTotal")
 *     - type: Data type (string, number, date, array, object)
 *     - description: Field description for AI extraction
 *     - required: Whether field is mandatory
 *     - validation: Optional validation rules
 *     - examples: Sample values to guide extraction
 * - exampleText: Sample input text for this template type
 * - systemPrompt: Custom system prompt for GPT extraction
 * - extractionConfig: Configuration for extraction process
 *   - model: GPT model to use (default: gpt-3.5-turbo)
 *   - temperature: Model temperature (0-1)
 *   - maxRetries: Number of extraction retries
 *   - confidenceThreshold: Minimum confidence for acceptance
 * - isActive: Whether template is currently available for use
 * - usageCount: Number of times template has been used
 * - createdBy: User ID who created the template
 * - createdAt: Template creation timestamp
 * - updatedAt: Last template modification
 * 
 * Business Rules:
 * - Each template defines a reusable extraction pattern
 * - Schema must be valid JSON Schema format
 * - Example text helps validate extraction accuracy
 * - Templates can be shared across users or private
 */
export const extractionTemplates = pgTable("extraction_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  schema: jsonb("schema").$type<{
    fields: Array<{
      name: string;
      type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
      description: string;
      required?: boolean;
      validation?: any;
      examples?: string[];
    }>;
    outputFormat?: 'json' | 'table' | 'csv';
  }>().notNull(),
  exampleText: text("example_text"),
  systemPrompt: text("system_prompt"),
  extractionConfig: jsonb("extraction_config").$type<{
    model?: string;
    temperature?: number;
    maxRetries?: number;
    confidenceThreshold?: number;
    enableStructuredOutput?: boolean;
  }>().default({
    model: 'gpt-3.5-turbo',
    temperature: 0.3,
    maxRetries: 2,
    confidenceThreshold: 0.85,
    enableStructuredOutput: true
  }),
  isActive: boolean("is_active").notNull().default(true),
  usageCount: integer("usage_count").notNull().default(0),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("extraction_templates_name_idx").on(table.name),
  index("extraction_templates_is_active_idx").on(table.isActive),
]);

export const insertExtractionTemplateSchema = createInsertSchema(extractionTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  usageCount: true,
});

export type InsertExtractionTemplate = z.infer<typeof insertExtractionTemplateSchema>;
export type ExtractionTemplate = typeof extractionTemplates.$inferSelect;

/**
 * Extracted Data Table
 * 
 * Stores results from AI-powered data extraction operations.
 * Links extracted structured data to templates and source documents.
 * 
 * Fields:
 * - id: UUID primary key
 * - sourceId: Reference to source document/text
 * - sourceType: Type of source (email, document, message, web, api)
 * - templateId: Foreign key to extraction_templates.id
 * - inputText: Original unstructured text input
 * - extractedFields: JSONB containing extracted structured data
 *   - Matches schema defined in template
 *   - Contains actual extracted values
 * - confidence: Overall extraction confidence score (0-1)
 * - fieldConfidence: Per-field confidence scores
 * - validationStatus: Extraction validation state
 *   - 'pending': Awaiting review
 *   - 'validated': Human verified
 *   - 'corrected': Human corrected
 *   - 'rejected': Failed validation
 * - validationErrors: Array of validation error messages
 * - corrections: Human corrections to extracted data
 * - metadata: Additional extraction metadata
 *   - processingTime: Time taken to extract (ms)
 *   - modelUsed: GPT model used for extraction
 *   - tokenCount: Tokens consumed
 *   - retryCount: Number of retries needed
 * - extractedAt: Extraction timestamp
 * - validatedAt: Validation timestamp
 * - validatedBy: User who validated/corrected
 * 
 * Business Rules:
 * - Confidence score affects auto-acceptance threshold
 * - Low confidence extractions require manual review
 * - Corrections feed back into template improvement
 * - Validation history tracked for audit trail
 */
export const extractedData = pgTable("extracted_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: varchar("source_id"),
  sourceType: varchar("source_type").notNull(), // email, document, message, web, api
  templateId: varchar("template_id").references(() => extractionTemplates.id, { onDelete: "set null" }),
  inputText: text("input_text").notNull(),
  extractedFields: jsonb("extracted_fields").$type<Record<string, any>>().notNull(),
  confidence: real("confidence").notNull().default(0), // 0-1 confidence score
  fieldConfidence: jsonb("field_confidence").$type<Record<string, number>>(),
  validationStatus: varchar("validation_status").notNull().default("pending"), // pending, validated, corrected, rejected
  validationErrors: jsonb("validation_errors").$type<string[]>(),
  corrections: jsonb("corrections").$type<Record<string, any>>(),
  metadata: jsonb("metadata").$type<{
    processingTime?: number;
    modelUsed?: string;
    tokenCount?: number;
    retryCount?: number;
    batchId?: string;
    tags?: string[];
  }>(),
  extractedAt: timestamp("extracted_at").defaultNow(),
  validatedAt: timestamp("validated_at"),
  validatedBy: varchar("validated_by"),
}, (table) => [
  index("extracted_data_source_id_idx").on(table.sourceId),
  index("extracted_data_template_id_idx").on(table.templateId),
  index("extracted_data_validation_status_idx").on(table.validationStatus),
  index("extracted_data_extracted_at_idx").on(table.extractedAt),
]);

export const insertExtractedDataSchema = createInsertSchema(extractedData).omit({
  id: true,
  extractedAt: true,
});

export type InsertExtractedData = z.infer<typeof insertExtractedDataSchema>;
export type ExtractedData = typeof extractedData.$inferSelect;

/**
 * Dynamic Pricing Rules Table
 * 
 * Stores pricing rules and configuration for each product.
 * Uses AI to optimize prices based on multiple factors.
 * 
 * Structure:
 * - id: Unique pricing rule identifier
 * - productId: Link to product/recipe being priced
 * - productName: Name of the product for display
 * - basePrise: Standard price point
 * - minPrice: Floor price (never go below)
 * - maxPrice: Ceiling price (never exceed)
 * - factors: Dynamic pricing factors and weights
 * - isActive: Whether rule is currently active
 * - metadata: Additional configuration
 */
export const pricingRules = pgTable("pricing_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  productName: varchar("product_name").notNull(),
  basePrice: real("base_price").notNull(),
  minPrice: real("min_price").notNull(),
  maxPrice: real("max_price").notNull(),
  factors: jsonb("factors").$type<{
    demandWeight?: number; // 0-1 weight for demand factor
    competitionWeight?: number; // 0-1 weight for competition
    inventoryWeight?: number; // 0-1 weight for inventory levels
    behaviorWeight?: number; // 0-1 weight for user behavior
    seasonalWeight?: number; // 0-1 weight for seasonal trends
    elasticity?: number; // Price elasticity coefficient
    demandThresholds?: {
      high: number; // Threshold for high demand
      low: number; // Threshold for low demand
    };
    inventoryThresholds?: {
      high: number; // Threshold for high inventory
      low: number; // Threshold for low inventory
    };
  }>().notNull().default({}),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").$type<{
    category?: string;
    tags?: string[];
    competitors?: string[];
    updateFrequency?: string; // hourly, daily, weekly
    lastOptimized?: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("pricing_rules_product_id_idx").on(table.productId),
  index("pricing_rules_is_active_idx").on(table.isActive),
]);

/**
 * Price History Table
 * 
 * Tracks all price changes over time for analysis and learning.
 * Used to train ML models and identify patterns.
 * 
 * Structure:
 * - id: Unique history entry identifier
 * - productId: Product being tracked
 * - price: The price at this point in time
 * - previousPrice: Price before this change
 * - changeReason: Why the price changed
 * - demandLevel: Demand metric at time of change
 * - inventoryLevel: Stock level at time of change
 * - competitorPrice: Average competitor price
 * - changedAt: When the price changed
 */
export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  productId: varchar("product_id").notNull(),
  price: real("price").notNull(),
  previousPrice: real("previous_price"),
  changeReason: varchar("change_reason"), // demand_surge, inventory_high, competition, manual, scheduled
  demandLevel: real("demand_level"), // 0-100 demand score
  inventoryLevel: real("inventory_level"), // 0-100 inventory score
  competitorPrice: real("competitor_price"),
  metadata: jsonb("metadata").$type<{
    demandMetrics?: {
      views?: number;
      clicks?: number;
      conversions?: number;
      cartAdds?: number;
    };
    competitorData?: Array<{
      name: string;
      price: number;
      source: string;
    }>;
    weatherImpact?: string;
    eventImpact?: string;
  }>(),
  changedAt: timestamp("changed_at").defaultNow(),
}, (table) => [
  index("price_history_product_id_idx").on(table.productId),
  index("price_history_changed_at_idx").on(table.changedAt),
]);

/**
 * Pricing Performance Table
 * 
 * Tracks performance metrics for different price points.
 * Used to measure effectiveness and optimize future pricing.
 * 
 * Structure:
 * - id: Unique performance record identifier
 * - productId: Product being measured
 * - pricePoint: The price being evaluated
 * - periodStart: Start of measurement period
 * - periodEnd: End of measurement period
 * - conversionRate: Sales conversion rate at this price
 * - revenue: Total revenue generated
 * - unitsSold: Number of units sold
 * - profit: Calculated profit
 */
export const pricingPerformance = pgTable("pricing_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull(),
  pricePoint: real("price_point").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  conversionRate: real("conversion_rate"), // 0-1 conversion percentage
  revenue: real("revenue").notNull().default(0),
  unitsSold: integer("units_sold").notNull().default(0),
  profit: real("profit"),
  metrics: jsonb("metrics").$type<{
    avgOrderValue?: number;
    repeatPurchaseRate?: number;
    customerSatisfaction?: number;
    cartAbandonmentRate?: number;
    competitivePosition?: string; // below_market, at_market, above_market
    marginPercentage?: number;
    elasticityScore?: number; // How sensitive demand was to price
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("pricing_performance_product_id_idx").on(table.productId),
  index("pricing_performance_period_idx").on(table.periodStart, table.periodEnd),
]);

// Pricing Rules Schemas
export const insertPricingRulesSchema = createInsertSchema(pricingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPricingRules = z.infer<typeof insertPricingRulesSchema>;
export type PricingRules = typeof pricingRules.$inferSelect;

// Price History Schemas
export const insertPriceHistorySchema = createInsertSchema(priceHistory).omit({
  id: true,
  changedAt: true,
});

export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
export type PriceHistory = typeof priceHistory.$inferSelect;

// Pricing Performance Schemas
export const insertPricingPerformanceSchema = createInsertSchema(pricingPerformance).omit({
  id: true,
  createdAt: true,
});

export type InsertPricingPerformance = z.infer<typeof insertPricingPerformanceSchema>;
export type PricingPerformance = typeof pricingPerformance.$inferSelect;

/**
 * Image Processing Table
 * 
 * Tracks all image enhancement operations.
 * Stores both original and processed image URLs with applied operations.
 * 
 * Structure:
 * - id: Unique processing job identifier
 * - userId: User who initiated the processing
 * - originalUrl: URL of the original uploaded image
 * - processedUrl: URL of the processed/enhanced image
 * - operations: JSON array of applied operations and settings
 * - processingTime: Time taken to process in milliseconds
 * - fileSize: Size comparison before/after
 * - status: processing, completed, failed
 * - metadata: Additional processing details
 */
export const imageProcessing = pgTable("image_processing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  originalUrl: text("original_url").notNull(),
  processedUrl: text("processed_url"),
  operations: jsonb("operations").$type<{
    backgroundRemoval?: boolean;
    autoCrop?: boolean;
    qualityEnhancement?: boolean;
    filters?: Array<{
      type: string;
      intensity: number;
      parameters?: Record<string, any>;
    }>;
    resize?: {
      width?: number;
      height?: number;
      mode?: 'fit' | 'fill' | 'cover';
    };
    format?: string;
    compression?: number;
  }>().notNull().default({}),
  processingTime: integer("processing_time"), // milliseconds
  originalFileSize: integer("original_file_size"), // bytes
  processedFileSize: integer("processed_file_size"), // bytes
  status: text("status", { enum: ["processing", "completed", "failed"] })
    .notNull()
    .default("processing"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<{
    width?: number;
    height?: number;
    format?: string;
    colorSpace?: string;
    hasTransparency?: boolean;
    dominantColors?: string[];
    quality?: number;
    aiAnalysis?: {
      mainSubject?: string;
      backgroundComplexity?: number;
      suggestedCrop?: { x: number; y: number; width: number; height: number };
    };
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("image_processing_user_id_idx").on(table.userId),
  index("image_processing_status_idx").on(table.status),
  index("image_processing_created_at_idx").on(table.createdAt),
]);

/**
 * Image Presets Table
 * 
 * Stores reusable enhancement presets for quick application.
 * Can be user-defined or system-provided.
 * 
 * Structure:
 * - id: Unique preset identifier
 * - userId: Owner of the preset (null for system presets)
 * - name: Display name for the preset
 * - description: What this preset does
 * - operations: JSON configuration of operations to apply
 * - category: Type of preset (product, portrait, landscape, etc.)
 * - isPublic: Whether other users can use this preset
 * - usageCount: How many times this preset has been used
 */
export const imagePresets = pgTable("image_presets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  operations: jsonb("operations").$type<{
    backgroundRemoval?: boolean;
    autoCrop?: boolean;
    qualityEnhancement?: boolean;
    filters?: Array<{
      type: string;
      intensity: number;
      parameters?: Record<string, any>;
    }>;
    resize?: {
      width?: number;
      height?: number;
      mode?: 'fit' | 'fill' | 'cover';
    };
    format?: string;
    compression?: number;
    colorAdjustments?: {
      brightness?: number;
      contrast?: number;
      saturation?: number;
      hue?: number;
      gamma?: number;
    };
    sharpening?: {
      radius?: number;
      amount?: number;
      threshold?: number;
    };
  }>().notNull(),
  category: text("category", { 
    enum: ["product", "portrait", "landscape", "document", "social_media", "custom"] 
  }).notNull().default("custom"),
  isPublic: boolean("is_public").notNull().default(false),
  usageCount: integer("usage_count").notNull().default(0),
  thumbnailUrl: text("thumbnail_url"), // Example result using this preset
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("image_presets_user_id_idx").on(table.userId),
  index("image_presets_category_idx").on(table.category),
  index("image_presets_is_public_idx").on(table.isPublic),
  index("image_presets_usage_count_idx").on(table.usageCount),
]);

// Image Processing Schemas
export const insertImageProcessingSchema = createInsertSchema(imageProcessing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertImageProcessing = z.infer<typeof insertImageProcessingSchema>;
export type ImageProcessing = typeof imageProcessing.$inferSelect;

// Image Presets Schemas
export const insertImagePresetsSchema = createInsertSchema(imagePresets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertImagePresets = z.infer<typeof insertImagePresetsSchema>;
export type ImagePresets = typeof imagePresets.$inferSelect;

/**
 * Face Detections Table
 * 
 * Stores face detection results from TensorFlow.js BlazeFace model.
 * Tracks detected faces and their coordinates for privacy features and avatar cropping.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - imageId: Reference to the image being analyzed
 * - imageUrl: URL/path of the analyzed image
 * - facesDetected: Number of faces found in the image
 * - faceCoordinates: JSONB array of face bounding boxes
 *   - Each face contains: x, y, width, height, confidence, landmarks
 * - processedImageUrl: URL of the image after face processing (blurred/cropped)
 * - processingType: Type of processing applied ('blur', 'crop', 'detect_only')
 * - metadata: Additional detection metadata
 * - createdAt: When the detection was performed
 * - updatedAt: Last modification timestamp
 * 
 * Business Rules:
 * - Face coordinates stored as normalized values (0-1) for resolution independence
 * - Minimum confidence threshold of 0.5 for face detection
 * - Landmarks include eyes, nose, mouth positions when available
 * 
 * Indexes:
 * - face_detections_user_id_idx: User's detection history
 * - face_detections_image_id_idx: Lookup by image
 * - face_detections_created_at_idx: Time-based queries
 */
export const faceDetections = pgTable("face_detections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  imageId: varchar("image_id").notNull(),
  imageUrl: text("image_url").notNull(),
  facesDetected: integer("faces_detected").notNull().default(0),
  faceCoordinates: jsonb("face_coordinates").$type<Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    landmarks?: {
      leftEye?: { x: number; y: number };
      rightEye?: { x: number; y: number };
      nose?: { x: number; y: number };
      mouth?: { x: number; y: number };
      leftEar?: { x: number; y: number };
      rightEar?: { x: number; y: number };
    };
  }>>().notNull().default([]),
  processedImageUrl: text("processed_image_url"),
  processingType: text("processing_type", {
    enum: ["blur", "crop", "detect_only", "anonymize"]
  }),
  metadata: jsonb("metadata").$type<{
    modelVersion?: string;
    processingTime?: number;
    originalDimensions?: { width: number; height: number };
    blurIntensity?: number;
    cropSettings?: { aspectRatio?: string; padding?: number };
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("face_detections_user_id_idx").on(table.userId),
  index("face_detections_image_id_idx").on(table.imageId),
  index("face_detections_created_at_idx").on(table.createdAt),
]);

/**
 * Privacy Settings Table
 * 
 * User-specific privacy preferences for face detection and processing.
 * Controls automatic face blurring and recognition features.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete, unique constraint)
 * - autoBlurFaces: Automatically blur detected faces in uploaded images
 * - faceRecognitionEnabled: Allow face recognition for authentication
 * - blurIntensity: Blur strength (1-10, default: 5)
 * - excludedFaces: JSONB array of face IDs to exclude from auto-blur
 * - privacyMode: Overall privacy level ('strict', 'balanced', 'minimal')
 * - consentToProcessing: User consent for face data processing
 * - dataRetentionDays: Days to retain face detection data (default: 30)
 * - notifyOnFaceDetection: Send notification when faces are detected
 * - allowGroupPhotoTagging: Allow tagging in group photos
 * - createdAt: Settings creation timestamp
 * - updatedAt: Last settings modification
 * 
 * Business Rules:
 * - One privacy settings record per user (unique constraint)
 * - Strict mode: auto-blur enabled, no recognition, 7-day retention
 * - Balanced mode: selective blur, recognition for auth only
 * - Minimal mode: no auto-blur, full features enabled
 * - Face data auto-deleted after retention period expires
 * 
 * Indexes:
 * - privacy_settings_user_id_idx: Unique user lookup
 */
export const privacySettings = pgTable("privacy_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  autoBlurFaces: boolean("auto_blur_faces").notNull().default(false),
  faceRecognitionEnabled: boolean("face_recognition_enabled").notNull().default(true),
  blurIntensity: integer("blur_intensity").notNull().default(5),
  excludedFaces: jsonb("excluded_faces").$type<string[]>().default([]),
  privacyMode: text("privacy_mode", {
    enum: ["strict", "balanced", "minimal"]
  }).notNull().default("balanced"),
  consentToProcessing: boolean("consent_to_processing").notNull().default(false),
  dataRetentionDays: integer("data_retention_days").notNull().default(30),
  notifyOnFaceDetection: boolean("notify_on_face_detection").notNull().default(false),
  allowGroupPhotoTagging: boolean("allow_group_photo_tagging").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("privacy_settings_user_id_idx").on(table.userId),
]);

// Face Detections Schemas
export const insertFaceDetectionSchema = createInsertSchema(faceDetections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFaceDetection = z.infer<typeof insertFaceDetectionSchema>;
export type FaceDetection = typeof faceDetections.$inferSelect;

// Privacy Settings Schemas
export const insertPrivacySettingsSchema = createInsertSchema(privacySettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPrivacySettings = z.infer<typeof insertPrivacySettingsSchema>;
export type PrivacySettings = typeof privacySettings.$inferSelect;

/**
 * OCR Results Table
 * 
 * Stores extracted text from images, PDFs, and scanned documents.
 * Tracks confidence scores and processing metadata.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - imageId: Unique identifier for the processed image/document
 * - fileName: Original file name uploaded by user
 * - fileType: File type ('image/jpeg', 'image/png', 'application/pdf', etc.)
 * - extractedText: Full text extracted from the document
 * - confidence: OCR confidence score (0-100)
 * - language: Detected/selected language code (e.g., 'eng', 'spa', 'fra')
 * - pageCount: Number of pages in document (1 for images)
 * - processingTime: Time taken to process in milliseconds
 * - boundingBoxes: JSONB array of text regions with coordinates
 * - metadata: Additional processing metadata (OCR engine version, settings, etc.)
 * - createdAt: Processing timestamp
 * - updatedAt: Last modification timestamp
 * 
 * Business Rules:
 * - Each document processing creates one result record
 * - Confidence scores help users identify areas needing correction
 * - Bounding boxes enable highlighting text regions on original image
 * - Language detection improves accuracy for multilingual documents
 * 
 * Indexes:
 * - ocr_results_user_id_idx: Fast user-specific queries
 * - ocr_results_image_id_idx: Unique document lookups
 * - ocr_results_created_at_idx: Time-based queries
 */
export const ocrResults = pgTable("ocr_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  imageId: varchar("image_id").notNull().unique(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(),
  extractedText: text("extracted_text").notNull(),
  confidence: real("confidence").notNull().default(0),
  language: text("language").notNull().default('eng'),
  pageCount: integer("page_count").notNull().default(1),
  processingTime: integer("processing_time"),
  boundingBoxes: jsonb("bounding_boxes").$type<Array<{
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }>>().default([]),
  metadata: jsonb("metadata").$type<{
    ocrEngine?: string;
    engineVersion?: string;
    imageWidth?: number;
    imageHeight?: number;
    preprocessingApplied?: string[];
    structuredData?: any; // For receipts, forms, etc.
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("ocr_results_user_id_idx").on(table.userId),
  index("ocr_results_image_id_idx").on(table.imageId),
  index("ocr_results_created_at_idx").on(table.createdAt),
]);

/**
 * OCR Corrections Table
 * 
 * Stores user corrections to OCR extracted text.
 * Helps improve accuracy and provides training data.
 * 
 * Fields:
 * - id: UUID primary key
 * - resultId: Foreign key to ocrResults.id (CASCADE delete)
 * - userId: Foreign key to users.id (CASCADE delete)
 * - originalText: Text segment before correction
 * - correctedText: User-corrected text
 * - correctionType: Type of correction ('spelling', 'formatting', 'structure', 'other')
 * - confidence: User's confidence in the correction (0-100)
 * - boundingBox: JSONB with coordinates of corrected region
 * - createdAt: Correction timestamp
 * - updatedAt: Last modification timestamp
 * 
 * Business Rules:
 * - Multiple corrections can exist for one OCR result
 * - Corrections help identify common OCR errors
 * - Can be used to retrain or fine-tune OCR models
 * - User corrections are preserved for quality improvement
 * 
 * Indexes:
 * - ocr_corrections_result_id_idx: Corrections for specific result
 * - ocr_corrections_user_id_idx: User's correction history
 * - ocr_corrections_created_at_idx: Time-based queries
 */
export const ocrCorrections = pgTable("ocr_corrections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resultId: varchar("result_id").notNull().references(() => ocrResults.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  originalText: text("original_text").notNull(),
  correctedText: text("corrected_text").notNull(),
  correctionType: text("correction_type", {
    enum: ["spelling", "formatting", "structure", "other"]
  }).notNull().default("other"),
  confidence: real("confidence").notNull().default(100),
  boundingBox: jsonb("bounding_box").$type<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("ocr_corrections_result_id_idx").on(table.resultId),
  index("ocr_corrections_user_id_idx").on(table.userId),
  index("ocr_corrections_created_at_idx").on(table.createdAt),
]);

// OCR Results Schemas
export const insertOcrResultSchema = createInsertSchema(ocrResults).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOcrResult = z.infer<typeof insertOcrResultSchema>;
export type OcrResult = typeof ocrResults.$inferSelect;

// OCR Corrections Schemas
export const insertOcrCorrectionSchema = createInsertSchema(ocrCorrections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOcrCorrection = z.infer<typeof insertOcrCorrectionSchema>;
export type OcrCorrection = typeof ocrCorrections.$inferSelect;

/**
 * Transcriptions Table
 * 
 * Stores audio transcription results from OpenAI Whisper API.
 * Tracks transcribed audio files with timestamps and metadata.
 * 
 * Fields:
 * - id: UUID primary key
 * - userId: Foreign key to users.id (CASCADE delete)
 * - audioUrl: URL/path of the source audio file
 * - transcript: Full transcribed text
 * - duration: Audio duration in seconds
 * - language: Detected or selected language code (e.g., 'en', 'es', 'fr')
 * - segments: JSONB array of transcript segments with timestamps
 * - metadata: Additional processing metadata
 * - status: Processing status ('processing', 'completed', 'failed')
 * - createdAt: Transcription timestamp
 * - updatedAt: Last modification timestamp
 * 
 * Business Rules:
 * - Each audio file creates one transcription record
 * - Segments enable timestamp-based navigation and editing
 * - Language detection improves accuracy for multilingual content
 * - Failed transcriptions preserve error details in metadata
 * 
 * Indexes:
 * - transcriptions_user_id_idx: Fast user-specific queries
 * - transcriptions_status_idx: Filter by processing status
 * - transcriptions_created_at_idx: Time-based queries
 */
export const transcriptions = pgTable("transcriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  audioUrl: text("audio_url").notNull(),
  transcript: text("transcript").notNull(),
  duration: real("duration").notNull(), // Duration in seconds
  language: text("language").notNull().default('en'),
  segments: jsonb("segments").$type<Array<{
    id: string;
    start: number; // Start time in seconds
    end: number; // End time in seconds
    text: string;
    confidence?: number;
    speaker?: string; // For multi-speaker detection (future feature)
  }>>().notNull().default([]),
  metadata: jsonb("metadata").$type<{
    modelVersion?: string; // Whisper model used
    audioFormat?: string;
    sampleRate?: number;
    bitrate?: number;
    processingTime?: number;
    errorDetails?: string;
    title?: string; // User-provided title
    description?: string; // User-provided description
    tags?: string[]; // User-defined tags
  }>(),
  status: text("status", {
    enum: ["processing", "completed", "failed"]
  }).notNull().default("processing"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("transcriptions_user_id_idx").on(table.userId),
  index("transcriptions_status_idx").on(table.status),
  index("transcriptions_created_at_idx").on(table.createdAt),
]);

/**
 * Transcript Edits Table
 * 
 * Stores user corrections to transcribed text segments.
 * Maintains edit history for quality improvement.
 * 
 * Fields:
 * - id: UUID primary key
 * - transcriptionId: Foreign key to transcriptions.id (CASCADE delete)
 * - userId: Foreign key to users.id (CASCADE delete)
 * - originalSegment: Text segment before correction
 * - editedSegment: User-corrected text
 * - timestamp: Time position in the audio (seconds)
 * - editType: Type of edit ('spelling', 'punctuation', 'speaker', 'content', 'other')
 * - confidence: User's confidence in the correction (0-100)
 * - createdAt: Edit timestamp
 * - updatedAt: Last modification timestamp
 * 
 * Business Rules:
 * - Multiple edits can exist for one transcription
 * - Edits help identify common transcription errors
 * - Timestamp links edit to specific audio position
 * - Edit history preserved for quality tracking
 * 
 * Indexes:
 * - transcript_edits_transcription_id_idx: Edits for specific transcription
 * - transcript_edits_user_id_idx: User's edit history
 * - transcript_edits_created_at_idx: Time-based queries
 */
export const transcriptEdits = pgTable("transcript_edits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transcriptionId: varchar("transcription_id").notNull().references(() => transcriptions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  originalSegment: text("original_segment").notNull(),
  editedSegment: text("edited_segment").notNull(),
  timestamp: real("timestamp").notNull(), // Position in audio (seconds)
  editType: text("edit_type", {
    enum: ["spelling", "punctuation", "speaker", "content", "other"]
  }).notNull().default("other"),
  confidence: real("confidence").notNull().default(100),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("transcript_edits_transcription_id_idx").on(table.transcriptionId),
  index("transcript_edits_user_id_idx").on(table.userId),
  index("transcript_edits_created_at_idx").on(table.createdAt),
]);

// Transcriptions Schemas
export const insertTranscriptionSchema = createInsertSchema(transcriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTranscription = z.infer<typeof insertTranscriptionSchema>;
export type Transcription = typeof transcriptions.$inferSelect;

// Transcript Edits Schemas
export const insertTranscriptEditSchema = createInsertSchema(transcriptEdits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTranscriptEdit = z.infer<typeof insertTranscriptEditSchema>;
export type TranscriptEdit = typeof transcriptEdits.$inferSelect;
