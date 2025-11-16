/**
 * @file server/storage/domains/analytics.storage.ts
 * @description Analytics domain storage implementation
 */

import { db } from "@db";
import { eq, and, gte, lte, desc, sql, between, asc } from "drizzle-orm";
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
  type InsertTrendAlert
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
    metadata?: any
  ): Promise<void> {
    await db.insert(activityLogs).values({
      user_id: userId,
      action: `${method} ${endpoint}`,
      details: {
        endpoint,
        method,
        statusCode,
        responseTime,
        ...metadata
      },
      timestamp: new Date()
    });
  }

  async getApiUsageLogs(
    userId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ActivityLog[]> {
    let query = db.select().from(activityLogs);
    const conditions = [];
    
    if (userId) {
      conditions.push(eq(activityLogs.user_id, userId));
    }
    
    if (startDate) {
      conditions.push(gte(activityLogs.timestamp, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(activityLogs.timestamp, endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(activityLogs.timestamp));
  }

  async getApiUsageStats(
    userId?: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<any> {
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
    const stats = {
      totalRequests: logs.length,
      uniqueEndpoints: new Set(logs.map(l => l.action?.split(' ')[1])).size,
      averageResponseTime: logs.reduce((sum, l) => {
        const responseTime = (l.details as any)?.responseTime || 0;
        return sum + responseTime;
      }, 0) / logs.length || 0,
      errorRate: logs.filter(l => (l.details as any)?.statusCode >= 400).length / logs.length || 0,
      requestsByEndpoint: {} as Record<string, number>,
      requestsByHour: {} as Record<string, number>
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
    let query = db.select().from(webVitals);
    
    if (userId) {
      query = query.where(eq(webVitals.user_id, userId));
    }
    
    return await query.orderBy(desc(webVitals.timestamp)).limit(limit);
  }

  async getWebVitalsByMetric(metric: string, userId?: string): Promise<WebVital[]> {
    let query = db.select().from(webVitals).where(eq(webVitals.metric, metric));
    
    if (userId) {
      query = query.where(and(
        eq(webVitals.metric, metric),
        eq(webVitals.user_id, userId)
      ));
    }
    
    return await query.orderBy(desc(webVitals.timestamp));
  }

  async getWebVitalsStats(
    userId?: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<any> {
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
    
    let query = db.select().from(webVitals).where(
      gte(webVitals.timestamp, startDate)
    );
    
    if (userId) {
      query = query.where(and(
        gte(webVitals.timestamp, startDate),
        eq(webVitals.user_id, userId)
      ));
    }
    
    const vitals = await query;
    
    // Calculate percentiles for each metric
    const metricGroups = vitals.reduce((acc, vital) => {
      if (!acc[vital.metric]) {
        acc[vital.metric] = [];
      }
      acc[vital.metric].push(vital.value);
      return acc;
    }, {} as Record<string, number[]>);
    
    const stats: any = {};
    
    for (const [metric, values] of Object.entries(metricGroups)) {
      values.sort((a, b) => a - b);
      stats[metric] = {
        count: values.length,
        min: values[0],
        max: values[values.length - 1],
        median: values[Math.floor(values.length / 2)],
        p75: values[Math.floor(values.length * 0.75)],
        p95: values[Math.floor(values.length * 0.95)],
        average: values.reduce((a, b) => a + b, 0) / values.length
      };
    }
    
    return stats;
  }
  
  // Analytics Events
  async recordAnalyticsEvent(event: InsertAnalyticsEvent): Promise<AnalyticsEvent> {
    const [result] = await db.insert(analyticsEvents).values(event).returning();
    return result;
  }

  async recordAnalyticsEventsBatch(events: InsertAnalyticsEvent[]): Promise<AnalyticsEvent[]> {
    if (events.length === 0) return [];
    return await db.insert(analyticsEvents).values(events).returning();
  }

  async getAnalyticsEvents(
    userId?: string,
    eventType?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AnalyticsEvent[]> {
    let query = db.select().from(analyticsEvents);
    const conditions = [];
    
    if (userId) {
      conditions.push(eq(analyticsEvents.user_id, userId));
    }
    
    if (eventType) {
      conditions.push(eq(analyticsEvents.event_type, eventType));
    }
    
    if (startDate) {
      conditions.push(gte(analyticsEvents.timestamp, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(analyticsEvents.timestamp, endDate));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(analyticsEvents.timestamp));
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
      .where(eq(userSessions.user_id, userId))
      .orderBy(desc(userSessions.started_at))
      .limit(limit);
  }

  async getAnalyticsStats(
    type: 'sessions' | 'events' | 'usage',
    userId?: string,
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<any> {
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
                eq(userSessions.user_id, userId),
                gte(userSessions.started_at, startDate)
              ))
          : await db.select().from(userSessions)
              .where(gte(userSessions.started_at, startDate));
        
        return {
          totalSessions: sessions.length,
          averageDuration: sessions.reduce((sum, s) => {
            if (s.ended_at) {
              return sum + (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime());
            }
            return sum;
          }, 0) / sessions.filter(s => s.ended_at).length || 0,
          activeSessions: sessions.filter(s => !s.ended_at).length
        };
        
      case 'events':
        const events = await this.getAnalyticsEvents(userId, undefined, startDate, now);
        
        const eventsByType = events.reduce((acc, event) => {
          acc[event.event_type] = (acc[event.event_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
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
    let query = db.select().from(analyticsInsights).where(eq(analyticsInsights.user_id, userId));
    
    if (type) {
      query = query.where(and(
        eq(analyticsInsights.user_id, userId),
        eq(analyticsInsights.insight_type, type)
      ));
    }
    
    return await query.orderBy(desc(analyticsInsights.generated_at));
  }

  async getDailyInsightSummary(userId: string): Promise<AnalyticsInsight[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await db.select()
      .from(analyticsInsights)
      .where(and(
        eq(analyticsInsights.user_id, userId),
        gte(analyticsInsights.generated_at, today)
      ))
      .orderBy(desc(analyticsInsights.priority));
  }

  async markInsightAsRead(insightId: string): Promise<void> {
    await db.update(analyticsInsights)
      .set({ is_read: true })
      .where(eq(analyticsInsights.id, insightId));
  }
  
  // User Predictions
  async createUserPrediction(prediction: InsertUserPrediction): Promise<UserPrediction> {
    const [result] = await db.insert(userPredictions).values(prediction).returning();
    return result;
  }

  async getUserPredictions(userId: string, type?: string): Promise<UserPrediction[]> {
    let query = db.select().from(userPredictions).where(eq(userPredictions.user_id, userId));
    
    if (type) {
      query = query.where(and(
        eq(userPredictions.user_id, userId),
        eq(userPredictions.prediction_type, type)
      ));
    }
    
    return await query.orderBy(desc(userPredictions.created_at));
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
    actualValue?: any
  ): Promise<UserPrediction> {
    const updates: any = { status };
    
    if (actualValue !== undefined) {
      updates.actual_value = actualValue;
      updates.updated_at = new Date();
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
        eq(userPredictions.prediction_type, 'churn_risk'),
        eq(userPredictions.status, 'completed'),
        gte(userPredictions.confidence_score, threshold)
      ))
      .orderBy(desc(userPredictions.confidence_score));
  }

  async createPredictionAccuracy(accuracy: InsertPredictionAccuracy): Promise<PredictionAccuracy> {
    const [result] = await db.insert(predictionAccuracy).values(accuracy).returning();
    return result;
  }

  async getPredictionAccuracy(predictionType: string): Promise<PredictionAccuracy[]> {
    return await db.select()
      .from(predictionAccuracy)
      .where(eq(predictionAccuracy.prediction_type, predictionType))
      .orderBy(desc(predictionAccuracy.measured_at));
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
    let query = db.select().from(trends);
    const conditions = [];
    
    if (type) {
      conditions.push(eq(trends.trend_type, type));
    }
    
    if (status) {
      conditions.push(eq(trends.status, status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(trends.detected_at));
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
      .where(and(
        eq(trends.status, 'active'),
        gte(trends.strength, threshold)
      ))
      .orderBy(desc(trends.strength));
  }

  async getEmergingTrends(days = 7): Promise<Trend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await db.select()
      .from(trends)
      .where(and(
        eq(trends.status, 'active'),
        gte(trends.detected_at, startDate)
      ))
      .orderBy(desc(trends.growth_rate));
  }

  async getHistoricalTrends(startDate: Date, endDate: Date): Promise<Trend[]> {
    return await db.select()
      .from(trends)
      .where(between(trends.detected_at, startDate, endDate))
      .orderBy(asc(trends.detected_at));
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
    let query = db.select().from(trendAlerts).where(eq(trendAlerts.user_id, userId));
    
    if (status) {
      query = query.where(and(
        eq(trendAlerts.user_id, userId),
        eq(trendAlerts.status, status)
      ));
    }
    
    return await query.orderBy(desc(trendAlerts.created_at));
  }

  async getTrendAlertsByTrendId(trendId: string): Promise<TrendAlert[]> {
    return await db.select()
      .from(trendAlerts)
      .where(eq(trendAlerts.trend_id, trendId))
      .orderBy(desc(trendAlerts.created_at));
  }

  async triggerTrendAlert(alertId: string): Promise<void> {
    await db.update(trendAlerts)
      .set({ 
        status: 'triggered',
        triggered_at: new Date()
      })
      .where(eq(trendAlerts.id, alertId));
  }

  async acknowledgeTrendAlert(alertId: string): Promise<void> {
    await db.update(trendAlerts)
      .set({ 
        status: 'acknowledged',
        acknowledged_at: new Date()
      })
      .where(eq(trendAlerts.id, alertId));
  }

  async subscribeTrendAlerts(userId: string, trendType: string): Promise<void> {
    // Create a default alert subscription for the user
    await db.insert(trendAlerts).values({
      user_id: userId,
      trend_id: '', // Will be updated when a trend is detected
      alert_type: 'subscription',
      threshold: 0.7,
      status: 'pending',
      metadata: { trendType, autoSubscribed: true }
    });
  }
}