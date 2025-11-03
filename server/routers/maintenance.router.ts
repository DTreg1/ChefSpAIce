/**
 * Predictive Maintenance Router
 * 
 * API endpoints for system health monitoring, anomaly detection,
 * and maintenance prediction using TensorFlow.js LSTM models.
 */

import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.middleware";
import { storage } from "../storage";
import { 
  predictiveMaintenanceService,
  MONITORED_COMPONENTS,
  METRIC_TYPES
} from "../services/predictive-maintenance.service";
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
router.post("/api/maintenance/initialize", isAuthenticated, async (req, res, next) => {
  try {
    // Only admins can initialize models
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

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
    
    const predictions = await storage.getMaintenancePredictions(
      status as string | undefined,
      component as string | undefined
    );

    // Group predictions by urgency
    const grouped = {
      critical: predictions.filter(p => p.urgencyLevel === 'critical'),
      high: predictions.filter(p => p.urgencyLevel === 'high'),
      medium: predictions.filter(p => p.urgencyLevel === 'medium'),
      low: predictions.filter(p => p.urgencyLevel === 'low')
    };

    res.json({
      predictions,
      grouped,
      total: predictions.length,
      nextMaintenance: predictions[0]?.recommendedDate || null
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
    
    // Get component health
    const health = await storage.getComponentHealth(component);
    
    res.json({
      component,
      analysis: {
        predictions,
        health: {
          score: Math.round(100 - health.avgAnomalyScore * 100),
          avgAnomalyScore: health.avgAnomalyScore,
          recentAnomalies: health.recentMetrics.filter(m => (m.anomalyScore || 0) > 0.5).length,
          status: health.avgAnomalyScore > 0.7 ? 'critical' : 
                  health.avgAnomalyScore > 0.5 ? 'warning' : 'healthy'
        },
        recentMetrics: health.recentMetrics.slice(0, 10),
        history: health.history
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
      const date = new Date(pred.recommendedDate).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(pred);
      return acc;
    }, {} as Record<string, MaintenancePrediction[]>);
    
    // Calculate estimated total downtime
    const totalDowntime = schedule.reduce((sum, p) => sum + (p.estimatedDowntime || 0), 0);
    
    res.json({
      schedule,
      byDate,
      totalItems: schedule.length,
      estimatedDowntimeHours: Math.round(totalDowntime / 60),
      nextWindow: schedule[0]?.recommendedDate || null
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
    
    const history = await storage.saveMaintenanceHistory({
      component: data.component,
      issue: data.issue,
      predictedIssue: data.predictionId ? 
        (await storage.getMaintenancePredictions(undefined, data.component))
          .find(p => p.id === data.predictionId)?.predictedIssue : 
        undefined,
      predictionId: data.predictionId,
      resolvedAt: new Date(),
      downtimeMinutes: data.downtimeMinutes,
      performedActions: data.performedActions,
      outcome: data.outcome,
      performanceMetrics: data.performanceMetrics,
      notes: data.notes
    });
    
    res.json({
      message: "Maintenance recorded successfully",
      history,
      predictionAccuracy: history.predictedIssue === history.issue ? 'accurate' : 'inaccurate'
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
    const predictions = await storage.getMaintenancePredictions('active');
    const criticalIssues = predictions.filter(p => p.urgencyLevel === 'critical');
    
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
    
    const metrics = await storage.getSystemMetrics(
      params.component,
      params.startDate ? new Date(params.startDate) : undefined,
      params.endDate ? new Date(params.endDate) : undefined,
      params.limit || 100
    );
    
    // Calculate statistics
    const stats = {
      total: metrics.length,
      avgValue: metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length,
      maxValue: Math.max(...metrics.map(m => m.value)),
      minValue: Math.min(...metrics.map(m => m.value)),
      anomalies: metrics.filter(m => (m.anomalyScore || 0) > 0.5).length
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
    
    const history = await storage.getMaintenanceHistory(
      component as string | undefined,
      Number(limit)
    );
    
    // Calculate statistics
    const stats = {
      totalMaintenance: history.length,
      avgDowntime: history.reduce((sum, h) => sum + h.downtimeMinutes, 0) / history.length,
      successRate: history.filter(h => h.outcome === 'successful').length / history.length * 100,
      componentsServiced: [...new Set(history.map(h => h.component))]
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
router.post("/api/maintenance/simulate", isAuthenticated, async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { component = 'database', anomaly = false } = req.body;
    
    // Generate simulated metrics
    const baseValue = anomaly ? 80 + Math.random() * 20 : 30 + Math.random() * 20;
    const metrics = [];
    
    for (const metricType of Object.values(METRIC_TYPES)) {
      const value = metricType === METRIC_TYPES.ERROR_RATE ? 
        (anomaly ? 0.05 + Math.random() * 0.05 : 0.01 + Math.random() * 0.01) :
        baseValue + (Math.random() - 0.5) * 10;
      
      const metric = await predictiveMaintenanceService.ingestMetric({
        component,
        metricName: metricType,
        value,
        timestamp: new Date(),
        metadata: {
          source: 'simulation',
          anomaly
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
        const health = await storage.getComponentHealth(component);
        const predictions = await storage.getMaintenancePredictions('active', component);
        
        return {
          name: component,
          health: Math.round(100 - health.avgAnomalyScore * 100),
          status: health.avgAnomalyScore > 0.7 ? 'critical' : 
                  health.avgAnomalyScore > 0.5 ? 'warning' : 'healthy',
          activePredictions: predictions.length,
          lastMaintenance: health.history[0]?.resolvedAt || null,
          metrics: {
            recent: health.recentMetrics.length,
            anomalies: health.recentMetrics.filter(m => (m.anomalyScore || 0) > 0.5).length
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