/**
 * @file server/storage/domains/system.storage.ts
 * @description System monitoring, activity logging, and maintenance operations
 * 
 * Covers:
 * - API usage tracking and analytics
 * - Activity logging and audit trails
 * - System metrics collection
 * - Maintenance predictions and history
 * - Log retention and cleanup operations
 * 
 * EXPORT PATTERN:
 * - Export CLASS (SystemStorage) for dependency injection and testing
 * - Export singleton INSTANCE (systemStorage) for convenience in production code
 * - Facades should instantiate their own instances OR use the shared singleton consistently
 */

import { db } from "../../db";
import { eq, and, desc, sql, lte, gte, isNull } from "drizzle-orm";
import {
  type ApiUsageLog,
  type InsertApiUsageLog,
  apiUsageLogs,
  type ActivityLog,
  type InsertActivityLog,
  activityLogs,
  type SystemMetric,
  type InsertSystemMetric,
  systemMetrics,
  type MaintenancePrediction,
  type InsertMaintenancePrediction,
  maintenancePredictions,
  type MaintenanceHistory,
  type InsertMaintenanceHistory,
  maintenanceHistory,
} from "@shared/schema/system";
import type { ISystemStorage } from "../interfaces/ISystemStorage";

// Type for paginated response
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  offset: number;
}

export class SystemStorage implements ISystemStorage {
  // ==================== API Usage Logging ====================

  async logApiUsage(
    userId: string,
    log: Omit<InsertApiUsageLog, "userId">
  ): Promise<ApiUsageLog> {
    const logToInsert = {
      ...log,
      userId,
      timestamp: new Date(),
    } as typeof apiUsageLogs.$inferInsert;
    const [newLog] = await db
      .insert(apiUsageLogs)
      .values([logToInsert])
      .returning();
    return newLog;
  }

  async getApiUsageLogs(
    userId: string,
    apiName?: string,
    limit: number = 100
  ): Promise<ApiUsageLog[]> {
    const conditions = apiName
      ? and(
          eq(apiUsageLogs.userId, userId),
          eq(apiUsageLogs.apiName, apiName)
        )
      : eq(apiUsageLogs.userId, userId);

    return await db
      .select()
      .from(apiUsageLogs)
      .where(conditions)
      .orderBy(desc(apiUsageLogs.timestamp))
      .limit(limit);
  }

  async getApiUsageStats(
    userId: string,
    apiName: string,
    days: number = 30
  ): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    totalTokens: number;
    totalCost: number;
    avgResponseTime: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const logs = await db
      .select()
      .from(apiUsageLogs)
      .where(
        and(
          eq(apiUsageLogs.userId, userId),
          eq(apiUsageLogs.apiName, apiName),
          gte(apiUsageLogs.timestamp, cutoffDate)
        )
      );

    const totalCalls = logs.length;
    const successfulCalls = logs.filter(
      (log) => log.statusCode && log.statusCode >= 200 && log.statusCode < 300
    ).length;
    const failedCalls = totalCalls - successfulCalls;
    const totalTokens = logs.reduce((sum, log) => sum + (log.tokensUsed || 0), 0);
    const totalCost = logs.reduce((sum, log) => sum + (log.cost || 0), 0);
    const responseTimes = logs.filter((log) => log.responseTime !== null);
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, log) => sum + (log.responseTime || 0), 0) /
          responseTimes.length
        : 0;

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      totalTokens,
      totalCost,
      avgResponseTime,
    };
  }

  async getApiUsageTrends(
    userId: string,
    apiName: string,
    days: number = 30
  ): Promise<
    Array<{
      date: string;
      calls: number;
      tokens: number;
      cost: number;
    }>
  > {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const logs = await db
      .select({
        date: sql<string>`DATE(${apiUsageLogs.timestamp})`,
        calls: sql<number>`count(*)::int`,
        tokens: sql<number>`COALESCE(sum(${apiUsageLogs.tokensUsed}), 0)::int`,
        cost: sql<number>`COALESCE(sum(${apiUsageLogs.cost}), 0)::real`,
      })
      .from(apiUsageLogs)
      .where(
        and(
          eq(apiUsageLogs.userId, userId),
          eq(apiUsageLogs.apiName, apiName),
          gte(apiUsageLogs.timestamp, cutoffDate)
        )
      )
      .groupBy(sql`DATE(${apiUsageLogs.timestamp})`)
      .orderBy(sql`DATE(${apiUsageLogs.timestamp})`);

    return logs;
  }

  async getAllApiUsageStats(
    userId: string,
    days: number = 30
  ): Promise<
    Array<{
      apiName: string;
      totalCalls: number;
      successfulCalls: number;
      failedCalls: number;
      totalTokens: number;
      totalCost: number;
    }>
  > {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const logs = await db
      .select()
      .from(apiUsageLogs)
      .where(
        and(
          eq(apiUsageLogs.userId, userId),
          gte(apiUsageLogs.timestamp, cutoffDate)
        )
      );

    const statsByApi: Record<
      string,
      {
        apiName: string;
        totalCalls: number;
        successfulCalls: number;
        failedCalls: number;
        totalTokens: number;
        totalCost: number;
      }
    > = {};

    for (const log of logs) {
      if (!statsByApi[log.apiName]) {
        statsByApi[log.apiName] = {
          apiName: log.apiName,
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          totalTokens: 0,
          totalCost: 0,
        };
      }

      const stats = statsByApi[log.apiName];
      stats.totalCalls++;

      if (log.statusCode && log.statusCode >= 200 && log.statusCode < 300) {
        stats.successfulCalls++;
      } else {
        stats.failedCalls++;
      }

      stats.totalTokens += log.tokensUsed || 0;
      stats.totalCost += log.cost || 0;
    }

    return Object.values(statsByApi);
  }

  async deleteApiUsageLogs(userId: string, olderThan: Date): Promise<number> {
    const result = await db
      .delete(apiUsageLogs)
      .where(
        and(
          eq(apiUsageLogs.userId, userId),
          lte(apiUsageLogs.timestamp, olderThan)
        )
      );
    return result.rowCount || 0;
  }

  // ==================== Activity Logging ====================

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  async getActivityLogs(
    userId?: string | null,
    filters?: {
      activityType?: string | string[];
      resourceType?: string;
      resourceId?: string;
      action?: string | string[];
      startDate?: Date;
      endDate?: Date;
      success?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<ActivityLog[]> {
    const conditions: any[] = [];

    // User filter
    if (userId !== undefined) {
      if (userId === null) {
        conditions.push(isNull(activityLogs.userId));
      } else {
        conditions.push(eq(activityLogs.userId, userId));
      }
    }

    // Activity type filter (single or multiple)
    if (filters?.activityType) {
      if (Array.isArray(filters.activityType)) {
        conditions.push(
          sql`${activityLogs.activityType} = ANY(${filters.activityType})`
        );
      } else {
        conditions.push(eq(activityLogs.activityType, filters.activityType));
      }
    }

    // Resource filters
    if (filters?.resourceType) {
      conditions.push(eq(activityLogs.resourceType, filters.resourceType));
    }
    if (filters?.resourceId) {
      conditions.push(eq(activityLogs.resourceId, filters.resourceId));
    }

    // Action filter (single or multiple)
    if (filters?.action) {
      if (Array.isArray(filters.action)) {
        conditions.push(sql`${activityLogs.action} = ANY(${filters.action})`);
      } else {
        conditions.push(eq(activityLogs.action, filters.action));
      }
    }

    // Success filter
    if (filters?.success !== undefined) {
      conditions.push(eq(activityLogs.success, filters.success));
    }

    // Date range filters
    if (filters?.startDate) {
      conditions.push(gte(activityLogs.timestamp, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(activityLogs.timestamp, filters.endDate));
    }

    // Build and execute query
    let baseQuery = db.select().from(activityLogs).$dynamic();

    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions));
    }

    baseQuery = baseQuery.orderBy(desc(activityLogs.timestamp));

    if (filters?.limit) {
      baseQuery = baseQuery.limit(filters.limit);
    }
    if (filters?.offset) {
      baseQuery = baseQuery.offset(filters.offset);
    }

    return await baseQuery;
  }

  async getActivityLogsPaginated(
    userId?: string | null,
    page: number = 1,
    limit: number = 50,
    filters?: {
      activityType?: string | string[];
      resourceType?: string;
      resourceId?: string;
      action?: string | string[];
      startDate?: Date;
      endDate?: Date;
      success?: boolean;
    }
  ): Promise<PaginatedResponse<ActivityLog>> {
    const offset = (page - 1) * limit;

    // Get logs with limit + offset
    const logs = await this.getActivityLogs(userId, {
      ...filters,
      limit,
      offset,
    });

    // Get total count for pagination
    let countQuery = db
      .select({ count: sql<number>`count(*)::int` })
      .from(activityLogs)
      .$dynamic();

    const conditions: any[] = [];

    if (userId !== undefined) {
      if (userId === null) {
        conditions.push(isNull(activityLogs.userId));
      } else {
        conditions.push(eq(activityLogs.userId, userId));
      }
    }

    if (filters?.activityType) {
      if (Array.isArray(filters.activityType)) {
        conditions.push(
          sql`${activityLogs.activityType} = ANY(${filters.activityType})`
        );
      } else {
        conditions.push(eq(activityLogs.activityType, filters.activityType));
      }
    }

    if (filters?.resourceType) {
      conditions.push(eq(activityLogs.resourceType, filters.resourceType));
    }
    if (filters?.resourceId) {
      conditions.push(eq(activityLogs.resourceId, filters.resourceId));
    }

    if (filters?.action) {
      if (Array.isArray(filters.action)) {
        conditions.push(sql`${activityLogs.action} = ANY(${filters.action})`);
      } else {
        conditions.push(eq(activityLogs.action, filters.action));
      }
    }

    if (filters?.success !== undefined) {
      conditions.push(eq(activityLogs.success, filters.success));
    }

    if (filters?.startDate) {
      conditions.push(gte(activityLogs.timestamp, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(activityLogs.timestamp, filters.endDate));
    }

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }

    const [{ count: total }] = await countQuery;

    return {
      data: logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
      offset,
    };
  }

  async getUserActivityTimeline(
    userId: string,
    limit: number = 50
  ): Promise<ActivityLog[]> {
    return this.getActivityLogs(userId, { limit });
  }

  async getSystemActivityLogs(filters?: {
    activityType?: string | string[];
    action?: string | string[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ActivityLog[]> {
    return this.getActivityLogs(null, filters);
  }

  async getActivityStats(
    userId?: string | null,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    byActivityType: Array<{ activityType: string; count: number }>;
    byResourceType: Array<{ resourceType: string; count: number }>;
    byAction: Array<{ action: string; count: number }>;
    successRate: number;
  }> {
    const conditions: any[] = [];

    if (userId !== undefined) {
      if (userId === null) {
        conditions.push(isNull(activityLogs.userId));
      } else {
        conditions.push(eq(activityLogs.userId, userId));
      }
    }
    if (startDate) {
      conditions.push(gte(activityLogs.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(activityLogs.timestamp, endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get activity type counts
    const activityTypeCounts = await db
      .select({
        activityType: activityLogs.activityType,
        count: sql<number>`count(*)::int`,
      })
      .from(activityLogs)
      .where(whereClause)
      .groupBy(activityLogs.activityType)
      .orderBy(desc(sql`count(*)`));

    // Get resource type counts
    const resourceTypeCounts = await db
      .select({
        resourceType: activityLogs.resourceType,
        count: sql<number>`count(*)::int`,
      })
      .from(activityLogs)
      .where(whereClause)
      .groupBy(activityLogs.resourceType)
      .orderBy(desc(sql`count(*)`));

    // Get action counts
    const actionCounts = await db
      .select({
        action: activityLogs.action,
        count: sql<number>`count(*)::int`,
      })
      .from(activityLogs)
      .where(whereClause)
      .groupBy(activityLogs.action)
      .orderBy(desc(sql`count(*)`));

    // Get total count and success rate
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        successful: sql<number>`count(*) FILTER (WHERE ${activityLogs.success} = true)::int`,
      })
      .from(activityLogs)
      .where(whereClause);

    const total = stats?.total || 0;
    const successful = stats?.successful || 0;
    const successRate = total > 0 ? successful / total : 0;

    return {
      total,
      byActivityType: activityTypeCounts,
      byResourceType: resourceTypeCounts,
      byAction: actionCounts,
      successRate,
    };
  }

  async getRecentErrors(
    userId?: string | null,
    limit: number = 20
  ): Promise<ActivityLog[]> {
    return this.getActivityLogs(userId, {
      success: false,
      limit,
    });
  }

  async cleanupOldActivityLogs(
    retentionDays: number = 90,
    excludeActivityTypes?: string[]
  ): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const conditions: any[] = [lte(activityLogs.timestamp, cutoffDate)];

    // Exclude certain important activity types from cleanup
    if (excludeActivityTypes && excludeActivityTypes.length > 0) {
      conditions.push(
        sql`${activityLogs.activityType} NOT IN (${sql.raw(
          excludeActivityTypes.map((a) => `'${a}'`).join(",")
        )})`
      );
    }

    const result = await db.delete(activityLogs).where(and(...conditions));

    const deletedCount = result.rowCount || 0;

    // Log the cleanup as a system event
    await this.createActivityLog({
      userId: null,
      activityType: "delete",
      resourceType: "settings",
      resourceId: null,
      action: "cleanup_activity_logs",
      details: {
        retentionDays,
        deletedCount,
        cutoffDate: cutoffDate.toISOString(),
      } as Record<string, any>,
      ipAddress: null,
      userAgent: null,
      success: true,
    });

    return deletedCount;
  }

  // ==================== System Metrics ====================

  async recordSystemMetric(
    metric: Omit<InsertSystemMetric, "timestamp">
  ): Promise<SystemMetric> {
    const metricToInsert = {
      ...metric,
      timestamp: new Date(),
    } as typeof systemMetrics.$inferInsert;
    const [newMetric] = await db
      .insert(systemMetrics)
      .values([metricToInsert])
      .returning();
    return newMetric;
  }

  async getSystemMetrics(
    metricType?: string,
    metricName?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<SystemMetric[]> {
    const conditions: any[] = [];

    if (metricType) {
      conditions.push(eq(systemMetrics.metricType, metricType));
    }
    if (metricName) {
      conditions.push(eq(systemMetrics.metricName, metricName));
    }
    if (startDate) {
      conditions.push(gte(systemMetrics.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(systemMetrics.timestamp, endDate));
    }

    let query = db.select().from(systemMetrics).$dynamic();

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query
      .orderBy(desc(systemMetrics.timestamp))
      .limit(limit);
  }

  async getLatestSystemMetrics(
    metricType?: string
  ): Promise<SystemMetric[]> {
    const conditions = metricType
      ? [eq(systemMetrics.metricType, metricType)]
      : [];

    // Get the latest metric for each metricName
    const latestMetrics = await db
      .select({
        metricName: systemMetrics.metricName,
        latestTimestamp: sql<Date>`MAX(${systemMetrics.timestamp})`,
      })
      .from(systemMetrics)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(systemMetrics.metricName);

    // Fetch the full records for the latest metrics
    const results: SystemMetric[] = [];
    for (const { metricName, latestTimestamp } of latestMetrics) {
      const [metric] = await db
        .select()
        .from(systemMetrics)
        .where(
          and(
            eq(systemMetrics.metricName, metricName),
            eq(systemMetrics.timestamp, latestTimestamp)
          )
        )
        .limit(1);
      if (metric) results.push(metric);
    }

    return results;
  }

  async getMetricAggregates(
    metricName: string,
    startDate: Date,
    endDate: Date,
    interval: "hour" | "day" | "week" = "day"
  ): Promise<
    Array<{
      period: string;
      avg: number;
      min: number;
      max: number;
      count: number;
    }>
  > {
    const dateFormat =
      interval === "hour"
        ? "YYYY-MM-DD HH24:00:00"
        : interval === "week"
        ? "YYYY-IW"
        : "YYYY-MM-DD";

    const aggregates = await db
      .select({
        period: sql<string>`TO_CHAR(${systemMetrics.timestamp}, ${dateFormat})`,
        avg: sql<number>`AVG(${systemMetrics.value})::real`,
        min: sql<number>`MIN(${systemMetrics.value})::real`,
        max: sql<number>`MAX(${systemMetrics.value})::real`,
        count: sql<number>`count(*)::int`,
      })
      .from(systemMetrics)
      .where(
        and(
          eq(systemMetrics.metricName, metricName),
          gte(systemMetrics.timestamp, startDate),
          lte(systemMetrics.timestamp, endDate)
        )
      )
      .groupBy(sql`TO_CHAR(${systemMetrics.timestamp}, ${dateFormat})`)
      .orderBy(sql`TO_CHAR(${systemMetrics.timestamp}, ${dateFormat})`);

    return aggregates;
  }

  async deleteOldSystemMetrics(olderThan: Date): Promise<number> {
    const result = await db
      .delete(systemMetrics)
      .where(lte(systemMetrics.timestamp, olderThan));
    return result.rowCount || 0;
  }

  // ==================== Maintenance Predictions ====================

  async createMaintenancePrediction(
    prediction: Omit<InsertMaintenancePrediction, "createdAt">
  ): Promise<MaintenancePrediction> {
    const [newPrediction] = await db
      .insert(maintenancePredictions)
      .values({
        ...prediction,
        createdAt: new Date(),
      })
      .returning();
    return newPrediction;
  }

  async getMaintenancePredictions(
    component?: string,
    risk?: string,
    isAddressed?: boolean
  ): Promise<MaintenancePrediction[]> {
    const conditions: any[] = [];

    if (component) {
      conditions.push(eq(maintenancePredictions.component, component));
    }
    if (risk) {
      conditions.push(eq(maintenancePredictions.risk, risk));
    }
    if (isAddressed !== undefined) {
      conditions.push(eq(maintenancePredictions.isAddressed, isAddressed));
    }

    let query = db.select().from(maintenancePredictions).$dynamic();

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(
      desc(maintenancePredictions.risk),
      desc(maintenancePredictions.createdAt)
    );
  }

  async getHighRiskPredictions(): Promise<MaintenancePrediction[]> {
    return await db
      .select()
      .from(maintenancePredictions)
      .where(
        and(
          sql`${maintenancePredictions.risk} IN ('high', 'critical')`,
          eq(maintenancePredictions.isAddressed, false)
        )
      )
      .orderBy(
        desc(maintenancePredictions.risk),
        desc(maintenancePredictions.confidence)
      );
  }

  async markPredictionAddressed(
    predictionId: string
  ): Promise<MaintenancePrediction> {
    const [updated] = await db
      .update(maintenancePredictions)
      .set({ isAddressed: true })
      .where(eq(maintenancePredictions.id, predictionId))
      .returning();

    if (!updated) {
      throw new Error("Maintenance prediction not found");
    }

    return updated;
  }

  async deletePrediction(predictionId: string): Promise<void> {
    await db
      .delete(maintenancePredictions)
      .where(eq(maintenancePredictions.id, predictionId));
  }

  // ==================== Maintenance History ====================

  async recordMaintenanceHistory(
    history: Omit<InsertMaintenanceHistory, "id">
  ): Promise<MaintenanceHistory> {
    const [newHistory] = await db
      .insert(maintenanceHistory)
      .values(history)
      .returning();
    return newHistory;
  }

  async getMaintenanceHistory(
    component?: string,
    maintenanceType?: string,
    limit: number = 50
  ): Promise<MaintenanceHistory[]> {
    const conditions: any[] = [];

    if (component) {
      conditions.push(eq(maintenanceHistory.component, component));
    }
    if (maintenanceType) {
      conditions.push(eq(maintenanceHistory.maintenanceType, maintenanceType));
    }

    let query = db.select().from(maintenanceHistory).$dynamic();

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query
      .orderBy(desc(maintenanceHistory.startedAt))
      .limit(limit);
  }

  async getRecentMaintenance(limit: number = 10): Promise<MaintenanceHistory[]> {
    return await db
      .select()
      .from(maintenanceHistory)
      .orderBy(desc(maintenanceHistory.startedAt))
      .limit(limit);
  }

  async getMaintenanceStats(
    component?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    total: number;
    byType: Array<{ maintenanceType: string; count: number }>;
    byResult: Array<{ result: string; count: number }>;
    totalDowntime: number;
    avgDuration: number;
  }> {
    const conditions: any[] = [];

    if (component) {
      conditions.push(eq(maintenanceHistory.component, component));
    }
    if (startDate) {
      conditions.push(gte(maintenanceHistory.startedAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(maintenanceHistory.startedAt, endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get type counts
    const typeCounts = await db
      .select({
        maintenanceType: maintenanceHistory.maintenanceType,
        count: sql<number>`count(*)::int`,
      })
      .from(maintenanceHistory)
      .where(whereClause)
      .groupBy(maintenanceHistory.maintenanceType)
      .orderBy(desc(sql`count(*)`));

    // Get result counts
    const resultCounts = await db
      .select({
        result: maintenanceHistory.result,
        count: sql<number>`count(*)::int`,
      })
      .from(maintenanceHistory)
      .where(whereClause)
      .groupBy(maintenanceHistory.result)
      .orderBy(desc(sql`count(*)`));

    // Get aggregates
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        totalDowntime: sql<number>`count(*) FILTER (WHERE ${maintenanceHistory.downtime} = true)::int`,
        avgDuration: sql<number>`AVG(${maintenanceHistory.duration})::real`,
      })
      .from(maintenanceHistory)
      .where(whereClause);

    return {
      total: stats?.total || 0,
      byType: typeCounts,
      byResult: resultCounts.filter((r) => r.result !== null) as Array<{
        result: string;
        count: number;
      }>,
      totalDowntime: stats?.totalDowntime || 0,
      avgDuration: stats?.avgDuration || 0,
    };
  }

  async updateMaintenanceHistory(
    historyId: string,
    updates: Partial<
      Omit<InsertMaintenanceHistory, "id" | "startedAt">
    >
  ): Promise<MaintenanceHistory> {
    const [updated] = await db
      .update(maintenanceHistory)
      .set(updates)
      .where(eq(maintenanceHistory.id, historyId))
      .returning();

    if (!updated) {
      throw new Error("Maintenance history not found");
    }

    return updated;
  }

  async deleteMaintenanceHistory(historyId: string): Promise<void> {
    await db
      .delete(maintenanceHistory)
      .where(eq(maintenanceHistory.id, historyId));
  }

  // ==================== System Health & Status ====================

  async getSystemHealth(): Promise<{
    metrics: SystemMetric[];
    predictions: MaintenancePrediction[];
    recentErrors: ActivityLog[];
    apiStatus: Array<{
      apiName: string;
      recentCalls: number;
      errorRate: number;
      avgResponseTime: number;
    }>;
  }> {
    // Get latest system metrics
    const metrics = await this.getLatestSystemMetrics();

    // Get unaddressed high-risk predictions
    const predictions = await this.getHighRiskPredictions();

    // Get recent errors (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentErrors = await this.getRecentErrors(null, 50);

    // Get API status (last 24 hours)
    const apiLogs = await db
      .select()
      .from(apiUsageLogs)
      .where(gte(apiUsageLogs.timestamp, yesterday));

    const apiStatusMap: Record<
      string,
      { calls: number; errors: number; totalResponseTime: number; count: number }
    > = {};

    for (const log of apiLogs) {
      if (!apiStatusMap[log.apiName]) {
        apiStatusMap[log.apiName] = {
          calls: 0,
          errors: 0,
          totalResponseTime: 0,
          count: 0,
        };
      }

      const status = apiStatusMap[log.apiName];
      status.calls++;

      if (!log.statusCode || log.statusCode >= 400) {
        status.errors++;
      }

      if (log.responseTime !== null) {
        status.totalResponseTime += log.responseTime;
        status.count++;
      }
    }

    const apiStatus = Object.entries(apiStatusMap).map(([apiName, stats]) => ({
      apiName,
      recentCalls: stats.calls,
      errorRate: stats.calls > 0 ? stats.errors / stats.calls : 0,
      avgResponseTime:
        stats.count > 0 ? stats.totalResponseTime / stats.count : 0,
    }));

    return {
      metrics,
      predictions,
      recentErrors,
      apiStatus,
    };
  }
}

// Export singleton instance for convenience
export const systemStorage = new SystemStorage();
