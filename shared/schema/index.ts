/**
 * Centralized Schema Exports
 * 
 * Re-exports all domain-specific schemas from a single entry point.
 * This maintains backward compatibility while organizing tables into logical domains.
 * 
 * Domain Structure:
 * - auth.ts: Authentication & user management (3 tables)
 * - food.ts: Food inventory & recipes (10 tables)
 * - notifications.ts: Push notifications (5 tables)
 * - analytics.ts: Analytics & insights (11 tables)
 * - experiments.ts: A/B testing & cohorts (6 tables)
 * - content.ts: Content categorization (7 tables)
 * - ai-ml.ts: AI/ML features (14 tables)
 * - images.ts: Image processing (7 tables)
 * - security.ts: Moderation & fraud (8 tables)
 * - sentiment.ts: Sentiment analysis (5 tables)
 * - forms.ts: Form handling (7 tables)
 * - system.ts: System monitoring (5 tables)
 * - scheduling.ts: Meeting scheduling (4 tables)
 * - support.ts: Support & ticketing (5 tables)
 * - extraction.ts: Data extraction (2 tables)
 * - pricing.ts: Pricing management (3 tables)
 * - transcription.ts: Transcription services (2 tables)
 * - billing.ts: Billing & donations (1 table)
 * 
 * Total: 104 tables organized into 18 domain modules
 */

// ==================== Domain Exports ====================

// Core domains
export * from './auth';
export * from './food';
export * from './notifications';
export * from './analytics';
export * from './system';
export * from './support';
export * from './billing';

// AI/ML domains
export * from './ai-ml';
export * from './images';

// Content & UX domains
export * from './content';

// Advanced features
export * from './experiments';

// TODO: The following domains are planned but not yet implemented:
// - sentiment.ts: Sentiment analysis (5 tables)
// - transcription.ts: Transcription services (2 tables)
// - extraction.ts: Data extraction (2 tables)
// - forms.ts: Form handling (7 tables)
// - scheduling.ts: Meeting scheduling (4 tables)
// - security.ts: Moderation & fraud (8 tables)
// - pricing.ts: Pricing management (3 tables)

// ==================== Cross-Domain References ====================

// These imports are needed for cross-domain foreign key references
// They're re-exported to maintain the existing API surface
import { users } from './auth';
import { userRecipes } from './food';
import { pushTokens } from './notifications';
import { analyticsInsights } from './analytics';
import { trends } from './analytics';
import { userPredictions } from './analytics';

// Re-export for backward compatibility
export { users, userRecipes, pushTokens, analyticsInsights, trends, userPredictions };

// ==================== Shared Interfaces ====================

/**
 * Re-export shared interfaces that were previously in the main schema file
 */
export interface TimeSeriesPoint {
  date: string;
  value: number;
  label?: string;
}

export interface MetadataBase {
  description?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface ConfidenceScore {
  score: number;
  level?: 'low' | 'medium' | 'high' | 'very_high';
  threshold?: number;
}

export interface SegmentBreakdown<T = number> {
  segment: string;
  value: T;
  percentage?: number;
}