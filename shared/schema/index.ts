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
export * from './chat';

// AI/ML domains
export * from './ai-ml';
export * from './images';
export * from './sentiment';
export * from './transcription';
export * from './extraction';

// Content & UX domains
export * from './content';
export * from './forms';
export * from './scheduling';

// Advanced features
export * from './experiments';
export * from './security';
export * from './pricing';

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

// ==================== Type Re-exports from json-schemas ====================
// Re-export types from json-schemas that are used by client code
export type { 
  USDAFoodItem, 
  USDASearchResponse, 
  NutritionInfo 
} from '../json-schemas';

// ==================== Compatibility Aliases ====================
// These provide backward compatibility for incorrect type names that were used

// Fix notification type name mismatches
// The correct singular forms from notifications.ts
import { 
  type NotificationPreference,
  type InsertNotificationPreference 
} from './notifications';

// Export compatibility aliases for incorrect plural names
export type NotificationPreferences = NotificationPreference;
export type InsertNotificationPreferences = InsertNotificationPreference;

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

/**
 * Generic pagination response wrapper
 * Used by: storage interfaces, API endpoints
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Alternative pagination response format (used by utils)
 * @template T - Type of data items
 */
export interface PaginatedUtilResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  offset: number;
}

/**
 * Chat message type
 * Compatible with legacy ChatMessage type
 */
export interface Message {
  id: string;
  userId: string;
  role: string;
  content: string;
  similarityHash?: string | null;
  createdAt: Date;
}

// ==================== Helper/Computed Types (Not DB-Backed) ====================
// 
// The following types are NOT backed by database tables.
// They are helper types for computed/aggregated data used in API responses and UI.
// DO NOT attempt to use these with direct database operations.

/**
 * Helper type for API responses - NOT a database table
 * 
 * Conversation with metadata type
 * Used for displaying conversation lists with message counts and last activity
 * This is computed from chat message data, not a standalone table
 */
export interface ConversationWithMetadata {
  id: string;
  userId?: string;
  title?: string | null;
  lastMessage?: string | null;
  messageCount: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * Helper type for analytics aggregation - NOT a database table
 * 
 * Feedback analytics aggregation type
 * Used for analyzing user feedback trends
 * This is computed from userFeedback table data, not a standalone table
 */
export interface FeedbackAnalytics {
  totalFeedback: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  avgSentiment: number;
  avgRating: number;
  topIssues: Array<{
    subject: string;
    count: number;
  }>;
}