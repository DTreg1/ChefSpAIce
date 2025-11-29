/**
 * Predictive Maintenance Router
 * 
 * API endpoints for system health monitoring, anomaly detection,
 * and maintenance prediction using TensorFlow.js LSTM models.
 */

import { Router } from "express";
import { isAuthenticated, adminOnly } from "../../middleware/oauth.middleware";
import { storage } from "../../storage/index";
import { 
  predictiveMaintenanceService,
  MONITORED_COMPONENTS
} from "../../services/predictive-maintenance.service";

const METRIC_TYPES = ['cpu', 'memory', 'disk', 'latency', 'errorRate'] as const;
import { z } from "zod";
import { 
  insertSystemMetricSchema,
  insertMaintenanceHistorySchema,
  type SystemMetric,
  type MaintenancePrediction,
  type MaintenanceHistory
} from "@shared/schema";

const router = Router();

// Schema validators
const analyzeComponentSchema = z.object({
  component: z.enum(['database', 'server', 'cache', 'api', 'storage'])
});

const completeMaintenanceSchema = z.object({
  component: z.string(),
  issue: z.string(),
  predictionId: z.string().optional(),
  downtimeMinutes: z.number(),
  performedActions: z.array(z.string()),
  outcome: z.enum(['successful', 'partial', 'failed']),
  performanceMetrics: z.object({
    before: z.record(z.number()).optional(),
    after: z.record(z.number()).optional(),
    improvement: z.number().optional()
  }).optional(),
  notes: z.string().optional()
});

const getMetricsSchema = z.object({
  component: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().optional()
});

/**
 * Initialize predictive maintenance models
 */
router.post("/api/maintenance/initialize", isAuthenticated, adminOnly, async (req, res, next) => {
  try {
    await predictiveMaintenanceService.initialize();
    
    res.json({ 
      message: "Predictive maintenance models initialized successfully",
      status: "ready"
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/maintenance/predict
 * Get current maintenance predictions
 */
router.get("/api/maintenance/predict", isAuthenticated, async (req, res, next) => {
  try {
    const { status = 'active', component } = req.query;
    
    const predictions = await storage.platform.system.getMaintenancePredictions(
      status as string | undefined,
      component as string | undefined
    );

    // Group predictions by risk level
    const grouped = {
      critical: predictions.filter(p => p.risk === 'critical'),
      high: predictions.filter(p => p.risk === 'high'),
      medium: predictions.filter(p => p.risk === 'medium'),
      low: predictions.filter(p => p.risk === 'low')
    };

    res.json({
      predictions,
      grouped,
      total: predictions.length,
      nextMaintenance: predictions[0]?.predictedDate || null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/maintenance/analyze
 * Analyze a specific component for maintenance needs
 */
router.post("/api/maintenance/analyze", isAuthenticated, async (req, res, next) => {
  try {
    const { component } = analyzeComponentSchema.parse(req.body);
    
    // Run analysis
    const predictions = await predictiveMaintenanceService.analyzeComponent(component);
    
    // Get recent metrics for health calculation
    const recentMetrics = await storage.platform.system.getSystemMetrics(component);
    const avgAnomalyScore = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + ((m.metadata as any)?.anomalyScore || 0), 0) / recentMetrics.length 
      : 0;
    
    res.json({
      component,
      analysis: {
        predictions,
        health: {
          score: Math.round(100 - avgAnomalyScore * 100),
          avgAnomalyScore,
          recentAnomalies: recentMetrics.filter((m: any) => ((m.metadata as any)?.anomalyScore || 0) > 0.5).length,
          status: avgAnomalyScore > 0.7 ? 'critical' : 
                  avgAnomalyScore > 0.5 ? 'warning' : 'healthy'
        },
        recentMetrics: recentMetrics.slice(0, 10),
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/maintenance/schedule
 * Get suggested maintenance schedule
 */
router.get("/api/maintenance/schedule", isAuthenticated, async (req, res, next) => {
  try {
    const schedule = await predictiveMaintenanceService.getMaintenanceSchedule();
    
    // Group by date
    const byDate = schedule.reduce((acc, pred) => {
      const date = pred.predictedDate ? new Date(pred.predictedDate).toISOString().split('T')[0] : 'unscheduled';
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(pred);
      return acc;
    }, {} as Record<string, MaintenancePrediction[]>);
    
    // Calculate estimated total downtime from metadata
    const totalDowntime = schedule.reduce((sum, p) => sum + ((p.metadata as any)?.estimatedDowntime || 0), 0);
    
    res.json({
      schedule,
      byDate,
      totalItems: schedule.length,
      estimatedDowntimeHours: Math.round(totalDowntime / 60),
      nextWindow: schedule[0]?.predictedDate || null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/maintenance/complete
 * Log completed maintenance
 */
router.post("/api/maintenance/complete", isAuthenticated, async (req, res, next) => {
  try {
    const data = completeMaintenanceSchema.parse(req.body);
    
    // Get prediction recommendation if predictionId provided
    const prediction = data.predictionId ? 
      (await storage.platform.system.getMaintenancePredictions(undefined, data.component))
        .find(p => p.id === data.predictionId) : 
      undefined;
    
    const history = await storage.platform.system.createMaintenanceHistory({
      component: data.component,
      maintenanceType: 'corrective',
      action: data.issue,
      duration: data.downtimeMinutes,
      downtime: data.downtimeMinutes > 0,
      result: data.outcome === 'successful' ? 'success' : data.outcome,
      notes: data.notes,
      startedAt: new Date(),
    });
    
    res.json({
      message: "Maintenance recorded successfully",
      history,
      predictionAccuracy: prediction?.recommendation === data.issue ? 'accurate' : 'inaccurate'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/maintenance/health
 * Get overall system health score
 */
router.get("/api/maintenance/health", isAuthenticated, async (req, res, next) => {
  try {
    const health = await predictiveMaintenanceService.calculateSystemHealth();
    
    // Add additional context
    const predictions = await storage.platform.system.getMaintenancePredictions('active');
    const criticalIssues = predictions.filter(p => p.risk === 'critical');
    
    res.json({
      ...health,
      status: health.score >= 80 ? 'healthy' : 
              health.score >= 60 ? 'warning' : 'critical',
      criticalIssues: criticalIssues.length,
      upcomingMaintenance: predictions.length,
      timestamp: new Date()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/maintenance/metrics
 * Ingest new system metrics
 */
router.post("/api/maintenance/metrics", isAuthenticated, async (req, res, next) => {
  try {
    const metric = insertSystemMetricSchema.parse(req.body);
    
    // Process metric through anomaly detection
    const result = await predictiveMaintenanceService.ingestMetric(metric);
    
    res.json({
      message: "Metric ingested successfully",
      anomalyDetected: result.isAnomaly,
      anomalyScore: result.anomalyScore,
      threshold: result.isAnomaly ? "Anomaly threshold exceeded" : "Normal"
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/maintenance/metrics
 * Get historical system metrics
 */
router.get("/api/maintenance/metrics", isAuthenticated, async (req, res, next) => {
  try {
    const params = getMetricsSchema.parse(req.query);
    
    const metrics = await storage.platform.system.getSystemMetrics(
      params.component,
      params.startDate as any,
      params.endDate as any,
      (params.limit || 100) as any
    );
    
    // Calculate statistics
    const stats = {
      total: metrics.length,
      avgValue: metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length,
      maxValue: Math.max(...metrics.map(m => m.value)),
      minValue: Math.min(...metrics.map(m => m.value)),
      anomalies: metrics.filter(m => ((m.metadata as any)?.anomalyScore || 0) > 0.5).length
    };
    
    res.json({
      metrics,
      stats,
      component: params.component || 'all'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/maintenance/history
 * Get maintenance history
 */
router.get("/api/maintenance/history", isAuthenticated, async (req, res, next) => {
  try {
    const { component, limit = 50 } = req.query;
    
    const history = await storage.platform.system.getMaintenanceHistory(
      component as string | undefined,
      undefined,
      Number(limit)
    );
    
    // Calculate statistics
    const stats = {
      totalMaintenance: history.length,
      avgDowntime: history.reduce((sum, h) => sum + (h.duration || 0), 0) / history.length,
      successRate: history.filter(h => h.result === 'success').length / history.length * 100,
      componentsServiced: Array.from(new Set(history.map(h => h.component)))
    };
    
    res.json({
      history,
      stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/maintenance/simulate
 * Simulate metrics for testing (development only)
 */
router.post("/api/maintenance/simulate", isAuthenticated, adminOnly, async (req, res, next) => {
  try {
    const { component = 'database', anomaly = false } = req.body;
    
    // Generate simulated metrics
    const baseValue = anomaly ? 80 + Math.random() * 20 : 30 + Math.random() * 20;
    const metrics = [];
    
    for (const metricType of METRIC_TYPES) {
      const value = metricType === 'errorRate' ? 
        (anomaly ? 0.05 + Math.random() * 0.05 : 0.01 + Math.random() * 0.01) :
        baseValue + (Math.random() - 0.5) * 10;
      
      const metric = await predictiveMaintenanceService.ingestMetric({
        metricType: metricType as "performance" | "resource" | "error_rate" | "availability" | "latency",
        metricName: metricType,
        value,
        metadata: {
          cpu: { usage: value, cores: 4 },
          memory: { used: value * 10, total: 1000, percentage: value },
          disk: { used: value * 100, total: 10000, percentage: value },
        }
      });
      
      metrics.push(metric);
    }
    
    res.json({
      message: `Simulated ${anomaly ? 'anomalous' : 'normal'} metrics for ${component}`,
      metrics,
      component
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/maintenance/components
 * Get list of monitored components with their status
 */
router.get("/api/maintenance/components", isAuthenticated, async (req, res, next) => {
  try {
    const components = await Promise.all(
      Object.values(MONITORED_COMPONENTS).map(async (component) => {
        const health = await storage.platform.system.getComponentHealth(component);
        const predictions = await storage.platform.system.getMaintenancePredictions('active', component);
        
        return {
          name: component,
          health: Math.round(100 - health.avgAnomalyScore * 100),
          status: health.avgAnomalyScore > 0.7 ? 'critical' : 
                  health.avgAnomalyScore > 0.5 ? 'warning' : 'healthy',
          activePredictions: predictions.length,
          lastMaintenance: health.history[0]?.completedAt || null,
          metrics: {
            recent: health.recentMetrics.length,
            anomalies: health.recentMetrics.filter((m: any) => ((m.metadata as any)?.anomalyScore || 0) > 0.5).length
          }
        };
      })
    );
    
    res.json({
      components,
      total: components.length,
      healthy: components.filter(c => c.status === 'healthy').length,
      warning: components.filter(c => c.status === 'warning').length,
      critical: components.filter(c => c.status === 'critical').length
    });
  } catch (error) {
    next(error);
  }
});

export { router as maintenanceRouter };