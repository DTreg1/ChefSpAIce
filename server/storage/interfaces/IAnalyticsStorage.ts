/**
 * @file server/storage/interfaces/IAnalyticsStorage.ts
 * @description Interface for analytics-related storage operations
 */

import type {
  ActivityLog,
  InsertActivityLog,
  WebVital,
  InsertWebVital,
  AnalyticsEvent,
  InsertAnalyticsEvent,
  UserSession,
  InsertUserSession,
  AnalyticsInsight,
  InsertAnalyticsInsight,
  UserPrediction,
  InsertUserPrediction,
  PredictionAccuracy,
  InsertPredictionAccuracy,
  Trend,
  InsertTrend,
  TrendAlert,
  InsertTrendAlert
} from "@shared/schema";

export interface IAnalyticsStorage {
  // Activity Logging
  logApiUsage(userId: string, endpoint: string, method: string, statusCode: number, responseTime: number, metadata?: any): Promise<void>;
  getApiUsageLogs(userId?: string, startDate?: Date, endDate?: Date): Promise<ActivityLog[]>;
  getApiUsageStats(userId?: string, period?: 'day' | 'week' | 'month'): Promise<any>;
  
  // Web Vitals
  recordWebVital(vital: InsertWebVital): Promise<WebVital>;
  getWebVitals(userId?: string, limit?: number): Promise<WebVital[]>;
  getWebVitalsByMetric(metric: string, userId?: string): Promise<WebVital[]>;
  getWebVitalsStats(userId?: string, period?: 'day' | 'week' | 'month'): Promise<any>;
  
  // Analytics Events
  recordAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent>;
  recordAnalyticsEventsBatch(events: InsertAnalyticsEvent[]): Promise<AnalyticsEvent[]>;
  getAnalyticsEvents(userId?: string, eventType?: string, startDate?: Date, endDate?: Date): Promise<AnalyticsEvent[]>;
  
  // User Sessions
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  updateUserSession(sessionId: string, updates: Partial<InsertUserSession>): Promise<UserSession>;
  getUserSessions(userId: string, limit?: number): Promise<UserSession[]>;
  getAnalyticsStats(type: 'sessions' | 'events' | 'usage', userId?: string, period?: 'day' | 'week' | 'month'): Promise<any>;
  
  // Analytics Insights
  createAnalyticsInsight(insight: InsertAnalyticsInsight): Promise<AnalyticsInsight>;
  getAnalyticsInsights(userId: string, type?: string): Promise<AnalyticsInsight[]>;
  getDailyInsightSummary(userId: string): Promise<AnalyticsInsight[]>;
  markInsightAsRead(insightId: string): Promise<void>;
  
  // User Predictions
  createUserPrediction(prediction: InsertUserPrediction): Promise<UserPrediction>;
  getUserPredictions(userId: string, type?: string): Promise<UserPrediction[]>;
  getPredictionById(predictionId: string): Promise<UserPrediction | null>;
  updatePredictionStatus(predictionId: string, status: 'pending' | 'completed' | 'failed', actualValue?: any): Promise<UserPrediction>;
  getChurnRiskUsers(threshold?: number): Promise<UserPrediction[]>;
  createPredictionAccuracy(accuracy: InsertPredictionAccuracy): Promise<PredictionAccuracy>;
  getPredictionAccuracy(predictionType: string): Promise<PredictionAccuracy[]>;
  
  // Trend Detection
  createTrend(trend: InsertTrend): Promise<Trend>;
  updateTrend(trendId: string, updates: Partial<InsertTrend>): Promise<Trend>;
  getTrends(type?: string, status?: 'active' | 'inactive'): Promise<Trend[]>;
  getTrendById(trendId: string): Promise<Trend | null>;
  getCurrentTrends(threshold?: number): Promise<Trend[]>;
  getEmergingTrends(days?: number): Promise<Trend[]>;
  getHistoricalTrends(startDate: Date, endDate: Date): Promise<Trend[]>;
  
  // Trend Alerts
  createTrendAlert(alert: InsertTrendAlert): Promise<TrendAlert>;
  updateTrendAlert(alertId: string, updates: Partial<InsertTrendAlert>): Promise<TrendAlert>;
  getTrendAlerts(userId: string, status?: string): Promise<TrendAlert[]>;
  getTrendAlertsByTrendId(trendId: string): Promise<TrendAlert[]>;
  triggerTrendAlert(alertId: string): Promise<void>;
  acknowledgeTrendAlert(alertId: string): Promise<void>;
  subscribeTrendAlerts(userId: string, trendType: string): Promise<void>;
}