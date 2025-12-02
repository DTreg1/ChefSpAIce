/**
 * @file server/storage/interfaces/ISystemStorage.ts
 * @description Interface for system monitoring, activity logging, and maintenance operations
 */

import type {
  ApiUsageLog,
  InsertApiUsageLog,
  ActivityLog,
  InsertActivityLog,
  SystemMetric,
  InsertSystemMetric,
  MaintenancePrediction,
  InsertMaintenancePrediction,
  MaintenanceHistory,
  InsertMaintenanceHistory,
} from "@shared/schema/system";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  offset: number;
}

export interface ISystemStorage {
  // ==================== API Usage Logging ====================
  logApiUsage(
    userId: string,
    log: Omit<InsertApiUsageLog, "userId">,
  ): Promise<ApiUsageLog>;
  getApiUsageLogs(
    userId: string,
    apiName?: string,
    limit?: number,
  ): Promise<ApiUsageLog[]>;
  getApiUsageStats(
    userId: string,
    apiName: string,
    days?: number,
  ): Promise<{
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    totalTokens: number;
    totalCost: number;
    avgResponseTime: number;
  }>;
  getApiUsageTrends(
    userId: string,
    apiName: string,
    days?: number,
  ): Promise<
    Array<{
      date: string;
      calls: number;
      tokens: number;
      cost: number;
    }>
  >;
  getAllApiUsageStats(
    userId: string,
    days?: number,
  ): Promise<
    Array<{
      apiName: string;
      totalCalls: number;
      successfulCalls: number;
      failedCalls: number;
      totalTokens: number;
      totalCost: number;
    }>
  >;
  deleteApiUsageLogs(userId: string, olderThan: Date): Promise<number>;

  // ==================== Activity Logging ====================
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getActivityLogs(
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
    },
  ): Promise<ActivityLog[]>;
  getActivityLogsPaginated(
    userId?: string | null,
    page?: number,
    limit?: number,
    filters?: {
      activityType?: string | string[];
      resourceType?: string;
      resourceId?: string;
      action?: string | string[];
      startDate?: Date;
      endDate?: Date;
      success?: boolean;
    },
  ): Promise<PaginatedResponse<ActivityLog>>;
  getUserActivityTimeline(
    userId: string,
    limit?: number,
  ): Promise<ActivityLog[]>;
  getSystemActivityLogs(filters?: {
    activityType?: string | string[];
    action?: string | string[];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ActivityLog[]>;
  getActivityStats(
    userId?: string | null,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number;
    byActivityType: Array<{ activityType: string; count: number }>;
    byResourceType: Array<{ resourceType: string; count: number }>;
    byAction: Array<{ action: string; count: number }>;
    successRate: number;
  }>;
  getRecentErrors(
    userId?: string | null,
    limit?: number,
  ): Promise<ActivityLog[]>;
  cleanupOldActivityLogs(
    retentionDays?: number,
    excludeActivityTypes?: string[],
  ): Promise<number>;

  // ==================== System Metrics ====================
  recordSystemMetric(
    metric: Omit<InsertSystemMetric, "timestamp">,
  ): Promise<SystemMetric>;
  getSystemMetrics(
    metricType?: string,
    metricName?: string,
    startDate?: Date,
    endDate?: Date,
    limit?: number,
  ): Promise<SystemMetric[]>;
  getLatestSystemMetrics(metricType?: string): Promise<SystemMetric[]>;
  getMetricAggregates(
    metricName: string,
    startDate: Date,
    endDate: Date,
    interval?: "hour" | "day" | "week",
  ): Promise<
    Array<{
      period: string;
      avg: number;
      min: number;
      max: number;
      count: number;
    }>
  >;
  deleteOldSystemMetrics(olderThan: Date): Promise<number>;

  // ==================== Maintenance Predictions ====================
  createMaintenancePrediction(
    prediction: Omit<InsertMaintenancePrediction, "createdAt">,
  ): Promise<MaintenancePrediction>;
  getMaintenancePredictions(
    component?: string,
    risk?: string,
    isAddressed?: boolean,
  ): Promise<MaintenancePrediction[]>;
  getHighRiskPredictions(): Promise<MaintenancePrediction[]>;
  markPredictionAddressed(predictionId: string): Promise<MaintenancePrediction>;
  deletePrediction(predictionId: string): Promise<void>;

  // ==================== Maintenance History ====================
  recordMaintenanceHistory(
    history: Omit<InsertMaintenanceHistory, "id">,
  ): Promise<MaintenanceHistory>;
  getMaintenanceHistory(
    component?: string,
    maintenanceType?: string,
    limit?: number,
  ): Promise<MaintenanceHistory[]>;
  getRecentMaintenance(limit?: number): Promise<MaintenanceHistory[]>;
  getMaintenanceStats(
    component?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number;
    byType: Array<{ maintenanceType: string; count: number }>;
    byResult: Array<{ result: string; count: number }>;
    totalDowntime: number;
    avgDuration: number;
  }>;
  updateMaintenanceHistory(
    historyId: string,
    updates: Partial<Omit<InsertMaintenanceHistory, "id" | "startedAt">>,
  ): Promise<MaintenanceHistory>;
  deleteMaintenanceHistory(historyId: string): Promise<void>;

  // ==================== System Health & Status ====================
  getSystemHealth(): Promise<{
    metrics: SystemMetric[];
    predictions: MaintenancePrediction[];
    recentErrors: ActivityLog[];
    apiStatus: Array<{
      apiName: string;
      recentCalls: number;
      errorRate: number;
      avgResponseTime: number;
    }>;
  }>;
}
