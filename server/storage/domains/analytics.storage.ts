/**
 * @file server/storage/domains/analytics.storage.ts
 * @description Analytics domain storage implementation
 * 
 * EXPORT PATTERN:
 * - Export CLASS (AnalyticsStorage) for dependency injection and testing
 * - Export singleton INSTANCE (analyticsStorage) for convenience in production code
 * - Facades should instantiate their own instances OR use the shared singleton consistently
 */

import { db } from "../../db";
import { eq, and, gte, lte, desc, sql, between, asc } from "drizzle-orm";
import { createInsertData, createUpdateData, buildMetadata } from "../../types/storage-helpers";
import {
  activityLogs,
  webVitals,
  analyticsEvents,
  userSessions,
  analyticsInsights,
  userPredictions,
  predictionAccuracy,
  trends,
  trendAlerts,
  type ActivityLog,
  type InsertActivityLog,
  type WebVital,
  type InsertWebVital,
  type AnalyticsEvent,
  type InsertAnalyticsEvent,
  type UserSession,
  type InsertUserSession,
  type AnalyticsInsight,
  type InsertAnalyticsInsight,
  type UserPrediction,
  type InsertUserPrediction,
  type PredictionAccuracy,
  type InsertPredictionAccuracy,
  type Trend,
  type InsertTrend,
  type TrendAlert,
  type InsertTrendAlert,
  type ApiUsageMetadata,
  type ApiUsageStats,
  type WebVitalsStats,
  type AnalyticsStatsResult,
  type PredictionValue,
} from "@shared/schema";
import type { IAnalyticsStorage } from "../interfaces/IAnalyticsStorage";

export class AnalyticsStorage implements IAnalyticsStorage {
  // Activity Logging
  async logApiUsage(
    userId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    metadata?: ApiUsageMetadata
  ): Promise<void> {
    await db.insert(activityLogs).values({
      userId: userId,
      activityType: 'api',
      resourceType: 'endpoint',
      action: `${method} ${endpoint}`,
      details: {
        endpoint,
        method,
        statusCode,
        responseTime,
        ...metadata
      },
      success: statusCode < 400,
      timestamp: new Date()
    });
  }

  async getApiUsageLogs(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ActivityLog[]> {
    const conditions = [];
    
    if (userId) {
      conditions.push(eq(activityLogs.userId, userId));
    }
    
    if (startDate) {
      conditions.push(gte(activityLogs.timestamp, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(activityLogs.timestamp, endDate));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(activityLogs)
        .where(and(...conditions))
        .orderBy(desc(activityLogs.timestamp));
    }
    
    return await db.select().from(activityLogs)
      .orderBy(desc(activityLogs.timestamp));
  }

  async getApiUsageStats(
    userId?: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<ApiUsageStats> {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 1);
    }
    
    const logs = await this.getApiUsageLogs(userId, startDate, now);
    
    // Calculate stats
    const stats: ApiUsageStats = {
      totalRequests: logs.length,
      uniqueEndpoints: new Set(logs.map(l => l.action?.split(' ')[1])).size,
      averageResponseTime: logs.reduce((sum, l) => {
        const details = l.details as Record<string, unknown> | null;
        const responseTime = (details?.responseTime as number) || 0;
        return sum + responseTime;
      }, 0) / logs.length || 0,
      errorRate: logs.filter(l => {
        const details = l.details as Record<string, unknown> | null;
        return (details?.statusCode as number) >= 400;
      }).length / logs.length || 0,
      requestsByEndpoint: {},
      requestsByHour: {}
    };
    
    // Count by endpoint
    logs.forEach(log => {
      const endpoint = log.action?.split(' ')[1] || 'unknown';
      stats.requestsByEndpoint[endpoint] = (stats.requestsByEndpoint[endpoint] || 0) + 1;
      
      const hour = new Date(log.timestamp).getHours();
      stats.requestsByHour[hour] = (stats.requestsByHour[hour] || 0) + 1;
    });
    
    return stats;
  }
  
  // Web Vitals
  async recordWebVital(vital: InsertWebVital): Promise<WebVital> {
    const [result] = await db.insert(webVitals).values(vital).returning();
    return result;
  }

  async getWebVitals(userId?: string, limit = 100): Promise<WebVital[]> {
    if (userId) {
      return await db.select().from(webVitals)
        .where(eq(webVitals.userId, userId))
        .orderBy(desc(webVitals.timestamp))
        .limit(limit);
    }
    
    return await db.select().from(webVitals)
      .orderBy(desc(webVitals.timestamp))
      .limit(limit);
  }

  async getWebVitalsByMetric(metric: string, userId?: string): Promise<WebVital[]> {
    if (userId) {
      return await db.select().from(webVitals)
        .where(and(
          eq(webVitals.metric, metric),
          eq(webVitals.userId, userId)
        ))
        .orderBy(desc(webVitals.timestamp));
    }
    
    return await db.select().from(webVitals)
      .where(eq(webVitals.metric, metric))
      .orderBy(desc(webVitals.timestamp));
  }

  async getWebVitalsStats(
    userId?: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<WebVitalsStats> {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 1);
    }
    
    const vitals = userId
      ? await db.select().from(webVitals).where(and(
          gte(webVitals.timestamp, startDate),
          eq(webVitals.userId, userId)
        ))
      : await db.select().from(webVitals).where(
          gte(webVitals.timestamp, startDate)
        );
    
    // Calculate percentiles for each metric
    const metricGroups = vitals.reduce((acc: Record<string, number[]>, vital) => {
      if (!acc[vital.metric]) {
        acc[vital.metric] = [];
      }
      acc[vital.metric].push(vital.value);
      return acc;
    }, {});
    
    const stats: WebVitalsStats = {};
    
    for (const [metric, values] of Object.entries(metricGroups)) {
      const sortedValues = (values as number[]).sort((a, b) => a - b);
      stats[metric] = {
        count: sortedValues.length,
        min: sortedValues[0],
        max: sortedValues[sortedValues.length - 1],
        median: sortedValues[Math.floor(sortedValues.length / 2)],
        p75: sortedValues[Math.floor(sortedValues.length * 0.75)],
        p95: sortedValues[Math.floor(sortedValues.length * 0.95)],
        average: sortedValues.reduce((a, b) => a + b, 0) / sortedValues.length
      };
    }
    
    return stats;
  }
  
  // Analytics Events
  async recordAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const [result] = await db.insert(analyticsEvents).values(event as any).returning();
    return result;
  }

  async recordAnalyticsEventsBatch(events: InsertAnalyticsEvent[]): Promise<AnalyticsEvent[]> {
    if (events.length === 0) return [];
    return await db.insert(analyticsEvents).values(events as any).returning();
  }

  async getAnalyticsEvents(
    userId?: string,
    eventType?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AnalyticsEvent[]> {
    const conditions = [];
    
    if (userId) {
      conditions.push(eq(analyticsEvents.userId, userId));
    }
    
    if (eventType) {
      conditions.push(eq(analyticsEvents.eventName, eventType));
    }
    
    if (startDate) {
      conditions.push(gte(analyticsEvents.createdAt, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(analyticsEvents.createdAt, endDate));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(analyticsEvents)
        .where(and(...conditions))
        .orderBy(desc(analyticsEvents.createdAt));
    }
    
    return await db.select().from(analyticsEvents)
      .orderBy(desc(analyticsEvents.createdAt));
  }
  
  // User Sessions
  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    const [result] = await db.insert(userSessions).values(session).returning();
    return result;
  }

  async updateUserSession(sessionId: string, updates: Partial<InsertUserSession>): Promise<UserSession> {
    const [result] = await db.update(userSessions)
      .set(updates)
      .where(eq(userSessions.id, sessionId))
      .returning();
    return result;
  }

  async getUserSessions(userId: string, limit = 10): Promise<UserSession[]> {
    return await db.select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .orderBy(desc(userSessions.startedAt))
      .limit(limit);
  }

  async getAnalyticsStats(
    type: 'sessions' | 'events' | 'usage',
    userId?: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<AnalyticsStatsResult> {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 1);
    }
    
    switch (type) {
      case 'sessions':
        const sessions = userId 
          ? await db.select().from(userSessions)
              .where(and(
                eq(userSessions.userId, userId),
                gte(userSessions.startedAt, startDate)
              ))
          : await db.select().from(userSessions)
              .where(gte(userSessions.startedAt, startDate));
        
        return {
          totalSessions: sessions.length,
          averageDuration: sessions.reduce((sum: number, s: UserSession) => {
            if (s.endedAt) {
              return sum + (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime());
            }
            return sum;
          }, 0) / sessions.filter((s: UserSession) => s.endedAt).length || 0,
          activeSessions: sessions.filter((s: UserSession) => !s.endedAt).length
        };
        
      case 'events':
        const events = await this.getAnalyticsEvents(userId, undefined, startDate, now);
        
        const eventsByType = events.reduce((acc: Record<string, number>, event) => {
          acc[event.eventName] = (acc[event.eventName] || 0) + 1;
          return acc;
        }, {});
        
        return {
          totalEvents: events.length,
          eventsByType,
          eventsPerDay: events.length / Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        };
        
      case 'usage':
        return await this.getApiUsageStats(userId, period);
    }
  }
  
  // Analytics Insights
  async createAnalyticsInsight(insight: InsertAnalyticsInsight): Promise<AnalyticsInsight> {
    const [result] = await db.insert(analyticsInsights).values(insight).returning();
    return result;
  }

  async getAnalyticsInsights(userId: string, type?: string): Promise<AnalyticsInsight[]> {
    if (type) {
      return await db.select().from(analyticsInsights)
        .where(eq(analyticsInsights.insightType, type))
        .orderBy(desc(analyticsInsights.createdAt));
    }
    
    return await db.select().from(analyticsInsights)
      .orderBy(desc(analyticsInsights.createdAt));
  }

  async getDailyInsightSummary(userId: string): Promise<AnalyticsInsight[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await db.select()
      .from(analyticsInsights)
      .where(gte(analyticsInsights.createdAt, today))
      .orderBy(desc(analyticsInsights.createdAt));
  }

  async markInsightAsRead(insightId: string): Promise<void> {
    await db.update(analyticsInsights)
      .set({ isRead: true })
      .where(eq(analyticsInsights.id, insightId));
  }
  
  // User Predictions
  async createUserPrediction(prediction: InsertUserPrediction): Promise<UserPrediction> {
    const [result] = await db.insert(userPredictions).values(prediction).returning();
    return result;
  }

  async getUserPredictions(userId: string, type?: string): Promise<UserPrediction[]> {
    if (type) {
      return await db.select().from(userPredictions)
        .where(and(
          eq(userPredictions.userId, userId),
          eq(userPredictions.predictionType, type)
        ))
        .orderBy(desc(userPredictions.createdAt));
    }
    
    return await db.select().from(userPredictions)
      .where(eq(userPredictions.userId, userId))
      .orderBy(desc(userPredictions.createdAt));
  }

  async getPredictionById(predictionId: string): Promise<UserPrediction | null> {
    const [result] = await db.select()
      .from(userPredictions)
      .where(eq(userPredictions.id, predictionId));
    return result || null;
  }

  async updatePredictionStatus(
    predictionId: string,
    status: 'pending' | 'completed' | 'failed',
    actualValue?: PredictionValue
  ): Promise<UserPrediction> {
    const updates: Record<string, unknown> = {};
    
    if (actualValue !== undefined) {
      updates.prediction = actualValue;
    }
    
    const [result] = await db.update(userPredictions)
      .set(updates)
      .where(eq(userPredictions.id, predictionId))
      .returning();
    return result;
  }

  async getChurnRiskUsers(threshold = 0.7): Promise<UserPrediction[]> {
    return await db.select()
      .from(userPredictions)
      .where(and(
        eq(userPredictions.predictionType, 'churn'),
        gte(userPredictions.confidence, threshold)
      ))
      .orderBy(desc(userPredictions.confidence));
  }

  async createPredictionAccuracy(accuracy: InsertPredictionAccuracy): Promise<PredictionAccuracy> {
    const [result] = await db.insert(predictionAccuracy).values(accuracy).returning();
    return result;
  }

  async getPredictionAccuracy(predictionType: string): Promise<PredictionAccuracy[]> {
    // Join with predictions to filter by type
    const predictions = await db.select()
      .from(userPredictions)
      .where(eq(userPredictions.predictionType, predictionType));
    
    const predictionIds = predictions.map((p: UserPrediction) => p.id);
    
    if (predictionIds.length === 0) return [];
    
    return await db.select()
      .from(predictionAccuracy)
      .where(sql`${predictionAccuracy.predictionId} = ANY(${sql.raw(`ARRAY[${predictionIds.map((id: string) => `'${id}'`).join(',')}]`)})`)
      .orderBy(desc(predictionAccuracy.evaluatedAt));
  }
  
  // Trend Detection
  async createTrend(trend: InsertTrend): Promise<Trend> {
    const [result] = await db.insert(trends).values(trend).returning();
    return result;
  }

  async updateTrend(trendId: string, updates: Partial<InsertTrend>): Promise<Trend> {
    const [result] = await db.update(trends)
      .set(updates)
      .where(eq(trends.id, trendId))
      .returning();
    return result;
  }

  async getTrends(type?: string, status?: 'active' | 'inactive'): Promise<Trend[]> {
    if (type) {
      return await db.select().from(trends)
        .where(eq(trends.trendType, type))
        .orderBy(desc(trends.detectedAt));
    }
    
    return await db.select().from(trends)
      .orderBy(desc(trends.detectedAt));
  }

  async getTrendById(trendId: string): Promise<Trend | null> {
    const [result] = await db.select()
      .from(trends)
      .where(eq(trends.id, trendId));
    return result || null;
  }

  async getCurrentTrends(threshold = 0.7): Promise<Trend[]> {
    return await db.select()
      .from(trends)
      .where(gte(trends.changePercent, threshold))
      .orderBy(desc(trends.changePercent));
  }

  async getEmergingTrends(days = 7): Promise<Trend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db.select()
      .from(trends)
      .where(gte(trends.detectedAt, startDate))
      .orderBy(desc(trends.changePercent));
  }

  async getHistoricalTrends(startDate: Date, endDate: Date): Promise<Trend[]> {
    return await db.select()
      .from(trends)
      .where(between(trends.detectedAt, startDate, endDate))
      .orderBy(asc(trends.detectedAt));
  }
  
  // Trend Alerts
  async createTrendAlert(alert: InsertTrendAlert): Promise<TrendAlert> {
    const [result] = await db.insert(trendAlerts).values(alert).returning();
    return result;
  }

  async updateTrendAlert(alertId: string, updates: Partial<InsertTrendAlert>): Promise<TrendAlert> {
    const [result] = await db.update(trendAlerts)
      .set(updates)
      .where(eq(trendAlerts.id, alertId))
      .returning();
    return result;
  }

  async getTrendAlerts(userId: string, status?: string): Promise<TrendAlert[]> {
    if (status === 'acknowledged') {
      return await db.select().from(trendAlerts)
        .where(eq(trendAlerts.isAcknowledged, true))
        .orderBy(desc(trendAlerts.createdAt));
    } else if (status === 'pending') {
      return await db.select().from(trendAlerts)
        .where(eq(trendAlerts.isAcknowledged, false))
        .orderBy(desc(trendAlerts.createdAt));
    }
    
    return await db.select().from(trendAlerts)
      .orderBy(desc(trendAlerts.createdAt));
  }

  async getTrendAlertsByTrendId(trendId: string): Promise<TrendAlert[]> {
    return await db.select()
      .from(trendAlerts)
      .where(eq(trendAlerts.trendId, trendId))
      .orderBy(desc(trendAlerts.createdAt));
  }

  async triggerTrendAlert(alertId: string): Promise<void> {
    await db.update(trendAlerts)
      .set({ 
        isAcknowledged: false
      })
      .where(eq(trendAlerts.id, alertId));
  }

  async acknowledgeTrendAlert(alertId: string): Promise<void> {
    await db.update(trendAlerts)
      .set({ 
        isAcknowledged: true,
        acknowledgedAt: new Date()
      })
      .where(eq(trendAlerts.id, alertId));
  }

  async subscribeTrendAlerts(userId: string, trendType: string): Promise<void> {
    // This method would need a trends subscription table to work properly
    // For now, we'll just create a placeholder alert
    // In a real implementation, you'd have a separate subscriptions table
    console.log(`User ${userId} subscribed to ${trendType} trend alerts`);
  }
}

// Export singleton instance for convenience
export const analyticsStorage = new AnalyticsStorage();
